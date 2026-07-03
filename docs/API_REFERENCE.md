# API Reference

The Fraud Detection Platform backend is a FastAPI application. Every route below is implemented in
`backend/app/api/routes/` and validated with Pydantic v2 schemas from `backend/app/schemas/`.

When the backend is running, full interactive Swagger UI (with live request/response schemas and a
"Try it out" console) is available at **`/docs`** (e.g. `http://localhost:8000/docs`), and the raw OpenAPI
document at `/openapi.json`. This reference is a curated companion to that live documentation, intended for
architecture review and integration planning without needing a running instance.

## Conventions

- **Base URL**: All REST routes are mounted under `/api/...`. In Docker Compose, the frontend's Nginx proxies
  `/api/` and `/ws/` to the backend container, so browser clients simply call same-origin paths.
- **Authentication**: Every endpoint except `POST /api/auth/login` and `GET /api/health` requires a bearer
  session token: `Authorization: Bearer <token>`. Tokens are issued by `/api/auth/login` and validated by the
  `get_current_user` dependency (`backend/app/api/dependencies.py`), which resolves the token against a
  server-side session store. An expired or missing/invalid token returns `401 Unauthorized`.
- **Pagination**: List endpoints that support it accept `page` (default `1`) and `page_size` (default `25`,
  max `200`) query parameters and respond with an envelope of the shape `{ items, total, page, page_size }`.
- **Content type**: All request/response bodies are JSON unless otherwise noted (CSV export and the
  investigation report are the two exceptions, both plain-text/CSV downloads).

---

## Auth — `/api/auth`

No session token required for `login`; `logout` reads the token from the `Authorization` header if present;
`me` requires a valid session.

### `POST /api/auth/login`
Authenticate with a username/password and receive a bearer session token.

- **Request body** (`LoginRequest`): `username: str`, `password: str`
- **Response** (`LoginResponse`): `token: str`, `username: str`, `full_name: str`, `role: str`
- **Errors**: `401` if credentials are invalid.

### `POST /api/auth/logout`
Invalidate the current session token (if one is supplied via `Authorization: Bearer <token>`).

- **Response**: `{ "success": true }`

### `GET /api/auth/me`
Return the identity of the authenticated caller. **Auth required.**

- **Response**: `{ "username": str, "full_name": str, "role": str }`

---

## Dashboard — `/api/dashboard`

**Auth required** for every route in this group.

### `GET /api/dashboard`
Single-call snapshot for the main operations dashboard: headline KPIs, a fraud/volume trend series, channel
distribution, and a geo-distribution of transactions.

- **Response** (`DashboardResponse`):
  - `kpis` (`KpiSummary`): `transactions_today`, `transactions_per_minute`, `fraud_detected`,
    `fraud_prevented_amount`, `blocked`, `pending_investigation`, `high_risk_accounts`, `fraud_percentage`,
    `average_risk_score`, `average_detection_time_ms`, and a nested `system_health`
    (`SystemHealth`: `database`, `redis`, `rule_engine`, `risk_engine`, `streaming` — all booleans)
  - `trend` (`TrendPoint[]`): `label`, `total`, `fraud`
  - `channel_distribution` (`ChannelDistribution[]`): `channel`, `count`, `fraud_count`
  - `geo_points` (`GeoPoint[]`): `city`, `country`, `latitude`, `longitude`, `count`, `fraud_count`,
    `risk_score_avg`

---

## Transactions — `/api/transactions`

**Auth required** for every route in this group.

### `GET /api/transactions`
List transactions with filtering and pagination.

- **Query params**: `page`, `page_size`, `search`, `status`, `is_fraud` (bool), `min_risk` (float),
  `max_risk` (float), `transaction_type`, `country`, `customer_id` (int), `date_from` (datetime),
  `date_to` (datetime)
- **Response** (`TransactionListResponse`): `items: TransactionOut[]`, `total`, `page`, `page_size`

  `TransactionOut` fields: `id`, `transaction_ref`, `customer_id`, `customer_name`, `account_number`,
  `beneficiary_name`, `merchant_name`, `amount`, `currency`, `transaction_type`, `city`, `country`,
  `latitude`, `longitude`, `device_id`, `ip_address`, `status`, `risk_score`, `decision`, `is_fraud`,
  `fraud_scenario`, `triggered_rules: str[]`, `rule_evaluations: RuleEvaluationOut[]` (each with `code`,
  `name`, `category`, `weight`, `triggered`, `detail`), `processing_ms`, `reason`, `timestamp`.

### `GET /api/transactions/export`
Stream a CSV export of transactions matching the given filters (up to 5,000 rows).

- **Query params**: `search`, `status`, `is_fraud`, `transaction_type`
- **Response**: `text/csv` streaming download (`Content-Disposition: attachment; filename=transactions_export.csv`)
  with columns: Transaction Ref, Timestamp, Customer, Amount, Currency, Type, City, Country, Status, Risk
  Score, Decision, Is Fraud, Fraud Scenario, Reason.

### `GET /api/transactions/{transaction_id}`
Fetch a single transaction by numeric ID.

- **Response**: `TransactionOut` (see above)
- **Errors**: `404` if the transaction does not exist.

---

## Customers — `/api/customers`

**Auth required** for every route in this group.

### `GET /api/customers`
List customers with search/filter and pagination.

- **Query params**: `page`, `page_size`, `search`, `risk_segment`
- **Response** (`CustomerListResponse`): `items: CustomerOut[]`, `total`, `page`, `page_size`

  `CustomerOut` fields: `id`, `customer_code`, `full_name`, `email`, `phone`, `city`, `state`, `occupation`,
  `annual_income`, `account_open_date` (date), `risk_segment`, `status`, `kyc_level`,
  `avg_transaction_amount`.

### `GET /api/customers/{customer_id}`
Full customer 360° profile: base profile plus linked accounts, devices, beneficiaries, and aggregate risk
stats.

- **Response** (`CustomerDetailOut`): all `CustomerOut` fields, plus:
  - `accounts: AccountOut[]` — `id`, `account_number`, `account_type`, `bank_name`, `ifsc_code`, `balance`,
    `daily_limit`, `status`
  - `devices: DeviceOut[]` — `id`, `device_uid`, `device_type`, `os`, `is_trusted`, `first_seen_at`,
    `last_seen_at`
  - `beneficiaries: BeneficiaryOut[]` — `id`, `beneficiary_name`, `account_number`, `bank_name`,
    `relationship_type`, `is_frequent`, `transfer_count`, `added_at`
  - `total_transactions: int`, `fraud_incidents: int`, `highest_risk_score: float`
- **Errors**: `404` if the customer does not exist.

### `GET /api/customers/{customer_id}/transactions`
Paginated transaction history for one customer.

- **Query params**: `page`, `page_size`
- **Response**: `TransactionListResponse` (same shape as `GET /api/transactions`)

---

## Rules — `/api/rules`

**Auth required** for every route in this group. This is the live configuration surface for the 17-rule fraud
engine — changes take effect immediately without a redeploy.

### `GET /api/rules`
List every configured fraud rule.

- **Response**: `RuleOut[]` — `id`, `code`, `name`, `description`, `category`, `weight`, `threshold`
  (nullable), `config` (free-form dict), `enabled`, `priority`, `updated_at`.

### `PATCH /api/rules/{rule_id}`
Partially update a rule's tuning parameters. Only fields present in the body are changed.

- **Request body** (`RuleUpdate`, all optional): `weight`, `threshold`, `config` (dict), `enabled`,
  `priority`
- **Response**: the updated `RuleOut`
- **Errors**: `404` if the rule does not exist.

---

## Fraud Alerts — `/api/alerts`

**Auth required** for every route in this group. Alerts are generated automatically when a transaction's risk
score crosses an alerting threshold, and drive the analyst investigation workflow.

### `GET /api/alerts`
List alerts with filtering and pagination.

- **Query params**: `page`, `page_size`, `status`, `severity`, `customer_id`
- **Response** (`AlertListResponse`): `items: AlertOut[]`, `total`, `page`, `page_size`

  `AlertOut` fields: `id`, `alert_ref`, `transaction_id`, `customer_id`, `customer_name`, `severity`,
  `risk_score`, `status`, `assigned_investigator` (nullable), `reason_summary`, `explanation: str[]`,
  `created_at`, `updated_at`.

### `GET /api/alerts/{alert_id}`
Full alert detail, including the underlying transaction and the investigation history.

- **Response** (`AlertDetailOut`): all `AlertOut` fields, plus `transaction: TransactionOut` and
  `investigations: InvestigationOut[]` (each with `id`, `investigator`, `action`, `notes`, `created_at`),
  sorted oldest-first.
- **Errors**: `404` if the alert does not exist.

### Alert action endpoints

Each of the following actions accepts a body and returns the updated `AlertOut`. All operate on
`/api/alerts/{alert_id}/<action>` and record an entry in the alert's investigation trail
(`AlertDetailOut.investigations`) via `app/services/alert_service.py`. `404` if the alert does not exist.

| Method & Path | Purpose |
|---|---|
| `POST /api/alerts/{alert_id}/assign` | Assign the alert to an investigator |
| `POST /api/alerts/{alert_id}/investigate` | Mark the alert as under active investigation |
| `POST /api/alerts/{alert_id}/approve` | Approve the underlying transaction as legitimate |
| `POST /api/alerts/{alert_id}/block` | Block the transaction/account action |
| `POST /api/alerts/{alert_id}/mark-safe` | Mark the alert as a false positive / safe |
| `POST /api/alerts/{alert_id}/notes` | Append an investigator note without changing status |
| `POST /api/alerts/{alert_id}/close` | Close out the alert |
| `POST /api/alerts/{alert_id}/escalate` | Escalate the alert to a senior investigator/team |
| `POST /api/alerts/{alert_id}/freeze-account` | Freeze the customer's account pending review |
| `POST /api/alerts/{alert_id}/request-verification` | Request step-up verification from the customer |

- **Request body** for `assign`: `AssignRequest` — `investigator: str`
- **Request body** for all others above: `AlertActionRequest` — `investigator: str`, `notes: str` (default `""`)
- **Response**: `AlertOut` (see above)

### `GET /api/alerts/{alert_id}/report`
Download a human-readable investigation report for the alert.

- **Response**: `text/plain` download (`Content-Disposition: attachment; filename={alert_ref}_report.txt`),
  body generated by `app/services/report_service.build_investigation_report`.
- **Errors**: `404` if the alert does not exist.

---

## Investigations — `/api/investigations`

**Auth required.**

### `GET /api/investigations`
Global feed of investigation actions across all alerts, most recent first.

- **Query params**: `limit` (default `50`, max `500`)
- **Response**: `InvestigationOut[]` — `id`, `investigator`, `action`, `notes`, `created_at`.

---

## Analytics — `/api/analytics`

**Auth required.**

### `GET /api/analytics`
Aggregate fraud analytics over a rolling time window.

- **Query params**: `hours` (default `24`, `1`–`168`)
- **Response** (`AnalyticsResponse`):
  - `hourly_fraud`, `risk_distribution`, `channel_distribution`, `country_distribution`, `fraud_reasons`,
    `transaction_volume` — each a `LabeledCount[]` (`label: str`, `value: float`)
  - `top_risk_customers: TopRiskCustomer[]` — `customer_id`, `customer_name`, `customer_code`,
    `max_risk_score`, `fraud_incidents`, `total_transactions`
  - `approval_rate: float`, `blocked_rate: float`, `false_positive_rate: float`

---

## Settings — `/api/settings`

**Auth required.** Exposes the live transaction-generation and fraud-injection cadence, and lets an operator
pause/resume the in-process background scheduler (see `docs/DEPLOYMENT.md` for scheduler architecture notes).

### `GET /api/settings`
- **Response** (`SettingsOut`): `txn_min_interval_seconds`, `txn_max_interval_seconds`,
  `fraud_injection_min_seconds`, `fraud_injection_max_seconds`, `fraud_ratio`, `scheduler_running: bool`.

### `POST /api/settings/scheduler/pause`
Pause the APScheduler background scheduler (stops new synthetic transactions/fraud injections).

- **Response**: `{ "scheduler_running": false }`

### `POST /api/settings/scheduler/resume`
Resume the scheduler.

- **Response**: `{ "scheduler_running": true }`

---

## Health — `/api/health`

**No auth required.** Suitable for container orchestration liveness/readiness probes and load balancer checks.

### `GET /api/health`
Checks database connectivity (`SELECT 1`) and Redis connectivity (`PING`).

- **Response**: `{ "status": "ok" | "degraded", "database": bool, "redis": bool }` — `status` is `"degraded"`
  if either dependency check fails.

---

## Demo — `/api/demo`

**Auth required.** Drives the platform's live fraud-scenario simulator, used for stakeholder demonstrations.

### `GET /api/demo/scenarios`
List the catalog of triggerable fraud scenarios.

- **Response**: `DemoScenarioOut[]` — `code`, `label`, `description`. The ten scenarios defined in
  `app/services/fraud_injector.py` (`DEMO_SCENARIOS`) are:

  | Code | Label | Description |
  |---|---|---|
  | `HIGH_VALUE_UPI_FRAUD` | High-Value UPI Fraud | A single large-value transfer far above the customer's normal spend. |
  | `ACCOUNT_TAKEOVER` | Account Takeover | New device, foreign IP and a brand-new beneficiary appear together. |
  | `IMPOSSIBLE_TRAVEL` | Impossible Travel | Two transactions at physically unreachable locations minutes apart. |
  | `NEW_DEVICE_LOGIN` | New Device Login | A payment initiated from a device never associated with this customer. |
  | `CARD_SKIMMING` | Card Skimming | Multiple customer cards used from the same compromised IP address. |
  | `ATM_CASH_OUT` | ATM Cash-Out Attack | A rapid burst of ATM withdrawals typical of a cloned-card cash-out. |
  | `MULE_ACCOUNT` | Mule Account | Funds fanned out to several brand-new beneficiaries in quick succession. |
  | `STRUCTURING` | Money Laundering (Structuring) | Several transfers kept just under the regulatory reporting threshold. |
  | `VELOCITY_FRAUD` | Velocity Fraud | A rapid-fire burst of transactions in under a minute. |
  | `MERCHANT_FRAUD` | Merchant Fraud | A payment routed to a merchant already on the fraud blacklist. |

### `POST /api/demo/trigger/{code}`
Immediately run the named scenario against an eligible seeded customer, generating one or more real
transactions (and, where the scenario crosses the alert threshold, real alerts).

- **Path param**: `code` — one of the scenario codes above.
- **Response** (`DemoTriggerResponse`): `scenario_code`, `transactions: TransactionOut[]`,
  `primary_transaction_id` (nullable — the last transaction generated by the scenario).
- **Errors**: `404` for an unknown scenario code; `503` if no eligible customer could be found to run the
  scenario against (retryable).

### `GET /api/demo/mode`
Return whether "demo mode" (presentation-pace fraud injection) is active.

- **Response** (`DemoModeResponse`): `demo_mode: bool`, `fraud_injection_min_seconds`,
  `fraud_injection_max_seconds` — these reflect the tightened 20–30s cadence when demo mode is on, or the
  configured `FRAUD_INJECTION_MIN/MAX_SECONDS` otherwise.

### `POST /api/demo/mode`
Toggle demo mode on/off. Takes effect on the scheduler's next reschedule (near-immediate).

- **Request body** (`DemoModeRequest`): `enabled: bool`
- **Response**: `DemoModeResponse` (same shape as `GET /api/demo/mode`)

---

## WebSocket — `/ws/events`

**Auth required via query parameter** (WebSocket connections cannot carry a standard `Authorization` header
from a browser): connect to `wss://<host>/ws/events?token=<session-token>`. The server resolves the token the
same way as the REST bearer-token check; an invalid or missing token closes the connection immediately with
close code `4401`.

Once connected, the socket has no client-to-server request/response protocol — it simply subscribes to the
backend's internal Redis pub/sub channel (`app/services/event_bus.py`) and forwards every published message
to the client verbatim as a text frame. In practice these messages are the same transaction/alert events
emitted by the rule engine and fraud injector as they happen, giving every connected browser a live,
zero-polling feed of new transactions and alerts. The connection closes when the client disconnects or the
server-side Redis subscription ends.

---

## Router summary

| Router | Prefix | Auth |
|---|---|---|
| Auth | `/api/auth` | Public (`login`), session required (`logout` reads token if present, `me`) |
| Dashboard | `/api/dashboard` | Session required |
| Transactions | `/api/transactions` | Session required |
| Customers | `/api/customers` | Session required |
| Rules | `/api/rules` | Session required |
| Fraud Alerts | `/api/alerts` | Session required |
| Investigations | `/api/investigations` | Session required |
| Analytics | `/api/analytics` | Session required |
| Settings | `/api/settings` | Session required |
| Health | `/api/health` | Public |
| Demo | `/api/demo` | Session required |
| WebSocket events | `/ws/events` | Session token via `?token=` query param |

For request/response validation details beyond what's summarized here (exact OpenAPI JSON Schema, example
payloads, and the ability to execute calls against a running instance), use the Swagger UI at `/docs`.
