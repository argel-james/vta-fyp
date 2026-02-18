"""Authentication and session management endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models import Session as SessionModel, UserInfo
from repositories import (
    add_session_blacklist,
    clear_user_otp,
    create_or_update_user_otp,
    create_register_request,
    create_session,
    deactivate_session,
    get_register_request_by_email,
    get_session_by_id,
    get_user_by_email,
    is_token_blacklisted,
)
from schemas import (
    LoginRequest,
    MessageResponse,
    RegisterRequestCreate,
    SessionDetails,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from settings import get_settings
from utils.email_client import send_otp_email
from utils.otp import generate_otp, hash_otp, otp_is_valid
from utils.security import (
    create_session_token,
    decode_token,
    hash_value,
    new_session_id,
    timezone_now,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@dataclass
class AuthenticatedSession:
    token: str
    token_hash: str
    user: UserInfo
    session: SessionModel


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _extract_token(header_value: str | None) -> str:
    if not header_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    parts = header_value.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    token = parts[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization token")
    return token


def _ensure_aware(dt: datetime) -> datetime:
    tzinfo = timezone_now().tzinfo
    return dt if dt.tzinfo else dt.replace(tzinfo=tzinfo)


def _get_authenticated_session(
    db: Session,
    authorization: str | None,
) -> AuthenticatedSession:
    token = _extract_token(authorization)
    payload = decode_token(token)
    session_id = payload.get("sid")
    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    session = get_session_by_id(db, session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    expiry = _ensure_aware(session.expiry)
    if expiry < timezone_now():
        deactivate_session(db, session)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    token_hash = hash_value(token)
    if is_token_blacklisted(db, token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")

    email = payload.get("sub")
    user = get_user_by_email(db, email) if email else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")

    return AuthenticatedSession(token=token, token_hash=token_hash, user=user, session=session)


@router.post("/otp/request", response_model=MessageResponse)
def request_otp(payload: LoginRequest, db: Session = Depends(get_db)) -> MessageResponse:
    email = _normalize_email(payload.email)
    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found. Please register.")

    otp_code = generate_otp()
    create_or_update_user_otp(db, user=user, otp_hash=hash_otp(otp_code))

    try:
        send_otp_email(user.email, otp_code)
    except RuntimeError as exc:  # pragma: no cover - depends on email service
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return MessageResponse(message="Verification code sent to your email.")


@router.post("/otp/verify", response_model=VerifyOtpResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)) -> VerifyOtpResponse:
    email = _normalize_email(payload.email)
    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found. Please register.")

    if not otp_is_valid(stored_hash=user.otp_hash, stored_timestamp=user.otp_timestamp, provided_code=payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")

    clear_user_otp(db, user)

    session_id = new_session_id()
    token, expiry = create_session_token(
        email=user.email,
        role=user.role,
        session_id=session_id,
        duration_minutes=settings.session_duration_minutes,
    )
    create_session(db, session_id=session_id, email=user.email, token_hash=hash_value(token), expiry=expiry)

    return VerifyOtpResponse(
        token=token,
        session_id=session_id,
        expiry=expiry,
        extension_count=0,
        role=user.role,
        email=user.email,
    )


@router.post("/register", response_model=MessageResponse)
def request_registration(payload: RegisterRequestCreate, db: Session = Depends(get_db)) -> MessageResponse:
    email = _normalize_email(payload.email)
    if get_user_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already exists.")

    existing_request = get_register_request_by_email(db, email)
    if existing_request and existing_request.status == "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration request already pending.")

    create_register_request(db, email=email, role=payload.role, division=payload.division)
    return MessageResponse(message="Registration request submitted. A professor will review it soon.")


TokenHeader = Annotated[str | None, Header(alias="Authorization")]


@router.get("/session", response_model=SessionDetails)
def session_details(
    authorization: TokenHeader = None,
    db: Session = Depends(get_db),
) -> SessionDetails:
    context = _get_authenticated_session(db, authorization)
    session = context.session
    user = context.user
    return SessionDetails(
        session_id=session.id,
        expiry=session.expiry,
        extension_count=session.extension_count,
        extension_session_expiry=session.extension_session_expiry,
        last_activity=session.last_activity,
        email=user.email,
        role=user.role,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    authorization: TokenHeader = None,
    db: Session = Depends(get_db),
) -> MessageResponse:
    context = _get_authenticated_session(db, authorization)
    add_session_blacklist(db, context.token_hash)
    deactivate_session(db, context.session)
    return MessageResponse(message="Logged out successfully.")