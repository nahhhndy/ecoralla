"""Analytics Pydantic schemas."""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class AnalyticsStats(BaseModel):
    total_predictions: int
    high_risk_count: int
    low_risk_count: int
    high_risk_percentage: float
    avg_confidence: float
    avg_probability: float


class TrendPoint(BaseModel):
    date: str
    total: int
    high_risk: int
    low_risk: int
    avg_confidence: float


class AnalyticsTrend(BaseModel):
    period: str
    data: list[TrendPoint]


class MonthlyRatePoint(BaseModel):
    month: str
    bleaching_rate_pct: float
    total: int


class HistogramBin(BaseModel):
    bin_range: str
    count: int
    high_risk_count: int


class RiskyLocationEntry(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    max_sea_surface_temperature: float
    risk_probability: float
    risk_label: str


class DetailedAnalyticsResponse(BaseModel):
    stats: AnalyticsStats
    prediction_trend: list[TrendPoint]
    confidence_trend: list[TrendPoint]
    monthly_bleaching_rate: list[MonthlyRatePoint]
    sst_histogram: list[HistogramBin]
    top_risky_locations: list[RiskyLocationEntry]


class FeatureInfo(BaseModel):
    name: str
    importance: float
    mean_shap: float


class ModelInfo(BaseModel):
    model_config = {"protected_namespaces": ()}

    model_name: str
    version: str
    roc_auc: float
    avg_precision: float
    cross_val_accuracy: float
    cross_val_std: float
    features: list[FeatureInfo]
    threshold: float
