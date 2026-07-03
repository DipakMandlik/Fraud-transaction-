# Fraud Alert Center / Investigation Module

The Fraud Alert Center is the analyst-facing case-management workflow built on the
`fraud_alerts` and `investigations` tables. An alert is created automatically by
`TransactionEngine.process()` (`app/services/transaction_engine.py`) whenever a
transaction's routing decision is not `APPROVE` — i.e., for `REVIEW`,
`OTP_VERIFICATION`, and `BLOCK` decisions. Every action an investigator takes against
an alert is implemented in `app/services/alert_service.py`, exposed via
`app/api/routes/alerts.py`, and permanently logged as a row in `investigations`.

## Alert lifecycle

**Model**: `app/models/fraud_alert.py` — `FraudAlert` has `status` (`String(20)`,
default `"OPEN"`), `severity` (`String(20)`), `risk_score`, `assigned_investigator`,
`reason_summary`, `explanation` (JSON list of strings), and a one-to-many
relationship to `investigations`.

**Status strings** (verified against `alert_service.py` and the frontend's
`alertStatusTone` mapping in `components/ui/Badge.tsx`):

| Status | Meaning | Set by |
|---|---|---|
| `OPEN` | Newly created, unassigned | Created at transaction time |
| `INVESTIGATING` | Assigned or actively being worked | `assign`, `investigate`, `escalate` |
| `CLOSED` | Case resolved with a verdict | `approve`, `block`, `close` |
| `FALSE_POSITIVE` | Confirmed as a legitimate transaction, incorrectly flagged | `mark_safe` |

**Severity levels** come from `severity_for_score()` in
`app/services/risk_engine.py`, computed once at creation time from the transaction's
risk score:

| Severity | Score range |
|---|---|
| `CRITICAL` | ≥ 81 |
| `HIGH` | 61 – 80 |
| `MEDIUM` | 31 – 60 |
| `LOW` | < 31 |

(These are the same thresholds `RiskGauge` uses on the frontend to label
BLOCK / OTP VERIFICATION / REVIEW / APPROVE.) Severity can also be raised directly by
the `escalate` action, regardless of the original score.

## Investigator actions

All actions are `POST /api/alerts/{alert_id}/{action}` in
`app/api/routes/alerts.py`, delegating to `app/services/alert_service.py`. Every
action calls an internal `_record()` helper that inserts a row into `investigations`
(`investigator`, `action`, `notes`, `created_at`) **and** a matching `AuditLog` row
(`entity_type="FRAUD_ALERT"`), then commits, refreshes, and publishes an
`alert.updated` event over the event bus. This makes every action a permanent,
timestamped, attributed audit-trail entry — nothing is mutated silently.

| Endpoint | Function | Effect |
|---|---|---|
| `POST /assign` | `assign()` | Sets `assigned_investigator`; if status was `OPEN`, moves it to `INVESTIGATING`. Logs action `ASSIGN`. |
| `POST /investigate` | `investigate()` | Sets status to `INVESTIGATING`; assigns the caller as investigator if none is set yet. Logs action `NOTE`. |
| `POST /approve` | `approve()` | Sets alert status to `CLOSED`; sets the linked transaction's `status` to `APPROVED` and `decision` to `APPROVE` — an investigator override of the original block/review decision. Logs action `APPROVE`. |
| `POST /block` | `block()` | Sets alert status to `CLOSED`; sets the transaction's `status` to `BLOCKED` and `decision` to `BLOCK`. Logs action `BLOCK`. |
| `POST /mark-safe` | `mark_safe()` | Sets alert status to `FALSE_POSITIVE`; approves the transaction (`status="APPROVED"`, `decision="APPROVE"`). Logs action `MARK_SAFE`. |
| `POST /notes` | `add_note()` | Appends a note with no status change. Logs action `NOTE`. |
| `POST /close` | `close()` | Sets alert status to `CLOSED` with no transaction-side effect. Logs action `CLOSE`. |
| `POST /escalate` | `escalate()` | Sets status to `INVESTIGATING`; forces severity to `CRITICAL` if it wasn't already. Logs action `ESCALATE`. |
| `POST /freeze-account` | `freeze_account()` | Sets the **customer's** `status` to `SUSPENDED` (`alert.transaction.customer.status = "SUSPENDED"`) — this is account-level, not just alert-level. Logs action `FREEZE_ACCOUNT`. |
| `POST /request-verification` | `request_verification()` | No status change; logs a `REQUEST_VERIFICATION` entry representing an outbound customer verification request. |

The frontend (`frontend/src/pages/AlertDetail.tsx`) exposes all of these as buttons
in the "Case Actions" panel, each opening a confirmation dialog that captures free-
text notes before submitting. `investigate`, `approve`, `block`, `mark-safe`,
`escalate`, `freeze-account`, `request-verification`, and adding a note all funnel
through a shared `AlertActionRequest` payload (`investigator`, `notes`); `assign` is
a simpler one-shot action ("Assign to Me"). Once an alert's status is `CLOSED` or
`FALSE_POSITIVE`, the primary action buttons are disabled in the UI (`isClosed`
check), though `request-verification` and `note` remain available.

## Investigation Timeline

`components/alerts/InvestigationTimeline.tsx` builds a single chronological list by
concatenating two sources:

1. **Detection events**, synthesized from real data by `buildDetectionEvents()`:
   "Transaction Initiated" → one "{Rule Name} Triggered" entry per rule in the
   transaction's `rule_evaluations` where `triggered` is true (with the rule's real
   `detail` string) → "Risk Score {score} Calculated" → "Payment Blocked" or "Routed
   to {Decision}" (using the alert's real `reason_summary`) → "Fraud Alert Case
   Created" if blocked. The component's own comment is explicit about what is real
   versus presentational: "The underlying facts (which rules fired, final risk
   score, decision) are all genuine — only the illustrative sub-second spacing
   between them is presentational."
2. **Investigation records**, one entry per row in `alert.investigations` (already
   sorted chronologically by the backend), rendered as "{Action} — {Investigator}"
   with the real note text and real `created_at` timestamp.

The two lists are merged into one ordered timeline, giving a continuous narrative
from initial detection through every human action taken on the case.

## Behavior Comparison

`components/alerts/BehaviorComparison.tsx` renders a "Normal vs Current" table
comparing the customer's baseline profile against the flagged transaction, across
six rows:

| Attribute | Normal (baseline) | Current (this transaction) | Anomaly if |
|---|---|---|---|
| Location | Customer's home city/state | Transaction's city/country | City differs from customer's home city |
| Transaction Amount | Customer's average transaction amount | Transaction amount (with an "Nx" multiplier when ≥2x average) | Amount is ≥5x the customer's average |
| Device | "Recognized device on file" | Whether the transaction's device ID matches one of the customer's known devices | Device is not among the customer's registered devices |
| Beneficiary | "Existing, previously paid beneficiary" | Beneficiary name (annotated "never paid before" if flagged) | The `NEW_BENEFICIARY` rule triggered on this transaction |
| Merchant | "Reputable / previously used merchant" | Merchant name | The `BLACKLISTED_MERCHANT` rule triggered |
| Time of Activity | "Within typical active hours" | Transaction's local time-of-day | The `ODD_HOUR_ACTIVITY` rule triggered |

Beneficiary and Merchant rows only render when the transaction actually has a
beneficiary or merchant, respectively. Anomalous cells are styled in the fraud color
to draw the eye.

## Risk Score Breakdown

`components/alerts/RiskBreakdown.tsx` filters the transaction's `rule_evaluations`
down to only the rules that actually triggered, sorts them by weight (highest
contribution first), and renders each as a horizontal bar sized relative to the
largest contributing rule's weight, labeled with the rule name and its `+weight`
contribution. A footer line totals the real `risk_score` out of 100. If no rules
triggered, it shows "No rules contributed to this score." This is a direct visual
decomposition of the backend `RiskEngine.score()` calculation, which sums the
weights of every rule in `RuleTriggerResult` that fired.

## Downloadable investigation report

`GET /api/alerts/{alert_id}/report` (in `app/api/routes/alerts.py`) calls
`build_investigation_report()` in `app/services/report_service.py` and returns it as
`PlainTextResponse` with a `Content-Disposition: attachment` header
(`{alert_ref}_report.txt`). The frontend's "Generate Investigation Report" button
(`alertsApi.downloadReport`) triggers this download directly from `AlertDetail.tsx`.

The report is a formatted plain-text document with:

- A confidentiality header:
  ```
  ========================================================================
  FRAUD DETECTION PLATFORM
  Powered by PiByThree
  CONFIDENTIAL — INVESTIGATION REPORT
  ========================================================================
  ```
- Alert metadata (reference, generated timestamp, status, severity).
- A **Customer** section (name, customer code, risk segment, city/state).
- A **Transaction** section (reference, amount, channel, timestamp, location, IP,
  device, status, decision, risk score).
- A **Why This Was Flagged** section listing the alert's `explanation` bullet points.
- A **Rule Evaluation** section listing every one of the transaction's 17 evaluated
  rules with a `TRIGGERED`/`passed` verdict, its weight, and its detail text.
- An **Investigation Timeline** section listing every real `investigations` row
  (timestamp, action, investigator, notes), in chronological order.
- A confidentiality footer:
  ```
  ========================================================================
  Report generated by the Fraud Detection Platform for {customer name}.
  CONFIDENTIAL — For authorized internal use only. Do not distribute externally.
  Powered by PiByThree · Enterprise AI Solutions
  ========================================================================
  ```

Because the report is assembled directly from the alert's transaction, rule
evaluations, and investigation records at request time, it always reflects the
case's current state, including any actions taken since the alert was first opened.
