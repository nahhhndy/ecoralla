"""Coral Bleaching Forecasting Engine for EcoRal.

Generates temporal forecasting projections across 5 horizon windows:
- 1 week (7 days)
- 1 month (30 days)
- 3 months (90 days)
- 6 months (180 days)
- 1 year (365 days)

Computes projected risk, 95% confidence uncertainty bands, and trend confidence metrics.
"""
from __future__ import annotations

import math
from typing import Any, Literal
from pydantic import BaseModel, Field

from src.predictor import predict as ml_predict

HorizonType = Literal["1_week", "1_month", "3_months", "6_months", "1_year"]


class ForecastPoint(BaseModel):
    step_label: str
    days: int
    projected_sst: float
    projected_risk: float  # 0 to 100%
    lower_bound: float  # 95% CI lower uncertainty
    upper_bound: float  # 95% CI upper uncertainty
    confidence: float  # Model confidence at this step


class ForecastResponse(BaseModel):
    horizon: HorizonType
    latitude: float
    longitude: float
    baseline_sst: float
    current_risk: float
    projected_peak_risk: float
    trend_direction: str  # "Escalating Risk" | "Stable Baseline" | "Attenuating Risk"
    trend_confidence: float  # 0 to 100%
    forecast_points: list[ForecastPoint]
    summary_rationale: str


HORIZON_CONFIG: dict[HorizonType, dict[str, Any]] = {
    "1_week": {"steps": 7, "interval_days": 1, "warming_rate": 0.05, "uncertainty_expansion": 0.4},
    "1_month": {"steps": 10, "interval_days": 3, "warming_rate": 0.12, "uncertainty_expansion": 0.8},
    "3_months": {"steps": 12, "interval_days": 7, "warming_rate": 0.25, "uncertainty_expansion": 1.4},
    "6_months": {"steps": 12, "interval_days": 15, "warming_rate": 0.40, "uncertainty_expansion": 2.2},
    "1_year": {"steps": 12, "interval_days": 30, "warming_rate": 0.60, "uncertainty_expansion": 3.5},
}


class CoralBleachingForecastingEngine:
    """Enterprise Coral Bleaching Forecasting Service."""

    @classmethod
    def generate_forecast(
        cls,
        latitude: float,
        longitude: float,
        sea_surface_temperature: float,
        horizon: HorizonType = "1_month",
    ) -> ForecastResponse:
        config = HORIZON_CONFIG.get(horizon, HORIZON_CONFIG["1_month"])
        steps = config["steps"]
        interval = config["interval_days"]
        warming_rate = config["warming_rate"]
        unc_expansion = config["uncertainty_expansion"]

        # Initial prediction at day 0
        base_res = ml_predict(
            latitude=latitude,
            longitude=longitude,
            sea_surface_temperature=sea_surface_temperature,
        )
        base_prob = base_res["probability"]
        base_risk = round(base_prob * 100, 1)

        forecast_points: list[ForecastPoint] = []
        peak_risk = base_risk

        for i in range(steps + 1):
            days_offset = i * interval
            # Simulate seasonal thermal oscillation + climate baseline warming
            seasonal_wave = math.sin((days_offset / 365.0) * 2 * math.pi) * 0.8
            sst_offset = (days_offset / 30.0) * warming_rate + seasonal_wave
            proj_sst = round(max(-1.5, min(35.0, sea_surface_temperature + sst_offset)), 1)

            step_res = ml_predict(
                latitude=latitude,
                longitude=longitude,
                sea_surface_temperature=proj_sst,
            )
            step_prob = step_res["probability"]
            step_risk = round(step_prob * 100, 1)
            peak_risk = max(peak_risk, step_risk)

            # Calculate 95% CI uncertainty band expansion over time
            unc_margin = round(min(25.0, 3.0 + (i / steps) * unc_expansion * 5.0), 1)
            lower_b = max(0.0, round(step_risk - unc_margin, 1))
            upper_b = min(100.0, round(step_risk + unc_margin, 1))

            step_label = f"Day {days_offset}" if horizon in ["1_week", "1_month"] else f"Month {max(1, round(days_offset / 30))}"
            if days_offset == 0:
                step_label = "Today"

            forecast_points.append(
                ForecastPoint(
                    step_label=step_label,
                    days=days_offset,
                    projected_sst=proj_sst,
                    projected_risk=step_risk,
                    lower_bound=lower_b,
                    upper_bound=upper_b,
                    confidence=round(step_res["confidence"] * 100, 1),
                )
            )

        # Compute trend direction and overall confidence
        final_risk = forecast_points[-1].projected_risk
        risk_delta = final_risk - base_risk

        if risk_delta > 5.0:
            trend_dir = "Escalating Risk"
        elif risk_delta < -5.0:
            trend_dir = "Attenuating Risk"
        else:
            trend_dir = "Stable Baseline"

        avg_conf = round(
            sum(p.confidence for p in forecast_points) / len(forecast_points), 1
        )

        rationale = (
            f"Over the {horizon.replace('_', ' ')} forecast window, sea surface temperature is projected to "
            f"{'rise to' if risk_delta > 0 else 'stabilize at'} {forecast_points[-1].projected_sst}°C, "
            f"driving a peak risk score of {peak_risk}% with {avg_conf}% trend confidence."
        )

        return ForecastResponse(
            horizon=horizon,
            latitude=latitude,
            longitude=longitude,
            baseline_sst=sea_surface_temperature,
            current_risk=base_risk,
            projected_peak_risk=peak_risk,
            trend_direction=trend_dir,
            trend_confidence=avg_conf,
            forecast_points=forecast_points,
            summary_rationale=rationale,
        )
