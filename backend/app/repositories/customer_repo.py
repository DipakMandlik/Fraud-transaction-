from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer


class CustomerRepository:
    def list(
        self, db: Session, page: int = 1, page_size: int = 25, search: str | None = None, risk_segment: str | None = None
    ) -> tuple[list[Customer], int]:
        query = db.query(Customer)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Customer.first_name.ilike(like),
                    Customer.last_name.ilike(like),
                    Customer.customer_code.ilike(like),
                    Customer.email.ilike(like),
                    Customer.phone.ilike(like),
                )
            )
        if risk_segment:
            query = query.filter(Customer.risk_segment == risk_segment)

        total = query.order_by(None).count()
        items = query.order_by(Customer.id).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_detail(self, db: Session, customer_id: int) -> Customer | None:
        return (
            db.query(Customer)
            .options(
                joinedload(Customer.accounts),
                joinedload(Customer.devices),
                joinedload(Customer.beneficiaries),
            )
            .filter(Customer.id == customer_id)
            .first()
        )
