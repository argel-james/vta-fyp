"""Interactive learning endpoints: Socratic tutor, teach-it-back, scenarios,
concept maps, mistake-based revision, and illustrated flashcards.
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

router = APIRouter(prefix="/interactive", tags=["Interactive Learning"])

CONTENT_K = 12


def _get_retriever(course_id: str, settings: Settings, k: int = CONTENT_K):
    azure = AzureSettings()
    azure.validate()
    index_path = settings.index_dir / course_id
    if not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Index for course '{course_id}' not found.",
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
    queries = [topic] if topic else fallback_queries
    all_docs = []
    seen: set[str] = set()

    for q in queries:
        docs = retriever.invoke(q)
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


def _parse_json_response(text: str):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(cleaned)


# ─── Socratic Tutor ──────────────────────────────────────────────────

class SocraticRequest(BaseModel):
    course_id: str
    topic: str
    student_message: str
    history: Optional[List[dict]] = None
    learning_level: str = "intermediate"


@router.post("/socratic")
async def socratic_tutor(
    req: SocraticRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(req.course_id, app_settings, k=10)
    context = _retrieve_context(retriever, req.topic, ["key concepts", "definitions"])
    llm = _get_llm(temperature=0.3)

    history_block = ""
    if req.history:
        for msg in req.history[-8:]:
            role = "Student" if msg.get("role") == "user" else "Tutor"
            history_block += f"{role}: {msg.get('content', '')}\n"

    prompt = (
        "You are a Socratic tutor. Your goal is to NEVER give direct answers. "
        "Instead, guide the student to discover the answer through a series of "
        "carefully crafted questions.\n\n"
        "RULES:\n"
        "- Ask ONE guiding question at a time.\n"
        "- Each question should build on the student's previous response.\n"
        "- If the student is stuck, provide a small hint then ask another question.\n"
        "- If the student arrives at the correct understanding, congratulate them "
        "and ask a deeper follow-up to solidify learning.\n"
        "- Use the course material as your knowledge base.\n"
        "- After your response, include a JSON block with metadata.\n\n"
        f"TOPIC: {req.topic}\n"
        f"STUDENT LEVEL: {req.learning_level}\n\n"
        f"COURSE MATERIAL:\n{context}\n\n"
    )
    if history_block:
        prompt += f"CONVERSATION SO FAR:\n{history_block}\n"
    prompt += f"Student's latest message: {req.student_message}\n\n"
    prompt += (
        "Respond with your guiding question/feedback. At the end, on a new line, "
        "output ONLY a JSON object (no markdown fencing) like:\n"
        '{"progress": 0-100, "hint_given": true/false, "concept_targeted": "..."}\n'
    )

    try:
        result = llm.invoke(prompt)
        text = result.content.strip()

        response_text = text
        metadata = {"progress": 0, "hint_given": False, "concept_targeted": req.topic}
        lines = text.split("\n")
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            if line.startswith("{") and line.endswith("}"):
                try:
                    metadata = json.loads(line)
                    response_text = "\n".join(lines[:i]).strip()
                    break
                except json.JSONDecodeError:
                    pass

        return {
            "response": response_text,
            "metadata": metadata,
            "course_id": req.course_id,
            "topic": req.topic,
        }
    except Exception as exc:
        logger.exception("Socratic tutor failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Teach-It-Back ───────────────────────────────────────────────────

class TeachBackRequest(BaseModel):
    course_id: str
    topic: str
    student_explanation: str
    learning_level: str = "intermediate"


@router.post("/teach-back")
async def teach_it_back(
    req: TeachBackRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(req.course_id, app_settings, k=12)
    context = _retrieve_context(
        retriever, req.topic,
        ["key concepts", "definitions and explanations", "important details"],
    )
    llm = _get_llm(temperature=0.3)

    prompt = (
        "You are evaluating a student who is trying to explain a concept in their "
        "own words (the 'teach-it-back' technique).\n\n"
        "TASK: Compare the student's explanation to the actual course material and "
        "provide structured feedback.\n\n"
        "RULES:\n"
        "- Be encouraging but accurate.\n"
        "- Identify what they got RIGHT (with specifics).\n"
        "- Identify GAPS or MISCONCEPTIONS (with corrections from the material).\n"
        "- Give a mastery score from 0-100.\n"
        "- Suggest what they should review.\n\n"
        f"TOPIC: {req.topic}\n"
        f"STUDENT LEVEL: {req.learning_level}\n\n"
        f"COURSE MATERIAL (ground truth):\n{context}\n\n"
        f"STUDENT'S EXPLANATION:\n{req.student_explanation}\n\n"
        "Respond with ONLY a valid JSON object (no markdown fencing):\n"
        "{\n"
        '  "mastery_score": 0-100,\n'
        '  "overall_feedback": "2-3 sentence summary",\n'
        '  "correct_points": ["what they got right..."],\n'
        '  "gaps": ["what they missed..."],\n'
        '  "misconceptions": ["what they got wrong..."],\n'
        '  "suggestions": ["what to review..."],\n'
        '  "improved_explanation": "a model explanation they can learn from"\n'
        "}\n"
    )

    try:
        result = llm.invoke(prompt)
        data = _parse_json_response(result.content)
        return {**data, "course_id": req.course_id, "topic": req.topic}
    except json.JSONDecodeError:
        return {
            "mastery_score": 0,
            "overall_feedback": "Could not evaluate — please try again.",
            "correct_points": [],
            "gaps": [],
            "misconceptions": [],
            "suggestions": ["Try explaining the concept again"],
            "improved_explanation": "",
            "course_id": req.course_id,
            "topic": req.topic,
        }
    except Exception as exc:
        logger.exception("Teach-back evaluation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Scenario-Based Learning ─────────────────────────────────────────

class ScenarioRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    choice: Optional[str] = None
    history: Optional[List[dict]] = None
    learning_level: str = "intermediate"


@router.post("/scenario")
async def scenario_learning(
    req: ScenarioRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(req.course_id, app_settings, k=10)
    context = _retrieve_context(
        retriever, req.topic,
        ["real-world applications", "practical examples", "case studies"],
    )
    llm = _get_llm(temperature=0.6)

    history_block = ""
    if req.history:
        for msg in req.history[-6:]:
            role = "Narrator" if msg.get("role") == "assistant" else "Player"
            history_block += f"{role}: {msg.get('content', '')}\n"

    is_new = not req.history or len(req.history) == 0

    if is_new:
        prompt = (
            "You are a scenario-based learning game master. Create an engaging, "
            "interactive scenario that teaches concepts from the course material.\n\n"
            "RULES:\n"
            "- Set up a realistic scenario relevant to the course content.\n"
            "- Present the student with a situation and 3-4 choices.\n"
            "- Each choice should test understanding of different concepts.\n"
            "- Make it feel like a story/adventure, not a test.\n"
            "- Use vivid descriptions and make it engaging.\n\n"
            f"STUDENT LEVEL: {req.learning_level}\n"
            f"TOPIC FOCUS: {req.topic or 'general course content'}\n\n"
            f"COURSE MATERIAL:\n{context}\n\n"
            "Create the opening scenario. Respond with ONLY valid JSON (no fencing):\n"
            "{\n"
            '  "narrative": "The scenario description...",\n'
            '  "choices": ["Choice A...", "Choice B...", "Choice C..."],\n'
            '  "scene_number": 1,\n'
            '  "total_scenes": 4,\n'
            '  "concept_being_tested": "the concept name"\n'
            "}\n"
        )
    else:
        prompt = (
            "Continue the scenario-based learning game. The student made a choice.\n\n"
            "RULES:\n"
            "- React to the student's choice with consequences.\n"
            "- Explain WHY their choice was good/bad using course concepts.\n"
            "- Present the next situation with new choices.\n"
            "- Track their score.\n"
            "- If this is the final scene, give a summary and score.\n\n"
            f"COURSE MATERIAL:\n{context}\n\n"
            f"STORY SO FAR:\n{history_block}\n\n"
            f"Student chose: {req.choice}\n\n"
            "Respond with ONLY valid JSON (no fencing):\n"
            "{\n"
            '  "narrative": "What happens next...",\n'
            '  "feedback": "Why their choice was good/bad...",\n'
            '  "choices": ["Next choices..."] or [] if final scene,\n'
            '  "scene_number": N,\n'
            '  "total_scenes": 4,\n'
            '  "is_final": true/false,\n'
            '  "score": 0-100 (only if final),\n'
            '  "concept_being_tested": "concept name",\n'
            '  "concepts_learned": ["list of concepts covered"] (only if final)\n'
            "}\n"
        )

    try:
        result = llm.invoke(prompt)
        data = _parse_json_response(result.content)
        return {**data, "course_id": req.course_id}
    except json.JSONDecodeError:
        return {
            "narrative": "Something went wrong with the scenario. Let's try again!",
            "choices": [],
            "scene_number": 0,
            "total_scenes": 4,
            "is_final": True,
            "course_id": req.course_id,
        }
    except Exception as exc:
        logger.exception("Scenario generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Concept Map ─────────────────────────────────────────────────────

class ConceptMapRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None


@router.post("/concept-map")
async def generate_concept_map(
    req: ConceptMapRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(req.course_id, app_settings, k=15)
    context = _retrieve_context(
        retriever, req.topic,
        [
            "key concepts and relationships",
            "main topics and subtopics",
            "definitions and connections between ideas",
            "prerequisites and dependencies",
        ],
    )
    llm = _get_llm(temperature=0.2)

    prompt = (
        "Analyze the course material and create a concept map showing "
        "relationships between key concepts.\n\n"
        "RULES:\n"
        "- Identify 8-15 key concepts from the material.\n"
        "- Show how concepts relate to each other.\n"
        "- Use clear, descriptive relationship labels.\n"
        "- Organize concepts hierarchically where possible.\n"
        "- Each node should have a brief description.\n\n"
        f"TOPIC FOCUS: {req.topic or 'all major topics'}\n\n"
        f"COURSE MATERIAL:\n{context}\n\n"
        "Respond with ONLY valid JSON (no markdown fencing):\n"
        "{\n"
        '  "title": "Concept Map: ...",\n'
        '  "nodes": [\n'
        '    {"id": "n1", "label": "Concept Name", "description": "Brief desc", '
        '"category": "core|supporting|detail", "x": 0, "y": 0}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"from": "n1", "to": "n2", "label": "relationship description"}\n'
        "  ]\n"
        "}\n"
        "Position nodes logically: core concepts near center (x~400,y~300), "
        "supporting around them. Use x 50-750, y 50-550.\n"
    )

    try:
        result = llm.invoke(prompt)
        data = _parse_json_response(result.content)
        return {**data, "course_id": req.course_id, "topic": req.topic}
    except json.JSONDecodeError:
        return {
            "title": "Concept Map",
            "nodes": [],
            "edges": [],
            "course_id": req.course_id,
            "topic": req.topic,
            "error": "Could not generate concept map — please try again.",
        }
    except Exception as exc:
        logger.exception("Concept map generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Mistake Journal / Adaptive Revision ─────────────────────────────

class MistakeRevisionRequest(BaseModel):
    course_id: str
    mistakes: List[dict]
    learning_level: str = "intermediate"


@router.post("/revision-from-mistakes")
async def generate_revision_from_mistakes(
    req: MistakeRevisionRequest,
    app_settings: Settings = Depends(get_settings),
):
    """Generate targeted revision material based on the student's past mistakes."""
    if not req.mistakes:
        raise HTTPException(status_code=400, detail="No mistakes provided")

    topics_from_mistakes = set()
    mistake_summary = []
    for m in req.mistakes[:15]:
        q = m.get("question", "")
        wrong = m.get("student_answer", "")
        correct = m.get("correct_answer", "")
        topic = m.get("topic", "")
        if topic:
            topics_from_mistakes.add(topic)
        mistake_summary.append(
            f"Q: {q}\nStudent answered: {wrong}\nCorrect: {correct}"
        )

    retriever = _get_retriever(req.course_id, app_settings, k=15)
    queries = list(topics_from_mistakes) if topics_from_mistakes else [
        "key concepts", "common misconceptions",
    ]
    context = _retrieve_context(retriever, None, queries)
    llm = _get_llm(temperature=0.3)

    mistakes_text = "\n\n".join(mistake_summary)

    prompt = (
        "A student made the following mistakes. Analyze their error patterns "
        "and create targeted revision material.\n\n"
        "RULES:\n"
        "- Group mistakes by underlying concept/theme.\n"
        "- For each group, explain the concept clearly.\n"
        "- Address why the wrong answers were wrong.\n"
        "- Create 2-3 practice questions per weak area.\n"
        "- Be encouraging, not critical.\n\n"
        f"STUDENT LEVEL: {req.learning_level}\n\n"
        f"STUDENT'S MISTAKES:\n{mistakes_text}\n\n"
        f"COURSE MATERIAL FOR REFERENCE:\n{context}\n\n"
        "Respond with ONLY valid JSON (no fencing):\n"
        "{\n"
        '  "weak_areas": [\n'
        "    {\n"
        '      "concept": "concept name",\n'
        '      "explanation": "clear explanation of the concept",\n'
        '      "why_student_struggled": "analysis of the error pattern",\n'
        '      "key_points": ["point 1", "point 2"],\n'
        '      "practice_questions": [\n'
        '        {"question": "...", "options": ["A","B","C","D"], '
        '"correct_index": 0, "explanation": "..."}\n'
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "overall_advice": "encouraging summary and study tips",\n'
        '  "estimated_mastery": 0-100\n'
        "}\n"
    )

    try:
        result = llm.invoke(prompt)
        data = _parse_json_response(result.content)
        return {**data, "course_id": req.course_id}
    except json.JSONDecodeError:
        return {
            "weak_areas": [],
            "overall_advice": "Could not analyze mistakes. Please try again.",
            "estimated_mastery": 0,
            "course_id": req.course_id,
        }
    except Exception as exc:
        logger.exception("Mistake revision failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─── Illustrated Flashcards (SVG generation via LLM) ─────────────────

class IllustratedFlashcardRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    count: int = 4


@router.post("/illustrated-flashcards")
async def generate_illustrated_flashcards(
    req: IllustratedFlashcardRequest,
    app_settings: Settings = Depends(get_settings),
):
    retriever = _get_retriever(req.course_id, app_settings, k=12)
    context = _retrieve_context(
        retriever, req.topic,
        ["key concepts and visual ideas", "important definitions", "processes and mechanisms"],
    )
    llm = _get_llm(temperature=0.5)

    prompt = (
        "Create illustrated flashcards for students. Each card has a concept "
        "on the front, an explanation on the back, and an SVG illustration.\n\n"
        "RULES:\n"
        "- Create exactly " + str(req.count) + " flashcards from the course material.\n"
        "- Each SVG should be a simple, colorful illustration (max 200x200 viewBox).\n"
        "- Use basic shapes (circles, rectangles, paths) with bright colors.\n"
        "- SVGs should visually represent the concept.\n"
        "- Keep SVGs simple (under 500 chars each).\n"
        "- Do NOT invent information not in the material.\n\n"
        f"TOPIC: {req.topic or 'key course concepts'}\n\n"
        f"COURSE MATERIAL:\n{context}\n\n"
        "Respond with ONLY valid JSON (no fencing):\n"
        "[\n"
        "  {\n"
        '    "front": "Question/concept",\n'
        '    "back": "Clear explanation",\n'
        '    "svg": "<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'>...</svg>",\n'
        '    "color": "#hex color for card background"\n'
        "  }\n"
        "]\n"
    )

    try:
        result = llm.invoke(prompt)
        cards = _parse_json_response(result.content)
        return {"flashcards": cards, "course_id": req.course_id, "topic": req.topic}
    except json.JSONDecodeError:
        return {
            "flashcards": [],
            "course_id": req.course_id,
            "topic": req.topic,
            "error": "Could not generate illustrated flashcards — please try again.",
        }
    except Exception as exc:
        logger.exception("Illustrated flashcard generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
