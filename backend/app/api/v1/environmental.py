"""Environmental Telemetry API router."""
from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.app.services.environmental import (
    EnvironmentalTelemetryData,
    EnvironmentalTelemetryService,
)

router = APIRouter()


class TelemetryResponse(BaseModel):
    latitude: float
    longitude: float
    region_name: str
    sea_surface_temperature: float
    ocean_metadata: dict[str, Any]
    provider_name: str
    is_live: bool


@router.get("/telemetry", response_model=TelemetryResponse)
async def get_telemetry(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> TelemetryResponse:
    service = EnvironmentalTelemetryService()
    data: EnvironmentalTelemetryData = await service.get_telemetry(
        latitude, longitude
    )
    return TelemetryResponse(
        latitude=data.latitude,
        longitude=data.longitude,
        region_name=data.region_name,
        sea_surface_temperature=data.sea_surface_temperature,
        ocean_metadata=data.ocean_metadata,
        provider_name=data.provider_name,
        is_live=data.is_live,
    )
