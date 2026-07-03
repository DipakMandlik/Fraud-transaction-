from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.config import settings
from app.scheduler import scheduler

router = APIRouter(prefix="/api/settings", tags=["Settings"], dependencies=[Depends(get_current_user)])


class SettingsOut(BaseModel):
    txn_min_interval_seconds: int
    txn_max_interval_seconds: int
    fraud_injection_min_seconds: int
    fraud_injection_max_seconds: int
    fraud_ratio: float
    scheduler_running: bool


@router.get("", response_model=SettingsOut)
def get_settings() -> SettingsOut:
    return SettingsOut(
        txn_min_interval_seconds=settings.TXN_MIN_INTERVAL_SECONDS,
        txn_max_interval_seconds=settings.TXN_MAX_INTERVAL_SECONDS,
        fraud_injection_min_seconds=settings.FRAUD_INJECTION_MIN_SECONDS,
        fraud_injection_max_seconds=settings.FRAUD_INJECTION_MAX_SECONDS,
        fraud_ratio=settings.FRAUD_RATIO,
        scheduler_running=scheduler.running,
    )


@router.post("/scheduler/pause")
def pause_scheduler() -> dict:
    scheduler.pause()
    return {"scheduler_running": False}


@router.post("/scheduler/resume")
def resume_scheduler() -> dict:
    scheduler.resume()
    return {"scheduler_running": True}
