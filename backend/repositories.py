"""Repository helpers for interacting with auth/session tables."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import RegisterRequest, Session as SessionModel, SessionBlacklist, UserInfo
from utils.security import timezone_now


def get_user_by_email(db: Session, email: str) -> UserInfo | None:
    return db.execute(select(UserInfo).where(UserInfo.email == email)).scalar_one_or_none()


def create_or_update_user_otp(db: Session, *, user: UserInfo, otp_hash: str) -> None:
    user.otp_hash = otp_hash
    user.otp_timestamp = timezone_now()
    db.add(user)
    db.commit()
    db.refresh(user)


def clear_user_otp(db: Session, user: UserInfo) -> None:
    user.otp_hash = None
    user.otp_timestamp = None
    db.add(user)
    db.commit()


def create_register_request(db: Session, *, email: str, role: str, division: str | None) -> RegisterRequest:
    request = RegisterRequest(email=email, role=role, division=division or "")
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def get_register_request_by_email(db: Session, email: str) -> RegisterRequest | None:
    return db.execute(select(RegisterRequest).where(RegisterRequest.email == email)).scalar_one_or_none()


def create_session(
    db: Session,
    *,
    session_id: str,
    email: str,
    token_hash: str,
    expiry: datetime,
) -> SessionModel:
    session = SessionModel(
        id=session_id,
        email=email,
        token_hash=token_hash,
        expiry=expiry,
        extension_count=0,
        last_activity=timezone_now(),
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_id(db: Session, session_id: str) -> SessionModel | None:
    return db.execute(select(SessionModel).where(SessionModel.id == session_id)).scalar_one_or_none()


def update_session_activity(db: Session, session: SessionModel) -> SessionModel:
    session.last_activity = timezone_now()
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def deactivate_session(db: Session, session: SessionModel) -> None:
    session.is_active = False
    db.add(session)
    db.commit()


def add_session_blacklist(db: Session, token_hash: str) -> None:
    record = SessionBlacklist(token_hash=token_hash)
    db.add(record)
    db.commit()


def is_token_blacklisted(db: Session, token_hash: str) -> bool:
    return (
        db.execute(select(SessionBlacklist).where(SessionBlacklist.token_hash == token_hash)).scalar_one_or_none()
        is not None
    )


def list_register_requests(db: Session, status_filter: str | None = None) -> list[RegisterRequest]:
    stmt = select(RegisterRequest).order_by(RegisterRequest.created_at.desc())
    if status_filter:
        stmt = stmt.where(RegisterRequest.status == status_filter)
    return list(db.execute(stmt).scalars().all())


def get_register_request_by_id(db: Session, request_id: int) -> RegisterRequest | None:
    return db.execute(select(RegisterRequest).where(RegisterRequest.id == request_id)).scalar_one_or_none()


def approve_register_request(db: Session, reg: RegisterRequest) -> UserInfo:
    reg.status = "approved"
    db.add(reg)

    user = UserInfo(email=reg.email, role=reg.role, division=reg.division, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def reject_register_request(db: Session, reg: RegisterRequest) -> None:
    reg.status = "rejected"
    db.add(reg)
    db.commit()