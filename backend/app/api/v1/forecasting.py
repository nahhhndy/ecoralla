"""Coral Bleaching Forecasting API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.services.forecasting import (
    CoralBleachingForecastingEngine,
    ForecastResponse,
    HorizonType,
)

router = APIRouter()


class ForecastRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    sea_surface_temperature: float = Field(..., ge=-2.0, le=40.0)
    horizon: HorizonType = "1_month"


@router.post("/predict-forecast", response_model=ForecastResponse)
def predict_forecast(
    req: ForecastRequest,
    current_user: User = Depends(get_current_user),
) -> ForecastResponse:
    return CoralBleachingForecastingEngine.generate_forecast(
        latitude=req.latitude,
        longitude=req.longitude,
        sea_surface_temperature=req.sea_surface_temperature,
        horizon=req.horizon,
    )
