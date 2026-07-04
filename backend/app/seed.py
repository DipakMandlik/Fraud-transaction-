"""Seeds the database with reference data, ~100 Indian customer profiles, and fraud rules.

Run with: python -m app.seed
"""

import random

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Account, Beneficiary, Blacklist, Country, Customer, Device, Merchant, Rule, User
from app.services import data_factory
from app.services.reference_data import (
    BENIGN_FOREIGN_LOCATIONS,
    BLACKLISTED_MERCHANTS,
    FOREIGN_HIGH_RISK_LOCATIONS,
    MERCHANT_CATALOG,
)
from app.services.rule_seed_data import RULE_DEFINITIONS
from app.utils.logger import configure_logging, get_logger
from app.utils.security import hash_password

configure_logging()
logger = get_logger(__name__)

NUM_CUSTOMERS = 100


def seed_countries(db) -> dict[str, Country]:
    countries: dict[str, Country] = {}

    india = Country(name="India", iso_code="IND", risk_level="LOW", is_blacklisted=False, is_domestic=True)
    db.add(india)
    countries["India"] = india

    for loc in BENIGN_FOREIGN_LOCATIONS:
        c = Country(name=loc["country"], iso_code=loc["iso"], risk_level="MEDIUM", is_blacklisted=False, is_domestic=False)
        db.add(c)
        countries[loc["country"]] = c

    for loc in FOREIGN_HIGH_RISK_LOCATIONS:
        c = Country(name=loc["country"], iso_code=loc["iso"], risk_level="HIGH", is_blacklisted=False, is_domestic=False)
        db.add(c)
        countries[loc["country"]] = c

    db.flush()
    return countries


def seed_merchants(db, india: Country) -> list[Merchant]:
    merchants = []
    for m in MERCHANT_CATALOG:
        merchant = Merchant(
            name=m["name"], category=m["category"], city="Mumbai", country_id=india.id,
            is_blacklisted=False, risk_level="LOW",
        )
        db.add(merchant)
        merchants.append(merchant)

    for m in BLACKLISTED_MERCHANTS:
        merchant = Merchant(
            name=m["name"], category=m["category"], city="Unknown", country_id=india.id,
            is_blacklisted=True, risk_level="HIGH",
        )
        db.add(merchant)
        merchants.append(merchant)

    db.flush()

    for m in merchants:
        if m.is_blacklisted:
            db.add(Blacklist(entity_type="MERCHANT", entity_value=m.name, reason="Known fraudulent merchant / shell entity", severity="HIGH"))

    return merchants


def seed_blacklisted_ips(db) -> list[str]:
    ips = [f"185.220.{random.randint(0,255)}.{random.randint(1,254)}" for _ in range(15)]
    for ip in ips:
        db.add(Blacklist(entity_type="IP_ADDRESS", entity_value=ip, reason="Associated with known botnet / fraud ring", severity="HIGH"))
    return ips


def sync_rules(db) -> None:
    """Insert new rule definitions and refresh scoring fields on existing ones, preserving
    any enabled/disabled state an admin has already configured via the Rules UI."""
    existing = {r.code: r for r in db.query(Rule).all()}
    for definition in RULE_DEFINITIONS:
        rule = existing.get(definition["code"])
        if rule is None:
            db.add(Rule(**definition, enabled=True))
            continue
        for field in ("name", "description", "category", "weight", "threshold", "config", "priority"):
            setattr(rule, field, definition[field])


def seed_admin_user(db) -> None:
    if not db.query(User).filter(User.username == settings.ADMIN_USERNAME).first():
        db.add(
            User(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                full_name="Admin Investigator",
                role="ADMIN",
            )
        )
    if not db.query(User).filter(User.username == "analyst").first():
        db.add(User(username="analyst", password_hash=hash_password("analyst123"), full_name="Priya Sharma", role="ANALYST"))


def seed_customers(db, india: Country) -> list[Customer]:
    customers = []
    for i in range(NUM_CUSTOMERS):
        profile = data_factory.generate_customer_profile(i)
        home_meta = profile.pop("_home_city")
        customer = Customer(country_id=india.id, **profile)
        db.add(customer)
        customers.append(customer)
    db.flush()

    for customer in customers:
        num_accounts = random.choices([1, 2], weights=[80, 20])[0]
        for _ in range(num_accounts):
            acct = data_factory.generate_account(customer.customer_code)
            db.add(Account(customer_id=customer.id, **acct))

        num_devices = random.choices([1, 2], weights=[75, 25])[0]
        for _ in range(num_devices):
            dev = data_factory.generate_device(is_trusted=True)
            db.add(Device(customer_id=customer.id, **dev))

        num_beneficiaries = random.randint(2, 6)
        for _ in range(num_beneficiaries):
            ben = data_factory.generate_beneficiary()
            db.add(Beneficiary(customer_id=customer.id, **ben))

    db.flush()
    return customers


def run_seed() -> None:
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        logger.info("Syncing fraud detection rule catalog...")
        sync_rules(db)
        db.commit()

        if db.query(Customer).count() > 0:
            logger.info("Reference data already seeded, skipping.")
            return

        logger.info("Seeding countries...")
        countries = seed_countries(db)

        logger.info("Seeding merchants and blacklists...")
        seed_merchants(db, countries["India"])
        seed_blacklisted_ips(db)

        logger.info("Seeding admin users...")
        seed_admin_user(db)

        logger.info(f"Seeding {NUM_CUSTOMERS} customer profiles (accounts, devices, beneficiaries)...")
        seed_customers(db, countries["India"])

        db.commit()
        logger.info("Seeding complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
