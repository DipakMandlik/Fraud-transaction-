from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.event_bus import get_sync_redis

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
def health(db: Session = Depends(get_db)) -> dict:
    db_ok = True
    redis_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    try:
        get_sync_redis().ping()
    except Exception:
        redis_ok = False

    return {"status": "ok" if db_ok and redis_ok else "degraded", "database": db_ok, "redis": redis_ok}
