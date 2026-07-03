"""Generates realistic, mostly-legitimate banking transactions for active customers."""

import random
from datetime import datetime
from app.utils.time import utcnow

from sqlalchemy.orm import Session, joinedload

from app.models.account import Account
from app.models.beneficiary import Beneficiary
from app.models.customer import Customer
from app.models.device import Device
from app.models.merchant import Merchant
from app.services import data_factory
from app.services.context_builder import ProposedTransaction
from app.services.reference_data import INDIAN_CITIES
from app.services.transaction_engine import TransactionEngine, find_country_id
from app.utils.logger import get_logger

logger = get_logger(__name__)

TRANSACTION_TYPE_WEIGHTS = {
    "UPI": 40,
    "DEBIT_CARD": 20,
    "CREDIT_CARD": 12,
    "ATM": 10,
    "IMPS": 10,
    "NEFT": 5,
    "RTGS": 3,
}

MERCHANT_TYPES = {"UPI", "DEBIT_CARD", "CREDIT_CARD"}
TRANSFER_TYPES = {"NEFT", "RTGS", "IMPS"}

_engine = TransactionEngine()


def _pick_transaction_type() -> str:
    types, weights = zip(*TRANSACTION_TYPE_WEIGHTS.items())
    return random.choices(types, weights=weights)[0]


def _pick_amount(customer: Customer, transaction_type: str) -> float:
    avg = float(customer.avg_transaction_amount) or 1000.0
    if transaction_type == "ATM":
        return round(random.choice([2000, 5000, 10000, 15000, 20000]), 2)
    factor = random.lognormvariate(0, 0.6)
    amount = max(100.0, avg * factor)
    return round(amount, 2)


def generate_normal_transaction(db: Session) -> None:
    customer = (
        db.query(Customer)
        .options(joinedload(Customer.accounts), joinedload(Customer.devices), joinedload(Customer.beneficiaries))
        .filter(Customer.status == "ACTIVE")
        .order_by(Customer.id)
        .offset(random.randint(0, max(db.query(Customer).filter(Customer.status == "ACTIVE").count() - 1, 0)))
        .first()
    )
    if customer is None or not customer.accounts:
        return

    account: Account = random.choice(customer.accounts)
    transaction_type = _pick_transaction_type()
    amount = _pick_amount(customer, transaction_type)

    device: Device | None = None
    if customer.devices and random.random() < 0.92:
        device = random.choice(customer.devices)
        device_uid = device.device_uid
    else:
        device_uid = data_factory.random_device_uid()

    merchant: Merchant | None = None
    merchant_name = None
    beneficiary: Beneficiary | None = None
    beneficiary_name = None

    if transaction_type in MERCHANT_TYPES:
        merchant = (
            db.query(Merchant)
            .filter(Merchant.is_blacklisted.is_(False))
            .order_by(Merchant.id)
            .offset(random.randint(0, max(db.query(Merchant).filter(Merchant.is_blacklisted.is_(False)).count() - 1, 0)))
            .first()
        )
        merchant_name = merchant.name if merchant else None
    elif transaction_type in TRANSFER_TYPES and customer.beneficiaries:
        beneficiary = random.choice(customer.beneficiaries)
        beneficiary_name = beneficiary.beneficiary_name

    home_city = next((c for c in INDIAN_CITIES if c["city"] == customer.city), INDIAN_CITIES[0])
    if random.random() < 0.05:
        travel_city = random.choice(INDIAN_CITIES)
    else:
        travel_city = home_city

    lat = travel_city["lat"] + random.uniform(-0.05, 0.05)
    lon = travel_city["lon"] + random.uniform(-0.05, 0.05)

    proposed = ProposedTransaction(
        customer=customer,
        account=account,
        amount=amount,
        transaction_type=transaction_type,
        device_uid=device_uid,
        ip_address=data_factory.random_ip(domestic=True),
        merchant_name=merchant_name,
        merchant_is_blacklisted=False,
        beneficiary_name=beneficiary_name,
        beneficiary_is_new=False,
        latitude=lat,
        longitude=lon,
        city=travel_city["city"],
        country_name="India",
        is_foreign=False,
        timestamp=utcnow(),
        failed_login_attempts=0,
        beneficiary_id=beneficiary.id if beneficiary else None,
    )

    country_id = find_country_id(db, "India")

    try:
        _engine.process(
            db=db,
            proposed=proposed,
            account=account,
            merchant=merchant,
            beneficiary=beneficiary,
            device=device,
            country_id=country_id,
            fraud_scenario=None,
            is_fraud_injected=False,
        )
    except Exception:
        db.rollback()
        logger.exception("Failed to generate normal transaction")
