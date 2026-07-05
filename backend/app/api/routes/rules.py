from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.rule import Rule
from app.repositories.rule_repo import RuleRepository
from app.schemas.rule import RuleOut, RuleStatOut, RuleUpdate
from app.services.rule_seed_data import RULE_DEFINITIONS
from app.services.rule_stats_service import get_rule_trigger_stats

router = APIRouter(prefix="/api/rules", tags=["Rules"], dependencies=[Depends(get_current_user)])
_repo = RuleRepository()
_DEFINITIONS_BY_CODE = {d["code"]: d for d in RULE_DEFINITIONS}


def _to_out(rule: Rule) -> RuleOut:
    defaults = _DEFINITIONS_BY_CODE.get(rule.code, {})
    return RuleOut(
        id=rule.id,
        code=rule.code,
        name=rule.name,
        description=rule.description,
        category=rule.category,
        weight=rule.weight,
        threshold=rule.threshold,
        config=rule.config,
        enabled=rule.enabled,
        priority=rule.priority,
        updated_at=rule.updated_at,
        default_weight=defaults.get("weight", rule.weight),
        default_threshold=defaults.get("threshold", rule.threshold),
        default_config=defaults.get("config", rule.config),
        default_priority=defaults.get("priority", rule.priority),
    )


@router.get("", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db)) -> list[RuleOut]:
    return [_to_out(r) for r in _repo.list(db)]


@router.get("/stats", response_model=list[RuleStatOut])
def get_rules_stats(hours: int = 24, db: Session = Depends(get_db)) -> list[RuleStatOut]:
    return get_rule_trigger_stats(db, hours=hours)


@router.patch("/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: int, payload: RuleUpdate, db: Session = Depends(get_db)) -> RuleOut:
    rule = _repo.get(db, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    return _to_out(rule)
