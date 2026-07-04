from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.repositories.alert_repo import AlertRepository
from app.schemas.alert import (
    AlertActionRequest,
    AlertDetailOut,
    AlertListResponse,
    AlertOut,
    AssignRequest,
    InvestigationOut,
)
from app.schemas.transaction import TransactionOut
from app.services import alert_service
from app.services.report_service import build_investigation_report
from app.services.serializers import transaction_to_dict

router = APIRouter(prefix="/api/alerts", tags=["Fraud Alerts"], dependencies=[Depends(get_current_user)])
_repo = AlertRepository()


def _alert_to_out(a) -> AlertOut:
    return AlertOut(
        id=a.id, alert_ref=a.alert_ref, transaction_id=a.transaction_id, customer_id=a.customer_id,
        customer_name=a.customer.full_name, severity=a.severity, risk_score=a.risk_score, status=a.status,
        assigned_investigator=a.assigned_investigator, reason_summary=a.reason_summary, explanation=a.explanation,
        created_at=a.created_at, updated_at=a.updated_at,
    )


def _get_or_404(db: Session, alert_id: int):
    alert = _repo.get(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    status: str | None = None,
    severity: str | None = None,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
) -> AlertListResponse:
    items, total = _repo.list(db, page=page, page_size=page_size, status=status, severity=severity, customer_id=customer_id)
    return AlertListResponse(items=[_alert_to_out(a) for a in items], total=total, page=page, page_size=page_size)


@router.get("/{alert_id}", response_model=AlertDetailOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)) -> AlertDetailOut:
    alert = _get_or_404(db, alert_id)
    base = _alert_to_out(alert)
    return AlertDetailOut(
        **base.model_dump(),
        transaction=TransactionOut(**transaction_to_dict(alert.transaction)),
        investigations=[InvestigationOut.model_validate(i) for i in sorted(alert.investigations, key=lambda i: i.created_at)],
    )


@router.post("/{alert_id}/assign", response_model=AlertOut)
def assign_alert(alert_id: int, payload: AssignRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.assign(db, _get_or_404(db, alert_id), payload.investigator)
    return _alert_to_out(alert)


@router.post("/{alert_id}/investigate", response_model=AlertOut)
def investigate_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.investigate(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/approve", response_model=AlertOut)
def approve_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.approve(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/block", response_model=AlertOut)
def block_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.block(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/mark-safe", response_model=AlertOut)
def mark_safe_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.mark_safe(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/notes", response_model=AlertOut)
def add_note(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.add_note(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/close", response_model=AlertOut)
def close_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.close(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/escalate", response_model=AlertOut)
def escalate_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.escalate(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/freeze-account", response_model=AlertOut)
def freeze_account_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.freeze_account(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.post("/{alert_id}/request-verification", response_model=AlertOut)
def request_verification_alert(alert_id: int, payload: AlertActionRequest, db: Session = Depends(get_db)) -> AlertOut:
    alert = alert_service.request_verification(db, _get_or_404(db, alert_id), payload.investigator, payload.notes)
    return _alert_to_out(alert)


@router.get("/{alert_id}/report")
def get_investigation_report(alert_id: int, db: Session = Depends(get_db)) -> Response:
    alert = _get_or_404(db, alert_id)
    pdf_bytes = build_investigation_report(alert)
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{alert.alert_ref}_investigation_report.pdf"'},
    )
