"""Queries the current DB state to build the TransactionContext consumed by the rule engine."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.blacklist import Blacklist
from app.models.customer import Customer
from app.models.device import Device
from app.models.transaction import Transaction
from app.services.rule_engine import TransactionContext
from app.utils.geo import haversine_km


@dataclass
class ProposedTransaction:
    customer: Customer
    account: Account
    amount: float
    transaction_type: str
    device_uid: str | None
    ip_address: str
    merchant_name: str | None
    merchant_is_blacklisted: bool
    beneficiary_name: str | None
    beneficiary_is_new: bool
    latitude: float
    longitude: float
    city: str
    country_name: str
    is_foreign: bool
    timestamp: datetime
    failed_login_attempts: int = 0
    beneficiary_id: int | None = None


def build_context(db: Session, txn: ProposedTransaction) -> TransactionContext:
    customer = txn.customer

    is_new_device = True
    if txn.device_uid:
        existing = (
            db.query(Device)
            .filter(Device.customer_id == customer.id, Device.device_uid == txn.device_uid)
            .first()
        )
        is_new_device = existing is None

    last_txn = (
        db.query(Transaction)
        .filter(Transaction.customer_id == customer.id)
        .order_by(Transaction.timestamp.desc())
        .first()
    )
    distance_km = None
    seconds_since_last = None
    implied_speed = None
    if last_txn is not None:
        distance_km = haversine_km(last_txn.latitude, last_txn.longitude, txn.latitude, txn.longitude)
        seconds_since_last = max((txn.timestamp - last_txn.timestamp).total_seconds(), 1.0)
        implied_speed = distance_km / (seconds_since_last / 3600)

    window_start = txn.timestamp - timedelta(seconds=30)
    recent_txn_count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.customer_id == customer.id, Transaction.timestamp >= window_start)
        .scalar()
        or 0
    )

    is_blacklisted_ip = (
        db.query(Blacklist)
        .filter(Blacklist.entity_type == "IP_ADDRESS", Blacklist.entity_value == txn.ip_address)
        .first()
        is not None
    )

    dormant_days = 0
    is_dormant = customer.status == "DORMANT"
    if customer.last_activity_at:
        dormant_days = (txn.timestamp - customer.last_activity_at).days
        is_dormant = is_dormant or dormant_days >= 90

    is_round_number = txn.amount > 0 and txn.amount % 5000 == 0

    structuring_window_start = txn.timestamp - timedelta(minutes=60)
    sub_threshold_count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.customer_id == customer.id,
            Transaction.timestamp >= structuring_window_start,
            Transaction.amount >= 80000,
            Transaction.amount < 100000,
        )
        .scalar()
        or 0
    )
    if 80000 <= txn.amount < 100000:
        sub_threshold_count += 1

    ip_window_start = txn.timestamp - timedelta(minutes=10)
    distinct_accounts_same_ip = (
        db.query(func.count(func.distinct(Transaction.customer_id)))
        .filter(Transaction.ip_address == txn.ip_address, Transaction.timestamp >= ip_window_start)
        .scalar()
        or 0
    )

    repeat_beneficiary_count = 0
    if txn.beneficiary_id:
        beneficiary_window_start = txn.timestamp - timedelta(minutes=30)
        repeat_beneficiary_count = (
            db.query(func.count(Transaction.id))
            .filter(
                Transaction.beneficiary_id == txn.beneficiary_id,
                Transaction.timestamp >= beneficiary_window_start,
            )
            .scalar()
            or 0
        ) + 1

    hour = txn.timestamp.hour
    is_odd_hour = not (customer.common_login_hour_start <= hour <= customer.common_login_hour_end)

    account_takeover_signal = is_new_device and txn.is_foreign and txn.beneficiary_is_new

    return TransactionContext(
        customer_id=customer.id,
        account_id=txn.account.id,
        amount=txn.amount,
        avg_transaction_amount=float(customer.avg_transaction_amount),
        transaction_type=txn.transaction_type,
        is_new_device=is_new_device,
        is_foreign_country=txn.is_foreign,
        home_country_name="India",
        txn_country_name=txn.country_name,
        distance_km_from_last=distance_km,
        seconds_since_last_txn=seconds_since_last,
        implied_speed_kmh=implied_speed,
        recent_txn_count_window=recent_txn_count,
        is_new_beneficiary=txn.beneficiary_is_new,
        beneficiary_name=txn.beneficiary_name,
        is_blacklisted_merchant=txn.merchant_is_blacklisted,
        merchant_name=txn.merchant_name,
        is_blacklisted_ip=is_blacklisted_ip,
        ip_address=txn.ip_address,
        is_dormant_account=is_dormant,
        dormant_days=dormant_days,
        is_round_number=is_round_number,
        sub_threshold_transfer_count=sub_threshold_count,
        distinct_accounts_same_ip_recent=distinct_accounts_same_ip,
        is_odd_hour=is_odd_hour,
        account_takeover_signal=account_takeover_signal,
        failed_login_attempts=txn.failed_login_attempts,
        repeat_beneficiary_transfer_count=repeat_beneficiary_count,
        timestamp=txn.timestamp,
        city=txn.city,
    )
