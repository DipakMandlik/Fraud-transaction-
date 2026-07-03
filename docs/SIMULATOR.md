# Transaction Simulator

The Transaction Simulator (`/simulator`, implemented in
`frontend/src/pages/TransactionSimulator.tsx`) is a live visualization of a single,
real transaction moving through the platform's actual detection pipeline. It is not a
separate mock pipeline or a scripted animation of outcomes: every stage timing,
rule verdict, risk score, and decision it displays is read from a transaction record
that was produced by the real backend pipeline (`app/services/transaction_engine.py`,
`rule_engine.py`, `risk_engine.py`). The simulator's only invented content is the
pacing between UI reveals — the underlying facts are genuine.

## The 11-stage pipeline animation

Stage names come from a single shared constant, `PIPELINE_STAGES`
(`frontend/src/types/index.ts`), rendered by `PipelineFlow.tsx`:

1. Customer Mobile
2. API Gateway
3. Transaction Validation
4. Customer Profile
5. Device Intelligence
6. Rule Engine
7. Behavior Engine
8. Risk Engine
9. Decision Engine
10. Core Banking
11. Completed

When a transaction is loaded, `TransactionSimulator`'s `play()` function walks the
`stageIndex` state forward one stage at a time, pausing between stages (`280ms *
speed` per stage up through the Rule Engine, then longer holds for the
behavior/risk/decision stages) and appending a randomized latency figure
(`8–55ms`, `12–32ms`, `5–20ms`, `20–50ms` depending on the stage) to a `latencies[]`
array. `PipelineFlow` renders each stage as a step in a vertical timeline: completed
stages get a green check and their latency in milliseconds, the current stage
pulses with a spinner, and a blocked transaction shows a red "Halted" stop instead of
continuing past the Decision Engine. The per-stage latency numbers are illustrative
timing for the animation, not measured production latency — the underlying pass/fail
and score data they accompany is real.

## Live Rule Execution Panel

The right-hand "Live Rule Execution" card renders `RuleExecutionPanel.tsx`, which is
handed the transaction's own `rule_evaluations` array (the same 17 rules evaluated by
the backend `RuleEngine` for every real transaction — see
`app/services/rule_seed_data.py`) plus a `revealedCount`. While the pipeline
animation is in the Rule Engine stage, `play()` increments `revealedRuleCount` once
per rule every `140ms * speed`, progressively revealing each rule's actual verdict:
a green "PASS" badge for rules that didn't fire, or a red "FAIL +{weight}" badge with
the rule's contributed risk weight for rules that did. Nothing here is scripted —
the panel is simply pacing the reveal of verdicts that the backend already computed
for that transaction.

## Animated risk gauge

`RiskGauge.tsx` (in `components/ui/`) renders the transaction's `risk_score` as a
270-degree speedometer arc. While the Risk Engine stage is active,
`riskCalculating` is set and the gauge shows "Calculating…" with no number; once the
real score arrives, `useCountUp` animates the displayed number up to the transaction's
actual score over ~1.1 seconds. The gauge's color and label are threshold-driven —
`APPROVE` (green, <31), `REVIEW` (blue, 31–60), `OTP VERIFICATION` (orange, 61–80),
`BLOCK` (red, 81+) — mirroring the same thresholds the backend `RiskEngine` uses to
pick a decision (`DECISION_THRESHOLDS` in `app/services/risk_engine.py`).

## Payment Interception sequence

If the transaction's status is `BLOCKED`, `play()` sets `phase` to `"decision"` and
then `"intercepted"` instead of continuing to Core Banking. The pipeline visually
halts at the Decision Engine stage (`stoppedAt`), and `PaymentInterception.tsx`
appears, showing:

- A pulsing shield/lock icon and "PAYMENT INTERCEPTED" banner.
- **Amount Protected** — the transaction's actual amount, formatted in its currency.
- A four-item checklist revealed one line at a time: "Core Banking Transaction
  Cancelled", "Customer Debit Prevented", "Reference ID Logged", "Settlement
  Cancelled" — i.e., the settlement being cancelled before it reaches core banking.

After the checklist finishes, `showNotification` triggers `CustomerNotification.tsx`,
a mobile-style alert preview reading "A transaction of {amount} to {beneficiary}
has been **stopped**...", with "This was me — Verify" and "Report Fraud" buttons
(UI-only in the simulator; no backend call is wired to these two buttons).

Finally, `caseSteps` counts up through three case-creation lines: "Alert Generated",
"Fraud Team Notified", "Investigation Case Created" — reflecting that a blocked
transaction really did create a `FraudAlert` row on the backend (see
`INVESTIGATION_MODULE.md`).

If the transaction was **not** blocked, `play()` instead advances through Core
Banking to Completed, and the page shows a green "Transaction settled successfully"
confirmation with the transaction reference.

## Incident Library (10 named demo scenarios)

The "Incident Library" card lists scenarios from `GET /api/demo/scenarios`
(`app/api/routes/demo.py`), which enumerates `DEMO_SCENARIOS` in
`app/services/fraud_injector.py`. Clicking a tile calls
`POST /api/demo/trigger/{code}`, which looks the code up in `DEMO_SCENARIOS` and runs
its generator function against the real database — constructing suspicious but
otherwise ordinary transaction requests and passing them through
`TransactionEngine.process()`, the exact same rule/risk pipeline organic traffic
uses. There is no separate scoring path for demo transactions (module docstring:
"...runs them through the exact same rule/risk pipeline as normal traffic so
detection is always genuine (never hand-scored)"). The ten scenarios:

| Code | Label | What it constructs |
|---|---|---|
| `HIGH_VALUE_UPI_FRAUD` | High-Value UPI Fraud | A single large-value transfer far above the customer's normal spend |
| `ACCOUNT_TAKEOVER` | Account Takeover | New device, foreign IP, and a brand-new beneficiary together |
| `IMPOSSIBLE_TRAVEL` | Impossible Travel | Two transactions at physically unreachable locations minutes apart |
| `NEW_DEVICE_LOGIN` | New Device Login | A payment from a device never associated with the customer |
| `CARD_SKIMMING` | Card Skimming | Multiple customer cards used from the same compromised IP |
| `ATM_CASH_OUT` | ATM Cash-Out Attack | A rapid burst of ATM withdrawals (cloned-card cash-out pattern) |
| `MULE_ACCOUNT` | Mule Account | Funds fanned out to several brand-new beneficiaries in quick succession |
| `STRUCTURING` | Money Laundering (Structuring) | Several transfers kept just under the reporting threshold |
| `VELOCITY_FRAUD` | Velocity Fraud | A rapid-fire burst of transactions in under a minute |
| `MERCHANT_FRAUD` | Merchant Fraud | A payment routed to a merchant already on the fraud blacklist |

The trigger endpoint returns every transaction the scenario produced (some, like
`IMPOSSIBLE_TRAVEL` or `MULE_ACCOUNT`, generate several); the frontend automatically
plays the last (usually highest-risk) transaction in the returned list through the
pipeline animation.

## Watch Live Feed and Replay Incident

- **Watch Live Feed** (`autoPlayLive` toggle, top of the page) subscribes to the
  WebSocket transaction stream (`useNotifications().onTransaction`) and automatically
  plays each newly arriving real transaction through the pipeline as it happens,
  provided nothing is already playing.
- **Replay Incident**: `AlertDetail.tsx`'s "Replay Incident" button navigates to
  `/simulator?replay={transaction_id}`. On mount, the simulator reads the `replay`
  query param, fetches that exact transaction via `GET /transactions/{id}`, and
  re-runs its exact recorded journey (same rule evaluations, same risk score, same
  decision) through `play()` — then strips the query param from the URL. A "Replay
  This Transaction" button also lets you re-run whatever transaction is currently
  loaded, and the "Recent Transactions" list lets you pick any of the last 8
  transactions to replay.

## Presentation Mode

The "Presentation Mode" toggle (`useDemoMode` hook, formerly labeled "Demo Mode")
reads/writes `GET /api/demo/mode` and `POST /api/demo/mode`
(`app/api/routes/demo.py`, backed by `app/scheduler.py`). It is purely a pacing
feature and does not change detection logic:

- **Backend effect**: toggling it on sets `_demo_mode = True` in the scheduler,
  which changes the interval between automatic background fraud injections
  (`inject_random_fraud_scenario`) from the default 30–60 seconds
  (`FRAUD_INJECTION_MIN_SECONDS` / `MAX_SECONDS` in `app/config.py`) to a tighter
  20–30 seconds (`DEMO_MODE_FRAUD_INTERVAL_SECONDS`), so a live audience sees a new
  scenario more frequently.
- **Frontend effect**: the simulator computes `speed = demoMode ? 1.5 : 1` and
  multiplies every `wait()` delay in the pipeline animation by it, slowing playback
  down (1.5x the base delays) so viewers can follow each stage during a
  presentation.

No rule weights, thresholds, or scoring logic are altered by Presentation Mode —
only injection cadence and animation speed.
