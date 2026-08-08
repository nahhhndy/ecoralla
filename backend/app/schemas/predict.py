"""Prediction Pydantic schemas."""
from __future__ import annotations

from pydantic import BaseModel, field_validator


class PredictRequest(BaseModel):
    latitude: float
    longitude: float
    sea_surface_temperature: float
    location_name: str | None = None

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lon(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v

    @field_validator("sea_surface_temperature")
    @classmethod
    def validate_sst(cls, v: float) -> float:
        if not -2 <= v <= 40:
            raise ValueError("SST must be between -2 and 40 °C")
        return v


class ShapData(BaseModel):
    feature_names: list[str]
    shap_values: list[float]
    base_value: float
    prediction_value: float


class PredictResponse(BaseModel):
    id: str
    prediction: int
    probability: float
    confidence: float
    label: str
    latitude: float
    longitude: float
    sea_surface_temperature: float
    location_name: str | None = None
    shap_data: ShapData | None = None
    explanation: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
