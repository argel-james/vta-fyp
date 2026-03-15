"""Tests for the content generation router (/content/*)."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch


def test_summary_returns_404_for_missing_course(client):
    response = client.post("/content/summary", json={"course_id": "no-course"})
    assert response.status_code == 404


def test_flashcards_returns_404_for_missing_course(client):
    response = client.post(
        "/content/flashcards",
        json={"course_id": "no-course", "count": 3},
    )
    assert response.status_code == 404


def test_quiz_returns_404_for_missing_course(client):
    response = client.post(
        "/content/quiz",
        json={"course_id": "no-course", "count": 3},
    )
    assert response.status_code == 404


def _make_mock_retriever():
    doc = MagicMock()
    doc.page_content = "Photosynthesis converts light energy to chemical energy."
    doc.metadata = {"source": "bio.pdf", "page": 5}
    retriever = MagicMock()
    retriever.invoke.return_value = [doc]
    return retriever


@patch("routers.content._get_retriever")
@patch("routers.content._get_llm")
def test_flashcards_generation(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps([{"front": "What is photosynthesis?", "back": "Conversion of light to chemical energy"}])
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/content/flashcards",
        json={"course_id": "test", "count": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert "flashcards" in data
    assert len(data["flashcards"]) >= 1


@patch("routers.content._get_retriever")
@patch("routers.content._get_llm")
def test_quiz_generation(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps([{
            "question": "What does photosynthesis produce?",
            "options": ["A) Oxygen", "B) Carbon", "C) Iron", "D) Salt"],
            "correct_index": 0,
            "explanation": "Photosynthesis produces oxygen.",
        }])
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/content/quiz",
        json={"course_id": "test", "count": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert "questions" in data


@patch("routers.content._get_retriever")
@patch("routers.content._get_llm")
def test_summary_generation(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(content="## Summary\n- Photosynthesis is important.")
    mock_get_llm.return_value = llm

    response = client.post(
        "/content/summary",
        json={"course_id": "test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert len(data["summary"]) > 0
