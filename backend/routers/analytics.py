"""Comprehensive analytics endpoints for professors."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from db import get_db
from models import EventLog, QueryLog, UserInfo
from settings import get_settings

settings = get_settings()
tz = ZoneInfo(settings.timezone)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# --------------- Schemas ---------------

class EventCreate(BaseModel):
    email: str
    course_id: str
    event_type: str
    topic: Optional[str] = None
    quiz_id: Optional[str] = None
    question_index: Optional[int] = None
    score: Optional[float] = None
    total: Optional[int] = None
    duration_seconds: Optional[float] = None
    detail: Optional[str] = None


class QueryLogCreate(BaseModel):
    email: str
    course_id: str
    question: str
    persona: Optional[str] = None
    topic_tag: Optional[str] = None
    confidence: Optional[float] = None


# --------------- Event Logging ---------------

@router.post("/event")
async def log_event(payload: EventCreate, db: DBSession = Depends(get_db)):
    entry = EventLog(
        email=payload.email,
        course_id=payload.course_id,
        event_type=payload.event_type,
        topic=payload.topic,
        quiz_id=payload.quiz_id,
        question_index=payload.question_index,
        score=payload.score,
        total=payload.total,
        duration_seconds=payload.duration_seconds,
        detail=payload.detail,
    )
    db.add(entry)
    db.commit()
    return {"status": "logged"}


@router.post("/log")
async def log_query(payload: QueryLogCreate, db: DBSession = Depends(get_db)):
    entry = QueryLog(
        email=payload.email,
        course_id=payload.course_id,
        question=payload.question,
        persona=payload.persona,
        topic_tag=payload.topic_tag,
        confidence=payload.confidence,
    )
    db.add(entry)
    db.commit()
    return {"status": "logged"}


# --------------- Overview Dashboard ---------------

@router.get("/overview")
async def get_overview(
    course_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    q_filter = QueryLog.created_at >= cutoff
    e_filter = EventLog.created_at >= cutoff
    if course_id:
        q_filter = (QueryLog.course_id == course_id) & q_filter
        e_filter = (EventLog.course_id == course_id) & e_filter

    queries = db.query(QueryLog).filter(q_filter).all()
    events = db.query(EventLog).filter(e_filter).all()

    active_emails = {r.email for r in queries} | {r.email for r in events}

    if course_id:
        total_students = len(active_emails)
    else:
        all_students = db.query(UserInfo).filter(UserInfo.role == "student", UserInfo.is_active == True).all()  # noqa: E712
        total_students = len(all_students)
    active_students = len(active_emails)

    quiz_events = [e for e in events if e.event_type == "quiz_completed" and e.score is not None and e.total]
    avg_score = 0.0
    if quiz_events:
        avg_score = round(sum(e.score / e.total * 100 for e in quiz_events) / len(quiz_events), 1)

    topic_fail: Counter[str] = Counter()
    topic_total: Counter[str] = Counter()
    for e in events:
        if e.event_type == "answer_result" and e.topic:
            topic_total[e.topic] += 1
            if e.detail == "incorrect":
                topic_fail[e.topic] += 1

    hardest_topic = None
    if topic_fail:
        hardest_topic = topic_fail.most_common(1)[0][0]

    at_risk = _compute_at_risk(queries, events, cutoff)

    course_counter: Counter[str] = Counter()
    for r in queries:
        course_counter[r.course_id] += 1
    courses = [
        {"course_id": cid, "query_count": cnt}
        for cid, cnt in course_counter.most_common()
    ]

    return {
        "total_students": total_students,
        "active_students": active_students,
        "at_risk_students": len(at_risk),
        "average_score": avg_score,
        "hardest_topic": hardest_topic,
        "total_queries": len(queries),
        "total_events": len(events),
        "period_days": days,
        "courses": courses,
    }


# --------------- Student Analytics ---------------

@router.get("/students")
async def get_student_analytics(
    course_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    q_filter = QueryLog.created_at >= cutoff
    e_filter = EventLog.created_at >= cutoff
    if course_id:
        q_filter = (QueryLog.course_id == course_id) & q_filter
        e_filter = (EventLog.course_id == course_id) & e_filter

    queries = db.query(QueryLog).filter(q_filter).all()
    events = db.query(EventLog).filter(e_filter).all()

    student_data: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "queries": 0, "quizzes": 0, "avg_score": 0.0,
        "total_score": 0.0, "total_quizzes": 0,
        "failed_topics": Counter(), "last_active": None,
        "events": 0,
    })

    for r in queries:
        sd = student_data[r.email]
        sd["queries"] += 1
        if r.created_at:
            if sd["last_active"] is None or r.created_at > sd["last_active"]:
                sd["last_active"] = r.created_at

    for e in events:
        sd = student_data[e.email]
        sd["events"] += 1
        if e.event_type == "quiz_completed" and e.score is not None and e.total:
            sd["total_score"] += e.score / e.total * 100
            sd["total_quizzes"] += 1
        if e.event_type == "answer_result" and e.topic and e.detail == "incorrect":
            sd["failed_topics"][e.topic] += 1
        if e.created_at:
            if sd["last_active"] is None or e.created_at > sd["last_active"]:
                sd["last_active"] = e.created_at

    results = []
    for email, sd in student_data.items():
        avg = round(sd["total_score"] / sd["total_quizzes"], 1) if sd["total_quizzes"] else None
        weak_topics = [t for t, _ in sd["failed_topics"].most_common(3)]
        _la = sd["last_active"]
        if _la and _la.tzinfo is None:
            _la = _la.replace(tzinfo=tz)
        inactive_days = (datetime.now(tz) - _la).days if _la else None

        risk = "low"
        if avg is not None and avg < 50:
            risk = "high"
        elif inactive_days is not None and inactive_days > 7:
            risk = "medium"

        results.append({
            "email": email,
            "total_queries": sd["queries"],
            "total_events": sd["events"],
            "quiz_count": sd["total_quizzes"],
            "avg_score": avg,
            "weak_topics": weak_topics,
            "last_active": sd["last_active"].isoformat() if sd["last_active"] else None,
            "inactive_days": inactive_days,
            "risk_level": risk,
        })

    results.sort(key=lambda x: x.get("avg_score") or 999)
    return {"students": results, "total": len(results)}


# --------------- Topic Analytics ---------------

@router.get("/topics")
async def get_topic_analytics(
    course_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    e_filter = EventLog.created_at >= cutoff
    q_filter = QueryLog.created_at >= cutoff
    if course_id:
        e_filter = (EventLog.course_id == course_id) & e_filter
        q_filter = (QueryLog.course_id == course_id) & q_filter

    events = db.query(EventLog).filter(e_filter).all()
    queries = db.query(QueryLog).filter(q_filter).all()

    topic_stats: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "correct": 0, "incorrect": 0, "total_attempts": 0,
        "total_score": 0.0, "quiz_count": 0, "query_count": 0,
        "total_duration": 0.0, "students": set(),
    })

    for e in events:
        topic = e.topic or "uncategorized"
        ts = topic_stats[topic]
        ts["students"].add(e.email)
        if e.event_type == "answer_result":
            ts["total_attempts"] += 1
            if e.detail == "correct":
                ts["correct"] += 1
            else:
                ts["incorrect"] += 1
        if e.event_type == "quiz_completed" and e.score is not None and e.total:
            ts["total_score"] += e.score / e.total * 100
            ts["quiz_count"] += 1
        if e.duration_seconds:
            ts["total_duration"] += e.duration_seconds

    for r in queries:
        tag = r.topic_tag or "uncategorized"
        topic_stats[tag]["query_count"] += 1

    results = []
    for topic, ts in topic_stats.items():
        total_att = ts["total_attempts"] or 1
        results.append({
            "topic": topic,
            "total_attempts": ts["total_attempts"],
            "correct": ts["correct"],
            "incorrect": ts["incorrect"],
            "failure_rate": round(ts["incorrect"] / total_att * 100, 1) if ts["total_attempts"] else 0,
            "avg_score": round(ts["total_score"] / ts["quiz_count"], 1) if ts["quiz_count"] else None,
            "avg_duration_s": round(ts["total_duration"] / max(ts["total_attempts"], 1), 1),
            "unique_students": len(ts["students"]),
            "query_count": ts["query_count"],
        })

    results.sort(key=lambda x: x["failure_rate"], reverse=True)
    return {"topics": results}


# --------------- Assessment Analytics ---------------

@router.get("/assessments")
async def get_assessment_analytics(
    course_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    e_filter = EventLog.created_at >= cutoff
    if course_id:
        e_filter = (EventLog.course_id == course_id) & e_filter

    events = db.query(EventLog).filter(e_filter).all()

    quiz_data: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "attempts": 0, "total_score": 0.0, "scores": [],
        "total_duration": 0.0, "questions": defaultdict(lambda: {"correct": 0, "incorrect": 0, "skipped": 0}),
    })

    for e in events:
        qid = e.quiz_id or "general"
        qd = quiz_data[qid]

        if e.event_type == "quiz_completed" and e.score is not None and e.total:
            qd["attempts"] += 1
            pct = e.score / e.total * 100
            qd["total_score"] += pct
            qd["scores"].append(pct)
            if e.duration_seconds:
                qd["total_duration"] += e.duration_seconds

        if e.event_type == "answer_result" and e.question_index is not None:
            q = qd["questions"][e.question_index]
            if e.detail == "correct":
                q["correct"] += 1
            elif e.detail == "skipped":
                q["skipped"] += 1
            else:
                q["incorrect"] += 1

    results = []
    for qid, qd in quiz_data.items():
        avg = round(qd["total_score"] / qd["attempts"], 1) if qd["attempts"] else 0
        avg_time = round(qd["total_duration"] / qd["attempts"], 1) if qd["attempts"] else 0

        hardest_q = None
        questions_detail = []
        for qi, qs in sorted(qd["questions"].items()):
            total_q = qs["correct"] + qs["incorrect"] + qs["skipped"]
            fail_pct = round(qs["incorrect"] / total_q * 100, 1) if total_q else 0
            questions_detail.append({
                "question_index": qi, "correct": qs["correct"],
                "incorrect": qs["incorrect"], "skipped": qs["skipped"],
                "failure_rate": fail_pct,
            })
            if hardest_q is None or fail_pct > hardest_q["failure_rate"]:
                hardest_q = questions_detail[-1]

        results.append({
            "quiz_id": qid, "attempts": qd["attempts"],
            "avg_score": avg, "avg_duration_s": avg_time,
            "hardest_question": hardest_q, "questions": questions_detail,
        })

    return {"assessments": results}


# --------------- Engagement Analytics ---------------

@router.get("/engagement")
async def get_engagement_analytics(
    course_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    e_filter = EventLog.created_at >= cutoff
    q_filter = QueryLog.created_at >= cutoff
    if course_id:
        e_filter = (EventLog.course_id == course_id) & e_filter
        q_filter = (QueryLog.course_id == course_id) & q_filter

    events = db.query(EventLog).filter(e_filter).all()
    queries = db.query(QueryLog).filter(q_filter).all()

    daily_active: dict[str, set[str]] = defaultdict(set)
    weekly_active: dict[str, set[str]] = defaultdict(set)

    for item in list(events) + list(queries):
        if not item.created_at:
            continue
        day = item.created_at.strftime("%Y-%m-%d")
        week = item.created_at.strftime("%Y-W%W")
        daily_active[day].add(item.email)
        weekly_active[week].add(item.email)

    dau = {d: len(s) for d, s in sorted(daily_active.items())}
    wau = {w: len(s) for w, s in sorted(weekly_active.items())}

    session_types = ("quiz_started", "lesson_opened")
    session_events = [e for e in events if e.event_type in session_types]
    total_duration = sum(e.duration_seconds for e in session_events if e.duration_seconds)
    avg_session = round(total_duration / len(session_events), 1) if session_events else 0

    event_funnel: Counter[str] = Counter()
    for e in events:
        event_funnel[e.event_type] += 1

    funnel = [
        {"step": "lesson_opened", "count": event_funnel.get("lesson_opened", 0)},
        {"step": "quiz_started", "count": event_funnel.get("quiz_started", 0)},
        {"step": "quiz_completed", "count": event_funnel.get("quiz_completed", 0)},
    ]

    return {
        "dau": dau,
        "wau": wau,
        "avg_session_duration_s": avg_session,
        "total_events": len(events),
        "total_queries": len(queries),
        "funnel": funnel,
        "event_counts": dict(event_funnel),
    }


# --------------- Alerts / At-Risk ---------------

@router.get("/alerts")
async def get_alerts(
    course_id: Optional[str] = None,
    days: int = Query(14, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    q_filter = QueryLog.created_at >= cutoff
    e_filter = EventLog.created_at >= cutoff
    if course_id:
        q_filter = (QueryLog.course_id == course_id) & q_filter
        e_filter = (EventLog.course_id == course_id) & e_filter

    queries = db.query(QueryLog).filter(q_filter).all()
    events = db.query(EventLog).filter(e_filter).all()

    at_risk = _compute_at_risk(queries, events, cutoff)
    return {"at_risk_students": at_risk, "period_days": days}


# --------------- Course-Level (backward compat) ---------------

@router.get("/course/{course_id}")
async def get_course_analytics(
    course_id: str,
    days: int = Query(30, ge=1, le=365),
    db: DBSession = Depends(get_db),
):
    cutoff = datetime.now(tz) - timedelta(days=days)

    rows = db.query(QueryLog).filter(
        QueryLog.course_id == course_id, QueryLog.created_at >= cutoff
    ).all()

    total = len(rows)
    unique_emails = {r.email for r in rows}

    topic_counter: Counter[str] = Counter()
    daily_counter: Counter[str] = Counter()
    for r in rows:
        tag = r.topic_tag or "uncategorized"
        topic_counter[tag] += 1
        day_key = r.created_at.strftime("%Y-%m-%d") if r.created_at else "unknown"
        daily_counter[day_key] += 1

    top_topics = [
        {"topic": t, "count": c, "percentage": round(c / total * 100, 1) if total else 0}
        for t, c in topic_counter.most_common(10)
    ]

    return {
        "course_id": course_id,
        "total_queries": total,
        "unique_students": len(unique_emails),
        "top_topics": top_topics,
        "queries_by_day": dict(daily_counter),
    }


# --------------- Helpers ---------------

def _compute_at_risk(queries, events, cutoff) -> list[dict]:
    """Identify students who may be struggling."""
    student_info: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "last_active": None, "low_scores": 0, "quiz_count": 0, "reasons": [],
    })

    for r in queries:
        si = student_info[r.email]
        if r.created_at and (si["last_active"] is None or r.created_at > si["last_active"]):
            si["last_active"] = r.created_at

    for e in events:
        si = student_info[e.email]
        if e.created_at and (si["last_active"] is None or e.created_at > si["last_active"]):
            si["last_active"] = e.created_at
        if e.event_type == "quiz_completed" and e.score is not None and e.total:
            si["quiz_count"] += 1
            if e.score / e.total < 0.5:
                si["low_scores"] += 1

    now = datetime.now(tz)
    results = []
    for email, si in student_info.items():
        reasons = []
        last = si["last_active"]
        if last:
            if last.tzinfo is None:
                last = last.replace(tzinfo=tz)
            if (now - last).days > 7:
                reasons.append("inactive")
        if si["low_scores"] >= 2:
            reasons.append("repeated_low_scores")
        if si["quiz_count"] == 0:
            reasons.append("no_quizzes_taken")

        if reasons:
            results.append({
                "email": email,
                "reasons": reasons,
                "last_active": si["last_active"].isoformat() if si["last_active"] else None,
                "quiz_count": si["quiz_count"],
                "low_score_count": si["low_scores"],
            })

    return results
