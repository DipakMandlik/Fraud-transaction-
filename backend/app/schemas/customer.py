from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    account_number: str
    account_type: str
    bank_name: str
    ifsc_code: str
    balance: float
    daily_limit: float
    status: str


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    device_uid: str
    device_type: str
    os: str
    is_trusted: bool
    first_seen_at: datetime
    last_seen_at: datetime


class BeneficiaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    beneficiary_name: str
    account_number: str
    bank_name: str
    relationship_type: str
    is_frequent: bool
    transfer_count: int
    added_at: datetime


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_code: str
    full_name: str
    email: str
    phone: str
    city: str
    state: str
    occupation: str
    annual_income: float
    account_open_date: date
    risk_segment: str
    status: str
    kyc_level: str
    avg_transaction_amount: float


class CustomerDetailOut(CustomerOut):
    accounts: list[AccountOut] = []
    devices: list[DeviceOut] = []
    beneficiaries: list[BeneficiaryOut] = []
    total_transactions: int = 0
    fraud_incidents: int = 0
    highest_risk_score: float = 0


class CustomerListResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
