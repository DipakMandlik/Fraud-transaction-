"""Core pipeline: build context -> evaluate rules -> score risk -> persist -> notify."""

import random
import string
import time
from datetime import datetime
from app.utils.time import utcnow

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.beneficiary import Beneficiary
from app.models.customer import Customer
from app.models.device import Device
from app.models.fraud_alert import FraudAlert
from app.models.merchant import Merchant
from app.models.rule import Rule
from app.models.transaction import Transaction
from app.services.context_builder import ProposedTransaction, build_context
from app.services.event_bus import publish_event
from app.services.explanation_engine import build_explanation, build_reason_summary
from app.services.risk_engine import RiskEngine, severity_for_score
from app.services.rule_engine import RuleEngine
from app.services.serializers import alert_to_dict, transaction_to_dict
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _generate_ref(prefix: str) -> str:
    stamp = utcnow().strftime("%y%m%d%H%M%S")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{stamp}-{suffix}"


def find_country_id(db: Session, country_name: str) -> int:
    from app.models.country import Country

    country = db.query(Country).filter(Country.name == country_name).first()
    return country.id if country else 1


class TransactionEngine:
    def __init__(self) -> None:
        self.rule_engine = RuleEngine()
        self.risk_engine = RiskEngine()

    def process(
        self,
        db: Session,
        proposed: ProposedTransaction,
        account: Account,
        merchant: Merchant | None,
        beneficiary: Beneficiary | None,
        device: Device | None,
        country_id: int,
        fraud_scenario: str | None,
        is_fraud_injected: bool,
    ) -> Transaction:
        started_at = time.perf_counter()

        ctx = build_context(db, proposed)

        rules = db.query(Rule).all()
        all_evaluations = self.rule_engine.evaluate_all(ctx, rules)
        triggered = [e for e in all_evaluations if e.triggered]
        assessment = self.risk_engine.score(triggered)
        explanation = build_explanation(assessment)
        reason = build_reason_summary(assessment)

        processing_ms = round((time.perf_counter() - started_at) * 1000, 2)

        txn = Transaction(
            transaction_ref=_generate_ref("TXN"),
            customer_id=proposed.customer.id,
            account_id=account.id,
            beneficiary_id=beneficiary.id if beneficiary else None,
            merchant_id=merchant.id if merchant else None,
            device_id=device.id if device else None,
            country_id=country_id,
            amount=proposed.amount,
            currency="INR",
            transaction_type=proposed.transaction_type,
            beneficiary_name_snapshot=proposed.beneficiary_name,
            merchant_name_snapshot=proposed.merchant_name,
            latitude=proposed.latitude,
            longitude=proposed.longitude,
            city=proposed.city,
            ip_address=proposed.ip_address,
            status=assessment.status,
            risk_score=assessment.score,
            decision=assessment.decision,
            is_fraud=is_fraud_injected,
            fraud_scenario=fraud_scenario,
            triggered_rules={"rules": [r.code for r in triggered]},
            rule_evaluations=[
                {
                    "code": e.code, "name": e.name, "category": e.category,
                    "weight": e.weight, "triggered": e.triggered, "detail": e.detail,
                }
                for e in all_evaluations
            ],
            processing_ms=processing_ms,
            reason=reason,
            timestamp=proposed.timestamp,
        )
        db.add(txn)
        db.flush()

        self._apply_side_effects(db, proposed, device, beneficiary)

        alert = None
        if assessment.decision != "APPROVE":
            alert = FraudAlert(
                alert_ref=_generate_ref("ALT"),
                transaction_id=txn.id,
                customer_id=proposed.customer.id,
                severity=severity_for_score(assessment.score),
                risk_score=assessment.score,
                status="OPEN",
                reason_summary=reason,
                explanation=explanation,
            )
            db.add(alert)

        db.commit()
        db.refresh(txn)
        if alert:
            db.refresh(alert)

        publish_event("transaction.created", transaction_to_dict(txn))
        if alert:
            publish_event("alert.created", alert_to_dict(alert))

        return txn

    @staticmethod
    def _apply_side_effects(
        db: Session,
        proposed: ProposedTransaction,
        device: Device | None,
        beneficiary: Beneficiary | None,
    ) -> None:
        customer: Customer = proposed.customer
        customer.last_activity_at = proposed.timestamp
        if customer.status == "DORMANT":
            customer.status = "ACTIVE"

        if device is None and proposed.device_uid:
            new_device = Device(
                customer_id=customer.id,
                device_uid=proposed.device_uid,
                device_type="MOBILE",
                os="Unknown",
                is_trusted=False,
                first_seen_at=proposed.timestamp,
                last_seen_at=proposed.timestamp,
            )
            db.add(new_device)
        elif device is not None:
            device.last_seen_at = proposed.timestamp

        if beneficiary is not None:
            beneficiary.transfer_count += 1
            if beneficiary.transfer_count >= 3:
                beneficiary.is_frequent = True
