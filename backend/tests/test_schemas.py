"""Tests for Pydantic schemas and data validation."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def test_settings_split_origins_json(monkeypatch):
    monkeypatch.setenv("VTA_DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("VTA_SECRET_KEY", "test")
    monkeypatch.setenv("VTA_EMAIL_CONNECTION_STR", "test")
    monkeypatch.setenv("VTA_FROM_EMAIL", "test@test.com")
    monkeypatch.setenv("VTA_ALLOWED_ORIGINS", '["http://x.com","http://y.com"]')

    from settings import Settings
    s = Settings()
    assert "http://x.com" in s.allowed_origins
    assert "http://y.com" in s.allowed_origins


def test_settings_creates_directories(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    index_dir = tmp_path / "index"
    monkeypatch.setenv("VTA_DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("VTA_SECRET_KEY", "test")
    monkeypatch.setenv("VTA_EMAIL_CONNECTION_STR", "test")
    monkeypatch.setenv("VTA_FROM_EMAIL", "test@test.com")
    monkeypatch.setenv("VTA_DATA_DIR", str(data_dir))
    monkeypatch.setenv("VTA_INDEX_DIR", str(index_dir))

    from settings import Settings
    s = Settings()
    s.ensure_directories()
    assert data_dir.exists()
    assert index_dir.exists()


def test_question_request_validation():
    from routers.rag import QuestionRequest

    req = QuestionRequest(question="What is AI?")
    assert req.persona == "standard"
    assert req.learning_level == "intermediate"
    assert req.course_id == "sc2107"


def test_question_request_accepts_all_personas():
    from routers.rag import QuestionRequest

    for persona in ["standard", "advocate", "joker", "socratic"]:
        req = QuestionRequest(question="test", persona=persona)
        assert req.persona == persona


def test_question_request_rejects_invalid_persona():
    from routers.rag import QuestionRequest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        QuestionRequest(question="test", persona="invalid_persona")


def test_question_request_rejects_invalid_level():
    from routers.rag import QuestionRequest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        QuestionRequest(question="test", learning_level="expert")


def test_question_request_with_history():
    from routers.rag import QuestionRequest

    req = QuestionRequest(
        question="follow up",
        history=[{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}],
    )
    assert len(req.history) == 2
