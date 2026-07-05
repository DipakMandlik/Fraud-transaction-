from collections import defaultdict
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.schemas.rule import RuleStatOut
from app.utils.time import utcnow


def get_rule_trigger_stats(db: Session, hours: int = 24) -> list[RuleStatOut]:
    """How often each rule actually fired, derived from the rule_evaluations
    snapshot stored on every transaction — not re-evaluated, just tallied."""
    since = utcnow() - timedelta(hours=hours)
    rows = db.query(Transaction.rule_evaluations).filter(Transaction.timestamp >= since).all()

    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"evaluated": 0, "triggered": 0})
    for (evaluations,) in rows:
        for ev in evaluations or []:
            code = ev.get("code")
            if not code:
                continue
            counts[code]["evaluated"] += 1
            if ev.get("triggered"):
                counts[code]["triggered"] += 1

    return [
        RuleStatOut(
            code=code,
            evaluated_count=c["evaluated"],
            triggered_count=c["triggered"],
            trigger_rate=(c["triggered"] / c["evaluated"]) if c["evaluated"] else 0.0,
        )
        for code, c in counts.items()
    ]
