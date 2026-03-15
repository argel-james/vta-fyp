"""Smoke tests for core FastAPI endpoints."""
from __future__ import annotations


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint(client):
    response = client.get("/")
    data = response.json()
    assert response.status_code == 200
    assert data["status"] == "running"
    assert "version" in data


def test_list_courses_empty(client):
    response = client.get("/rag/courses")
    assert response.status_code == 200
    assert response.json() == {"courses": []}


def test_course_not_found(client):
    response = client.get("/rag/courses/nonexistent")
    assert response.status_code == 404


def test_openapi_docs_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/health" in schema["paths"]
