from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.fraud_alert import FraudAlert


class AlertRepository:
    @staticmethod
    def _base_query(db: Session):
        return db.query(FraudAlert).options(
            joinedload(FraudAlert.customer),
            joinedload(FraudAlert.transaction),
            joinedload(FraudAlert.investigations),
        )

    def list(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 25,
        status: str | None = None,
        severity: str | None = None,
        customer_id: int | None = None,
    ) -> tuple[list[FraudAlert], int]:
        query = self._base_query(db)
        if status:
            query = query.filter(FraudAlert.status == status)
        if severity:
            query = query.filter(FraudAlert.severity == severity)
        if customer_id:
            query = query.filter(FraudAlert.customer_id == customer_id)

        total = query.order_by(None).count()
        items = query.order_by(FraudAlert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get(self, db: Session, alert_id: int) -> FraudAlert | None:
        return self._base_query(db).filter(FraudAlert.id == alert_id).first()

    def count_by_status(self, db: Session, status: str) -> int:
        return db.query(func.count(FraudAlert.id)).filter(FraudAlert.status == status).scalar() or 0
