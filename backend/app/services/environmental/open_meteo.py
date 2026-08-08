"""Open-Meteo Marine Environmental Provider."""
from __future__ import annotations

import math
from typing import Optional
import httpx

from backend.app.core.logging import get_logger
from backend.app.services.environmental.base import (
    BaseEnvironmentalProvider,
    EnvironmentalTelemetryData,
)
from backend.app.services.environmental.geocoding import GeocodingProvider

logger = get_logger(__name__)


class OpenMeteoMarineProvider(BaseEnvironmentalProvider):
    """Fetches live marine SST and wave telemetry from Open-Meteo API."""

    def __init__(self):
        super().__init__(name="Open-Meteo Marine API")

    async def fetch_telemetry(
        self, latitude: float, longitude: float
    ) -> Optional[EnvironmentalTelemetryData]:
        meta = await GeocodingProvider.get_region_metadata(latitude, longitude)
        sst: Optional[float] = None
        salinity: float = 34.5
        wave_height: float = 1.1
        is_live = False

        # Attempt live API call to Open-Meteo Marine
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = (
                    "https://marine-api.open-meteo.com/v1/marine"
                    f"?latitude={latitude:.2f}&longitude={longitude:.2f}"
                    "&hourly=sea_surface_temperature,wave_height&forecast_days=1"
                )
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    hourly_sst = data.get("hourly", {}).get(
                        "sea_surface_temperature", []
                    )
                    valid_sst = [t for t in hourly_sst if t is not None]
                    if valid_sst:
                        sst = round(sum(valid_sst) / len(valid_sst), 1)
                        is_live = True

                    hourly_waves = data.get("hourly", {}).get("wave_height", [])
                    valid_waves = [w for w in hourly_waves if w is not None]
                    if valid_waves:
                        wave_height = round(sum(valid_waves) / len(valid_waves), 2)
        except Exception as e:
            logger.warning("Open-Meteo live API warning", error=str(e))

        # Fallback to latitudinal physical SST model if live API unavailable
        if sst is None:
            abs_lat = abs(latitude)
            base_sst = 29.5 - (abs_lat / 90.0) * 28.0
            noise = (math.sin(latitude * 0.1) + math.cos(longitude * 0.1)) * 0.8
            sst = round(max(-1.5, min(34.0, base_sst + noise)), 1)
            is_live = False

        return EnvironmentalTelemetryData(
            latitude=latitude,
            longitude=longitude,
            region_name=meta["region_name"],
            sea_surface_temperature=sst,
            ocean_metadata={
                "ocean_basin": meta["ocean_basin"],
                "salinity_psu": salinity,
                "wave_height_m": wave_height,
                "live_status": "live" if is_live else "estimated_fallback",
            },
            provider_name=self.name,
            is_live=is_live,
        )
