from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    account_type: Mapped[str] = mapped_column(String(20), default="SAVINGS")
    bank_name: Mapped[str] = mapped_column(String(80))
    ifsc_code: Mapped[str] = mapped_column(String(15))

    balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    daily_limit: Mapped[float] = mapped_column(Numeric(14, 2), default=100000)

    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    opened_at: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    customer: Mapped["Customer"] = relationship(back_populates="accounts")
