"""Curriculum management endpoints.

Lets students create AI-generated study plans, track topic progress,
and manage multi-week curricula tied to their courses.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from db import get_db
from models import Curriculum, CurriculumTopic
from rag_core.config import AzureSettings
from settings import Settings, get_settings
from utils.security import TokenValidationError, decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curriculum", tags=["Curriculum"])


def _get_current_email(authorization: str | None = Header(None)) -> str:
    """Extract the email from the JWT without full session validation.

    Keeps curriculum endpoints lightweight — the AuthGuard on the frontend
    already enforces login, and this just identifies the caller.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
    try:
        payload = decode_token(parts[1].strip())
    except TokenValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return email


# ── Pydantic schemas ─────────────────────────────────────────────────


class TopicOut(BaseModel):
    id: int
    order_index: int
    topic_name: str
    item_type: str
    subtopics: list[str]
    target_date: str | None
    estimated_hours: float | None
    status: str
    quiz_config: dict[str, Any] | None

    class Config:
        from_attributes = True


class CurriculumOut(BaseModel):
    id: int
    course_id: str
    title: str
    status: str
    progress_percent: float
    class_day: str | None
    class_start_time: str | None
    class_end_time: str | None
    created_at: str
    topics: list[TopicOut]

    class Config:
        from_attributes = True


class PlanRequest(BaseModel):
    course_id: str
    selected_topics: list[str] = Field(min_length=1)
    class_day: str | None = None
    class_start_time: str | None = None
    class_end_time: str | None = None


class PlanItem(BaseModel):
    item_type: str
    topic_name: str
    subtopics: list[str] = Field(default_factory=list)
    estimated_hours: float | None = None
    target_date: str | None = None
    quiz_config: dict[str, Any] | None = None
    order_index: int = 0


class CreateCurriculumRequest(BaseModel):
    course_id: str
    title: str
    plan_items: list[PlanItem]
    class_day: str | None = None
    class_start_time: str | None = None
    class_end_time: str | None = None


class TopicStatusUpdate(BaseModel):
    status: str = Field(pattern="^(not_started|in_progress|completed|skipped)$")


# ── Helpers ──────────────────────────────────────────────────────────


def _topic_to_dict(t: CurriculumTopic) -> TopicOut:
    subtopics: list[str] = []
    if t.subtopics:
        try:
            subtopics = json.loads(t.subtopics)
        except (json.JSONDecodeError, TypeError):
            subtopics = [t.subtopics]

    quiz_cfg: dict[str, Any] | None = None
    if t.quiz_config:
        try:
            quiz_cfg = json.loads(t.quiz_config)
        except (json.JSONDecodeError, TypeError):
            quiz_cfg = None

    return TopicOut(
        id=t.id,
        order_index=t.order_index,
        topic_name=t.topic_name,
        item_type=t.item_type or "study_session",
        subtopics=subtopics,
        target_date=t.target_date,
        estimated_hours=t.estimated_hours,
        status=t.status or "not_started",
        quiz_config=quiz_cfg,
    )


def _curriculum_to_dict(c: Curriculum) -> CurriculumOut:
    return CurriculumOut(
        id=c.id,
        course_id=c.course_id,
        title=c.title,
        status=c.status or "active",
        progress_percent=c.progress_percent or 0.0,
        class_day=c.class_day,
        class_start_time=c.class_start_time,
        class_end_time=c.class_end_time,
        created_at=c.created_at.isoformat() if c.created_at else "",
        topics=[_topic_to_dict(t) for t in c.topics],
    )


def _recompute_progress(curriculum: Curriculum) -> None:
    """Update progress_percent based on topic statuses."""
    total = len(curriculum.topics)
    if total == 0:
        curriculum.progress_percent = 0.0
        return
    completed = sum(1 for t in curriculum.topics if t.status == "completed")
    curriculum.progress_percent = round((completed / total) * 100, 1)


# ── Endpoints ────────────────────────────────────────────────────────


@router.get("", response_model=list[CurriculumOut])
async def list_curricula(
    email: str = Depends(_get_current_email),
    db: Session = Depends(get_db),
):
    """Return all curricula for the logged-in user."""
    stmt = (
        select(Curriculum)
        .options(joinedload(Curriculum.topics))
        .where(Curriculum.email == email)
        .order_by(Curriculum.created_at.desc())
    )
    curricula = db.execute(stmt).unique().scalars().all()
    return [_curriculum_to_dict(c) for c in curricula]


@router.get("/topics/{course_id}")
async def list_course_topics(
    course_id: str,
    app_settings: Settings = Depends(get_settings),
):
    """Extract available topics from a course's ingested materials."""
    from services.planner import extract_course_topics

    azure = AzureSettings()
    azure.validate()
    topics = extract_course_topics(course_id, app_settings, azure)
    return {"course_id": course_id, "topics": topics}


@router.post("/plan")
async def generate_plan(
    request: PlanRequest,
    app_settings: Settings = Depends(get_settings),
):
    """Generate an AI study plan for the selected topics (review before saving)."""
    from services.planner import generate_study_plan

    azure = AzureSettings()
    azure.validate()

    class_time = None
    if request.class_start_time and request.class_end_time:
        class_time = f"{request.class_start_time} - {request.class_end_time}"

    plan = generate_study_plan(
        course_id=request.course_id,
        topics=request.selected_topics,
        settings=app_settings,
        azure=azure,
        class_day=request.class_day,
        class_time=class_time,
    )

    if not plan:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate a study plan. Please try again.",
        )

    for item in plan:
        for key in ("subtopics", "quiz_config"):
            val = item.get(key)
            if isinstance(val, str):
                try:
                    item[key] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    item[key] = [] if key == "subtopics" else None

    return {"course_id": request.course_id, "plan": plan}


@router.post("", response_model=CurriculumOut, status_code=status.HTTP_201_CREATED)
async def create_curriculum(
    request: CreateCurriculumRequest,
    email: str = Depends(_get_current_email),
    db: Session = Depends(get_db),
):
    """Persist a reviewed study plan as a new curriculum."""
    curriculum = Curriculum(
        email=email,
        course_id=request.course_id,
        title=request.title,
        status="active",
        progress_percent=0.0,
        class_day=request.class_day,
        class_start_time=request.class_start_time,
        class_end_time=request.class_end_time,
    )
    db.add(curriculum)
    db.flush()

    for item in request.plan_items:
        subtopics_json = json.dumps(item.subtopics) if item.subtopics else None
        quiz_json = json.dumps(item.quiz_config) if item.quiz_config else None

        topic = CurriculumTopic(
            curriculum_id=curriculum.id,
            order_index=item.order_index,
            topic_name=item.topic_name,
            item_type=item.item_type,
            subtopics=subtopics_json,
            target_date=item.target_date,
            estimated_hours=item.estimated_hours,
            status="not_started",
            quiz_config=quiz_json,
        )
        db.add(topic)

    db.commit()
    db.refresh(curriculum)

    stmt = (
        select(Curriculum)
        .options(joinedload(Curriculum.topics))
        .where(Curriculum.id == curriculum.id)
    )
    curriculum = db.execute(stmt).unique().scalar_one()
    return _curriculum_to_dict(curriculum)


@router.patch("/{curriculum_id}/topics/{topic_id}", response_model=CurriculumOut)
async def update_topic_status(
    curriculum_id: int,
    topic_id: int,
    body: TopicStatusUpdate,
    email: str = Depends(_get_current_email),
    db: Session = Depends(get_db),
):
    """Update a topic's status and recompute curriculum progress."""
    stmt = (
        select(Curriculum)
        .options(joinedload(Curriculum.topics))
        .where(Curriculum.id == curriculum_id, Curriculum.email == email)
    )
    curriculum = db.execute(stmt).unique().scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")

    topic = next((t for t in curriculum.topics if t.id == topic_id), None)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic.status = body.status
    _recompute_progress(curriculum)

    if curriculum.progress_percent >= 100.0:
        curriculum.status = "completed"

    db.commit()
    db.refresh(curriculum)

    stmt = (
        select(Curriculum)
        .options(joinedload(Curriculum.topics))
        .where(Curriculum.id == curriculum.id)
    )
    curriculum = db.execute(stmt).unique().scalar_one()
    return _curriculum_to_dict(curriculum)


@router.delete("/{curriculum_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_curriculum(
    curriculum_id: int,
    email: str = Depends(_get_current_email),
    db: Session = Depends(get_db),
):
    """Delete a curriculum and all its topics."""
    stmt = select(Curriculum).where(
        Curriculum.id == curriculum_id,
        Curriculum.email == email,
    )
    curriculum = db.execute(stmt).scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")

    db.delete(curriculum)
    db.commit()
