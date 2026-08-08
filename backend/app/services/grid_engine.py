"""Global Ocean Risk & Regional Grid Batch Prediction Engine.

Generates spatial grids across geographic bounding boxes, coastlines, or reef systems
and executes parallel ML inference without blocking the async event loop.
"""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional
from pydantic import BaseModel, Field

from backend.app.services.environmental import EnvironmentalTelemetryService
from src.predictor import predict as ml_predict

_EXECUTOR = ThreadPoolExecutor(max_workers=8)


class GridPointResult(BaseModel):
    latitude: float
    longitude: float
    sea_surface_temperature: float
    prediction: int
    probability: float
    confidence: float
    label: str


class RegionGridRequest(BaseModel):
    region_name: str = "Custom Ocean Region"
    min_latitude: float = Field(..., ge=-90, le=90)
    max_latitude: float = Field(..., ge=-90, le=90)
    min_longitude: float = Field(..., ge=-180, le=180)
    max_longitude: float = Field(..., ge=-180, le=180)
    grid_resolution: float = Field(0.5, ge=0.1, le=2.0)  # step in degrees
    default_sst: Optional[float] = None


class RegionGridResponse(BaseModel):
    region_name: str
    min_latitude: float
    max_latitude: float
    min_longitude: float
    max_longitude: float
    grid_resolution: float
    total_grid_points: int
    high_risk_points: int
    low_risk_points: int
    high_risk_percentage: float
    avg_probability: float
    grid_results: list[GridPointResult]


class GlobalOceanRiskEngine:
    """High-performance parallel inference engine for regional ocean grids."""

    @staticmethod
    async def predict_region(req: RegionGridRequest) -> RegionGridResponse:
        # 1. Generate grid coordinates
        lats: list[float] = []
        curr_lat = req.min_latitude
        while curr_lat <= req.max_latitude + 1e-5:
            lats.append(round(curr_lat, 2))
            curr_lat += req.grid_resolution

        lngs: list[float] = []
        curr_lng = req.min_longitude
        while curr_lng <= req.max_longitude + 1e-5:
            lngs.append(round(curr_lng, 2))
            curr_lng += req.grid_resolution

        coords_list: list[tuple[float, float]] = [
            (lat, lng) for lat in lats for lng in lngs
        ]

        # Cap total grid points per request to 1500 for fast response
        coords_list = coords_list[:1500]

        # 2. Parallel inference function
        def _predict_single(lat: float, lng: float) -> GridPointResult:
            # Latitudinal SST fallback model if SST not supplied
            if req.default_sst is not None:
                sst = req.default_sst
            else:
                abs_lat = abs(lat)
                sst = round(max(-1.5, min(34.0, 29.5 - (abs_lat / 90.0) * 28.0)), 1)

            res = ml_predict(
                latitude=lat,
                longitude=lng,
                sea_surface_temperature=sst,
            )
            return GridPointResult(
                latitude=lat,
                longitude=lng,
                sea_surface_temperature=sst,
                prediction=res["prediction"],
                probability=res["probability"],
                confidence=res["confidence"],
                label=res["label"],
            )

        # 3. Execute parallel ThreadPool inference
        loop = asyncio.get_running_loop()
        tasks = [
            loop.run_in_executor(_EXECUTOR, _predict_single, lat, lng)
            for lat, lng in coords_list
        ]
        results: list[GridPointResult] = await asyncio.gather(*tasks)

        # 4. Aggregations
        total = len(results)
        high_risk_cnt = sum(1 for r in results if r.prediction == 1)
        low_risk_cnt = total - high_risk_cnt
        avg_prob = (
            round(sum(r.probability for r in results) / total, 3) if total > 0 else 0.0
        )
        high_risk_pct = round((high_risk_cnt / total) * 100, 1) if total > 0 else 0.0

        return RegionGridResponse(
            region_name=req.region_name,
            min_latitude=req.min_latitude,
            max_latitude=req.max_latitude,
            min_longitude=req.min_longitude,
            max_longitude=req.max_longitude,
            grid_resolution=req.grid_resolution,
            total_grid_points=total,
            high_risk_points=high_risk_cnt,
            low_risk_points=low_risk_cnt,
            high_risk_percentage=high_risk_pct,
            avg_probability=avg_prob,
            grid_results=results,
        )
