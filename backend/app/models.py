from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(100), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), nullable=False, default="citizen")  # citizen | authority
    badge_id = Column(String(30), nullable=True)  # officer badge number (authority only)
    assigned_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    area = Column(String(120), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("Report", back_populates="reporter", foreign_keys="Report.user_id")
    assigned_zone = relationship("Zone", foreign_keys=[assigned_zone_id])


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    violation_type = Column(String(80), nullable=False)  # e.g. "No-Parking Zone"
    fine_amount = Column(Integer, nullable=False, default=500)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    # Simplified polygon: JSON-ish comma-separated "lat,lng;lat,lng;..."
    coordinates = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", back_populates="zones")


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True)
    code = Column(String(40), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=True)
    location = Column(String(200), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    rtsp_url = Column(String(300), nullable=True)
    status = Column(String(20), default="online")  # online | offline | maintenance
    created_at = Column(DateTime, default=datetime.utcnow)

    zones = relationship("Zone", back_populates="camera")


class Report(Base):
    """A citizen-submitted violation report (or auto-detected candidate)."""

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    public_id = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    plate = Column(String(20), nullable=False, index=True)
    vehicle_type = Column(String(30), nullable=True)
    vehicle_color = Column(String(30), nullable=True)
    violation_type = Column(String(80), nullable=False)
    status = Column(String(30), nullable=False, default="submitted")
    # submitted | under-review | verified | challan-issued | rejected | auto-detected
    location = Column(String(200), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    source = Column(String(20), default="citizen")  # citizen | camera
    fine_amount = Column(Integer, nullable=True)
    evidence = Column(Text, nullable=True)  # comma-separated file paths/URLs
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow, index=True)
    duration_min = Column(Integer, nullable=True)  # for camera detections

    reporter = relationship("User", back_populates="reports", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class Challan(Base):
    __tablename__ = "challans"

    id = Column(Integer, primary_key=True)
    public_id = Column(String(30), unique=True, nullable=False, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending | paid | disputed
    vehicle_plate = Column(String(20), nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    report = relationship("Report")


class ReviewAction(Base):
    """Officer confirm/reject actions — the labeled data that trains the GBM later."""

    __tablename__ = "review_actions"

    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)  # confirmed | rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report")


class RefreshToken(Base):
    """Revocable refresh token for silent re-authentication."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Notification(Base):
    """User-facing notification (report status updates, challan events)."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    body = Column(Text, nullable=True)
    ntype = Column(String(30), default="report")  # report | challan | system
    ref_id = Column(String(30), nullable=True)  # e.g. RPT-123456 / CHL-123456
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")
