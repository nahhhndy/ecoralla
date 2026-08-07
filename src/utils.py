"""Input validation helpers for EcoRal prediction inputs."""

from __future__ import annotations

import math

MIN_LATITUDE = -90.0
MAX_LATITUDE = 90.0
MIN_LONGITUDE = -180.0
MAX_LONGITUDE = 180.0
MIN_TEMPERATURE = -2.0
MAX_TEMPERATURE = 40.0


def _to_float(value: object, field_name: str) -> tuple[float | None, str | None]:
    """Convert a value to float, returning an error message on failure."""
    if isinstance(value, bool):
        return None, f"{field_name} must be a numeric value."
    if isinstance(value, (int, float)):
        numeric = float(value)
    else:
        try:
            numeric = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None, f"{field_name} must be a numeric value."
    if not math.isfinite(numeric):
        return None, f"{field_name} must be a finite number."
    return numeric, None


def validate_latitude(lat: object) -> str | None:
    """Validate latitude is a finite number within [-90, 90] degrees."""
    numeric, error = _to_float(lat, "Latitude")
    if error is not None:
        return error
    assert numeric is not None
    if numeric < MIN_LATITUDE or numeric > MAX_LATITUDE:
        return (
            f"Latitude must be between {MIN_LATITUDE} and {MAX_LATITUDE} "
            f"degrees; got {numeric}."
        )
    return None


def validate_longitude(lon: object) -> str | None:
    """Validate longitude is a finite number within [-180, 180] degrees."""
    numeric, error = _to_float(lon, "Longitude")
    if error is not None:
        return error
    assert numeric is not None
    if numeric < MIN_LONGITUDE or numeric > MAX_LONGITUDE:
        return (
            f"Longitude must be between {MIN_LONGITUDE} and {MAX_LONGITUDE} "
            f"degrees; got {numeric}."
        )
    return None


def validate_temperature(temperature: object) -> str | None:
    """Validate sea surface temperature is a finite number within [-2, 40] °C."""
    numeric, error = _to_float(temperature, "Sea surface temperature")
    if error is not None:
        return error
    assert numeric is not None
    if numeric < MIN_TEMPERATURE or numeric > MAX_TEMPERATURE:
        return (
            f"Sea surface temperature must be between {MIN_TEMPERATURE} and "
            f"{MAX_TEMPERATURE} °C; got {numeric}."
        )
    return None


def validate_inputs(
    latitude: object,
    longitude: object,
    temperature: object,
) -> list[str]:
    """Validate latitude, longitude, and temperature; return all error messages."""
    errors: list[str] = []
    for validator, value in (
        (validate_latitude, latitude),
        (validate_longitude, longitude),
        (validate_temperature, temperature),
    ):
        if (message := validator(value)) is not None:
            errors.append(message)
    return errors
