from datetime import datetime, timedelta
from app.utils.time import utcnow

from sqlalchemy.orm import Session

from app.models.user import Session as SessionModel
from app.models.user import User
from app.utils.security import generate_token, verify_password

SESSION_TTL_HOURS = 12


class AuthError(Exception):
    pass


def login(db: Session, username: str, password: str) -> tuple[User, str]:
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Invalid username or password")

    token = generate_token()
    session = SessionModel(
        token=token, username=user.username, expires_at=utcnow() + timedelta(hours=SESSION_TTL_HOURS)
    )
    db.add(session)
    db.commit()
    return user, token


def resolve_token(db: Session, token: str) -> User | None:
    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if session is None or session.expires_at < utcnow():
        return None
    return db.query(User).filter(User.username == session.username).first()


def logout(db: Session, token: str) -> None:
    db.query(SessionModel).filter(SessionModel.token == token).delete()
    db.commit()
