"""History, Locations, Analytics, and Reports API endpoints."""
from __future__ import annotations

import math

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.dependencies import get_current_user, get_db
from backend.app.models.user import User
from backend.app.repositories.location import LocationRepository
from backend.app.repositories.prediction import PredictionRepository
from backend.app.repositories.report import ReportRepository
from backend.app.schemas.analytics import (
    AnalyticsStats,
    AnalyticsTrend,
    DetailedAnalyticsResponse,
    ModelInfo,
)
from backend.app.schemas.history import PaginatedHistory, PredictionHistoryItem
from backend.app.schemas.report import (
    CreateLocationRequest,
    GenerateReportRequest,
    LocationResponse,
    ReportResponse,
)
from backend.app.services.analytics import AnalyticsService
from backend.app.services.report import ReportService

# ─── History Router ─────────────────────────────────────────────────────────────
history_router = APIRouter()


@history_router.get("", response_model=PaginatedHistory)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedHistory:
    repo = PredictionRepository(db)
    items, total = await repo.get_user_history(current_user.id, page, page_size)
    history_items = [
        PredictionHistoryItem(
            id=item.id,
            prediction=item.prediction,
            probability=item.probability,
            confidence=item.confidence,
            label=item.label,
            latitude=item.latitude,
            longitude=item.longitude,
            sea_surface_temperature=item.sea_surface_temperature,
            location_name=item.location_name,
            explanation=item.explanation,
            created_at=item.created_at.isoformat(),
        )
        for item in items
    ]
    return PaginatedHistory(
        items=history_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@history_router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import Response
    repo = PredictionRepository(db)
    pred = await repo.get_by_id(prediction_id)
    if not pred or pred.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found"
        )
    await repo.delete(pred)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Locations Router ───────────────────────────────────────────────────────────
locations_router = APIRouter()


@locations_router.get("", response_model=list[LocationResponse])
async def get_locations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    repo = LocationRepository(db)
    locs = await repo.get_user_locations(current_user.id)
    return [
        LocationResponse(
            id=l.id,
            name=l.name,
            latitude=l.latitude,
            longitude=l.longitude,
            description=l.description,
            created_at=l.created_at.isoformat(),
        )
        for l in locs
    ]


@locations_router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    req: CreateLocationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LocationResponse:
    repo = LocationRepository(db)
    loc = await repo.create(
        user_id=current_user.id,
        name=req.name,
        latitude=req.latitude,
        longitude=req.longitude,
        description=req.description,
    )
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        latitude=loc.latitude,
        longitude=loc.longitude,
        description=loc.description,
        created_at=loc.created_at.isoformat(),
    )


@locations_router.delete("/{location_id}")
async def delete_location(
    location_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import Response
    repo = LocationRepository(db)
    loc = await repo.get_by_id(location_id)
    if not loc or loc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )
    await repo.delete(loc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Analytics Router ───────────────────────────────────────────────────────────
analytics_router = APIRouter()


@analytics_router.get("/stats", response_model=AnalyticsStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsStats:
    service = AnalyticsService(db)
    return await service.get_stats(current_user.id)


@analytics_router.get("/trends", response_model=AnalyticsTrend)
async def get_trends(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsTrend:
    service = AnalyticsService(db)
    return await service.get_trends(current_user.id, days)


@analytics_router.get("/detailed", response_model=DetailedAnalyticsResponse)
async def get_detailed_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DetailedAnalyticsResponse:
    service = AnalyticsService(db)
    return await service.get_detailed_analytics(current_user.id)


@analytics_router.get("/model-info", response_model=ModelInfo)
async def get_model_info() -> ModelInfo:
    return AnalyticsService.get_model_info()


# ─── Reports Router ─────────────────────────────────────────────────────────────
reports_router = APIRouter()


@reports_router.get("", response_model=list[ReportResponse])
async def get_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReportResponse]:
    repo = ReportRepository(db)
    reports = await repo.get_user_reports(current_user.id)
    return [
        ReportResponse(
            id=r.id,
            title=r.title,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            prediction_id=r.prediction_id,
            file_path=r.file_path,
            created_at=r.created_at.isoformat(),
        )
        for r in reports
    ]


@reports_router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_report(
    req: GenerateReportRequest,
    bg_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    repo = ReportRepository(db)
    title = req.title or f"Bleaching Risk Report - {req.prediction_id[:8]}"
    report = await repo.create(
        user_id=current_user.id,
        prediction_id=req.prediction_id,
        title=title,
    )
    service = ReportService()
    bg_tasks.add_task(service.generate, report.id, req.prediction_id, title)
    return ReportResponse(
        id=report.id,
        title=report.title,
        status="pending",
        prediction_id=report.prediction_id,
        created_at=report.created_at.isoformat(),
    )


@reports_router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    from pathlib import Path
    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    if report.status != "ready" or not report.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not ready yet"
        )
    file_path = Path(report.file_path)
    if not file_path.exists() or file_path.stat().st_size == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report file missing or empty on disk"
        )
    return FileResponse(
        path=str(file_path),
        filename=f"{report.title}.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report.title}.pdf"',
            "Content-Type": "application/pdf",
        },
    )


@reports_router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from pathlib import Path
    from fastapi import Response

    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    if report.file_path:
        fp = Path(report.file_path)
        if not fp.is_absolute():
            fp = Path.cwd() / fp
        if fp.exists():
            try:
                fp.unlink()
            except Exception:
                pass
    await repo.delete(report)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
