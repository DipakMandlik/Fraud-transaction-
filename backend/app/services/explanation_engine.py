"""Builds human-readable fraud explanations from triggered rules — never generic text."""

from app.services.risk_engine import RiskAssessment


def build_explanation(assessment: RiskAssessment) -> list[str]:
    if not assessment.triggered_rules:
        return ["No fraud indicators detected. Transaction matches the customer's normal behavioural pattern."]

    ranked = sorted(assessment.triggered_rules, key=lambda r: r.weight, reverse=True)
    return [r.detail for r in ranked]


def build_reason_summary(assessment: RiskAssessment) -> str:
    if not assessment.triggered_rules:
        return "Approved: transaction consistent with normal customer behaviour."

    top_reasons = sorted(assessment.triggered_rules, key=lambda r: r.weight, reverse=True)[:3]
    reason_text = "; ".join(r.detail for r in top_reasons)

    verb = {
        "BLOCK": "Blocked",
        "OTP_VERIFICATION": "Sent for OTP verification",
        "REVIEW": "Flagged for review",
        "APPROVE": "Approved with notice",
    }[assessment.decision]

    return f"{verb} because {reason_text}. Total Risk Score {assessment.score:.0f}."
