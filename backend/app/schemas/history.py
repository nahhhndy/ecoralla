"""History Pydantic schemas."""
from __future__ import annotations

from pydantic import BaseModel


class PredictionHistoryItem(BaseModel):
    id: str
    prediction: int
    probability: float
    confidence: float
    label: str
    latitude: float
    longitude: float
    sea_surface_temperature: float
    location_name: str | None = None
    explanation: str | None = None
    created_at: str

    model_config = {"from_attributes": True}


class PaginatedHistory(BaseModel):
    items: list[PredictionHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
