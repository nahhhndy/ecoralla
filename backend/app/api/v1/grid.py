"""Global Ocean Risk & Regional Grid API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.services.grid_engine import (
    GlobalOceanRiskEngine,
    RegionGridRequest,
    RegionGridResponse,
)

router = APIRouter()


@router.post("/predict-region", response_model=RegionGridResponse)
async def predict_region_grid(
    req: RegionGridRequest,
    current_user: User = Depends(get_current_user),
) -> RegionGridResponse:
    return await GlobalOceanRiskEngine.predict_region(req)
