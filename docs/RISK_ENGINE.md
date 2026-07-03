# Risk Engine

Source: `backend/app/services/risk_engine.py`, `backend/app/services/explanation_engine.py`,
`backend/app/services/transaction_engine.py`

## What it is

The Risk Engine turns the Rule Engine's output (see `RULE_ENGINE.md`) into two things a
downstream system can act on: a single 0–100 risk score, and a routing decision. It does
not evaluate any fraud logic itself — it is a pure aggregation and thresholding step
over whichever `RuleEvaluationResult`s the Rule Engine reported as `triggered=True`.

`RiskEngine.score()` is called once per transaction from `TransactionEngine.process()`
(`backend/app/services/transaction_engine.py`), immediately after
`RuleEngine.evaluate_all()` has run and the triggered subset has been filtered out.

## How the score is computed

```python
class RiskEngine:
    def score(self, triggered_rules: list[RuleTriggerResult]) -> RiskAssessment:
        raw_score = sum(r.weight for r in triggered_rules)
        score = min(100.0, round(raw_score, 1))
        ...
```

The score is simply the **sum of the `weight` of every rule that triggered**, rounded
to one decimal place, and capped at 100.0 regardless of how high the raw sum runs (e.g.
five overlapping 35-weight rules would sum to 175, but the reported score is 100.0). A
transaction with no triggered rules scores 0.

Because rule weights are live database values (see `RULE_ENGINE.md`), the score for an
otherwise identical transaction can change over time if an operator retunes a rule's
weight from the Rule Engine screen — there is no fixed/hardcoded scoring table.

## Decision thresholds

The decision is looked up from an ordered tuple of `(upper_bound, decision)` pairs,
walked in order, returning the first bucket whose upper bound is greater than or equal
to the score:

```python
DECISION_THRESHOLDS = (
    (30, "APPROVE"),
    (60, "REVIEW"),
    (80, "OTP_VERIFICATION"),
    (100, "BLOCK"),
)

@staticmethod
def _decide(score: float) -> str:
    for upper_bound, decision in DECISION_THRESHOLDS:
        if score <= upper_bound:
            return decision
    return "BLOCK"
```

Each bound in `DECISION_THRESHOLDS` is an **inclusive upper bound** (the comparison is
`score <= upper_bound`), so the exact boundary value belongs to the lower, safer
bucket:

| Score range | Decision | Notes |
|---|---|---|
| 0 – 30 (inclusive) | `APPROVE` | A score of exactly 30 is still `APPROVE`. |
| 30.1 – 60 (inclusive) | `REVIEW` | A score of exactly 60 is still `REVIEW`, not `OTP_VERIFICATION`. |
| 60.1 – 80 (inclusive) | `OTP_VERIFICATION` | A score of exactly 80 is still `OTP_VERIFICATION`, not `BLOCK`. |
| 80.1 – 100 (inclusive) | `BLOCK` | Since the score is capped at 100.0, this bucket also absorbs any raw sum that would otherwise exceed 100. |

Concretely: 31 → `REVIEW`, 61 → `OTP_VERIFICATION`, 81 → `BLOCK`. The final `return
"BLOCK"` after the loop is unreachable in practice since 100 is the last, catch-all
upper bound and the score is pre-capped at 100.0 — it exists purely as a defensive
fallback.

## Decision → transaction status mapping

The `decision` value is not what gets persisted as the transaction's operational
status. It is translated through a fixed dictionary:

```python
STATUS_BY_DECISION = {
    "APPROVE": "APPROVED",
    "REVIEW": "REVIEW",
    "OTP_VERIFICATION": "OTP_PENDING",
    "BLOCK": "BLOCKED",
}
```

| Decision | Transaction `status` |
|---|---|
| `APPROVE` | `APPROVED` |
| `REVIEW` | `REVIEW` |
| `OTP_VERIFICATION` | `OTP_PENDING` |
| `BLOCK` | `BLOCKED` |

Both `decision` and `status` are stored on the `Transaction` row
(`txn.decision = assessment.decision`, `txn.status = assessment.status` in
`transaction_engine.py`), so the raw decision bucket and the customer/operator-facing
status are both queryable independently.

## `RiskAssessment`

`RiskEngine.score()` returns a single dataclass that downstream code (the transaction
engine, the explanation engine, alerting) consumes:

```python
@dataclass
class RiskAssessment:
    score: float
    decision: str
    status: str
    triggered_rules: list[RuleTriggerResult]
```

## Severity: a separate axis from the decision

`severity_for_score()` is a standalone function (not a method of `RiskEngine`) used
only when a `FraudAlert` is created — it is **not** used to route the transaction
itself:

```python
def severity_for_score(score: float) -> str:
    if score >= 81:
        return "CRITICAL"
    if score >= 61:
        return "HIGH"
    if score >= 31:
        return "MEDIUM"
    return "LOW"
```

| Score | Severity |
|---|---|
| 81 – 100 | `CRITICAL` |
| 61 – 80 | `HIGH` |
| 31 – 60 | `MEDIUM` |
| 0 – 30 | `LOW` |

In `TransactionEngine.process()`, a `FraudAlert` row is only created when
`assessment.decision != "APPROVE"` — i.e. only for `REVIEW`, `OTP_VERIFICATION`, and
`BLOCK` transactions — and that alert's `severity` field is set from
`severity_for_score(assessment.score)`. So severity is an alert-management concept
(how urgently should an analyst look at this alert) layered on top of, but computed
independently from, the transaction decision (how should the transaction itself be
handled). Note the severity bucket boundaries do not line up exactly with the decision
thresholds — e.g. a score of 60 is `REVIEW` for the decision but `MEDIUM` for severity
(the severity `HIGH` bucket starts at 61, matching where `OTP_VERIFICATION` begins),
while a score of 80 is `OTP_VERIFICATION` for the decision but `HIGH` (not `CRITICAL`)
for severity.

## Explanation engine: specific, data-backed narratives

`backend/app/services/explanation_engine.py` builds the human-readable explanation
shown to reviewers, and its docstring states the intent directly: *"Builds
human-readable fraud explanations from triggered rules — never generic text."* It does
this by reusing the exact `detail` strings the Rule Engine already produced (see
`RULE_ENGINE.md`) rather than generating separate templated text.

`build_explanation(assessment)`:
- If no rules triggered, returns a single fixed line: `"No fraud indicators detected.
  Transaction matches the customer's normal behavioural pattern."`
- Otherwise, sorts all triggered rules by weight (descending) and returns their
  `detail` strings as a list, most impactful reason first. Because each `detail` string
  was built by its evaluator from the actual transaction context (e.g. `"Amount
  exceeds customer's average transaction by 6.2x (₹6,20,000 vs avg ₹1,00,000)"`), the
  explanation is inherently specific to that transaction rather than a canned message.

`build_reason_summary(assessment)` builds the single-line summary used elsewhere in the
UI (e.g. alert lists):
- No triggers: `"Approved: transaction consistent with normal customer behaviour."`
- Otherwise: takes the top 3 triggered rules by weight, joins their `detail` strings
  with `"; "`, and prefixes a decision-specific verb — `Blocked`, `Sent for OTP
  verification`, `Flagged for review`, or `Approved with notice` — followed by the
  total score, e.g.:

  `"Flagged for review because Transaction amount ₹1,20,000 exceeds the high-value
  threshold of ₹1,00,000; Amount exceeds customer's average transaction by 4.0x (₹1,20,000
  vs avg ₹30,000). Total Risk Score 45."`

Both functions are called once per transaction in `TransactionEngine.process()`
(`explanation = build_explanation(assessment)`, `reason = build_reason_summary(assessment)`)
and persisted onto the `Transaction` row (`reason`) and the `FraudAlert` row
(`reason_summary`, `explanation`) respectively.

## Worked example

Consider a transaction that triggers exactly two rules:

- `NEW_DEVICE` — weight 35 (the device UID on this transaction has never been seen for
  this customer)
- `LARGE_AMOUNT` — weight 20 (the amount exceeds the seeded ₹1,00,000 threshold)

Risk Engine computation:

1. `raw_score = 35 + 20 = 55`
2. `score = min(100.0, round(55, 1)) = 55.0`
3. Decision lookup: `55.0 <= 30`? No. `55.0 <= 60`? Yes → **`REVIEW`**
4. Status mapping: `REVIEW` → **`REVIEW`**

If this transaction's decision is not `APPROVE`, a `FraudAlert` is created:

5. Severity lookup: `55.0 >= 81`? No. `>= 61`? No. `>= 31`? Yes → **`MEDIUM`**

Explanation (from `build_explanation`, sorted by weight descending):

```
[
  "Transaction initiated from a device never seen before for this customer",
  "Transaction amount ₹1,20,000 exceeds the high-value threshold of ₹1,00,000"
]
```

Reason summary (from `build_reason_summary`):

```
"Flagged for review because Transaction initiated from a device never seen before for
this customer; Transaction amount ₹1,20,000 exceeds the high-value threshold of
₹1,00,000. Total Risk Score 55."
```

So the end-to-end result for this transaction: `risk_score = 55.0`, `decision =
REVIEW`, `status = REVIEW`, and — because it did not resolve to `APPROVE` — a
`FraudAlert` with `severity = MEDIUM` is opened for analyst review.
