from pydantic import BaseModel

from app.schemas.transaction import TransactionOut


class DemoScenarioOut(BaseModel):
    code: str
    label: str
    description: str


class DemoTriggerResponse(BaseModel):
    scenario_code: str
    transactions: list[TransactionOut]
    primary_transaction_id: int | None


class DemoModeRequest(BaseModel):
    enabled: bool


class DemoModeResponse(BaseModel):
    demo_mode: bool
    fraud_injection_min_seconds: int
    fraud_injection_max_seconds: int
