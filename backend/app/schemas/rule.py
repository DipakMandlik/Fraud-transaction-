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


class RuleUpdate(BaseModel):
    weight: float | None = None
    threshold: float | None = None
    config: dict | None = None
    enabled: bool | None = None
    priority: int | None = None
