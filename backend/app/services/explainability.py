"""AI Explainability Engine for EcoRal.

Generates concise, scientific, structured human-readable explanations based on
SHAP values, prediction probability, model confidence, and environmental context.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel


class FeatureContribution(BaseModel):
    feature_name: str
    display_name: str
    value: float
    shap_value: float
    impact: str  # "Increases Risk" or "Decreases Risk"
    description: str


class EcologicalInsight(BaseModel):
    headline: str
    rationale: str
    key_drivers: list[FeatureContribution]
    ecological_implications: str
    recommendations: list[str]
    formatted_text: str


class ExplainabilityEngine:
    """Scientific explainability engine for EcoRal ML predictions."""

    @staticmethod
    def generate_explanation(
        prediction: int,
        probability: float,
        confidence: float,
        latitude: float,
        longitude: float,
        sea_surface_temperature: float,
        shap_dict: Optional[dict[str, Any]] = None,
        location_name: Optional[str] = None,
    ) -> EcologicalInsight:
        is_high_risk = prediction == 1
        location_str = location_name or f"({latitude:.2f}°, {longitude:.2f}°)"

        # 1. Prediction Rationale & Headline
        if is_high_risk:
            headline = f"High Coral Bleaching Risk Detected at {location_str}"
            rationale = (
                f"The EcoRal XGBoost classifier determined a {probability * 100:.1f}% probability "
                f"of coral bleaching with {confidence * 100:.1f}% statistical confidence. "
                f"Thermal telemetry indicates Sea Surface Temperature of {sea_surface_temperature:.1f}°C "
                f"exceeds critical physiological stress thresholds."
            )
        else:
            headline = f"Low Coral Bleaching Vulnerability at {location_str}"
            rationale = (
                f"The EcoRal XGBoost classifier determined a {probability * 100:.1f}% risk probability "
                f"({(1 - probability) * 100:.1f}% safety margin) with {confidence * 100:.1f}% confidence. "
                f"Sea Surface Temperature of {sea_surface_temperature:.1f}°C remains within tolerable bounds."
            )

        # 2. Extract & Format Feature Drivers (SHAP)
        drivers: list[FeatureContribution] = []
        if shap_dict and "feature_names" in shap_dict and "shap_values" in shap_dict:
            names = shap_dict["feature_names"]
            values = shap_dict["shap_values"]

            for name, shap_val in zip(names, values):
                val = sea_surface_temperature if "temp" in name else (latitude if "lat" in name else longitude)
                disp_name = (
                    "Sea Surface Temperature"
                    if "temp" in name
                    else ("Latitude" if "lat" in name else "Longitude")
                )
                impact = "Increases Risk" if shap_val > 0 else "Decreases Risk"

                if "temp" in name:
                    desc = (
                        f"SST of {sea_surface_temperature:.1f}°C exerts primary thermal stress (+{shap_val:.3f} SHAP impact)."
                        if shap_val > 0
                        else f"SST of {sea_surface_temperature:.1f}°C remains below thermal stress limits ({shap_val:.3f} SHAP impact)."
                    )
                elif "lat" in name:
                    desc = f"Latitudinal position {latitude:.2f}° correlates with local insolation and solar irradiance."
                else:
                    desc = f"Longitudinal location {longitude:.2f}° demarks ocean basin circulation patterns."

                drivers.append(
                    FeatureContribution(
                        feature_name=name,
                        display_name=disp_name,
                        value=float(val),
                        shap_value=float(shap_val),
                        impact=impact,
                        description=desc,
                    )
                )

            # Sort drivers by absolute SHAP impact
            drivers.sort(key=lambda x: abs(x.shap_value), reverse=True)
        else:
            # Fallback feature driver
            drivers.append(
                FeatureContribution(
                    feature_name="sea_surface_temperature",
                    display_name="Sea Surface Temperature",
                    value=sea_surface_temperature,
                    shap_value=0.45 if is_high_risk else -0.35,
                    impact="Increases Risk" if is_high_risk else "Decreases Risk",
                    description=f"SST of {sea_surface_temperature:.1f}°C is the primary thermal driver.",
                )
            )

        # 3. Ecological Implications
        if is_high_risk:
            ecological_implications = (
                f"Elevated SST of {sea_surface_temperature:.1f}°C disrupts the symbiotic relationship "
                f"between reef-building scleractinian corals and photosynthetic zooxanthellae algae. "
                f"Prolonged exposure risks widespread algal expulsion, tissue breakdown, and potential colony mortality."
            )
        else:
            ecological_implications = (
                f"Current SST of {sea_surface_temperature:.1f}°C supports normal calcification and photosynthetic "
                f"activity for zooxanthellae. No acute thermal stress or bleaching risk indicated."
            )

        # 4. Conservation Recommendations
        if is_high_risk:
            recommendations = [
                "Initiate immediate field survey & emergency bleaching response monitoring.",
                "Enforce localized marine protection: restrict anchoring and heavy scuba diving traffic.",
                "Alert regional reef conservation authorities and oceanographic networks.",
                "Deploy underwater loggers to track subsurface temperature anomalies.",
            ]
        else:
            recommendations = [
                "Maintain routine monthly reef health survey schedules.",
                "Record baseline ecological metrics for long-term climate monitoring.",
                "Verify SST satellite telemetry periodically during seasonal warming peaks.",
            ]

        # Formatted summary text for APIs / reports
        driver_summary = ", ".join([f"{d.display_name} ({d.impact})" for d in drivers[:2]])
        formatted_text = (
            f"**{headline}**\n\n"
            f"{rationale}\n\n"
            f"**Key Feature Drivers**: {driver_summary}.\n\n"
            f"**Ecological Implications**: {ecological_implications}\n\n"
            f"**Conservation Recommendations**:\n"
            + "\n".join([f"• {r}" for r in recommendations])
        )

        return EcologicalInsight(
            headline=headline,
            rationale=rationale,
            key_drivers=drivers,
            ecological_implications=ecological_implications,
            recommendations=recommendations,
            formatted_text=formatted_text,
        )
