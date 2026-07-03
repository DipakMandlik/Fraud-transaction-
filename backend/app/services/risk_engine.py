"""Combines rule engine output into a 0-100 risk score and a routing decision."""

from dataclasses import dataclass

from app.services.rule_engine import RuleTriggerResult

DECISION_THRESHOLDS = (
    (30, "APPROVE"),
    (60, "REVIEW"),
    (80, "OTP_VERIFICATION"),
    (100, "BLOCK"),
)

STATUS_BY_DECISION = {
    "APPROVE": "APPROVED",
    "REVIEW": "REVIEW",
    "OTP_VERIFICATION": "OTP_PENDING",
    "BLOCK": "BLOCKED",
}


@dataclass
class RiskAssessment:
    score: float
    decision: str
    status: str
    triggered_rules: list[RuleTriggerResult]


class RiskEngine:
    def score(self, triggered_rules: list[RuleTriggerResult]) -> RiskAssessment:
        raw_score = sum(r.weight for r in triggered_rules)
        score = min(100.0, round(raw_score, 1))
        decision = self._decide(score)
        return RiskAssessment(
            score=score,
            decision=decision,
            status=STATUS_BY_DECISION[decision],
            triggered_rules=triggered_rules,
        )

    @staticmethod
    def _decide(score: float) -> str:
        for upper_bound, decision in DECISION_THRESHOLDS:
            if score <= upper_bound:
                return decision
        return "BLOCK"


def severity_for_score(score: float) -> str:
    if score >= 81:
        return "CRITICAL"
    if score >= 61:
        return "HIGH"
    if score >= 31:
        return "MEDIUM"
    return "LOW"
