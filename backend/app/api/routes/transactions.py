import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.repositories.transaction_repo import TransactionRepository
from app.schemas.transaction import TransactionListResponse, TransactionOut
from app.services.serializers import transaction_to_dict

router = APIRouter(prefix="/api/transactions", tags=["Transactions"], dependencies=[Depends(get_current_user)])
_repo = TransactionRepository()


def _to_out(txn) -> TransactionOut:
    return TransactionOut(**transaction_to_dict(txn))


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
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
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    items, total = _repo.list(
        db, page=page, page_size=page_size, search=search, status=status, is_fraud=is_fraud,
        min_risk=min_risk, max_risk=max_risk, transaction_type=transaction_type, country=country,
        customer_id=customer_id, date_from=date_from, date_to=date_to,
    )
    return TransactionListResponse(items=[_to_out(t) for t in items], total=total, page=page, page_size=page_size)


@router.get("/export")
def export_transactions(
    search: str | None = None,
    status: str | None = None,
    is_fraud: bool | None = None,
    transaction_type: str | None = None,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    items, _ = _repo.list(db, page=1, page_size=5000, search=search, status=status, is_fraud=is_fraud, transaction_type=transaction_type)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "Transaction Ref", "Timestamp", "Customer", "Amount", "Currency", "Type", "City", "Country",
        "Status", "Risk Score", "Decision", "Is Fraud", "Fraud Scenario", "Reason",
    ])
    for t in items:
        d = transaction_to_dict(t)
        writer.writerow([
            d["transaction_ref"], d["timestamp"], d["customer_name"], d["amount"], d["currency"],
            d["transaction_type"], d["city"], d["country"], d["status"], d["risk_score"], d["decision"],
            d["is_fraud"], d["fraud_scenario"] or "", d["reason"],
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_export.csv"},
    )


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)) -> TransactionOut:
    txn = _repo.get(db, transaction_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _to_out(txn)
