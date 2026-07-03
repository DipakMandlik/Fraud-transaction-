# Rule Engine

Source: `backend/app/services/rule_engine.py`, `backend/app/services/rule_seed_data.py`,
`backend/app/services/context_builder.py`, `backend/app/models/rule.py`,
`backend/app/api/routes/rules.py`

## What it is

The Rule Engine is the fraud-detection layer that inspects every transaction against a
fixed catalogue of 17 configurable rules. Each rule is a small pure function — an
"evaluator" — that looks at a snapshot of the transaction and the customer's recent
history and returns a verdict: did this rule fire or not, and why.

The engine itself (`RuleEngine` in `rule_engine.py`) does not decide whether a
transaction is fraudulent. That is the job of the downstream Risk Engine (see
`RISK_ENGINE.md`), which sums the weights of whichever rules fired. The Rule Engine's
only responsibility is to run every enabled rule against the transaction and report a
structured, human-readable result for each one.

## Why it evaluates every rule, not just until the first match

Most naive rule systems stop at the first hit ("short-circuit" evaluation) because all
they need is a single reason to flag a transaction. This platform deliberately does the
opposite. `RuleEngine.evaluate_all()` runs **every enabled rule**, whether it triggers or
not, and returns a `RuleEvaluationResult` for each one:

```python
@dataclass
class RuleEvaluationResult:
    code: str
    name: str
    category: str
    weight: float
    triggered: bool
    detail: str
```

This full-catalogue evaluation exists for two reasons that are visible directly in the
code:

1. **Live transparency in the UI.** The Transaction Simulator screen
   (`frontend/src/pages/TransactionSimulator.tsx`) renders a live rule-execution
   checklist while a transaction is being scored. Analysts need to see *all* 17 rules
   and their pass/fail status, not just the ones that happened to fire, to understand
   why a transaction was or wasn't flagged and to build trust in the system's
   decisions.
2. **Audit completeness.** Every transaction record persists the full evaluation set
   in the `rule_evaluations` JSON column (populated in
   `TransactionEngine.process()`, `backend/app/services/transaction_engine.py`), not
   just the triggered subset. This means an auditor or investigator reviewing a
   transaction months later can see exactly what every rule concluded at the time —
   including the rules that *didn't* fire and why — without needing to re-run
   detection logic against decayed data.

`RuleEngine.evaluate()` is the second, narrower entry point: it calls `evaluate_all()`
internally and filters the list down to only `triggered=True` results. This is what
feeds the Risk Engine's scoring and the Explanation Engine's narrative — those
components only ever need to know what fired, not the full checklist.

Rules are evaluated in ascending `priority` order (lower number = evaluated first),
and any rule with `enabled=False` in the database is skipped entirely — it does not
appear in `evaluate_all()`'s output at all, triggered or not.

## The 17 rules

All 17 rules are seeded from `RULE_DEFINITIONS` in `rule_seed_data.py` into the `rules`
Postgres table. The table below lists each rule's code, name, category, default weight,
and its precise trigger condition, derived from the evaluator function in
`rule_engine.py` and the seeded `config`/`threshold`.

| Code | Name | Category | Default Weight | Trigger Condition |
|---|---|---|---|---|
| `AMOUNT_ANOMALY` | Amount Anomaly | AMOUNT | 25 | Transaction amount is at least 5x (`config.multiplier`) the customer's historical average transaction amount. Skipped (never triggers) if the customer has no historical average. |
| `LARGE_AMOUNT` | Large Transaction Amount | AMOUNT | 20 | Transaction amount strictly exceeds ₹1,00,000 (`config.amount_threshold`). |
| `NEW_DEVICE` | New / Unrecognized Device | DEVICE | 35 | The transaction's device UID has no matching `Device` row previously seen for this customer. |
| `FOREIGN_COUNTRY` | Foreign Country Transaction | LOCATION | 35 | The transaction's country differs from the customer's home country (hardcoded to "India" in `context_builder.py`). |
| `IMPOSSIBLE_TRAVEL` | Impossible Travel Velocity | LOCATION | 35 | The implied speed between this transaction's location and the customer's immediately preceding transaction's location exceeds 900 km/h (`config.max_speed_kmh`), computed as distance (haversine) divided by elapsed time. Does not trigger if there is no prior transaction to compare against. |
| `VELOCITY_BURST` | High Velocity - Rapid Multiple Transactions | VELOCITY | 35 | 5 or more transactions (`config.count`) for this customer within a rolling 30-second window (`config.window_seconds`), counting the current transaction. |
| `NEW_BENEFICIARY` | New Beneficiary | BENEFICIARY | 35 | Funds are transferred to a beneficiary who has never received a transfer from this customer before. |
| `BLACKLISTED_MERCHANT` | Blacklisted Merchant | MERCHANT | 45 | The transaction's merchant is flagged as blacklisted (`merchant_is_blacklisted` on the proposed transaction). |
| `BLACKLISTED_IP` | Blacklisted IP Address | NETWORK | 40 | The transaction's originating IP address matches an `entity_value` of type `IP_ADDRESS` in the `Blacklist` table. |
| `DORMANT_ACCOUNT_ACTIVE` | Dormant Account Suddenly Active | BEHAVIOR | 35 | The customer's account is dormant (status `DORMANT`, or 90+ days — `config.dormant_days` — since `last_activity_at`) and a transaction is suddenly initiated. |
| `ROUND_NUMBER_LAUNDERING` | Round Number Pattern | PATTERN | 12 | The transaction amount is an exact multiple of ₹5,000 (`amount % 5000 == 0`) and is at least ₹10,000. |
| `STRUCTURING` | Structuring - Sub-threshold Transfers | PATTERN | 30 | 3 or more (`config.count`) transfers between ₹80,000 and just under ₹1,00,000 (`config.threshold`) for this customer within the trailing 60 minutes (`config.window_minutes`), counting the current transaction. |
| `MULTIPLE_CARDS_SAME_IP` | Multiple Accounts on Same IP | NETWORK | 35 | 3 or more (`config.account_count`) distinct customer accounts have transacted from the same originating IP address within the trailing 10 minutes (`config.window_minutes`). |
| `ODD_HOUR_ACTIVITY` | Odd Hour Transaction | BEHAVIOR | 10 | The transaction's local hour falls outside the customer's typical active-hour range (`customer.common_login_hour_start`–`common_login_hour_end`). |
| `REPEATED_FAILED_LOGIN` | Repeated Failed Login Attempts | AUTH | 25 | 3 or more (`config.count`) failed authentication attempts were recorded shortly before this transaction. |
| `TRANSACTION_SPLITTING` | Transaction Splitting to Same Beneficiary | PATTERN | 35 | 3 or more (`config.count`) transfers sent to the same beneficiary within a trailing 30-minute window (`config.window_minutes`), counting the current transaction. |
| `ACCOUNT_TAKEOVER_PATTERN` | Account Takeover Indicators | BEHAVIOR | 35 | The transaction simultaneously involves a new device, a foreign/new location, and a new beneficiary (`is_new_device AND is_foreign AND beneficiary_is_new`), computed as a single combined signal (`account_takeover_signal`) in `context_builder.py`. |

Rule priority (evaluation order, ascending) is also seeded per rule, e.g.
`IMPOSSIBLE_TRAVEL` runs first (priority 5) and `ODD_HOUR_ACTIVITY` runs last
(priority 70), but priority order has no effect on scoring — every enabled rule
still gets evaluated regardless of order, since `evaluate_all()` never short-circuits.

## Rules are data, not code — live editing via the UI

Weight, threshold, `config`, `priority`, and `enabled` are **not** hardcoded constants
in the evaluator functions. `RULE_DEFINITIONS` in `rule_seed_data.py` only seeds the
initial rows; from that point on, the live values live in the `rules` Postgres table
(`app.models.rule.Rule`):

```python
class Rule(Base):
    __tablename__ = "rules"
    id, code, name, description, category
    weight: float
    threshold: float | None
    config: dict          # JSON column, e.g. {"multiplier": 5}
    enabled: bool
    priority: int
```

The Rule Engine screen in the frontend (`frontend/src/pages/Rules.tsx`) lists all
rules and lets an operator edit them. Saving a change calls:

```
PATCH /api/rules/{rule_id}
```

(`backend/app/api/routes/rules.py`), which accepts a partial `RuleUpdate` payload
(`weight`, `threshold`, `config`, `enabled`, `priority` — all optional) and persists it
directly onto the `Rule` row via SQLAlchemy `setattr` + `db.commit()`. There is no
in-memory cache to invalidate and no code path to redeploy: `TransactionEngine.process()`
calls `db.query(Rule).all()` fresh on every single transaction
(`backend/app/services/transaction_engine.py`), so a weight change, a threshold change,
or disabling a rule entirely takes effect on the very next transaction evaluated.

This also means an operator can raise a rule's weight to make it more decisive, lower
a threshold to make a rule more sensitive, adjust `config` values (e.g. change the
velocity window from 30 to 60 seconds), reorder evaluation via `priority`, or disable a
noisy rule outright — all without a code change or deployment.

## TransactionContext: a fresh snapshot per transaction

Every evaluator function receives the same two arguments: the `Rule` row being
evaluated (for its `config`/`threshold`), and a `TransactionContext` — a dataclass built
fresh from the database for every incoming transaction by
`build_context()` in `context_builder.py`. Evaluators are pure functions of these two
inputs; they perform no database queries themselves.

`TransactionContext` bundles everything the rule catalogue could possibly need,
computed once up front:

- **Device history** — `is_new_device` (looked up against the customer's known
  `Device` rows)
- **Location/velocity history** — `distance_km_from_last`, `seconds_since_last_txn`,
  `implied_speed_kmh` (all derived from the customer's most recent prior transaction),
  plus `recent_txn_count_window` (transaction count in the last 30 seconds)
- **Dormancy status** — `is_dormant_account`, `dormant_days`, derived from the
  customer's `status` field and `last_activity_at` timestamp
- **Blacklist membership** — `is_blacklisted_merchant`, `is_blacklisted_ip`, checked
  against the `Blacklist` table and the proposed merchant
- **Beneficiary history** — `is_new_beneficiary`, `beneficiary_name`,
  `repeat_beneficiary_transfer_count` (transfers to the same beneficiary in the last 30
  minutes)
- **Pattern signals** — `is_round_number`, `sub_threshold_transfer_count`
  (structuring window), `distinct_accounts_same_ip_recent`, `is_odd_hour`,
  `account_takeover_signal`, `failed_login_attempts`
- Core transaction facts — `amount`, `avg_transaction_amount`, `transaction_type`,
  `timestamp`, `city`, `home_country_name`/`txn_country_name`

Because this context is rebuilt from live database state for every transaction (not
cached or reused), each evaluation reflects the customer's *current* history — the most
recent device list, the most recent transaction location, the current dormancy status,
etc. This is what lets a single evaluator like `NEW_DEVICE` correctly change from
`triggered=True` to `triggered=False` the moment a device is used a second time — the
first successful transaction from that device gets recorded (`_apply_side_effects` in
`transaction_engine.py` inserts a new `Device` row), so the next `build_context()` call
sees it as known.

## Human-readable results, not just booleans

Every evaluator returns a `tuple[bool, str]` — `(triggered, detail)` — and both the
positive and negative case get a specific, data-backed sentence, not a generic
pass/fail label. For example, `_r_large_amount`:

```python
def _r_large_amount(ctx, rule):
    threshold = rule.config.get("amount_threshold", 100000)
    if ctx.amount > threshold:
        return True, f"Transaction amount ₹{ctx.amount:,.0f} exceeds the high-value threshold of ₹{threshold:,.0f}"
    return False, f"Amount ₹{ctx.amount:,.0f} is below the ₹{threshold:,.0f} high-value threshold"
```

Both branches interpolate the actual transaction amount and threshold. This is true
across all 17 evaluators — e.g. `IMPOSSIBLE_TRAVEL` reports the exact implied km/h and
the distance/time it was derived from; `VELOCITY_BURST` reports the exact count of
transactions seen in the window either way.

This detail string is what powers:

- The pass/fail line shown next to each rule in the Transaction Simulator's live
  rule-execution panel (via `RuleEvaluationResult.detail`), so an analyst sees *why*
  each rule passed or failed, not just a checkmark.
- The transaction's persisted `rule_evaluations` JSON, which stores the full
  evaluate_all() output (code, name, category, weight, triggered, detail) for every
  rule, for later audit review.
- The Explanation Engine's narrative for triggered rules (see `RISK_ENGINE.md`), which
  reuses these same `detail` strings verbatim as the fraud explanation shown to
  reviewers — no separate explanation text is generated.
