import {
  Activity,
  Boxes,
  Clock,
  Database,
  Gauge,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Radio,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SystemHealth } from "@/types";

export type LayerId = "presentation" | "application" | "detection" | "processing" | "storage" | "monitoring";

export interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "WS";
  path: string;
  note: string;
}

export interface ArchComponent {
  id: string;
  name: string;
  tagline: string;
  layer: LayerId;
  icon: LucideIcon;
  overview: string;
  responsibilities: string[];
  inputs: string[];
  outputs: string[];
  sourceFiles: string[];
  apiEndpoints: ApiEndpoint[];
  dependencies: string[];
  /** Key into the live SystemHealth payload this node's status dot reflects, if any. */
  healthKey?: keyof SystemHealth;
  /** Honest implementation note — shown in the panel so the diagram never overstates reality. */
  implementationNote?: string;
}

export const LAYERS: { id: LayerId; label: string; description: string }[] = [
  { id: "presentation", label: "Presentation Layer", description: "Where transactions originate and where humans watch the system work" },
  { id: "application", label: "Application Layer", description: "The stateless API surface every request passes through" },
  { id: "detection", label: "Detection Layer", description: "Where every transaction is scored for fraud risk" },
  { id: "processing", label: "Processing Layer", description: "Case management and the background jobs that drive the live demo" },
  { id: "storage", label: "Storage Layer", description: "The system of record and the real-time transport" },
  { id: "monitoring", label: "Monitoring Layer", description: "Live delivery of what just happened back to the UI" },
];

/** The strict left-to-right story a transaction follows, end to end. */
export const PIPELINE_ORDER = [
  "customer",
  "gateway",
  "auth",
  "validation",
  "rules",
  "risk",
  "decision",
  "alerts",
  "database",
  "stream",
  "dashboard",
] as const;

export const COMPONENTS: ArchComponent[] = [
  {
    id: "customer",
    name: "Customer Channel",
    tagline: "Where every transaction originates",
    layer: "presentation",
    icon: Smartphone,
    overview:
      "The originating channel for a transaction — UPI, ATM, card, or bank transfer. In this environment there are no external customers, so traffic is produced by a background scheduler running the same code path a real channel integration would call.",
    responsibilities: [
      "Represents the 7 supported channels: UPI, ATM, Debit Card, Credit Card, NEFT, RTGS, IMPS",
      "In demo mode: generates realistic background traffic weighted by channel popularity",
      "Also drives on-demand fraud scenarios from the Transaction Simulator's Incident Library",
    ],
    inputs: ["Customer/account selection", "Channel + amount", "Device & location context"],
    outputs: ["A proposed transaction, handed to the API Gateway"],
    sourceFiles: ["backend/app/services/transaction_generator.py", "backend/app/services/fraud_injector.py", "backend/app/scheduler.py"],
    apiEndpoints: [
      { method: "POST", path: "/api/demo/trigger/{code}", note: "Fire one of 10 presenter-facing fraud scenarios on demand" },
      { method: "GET", path: "/api/demo/scenarios", note: "List the available demo scenarios" },
    ],
    dependencies: ["gateway"],
    implementationNote:
      "generate_normal_transaction() runs on a randomized 2–5s loop; inject_random_fraud_scenario() runs every 30–60s (tightened to 20–30s in Presentation Mode) — both via APScheduler, both feeding the exact same pipeline as a real channel would.",
  },
  {
    id: "gateway",
    name: "API Gateway",
    tagline: "The single entry point for every request",
    layer: "application",
    icon: Waypoints,
    overview:
      "A FastAPI application mounting 12 routers behind one process. There is no separate gateway service — every request enters here, gets dispatched to the right router, and (except login/health) passes through the authentication dependency first.",
    responsibilities: [
      "Routes requests to 12 domain routers: auth, dashboard, transactions, customers, rules, alerts, investigations, analytics, settings, health, demo, ws",
      "Applies the authentication dependency to every router except auth and health",
      "Serves the OpenAPI schema at /docs",
    ],
    inputs: ["HTTP/WebSocket requests from the frontend"],
    outputs: ["Dispatched calls into Authentication, then the relevant domain service"],
    sourceFiles: ["backend/app/main.py", "backend/app/api/routes/"],
    apiEndpoints: [
      { method: "GET", path: "/", note: "Service banner — name, /docs link, health link" },
      { method: "GET", path: "/api/health", note: "Pings Postgres and Redis" },
    ],
    dependencies: ["auth"],
  },
  {
    id: "auth",
    name: "Authentication",
    tagline: "Opaque bearer tokens, database-backed sessions",
    layer: "application",
    icon: KeyRound,
    overview:
      "Not JWT — a classic opaque bearer-token session, verified against a Session table on every request. Passwords are hashed with PBKDF2-HMAC-SHA256 (100,000 iterations, per-user salt), never bcrypt/JWT despite those packages appearing in requirements.txt.",
    responsibilities: [
      "Verifies username/password on login (constant-time comparison)",
      "Issues a cryptographically random 32-byte token, stored server-side with a 12-hour expiry",
      "Resolves the Authorization header (or ?token= for the WebSocket) back to a User on every request",
    ],
    inputs: ["Username + password (login)", "Bearer token (every other request)"],
    outputs: ["An authenticated User attached to the request", "Session row in Postgres"],
    sourceFiles: ["backend/app/services/auth_service.py", "backend/app/utils/security.py", "backend/app/api/dependencies.py"],
    apiEndpoints: [
      { method: "POST", path: "/api/auth/login", note: "Verify credentials, issue a session token" },
      { method: "POST", path: "/api/auth/logout", note: "Delete the session row" },
      { method: "GET", path: "/api/auth/me", note: "Return the current user" },
    ],
    dependencies: ["validation"],
  },
  {
    id: "validation",
    name: "Transaction Validation",
    tagline: "Builds the full risk context before a single rule runs",
    layer: "detection",
    icon: ScanSearch,
    overview:
      "Before any rule fires, the platform assembles a complete picture of the transaction: the customer's recent history, known devices, velocity in the last minutes, and blacklist membership. This context is what every rule below actually evaluates against.",
    responsibilities: [
      "Loads the customer's account, device history, and beneficiary/merchant records",
      "Computes velocity windows (transactions in the last 30s / 30min / 1hr) for burst and structuring checks",
      "Checks IP and merchant blacklist membership",
      "Calculates implied travel speed from the customer's last transaction location",
    ],
    inputs: ["Proposed transaction from the API Gateway"],
    outputs: ["A complete TransactionContext object, handed to the Rule Engine"],
    sourceFiles: ["backend/app/services/context_builder.py"],
    apiEndpoints: [{ method: "GET", path: "/api/transactions/{id}", note: "Inspect the transaction this context produced" }],
    dependencies: ["rules"],
    implementationNote: "Invoked synchronously by TransactionEngine.process() in transaction_engine.py — an in-process call, not a network hop.",
  },
  {
    id: "rules",
    name: "Rule Engine",
    tagline: "17 configurable fraud rules, evaluated on every transaction",
    layer: "detection",
    icon: ShieldCheck,
    overview:
      "Evaluates every enabled rule against the context from the previous stage and returns a full pass/fail breakdown — not just the triggered ones. This is what powers the live rule-execution panel in the Transaction Simulator.",
    responsibilities: [
      "Velocity & impossible-travel detection",
      "Amount anomaly, large-transaction, and round-number (layering) checks",
      "Device fingerprint and account-takeover signals",
      "Geographic risk (foreign country, implausible travel speed)",
      "Merchant & IP blacklist screening",
      "Beneficiary structuring & transaction-splitting patterns",
      "Dormant-account reactivation and odd-hour activity",
    ],
    inputs: ["TransactionContext from Transaction Validation", "Live rule configuration from Postgres"],
    outputs: ["A pass/fail result per rule, with the weight each triggered rule contributes"],
    sourceFiles: ["backend/app/services/rule_engine.py", "backend/app/services/rule_seed_data.py"],
    apiEndpoints: [
      { method: "GET", path: "/api/rules", note: "List all rules and their current weight/threshold/enabled state" },
      { method: "PATCH", path: "/api/rules/{rule_id}", note: "Tune a rule's weight, threshold, or enabled state — takes effect on the next transaction" },
    ],
    dependencies: ["risk"],
    implementationNote: "Rules are DB rows, re-queried on every transaction — an analyst can retune detection live without a deploy.",
  },
  {
    id: "risk",
    name: "Risk Engine",
    tagline: "Turns triggered rules into a single 0–100 score",
    layer: "detection",
    icon: Gauge,
    overview:
      "Sums the weight of every triggered rule into one risk score, capped at 100. A transaction that trips a 45-weight blacklist rule and a 25-weight amount-anomaly rule scores 70 — no machine-learning model, just transparent, auditable arithmetic an investigator can reconstruct by hand.",
    responsibilities: [
      "Sums triggered-rule weights into a 0–100 risk score",
      "Feeds the score straight into the Decision Engine's thresholds",
    ],
    inputs: ["The triggered-rule list from the Rule Engine"],
    outputs: ["A numeric risk score (0–100)"],
    sourceFiles: ["backend/app/services/risk_engine.py"],
    apiEndpoints: [{ method: "GET", path: "/api/transactions/{id}", note: "risk_score field on any transaction" }],
    dependencies: ["decision"],
  },
  {
    id: "decision",
    name: "Decision Engine",
    tagline: "Maps the risk score to an action",
    layer: "detection",
    icon: GitBranch,
    overview:
      "Fixed, transparent thresholds turn the numeric score into one of four outcomes: Approve, Review, OTP Verification, or Block. There's no hidden model here — the exact cutoffs are visible in code and can be reasoned about by a compliance team.",
    responsibilities: [
      "0–30 → Approve",
      "31–60 → Review (sent to the Fraud Alert Center)",
      "61–80 → OTP Verification required",
      "81–100 → Block",
    ],
    inputs: ["Risk score from the Risk Engine"],
    outputs: ["A decision + status, written onto the transaction", "Triggers the Alert Manager if the decision isn't Approve"],
    sourceFiles: ["backend/app/services/risk_engine.py"],
    apiEndpoints: [{ method: "GET", path: "/api/transactions/{id}", note: "decision and status fields on any transaction" }],
    dependencies: ["alerts", "database"],
    implementationNote:
      "Lives inside the same RiskEngine class as scoring (RiskEngine._decide()) — shown as a separate stage here because it's a distinct decision point in the transaction's journey, not because it's a separate service.",
  },
  {
    id: "alerts",
    name: "Alert Manager",
    tagline: "Case management for anything that isn't a clean Approve",
    layer: "processing",
    icon: ShieldAlert,
    overview:
      "Every non-Approve decision becomes a case: severity-tagged, explained in plain English, and tracked through a full investigator workflow — assign, investigate, approve/block, escalate, freeze the account, or close as a false positive.",
    responsibilities: [
      "Creates a fraud alert with a human-readable explanation of every triggered rule",
      "Tracks the investigator workflow: assign → investigate → resolve",
      "Generates a branded PDF investigation report on request",
      "Writes an audit-log + investigation-log row for every action taken",
    ],
    inputs: ["Decision + triggered rules from the Decision Engine"],
    outputs: ["A FraudAlert row", "Investigation log entries", "alert.created / alert.updated events"],
    sourceFiles: ["backend/app/services/alert_service.py", "backend/app/services/explanation_engine.py", "backend/app/services/report_service.py"],
    apiEndpoints: [
      { method: "GET", path: "/api/alerts", note: "Paginated, filterable case queue" },
      { method: "GET", path: "/api/alerts/{id}", note: "Full case detail" },
      { method: "POST", path: "/api/alerts/{id}/investigate", note: "Move a case into active investigation" },
      { method: "POST", path: "/api/alerts/{id}/approve", note: "Clear the transaction as legitimate" },
      { method: "POST", path: "/api/alerts/{id}/block", note: "Confirm fraud, block the transaction" },
      { method: "GET", path: "/api/alerts/{id}/report", note: "Download a branded PDF investigation report" },
    ],
    dependencies: ["database"],
  },
  {
    id: "database",
    name: "PostgreSQL",
    tagline: "The single system of record",
    layer: "storage",
    icon: Database,
    healthKey: "database",
    overview:
      "Every transaction, alert, customer, device, rule, and investigation note lives here — one relational database, no separate read/write store, no NoSQL side-store. A connection pool (10 base, 20 overflow) keeps request latency low under load.",
    responsibilities: [
      "System of record for all transaction, customer, and case data",
      "Backs every list/detail/analytics query in the product",
      "Seeds and stores the 17 configurable fraud rules",
    ],
    inputs: ["Writes from Transaction Validation, Alert Manager, and every analyst action"],
    outputs: ["Query results to every API endpoint"],
    sourceFiles: ["backend/app/database.py", "backend/app/models/"],
    apiEndpoints: [{ method: "GET", path: "/api/health", note: "SELECT 1 liveness check" }],
    dependencies: ["stream"],
  },
  {
    id: "stream",
    name: "Live Broadcast",
    tagline: "Redis pub/sub, fanned out over WebSocket",
    layer: "monitoring",
    icon: Radio,
    healthKey: "streaming",
    overview:
      "The moment a transaction or alert is written, it's published to a Redis channel and relayed verbatim to every connected browser over WebSocket — this is what makes the dashboard feel live instead of polled.",
    responsibilities: [
      "Publishes transaction.created on every transaction (fraud or not)",
      "Publishes alert.created when a case is opened, alert.updated on every case action",
      "Relays every message to connected browsers with zero server-side filtering",
      "Also backs the /api/health Redis ping",
    ],
    inputs: ["publish_event() calls from Transaction Validation and Alert Manager"],
    outputs: ["Real-time events delivered to every open browser tab"],
    sourceFiles: ["backend/app/services/event_bus.py", "backend/app/api/routes/ws.py", "frontend/src/hooks/useWebSocket.ts"],
    apiEndpoints: [{ method: "WS", path: "/ws/events", note: "Token-authenticated WebSocket stream" }],
    dependencies: ["dashboard"],
    implementationNote:
      "Built behind one small interface (publish_event) so a Kafka producer/consumer could replace Redis later without touching the rest of the platform.",
  },
  {
    id: "dashboard",
    name: "Dashboard & Analytics",
    tagline: "Where the whole platform becomes visible",
    layer: "presentation",
    icon: LayoutDashboard,
    overview:
      "KPIs, trend charts, geographic risk, and the live activity feed — all computed from the same Postgres data every other page reads, kept current by the Live Broadcast stream rather than polling.",
    responsibilities: [
      "Computes today's KPIs: volume, fraud rate, amount prevented, average detection time",
      "Builds the fraud trend, channel distribution, and geographic risk views",
      "Powers the Analytics page's hourly trend, risk distribution, and top-risk-customer views",
    ],
    inputs: ["Aggregation queries against Postgres", "Live events for real-time updates"],
    outputs: ["Everything rendered on the Dashboard and Analytics pages"],
    sourceFiles: ["backend/app/services/dashboard_service.py", "backend/app/services/analytics_service.py"],
    apiEndpoints: [
      { method: "GET", path: "/api/dashboard", note: "KPIs + trend + channel + geo data" },
      { method: "GET", path: "/api/analytics", note: "Hourly fraud trend, risk distribution, top-risk customers" },
    ],
    dependencies: [],
  },
  {
    id: "scheduler",
    name: "Scheduler",
    tagline: "The background jobs that make this a living demo",
    layer: "processing",
    icon: Clock,
    overview:
      "Two self-rescheduling background jobs — one generating realistic legitimate traffic, one periodically injecting a fraud scenario — both running the exact transaction pipeline a real integration would call.",
    responsibilities: [
      "Generates weighted-random legitimate transactions every 2–5 seconds",
      "Injects one of 17 fraud scenarios every 30–60 seconds (20–30s in Presentation Mode)",
      "Can be paused/resumed without restarting the platform",
    ],
    inputs: ["Randomized timers"],
    outputs: ["Proposed transactions fed into the Customer Channel / API Gateway"],
    sourceFiles: ["backend/app/scheduler.py", "backend/app/services/transaction_generator.py", "backend/app/services/fraud_injector.py"],
    apiEndpoints: [
      { method: "POST", path: "/api/settings/scheduler/pause", note: "Pause background traffic generation" },
      { method: "POST", path: "/api/settings/scheduler/resume", note: "Resume it" },
      { method: "GET", path: "/api/demo/mode", note: "Current Presentation Mode state" },
    ],
    dependencies: ["customer"],
  },
];

export const COMPONENT_MAP: Record<string, ArchComponent> = Object.fromEntries(COMPONENTS.map((c) => [c.id, c]));

export const TECH_STACK: { name: string; category: string; purpose: string }[] = [
  { name: "React", category: "Frontend", purpose: "Component-based UI for every page, including this one" },
  { name: "TypeScript", category: "Frontend", purpose: "Type safety across the entire frontend codebase" },
  { name: "Vite", category: "Frontend", purpose: "Dev server and production bundler" },
  { name: "Tailwind CSS", category: "Frontend", purpose: "The design system every screen in this product is built from" },
  { name: "TanStack Query", category: "Frontend", purpose: "Data fetching, caching, and polling for every page" },
  { name: "Recharts", category: "Frontend", purpose: "Trend, distribution, and sparkline charts" },
  { name: "FastAPI", category: "Backend", purpose: "The Python web framework serving all 12 routers" },
  { name: "SQLAlchemy", category: "Backend", purpose: "ORM layer over Postgres — every model in backend/app/models" },
  { name: "PostgreSQL", category: "Data", purpose: "The single system of record" },
  { name: "Redis", category: "Data", purpose: "Pub/sub transport for the live WebSocket stream" },
  { name: "APScheduler", category: "Backend", purpose: "Drives the background transaction generator and fraud injector" },
  { name: "ReportLab", category: "Backend", purpose: "Generates the branded PDF investigation report" },
];
