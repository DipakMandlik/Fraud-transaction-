from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_ref: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    beneficiary_id: Mapped[int | None] = mapped_column(ForeignKey("beneficiaries.id"), nullable=True)
    merchant_id: Mapped[int | None] = mapped_column(ForeignKey("merchants.id"), nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"))

    amount: Mapped[float] = mapped_column(Numeric(14, 2), index=True)
    currency: Mapped[str] = mapped_column(String(5), default="INR")
    transaction_type: Mapped[str] = mapped_column(String(20), index=True)

    beneficiary_name_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)
    merchant_name_snapshot: Mapped[str | None] = mapped_column(String(150), nullable=True)

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    city: Mapped[str] = mapped_column(String(80))

    ip_address: Mapped[str] = mapped_column(String(45))

    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0, index=True)
    decision: Mapped[str] = mapped_column(String(20), default="APPROVE")

    is_fraud: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    fraud_scenario: Mapped[str | None] = mapped_column(String(60), nullable=True)
    triggered_rules: Mapped[dict] = mapped_column(JSON, default=dict)
    rule_evaluations: Mapped[list] = mapped_column(JSON, default=list)
    processing_ms: Mapped[float] = mapped_column(Float, default=0)
    reason: Mapped[str] = mapped_column(Text, default="")

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, server_default="now()")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    customer: Mapped["Customer"] = relationship()
    account: Mapped["Account"] = relationship()
    beneficiary: Mapped["Beneficiary | None"] = relationship()
    merchant: Mapped["Merchant | None"] = relationship()
    device: Mapped["Device | None"] = relationship()
    country: Mapped["Country"] = relationship()
    alert: Mapped["FraudAlert | None"] = relationship(back_populates="transaction", uselist=False)
