"""Unit test for Research Workspace API endpoints."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_workspace_projects_unauthorized():
    response = client.get("/api/v1/workspace/projects")
    assert response.status_code == 401
