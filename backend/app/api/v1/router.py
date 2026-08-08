"""Central API v1 router aggregator."""
from __future__ import annotations

from fastapi import APIRouter

from backend.app.api.v1.assistant import router as assistant_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.environmental import router as environmental_router
from backend.app.api.v1.grid import router as grid_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.forecasting import router as forecasting_router
from backend.app.api.v1.history import (
    analytics_router,
    history_router,
    locations_router,
    reports_router,
)
from backend.app.api.v1.intelligence import router as intelligence_router
from backend.app.api.v1.predict import router as predict_router
from backend.app.api.v1.workspace import router as workspace_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="", tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(
    assistant_router, prefix="/assistant", tags=["AI Assistant"]
)
api_router.include_router(
    environmental_router, prefix="/environmental", tags=["Environmental Telemetry"]
)
api_router.include_router(
    forecasting_router, prefix="/forecasting", tags=["Coral Bleaching Forecasting"]
)
api_router.include_router(grid_router, prefix="/grid", tags=["Global Ocean Risk Engine"])
api_router.include_router(
    intelligence_router, prefix="/intelligence", tags=["Global Background Intelligence"]
)
api_router.include_router(predict_router, prefix="/predict", tags=["Predictions"])
api_router.include_router(history_router, prefix="/history", tags=["History"])
api_router.include_router(locations_router, prefix="/locations", tags=["Locations"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(workspace_router, prefix="/workspace", tags=["Research Workspace"])
