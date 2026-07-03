from datetime import datetime
from app.utils.time import utcnow

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_ref: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    severity: Mapped[str] = mapped_column(String(20), index=True)
    risk_score: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", index=True)

    assigned_investigator: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reason_summary: Mapped[str] = mapped_column(Text)
    explanation: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()", index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()", onupdate=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    transaction: Mapped["Transaction"] = relationship(back_populates="alert")
    customer: Mapped["Customer"] = relationship()
    investigations: Mapped[list["Investigation"]] = relationship(back_populates="alert", cascade="all, delete-orphan")
