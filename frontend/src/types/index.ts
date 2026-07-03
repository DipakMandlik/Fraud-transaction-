export interface RuleEvaluation {
  code: string;
  name: string;
  category: string;
  weight: number;
  triggered: boolean;
  detail: string;
}

export interface Transaction {
  id: number;
  transaction_ref: string;
  customer_id: number;
  customer_name: string;
  account_number: string;
  beneficiary_name: string | null;
  merchant_name: string | null;
  amount: number;
  currency: string;
  transaction_type: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  device_id: string | null;
  ip_address: string;
  status: string;
  risk_score: number;
  decision: string;
  is_fraud: boolean;
  fraud_scenario: string | null;
  triggered_rules: string[];
  rule_evaluations: RuleEvaluation[];
  processing_ms: number;
  reason: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface SystemHealth {
  database: boolean;
  redis: boolean;
  rule_engine: boolean;
  risk_engine: boolean;
  streaming: boolean;
}

export interface KpiSummary {
  transactions_today: number;
  transactions_per_minute: number;
  fraud_detected: number;
  fraud_prevented_amount: number;
  blocked: number;
  pending_investigation: number;
  high_risk_accounts: number;
  fraud_percentage: number;
  average_risk_score: number;
  average_detection_time_ms: number;
  system_health: SystemHealth;
}

export interface TrendPoint {
  label: string;
  total: number;
  fraud: number;
}

export interface ChannelDistribution {
  channel: string;
  count: number;
  fraud_count: number;
}

export interface GeoPoint {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
  fraud_count: number;
  risk_score_avg: number;
}

export interface DashboardResponse {
  kpis: KpiSummary;
  trend: TrendPoint[];
  channel_distribution: ChannelDistribution[];
  geo_points: GeoPoint[];
}

export interface Account {
  id: number;
  account_number: string;
  account_type: string;
  bank_name: string;
  ifsc_code: string;
  balance: number;
  daily_limit: number;
  status: string;
}

export interface Device {
  id: number;
  device_uid: string;
  device_type: string;
  os: string;
  is_trusted: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface Beneficiary {
  id: number;
  beneficiary_name: string;
  account_number: string;
  bank_name: string;
  relationship_type: string;
  is_frequent: boolean;
  transfer_count: number;
  added_at: string;
}

export interface Customer {
  id: number;
  customer_code: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  occupation: string;
  annual_income: number;
  account_open_date: string;
  risk_segment: string;
  status: string;
  kyc_level: string;
  avg_transaction_amount: number;
}

export interface CustomerDetail extends Customer {
  accounts: Account[];
  devices: Device[];
  beneficiaries: Beneficiary[];
  total_transactions: number;
  fraud_incidents: number;
  highest_risk_score: number;
}

export interface Rule {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  threshold: number | null;
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  updated_at: string;
}

export interface Investigation {
  id: number;
  investigator: string;
  action: string;
  notes: string;
  created_at: string;
}

export interface Alert {
  id: number;
  alert_ref: string;
  transaction_id: number;
  customer_id: number;
  customer_name: string;
  severity: string;
  risk_score: number;
  status: string;
  assigned_investigator: string | null;
  reason_summary: string;
  explanation: string[];
  created_at: string;
  updated_at: string;
}

export interface AlertDetail extends Alert {
  transaction: Transaction;
  investigations: Investigation[];
}

export interface LabeledCount {
  label: string;
  value: number;
}

export interface TopRiskCustomer {
  customer_id: number;
  customer_name: string;
  customer_code: string;
  max_risk_score: number;
  fraud_incidents: number;
  total_transactions: number;
}

export interface AnalyticsResponse {
  hourly_fraud: LabeledCount[];
  risk_distribution: LabeledCount[];
  channel_distribution: LabeledCount[];
  country_distribution: LabeledCount[];
  fraud_reasons: LabeledCount[];
  top_risk_customers: TopRiskCustomer[];
  transaction_volume: LabeledCount[];
  approval_rate: number;
  blocked_rate: number;
  false_positive_rate: number;
}

export interface WsEvent {
  type: "transaction.created" | "alert.created" | "alert.updated";
  payload: Transaction | Alert;
}

export interface DemoScenario {
  code: string;
  label: string;
  description: string;
}

export interface DemoTriggerResponse {
  scenario_code: string;
  transactions: Transaction[];
  primary_transaction_id: number | null;
}

export interface DemoModeStatus {
  demo_mode: boolean;
  fraud_injection_min_seconds: number;
  fraud_injection_max_seconds: number;
}

export const PIPELINE_STAGES = [
  "Customer Mobile",
  "API Gateway",
  "Transaction Validation",
  "Customer Profile",
  "Device Intelligence",
  "Rule Engine",
  "Behavior Engine",
  "Risk Engine",
  "Decision Engine",
  "Core Banking",
  "Completed",
] as const;
