from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_uid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    device_type: Mapped[str] = mapped_column(String(20), default="MOBILE")
    os: Mapped[str] = mapped_column(String(40))
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=True)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    customer: Mapped["Customer"] = relationship(back_populates="devices")
