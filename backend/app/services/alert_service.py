from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.fraud_alert import FraudAlert
from app.models.investigation import Investigation
from app.services.event_bus import publish_event
from app.services.serializers import alert_to_dict


class AlertNotFoundError(Exception):
    pass


def _record(db: Session, alert: FraudAlert, investigator: str, action: str, notes: str) -> None:
    db.add(Investigation(alert_id=alert.id, investigator=investigator, action=action, notes=notes))
    db.add(
        AuditLog(
            entity_type="FRAUD_ALERT", entity_id=alert.id, action=action, actor=investigator,
            details={"notes": notes, "status": alert.status},
        )
    )


def _finish(db: Session, alert: FraudAlert) -> FraudAlert:
    db.commit()
    db.refresh(alert)
    publish_event("alert.updated", alert_to_dict(alert))
    return alert


def assign(db: Session, alert: FraudAlert, investigator: str) -> FraudAlert:
    alert.assigned_investigator = investigator
    if alert.status == "OPEN":
        alert.status = "INVESTIGATING"
    _record(db, alert, investigator, "ASSIGN", f"Assigned to {investigator}")
    return _finish(db, alert)


def investigate(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    alert.status = "INVESTIGATING"
    if not alert.assigned_investigator:
        alert.assigned_investigator = investigator
    _record(db, alert, investigator, "NOTE", notes or "Investigation in progress")
    return _finish(db, alert)


def approve(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    alert.status = "CLOSED"
    alert.transaction.status = "APPROVED"
    alert.transaction.decision = "APPROVE"
    _record(db, alert, investigator, "APPROVE", notes or "Investigator approved the transaction")
    return _finish(db, alert)


def block(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    alert.status = "CLOSED"
    alert.transaction.status = "BLOCKED"
    alert.transaction.decision = "BLOCK"
    _record(db, alert, investigator, "BLOCK", notes or "Investigator blocked the transaction")
    return _finish(db, alert)


def mark_safe(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    alert.status = "FALSE_POSITIVE"
    alert.transaction.status = "APPROVED"
    alert.transaction.decision = "APPROVE"
    _record(db, alert, investigator, "MARK_SAFE", notes or "Confirmed as false positive")
    return _finish(db, alert)


def add_note(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    _record(db, alert, investigator, "NOTE", notes)
    return _finish(db, alert)


def close(db: Session, alert: FraudAlert, investigator: str, notes: str) -> FraudAlert:
    alert.status = "CLOSED"
    _record(db, alert, investigator, "CLOSE", notes or "Case closed")
    return _finish(db, alert)
