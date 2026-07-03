"""Deliberately constructs suspicious transactions covering every fraud typology in the
spec, then runs them through the exact same rule/risk pipeline as normal traffic so
detection is always genuine (never hand-scored).
"""

import random
from datetime import datetime, timedelta
from app.utils.time import utcnow

from sqlalchemy.orm import Session, joinedload

from app.models.beneficiary import Beneficiary
from app.models.blacklist import Blacklist
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.services import data_factory
from app.services.context_builder import ProposedTransaction
from app.services.reference_data import FOREIGN_HIGH_RISK_LOCATIONS, INDIAN_CITIES
from app.services.transaction_engine import TransactionEngine, find_country_id
from app.utils.logger import get_logger

logger = get_logger(__name__)

_engine = TransactionEngine()


def _sequence_timestamps(count: int, min_gap_seconds: float, max_gap_seconds: float) -> list[datetime]:
    """Backdated timestamps for a multi-step scenario, ending at now so the most
    recent (and usually highest-risk) event always appears live on the dashboard."""
    timestamps = [utcnow()]
    for _ in range(count - 1):
        gap = random.uniform(min_gap_seconds, max_gap_seconds)
        timestamps.append(timestamps[-1] - timedelta(seconds=gap))
    return list(reversed(timestamps))


def _random_active_customer(db: Session, status: str = "ACTIVE") -> Customer | None:
    q = db.query(Customer).options(
        joinedload(Customer.accounts), joinedload(Customer.devices), joinedload(Customer.beneficiaries)
    ).filter(Customer.status == status)
    count = q.count()
    if count == 0:
        return None
    return q.order_by(Customer.id).offset(random.randint(0, count - 1)).first()


def _base_kwargs(customer: Customer, timestamp: datetime) -> dict:
    home_city = next((c for c in INDIAN_CITIES if c["city"] == customer.city), INDIAN_CITIES[0])
    return {
        "customer": customer,
        "account": random.choice(customer.accounts),
        "device_uid": customer.devices[0].device_uid if customer.devices else data_factory.random_device_uid(),
        "ip_address": data_factory.random_ip(domestic=True),
        "merchant_name": None,
        "merchant_is_blacklisted": False,
        "beneficiary_name": None,
        "beneficiary_is_new": False,
        "latitude": home_city["lat"],
        "longitude": home_city["lon"],
        "city": home_city["city"],
        "country_name": "India",
        "is_foreign": False,
        "timestamp": timestamp,
        "failed_login_attempts": 0,
    }


def _fire(db: Session, customer: Customer, transaction_type: str, amount: float, scenario: str, **overrides):
    kwargs = _base_kwargs(customer, overrides.pop("timestamp", utcnow()))
    kwargs.update(overrides)

    device = None
    if kwargs["device_uid"] and customer.devices:
        device = next((d for d in customer.devices if d.device_uid == kwargs["device_uid"]), None)

    merchant = None
    if kwargs["merchant_name"]:
        merchant = db.query(Merchant).filter(Merchant.name == kwargs["merchant_name"]).first()

    beneficiary = None
    if kwargs["beneficiary_name"] and not kwargs["beneficiary_is_new"]:
        beneficiary = next((b for b in customer.beneficiaries if b.beneficiary_name == kwargs["beneficiary_name"]), None)

    country_id = find_country_id(db, kwargs["country_name"])

    proposed = ProposedTransaction(
        customer=kwargs["customer"],
        account=kwargs["account"],
        amount=amount,
        transaction_type=transaction_type,
        device_uid=kwargs["device_uid"],
        ip_address=kwargs["ip_address"],
        merchant_name=kwargs["merchant_name"],
        merchant_is_blacklisted=kwargs["merchant_is_blacklisted"],
        beneficiary_name=kwargs["beneficiary_name"],
        beneficiary_is_new=kwargs["beneficiary_is_new"],
        latitude=kwargs["latitude"],
        longitude=kwargs["longitude"],
        city=kwargs["city"],
        country_name=kwargs["country_name"],
        is_foreign=kwargs["is_foreign"],
        timestamp=kwargs["timestamp"],
        failed_login_attempts=kwargs["failed_login_attempts"],
        beneficiary_id=beneficiary.id if beneficiary else None,
    )

    try:
        return _engine.process(
            db=db,
            proposed=proposed,
            account=kwargs["account"],
            merchant=merchant,
            beneficiary=beneficiary,
            device=device,
            country_id=country_id,
            fraud_scenario=scenario,
            is_fraud_injected=True,
        )
    except Exception:
        db.rollback()
        logger.exception("Failed to inject fraud scenario %s", scenario)
        return None


def scenario_large_transaction(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    amount = random.uniform(150000, 900000)
    txn = _fire(db, customer, random.choice(["NEFT", "RTGS", "IMPS"]), amount, "LARGE_TRANSACTION")
    return [txn] if txn else []


def scenario_new_device(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    amount = random.uniform(20000, 120000)
    txn = _fire(db, customer, random.choice(["UPI", "DEBIT_CARD"]), amount, "NEW_DEVICE", device_uid=data_factory.random_device_uid())
    return [txn] if txn else []


def scenario_foreign_location(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    loc = random.choice(FOREIGN_HIGH_RISK_LOCATIONS)
    amount = random.uniform(30000, 250000)
    txn = _fire(
        db, customer, random.choice(["CREDIT_CARD", "DEBIT_CARD"]), amount, "FOREIGN_LOCATION",
        latitude=loc["lat"], longitude=loc["lon"], city=loc["city"], country_name=loc["country"], is_foreign=True,
        ip_address=data_factory.random_ip(domestic=False),
    )
    return [txn] if txn else []


def scenario_impossible_travel(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer or not customer.accounts:
        return []
    home_city = next((c for c in INDIAN_CITIES if c["city"] == customer.city), INDIAN_CITIES[0])
    t1, t2 = _sequence_timestamps(2, 45, 180)
    results = []
    results.append(_fire(db, customer, "UPI", random.uniform(500, 5000), "IMPOSSIBLE_TRAVEL",
          latitude=home_city["lat"], longitude=home_city["lon"], city=home_city["city"], timestamp=t1))

    loc = random.choice(FOREIGN_HIGH_RISK_LOCATIONS)
    results.append(_fire(
        db, customer, "CREDIT_CARD", random.uniform(20000, 150000), "IMPOSSIBLE_TRAVEL",
        latitude=loc["lat"], longitude=loc["lon"], city=loc["city"], country_name=loc["country"], is_foreign=True,
        ip_address=data_factory.random_ip(domestic=False), timestamp=t2,
    ))
    return [t for t in results if t]


def scenario_velocity_burst(db: Session, scenario_label: str = "VELOCITY_FRAUD", channels: list[str] | None = None) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    count = random.randint(5, 8)
    timestamps = _sequence_timestamps(count, 3, 6)
    channel_choices = channels or ["UPI", "ATM", "DEBIT_CARD"]
    results = []
    for i in range(count):
        results.append(_fire(
            db, customer, random.choice(channel_choices), random.uniform(5000, 40000), scenario_label,
            timestamp=timestamps[i],
        ))
    return [t for t in results if t]


def scenario_atm_cash_out(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    count = random.randint(5, 7)
    timestamps = _sequence_timestamps(count, 15, 45)
    results = []
    for i in range(count):
        results.append(_fire(
            db, customer, "ATM", random.uniform(10000, 25000), "ATM_CASH_OUT_ATTACK",
            device_uid=data_factory.random_device_uid(), timestamp=timestamps[i],
        ))
    return [t for t in results if t]


def scenario_new_beneficiary(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    ben = data_factory.generate_beneficiary()
    amount = random.uniform(25000, 180000)
    txn = _fire(db, customer, random.choice(["NEFT", "IMPS"]), amount, "NEW_BENEFICIARY",
          beneficiary_name=ben["beneficiary_name"], beneficiary_is_new=True)
    return [txn] if txn else []


def scenario_blacklisted_merchant(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    merchant = db.query(Merchant).filter(Merchant.is_blacklisted.is_(True)).order_by(Merchant.id).first()
    if not merchant:
        return []
    amount = random.uniform(5000, 90000)
    txn = _fire(db, customer, random.choice(["UPI", "DEBIT_CARD", "CREDIT_CARD"]), amount, "BLACKLISTED_MERCHANT",
          merchant_name=merchant.name, merchant_is_blacklisted=True)
    return [txn] if txn else []


def scenario_blacklisted_ip(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    blacklisted = db.query(Blacklist).filter(Blacklist.entity_type == "IP_ADDRESS").order_by(Blacklist.id).first()
    if not blacklisted:
        return []
    amount = random.uniform(10000, 150000)
    txn = _fire(db, customer, random.choice(["UPI", "NEFT"]), amount, "BLACKLISTED_IP", ip_address=blacklisted.entity_value)
    return [txn] if txn else []


def scenario_dormant_account_active(db: Session) -> list:
    customer = _random_active_customer(db, status="DORMANT")
    if not customer:
        customer = _random_active_customer(db)
        if not customer:
            return []
        customer.status = "DORMANT"
        customer.last_activity_at = utcnow() - timedelta(days=random.randint(120, 400))
    amount = random.uniform(40000, 300000)
    txn = _fire(db, customer, random.choice(["NEFT", "RTGS"]), amount, "DORMANT_ACCOUNT_ACTIVE")
    return [txn] if txn else []


def scenario_repeated_failed_login(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    amount = random.uniform(15000, 100000)
    txn = _fire(db, customer, random.choice(["UPI", "DEBIT_CARD"]), amount, "REPEATED_FAILED_LOGIN",
          device_uid=data_factory.random_device_uid(), failed_login_attempts=random.randint(3, 7))
    return [txn] if txn else []


def scenario_multiple_cards_same_ip(db: Session) -> list:
    ip = data_factory.random_ip(domestic=True)
    count = random.randint(3, 5)
    timestamps = _sequence_timestamps(count, 10, 40)
    results = []
    for i in range(count):
        customer = _random_active_customer(db)
        if not customer:
            continue
        results.append(_fire(
            db, customer, random.choice(["DEBIT_CARD", "CREDIT_CARD"]), random.uniform(5000, 60000),
            "MULTIPLE_CARDS_SAME_IP", ip_address=ip, timestamp=timestamps[i],
        ))
    return [t for t in results if t]


def scenario_money_mule(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    count = random.randint(3, 4)
    timestamps = _sequence_timestamps(count, 120, 360)
    results = []
    for i in range(count):
        ben = data_factory.generate_beneficiary()
        results.append(_fire(
            db, customer, random.choice(["IMPS", "NEFT"]), random.uniform(40000, 95000), "MONEY_MULE",
            beneficiary_name=ben["beneficiary_name"], beneficiary_is_new=True,
            timestamp=timestamps[i],
        ))
    return [t for t in results if t]


def scenario_account_takeover(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    loc = random.choice(FOREIGN_HIGH_RISK_LOCATIONS)
    ben = data_factory.generate_beneficiary()
    amount = random.uniform(50000, 400000)
    txn = _fire(
        db, customer, random.choice(["NEFT", "RTGS"]), amount, "ACCOUNT_TAKEOVER",
        device_uid=data_factory.random_device_uid(), latitude=loc["lat"], longitude=loc["lon"], city=loc["city"],
        country_name=loc["country"], is_foreign=True, ip_address=data_factory.random_ip(domestic=False),
        beneficiary_name=ben["beneficiary_name"], beneficiary_is_new=True,
    )
    return [txn] if txn else []


def scenario_round_number_laundering(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    amount = float(random.choice([100000, 200000, 250000, 500000, 1000000]))
    txn = _fire(db, customer, random.choice(["NEFT", "RTGS"]), amount, "ROUND_NUMBER_LAUNDERING")
    return [txn] if txn else []


def scenario_structuring(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer:
        return []
    count = random.randint(3, 4)
    timestamps = _sequence_timestamps(count, 300, 900)
    results = []
    for i in range(count):
        amount = random.uniform(82000, 98000)
        results.append(_fire(
            db, customer, random.choice(["NEFT", "IMPS"]), amount, "STRUCTURING",
            timestamp=timestamps[i],
        ))
    return [t for t in results if t]


def scenario_transaction_splitting(db: Session) -> list:
    customer = _random_active_customer(db)
    if not customer or not customer.beneficiaries:
        return []
    beneficiary = random.choice(customer.beneficiaries)
    count = random.randint(3, 5)
    timestamps = _sequence_timestamps(count, 180, 480)
    results = []
    for i in range(count):
        amount = random.uniform(30000, 60000)
        results.append(_fire(
            db, customer, "IMPS", amount, "TRANSACTION_SPLITTING",
            beneficiary_name=beneficiary.beneficiary_name,
            timestamp=timestamps[i],
        ))
    return [t for t in results if t]


SCENARIOS = [
    scenario_large_transaction,
    scenario_new_device,
    scenario_foreign_location,
    scenario_impossible_travel,
    lambda db: scenario_velocity_burst(db, "RAPID_MULTIPLE_TRANSACTIONS"),
    scenario_new_beneficiary,
    scenario_blacklisted_merchant,
    scenario_blacklisted_ip,
    scenario_dormant_account_active,
    scenario_repeated_failed_login,
    scenario_multiple_cards_same_ip,
    lambda db: scenario_velocity_burst(db, "VELOCITY_FRAUD"),
    scenario_money_mule,
    scenario_account_takeover,
    scenario_round_number_laundering,
    scenario_structuring,
    scenario_transaction_splitting,
]


def inject_random_fraud_scenario(db: Session) -> list:
    scenario_fn = random.choice(SCENARIOS)
    logger.info("Injecting fraud scenario: %s", getattr(scenario_fn, "__name__", "velocity_burst_variant"))
    return scenario_fn(db)


# Presenter-facing demo scenarios — one-click triggers for the Transaction Simulator.
# Each maps a stable code to a friendly label/description and the generator function.
DEMO_SCENARIOS: dict[str, dict] = {
    "HIGH_VALUE_UPI_FRAUD": {
        "label": "High-Value UPI Fraud",
        "description": "A single large-value transfer far above the customer's normal spend.",
        "run": scenario_large_transaction,
    },
    "ACCOUNT_TAKEOVER": {
        "label": "Account Takeover",
        "description": "New device, foreign IP and a brand-new beneficiary appear together.",
        "run": scenario_account_takeover,
    },
    "IMPOSSIBLE_TRAVEL": {
        "label": "Impossible Travel",
        "description": "Two transactions at physically unreachable locations minutes apart.",
        "run": scenario_impossible_travel,
    },
    "NEW_DEVICE_LOGIN": {
        "label": "New Device Login",
        "description": "A payment initiated from a device never associated with this customer.",
        "run": scenario_new_device,
    },
    "CARD_SKIMMING": {
        "label": "Card Skimming",
        "description": "Multiple customer cards used from the same compromised IP address.",
        "run": scenario_multiple_cards_same_ip,
    },
    "ATM_CASH_OUT": {
        "label": "ATM Cash-Out Attack",
        "description": "A rapid burst of ATM withdrawals typical of a cloned-card cash-out.",
        "run": scenario_atm_cash_out,
    },
    "MULE_ACCOUNT": {
        "label": "Mule Account",
        "description": "Funds fanned out to several brand-new beneficiaries in quick succession.",
        "run": scenario_money_mule,
    },
    "STRUCTURING": {
        "label": "Money Laundering (Structuring)",
        "description": "Several transfers kept just under the regulatory reporting threshold.",
        "run": scenario_structuring,
    },
    "VELOCITY_FRAUD": {
        "label": "Velocity Fraud",
        "description": "A rapid-fire burst of transactions in under a minute.",
        "run": lambda db: scenario_velocity_burst(db, "VELOCITY_FRAUD"),
    },
    "MERCHANT_FRAUD": {
        "label": "Merchant Fraud",
        "description": "A payment routed to a merchant already on the fraud blacklist.",
        "run": scenario_blacklisted_merchant,
    },
}


def run_demo_scenario(db: Session, code: str) -> list:
    entry = DEMO_SCENARIOS.get(code)
    if entry is None:
        raise ValueError(f"Unknown demo scenario: {code}")
    logger.info("Demo-triggered fraud scenario: %s", code)
    return entry["run"](db)
