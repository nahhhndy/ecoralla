"""Predict API endpoints."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.dependencies import get_db, get_optional_user
from backend.app.models.user import User
from backend.app.schemas.predict import PredictRequest, PredictResponse
from backend.app.services.prediction import PredictionService

router = APIRouter()


@router.post("", response_model=PredictResponse)
async def predict(
    request: PredictRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> PredictResponse:
    service = PredictionService(db)
    return await service.predict(request, user=current_user)


@router.get("/{prediction_id}", response_model=PredictResponse)
async def get_prediction(
    prediction_id: str,
    db: AsyncSession = Depends(get_db),
) -> PredictResponse:

    from fastapi import HTTPException, status

    from backend.app.repositories.prediction import PredictionRepository
    from backend.app.schemas.predict import ShapData

    repo = PredictionRepository(db)
    pred = await repo.get_by_id(prediction_id)
    if not pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found"
        )
    shap_data = ShapData(**pred.shap_values) if pred.shap_values else None
    created_at_dt = getattr(pred, "created_at", None) or datetime.now(UTC)
    if created_at_dt.tzinfo is None:
        created_at_dt = created_at_dt.replace(tzinfo=UTC)

    return PredictResponse(
        id=pred.id,
        prediction=pred.prediction,
        probability=pred.probability,
        confidence=pred.confidence,
        label=pred.label,
        latitude=pred.latitude,
        longitude=pred.longitude,
        sea_surface_temperature=pred.sea_surface_temperature,
        location_name=pred.location_name,
        shap_data=shap_data,
        explanation=pred.explanation,
        created_at=created_at_dt.isoformat(),
    )
