"""APScheduler-driven background jobs: continuous transaction stream + periodic fraud
injection. Uses self-rescheduling one-shot jobs to get randomized intervals, which
APScheduler's IntervalTrigger does not support natively.
"""

import random
from datetime import timedelta
from app.utils.time import utcnow

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger

from app.config import settings
from app.database import SessionLocal
from app.services.fraud_injector import inject_random_fraud_scenario
from app.services.transaction_generator import generate_normal_transaction
from app.utils.logger import get_logger

logger = get_logger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")

# Presentation-pace mode: tightens the fraud injection cadence so a live audience
# sees a new scenario every 20-30s instead of the default 30-60s. Toggled from
# Settings / the Simulator's Demo Mode switch — takes effect on the next reschedule.
DEMO_MODE_FRAUD_INTERVAL_SECONDS = (20, 30)
_demo_mode = False


def is_demo_mode() -> bool:
    return _demo_mode


def set_demo_mode(enabled: bool) -> None:
    global _demo_mode
    _demo_mode = enabled
    logger.info("Demo mode %s", "enabled" if enabled else "disabled")


def _run_transaction_job() -> None:
    db = SessionLocal()
    try:
        generate_normal_transaction(db)
    except Exception:
        logger.exception("Transaction generation job failed")
    finally:
        db.close()
    _schedule_next_transaction()


def _schedule_next_transaction() -> None:
    delay = random.uniform(settings.TXN_MIN_INTERVAL_SECONDS, settings.TXN_MAX_INTERVAL_SECONDS)
    scheduler.add_job(
        _run_transaction_job,
        trigger=DateTrigger(run_date=utcnow() + timedelta(seconds=delay)),
        id="next_transaction",
        replace_existing=True,
        misfire_grace_time=30,
    )


def _run_fraud_injection_job() -> None:
    db = SessionLocal()
    try:
        inject_random_fraud_scenario(db)
    except Exception:
        logger.exception("Fraud injection job failed")
    finally:
        db.close()
    _schedule_next_fraud_injection()


def _schedule_next_fraud_injection() -> None:
    if _demo_mode:
        min_s, max_s = DEMO_MODE_FRAUD_INTERVAL_SECONDS
    else:
        min_s, max_s = settings.FRAUD_INJECTION_MIN_SECONDS, settings.FRAUD_INJECTION_MAX_SECONDS
    delay = random.uniform(min_s, max_s)
    scheduler.add_job(
        _run_fraud_injection_job,
        trigger=DateTrigger(run_date=utcnow() + timedelta(seconds=delay)),
        id="next_fraud_injection",
        replace_existing=True,
        misfire_grace_time=60,
    )


def current_fraud_interval() -> tuple[int, int]:
    if _demo_mode:
        return DEMO_MODE_FRAUD_INTERVAL_SECONDS
    return settings.FRAUD_INJECTION_MIN_SECONDS, settings.FRAUD_INJECTION_MAX_SECONDS


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.start()
    _schedule_next_transaction()
    _schedule_next_fraud_injection()
    logger.info("Transaction generator and fraud injection scheduler started")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
