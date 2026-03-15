"""Content generation endpoints: summaries, flashcards, quiz questions.

These endpoints retrieve *many* chunks from the course FAISS index so the
LLM has rich, relevant context to generate accurate content from.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever_with_k
from settings import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Content Generation"])

CONTENT_K = 12


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


def _get_retriever(course_id: str, settings: Settings, k: int = CONTENT_K):
    azure = AzureSettings()
    azure.validate()
    index_path = settings.index_dir / course_id
    if not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Index for course '{course_id}' not found. Upload and ingest documents first.",
        )
    return load_retriever_with_k(index_path, azure, k=k)


def _get_llm(temperature: float = 0.4):
    from langchain_openai import AzureChatOpenAI

    azure = AzureSettings()
    azure.validate()
    return AzureChatOpenAI(
        azure_endpoint=azure.chat_endpoint,
        api_key=azure.chat_key,
        api_version=azure.chat_api_version,
        azure_deployment=azure.chat_deployment,
        temperature=temperature,
    )


def _retrieve_context(retriever, topic: Optional[str], fallback_queries: list[str]) -> str:
    """Retrieve chunks using multiple queries for broader coverage."""
    queries = [topic] if topic else fallback_queries
    all_docs = []
    seen_contents: set[str] = set()

    for q in queries:
        docs = retriever.invoke(q)
        for d in docs:
            content_key = d.page_content[:200]
            if content_key not in seen_contents:
                seen_contents.add(content_key)
                all_docs.append(d)

    blocks = []
    for d in all_docs:
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
    retriever = _get_retriever(request.course_id, app_settings, k=15)
    context = _retrieve_context(
        retriever,
        request.topic,
        [
            "main concepts and key ideas",
            "important definitions and terminology",
            "summary of topics covered",
        ],
    )
    llm = _get_llm(temperature=0.3)

    topic_instruction = (
        f"Focus specifically on: {request.topic}"
        if request.topic
        else "Cover all major topics found in the material."
    )

    prompt = (
        "You are a study-notes generator. Based ONLY on the course material "
        "below, produce well-structured revision notes.\n\n"
        "RULES:\n"
        "- Use clear headings and bullet points.\n"
        "- Include key definitions, formulas, and important facts.\n"
        "- Cite sources using [filename:page] notation.\n"
        "- Do NOT add information that is not in the material.\n"
        "- Make the notes useful for exam revision.\n\n"
        f"INSTRUCTION: {topic_instruction}\n\n"
        f"COURSE MATERIAL:\n{context}"
    )

    try:
        result = llm.invoke(prompt)
        return {"summary": result.content, "course_id": request.course_id, "topic": request.topic}
    except Exception as exc:
        logger.exception("Summary generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/flashcards")
async def generate_flashcards(
    request: FlashcardRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(request.course_id, app_settings)
    context = _retrieve_context(
        retriever,
        request.topic,
        [
            "key definitions and terminology",
            "important concepts and facts",
            "formulas and processes",
        ],
    )
    llm = _get_llm(temperature=0.4)

    topic_focus = f"Focus on: {request.topic}\n" if request.topic else ""

    prompt = (
        "You are a flashcard generator for students. Based ONLY on the course "
        "material below, create exactly "
        f"{request.count} high-quality study flashcards.\n\n"
        "RULES:\n"
        "- Each flashcard must test a specific fact, definition, or concept "
        "from the material.\n"
        "- The 'front' should be a clear, specific question.\n"
        "- The 'back' should be a concise, accurate answer.\n"
        "- Cover different topics — do NOT repeat similar questions.\n"
        "- Do NOT invent information not present in the material.\n\n"
        f"{topic_focus}"
        f"COURSE MATERIAL:\n{context}\n\n"
        "Return ONLY a valid JSON array. Each element:\n"
        '{"front": "<question>", "back": "<answer>"}\n'
        "No markdown fencing, no extra text — just the JSON array."
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        cards = json.loads(text)
        return {"flashcards": cards, "course_id": request.course_id, "topic": request.topic}
    except json.JSONDecodeError:
        logger.warning("Failed to parse flashcard JSON, retrying with raw text")
        return {
            "flashcards": [{"front": "Generation error", "back": "Could not parse flashcards — please try again."}],
            "course_id": request.course_id,
            "topic": request.topic,
        }
    except Exception as exc:
        logger.exception("Flashcard generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/quiz")
async def generate_quiz(
    request: QuizRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(request.course_id, app_settings)
    context = _retrieve_context(
        retriever,
        request.topic,
        [
            "key concepts and definitions",
            "important processes and mechanisms",
            "facts, figures, and examples",
        ],
    )
    llm = _get_llm(temperature=0.5)

    topic_focus = f"Focus on: {request.topic}\n" if request.topic else ""

    prompt = (
        "You are a quiz generator for students. Based ONLY on the course "
        "material below, create exactly "
        f"{request.count} multiple-choice questions.\n\n"
        "RULES:\n"
        "- Each question must be answerable from the provided material.\n"
        "- Provide exactly 4 options (A, B, C, D) for each question.\n"
        "- Only ONE option should be correct.\n"
        "- The wrong options should be plausible but clearly wrong based on "
        "the material.\n"
        "- Include a brief explanation of why the correct answer is right.\n"
        "- Make questions progressively harder.\n"
        "- Cover different topics — do NOT repeat similar questions.\n"
        "- Do NOT invent facts not present in the material.\n\n"
        f"{topic_focus}"
        f"COURSE MATERIAL:\n{context}\n\n"
        "Return ONLY a valid JSON array. Each element:\n"
        '{"question": "...", "options": ["A) ...", "B) ...", "C) ...", '
        '"D) ..."], "correct_index": 0, "explanation": "..."}\n'
        "correct_index is 0-based. No markdown fencing, no extra text."
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        questions = json.loads(text)
        return {"questions": questions, "course_id": request.course_id, "topic": request.topic}
    except json.JSONDecodeError:
        logger.warning("Failed to parse quiz JSON")
        return {
            "questions": [],
            "course_id": request.course_id,
            "topic": request.topic,
            "error": "Could not parse quiz — please try again.",
        }
    except Exception as exc:
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
