from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.transaction import TransactionOut


class InvestigationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    investigator: str
    action: str
    notes: str
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    alert_ref: str
    transaction_id: int
    customer_id: int
    customer_name: str
    severity: str
    risk_score: float
    status: str
    assigned_investigator: str | None
    reason_summary: str
    explanation: list[str]
    created_at: datetime
    updated_at: datetime


class AlertDetailOut(AlertOut):
    transaction: TransactionOut
    investigations: list[InvestigationOut] = []


class AlertListResponse(BaseModel):
    items: list[AlertOut]
    total: int
    page: int
    page_size: int


class AssignRequest(BaseModel):
    investigator: str


class AlertActionRequest(BaseModel):
    investigator: str
    notes: str = ""


class AlertStatusUpdate(BaseModel):
    status: str
