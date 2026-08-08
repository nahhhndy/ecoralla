"""Tests for src.utils input validation."""
from __future__ import annotations

from src.utils import (
    validate_inputs,
    validate_latitude,
    validate_longitude,
    validate_temperature,
)


class TestValidateLatitude:
    def test_valid_latitude(self):
        assert validate_latitude(0.0) is None
        assert validate_latitude(16.5) is None
        assert validate_latitude(-90.0) is None
        assert validate_latitude(90.0) is None

    def test_invalid_latitude_out_of_range(self):
        assert validate_latitude(91.0) is not None
        assert validate_latitude(-91.0) is not None
        assert validate_latitude(100.0) is not None

    def test_invalid_latitude_not_numeric(self):
        assert validate_latitude("abc") is not None
        assert validate_latitude(None) is not None
        assert validate_latitude(True) is not None

    def test_invalid_latitude_not_finite(self):
        import math
        assert validate_latitude(math.inf) is not None
        assert validate_latitude(float("nan")) is not None

    def test_string_numeric(self):
        assert validate_latitude("45.0") is None


class TestValidateLongitude:
    def test_valid_longitude(self):
        assert validate_longitude(0.0) is None
        assert validate_longitude(120.2) is None
        assert validate_longitude(-180.0) is None
        assert validate_longitude(180.0) is None

    def test_invalid_longitude_out_of_range(self):
        assert validate_longitude(181.0) is not None
        assert validate_longitude(-181.0) is not None
        assert validate_longitude(200.0) is not None

    def test_invalid_longitude_not_numeric(self):
        assert validate_longitude("xyz") is not None
        assert validate_longitude(None) is not None


class TestValidateTemperature:
    def test_valid_temperature(self):
        assert validate_temperature(0.0) is None
        assert validate_temperature(29.4) is None
        assert validate_temperature(-2.0) is None
        assert validate_temperature(40.0) is None

    def test_invalid_temperature_out_of_range(self):
        assert validate_temperature(41.0) is not None
        assert validate_temperature(-3.0) is not None

    def test_invalid_temperature_not_numeric(self):
        assert validate_temperature("hot") is not None
        assert validate_temperature(None) is not None


class TestValidateInputs:
    def test_all_valid(self):
        errors = validate_inputs(16.5, 120.2, 29.4)
        assert errors == []

    def test_all_invalid(self):
        errors = validate_inputs(200, 300, 100)
        assert len(errors) == 3

    def test_partial_invalid(self):
        errors = validate_inputs(16.5, 300, 29.4)
        assert len(errors) == 1
        assert "Longitude" in errors[0]

    def test_error_accumulation(self):
        """All validation errors should be collected, not fail-fast."""
        errors = validate_inputs("bad", "bad", "bad")
        assert len(errors) == 3
