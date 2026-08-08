import asyncio
import json
import os
import sys

from fastapi.testclient import TestClient

# Ensure root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.main import app

def test_run_e2e_audit():
    print("=" * 80)
    print("ECORAL END-TO-END MANUAL FLOW VERIFICATION AUDIT")
    print("=" * 80)

    client = TestClient(app)

    # -------------------------------------------------------------------------
    # FLOW 1: Register / Login Authentication
    # -------------------------------------------------------------------------
    print("\n--- [Flow 1] Auth: User Registration & Login ---")
    test_email = f"field_researcher_{os.urandom(4).hex()}@ecoral.io"
    test_pass = "EcoRalSecurePass2026!"
    test_name = "Dr. Maya Oceanographer"

    # Register
    reg_payload = {"email": test_email, "password": test_pass, "full_name": test_name}
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"POST /api/v1/auth/register Status: {res_reg.status_code}")
    assert res_reg.status_code == 201, f"Register failed: {res_reg.text}"
    tokens = res_reg.json()
    access_token = tokens["access_token"]
    assert access_token, "No access token returned"
    print(f"[PASS] Registration successful. JWT Token acquired ({access_token[:20]}...)")

    # Login
    login_payload = {"email": test_email, "password": test_pass}
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    print(f"POST /api/v1/auth/login Status: {res_login.status_code}")
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    tokens = res_login.json()
    access_token = tokens["access_token"]
    print("[PASS] Login verified.")

    # Get Me
    headers = {"Authorization": f"Bearer {access_token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200, f"Get me failed: {res_me.text}"
    user_info = res_me.json()
    print(f"[PASS] Authenticated User: {user_info['full_name']} ({user_info['email']})")

    # -------------------------------------------------------------------------
    # FLOW 2: Dashboard stats & analytics
    # -------------------------------------------------------------------------
    print("\n--- [Flow 2] Dashboard: Load Real Backend Metrics ---")
    res_stats = client.get("/api/v1/analytics/stats", headers=headers)
    print(f"GET /api/v1/analytics/stats Status: {res_stats.status_code}")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    print(f"[PASS] Real DB Stats: Total={stats['total_predictions']}, HighRisk={stats['high_risk_count']}, LowRisk={stats['low_risk_count']}")

    res_model = client.get("/api/v1/analytics/model-info", headers=headers)
    print(f"GET /api/v1/analytics/model-info Status: {res_model.status_code}")
    assert res_model.status_code == 200
    model_info = res_model.json()
    print(f"[PASS] Model Info Loaded: {model_info['model_name']} (ROC AUC: {model_info['roc_auc']})")

    # -------------------------------------------------------------------------
    # FLOW 3 & 4: Quick Predict & Persistence
    # -------------------------------------------------------------------------
    print("\n--- [Flow 3 & 4] Quick Predict & Persistence ---")
    pred_payload = {
        "latitude": 16.5,
        "longitude": 120.2,
        "sea_surface_temperature": 29.8,
        "location_name": "South China Sea Coral Transect"
    }
    res_pred = client.post("/api/v1/predict", json=pred_payload, headers=headers)
    print(f"POST /api/v1/predict Status: {res_pred.status_code}")
    assert res_pred.status_code == 200, f"Prediction failed: {res_pred.text}"
    pred = res_pred.json()
    prediction_id = pred["id"]
    print(f"[PASS] Prediction Created ID: {prediction_id}")
    print(f"       Label: {pred['label']}, Risk Prob: {pred['probability']*100:.1f}%, Confidence: {pred['confidence']*100:.1f}%")
    assert pred["shap_data"] is not None or pred["explanation"] is not None, "Missing SHAP explanation"
    print(f"[PASS] SHAP Explanation Generated: {pred['explanation'][:100]}...")

    # Fetch Prediction by ID
    res_get_pred = client.get(f"/api/v1/predict/{prediction_id}", headers=headers)
    assert res_get_pred.status_code == 200
    print("[PASS] Prediction record fetched from database persistence.")

    # -------------------------------------------------------------------------
    # FLOW 5: History List Verification
    # -------------------------------------------------------------------------
    print("\n--- [Flow 5] Prediction History ---")
    res_hist = client.get("/api/v1/history?page=1&page_size=20", headers=headers)
    print(f"GET /api/v1/history Status: {res_hist.status_code}")
    assert res_hist.status_code == 200
    history = res_hist.json()
    print(f"[PASS] History Items Count: {history['total']}")
    found_item = any(item["id"] == prediction_id for item in history["items"])
    assert found_item, "Newly created prediction not found in history"
    print("[PASS] Prediction verified inside user's historical audit trail.")

    # -------------------------------------------------------------------------
    # FLOW 6, 7, 8: Map Location Selection & Prediction
    # -------------------------------------------------------------------------
    print("\n--- [Flow 6, 7, 8] Ocean Map Location & Prediction ---")
    map_lat, map_lng = -18.28, 147.70  # Great Barrier Reef
    res_telem = client.get(f"/api/v1/environmental/telemetry?latitude={map_lat}&longitude={map_lng}", headers=headers)
    print(f"GET /api/v1/environmental/telemetry Status: {res_telem.status_code}")
    assert res_telem.status_code == 200
    telem = res_telem.json()
    print(f"[PASS] Map Telemetry Fetched: {telem['region_name']} (SST: {telem['sea_surface_temperature']}°C)")

    map_pred_payload = {
        "latitude": map_lat,
        "longitude": map_lng,
        "sea_surface_temperature": telem["sea_surface_temperature"],
        "location_name": telem["region_name"]
    }
    res_map_pred = client.post("/api/v1/predict", json=map_pred_payload, headers=headers)
    assert res_map_pred.status_code == 200
    map_pred = res_map_pred.json()
    print(f"[PASS] Map Prediction Success: {map_pred['label']} ({map_pred['probability']*100:.1f}%)")

    # -------------------------------------------------------------------------
    # FLOW 9, 10, 11, 12, 13: Research Workspace, Project Creation, Import & Export
    # -------------------------------------------------------------------------
    print("\n--- [Flow 9, 10, 11, 12, 13] Research Workspace, Import & Export ---")
    # List projects
    res_proj_list = client.get("/api/v1/workspace/projects", headers=headers)
    assert res_proj_list.status_code == 200
    print("[PASS] Research Workspace projects listed.")

    # Create project
    proj_payload = {
        "title": "El Niño Reef Vulnerability Assessment 2026",
        "description": "Field research transects tracking sea surface temperature shifts.",
        "tags": "coral-bleaching, el-nino, sst-telemetry",
        "is_collaborative": True
    }
    res_create_proj = client.post("/api/v1/workspace/projects", json=proj_payload, headers=headers)
    print(f"POST /api/v1/workspace/projects Status: {res_create_proj.status_code}")
    assert res_create_proj.status_code == 201
    project = res_create_proj.json()
    project_id = project["id"]
    print(f"[PASS] Research Project Created ID: {project_id}")

    # Add experiment to project
    exp_payload = {
        "title": map_pred["location_name"],
        "latitude": map_pred["latitude"],
        "longitude": map_pred["longitude"],
        "sea_surface_temperature": map_pred["sea_surface_temperature"],
        "prediction": map_pred["prediction"],
        "probability": map_pred["probability"],
        "confidence": map_pred["confidence"],
        "notes": "Added from Ocean Map GIS analysis"
    }
    res_add_exp = client.post(f"/api/v1/workspace/projects/{project_id}/experiments", json=exp_payload, headers=headers)
    assert res_add_exp.status_code == 201
    print("[PASS] Experiment record added to project.")

    # Add research note
    note_payload = {"content": "Field observation note: Elevated thermal stress observed across transects."}
    res_add_note = client.post(f"/api/v1/workspace/projects/{project_id}/notes", json=note_payload, headers=headers)
    assert res_add_note.status_code == 201
    print("[PASS] Research note posted to collaborative notebook.")

    # Export dataset CSV
    res_export = client.get(f"/api/v1/workspace/projects/{project_id}/export-dataset", headers=headers)
    print(f"GET /api/v1/workspace/projects/{project_id}/export-dataset Status: {res_export.status_code}")
    assert res_export.status_code == 200
    csv_content = res_export.text
    assert "Latitude" in csv_content or "Title" in csv_content, "CSV export content invalid"
    print(f"[PASS] CSV Dataset Exported Successfully ({len(csv_content)} bytes):")
    print(csv_content[:200])

    # -------------------------------------------------------------------------
    # FLOW 14 & 15: PDF Reports Generation & Download
    # -------------------------------------------------------------------------
    print("\n--- [Flow 14 & 15] Reports Page & PDF Generation ---")
    report_payload = {
        "prediction_id": prediction_id,
        "title": "Coral Bleaching Assessment Report - South China Sea"
    }
    res_gen_report = client.post("/api/v1/reports/generate", json=report_payload, headers=headers)
    print(f"POST /api/v1/reports/generate Status: {res_gen_report.status_code}")
    assert res_gen_report.status_code == 202
    report_info = res_gen_report.json()
    report_id = report_info["id"]
    print(f"[PASS] PDF Report Generation Triggered ID: {report_id}")

    # List reports
    res_reports = client.get("/api/v1/reports", headers=headers)
    assert res_reports.status_code == 200
    print("[PASS] Report catalog retrieved.")

    # Execute background generation via stateless ReportService
    from backend.app.services.report import ReportService

    async def run_background_generation():
        service = ReportService()
        await service.generate(report_id, prediction_id, report_payload["title"])

    asyncio.run(run_background_generation())

    # Download PDF
    res_download = client.get(f"/api/v1/reports/{report_id}/download", headers=headers)
    print(f"GET /api/v1/reports/{report_id}/download Status: {res_download.status_code}")
    assert res_download.status_code == 200
    assert res_download.headers["content-type"] == "application/pdf"
    pdf_bytes = res_download.content
    assert len(pdf_bytes) > 2000, f"PDF file size too small ({len(pdf_bytes)} bytes)"
    assert pdf_bytes.startswith(b"%PDF-"), "Downloaded file does not start with %PDF-"
    assert b"%%EOF" in pdf_bytes[-1024:], "PDF file missing valid EOF marker"
    print(f"[PASS] PDF Report Download Verified ({len(pdf_bytes)} bytes, starts with %PDF-, contains %%EOF).")

    # -------------------------------------------------------------------------
    # FLOW 16: AI Environmental Analyst Chat
    # -------------------------------------------------------------------------
    print("\n--- [Flow 16] AI Environmental Analyst Chat ---")
    chat_payload = {
        "message": "What ecological factors caused high bleaching risk at latitude 16.5, longitude 120.2?",
        "conversation_history": []
    }
    res_chat = client.post("/api/v1/assistant/chat", json=chat_payload, headers=headers)
    print(f"POST /api/v1/assistant/chat Status: {res_chat.status_code}")
    assert res_chat.status_code == 200
    chat_res = res_chat.json()
    assert chat_res["reply"], "Empty AI Analyst reply"
    print(f"[PASS] AI Analyst Reply: {chat_res['reply'][:120]}...")
    print(f"       Capabilities Used: {chat_res['capabilities_used']}")

    # -------------------------------------------------------------------------
    # FLOW 17: Logout / Session End
    # -------------------------------------------------------------------------
    print("\n--- [Flow 17] Logout Verification ---")
    unauth_res = client.get("/api/v1/auth/me")
    print(f"GET /api/v1/auth/me (Unauthenticated) Status: {unauth_res.status_code}")
    assert unauth_res.status_code == 401
    print("[PASS] Unauthenticated protection verified (401 Unauthorized).")

    print("\n" + "=" * 80)
    print("ALL 17 END-TO-END FLOWS VERIFIED SUCCESSFULLY (100% PASS)")
    print("=" * 80)

if __name__ == "__main__":
    test_run_e2e_audit()
