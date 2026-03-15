"""Content generation endpoints: summaries, flashcards, quiz questions."""
from __future__ import annotations

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rag_core.chain import build_rag_chain, answer_question
from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever
from settings import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Content Generation"])


class SummaryRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None


class FlashcardRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    count: int = 5


class QuizRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    count: int = 5


class Flashcard(BaseModel):
    front: str
    back: str


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: str


def _get_retriever(course_id: str, settings: Settings):
    azure = AzureSettings()
    azure.validate()
    index_path = settings.index_dir / course_id
    if not index_path.exists():
        raise HTTPException(status_code=404, detail=f"Index for course '{course_id}' not found")
    return load_retriever(index_path, azure)


def _get_llm():
    from langchain_openai import AzureChatOpenAI
    azure = AzureSettings()
    azure.validate()
    return AzureChatOpenAI(
        azure_endpoint=azure.chat_endpoint,
        api_key=azure.chat_key,
        api_version=azure.chat_api_version,
        azure_deployment=azure.chat_deployment,
        temperature=0.3,
    )


def _retrieve_context(retriever, topic: Optional[str], fallback: str = "key concepts") -> str:
    query = topic or fallback
    docs = retriever.invoke(query)
    blocks = []
    for d in docs:
        from pathlib import Path
        src = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        tag = Path(src).name + (f":p{page}" if page is not None else "")
        blocks.append(f"[{tag}]\n{d.page_content}")
    return "\n\n".join(blocks)


@router.post("/summary")
async def generate_summary(
    request: SummaryRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(request.course_id, app_settings)
    context = _retrieve_context(retriever, request.topic, "overview of the course")
    llm = _get_llm()

    prompt = (
        "Based ONLY on the following course material, write a clear, concise summary. "
        "Use bullet points for key concepts. Cite sources in [filename:page] format.\n\n"
        f"Context:\n{context}\n\n"
        f"{'Topic focus: ' + request.topic if request.topic else 'Summarize the main concepts.'}"
    )

    try:
        result = llm.invoke(prompt)
        return {"summary": result.content, "course_id": request.course_id, "topic": request.topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/flashcards")
async def generate_flashcards(
    request: FlashcardRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(request.course_id, app_settings)
    context = _retrieve_context(retriever, request.topic)
    llm = _get_llm()

    prompt = (
        "Based ONLY on the following course material, generate exactly "
        f"{request.count} flashcards for studying.\n\n"
        "Return a JSON array where each element has:\n"
        '  {"front": "<question or term>", "back": "<answer or definition>"}\n\n'
        f"Context:\n{context}\n\n"
        "Return ONLY the JSON array, no other text."
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        cards = json.loads(text)
        return {"flashcards": cards, "course_id": request.course_id, "topic": request.topic}
    except json.JSONDecodeError:
        return {"flashcards": [{"front": "Error", "back": "Could not parse flashcards. Try again."}], "course_id": request.course_id, "topic": request.topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/quiz")
async def generate_quiz(
    request: QuizRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(request.course_id, app_settings)
    context = _retrieve_context(retriever, request.topic)
    llm = _get_llm()

    prompt = (
        "Based ONLY on the following course material, generate exactly "
        f"{request.count} multiple-choice quiz questions.\n\n"
        "Return a JSON array where each element has:\n"
        "  {\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], "
        "\"correct_index\": 0, \"explanation\": \"...\"}\n\n"
        "correct_index is 0-based. Make questions progressively harder.\n\n"
        f"Context:\n{context}\n\n"
        "Return ONLY the JSON array, no other text."
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        questions = json.loads(text)
        return {"questions": questions, "course_id": request.course_id, "topic": request.topic}
    except json.JSONDecodeError:
        return {"questions": [], "course_id": request.course_id, "topic": request.topic, "error": "Could not parse quiz. Try again."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
