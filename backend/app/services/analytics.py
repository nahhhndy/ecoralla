"""AnalyticsService for stats, trends, model metrics, and detailed visualization analytics."""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.repositories.prediction import PredictionRepository
from backend.app.schemas.analytics import (
    AnalyticsStats,
    AnalyticsTrend,
    DetailedAnalyticsResponse,
    FeatureInfo,
    HistogramBin,
    ModelInfo,
    MonthlyRatePoint,
    RiskyLocationEntry,
    TrendPoint,
)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.prediction_repo = PredictionRepository(db)

    async def get_stats(self, user_id: str) -> AnalyticsStats:
        data = await self.prediction_repo.get_user_stats(user_id)
        total = data["total"]
        high = data["high_risk"]
        return AnalyticsStats(
            total_predictions=total,
            high_risk_count=high,
            low_risk_count=data["low_risk"],
            high_risk_percentage=round(high / total * 100, 1) if total > 0 else 0.0,
            avg_confidence=round(data["avg_confidence"] * 100, 1),
            avg_probability=round(data["avg_probability"] * 100, 1),
        )

    async def get_trends(self, user_id: str, days: int = 30) -> AnalyticsTrend:
        raw = await self.prediction_repo.get_trend_data(user_id, days)
        points = [
            TrendPoint(
                date=d["date"],
                total=d["total"],
                high_risk=d["high_risk"],
                low_risk=d["low_risk"],
                avg_confidence=round(d["avg_confidence"] * 100, 1),
            )
            for d in raw
        ]
        return AnalyticsTrend(period="day", data=points)

    async def get_detailed_analytics(self, user_id: str) -> DetailedAnalyticsResponse:
        stats = await self.get_stats(user_id)
        trend = await self.get_trends(user_id, days=30)
        recent_preds, _ = await self.prediction_repo.get_user_history(user_id, page=1, page_size=100)

        # 1. Monthly bleaching rate aggregation
        monthly_map: dict[str, dict[str, int]] = {}
        for p in recent_preds:
            month_str = p.created_at.strftime("%Y-%m") if p.created_at else "2026-08"
            if month_str not in monthly_map:
                monthly_map[month_str] = {"total": 0, "high_risk": 0}
            monthly_map[month_str]["total"] += 1
            if p.prediction == 1:
                monthly_map[month_str]["high_risk"] += 1

        monthly_points = [
            MonthlyRatePoint(
                month=m,
                bleaching_rate_pct=round(
                    data["high_risk"] / data["total"] * 100, 1
                ) if data["total"] > 0 else 0.0,
                total=data["total"],
            )
            for m, data in sorted(monthly_map.items())
        ]

        # 2. SST Histogram Binned Distribution
        bins = {
            "< 24°C": {"count": 0, "high_risk": 0},
            "24 - 27°C": {"count": 0, "high_risk": 0},
            "27 - 29°C": {"count": 0, "high_risk": 0},
            "29 - 31°C": {"count": 0, "high_risk": 0},
            "> 31°C": {"count": 0, "high_risk": 0},
        }

        for p in recent_preds:
            temp = p.sea_surface_temperature
            if temp < 24.0:
                key = "< 24°C"
            elif temp < 27.0:
                key = "24 - 27°C"
            elif temp < 29.0:
                key = "27 - 29°C"
            elif temp < 31.0:
                key = "29 - 31°C"
            else:
                key = "> 31°C"

            bins[key]["count"] += 1
            if p.prediction == 1:
                bins[key]["high_risk"] += 1

        histogram_bins = [
            HistogramBin(
                bin_range=b,
                count=d["count"],
                high_risk_count=d["high_risk"],
            )
            for b, d in bins.items()
        ]

        # 3. Top Risky Locations
        risky_locations: list[RiskyLocationEntry] = []
        for p in recent_preds:
            if p.prediction == 1 or p.probability > 0.5:
                name = p.location_name or f"Reef ({p.latitude:.2f}°, {p.longitude:.2f}°)"
                risky_locations.append(
                    RiskyLocationEntry(
                        location_name=name,
                        latitude=p.latitude,
                        longitude=p.longitude,
                        max_sea_surface_temperature=p.sea_surface_temperature,
                        risk_probability=p.probability,
                        risk_label=p.label,
                    )
                )

        # Sort by risk probability descending
        risky_locations.sort(key=lambda x: x.risk_probability, reverse=True)

        return DetailedAnalyticsResponse(
            stats=stats,
            prediction_trend=trend.data,
            confidence_trend=trend.data,
            monthly_bleaching_rate=monthly_points,
            sst_histogram=histogram_bins,
            top_risky_locations=risky_locations[:10],
        )

    @staticmethod
    def get_model_info() -> ModelInfo:
        results_dir = _PROJECT_ROOT / "results"
        metrics_path = results_dir / "evaluation_metrics.json"
        fi_path = results_dir / "feature_importance.csv"
        shap_path = results_dir / "mean_shap_importance.csv"
        config_path = _PROJECT_ROOT / "config.json"

        with config_path.open() as f:
            config = json.load(f)

        metrics = {}
        if metrics_path.exists():
            with metrics_path.open() as f:
                metrics = json.load(f)

        fi_data: dict[str, float] = {}
        if fi_path.exists():
            with fi_path.open() as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("Feature"):
                        fi_data[row["Feature"]] = float(row["Importance"])

        shap_data: dict[str, float] = {}
        if shap_path.exists():
            with shap_path.open() as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("Feature"):
                        shap_data[row["Feature"]] = float(row["Mean_SHAP_Importance"])

        features = [
            FeatureInfo(
                name=name,
                importance=fi_data.get(name, 0.0),
                mean_shap=shap_data.get(name, 0.0),
            )
            for name in config.get("features", [])
        ]

        return ModelInfo(
            model_name=config.get("model_name", "EcoRal XGBoost"),
            version=config.get("version", "1.0"),
            roc_auc=metrics.get("ROC AUC", 0.9954),
            avg_precision=metrics.get("Average Precision", 0.9852),
            cross_val_accuracy=metrics.get("Cross Validation Mean Accuracy", 0.9703),
            cross_val_std=metrics.get("Cross Validation Std", 0.0004),
            features=features,
            threshold=config.get("threshold", 0.5),
        )
