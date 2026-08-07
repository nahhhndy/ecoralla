"""Load project configuration from config.json."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_CONFIG_FILE = _PROJECT_ROOT / "config.json"


@lru_cache(maxsize=1)
def _load_config() -> dict[str, Any]:
    """Load and cache the project configuration."""
    with _CONFIG_FILE.open(encoding="utf-8") as fh:
        return json.load(fh)


def _resolve(relative_path: str) -> Path:
    """Resolve a path relative to the project root."""
    return (_PROJECT_ROOT / relative_path).resolve()


def get_model_path() -> Path:
    """Return the filesystem path to the trained model artifact."""
    return _resolve(_load_config()["model_path"])


def get_feature_names_path() -> Path:
    """Return the filesystem path to the feature names file."""
    return _resolve(_load_config()["feature_names_path"])


def get_threshold_path() -> Path:
    """Return the filesystem path to the classification threshold file."""
    return _resolve(_load_config()["threshold_path"])
