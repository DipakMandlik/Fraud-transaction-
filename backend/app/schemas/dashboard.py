from pydantic import BaseModel


class SystemHealth(BaseModel):
    database: bool
    redis: bool
    rule_engine: bool
    risk_engine: bool
    streaming: bool


class KpiSummary(BaseModel):
    transactions_today: int
    transactions_per_minute: float
    fraud_detected: int
    fraud_prevented_amount: float
    blocked: int
    pending_investigation: int
    high_risk_accounts: int
    fraud_percentage: float
    average_risk_score: float
    average_detection_time_ms: float
    system_health: SystemHealth


class TrendPoint(BaseModel):
    label: str
    total: int
    fraud: int


class ChannelDistribution(BaseModel):
    channel: str
    count: int
    fraud_count: int


class GeoPoint(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    count: int
    fraud_count: int
    risk_score_avg: float


class DashboardResponse(BaseModel):
    kpis: KpiSummary
    trend: list[TrendPoint]
    channel_distribution: list[ChannelDistribution]
    geo_points: list[GeoPoint]
