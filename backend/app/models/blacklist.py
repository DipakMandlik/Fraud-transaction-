from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Blacklist(Base):
    __tablename__ = "blacklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(20), index=True)
    entity_value: Mapped[str] = mapped_column(String(150), index=True)
    reason: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="HIGH")
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
