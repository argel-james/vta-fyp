"""Shared pytest fixtures for the backend test suite."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import settings as settings_mod


@pytest.fixture()
def app_dirs(tmp_path):
    """Return (data_dir, index_dir) as temp directories."""
    data = tmp_path / "data"
    index = tmp_path / "index"
    data.mkdir()
    index.mkdir()
    return data, index


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient wired to temp directories with DB calls mocked out."""
    monkeypatch.setenv("VTA_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("VTA_INDEX_DIR", str(tmp_path / "index"))
    monkeypatch.setenv("VTA_DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("VTA_SECRET_KEY", "test-secret-key-for-ci")
    monkeypatch.setenv("VTA_EMAIL_CONNECTION_STR", "test")
    monkeypatch.setenv("VTA_FROM_EMAIL", "test@test.com")
    settings_mod.reset_settings_cache()

    import main
    importlib.reload(main)
    with TestClient(main.app) as tc:
        yield tc


@pytest.fixture()
def mock_llm():
    """A mocked LangChain LLM that returns predictable output."""
    llm = MagicMock()
    llm.invoke.return_value = MagicMock(content='[{"front":"Q","back":"A"}]')
    return llm


@pytest.fixture()
def mock_retriever():
    """A mocked retriever that returns fake documents."""
    doc = MagicMock()
    doc.page_content = "Test content about science concepts."
    doc.metadata = {"source": "test.pdf", "page": 1}

    retriever = MagicMock()
    retriever.invoke.return_value = [doc]
    return retriever
