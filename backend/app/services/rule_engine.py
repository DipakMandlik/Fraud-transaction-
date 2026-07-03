"""Configurable rule engine. Rules are stored in the database (app.models.Rule) and
evaluated against a TransactionContext snapshot built by the transaction generator.

evaluate_all() returns every enabled rule's verdict (both pass and fail) so the UI
can render a full live checklist, not just the rules that fired.
"""

from dataclasses import dataclass
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
class RuleEvaluationResult:
    code: str
    name: str
    category: str
    weight: float
    triggered: bool
    detail: str


# Backwards-compatible alias — earlier versions only tracked triggered rules under this name.
RuleTriggerResult = RuleEvaluationResult


def _r_amount_anomaly(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    multiplier = rule.config.get("multiplier", 5)
    if ctx.avg_transaction_amount <= 0:
        return False, "No historical average available for comparison"
    ratio = ctx.amount / ctx.avg_transaction_amount
    if ratio >= multiplier:
        return True, f"Amount exceeds customer's average transaction by {ratio:.1f}x (₹{ctx.amount:,.0f} vs avg ₹{ctx.avg_transaction_amount:,.0f})"
    return False, f"Amount is {ratio:.1f}x the customer's average — within normal range"


def _r_large_amount(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    threshold = rule.config.get("amount_threshold", 100000)
    if ctx.amount > threshold:
        return True, f"Transaction amount ₹{ctx.amount:,.0f} exceeds the high-value threshold of ₹{threshold:,.0f}"
    return False, f"Amount ₹{ctx.amount:,.0f} is below the ₹{threshold:,.0f} high-value threshold"


def _r_new_device(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_new_device:
        return True, "Transaction initiated from a device never seen before for this customer"
    return False, "Device recognized from a prior session"


def _r_foreign_country(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_foreign_country:
        return True, f"Transaction originates from {ctx.txn_country_name}, outside the customer's home country ({ctx.home_country_name})"
    return False, f"Transaction originates from {ctx.home_country_name}, the customer's home country"


def _r_impossible_travel(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    max_speed = rule.config.get("max_speed_kmh", 900)
    if ctx.implied_speed_kmh is not None and ctx.implied_speed_kmh > max_speed:
        return True, (
            f"Implied travel speed of {ctx.implied_speed_kmh:,.0f} km/h between consecutive transactions "
            f"({ctx.distance_km_from_last:,.0f} km in {ctx.seconds_since_last_txn/60:.1f} min) is physically impossible"
        )
    if ctx.implied_speed_kmh is None:
        return False, "No prior transaction to compare travel velocity against"
    return False, f"Implied travel speed of {ctx.implied_speed_kmh:,.0f} km/h is physically plausible"


def _r_velocity_burst(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 5)
    window = rule.config.get("window_seconds", 30)
    if ctx.recent_txn_count_window >= count:
        return True, f"{ctx.recent_txn_count_window} transactions detected within the last {window} seconds"
    return False, f"{ctx.recent_txn_count_window} transaction(s) in the last {window} seconds — within normal velocity"


def _r_new_beneficiary(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_new_beneficiary:
        return True, f"Funds sent to a new beneficiary ({ctx.beneficiary_name}) never paid before"
    return False, "Beneficiary has received payments from this customer before"


def _r_blacklisted_merchant(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_blacklisted_merchant:
        return True, f"Merchant '{ctx.merchant_name}' is present on the fraud blacklist"
    return False, "Merchant is not present on the fraud blacklist"


def _r_blacklisted_ip(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_blacklisted_ip:
        return True, f"Originating IP address {ctx.ip_address} is present on the fraud blacklist"
    return False, "Originating IP address is not present on the fraud blacklist"


def _r_dormant_active(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    dormant_days = rule.config.get("dormant_days", 90)
    if ctx.is_dormant_account and ctx.dormant_days >= dormant_days:
        return True, f"Account dormant for {ctx.dormant_days} days has suddenly initiated a transaction"
    return False, "Account has recent activity history"


def _r_round_number(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_round_number and ctx.amount >= 10000:
        return True, f"Transaction amount ₹{ctx.amount:,.0f} is a suspiciously round figure, consistent with layering"
    return False, "Amount does not match a suspicious round-number pattern"


def _r_structuring(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    if ctx.sub_threshold_transfer_count >= count:
        return True, f"{ctx.sub_threshold_transfer_count} transfers just under the reporting threshold detected in the last hour"
    return False, f"{ctx.sub_threshold_transfer_count} sub-threshold transfer(s) in the last hour — below structuring pattern"


def _r_multiple_cards_same_ip(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    account_count = rule.config.get("account_count", 3)
    if ctx.distinct_accounts_same_ip_recent >= account_count:
        return True, f"{ctx.distinct_accounts_same_ip_recent} distinct accounts have transacted from IP {ctx.ip_address} recently"
    return False, f"Only {ctx.distinct_accounts_same_ip_recent} account(s) seen recently on this IP"


def _r_odd_hour(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.is_odd_hour:
        return True, f"Transaction occurred at {ctx.timestamp.strftime('%H:%M')}, outside the customer's typical active hours"
    return False, f"Transaction occurred at {ctx.timestamp.strftime('%H:%M')}, within the customer's typical active hours"


def _r_account_takeover(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    if ctx.account_takeover_signal:
        return True, "Combination of new device, new location and new beneficiary suggests possible account takeover"
    return False, "No combined new-device/new-location/new-beneficiary pattern detected"


def _r_repeated_failed_login(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    if ctx.failed_login_attempts >= count:
        return True, f"{ctx.failed_login_attempts} failed login attempts recorded in the minutes preceding this transaction"
    return False, "No repeated failed login attempts recorded"


def _r_transaction_splitting(ctx: TransactionContext, rule: Rule) -> tuple[bool, str]:
    count = rule.config.get("count", 3)
    window = rule.config.get("window_minutes", 30)
    if ctx.repeat_beneficiary_transfer_count >= count:
        return True, (
            f"{ctx.repeat_beneficiary_transfer_count} transfers sent to the same beneficiary "
            f"within {window} minutes, consistent with splitting a larger payment"
        )
    return False, f"{ctx.repeat_beneficiary_transfer_count} transfer(s) to this beneficiary within {window} minutes"


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
    def evaluate_all(self, context: TransactionContext, rules: list[Rule]) -> list[RuleEvaluationResult]:
        """Every enabled rule's verdict, pass and fail alike — powers the live rule
        execution panel in the Transaction Simulator."""
        results: list[RuleEvaluationResult] = []
        for rule in sorted(rules, key=lambda r: r.priority):
            if not rule.enabled:
                continue
            evaluator = RULE_EVALUATORS.get(rule.code)
            if evaluator is None:
                continue
            is_triggered, detail = evaluator(context, rule)
            results.append(
                RuleEvaluationResult(
                    code=rule.code, name=rule.name, category=rule.category,
                    weight=rule.weight, triggered=is_triggered, detail=detail,
                )
            )
        return results

    def evaluate(self, context: TransactionContext, rules: list[Rule]) -> list[RuleEvaluationResult]:
        """Only the rules that fired — what the risk engine sums and the
        explanation engine narrates."""
        return [r for r in self.evaluate_all(context, rules) if r.triggered]
