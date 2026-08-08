"""Unit tests for AI Environmental Assistant."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_assistant_chat_endpoint_unauthorized():
    response = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Tell me about coral bleaching"},
    )
    assert response.status_code == 401
