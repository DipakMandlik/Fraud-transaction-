"""Converts ORM objects into plain dicts for API responses / websocket broadcast."""

from app.models.fraud_alert import FraudAlert
from app.models.transaction import Transaction


def transaction_to_dict(txn: Transaction) -> dict:
    return {
        "id": txn.id,
        "transaction_ref": txn.transaction_ref,
        "customer_id": txn.customer_id,
        "customer_name": txn.customer.full_name,
        "account_number": txn.account.account_number,
        "beneficiary_name": txn.beneficiary_name_snapshot,
        "merchant_name": txn.merchant_name_snapshot,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "transaction_type": txn.transaction_type,
        "city": txn.city,
        "country": txn.country.name,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "device_id": txn.device.device_uid if txn.device else None,
        "ip_address": txn.ip_address,
        "status": txn.status,
        "risk_score": txn.risk_score,
        "decision": txn.decision,
        "is_fraud": txn.is_fraud,
        "fraud_scenario": txn.fraud_scenario,
        "triggered_rules": txn.triggered_rules.get("rules", []) if txn.triggered_rules else [],
        "reason": txn.reason,
        "timestamp": txn.timestamp.isoformat(),
    }


def alert_to_dict(alert: FraudAlert) -> dict:
    return {
        "id": alert.id,
        "alert_ref": alert.alert_ref,
        "transaction_id": alert.transaction_id,
        "customer_id": alert.customer_id,
        "customer_name": alert.customer.full_name,
        "severity": alert.severity,
        "risk_score": alert.risk_score,
        "status": alert.status,
        "assigned_investigator": alert.assigned_investigator,
        "reason_summary": alert.reason_summary,
        "explanation": alert.explanation,
        "created_at": alert.created_at.isoformat(),
        "updated_at": alert.updated_at.isoformat(),
    }
