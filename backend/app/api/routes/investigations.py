from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.investigation import Investigation
from app.schemas.alert import InvestigationOut

router = APIRouter(prefix="/api/investigations", tags=["Investigations"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[InvestigationOut])
def list_investigations(
    limit: int = Query(50, ge=1, le=500), db: Session = Depends(get_db)
) -> list[InvestigationOut]:
    rows = (
        db.query(Investigation)
        .options(joinedload(Investigation.alert))
        .order_by(Investigation.created_at.desc())
        .limit(limit)
        .all()
    )
    return [InvestigationOut.model_validate(r) for r in rows]
