"""EcoRal bleaching risk prediction."""

from __future__ import annotations

from typing import TypedDict

import numpy as np

from src import model_loader
from src.utils import validate_inputs

_INPUT_VALUES = {
    "lat": lambda latitude, longitude, sea_surface_temperature: latitude,
    "lon": lambda latitude, longitude, sea_surface_temperature: longitude,
    "sea_surface_temperature": (
        lambda latitude, longitude, sea_surface_temperature: sea_surface_temperature
    ),
}

_LABELS = {
    0: "Low Bleaching Risk",
    1: "High Bleaching Risk",
}


class PredictionResult(TypedDict):
    """Prediction output returned by predict()."""

    prediction: int
    probability: float
    confidence: float
    label: str


def _build_feature_row(
    feature_names: list[str],
    latitude: float,
    longitude: float,
    sea_surface_temperature: float,
) -> np.ndarray:
    """Arrange input values in the order expected by the model."""
    row: list[float] = []
    for name in feature_names:
        resolver = _INPUT_VALUES.get(name)
        if resolver is None:
            raise ValueError(f"Unsupported feature name: {name}")
        row.append(resolver(latitude, longitude, sea_surface_temperature))
    return np.array([row])


def predict(
    latitude: object,
    longitude: object,
    sea_surface_temperature: object,
) -> PredictionResult:
    """Validate inputs, run the model, and return a structured prediction."""
    errors = validate_inputs(latitude, longitude, sea_surface_temperature)
    if errors:
        raise ValueError("; ".join(errors))

    lat = float(latitude)  # type: ignore[arg-type]
    lon = float(longitude)  # type: ignore[arg-type]
    sst = float(sea_surface_temperature)  # type: ignore[arg-type]

    model = model_loader.get_model()
    feature_names = model_loader.get_feature_names()
    threshold = model_loader.get_threshold()

    features = _build_feature_row(feature_names, lat, lon, sst)
    probabilities = model.predict_proba(features)[0]
    probability = float(probabilities[1])
    prediction = int(probability >= threshold)
    confidence = float(max(probability, 1.0 - probability))

    return {
        "prediction": prediction,
        "probability": probability,
        "confidence": confidence,
        "label": _LABELS[prediction],
    }
