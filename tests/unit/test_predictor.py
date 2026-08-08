"""Tests for src.predictor prediction pipeline."""
from __future__ import annotations

import pytest

from src.predictor import predict


class TestPredict:
    def test_valid_prediction_returns_dict(self):
        result = predict(
            latitude=16.5,
            longitude=120.2,
            sea_surface_temperature=29.4,
        )
        assert isinstance(result, dict)
        assert "prediction" in result
        assert "probability" in result
        assert "confidence" in result
        assert "label" in result

    def test_prediction_is_binary(self):
        result = predict(16.5, 120.2, 29.4)
        assert result["prediction"] in (0, 1)

    def test_probability_is_normalized(self):
        result = predict(16.5, 120.2, 29.4)
        assert 0.0 <= result["probability"] <= 1.0

    def test_confidence_is_normalized(self):
        result = predict(16.5, 120.2, 29.4)
        assert 0.5 <= result["confidence"] <= 1.0

    def test_label_matches_prediction(self):
        result = predict(16.5, 120.2, 29.4)
        expected_labels = {0: "Low Bleaching Risk", 1: "High Bleaching Risk"}
        assert result["label"] == expected_labels[result["prediction"]]

    def test_invalid_latitude_raises(self):
        with pytest.raises(ValueError, match="[Ll]atitude"):
            predict(latitude=100.0, longitude=120.2, sea_surface_temperature=29.4)

    def test_invalid_longitude_raises(self):
        with pytest.raises(ValueError, match="[Ll]ongitude"):
            predict(latitude=16.5, longitude=200.0, sea_surface_temperature=29.4)

    def test_invalid_temperature_raises(self):
        with pytest.raises(ValueError):
            predict(latitude=16.5, longitude=120.2, sea_surface_temperature=50.0)

    def test_multiple_invalid_raises_all_messages(self):
        with pytest.raises(ValueError) as exc_info:
            predict(latitude=200.0, longitude=400.0, sea_surface_temperature=100.0)
        msg = str(exc_info.value)
        assert "Latitude" in msg
        assert "Longitude" in msg

    def test_boundary_values(self):
        """Test prediction works at geographic boundaries."""
        # Equator
        predict(0.0, 0.0, 28.0)
        # Max valid values
        predict(90.0, 180.0, 40.0)
        # Min valid values
        predict(-90.0, -180.0, -2.0)

    def test_tropical_reef_location(self):
        """Great Barrier Reef coordinates."""
        result = predict(
            latitude=-18.286,
            longitude=147.700,
            sea_surface_temperature=28.5,
        )
        assert result["prediction"] in (0, 1)
        assert isinstance(result["probability"], float)
