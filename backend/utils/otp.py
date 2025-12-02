"""Helpers for generating and validating one-time passwords."""
from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from settings import get_settings
from utils.security import hash_value, timezone_now

settings = get_settings()
tz = ZoneInfo(settings.timezone)
_DIGITS = string.digits


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(_DIGITS) for _ in range(length))


def compute_expiry(issued_at: datetime | None = None) -> datetime:
    base = issued_at or timezone_now()
    return base + timedelta(minutes=settings.otp_expire_minutes)


def hash_otp(otp: str) -> str:
    return hash_value(otp)


def otp_is_valid(*, stored_hash: str | None, stored_timestamp: datetime | None, provided_code: str) -> bool:
    if not stored_hash or not stored_timestamp:
        return False
    timestamp = stored_timestamp if stored_timestamp.tzinfo else stored_timestamp.replace(tzinfo=tz)
    if timestamp + timedelta(minutes=settings.otp_expire_minutes) < timezone_now():
        return False
    return stored_hash == hash_otp(provided_code)