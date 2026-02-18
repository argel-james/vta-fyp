from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rag_core.chain import build_rag_chain, answer_question
from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever
from settings import Settings, get_settings as get_app_settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/rag",
    tags=["RAG - Question Answering"]
)

# Pydantic models
class QuestionRequest(BaseModel):
    question: str
    course_id: str = "sc2107"

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
    azure_settings = get_azure_settings()
    index_path = app_settings.index_dir / course_id

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
    
@router.post("/ask", response_model=QuestionResponse)
async def ask_question(
    request: QuestionRequest,
    app_settings: Settings = Depends(get_app_settings),
):
    """
    Ask a question to the RAG system for a specific course
    """
    try:
        rag_components = _get_rag_components(request.course_id, app_settings)
        chain = rag_components.chain
        retriever = rag_components.retriever
        
        answer = answer_question(chain, retriever, request.question)
        
        # Format sources
        sources = []
        if answer.sources:
            sources = [
                {
                    "file": s.file,
                    "page": s.page,
                    "content": getattr(s, 'content', None)
                }
                for s in answer.sources
            ]
        
        return QuestionResponse(
            answer=answer.text,
            sources=sources,
            course_id=request.course_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses", response_model=CourseListResponse)
async def list_courses(app_settings: Settings = Depends(get_app_settings)):
    """
    List all available courses with RAG indices
    """
    index_dir = app_settings.index_dir
    if not index_dir.exists():
        return CourseListResponse(courses=[])
    
    courses = [d.name for d in index_dir.iterdir() if d.is_dir()]
    return CourseListResponse(courses=courses)

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