from sqlalchemy.orm import Session

from app.models.rule import Rule


class RuleRepository:
    def list(self, db: Session) -> list[Rule]:
        return db.query(Rule).order_by(Rule.priority).all()

    def get(self, db: Session, rule_id: int) -> Rule | None:
        return db.query(Rule).filter(Rule.id == rule_id).first()
