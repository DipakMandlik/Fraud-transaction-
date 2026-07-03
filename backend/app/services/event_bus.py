"""Thin pub/sub wrapper around Redis so the synchronous background scheduler can push
live events to async WebSocket clients. Structured so a Kafka producer/consumer could
be dropped in later behind the same publish_event / subscribe interface.
"""

import json
from functools import lru_cache

import redis
import redis.asyncio as aioredis

from app.config import settings

CHANNEL_NAME = "fraud_platform_events"


@lru_cache
def get_sync_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


@lru_cache
def get_async_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def publish_event(event_type: str, payload: dict) -> None:
    client = get_sync_redis()
    message = json.dumps({"type": event_type, "payload": payload}, default=str)
    client.publish(CHANNEL_NAME, message)
