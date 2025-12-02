"""SQLAlchemy models for authentication/session management."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String

from db import Base
from settings import get_settings

settings = get_settings()
tz = ZoneInfo(settings.timezone)


class UserInfo(Base):
    __tablename__ = "user_info"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(Enum("student", "professor", name="user_role"), nullable=False)
    division = Column(String(120), nullable=True)
    is_active = Column(Boolean, default=True)
    otp_hash = Column(String(128), nullable=True)
    otp_timestamp = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))


class RegisterRequest(Base):
    __tablename__ = "register"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    division = Column(String(120), nullable=True)
    role = Column(Enum("student", "professor", name="register_role"), nullable=False)
    status = Column(Enum("pending", "approved", "rejected", name="register_status"), default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))


class Session(Base):
    __tablename__ = "session"

    id = Column(String(64), primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False)
    expiry = Column(DateTime(timezone=True), nullable=False)
    extension_count = Column(Integer, default=0)
    extension_session_expiry = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)


class SessionBlacklist(Base):
    __tablename__ = "session_blacklist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_hash = Column(String(64), unique=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))