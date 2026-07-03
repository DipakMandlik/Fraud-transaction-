from datetime import datetime, timedelta
from app.utils.time import utcnow

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.country import Country
from app.models.transaction import Transaction
from app.repositories.alert_repo import AlertRepository
from app.repositories.transaction_repo import TransactionRepository
from app.schemas.dashboard import ChannelDistribution, DashboardResponse, GeoPoint, KpiSummary, TrendPoint

_txn_repo = TransactionRepository()
_alert_repo = AlertRepository()


def get_kpis(db: Session) -> KpiSummary:
    now = utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_5_min = now - timedelta(minutes=5)

    transactions_today = _txn_repo.count_since(db, today_start)
    fraud_detected = _txn_repo.count_fraud_since(db, today_start)
    blocked = _txn_repo.count_by_status_since(db, today_start, "BLOCKED")
    txns_last_5_min = _txn_repo.count_since(db, last_5_min)

    pending_investigation = _alert_repo.count_by_status(db, "OPEN") + _alert_repo.count_by_status(db, "INVESTIGATING")

    high_risk_accounts = (
        db.query(func.count(func.distinct(Transaction.customer_id)))
        .filter(Transaction.timestamp >= now - timedelta(hours=24), Transaction.risk_score >= 61)
        .scalar()
        or 0
    )

    fraud_percentage = round((fraud_detected / transactions_today) * 100, 2) if transactions_today else 0.0
    avg_risk_score = _txn_repo.average_risk_score(db, today_start)
    prevented_amount = _txn_repo.prevented_fraud_amount(db, today_start)

    return KpiSummary(
        transactions_today=transactions_today,
        transactions_per_minute=round(txns_last_5_min / 5, 1),
        fraud_detected=fraud_detected,
        fraud_prevented_amount=prevented_amount,
        blocked=blocked,
        pending_investigation=pending_investigation,
        high_risk_accounts=high_risk_accounts,
        fraud_percentage=fraud_percentage,
        average_risk_score=avg_risk_score,
    )


def get_trend(db: Session, hours: int = 24) -> list[TrendPoint]:
    since = utcnow() - timedelta(hours=hours)
    bucket = func.date_trunc("hour", Transaction.timestamp)
    rows = (
        db.query(bucket.label("bucket"), func.count(Transaction.id), func.sum(cast(Transaction.is_fraud, Integer)))
        .filter(Transaction.timestamp >= since)
        .group_by("bucket")
        .order_by("bucket")
        .all()
    )
    return [
        TrendPoint(label=bucket_value.strftime("%H:%M"), total=total, fraud=fraud or 0)
        for bucket_value, total, fraud in rows
    ]


def get_channel_distribution(db: Session, hours: int = 24) -> list[ChannelDistribution]:
    since = utcnow() - timedelta(hours=hours)
    rows = (
        db.query(Transaction.transaction_type, func.count(Transaction.id), func.sum(cast(Transaction.is_fraud, Integer)))
        .filter(Transaction.timestamp >= since)
        .group_by(Transaction.transaction_type)
        .all()
    )
    return [ChannelDistribution(channel=t, count=c, fraud_count=f or 0) for t, c, f in rows]


def get_geo_points(db: Session, hours: int = 24) -> list[GeoPoint]:
    since = utcnow() - timedelta(hours=hours)
    rows = (
        db.query(
            Transaction.city,
            Country.name,
            func.avg(Transaction.latitude),
            func.avg(Transaction.longitude),
            func.count(Transaction.id),
            func.sum(cast(Transaction.is_fraud, Integer)),
            func.avg(Transaction.risk_score),
        )
        .join(Transaction.country)
        .filter(Transaction.timestamp >= since)
        .group_by(Transaction.city, Country.name)
        .all()
    )
    return [
        GeoPoint(
            city=city, country=country, latitude=lat, longitude=lon,
            count=count, fraud_count=fraud or 0, risk_score_avg=round(float(avg_risk or 0), 1),
        )
        for city, country, lat, lon, count, fraud, avg_risk in rows
    ]


def get_dashboard(db: Session) -> DashboardResponse:
    return DashboardResponse(
        kpis=get_kpis(db),
        trend=get_trend(db),
        channel_distribution=get_channel_distribution(db),
        geo_points=get_geo_points(db),
    )
