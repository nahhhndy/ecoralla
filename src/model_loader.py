"""Load and cache EcoRal model artifacts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib

from src import config

_model: Any | None = None
_feature_names: list[str] | None = None
_threshold: float | None = None


def _load_pickle(path: Path) -> Any:
    """Load a pickled object from the given path."""
    return joblib.load(path)


def get_model() -> Any:
    """Return the cached XGBoost model."""
    global _model
    if _model is None:
        _model = _load_pickle(config.get_model_path())
    return _model


def get_feature_names() -> list[str]:
    """Return the cached list of model feature names."""
    global _feature_names
    if _feature_names is None:
        _feature_names = _load_pickle(config.get_feature_names_path())
    return _feature_names


def get_threshold() -> float:
    """Return the cached prediction threshold."""
    global _threshold
    if _threshold is None:
        _threshold = _load_pickle(config.get_threshold_path())
    return _threshold
