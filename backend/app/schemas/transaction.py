from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RuleEvaluationOut(BaseModel):
    code: str
    name: str
    category: str
    weight: float
    triggered: bool
    detail: str


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_ref: str
    customer_id: int
    customer_name: str
    account_number: str
    beneficiary_name: str | None = None
    merchant_name: str | None = None
    amount: float
    currency: str
    transaction_type: str
    city: str
    country: str
    latitude: float
    longitude: float
    device_id: str | None = None
    ip_address: str
    status: str
    risk_score: float
    decision: str
    is_fraud: bool
    fraud_scenario: str | None = None
    triggered_rules: list[str] = []
    rule_evaluations: list[RuleEvaluationOut] = []
    processing_ms: float = 0
    reason: str
    timestamp: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
