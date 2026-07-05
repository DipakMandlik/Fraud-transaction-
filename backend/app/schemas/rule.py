from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    description: str
    category: str
    weight: float
    threshold: float | None
    config: dict
    enabled: bool
    priority: int
    updated_at: datetime
    # Original seed values from rule_seed_data.RULE_DEFINITIONS, surfaced so the
    # UI can offer "reset to default" without duplicating this data client-side.
    default_weight: float
    default_threshold: float | None
    default_config: dict
    default_priority: int


class RuleUpdate(BaseModel):
    weight: float | None = None
    threshold: float | None = None
    config: dict | None = None
    enabled: bool | None = None
    priority: int | None = None


class RuleStatOut(BaseModel):
    code: str
    evaluated_count: int
    triggered_count: int
    trigger_rate: float
