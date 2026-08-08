"""Geocoding Provider for resolving ocean region names and metadata."""
from __future__ import annotations

import httpx
from backend.app.core.logging import get_logger

logger = get_logger(__name__)


class GeocodingProvider:
    """Resolves ocean region names and geographic metadata from coordinates."""

    @staticmethod
    async def get_region_metadata(latitude: float, longitude: float) -> dict[str, str]:
        region_name = GeocodingProvider._heuristic_region_name(latitude, longitude)
        ocean_basin = GeocodingProvider._heuristic_ocean_basin(latitude, longitude)

        # Attempt Nominatim reverse geocoding
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = (
                    "https://nominatim.openstreetmap.org/reverse"
                    f"?format=json&lat={latitude}&lon={longitude}&zoom=5"
                )
                headers = {"User-Agent": "EcoRal-Environmental-Platform/1.0"}
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    display_name = data.get("display_name")
                    if display_name:
                        parts = display_name.split(",")
                        resolved = ", ".join(parts[:2]).strip()
                        if resolved:
                            region_name = resolved
        except Exception as e:
            logger.debug("Nominatim geocoding fallback used", error=str(e))

        return {
            "region_name": region_name,
            "ocean_basin": ocean_basin,
        }

    @staticmethod
    def _heuristic_region_name(lat: float, lon: float) -> str:
        abs_lat = abs(lat)
        ns = "N" if lat >= 0 else "S"
        ew = "E" if lon >= 0 else "W"

        if 100 <= lon <= 160 and -20 <= lat <= 25:
            base = "Coral Triangle Reef Basin"
        elif 140 <= lon <= 155 and -25 <= lat <= -10:
            base = "Great Barrier Reef Barrier Shelf"
        elif -90 <= lon <= -60 and 10 <= lat <= 30:
            base = "Caribbean Sea Coral System"
        elif 30 <= lon <= 50 and 10 <= lat <= 30:
            base = "Red Sea Reef Corridor"
        elif 60 <= lon <= 95 and -15 <= lat <= 15:
            base = "Central Indian Ocean Reef"
        elif -180 <= lon <= -100:
            base = "Pacific Ocean Pelagic Shelf"
        elif -60 <= lon <= 20:
            base = "Atlantic Ocean Pelagic Shelf"
        else:
            base = "Open Ocean Basin"

        return f"{base} ({abs_lat:.2f}°{ns}, {abs(lon):.2f}°{ew})"

    @staticmethod
    def _heuristic_ocean_basin(lat: float, lon: float) -> str:
        if 100 <= lon <= 180 or -180 <= lon <= -70:
            return "Pacific Ocean"
        elif -70 < lon < 20:
            return "Atlantic Ocean"
        elif 20 <= lon <= 100:
            return "Indian Ocean"
        return "Global Ocean"
