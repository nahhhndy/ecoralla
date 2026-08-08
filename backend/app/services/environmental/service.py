"""Central Environmental Telemetry Orchestrator Service."""
from __future__ import annotations

from typing import Optional
from backend.app.services.environmental.base import (
    BaseEnvironmentalProvider,
    EnvironmentalTelemetryData,
)
from backend.app.services.environmental.open_meteo import OpenMeteoMarineProvider


class EnvironmentalTelemetryService:
    """Orchestrates pluggable environmental data providers with automatic fallback."""

    def __init__(self):
        self.providers: list[BaseEnvironmentalProvider] = [
            OpenMeteoMarineProvider(),
        ]

    def register_provider(self, provider: BaseEnvironmentalProvider) -> None:
        """Register additional environmental API providers dynamically."""
        self.providers.append(provider)

    async def get_telemetry(
        self, latitude: float, longitude: float
    ) -> EnvironmentalTelemetryData:
        """Query providers sequentially until a valid telemetry dataset is retrieved."""
        for provider in self.providers:
            try:
                data = await provider.fetch_telemetry(latitude, longitude)
                if data is not None:
                    return data
            except Exception:
                continue

        # Ultimate fallback
        return EnvironmentalTelemetryData(
            latitude=latitude,
            longitude=longitude,
            region_name=f"Ocean Location ({latitude:.2f}°, {longitude:.2f}°)",
            sea_surface_temperature=28.0,
            ocean_metadata={
                "ocean_basin": "Global Ocean",
                "salinity_psu": 34.5,
                "wave_height_m": 1.0,
                "live_status": "manual_fallback",
            },
            provider_name="Fallback Telemetry Engine",
            is_live=False,
        )
