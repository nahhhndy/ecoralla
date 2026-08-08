"""Global Background Intelligence API router."""
from __future__ import annotations

import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks

from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.services.background_intelligence import (
    GlobalBackgroundIntelligenceEngine,
    IntelligenceJobStatus,
    RegionSnapshot,
)

router = APIRouter()


@router.get("/global-summary", response_model=list[RegionSnapshot])
def get_global_summary(
    current_user: User = Depends(get_current_user),
) -> list[RegionSnapshot]:
    return GlobalBackgroundIntelligenceEngine.get_summary()


@router.get("/status", response_model=IntelligenceJobStatus)
def get_job_status(
    current_user: User = Depends(get_current_user),
) -> IntelligenceJobStatus:
    return GlobalBackgroundIntelligenceEngine.get_job_status()


@router.post("/trigger-scan", response_model=IntelligenceJobStatus)
async def trigger_intelligence_scan(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> IntelligenceJobStatus:
    # Trigger background worker task
    background_tasks.add_task(GlobalBackgroundIntelligenceEngine.run_scan)
    status = GlobalBackgroundIntelligenceEngine.get_job_status()
    status.status = "running"
    status.progress_percentage = 10.0
    return status
