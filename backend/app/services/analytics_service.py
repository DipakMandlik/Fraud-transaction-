from datetime import datetime, timedelta
from app.utils.time import utcnow

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.country import Country
from app.models.customer import Customer
from app.models.fraud_alert import FraudAlert
from app.models.transaction import Transaction
from app.schemas.analytics import AnalyticsResponse, LabeledCount, TopRiskCustomer


def _hourly_fraud(db: Session, since: datetime) -> list[LabeledCount]:
    bucket = func.date_trunc("hour", Transaction.timestamp)
    rows = (
        db.query(bucket.label("bucket"), func.sum(cast(Transaction.is_fraud, Integer)))
        .filter(Transaction.timestamp >= since)
        .group_by("bucket")
        .order_by("bucket")
        .all()
    )
    return [LabeledCount(label=b.strftime("%H:%M"), value=v or 0) for b, v in rows]


def _risk_distribution(db: Session, since: datetime) -> list[LabeledCount]:
    buckets = [(0, 30, "Low (0-30)"), (31, 60, "Medium (31-60)"), (61, 80, "High (61-80)"), (81, 100, "Critical (81-100)")]
    result = []
    for low, high, label in buckets:
        count = (
            db.query(func.count(Transaction.id))
            .filter(Transaction.timestamp >= since, Transaction.risk_score >= low, Transaction.risk_score <= high)
            .scalar()
            or 0
        )
        result.append(LabeledCount(label=label, value=count))
    return result


def _channel_distribution(db: Session, since: datetime) -> list[LabeledCount]:
    rows = (
        db.query(Transaction.transaction_type, func.count(Transaction.id))
        .filter(Transaction.timestamp >= since)
        .group_by(Transaction.transaction_type)
        .all()
    )
    return [LabeledCount(label=t, value=c) for t, c in rows]


def _country_distribution(db: Session, since: datetime) -> list[LabeledCount]:
    rows = (
        db.query(Country.name, func.count(Transaction.id))
        .join(Transaction, Transaction.country_id == Country.id)
        .filter(Transaction.timestamp >= since)
        .group_by(Country.name)
        .all()
    )
    return [LabeledCount(label=n, value=c) for n, c in rows]


def _fraud_reasons(db: Session, since: datetime) -> list[LabeledCount]:
    rows = (
        db.query(Transaction.fraud_scenario, func.count(Transaction.id))
        .filter(Transaction.timestamp >= since, Transaction.fraud_scenario.isnot(None))
        .group_by(Transaction.fraud_scenario)
        .order_by(func.count(Transaction.id).desc())
        .all()
    )
    return [LabeledCount(label=(r or "UNKNOWN").replace("_", " ").title(), value=c) for r, c in rows]


def _top_risk_customers(db: Session, since: datetime, limit: int = 10) -> list[TopRiskCustomer]:
    rows = (
        db.query(
            Customer.id,
            Customer.customer_code,
            Customer.first_name,
            Customer.last_name,
            func.max(Transaction.risk_score),
            func.sum(cast(Transaction.is_fraud, Integer)),
            func.count(Transaction.id),
        )
        .join(Transaction, Transaction.customer_id == Customer.id)
        .filter(Transaction.timestamp >= since)
        .group_by(Customer.id, Customer.customer_code, Customer.first_name, Customer.last_name)
        .order_by(func.max(Transaction.risk_score).desc())
        .limit(limit)
        .all()
    )
    return [
        TopRiskCustomer(
            customer_id=cid, customer_name=f"{fn} {ln}", customer_code=code,
            max_risk_score=max_score, fraud_incidents=fraud_count or 0, total_transactions=total,
        )
        for cid, code, fn, ln, max_score, fraud_count, total in rows
    ]


def _transaction_volume(db: Session, since: datetime) -> list[LabeledCount]:
    bucket = func.date_trunc("hour", Transaction.timestamp)
    rows = (
        db.query(bucket.label("bucket"), func.count(Transaction.id))
        .filter(Transaction.timestamp >= since)
        .group_by("bucket")
        .order_by("bucket")
        .all()
    )
    return [LabeledCount(label=b.strftime("%H:%M"), value=v) for b, v in rows]


def _rates(db: Session, since: datetime) -> tuple[float, float, float]:
    total = db.query(func.count(Transaction.id)).filter(Transaction.timestamp >= since).scalar() or 0
    approved = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.timestamp >= since, Transaction.status == "APPROVED")
        .scalar()
        or 0
    )
    blocked = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.timestamp >= since, Transaction.status == "BLOCKED")
        .scalar()
        or 0
    )
    total_alerts = db.query(func.count(FraudAlert.id)).scalar() or 0
    false_positives = db.query(func.count(FraudAlert.id)).filter(FraudAlert.status == "FALSE_POSITIVE").scalar() or 0

    approval_rate = round((approved / total) * 100, 1) if total else 0.0
    blocked_rate = round((blocked / total) * 100, 1) if total else 0.0
    fp_rate = round((false_positives / total_alerts) * 100, 1) if total_alerts else 0.0
    return approval_rate, blocked_rate, fp_rate


def get_analytics(db: Session, hours: int = 24) -> AnalyticsResponse:
    since = utcnow() - timedelta(hours=hours)
    approval_rate, blocked_rate, fp_rate = _rates(db, since)

    return AnalyticsResponse(
        hourly_fraud=_hourly_fraud(db, since),
        risk_distribution=_risk_distribution(db, since),
        channel_distribution=_channel_distribution(db, since),
        country_distribution=_country_distribution(db, since),
        fraud_reasons=_fraud_reasons(db, since),
        top_risk_customers=_top_risk_customers(db, since),
        transaction_volume=_transaction_volume(db, since),
        approval_rate=approval_rate,
        blocked_rate=blocked_rate,
        false_positive_rate=fp_rate,
    )
