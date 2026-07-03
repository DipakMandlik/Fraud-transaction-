from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import alerts, analytics, auth, customers, dashboard, health, investigations, rules, settings, transactions, ws
from app.config import settings as app_settings
from app.scheduler import shutdown_scheduler, start_scheduler
from app.seed import run_seed
from app.utils.logger import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up %s...", app_settings.APP_NAME)
    run_seed()
    start_scheduler()
    yield
    logger.info("Shutting down...")
    shutdown_scheduler()


app = FastAPI(
    title=app_settings.APP_NAME,
    description="Real-time fraud detection platform demonstration for banking stakeholders.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(customers.router)
app.include_router(rules.router)
app.include_router(alerts.router)
app.include_router(investigations.router)
app.include_router(analytics.router)
app.include_router(settings.router)
app.include_router(health.router)
app.include_router(ws.router)


@app.get("/")
def root() -> dict:
    return {"name": app_settings.APP_NAME, "docs": "/docs", "health": "/api/health"}
