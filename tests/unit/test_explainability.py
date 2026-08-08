"""Unit tests for AI Explainability Engine."""
from __future__ import annotations

import pytest
from backend.app.services.explainability import (
    EcologicalInsight,
    ExplainabilityEngine,
)


def test_explainability_high_risk():
    shap_dict = {
        "feature_names": ["sea_surface_temperature", "lat", "lon"],
        "shap_values": [0.48, -0.12, 0.05],
        "base_value": 0.5,
        "prediction_value": 0.91,
    }
    insight: EcologicalInsight = ExplainabilityEngine.generate_explanation(
        prediction=1,
        probability=0.91,
        confidence=0.95,
        latitude=16.5,
        longitude=120.2,
        sea_surface_temperature=29.8,
        shap_dict=shap_dict,
        location_name="Coral Triangle Reef",
    )

    assert "High Coral Bleaching Risk" in insight.headline
    assert "29.8°C" in insight.rationale
    assert len(insight.key_drivers) == 3
    assert insight.key_drivers[0].display_name == "Sea Surface Temperature"
    assert "Zooxanthellae" in insight.ecological_implications or "expulsion" in insight.ecological_implications
    assert len(insight.recommendations) > 0


def test_explainability_low_risk():
    insight: EcologicalInsight = ExplainabilityEngine.generate_explanation(
        prediction=0,
        probability=0.12,
        confidence=0.88,
        latitude=-12.5,
        longitude=130.4,
        sea_surface_temperature=24.5,
    )

    assert "Low Coral Bleaching" in insight.headline
    assert "24.5°C" in insight.rationale
    assert len(insight.recommendations) > 0
