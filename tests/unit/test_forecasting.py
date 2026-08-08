"""Unit test for Coral Bleaching Forecasting Engine."""
from __future__ import annotations

import pytest
from backend.app.services.forecasting import CoralBleachingForecastingEngine


def test_generate_forecast_1_month():
    res = CoralBleachingForecastingEngine.generate_forecast(
        latitude=16.5,
        longitude=120.2,
        sea_surface_temperature=29.4,
        horizon="1_month",
    )
    assert res.horizon == "1_month"
    assert len(res.forecast_points) == 11  # 10 steps + Day 0
    assert res.trend_confidence > 50.0
    for p in res.forecast_points:
        assert p.upper_bound >= p.projected_risk
        assert p.lower_bound <= p.projected_risk


def test_generate_forecast_1_year():
    res = CoralBleachingForecastingEngine.generate_forecast(
        latitude=-18.28,
        longitude=147.70,
        sea_surface_temperature=29.8,
        horizon="1_year",
    )
    assert res.horizon == "1_year"
    assert res.projected_peak_risk >= res.current_risk
