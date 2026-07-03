from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.transaction import Transaction


class TransactionRepository:
    @staticmethod
    def _base_query(db: Session):
        return db.query(Transaction).options(
            joinedload(Transaction.customer),
            joinedload(Transaction.account),
            joinedload(Transaction.country),
            joinedload(Transaction.device),
        )

    def list(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 25,
        search: str | None = None,
        status: str | None = None,
        is_fraud: bool | None = None,
        min_risk: float | None = None,
        max_risk: float | None = None,
        transaction_type: str | None = None,
        country: str | None = None,
        customer_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[Transaction], int]:
        query = self._base_query(db)

        if search:
            from app.models.customer import Customer

            like = f"%{search}%"
            query = query.join(Transaction.customer).filter(
                or_(
                    Transaction.transaction_ref.ilike(like),
                    Transaction.ip_address.ilike(like),
                    Transaction.merchant_name_snapshot.ilike(like),
                    Transaction.beneficiary_name_snapshot.ilike(like),
                    Customer.first_name.ilike(like),
                    Customer.last_name.ilike(like),
                    Customer.customer_code.ilike(like),
                )
            )
        if status:
            query = query.filter(Transaction.status == status)
        if is_fraud is not None:
            query = query.filter(Transaction.is_fraud.is_(is_fraud))
        if min_risk is not None:
            query = query.filter(Transaction.risk_score >= min_risk)
        if max_risk is not None:
            query = query.filter(Transaction.risk_score <= max_risk)
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        if country:
            from app.models.country import Country

            query = query.filter(Transaction.country.has(Country.name == country))
        if customer_id:
            query = query.filter(Transaction.customer_id == customer_id)
        if date_from:
            query = query.filter(Transaction.timestamp >= date_from)
        if date_to:
            query = query.filter(Transaction.timestamp <= date_to)

        total = query.order_by(None).count()
        items = (
            query.order_by(Transaction.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def get(self, db: Session, transaction_id: int) -> Transaction | None:
        return self._base_query(db).filter(Transaction.id == transaction_id).first()

    def count_since(self, db: Session, since: datetime) -> int:
        return db.query(func.count(Transaction.id)).filter(Transaction.timestamp >= since).scalar() or 0

    def count_fraud_since(self, db: Session, since: datetime) -> int:
        return (
            db.query(func.count(Transaction.id))
            .filter(Transaction.timestamp >= since, Transaction.is_fraud.is_(True))
            .scalar()
            or 0
        )

    def count_by_status_since(self, db: Session, since: datetime, status: str) -> int:
        return (
            db.query(func.count(Transaction.id))
            .filter(Transaction.timestamp >= since, Transaction.status == status)
            .scalar()
            or 0
        )

    def average_risk_score(self, db: Session, since: datetime) -> float:
        avg = db.query(func.avg(Transaction.risk_score)).filter(Transaction.timestamp >= since).scalar()
        return round(float(avg), 1) if avg else 0.0

    def prevented_fraud_amount(self, db: Session, since: datetime) -> float:
        total = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(Transaction.timestamp >= since, Transaction.status == "BLOCKED")
            .scalar()
        )
        return float(total or 0)
