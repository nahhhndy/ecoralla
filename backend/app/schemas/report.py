"""Report and Location Pydantic schemas."""
from __future__ import annotations

from pydantic import BaseModel, field_validator


class GenerateReportRequest(BaseModel):
    prediction_id: str
    title: str | None = None


class ReportResponse(BaseModel):
    id: str
    title: str
    status: str
    prediction_id: str | None = None
    file_path: str | None = None
    created_at: str

    model_config = {"from_attributes": True}


class CreateLocationRequest(BaseModel):
    name: str
    latitude: float
    longitude: float
    description: str | None = None

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


class LocationResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    description: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
