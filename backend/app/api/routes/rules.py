from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.repositories.rule_repo import RuleRepository
from app.schemas.rule import RuleOut, RuleUpdate

router = APIRouter(prefix="/api/rules", tags=["Rules"], dependencies=[Depends(get_current_user)])
_repo = RuleRepository()


@router.get("", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db)) -> list[RuleOut]:
    return [RuleOut.model_validate(r) for r in _repo.list(db)]


@router.patch("/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: int, payload: RuleUpdate, db: Session = Depends(get_db)) -> RuleOut:
    rule = _repo.get(db, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    return RuleOut.model_validate(rule)
