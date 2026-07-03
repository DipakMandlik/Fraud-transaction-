from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.transaction import Transaction
from app.repositories.customer_repo import CustomerRepository
from app.repositories.transaction_repo import TransactionRepository
from app.schemas.customer import AccountOut, BeneficiaryOut, CustomerDetailOut, CustomerListResponse, CustomerOut, DeviceOut
from app.schemas.transaction import TransactionListResponse, TransactionOut
from app.services.serializers import transaction_to_dict

router = APIRouter(prefix="/api/customers", tags=["Customers"], dependencies=[Depends(get_current_user)])
_repo = CustomerRepository()
_txn_repo = TransactionRepository()


def _customer_to_out(c) -> CustomerOut:
    return CustomerOut(
        id=c.id, customer_code=c.customer_code, full_name=c.full_name, email=c.email, phone=c.phone,
        city=c.city, state=c.state, occupation=c.occupation, annual_income=float(c.annual_income),
        account_open_date=c.account_open_date, risk_segment=c.risk_segment, status=c.status,
        kyc_level=c.kyc_level, avg_transaction_amount=float(c.avg_transaction_amount),
    )


@router.get("", response_model=CustomerListResponse)
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: str | None = None,
    risk_segment: str | None = None,
    db: Session = Depends(get_db),
) -> CustomerListResponse:
    items, total = _repo.list(db, page=page, page_size=page_size, search=search, risk_segment=risk_segment)
    return CustomerListResponse(items=[_customer_to_out(c) for c in items], total=total, page=page, page_size=page_size)


@router.get("/{customer_id}", response_model=CustomerDetailOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)) -> CustomerDetailOut:
    customer = _repo.get_detail(db, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    total_transactions = db.query(func.count(Transaction.id)).filter(Transaction.customer_id == customer_id).scalar() or 0
    fraud_incidents = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.customer_id == customer_id, Transaction.is_fraud.is_(True))
        .scalar()
        or 0
    )
    highest_risk = db.query(func.max(Transaction.risk_score)).filter(Transaction.customer_id == customer_id).scalar() or 0

    base = _customer_to_out(customer)
    return CustomerDetailOut(
        **base.model_dump(),
        accounts=[AccountOut.model_validate(a) for a in customer.accounts],
        devices=[DeviceOut.model_validate(d) for d in customer.devices],
        beneficiaries=[BeneficiaryOut.model_validate(b) for b in customer.beneficiaries],
        total_transactions=total_transactions,
        fraud_incidents=fraud_incidents,
        highest_risk_score=float(highest_risk),
    )


@router.get("/{customer_id}/transactions", response_model=TransactionListResponse)
def get_customer_transactions(
    customer_id: int, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200), db: Session = Depends(get_db)
) -> TransactionListResponse:
    items, total = _txn_repo.list(db, page=page, page_size=page_size, customer_id=customer_id)
    return TransactionListResponse(
        items=[TransactionOut(**transaction_to_dict(t)) for t in items], total=total, page=page, page_size=page_size
    )
