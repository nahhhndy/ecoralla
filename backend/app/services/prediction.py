"""PredictionService wrapping ML pipeline, SHAP explainability, and database persistence."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import get_logger
from backend.app.repositories.prediction import PredictionRepository
from backend.app.schemas.predict import PredictRequest, PredictResponse, ShapData
from backend.app.services.explainability import ExplainabilityEngine
from src.predictor import predict as ml_predict
from src.visualization import compute_shap_values, natural_language_explanation

if TYPE_CHECKING:
    from backend.app.models.user import User

logger = get_logger(__name__)


class PredictionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.prediction_repo = PredictionRepository(db)

    async def predict(
        self,
        request: PredictRequest,
        user: User | None = None,
    ) -> PredictResponse:
        # ML core prediction
        result = ml_predict(
            latitude=request.latitude,
            longitude=request.longitude,
            sea_surface_temperature=request.sea_surface_temperature,
        )

        # SHAP calculation & Explainability Engine
        shap_data: ShapData | None = None
        explanation: str | None = None
        shap_dict: dict | None = None

        try:
            shap_dict = compute_shap_values(
                latitude=request.latitude,
                longitude=request.longitude,
                sea_surface_temperature=request.sea_surface_temperature,
            )
            shap_data = ShapData(**shap_dict)
            insight = ExplainabilityEngine.generate_explanation(
                prediction=result["prediction"],
                probability=result["probability"],
                confidence=result["confidence"],
                latitude=request.latitude,
                longitude=request.longitude,
                sea_surface_temperature=request.sea_surface_temperature,
                shap_dict=shap_dict,
                location_name=request.location_name,
            )
            explanation = insight.formatted_text
        except Exception as e:
            logger.warning("SHAP computation warning", error=str(e))
            # Fallback to ExplainabilityEngine without SHAP dict
            insight = ExplainabilityEngine.generate_explanation(
                prediction=result["prediction"],
                probability=result["probability"],
                confidence=result["confidence"],
                latitude=request.latitude,
                longitude=request.longitude,
                sea_surface_temperature=request.sea_surface_temperature,
                location_name=request.location_name,
            )
            explanation = insight.formatted_text

        # Save prediction
        prediction_record = await self.prediction_repo.create(
            user_id=user.id if user else None,
            latitude=request.latitude,
            longitude=request.longitude,
            sea_surface_temperature=request.sea_surface_temperature,
            prediction=result["prediction"],
            probability=result["probability"],
            confidence=result["confidence"],
            label=result["label"],
            shap_values=shap_dict,
            explanation=explanation,
            location_name=request.location_name,
        )

        logger.info(
            "Prediction created",
            prediction_id=prediction_record.id,
            label=result["label"],
            user_id=user.id if user else "anonymous",
        )

        created_at_dt = getattr(prediction_record, "created_at", None) or datetime.now(UTC)
        if created_at_dt.tzinfo is None:
            created_at_dt = created_at_dt.replace(tzinfo=UTC)
        pred_id = getattr(prediction_record, "id", None) or "preview-id"

        return PredictResponse(
            id=pred_id,
            prediction=result["prediction"],
            probability=result["probability"],
            confidence=result["confidence"],
            label=result["label"],
            latitude=request.latitude,
            longitude=request.longitude,
            sea_surface_temperature=request.sea_surface_temperature,
            location_name=request.location_name,
            shap_data=shap_data,
            explanation=explanation,
            created_at=created_at_dt.isoformat(),
        )
