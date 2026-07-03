from datetime import datetime, timezone


def utcnow() -> datetime:
    """Timezone-aware UTC now, consistent with DateTime(timezone=True) columns."""
    return datetime.now(timezone.utc)
