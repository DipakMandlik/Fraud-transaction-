from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    try:
        user, token = auth_service.login(db, payload.username, payload.password)
    except auth_service.AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return LoginResponse(token=token, username=user.username, full_name=user.full_name, role=user.role)


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token:
        auth_service.logout(db, token)
    return {"success": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return {"username": user.username, "full_name": user.full_name, "role": user.role}
