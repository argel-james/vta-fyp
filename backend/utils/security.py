"""Security helpers for token and sensitive data management."""
from __future__ import annotations

from datetime import datetime, timedelta
from hashlib import sha256
from typing import Any, Dict, Tuple
from uuid import uuid4
from zoneinfo import ZoneInfo

from jose import JWTError, jwt

from settings import get_settings

settings = get_settings()
tz = ZoneInfo(settings.timezone)
ALGORITHM = "HS256"


class TokenValidationError(Exception):
    """Raised when a JWT cannot be validated."""


def timezone_now() -> datetime:
    return datetime.now(tz)


def hash_value(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def new_session_id() -> str:
    return uuid4().hex


def create_session_token(*, email: str, role: str, session_id: str, duration_minutes: int) -> Tuple[str, datetime]:
    issued_at = timezone_now()
    expires_at = issued_at + timedelta(minutes=duration_minutes)
    payload: Dict[str, Any] = {
        "sub": email,
        "role": role,
        "sid": session_id,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, expires_at


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:  # pragma: no cover - defensive guard
        raise TokenValidationError("Invalid token") from exc