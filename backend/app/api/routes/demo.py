from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.scheduler import current_fraud_interval, is_demo_mode, set_demo_mode
from app.schemas.demo import DemoModeRequest, DemoModeResponse, DemoScenarioOut, DemoTriggerResponse
from app.schemas.transaction import TransactionOut
from app.services.fraud_injector import DEMO_SCENARIOS, run_demo_scenario
from app.services.serializers import transaction_to_dict

router = APIRouter(prefix="/api/demo", tags=["Demo"], dependencies=[Depends(get_current_user)])


@router.get("/scenarios", response_model=list[DemoScenarioOut])
def list_scenarios() -> list[DemoScenarioOut]:
    return [
        DemoScenarioOut(code=code, label=entry["label"], description=entry["description"])
        for code, entry in DEMO_SCENARIOS.items()
    ]


@router.post("/trigger/{code}", response_model=DemoTriggerResponse)
def trigger_scenario(code: str, db: Session = Depends(get_db)) -> DemoTriggerResponse:
    if code not in DEMO_SCENARIOS:
        raise HTTPException(status_code=404, detail=f"Unknown demo scenario '{code}'")

    transactions = run_demo_scenario(db, code)
    if not transactions:
        raise HTTPException(status_code=503, detail="Scenario could not run — no eligible customer found, try again")

    txn_dicts = [TransactionOut(**transaction_to_dict(t)) for t in transactions]
    return DemoTriggerResponse(
        scenario_code=code,
        transactions=txn_dicts,
        primary_transaction_id=transactions[-1].id,
    )


@router.get("/mode", response_model=DemoModeResponse)
def get_demo_mode() -> DemoModeResponse:
    min_s, max_s = current_fraud_interval()
    return DemoModeResponse(demo_mode=is_demo_mode(), fraud_injection_min_seconds=min_s, fraud_injection_max_seconds=max_s)


@router.post("/mode", response_model=DemoModeResponse)
def set_mode(payload: DemoModeRequest) -> DemoModeResponse:
    set_demo_mode(payload.enabled)
    min_s, max_s = current_fraud_interval()
    return DemoModeResponse(demo_mode=is_demo_mode(), fraud_injection_min_seconds=min_s, fraud_injection_max_seconds=max_s)
