"""Generates realistic Indian banking demo data: customers, accounts, devices, beneficiaries."""

import random
import string
from datetime import date, datetime, timedelta
from app.utils.time import utcnow

from app.services.reference_data import (
    DEVICE_OS,
    INDIAN_BANKS,
    INDIAN_CITIES,
    INDIAN_FIRST_NAMES_FEMALE,
    INDIAN_FIRST_NAMES_MALE,
    INDIAN_LAST_NAMES,
    INDIAN_RELATIONSHIPS,
    OCCUPATIONS,
)


def _random_phone() -> str:
    return f"9{random.randint(100000000, 999999999)}"


def _random_account_number() -> str:
    return "".join(random.choices(string.digits, k=12))


def _random_ifsc(bank_code: str) -> str:
    return f"{bank_code}0{random.randint(100000, 999999)}"


def _random_device_uid() -> str:
    return "-".join("".join(random.choices(string.hexdigits.lower(), k=4)) for _ in range(4))


def _random_ip(domestic: bool = True) -> str:
    if domestic:
        return f"49.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
    return f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def generate_customer_profile(index: int) -> dict:
    gender = random.choice(["MALE", "FEMALE"])
    first_name = random.choice(INDIAN_FIRST_NAMES_MALE if gender == "MALE" else INDIAN_FIRST_NAMES_FEMALE)
    last_name = random.choice(INDIAN_LAST_NAMES)
    home = random.choice(INDIAN_CITIES)
    dob = date.today() - timedelta(days=random.randint(21 * 365, 65 * 365))
    account_open = date.today() - timedelta(days=random.randint(30, 12 * 365))
    income = random.choice([350000, 500000, 750000, 900000, 1200000, 1800000, 2500000, 4000000])
    risk_segment = random.choices(["LOW", "MEDIUM", "HIGH"], weights=[70, 22, 8])[0]
    status = random.choices(["ACTIVE", "DORMANT"], weights=[92, 8])[0]

    avg_txn = round(income / 12 * random.uniform(0.01, 0.06), 2)

    return {
        "customer_code": f"CUST{100000 + index}",
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{first_name.lower()}.{last_name.lower()}{index}@mailbank.in",
        "phone": _random_phone(),
        "date_of_birth": dob,
        "gender": gender,
        "city": home["city"],
        "state": home["state"],
        "home_latitude": home["lat"] + random.uniform(-0.02, 0.02),
        "home_longitude": home["lon"] + random.uniform(-0.02, 0.02),
        "occupation": random.choice(OCCUPATIONS),
        "annual_income": income,
        "account_open_date": account_open,
        "risk_segment": risk_segment,
        "status": status,
        "kyc_level": random.choices(["FULL", "MINIMAL"], weights=[90, 10])[0],
        "avg_transaction_amount": avg_txn,
        "common_login_hour_start": random.choice([6, 7, 8, 9]),
        "common_login_hour_end": random.choice([20, 21, 22, 23]),
        "last_activity_at": utcnow() - timedelta(days=0 if status == "ACTIVE" else random.randint(90, 400)),
        "_home_city": home,
    }


def generate_account(customer_code: str) -> dict:
    bank_name, bank_code = random.choice(INDIAN_BANKS)
    balance = round(random.uniform(5000, 2_000_000), 2)
    return {
        "account_number": _random_account_number(),
        "account_type": random.choices(["SAVINGS", "CURRENT"], weights=[85, 15])[0],
        "bank_name": bank_name,
        "ifsc_code": _random_ifsc(bank_code),
        "balance": balance,
        "daily_limit": random.choice([50000, 100000, 200000, 500000, 1000000]),
        "status": "ACTIVE",
        "opened_at": date.today() - timedelta(days=random.randint(30, 3000)),
    }


def generate_device(is_trusted: bool = True) -> dict:
    now = utcnow()
    return {
        "device_uid": _random_device_uid(),
        "device_type": random.choices(["MOBILE", "DESKTOP"], weights=[80, 20])[0],
        "os": random.choice(DEVICE_OS),
        "is_trusted": is_trusted,
        "first_seen_at": now - timedelta(days=random.randint(30, 900)),
        "last_seen_at": now,
    }


def generate_beneficiary() -> dict:
    gender = random.choice(["MALE", "FEMALE"])
    first_name = random.choice(INDIAN_FIRST_NAMES_MALE if gender == "MALE" else INDIAN_FIRST_NAMES_FEMALE)
    last_name = random.choice(INDIAN_LAST_NAMES)
    bank_name, bank_code = random.choice(INDIAN_BANKS)
    return {
        "beneficiary_name": f"{first_name} {last_name}",
        "account_number": _random_account_number(),
        "ifsc_code": _random_ifsc(bank_code),
        "bank_name": bank_name,
        "relationship_type": random.choice(INDIAN_RELATIONSHIPS),
        "is_frequent": random.random() < 0.6,
        "transfer_count": random.randint(1, 40),
    }


def random_ip(domestic: bool = True) -> str:
    return _random_ip(domestic)


def random_device_uid() -> str:
    return _random_device_uid()
