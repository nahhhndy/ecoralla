"""Unit tests for Global Ocean Risk & Regional Grid Engine."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_grid_predict_region_unauthorized():
    response = client.post(
        "/api/v1/grid/predict-region",
        json={
            "region_name": "Test Region",
            "min_latitude": -20.0,
            "max_latitude": -18.0,
            "min_longitude": 140.0,
            "max_longitude": 142.0,
            "grid_resolution": 1.0,
        },
    )
    assert response.status_code == 401
