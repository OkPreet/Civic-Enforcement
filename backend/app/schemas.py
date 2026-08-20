from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = None
    email: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    refresh_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    badge_id: Optional[str] = None
    assigned_zone_id: Optional[int] = None
    is_active: bool
    area: Optional[str] = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "citizen"  # citizen | authority
    badge_id: Optional[str] = None
    assigned_zone_id: Optional[int] = None
    area: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    badge_id: Optional[str] = None
    assigned_zone_id: Optional[int] = None
    area: Optional[str] = None
    is_active: Optional[bool] = None


# ---------- Zones / Cameras ----------
class CameraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    violation_type: str
    fine_amount: int
    camera_id: Optional[int] = None
    coordinates: Optional[str] = None
    active: bool


# ---------- Reports ----------
class ReportIn(BaseModel):
    plate: str = Field(..., max_length=20)
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None
    violation_type: str = Field(..., max_length=80)
    location: str = Field(..., max_length=200)
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    plate: str
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None
    violation_type: str
    status: str
    location: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None
    source: str
    fine_amount: Optional[int] = None
    evidence: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reported_at: datetime
    reviewed_at: Optional[datetime] = None


class ReviewIn(BaseModel):
    action: str  # confirmed | rejected
    notes: Optional[str] = None


# ---------- Violations (authority view) ----------
class ViolationStats(BaseModel):
    total: int
    pending_review: int
    verified: int
    challan_issued: int
    rejected: int


class ChallanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    report_id: int
    amount: int
    status: str
    vehicle_plate: str
    issued_at: datetime
    paid_at: Optional[datetime] = None


class HourlyTrendPoint(BaseModel):
    hour: str  # "09:00"
    count: int
    predicted: int


class TypeCount(BaseModel):
    type: str
    count: int


class TopZone(BaseModel):
    name: str
    count: int
    trend: int  # % change vs previous day


# ---------- Challans ----------
class ChallanStatusIn(BaseModel):
    status: str  # paid | disputed


# ---------- Notifications ----------
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: Optional[str] = None
    ntype: str
    ref_id: Optional[str] = None
    read: bool
    created_at: datetime


# ---------- Admin CRUD ----------
class CameraIn(BaseModel):
    code: str = Field(..., max_length=40)
    name: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = None


class ZoneIn(BaseModel):
    name: str = Field(..., max_length=120)
    violation_type: str = Field(..., max_length=80)
    fine_amount: int = 500
    camera_id: Optional[int] = None
    coordinates: Optional[str] = None
    active: bool = True


# ---------- Predictions ----------
class HotspotOut(BaseModel):
    zone: str
    hour: int
    day_of_week: int  # 0=Mon ... 6=Sun
    count: int
    risk: float  # 0..1
    fine_amount: int


# ---------- GIS ----------
class GeoPoint(BaseModel):
    lat: float
    lng: float
    count: int  # reports at this point (cluster)
    violation_type: str
    source: str
