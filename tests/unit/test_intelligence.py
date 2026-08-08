"""Unit test for Global Background Intelligence Engine."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.background_intelligence import GlobalBackgroundIntelligenceEngine

client = TestClient(app)


def test_global_intelligence_summary_unauthorized():
    response = client.get("/api/v1/intelligence/global-summary")
    assert response.status_code == 401


def test_intelligence_engine_get_summary():
    summary = GlobalBackgroundIntelligenceEngine.get_summary()
    assert len(summary) == 7
    region_ids = [s.region_id for s in summary]
    assert "gbr" in region_ids
    assert "maldives" in region_ids
    assert "lakshadweep" in region_ids
    assert "red_sea" in region_ids
    assert "coral_triangle" in region_ids
    assert "caribbean" in region_ids
    assert "hawaii" in region_ids
