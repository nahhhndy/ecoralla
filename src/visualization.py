"""SHAP-based explainability utilities for EcoRalla predictions.

This module provides SHAP value computation and natural-language explanations
for coral bleaching risk predictions. It wraps the existing XGBoost model
with TreeExplainer and translates numeric contributions into human-readable text.
"""

from __future__ import annotations

from typing import TypedDict

import numpy as np

from src import model_loader


class ShapResult(TypedDict):
    """SHAP decomposition for a single prediction."""

    feature_names: list[str]
    shap_values: list[float]
    base_value: float
    prediction_value: float


def compute_shap_values(
    latitude: float,
    longitude: float,
    sea_surface_temperature: float,
) -> ShapResult:
    """Compute SHAP values for a single prediction using TreeExplainer.

    Args:
        latitude: Geographic latitude in degrees [-90, 90].
        longitude: Geographic longitude in degrees [-180, 180].
        sea_surface_temperature: SST in Celsius [-2, 40].

    Returns:
        ShapResult containing feature names, SHAP values, base value,
        and the model's predicted probability.
    """
    try:
        import shap  # noqa: PLC0415
    except ImportError as exc:
        raise ImportError("shap is required for explainability: pip install shap") from exc

    model = model_loader.get_model()
    feature_names = model_loader.get_feature_names()

    # Map feature names to ordered values
    _value_map = {
        "lat": latitude,
        "lon": longitude,
        "sea_surface_temperature": sea_surface_temperature,
    }
    feature_values = np.array([[_value_map[name] for name in feature_names]])

    explainer = shap.TreeExplainer(model)
    shap_explanation = explainer(feature_values)

    # shap_values[0] gives the SHAP values for the positive class (index 1)
    raw = shap_explanation.values
    # For binary classification, shape may be (1, n_features, 2)
    if raw.ndim == 3:
        shap_vals = raw[0, :, 1].tolist()
        base_val = float(explainer.expected_value[1])
    else:
        shap_vals = raw[0].tolist()
        base_val = float(
            explainer.expected_value[1]
            if hasattr(explainer.expected_value, "__len__")
            else explainer.expected_value
        )

    return {
        "feature_names": list(feature_names),
        "shap_values": shap_vals,
        "base_value": base_val,
        "prediction_value": float(shap_explanation.base_values[0] if raw.ndim < 3 else base_val + sum(shap_vals)),
    }


# Human-readable labels for each feature
_FEATURE_LABELS: dict[str, str] = {
    "lat": "latitude",
    "lon": "longitude",
    "sea_surface_temperature": "sea surface temperature (SST)",
}

# Thresholds (mean SHAP values from results/mean_shap_importance.csv)
_HIGH_SHAP_THRESHOLD = 0.5


def natural_language_explanation(
    shap_result: ShapResult,
    prediction: int,
    probability: float,
) -> str:
    """Generate a human-readable explanation of a bleaching risk prediction.

    Uses template-based generation driven by the sign and magnitude of SHAP
    values. No external API required.

    Args:
        shap_result: Output from compute_shap_values().
        prediction: 0 = Low risk, 1 = High risk.
        probability: Raw model probability for the positive class.

    Returns:
        A paragraph explaining the prediction in plain English.
    """
    names = shap_result["feature_names"]
    values = shap_result["shap_values"]

    # Rank features by absolute SHAP contribution
    ranked = sorted(
        zip(names, values),
        key=lambda x: abs(x[1]),
        reverse=True,
    )

    risk_label = "HIGH bleaching risk" if prediction == 1 else "LOW bleaching risk"
    confidence_pct = int(max(probability, 1.0 - probability) * 100)

    # Build driver sentences
    driver_sentences: list[str] = []
    for feat, shap_val in ranked:
        label = _FEATURE_LABELS.get(feat, feat)
        direction = "increased" if shap_val > 0 else "decreased"
        magnitude = abs(shap_val)
        if magnitude >= _HIGH_SHAP_THRESHOLD:
            strength = "strongly"
        elif magnitude >= 0.1:
            strength = "moderately"
        else:
            strength = "slightly"
        driver_sentences.append(
            f"**{label}** {strength} {direction} the predicted risk"
            f" (contribution: {shap_val:+.3f})"
        )

    primary = driver_sentences[0] if driver_sentences else "the input features"
    secondary_parts = driver_sentences[1:] if len(driver_sentences) > 1 else []

    intro = (
        f"The model predicts **{risk_label}** with {confidence_pct}% confidence "
        f"(probability: {probability:.1%})."
    )

    primary_sent = f"The primary driver is {primary}."

    if secondary_parts:
        secondary_sent = (
            "Secondary factors: " + "; ".join(secondary_parts) + "."
        )
    else:
        secondary_sent = ""

    context = _risk_context(prediction, probability)

    parts = [intro, primary_sent]
    if secondary_sent:
        parts.append(secondary_sent)
    parts.append(context)

    return " ".join(parts)


def _risk_context(prediction: int, probability: float) -> str:
    """Return contextual advice based on risk level and probability."""
    if prediction == 1:
        if probability >= 0.85:
            return (
                "Immediate monitoring is strongly recommended. "
                "Conditions are highly conducive to coral bleaching events."
            )
        else:
            return (
                "Elevated risk detected. Increased monitoring frequency "
                "and early intervention protocols are advised."
            )
    else:
        if probability <= 0.15:
            return (
                "Conditions appear stable. Standard monitoring schedules are sufficient."
            )
        else:
            return (
                "Risk is currently low but approaching marginal levels. "
                "Continue routine monitoring."
            )
