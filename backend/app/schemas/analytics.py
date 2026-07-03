from pydantic import BaseModel


class LabeledCount(BaseModel):
    label: str
    value: float


class TopRiskCustomer(BaseModel):
    customer_id: int
    customer_name: str
    customer_code: str
    max_risk_score: float
    fraud_incidents: int
    total_transactions: int


class AnalyticsResponse(BaseModel):
    hourly_fraud: list[LabeledCount]
    risk_distribution: list[LabeledCount]
    channel_distribution: list[LabeledCount]
    country_distribution: list[LabeledCount]
    fraud_reasons: list[LabeledCount]
    top_risk_customers: list[TopRiskCustomer]
    transaction_volume: list[LabeledCount]
    approval_rate: float
    blocked_rate: float
    false_positive_rate: float
