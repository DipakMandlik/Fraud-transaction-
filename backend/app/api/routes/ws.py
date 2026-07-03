import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import SessionLocal
from app.services.auth_service import resolve_token
from app.services.event_bus import CHANNEL_NAME, get_async_redis
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _is_authenticated(token: str | None) -> bool:
    if not token:
        return False
    db = SessionLocal()
    try:
        return resolve_token(db, token) is not None
    finally:
        db.close()


@router.websocket("/ws/events")
async def events_socket(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not _is_authenticated(token):
        await websocket.close(code=4401)
        return

    await websocket.accept()
    redis = get_async_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(CHANNEL_NAME)

    async def forward_messages() -> None:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            await websocket.send_text(message["data"])

    async def watch_disconnect() -> None:
        while True:
            await websocket.receive_text()

    forward_task = asyncio.create_task(forward_messages())
    disconnect_task = asyncio.create_task(watch_disconnect())

    try:
        done, pending = await asyncio.wait({forward_task, disconnect_task}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
    except WebSocketDisconnect:
        pass
    finally:
        for task in (forward_task, disconnect_task):
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        await pubsub.unsubscribe(CHANNEL_NAME)
        await pubsub.close()
