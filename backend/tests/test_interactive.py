"""Tests for the interactive learning router (/interactive/*)."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch


def _make_mock_retriever():
    doc = MagicMock()
    doc.page_content = "Binary search divides the search space in half each step."
    doc.metadata = {"source": "algo.pdf", "page": 12}
    retriever = MagicMock()
    retriever.invoke.return_value = [doc]
    return retriever


def _mock_azure():
    mock_settings = MagicMock()
    mock_settings.chat_endpoint = "https://fake.openai.azure.com/"
    mock_settings.chat_key = "fake"
    mock_settings.chat_api_version = "2024-12-01-preview"
    mock_settings.chat_deployment = "gpt-4o-mini"
    mock_settings.embed_endpoint = "https://fake.openai.azure.com/"
    mock_settings.embed_key = "fake"
    mock_settings.embed_api_version = "2024-12-01-preview"
    mock_settings.embed_deployment = "text-embedding-3-small"
    mock_settings.embed_dimensions = 1536
    return patch("routers.interactive.AzureSettings", return_value=mock_settings)


@_mock_azure()
def test_socratic_returns_404_for_missing_course(_, client):
    response = client.post(
        "/interactive/socratic",
        json={"course_id": "no-course", "topic": "test", "student_message": "hi"},
    )
    assert response.status_code == 404


@_mock_azure()
def test_teach_back_returns_404_for_missing_course(_, client):
    response = client.post(
        "/interactive/teach-back",
        json={"course_id": "no-course", "topic": "test", "student_explanation": "something"},
    )
    assert response.status_code == 404


@_mock_azure()
def test_concept_map_returns_404_for_missing_course(_, client):
    response = client.post(
        "/interactive/concept-map",
        json={"course_id": "no-course"},
    )
    assert response.status_code == 404


@_mock_azure()
def test_scenario_returns_404_for_missing_course(_, client):
    response = client.post(
        "/interactive/scenario",
        json={"course_id": "no-course"},
    )
    assert response.status_code == 404


def test_revision_rejects_empty_mistakes(client):
    response = client.post(
        "/interactive/revision-from-mistakes",
        json={"course_id": "test", "mistakes": []},
    )
    assert response.status_code == 400


@patch("routers.interactive._get_retriever")
@patch("routers.interactive._get_llm")
def test_socratic_tutor(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content='What do you think happens when you split a sorted list in half?\n{"progress": 25, "hint_given": false, "concept_targeted": "binary search"}'
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/interactive/socratic",
        json={
            "course_id": "test",
            "topic": "binary search",
            "student_message": "I want to understand binary search",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "metadata" in data
    assert data["metadata"]["progress"] == 25


@patch("routers.interactive._get_retriever")
@patch("routers.interactive._get_llm")
def test_teach_back_evaluation(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps({
            "mastery_score": 65,
            "overall_feedback": "Good start!",
            "correct_points": ["Understood the divide concept"],
            "gaps": ["Missed time complexity"],
            "misconceptions": [],
            "suggestions": ["Review Big-O notation"],
            "improved_explanation": "Binary search works by...",
        })
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/interactive/teach-back",
        json={
            "course_id": "test",
            "topic": "binary search",
            "student_explanation": "Binary search splits the list",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mastery_score"] == 65
    assert len(data["correct_points"]) > 0


@patch("routers.interactive._get_retriever")
@patch("routers.interactive._get_llm")
def test_concept_map_generation(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps({
            "title": "Searching Algorithms",
            "nodes": [
                {"id": "n1", "label": "Binary Search", "description": "Divide and conquer search", "category": "core", "x": 400, "y": 200},
                {"id": "n2", "label": "Linear Search", "description": "Sequential scan", "category": "supporting", "x": 200, "y": 400},
            ],
            "edges": [
                {"from": "n1", "to": "n2", "label": "alternative to"},
            ],
        })
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/interactive/concept-map",
        json={"course_id": "test", "topic": "searching"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1


@patch("routers.interactive._get_retriever")
@patch("routers.interactive._get_llm")
def test_scenario_learning(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps({
            "narrative": "You are debugging a slow search algorithm.",
            "choices": ["Use binary search", "Use linear search", "Give up"],
            "scene_number": 1,
            "total_scenes": 3,
            "concept_being_tested": "search efficiency",
        })
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/interactive/scenario",
        json={"course_id": "test", "topic": "algorithms"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "narrative" in data
    assert len(data["choices"]) == 3
    assert data["scene_number"] == 1


@patch("routers.interactive._get_retriever")
@patch("routers.interactive._get_llm")
def test_illustrated_flashcards(mock_get_llm, mock_get_retriever, client):
    mock_get_retriever.return_value = _make_mock_retriever()
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(
        content=json.dumps([{
            "front": "What is binary search?",
            "back": "A divide-and-conquer search algorithm",
            "svg": "<svg viewBox='0 0 200 200'><circle cx='100' cy='100' r='50' fill='blue'/></svg>",
            "color": "#6366f1",
        }])
    )
    mock_get_llm.return_value = llm

    response = client.post(
        "/interactive/illustrated-flashcards",
        json={"course_id": "test", "count": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["flashcards"]) == 1
    assert "svg" in data["flashcards"][0]
