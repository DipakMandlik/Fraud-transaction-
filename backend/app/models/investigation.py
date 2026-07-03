from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("fraud_alerts.id"), index=True)

    investigator: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(30))
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    alert: Mapped["FraudAlert"] = relationship(back_populates="investigations")
