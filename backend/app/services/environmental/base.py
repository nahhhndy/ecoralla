"""Abstract Base Environmental Provider interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional
from pydantic import BaseModel


class EnvironmentalTelemetryData(BaseModel):
    latitude: float
    longitude: float
    region_name: str
    sea_surface_temperature: float
    ocean_metadata: dict[str, Any]
    provider_name: str
    is_live: bool = True


class BaseEnvironmentalProvider(ABC):
    """Abstract Base Class for pluggable Environmental API Providers."""

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def fetch_telemetry(
        self, latitude: float, longitude: float
    ) -> Optional[EnvironmentalTelemetryData]:
        """Fetch environmental telemetry for given coordinates."""
        pass
