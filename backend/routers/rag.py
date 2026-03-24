from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from rag_core.chain import build_rag_chain, answer_question
from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever
from settings import Settings, get_settings as get_app_settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/rag",
    tags=["RAG - Question Answering"]
)


class HistoryMessage(BaseModel):
    role: str
    content: str


class QuestionRequest(BaseModel):
    question: str
    course_id: str = "sc2107"
    persona: str = Field(default="standard", pattern="^(standard|advocate|joker|socratic)$")
    learning_level: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")
    history: Optional[List[HistoryMessage]] = None

class QuestionResponse(BaseModel):
    answer: str
    sources: List[dict]
    course_id: str

class CourseListResponse(BaseModel):
    courses: List[str]

class CourseInfo(BaseModel):
    course_id: str
    name: str
    document_count: int
    index_path: str

@dataclass(frozen=True)
class RagComponents:
    chain: Any
    retriever: Any
    index_path: Path


_rag_cache: dict[str, RagComponents] = {}
_cache_lock = Lock()


@lru_cache(maxsize=1)
def get_azure_settings() -> AzureSettings:
    settings = AzureSettings()
    settings.validate()
    return settings


def _build_rag_components(course_id: str, app_settings: Settings) -> RagComponents:
    from utils.blob_storage import download_index

    azure_settings = get_azure_settings()
    index_path = app_settings.index_dir / course_id

    if not index_path.exists():
        download_index(course_id)

    if not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Index for course '{course_id}' not found at {index_path}",
        )

    try:
        retriever = load_retriever(index_path, azure_settings)
        chain = build_rag_chain(retriever, azure_settings)
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to initialise RAG components", extra={"course_id": course_id})
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load RAG components: {exc}",
        ) from exc

    logger.info("RAG components initialised", extra={"course_id": course_id, "index_path": str(index_path)})
    return RagComponents(chain=chain, retriever=retriever, index_path=index_path)


def _get_rag_components(course_id: str, app_settings: Settings) -> RagComponents:
    with _cache_lock:
        cached = _rag_cache.get(course_id)
    if cached:
        return cached

    components = _build_rag_components(course_id, app_settings)
    with _cache_lock:
        _rag_cache[course_id] = components
    return components


def _evict_course(course_id: str) -> bool:
    with _cache_lock:
        return _rag_cache.pop(course_id, None) is not None
    
class EvalResponse(BaseModel):
    answer: str
    sources: List[dict]
    chunks: List[dict]
    course_id: str


@router.post("/eval", response_model=EvalResponse)
async def eval_question_endpoint(
    request: QuestionRequest,
    app_settings: Settings = Depends(get_app_settings),
):
    """Evaluation-only endpoint that returns raw retrieved chunks for manual scoring."""
    try:
        rag_components = _get_rag_components(request.course_id, app_settings)
        azure_settings = get_azure_settings()

        history_dicts = (
            [{"role": m.role, "content": m.content} for m in request.history]
            if request.history
            else None
        )

        result = answer_question(
            rag_components.chain,
            rag_components.retriever,
            request.question,
            persona=request.persona,
            learning_level=request.learning_level,
            history=history_dicts,
            settings=azure_settings,
        )

        sources = [
            {"file": s.file, "page": s.page}
            for s in result.sources
        ] if result.sources else []

        chunks = [
            {
                "content": c.content,
                "file": c.file,
                "page": c.page,
                "metadata": c.metadata,
            }
            for c in result.chunks
        ]

        return EvalResponse(
            answer=result.text,
            sources=sources,
            chunks=chunks,
            course_id=request.course_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("RAG eval failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", response_model=QuestionResponse)
async def ask_question_endpoint(
    request: QuestionRequest,
    app_settings: Settings = Depends(get_app_settings),
):
    """Ask a question with persona-aware, level-adapted RAG."""
    try:
        rag_components = _get_rag_components(request.course_id, app_settings)
        azure_settings = get_azure_settings()

        history_dicts = (
            [{"role": m.role, "content": m.content} for m in request.history]
            if request.history
            else None
        )

        result = answer_question(
            rag_components.chain,
            rag_components.retriever,
            request.question,
            persona=request.persona,
            learning_level=request.learning_level,
            history=history_dicts,
            settings=azure_settings,
        )

        sources = [
            {"file": s.file, "page": s.page, "content": getattr(s, "content", None)}
            for s in result.sources
        ] if result.sources else []

        return QuestionResponse(
            answer=result.text,
            sources=sources,
            course_id=request.course_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("RAG ask failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses", response_model=CourseListResponse)
async def list_courses(app_settings: Settings = Depends(get_app_settings)):
    """List all available courses with RAG indices."""
    from utils.blob_storage import list_blob_courses

    index_dir = app_settings.index_dir
    local_courses: set[str] = set()
    if index_dir.exists():
        local_courses = {d.name for d in index_dir.iterdir() if d.is_dir()}

    blob_courses = list_blob_courses()
    all_courses = sorted(local_courses | set(blob_courses))
    return CourseListResponse(courses=all_courses)

@router.get("/courses/{course_id}", response_model=CourseInfo)
async def get_course_info(
    course_id: str,
    app_settings: Settings = Depends(get_app_settings),
):
    """
    Get detailed information about a specific course
    """
    index_path = app_settings.index_dir / course_id
    
    if not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Course '{course_id}' not found"
        )
    
    # Count documents in index
    try:
        doc_count = len(list((index_path / "docs").glob("*"))) if (index_path / "docs").exists() else 0
    except:
        doc_count = 0
    
    return CourseInfo(
        course_id=course_id,
        name=course_id.upper(),
        document_count=doc_count,
        index_path=str(index_path)
    )

@router.delete("/courses/{course_id}/cache")
async def clear_course_cache(course_id: str):
    """
    Clear cached RAG components for a specific course
    """
    if course_id in _rag_cache:
        del _rag_cache[course_id]
        return {"message": f"Cache cleared for course '{course_id}'"}
    return {"message": f"No cache found for course '{course_id}'"}

@router.post("/reload/{course_id}")
async def reload_course_index(
    course_id: str,
    app_settings: Settings = Depends(get_app_settings),
):
    """
    Reload the index for a specific course (useful after updating documents)
    """
    if course_id in _rag_cache:
        del _rag_cache[course_id]
    
    try:
        _get_rag_components(course_id, app_settings)
        return {"message": f"Index reloaded successfully for course '{course_id}'"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reload index: {str(e)}"
        )