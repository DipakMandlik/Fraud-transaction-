from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.schemas.analytics import AnalyticsResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(hours: int = Query(24, ge=1, le=168), db: Session = Depends(get_db)) -> AnalyticsResponse:
    return analytics_service.get_analytics(db, hours=hours)
