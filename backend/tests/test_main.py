"""Basic smoke tests for the FastAPI application."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import settings


def _build_test_client(tmp_path, monkeypatch) -> TestClient:
    """Create a TestClient wired to temporary directories."""
    monkeypatch.setenv("VTA_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("VTA_INDEX_DIR", str(tmp_path / "index"))
    settings.reset_settings_cache()

    import main

    importlib.reload(main)
    return TestClient(main.app)


def test_health_endpoint_reports_healthy(tmp_path, monkeypatch):
    client = _build_test_client(tmp_path, monkeypatch)
    with client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_list_courses_is_empty_when_no_indexes(tmp_path, monkeypatch):
    client = _build_test_client(tmp_path, monkeypatch)
    with client:
        response = client.get("/rag/courses")
    assert response.status_code == 200
    assert response.json() == {"courses": []}
