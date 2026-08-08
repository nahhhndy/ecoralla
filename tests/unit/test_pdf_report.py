"""Unit test for publication-grade PDF report generation."""
from __future__ import annotations

import pytest
from pathlib import Path
from backend.app.services.report import ReportService
from unittest.mock import MagicMock


def test_build_pdf_publication_quality():
    service = ReportService(MagicMock())

    # Create dummy prediction object
    mock_prediction = MagicMock()
    mock_prediction.prediction = 1
    mock_prediction.label = "High Bleaching Risk"
    mock_prediction.probability = 0.884
    mock_prediction.confidence = 0.942
    mock_prediction.latitude = 16.5
    mock_prediction.longitude = 120.2
    mock_prediction.sea_surface_temperature = 29.8
    mock_prediction.location_name = "Coral Triangle Monitoring Station"
    mock_prediction.explanation = "Sustained high Sea Surface Temperature of 29.8°C drives acute zooxanthellae oxidative stress."
    mock_prediction.shap_values = {
        "feature_names": ["sea_surface_temperature", "latitude", "longitude"],
        "shap_values": [0.42, 0.12, -0.05],
    }

    pdf_path = service._build_pdf(
        report_id="test_publication_report",
        title="Coral Triangle Assessment 2026",
        prediction=mock_prediction,
    )

    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 2000  # Multi-page PDF file with content
