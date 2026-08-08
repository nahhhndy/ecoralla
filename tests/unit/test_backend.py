"""Tests for FastAPI backend endpoints with mock/in-memory DB."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.app.core.dependencies import get_db
from backend.app.main import app


# Mock DB session for unit testing without live Postgres
async def mock_get_db():
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    # Mock execute for get_by_id or queries
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    yield mock_session


@pytest.fixture(autouse=True)
def override_db():
    app.dependency_overrides[get_db] = mock_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_model_health_endpoint():
    response = client.get("/api/v1/health/model")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True


def test_predict_endpoint_anonymous():
    payload = {
        "latitude": 10.0,
        "longitude": 120.0,
        "sea_surface_temperature": 29.5,
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "probability" in data
    assert "confidence" in data
    assert "label" in data


def test_predict_endpoint_invalid_lat():
    payload = {
        "latitude": 95.0,
        "longitude": 120.0,
        "sea_surface_temperature": 29.5,
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_get_prediction_not_found():
    response = client.get("/api/v1/predict/nonexistent-id")
    assert response.status_code == 404


def test_model_info_endpoint():
    response = client.get("/api/v1/analytics/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "roc_auc" in data
    assert "features" in data
