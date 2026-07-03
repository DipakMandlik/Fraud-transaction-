from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    iso_code: Mapped[str] = mapped_column(String(3), unique=True)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW")
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_domestic: Mapped[bool] = mapped_column(Boolean, default=False)

    customers: Mapped[list["Customer"]] = relationship(back_populates="country")
