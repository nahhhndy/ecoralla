"""Unit tests for Environmental Telemetry API and Providers."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_environmental_telemetry_endpoint():
    response = client.get(
        "/api/v1/environmental/telemetry?latitude=16.5&longitude=120.2"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 16.5
    assert data["longitude"] == 120.2
    assert "sea_surface_temperature" in data
    assert "region_name" in data
    assert "ocean_metadata" in data
    assert "provider_name" in data


def test_environmental_telemetry_invalid_coords():
    response = client.get(
        "/api/v1/environmental/telemetry?latitude=100.0&longitude=120.2"
    )
    assert response.status_code == 422
