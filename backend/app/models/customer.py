from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(60))
    last_name: Mapped[str] = mapped_column(String(60))
    email: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    date_of_birth: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(10))

    city: Mapped[str] = mapped_column(String(80), index=True)
    state: Mapped[str] = mapped_column(String(80))
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"))
    home_latitude: Mapped[float] = mapped_column(Float)
    home_longitude: Mapped[float] = mapped_column(Float)

    occupation: Mapped[str] = mapped_column(String(80))
    annual_income: Mapped[float] = mapped_column(Numeric(14, 2))

    account_open_date: Mapped[date] = mapped_column(Date)
    risk_segment: Mapped[str] = mapped_column(String(20), default="LOW", index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", index=True)
    kyc_level: Mapped[str] = mapped_column(String(20), default="FULL")

    avg_transaction_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    common_login_hour_start: Mapped[int] = mapped_column(default=8)
    common_login_hour_end: Mapped[int] = mapped_column(default=22)

    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    country: Mapped["Country"] = relationship(back_populates="customers")
    accounts: Mapped[list["Account"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    devices: Mapped[list["Device"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    beneficiaries: Mapped[list["Beneficiary"]] = relationship(back_populates="customer", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
