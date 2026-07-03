from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    category: Mapped[str] = mapped_column(String(80))
    city: Mapped[str] = mapped_column(String(80))
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"))
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW")

    country: Mapped["Country"] = relationship()
