"""Health check and model status endpoint."""
from __future__ import annotations

import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.dependencies import get_db
from src import model_loader

router = APIRouter()
_START_TIME = time.time()


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "timestamp": datetime.now(UTC).isoformat(),
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - _START_TIME, 1),
    }


@router.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)) -> dict:
    start = time.time()
    await db.execute(text("SELECT 1"))
    latency_ms = round((time.time() - start) * 1000, 2)
    return {"status": "ok", "database": "connected", "latency_ms": latency_ms}


@router.get("/health/model")
async def health_model() -> dict:
    try:
        model = model_loader.get_model()
        model_loaded = model is not None
    except Exception:
        model_loaded = False

    return {
        "status": "ok" if model_loaded else "not_loaded",
        "model_loaded": model_loaded,
        "model_name": "EcoRal XGBoost Classifier",
    }
