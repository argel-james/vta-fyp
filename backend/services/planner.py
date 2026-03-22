"""Curriculum planner service — generates structured study plans via LLM."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from rag_core.config import AzureSettings
from rag_core.retrieval import load_retriever_with_k
from settings import Settings

logger = logging.getLogger(__name__)


def _get_llm(azure: AzureSettings, temperature: float = 0.4):
    from langchain_openai import AzureChatOpenAI

    return AzureChatOpenAI(
        azure_endpoint=azure.chat_endpoint,
        api_key=azure.chat_key,
        api_version=azure.chat_api_version,
        azure_deployment=azure.chat_deployment,
        temperature=temperature,
    )


def _retrieve_topic_context(
    course_id: str,
    topics: list[str],
    settings: Settings,
    azure: AzureSettings,
) -> str:
    """Retrieve course material context for the selected topics."""
    index_path = settings.index_dir / course_id
    if not index_path.exists():
        return ""

    retriever = load_retriever_with_k(index_path, azure, k=8)
    all_docs = []
    seen: set[str] = set()

    for topic in topics[:10]:
        docs = retriever.invoke(topic)
        for d in docs:
            key = d.page_content[:200]
            if key not in seen:
                seen.add(key)
                all_docs.append(d)

    blocks = []
    for d in all_docs:
        src = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        tag = Path(src).name + (f":p{page}" if page is not None else "")
        blocks.append(f"[{tag}]\n{d.page_content}")

    return "\n\n".join(blocks)


def extract_course_topics(
    course_id: str,
    settings: Settings,
    azure: AzureSettings,
) -> list[dict[str, Any]]:
    """Extract topic names from ingested document metadata."""
    index_path = settings.index_dir / course_id
    if not index_path.exists():
        return []

    retriever = load_retriever_with_k(index_path, azure, k=30)
    docs = retriever.invoke("all topics covered in this course")

    topics_seen: dict[str, dict[str, Any]] = {}
    for d in docs:
        label = d.metadata.get("topic_label")
        number = d.metadata.get("topic_number")
        week = d.metadata.get("week")
        filename = d.metadata.get("filename", "")

        if label and label not in topics_seen:
            topics_seen[label] = {
                "name": label,
                "topic_number": number,
                "week": week,
                "source": filename,
            }

    if not topics_seen:
        llm = _get_llm(azure, temperature=0.2)
        context_docs = retriever.invoke("course outline syllabus topics")
        context = "\n".join(d.page_content[:500] for d in context_docs[:10])

        prompt = (
            "Based on the following course material excerpts, list the main topics "
            "covered in this course. Return ONLY a JSON array of strings (topic names). "
            "No markdown fencing.\n\n"
            f"MATERIAL:\n{context}"
        )
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            names = json.loads(text)
            return [{"name": n, "topic_number": i + 1, "week": None, "source": ""} for i, n in enumerate(names)]
        except (json.JSONDecodeError, TypeError):
            return []

    return sorted(topics_seen.values(), key=lambda t: t.get("topic_number") or 0)


def generate_study_plan(
    course_id: str,
    topics: list[str],
    settings: Settings,
    azure: AzureSettings,
    class_day: str | None = None,
    class_time: str | None = None,
) -> list[dict[str, Any]]:
    """Generate an AI-powered study plan for the selected topics.

    Returns a list of plan items with study sessions and quizzes interleaved.
    """
    context = _retrieve_topic_context(course_id, topics, settings, azure)
    llm = _get_llm(azure, temperature=0.4)

    schedule_note = ""
    if class_day and class_time:
        schedule_note = (
            f"\nThe student has class on {class_day} at {class_time}. "
            "Plan study sessions around this schedule — suggest study times "
            "before or after class, and avoid scheduling during class hours. "
            "Consider that the student might want to review before class and "
            "reinforce learning after class."
        )

    topics_list = "\n".join(f"  {i+1}. {t}" for i, t in enumerate(topics))

    prompt = (
        "You are a curriculum planner for a university student. "
        "Create a structured, week-by-week study plan for the following topics.\n\n"
        f"TOPICS TO COVER:\n{topics_list}\n"
        f"{schedule_note}\n\n"
        "COURSE MATERIAL CONTEXT (use to estimate complexity and create subtopics):\n"
        f"{context[:4000]}\n\n"
        "RULES:\n"
        "- Create a mix of 'study_session' and 'quiz' items\n"
        "- Each study_session should break the topic into 2-4 focused subtopics\n"
        "- Place a quiz after every 2-3 study sessions to reinforce learning\n"
        "- Estimate realistic hours for each item (0.5 to 3 hours)\n"
        "- Suggest a target_date as 'Week N, Day' (e.g. 'Week 1, Monday')\n"
        "- Order items logically for progressive learning\n"
        "- For quiz items, include question_count and difficulty\n\n"
        "Return ONLY a valid JSON array. Each element:\n"
        "{\n"
        '  "item_type": "study_session" | "quiz",\n'
        '  "topic_name": "Topic Name",\n'
        '  "subtopics": ["subtopic1", "subtopic2"],  // for study_session only\n'
        '  "estimated_hours": 1.5,\n'
        '  "target_date": "Week 1, Monday",\n'
        '  "quiz_config": {"question_count": 5, "difficulty": "medium"}  // for quiz only\n'
        "}\n"
        "No markdown fencing, no extra text — just the JSON array."
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        plan = json.loads(text)
        if not isinstance(plan, list):
            return []

        for i, item in enumerate(plan):
            item["order_index"] = i
            if "subtopics" in item and isinstance(item["subtopics"], list):
                item["subtopics"] = json.dumps(item["subtopics"])
            if "quiz_config" in item and isinstance(item["quiz_config"], dict):
                item["quiz_config"] = json.dumps(item["quiz_config"])

        return plan
    except (json.JSONDecodeError, TypeError):
        logger.exception("Failed to parse study plan JSON")
        return []
    except Exception:
        logger.exception("Study plan generation failed")
        return []
