"""Pydantic schemas for auth/session endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

RoleLiteral = Literal["student", "professor"]


class LoginRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class MessageResponse(BaseModel):
    message: str


class VerifyOtpResponse(BaseModel):
    token: str
    session_id: str
    expiry: datetime
    extension_count: int
    role: RoleLiteral
    email: EmailStr


class SessionDetails(BaseModel):
    session_id: str
    expiry: datetime
    extension_count: int
    extension_session_expiry: datetime | None
    last_activity: datetime
    email: EmailStr
    role: RoleLiteral


class RegisterRequestCreate(BaseModel):
    email: EmailStr
    division: str | None = None
    role: RoleLiteral


class RegisterRequestDecision(BaseModel):
    request_id: int
    approve: bool


class SessionExtensionResponse(BaseModel):
    token: str
    session_id: str
    expiry: datetime
    extension_count: int
