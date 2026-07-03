from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    beneficiary_name: Mapped[str] = mapped_column(String(120))
    account_number: Mapped[str] = mapped_column(String(20))
    ifsc_code: Mapped[str] = mapped_column(String(15))
    bank_name: Mapped[str] = mapped_column(String(80))
    relationship_type: Mapped[str] = mapped_column(String(40), default="OTHER")

    is_frequent: Mapped[bool] = mapped_column(Boolean, default=False)
    transfer_count: Mapped[int] = mapped_column(Integer, default=0)

    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    customer: Mapped["Customer"] = relationship(back_populates="beneficiaries")
