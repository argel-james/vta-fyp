"""SQLAlchemy models for authentication, sessions, analytics, and curricula."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

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


class QueryLog(Base):
    """Tracks every student query for analytics."""
    __tablename__ = "query_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    course_id = Column(String(120), nullable=False, index=True)
    question = Column(Text, nullable=False)
    persona = Column(String(30), nullable=True)
    topic_tag = Column(String(255), nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))


class EventLog(Base):
    """Generic event tracking for lessons, quizzes, engagement analytics."""
    __tablename__ = "event_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    course_id = Column(String(120), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True)
    topic = Column(String(255), nullable=True, index=True)
    quiz_id = Column(String(120), nullable=True)
    question_index = Column(Integer, nullable=True)
    score = Column(Float, nullable=True)
    total = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))


class Curriculum(Base):
    __tablename__ = "curriculum"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    course_id = Column(String(120), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(
        Enum("active", "completed", "archived", name="curriculum_status"),
        default="active",
    )
    progress_percent = Column(Float, default=0.0)
    class_day = Column(String(20), nullable=True)
    class_start_time = Column(String(10), nullable=True)
    class_end_time = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))

    topics = relationship(
        "CurriculumTopic",
        back_populates="curriculum",
        cascade="all, delete-orphan",
        order_by="CurriculumTopic.order_index",
    )


class CurriculumTopic(Base):
    __tablename__ = "curriculum_topic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_id = Column(Integer, ForeignKey("curriculum.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)
    topic_name = Column(String(255), nullable=False)
    item_type = Column(
        Enum("study_session", "quiz", name="plan_item_type"),
        default="study_session",
    )
    subtopics = Column(Text, nullable=True)
    target_date = Column(String(30), nullable=True)
    estimated_hours = Column(Float, nullable=True)
    status = Column(
        Enum("not_started", "in_progress", "completed", "skipped", name="topic_status"),
        default="not_started",
    )
    quiz_config = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(tz))

    curriculum = relationship("Curriculum", back_populates="topics")