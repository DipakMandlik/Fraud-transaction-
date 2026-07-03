"""Configurable rule engine. Rules are stored in the database (app.models.Rule) and
evaluated against a TransactionContext snapshot built by the transaction generator.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable

from app.models.rule import Rule


@dataclass
class TransactionContext:
    customer_id: int
    account_id: int
    amount: float
    avg_transaction_amount: float
    transaction_type: str

    is_new_device: bool
    is_foreign_country: bool
    home_country_name: str
    txn_country_name: str

    distance_km_from_last: float | None
    seconds_since_last_txn: float | None
    implied_speed_kmh: float | None

    recent_txn_count_window: int

    is_new_beneficiary: bool
    beneficiary_name: str | None

    is_blacklisted_merchant: bool
    merchant_name: str | None
    is_blacklisted_ip: bool
    ip_address: str

    is_dormant_account: bool
    dormant_days: int

    is_round_number: bool
    sub_threshold_transfer_count: int
    distinct_accounts_same_ip_recent: int

    is_odd_hour: bool
    account_takeover_signal: bool
    failed_login_attempts: int
    repeat_beneficiary_transfer_count: int

    timestamp: datetime
    city: str


@dataclass
class RuleTriggerResult:
    code: str
    name: str
    category: str
    weight: float
    detail: str


def _r_amount_anomaly(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    multiplier = rule.config.get("multiplier", 5)
    if ctx.avg_transaction_amount <= 0:
        return False, ""
    ratio = ctx.amount / ctx.avg_transaction_amount
    if ratio >= multiplier:
        return True, f"Amount exceeds customer's average transaction by {ratio:.1f}x (₹{ctx.amount:,.0f} vs avg ₹{ctx.avg_transaction_amount:,.0f})"
    return False, ""


def _r_large_amount(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    threshold = rule.config.get("amount_threshold", 100000)
    if ctx.amount > threshold:
        return True, f"Transaction amount ₹{ctx.amount:,.0f} exceeds the high-value threshold of ₹{threshold:,.0f}"
    return False, ""


def _r_new_device(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_new_device:
        return True, "Transaction initiated from a device never seen before for this customer"
    return False, ""


def _r_foreign_country(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_foreign_country:
        return True, f"Transaction originates from {ctx.txn_country_name}, outside the customer's home country ({ctx.home_country_name})"
    return False, ""


def _r_impossible_travel(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    max_speed = rule.config.get("max_speed_kmh", 900)
    if ctx.implied_speed_kmh is not None and ctx.implied_speed_kmh > max_speed:
        return True, (
            f"Implied travel speed of {ctx.implied_speed_kmh:,.0f} km/h between consecutive transactions "
            f"({ctx.distance_km_from_last:,.0f} km in {ctx.seconds_since_last_txn/60:.1f} min) is physically impossible"
        )
    return False, ""


def _r_velocity_burst(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 5)
    window = rule.config.get("window_seconds", 30)
    if ctx.recent_txn_count_window >= count:
        return True, f"{ctx.recent_txn_count_window} transactions detected within the last {window} seconds"
    return False, ""


def _r_new_beneficiary(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_new_beneficiary:
        return True, f"Funds sent to a new beneficiary ({ctx.beneficiary_name}) never paid before"
    return False, ""


def _r_blacklisted_merchant(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_blacklisted_merchant:
        return True, f"Merchant '{ctx.merchant_name}' is present on the fraud blacklist"
    return False, ""


def _r_blacklisted_ip(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_blacklisted_ip:
        return True, f"Originating IP address {ctx.ip_address} is present on the fraud blacklist"
    return False, ""


def _r_dormant_active(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    dormant_days = rule.config.get("dormant_days", 90)
    if ctx.is_dormant_account and ctx.dormant_days >= dormant_days:
        return True, f"Account dormant for {ctx.dormant_days} days has suddenly initiated a transaction"
    return False, ""


def _r_round_number(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_round_number and ctx.amount >= 10000:
        return True, f"Transaction amount ₹{ctx.amount:,.0f} is a suspiciously round figure, consistent with layering"
    return False, ""


def _r_structuring(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    if ctx.sub_threshold_transfer_count >= count:
        return True, f"{ctx.sub_threshold_transfer_count} transfers just under the reporting threshold detected in the last hour"
    return False, ""


def _r_multiple_cards_same_ip(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    account_count = rule.config.get("account_count", 3)
    if ctx.distinct_accounts_same_ip_recent >= account_count:
        return True, f"{ctx.distinct_accounts_same_ip_recent} distinct accounts have transacted from IP {ctx.ip_address} recently"
    return False, ""


def _r_odd_hour(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_odd_hour:
        return True, f"Transaction occurred at {ctx.timestamp.strftime('%H:%M')}, outside the customer's typical active hours"
    return False, ""


def _r_account_takeover(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.account_takeover_signal:
        return True, "Combination of new device, new location and new beneficiary suggests possible account takeover"
    return False, ""


def _r_repeated_failed_login(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    if ctx.failed_login_attempts >= count:
        return True, f"{ctx.failed_login_attempts} failed login attempts recorded in the minutes preceding this transaction"
    return False, ""


def _r_transaction_splitting(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    window = rule.config.get("window_minutes", 30)
    if ctx.repeat_beneficiary_transfer_count >= count:
        return True, (
            f"{ctx.repeat_beneficiary_transfer_count} transfers sent to the same beneficiary "
            f"within {window} minutes, consistent with splitting a larger payment"
        )
    return False, ""


RULE_EVALUATORS: dict[str, Callable[[TransactionContext, Rule], tuple[bool, str]]] = {
    "AMOUNT_ANOMALY": _r_amount_anomaly,
    "LARGE_AMOUNT": _r_large_amount,
    "NEW_DEVICE": _r_new_device,
    "FOREIGN_COUNTRY": _r_foreign_country,
    "IMPOSSIBLE_TRAVEL": _r_impossible_travel,
    "VELOCITY_BURST": _r_velocity_burst,
    "NEW_BENEFICIARY": _r_new_beneficiary,
    "BLACKLISTED_MERCHANT": _r_blacklisted_merchant,
    "BLACKLISTED_IP": _r_blacklisted_ip,
    "DORMANT_ACCOUNT_ACTIVE": _r_dormant_active,
    "ROUND_NUMBER_LAUNDERING": _r_round_number,
    "STRUCTURING": _r_structuring,
    "MULTIPLE_CARDS_SAME_IP": _r_multiple_cards_same_ip,
    "ODD_HOUR_ACTIVITY": _r_odd_hour,
    "ACCOUNT_TAKEOVER_PATTERN": _r_account_takeover,
    "REPEATED_FAILED_LOGIN": _r_repeated_failed_login,
    "TRANSACTION_SPLITTING": _r_transaction_splitting,
}


class RuleEngine:
    def evaluate(self, context: TransactionContext, rules: list[Rule]) -> list[RuleTriggerResult]:
        triggered: list[RuleTriggerResult] = []
        for rule in sorted(rules, key=lambda r: r.priority):
            if not rule.enabled:
                continue
            evaluator = RULE_EVALUATORS.get(rule.code)
            if evaluator is None:
                continue
            is_triggered, detail = evaluator(context, rule)
            if is_triggered:
                triggered.append(
                    RuleTriggerResult(code=rule.code, name=rule.name, category=rule.category, weight=rule.weight, detail=detail)
                )
        return triggered
