"""Manual tests for src.predictor."""

from src.predictor import predict


def test_valid_prediction() -> None:
    """Run a valid prediction and print the result."""
    result = predict(
        latitude=16.5,
        longitude=120.2,
        sea_surface_temperature=29.4,
    )
    print(result)


def test_invalid_latitude() -> None:
    """Ensure invalid latitude raises ValueError."""
    try:
        predict(latitude=100.0, longitude=120.2, sea_surface_temperature=29.4)
    except ValueError:
        return
    raise AssertionError("Expected ValueError for invalid latitude")


def test_invalid_longitude() -> None:
    """Ensure invalid longitude raises ValueError."""
    try:
        predict(latitude=16.5, longitude=200.0, sea_surface_temperature=29.4)
    except ValueError:
        return
    raise AssertionError("Expected ValueError for invalid longitude")


if __name__ == "__main__":
    test_valid_prediction()
    test_invalid_latitude()
    test_invalid_longitude()
