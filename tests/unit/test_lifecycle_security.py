"""Unit tests for CRUD data lifecycle, ownership security, and authorization controls."""
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(async_client: AsyncClient):
    # Register & Login User 1
    email = "user1_crud@ecoral.io"
    password = "Password123!"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "CRUD User One", "password": password},
    )
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers_user2(async_client: AsyncClient):
    # Register & Login User 2
    email = "user2_crud@ecoral.io"
    password = "Password123!"
    await async_client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "CRUD User Two", "password": password},
    )
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_report_delete_lifecycle(async_client: AsyncClient, auth_headers: dict, auth_headers_user2: dict):
    # 1. Create prediction
    pred_res = await async_client.post(
        "/api/v1/predict",
        json={"latitude": 16.5, "longitude": 120.2, "sea_surface_temperature": 29.8, "location_name": "Report Sector"},
        headers=auth_headers,
    )
    pred_id = pred_res.json()["id"]

    # 2. Generate report
    gen_res = await async_client.post(
        "/api/v1/reports/generate",
        json={"prediction_id": pred_id, "title": "Deletable Assessment Report"},
        headers=auth_headers,
    )
    report_id = gen_res.json()["id"]

    # 3. Unauthenticated delete attempt -> 401 Unauthorized
    unauth_del = await async_client.delete(f"/api/v1/reports/{report_id}")
    assert unauth_del.status_code == 401

    # 4. User 2 delete attempt -> 404 Not Found (ownership protection)
    user2_del = await async_client.delete(f"/api/v1/reports/{report_id}", headers=auth_headers_user2)
    assert user2_del.status_code == 404

    # 5. Non-existent report delete attempt -> 404 Not Found
    fake_del = await async_client.delete("/api/v1/reports/nonexistent-report-id-123", headers=auth_headers)
    assert fake_del.status_code == 404

    # 6. User 1 owner delete attempt -> 204 No Content
    owner_del = await async_client.delete(f"/api/v1/reports/{report_id}", headers=auth_headers)
    assert owner_del.status_code == 204

    # 7. Verify report is deleted
    list_res = await async_client.get("/api/v1/reports", headers=auth_headers)
    report_ids = [r["id"] for r in list_res.json()]
    assert report_id not in report_ids


@pytest.mark.asyncio
async def test_report_id_returned_by_get_is_deletable_by_delete(
    async_client: AsyncClient, auth_headers: dict
):
    from sqlalchemy import select
    from backend.app.db.session import AsyncSessionLocal
    from backend.app.models.report import Report

    # 1. Create prediction
    pred_res = await async_client.post(
        "/api/v1/predict",
        json={"latitude": 12.5, "longitude": 124.2, "sea_surface_temperature": 29.1, "location_name": "Samar Reef"},
        headers=auth_headers,
    )
    pred_id = pred_res.json()["id"]

    # 2. Generate report
    gen_res = await async_client.post(
        "/api/v1/reports/generate",
        json={"prediction_id": pred_id, "title": "Samar Reef Vulnerability Assessment"},
        headers=auth_headers,
    )
    assert gen_res.status_code == 202

    # 3. GET /reports catalog to obtain returned report ID
    list_res = await async_client.get("/api/v1/reports", headers=auth_headers)
    assert list_res.status_code == 200
    reports = list_res.json()
    assert len(reports) > 0

    # Obtain exact report ID returned by GET /reports
    returned_report = [r for r in reports if r["prediction_id"] == pred_id][0]
    returned_report_id = returned_report["id"]
    assert len(returned_report_id) == 36

    # 4. Direct database query to verify GET returned ID == DB Report.id
    async with AsyncSessionLocal() as db:
        db_res = await db.execute(select(Report).where(Report.id == returned_report_id))
        db_report = db_res.scalar_one_or_none()
        assert db_report is not None, "Report missing in database"
        assert db_report.id == returned_report_id, "GET returned ID != DB Report.id"
        print(f"VERIFIED: GET returned ID ({returned_report_id}) == DB Report.id ({db_report.id})")

    # 5. DELETE /reports/{returned_id} (DELETE path parameter == DB Report.id)
    del_res = await async_client.delete(f"/api/v1/reports/{returned_report_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 6. GET /reports again to verify ID is removed
    refetch_res = await async_client.get("/api/v1/reports", headers=auth_headers)
    refetched_ids = [r["id"] for r in refetch_res.json()]
    assert returned_report_id not in refetched_ids

    # 7. Verify underlying prediction still exists
    pred_verify = await async_client.get(f"/api/v1/predict/{pred_id}", headers=auth_headers)
    assert pred_verify.status_code == 200


@pytest.mark.asyncio
async def test_prediction_delete_lifecycle(async_client: AsyncClient, auth_headers: dict, auth_headers_user2: dict):
    # 1. Create prediction for User 1
    pred_res = await async_client.post(
        "/api/v1/predict",
        json={"latitude": -18.28, "longitude": 147.70, "sea_surface_temperature": 30.5, "location_name": "Barrier Reef Observation"},
        headers=auth_headers,
    )
    pred_id = pred_res.json()["id"]

    # 2. User 2 delete attempt -> 404 Not Found (ownership protection)
    user2_del = await async_client.delete(f"/api/v1/history/{pred_id}", headers=auth_headers_user2)
    assert user2_del.status_code == 404

    # 3. Owner delete attempt -> 204 No Content
    owner_del = await async_client.delete(f"/api/v1/history/{pred_id}", headers=auth_headers)
    assert owner_del.status_code == 204

    # 4. Verify prediction removed from history
    hist_res = await async_client.get("/api/v1/history", headers=auth_headers)
    items = hist_res.json()["items"]
    item_ids = [i["id"] for i in items]
    assert pred_id not in item_ids


@pytest.mark.asyncio
async def test_workspace_project_delete_lifecycle(async_client: AsyncClient, auth_headers: dict, auth_headers_user2: dict):
    # 1. Create project for User 1
    proj_res = await async_client.post(
        "/api/v1/workspace/projects",
        json={"title": "Deletable Research Project", "description": "Temporary study"},
        headers=auth_headers,
    )
    proj_id = proj_res.json()["id"]

    # 2. User 2 delete attempt -> 404 Not Found
    user2_del = await async_client.delete(f"/api/v1/workspace/projects/{proj_id}", headers=auth_headers_user2)
    assert user2_del.status_code == 404

    # 3. Owner delete attempt -> 204 No Content
    owner_del = await async_client.delete(f"/api/v1/workspace/projects/{proj_id}", headers=auth_headers)
    assert owner_del.status_code == 204

    # 4. Verify project removed
    list_res = await async_client.get("/api/v1/workspace/projects", headers=auth_headers)
    project_ids = [p["id"] for p in list_res.json()]
    assert proj_id not in project_ids


@pytest.mark.asyncio
async def test_workspace_experiment_individual_delete_lifecycle(
    async_client: AsyncClient, auth_headers: dict, auth_headers_user2: dict
):
    # 1. Create project for User 1
    proj_res = await async_client.post(
        "/api/v1/workspace/projects",
        json={"title": "Quezon Study Project", "description": "Calabarzon Sector Study"},
        headers=auth_headers,
    )
    proj_id = proj_res.json()["id"]

    # 2. Add 2 Quezon experiment observations to project
    exp1_res = await async_client.post(
        f"/api/v1/workspace/projects/{proj_id}/experiments",
        json={
            "title": "Quezon Observation 1",
            "latitude": 14.0,
            "longitude": 121.5,
            "sea_surface_temperature": 29.5,
            "prediction": 0,
            "probability": 0.19,
            "confidence": 0.81,
        },
        headers=auth_headers,
    )
    exp1_id = exp1_res.json()["id"]

    exp2_res = await async_client.post(
        f"/api/v1/workspace/projects/{proj_id}/experiments",
        json={
            "title": "Quezon Observation 2",
            "latitude": 14.0,
            "longitude": 121.5,
            "sea_surface_temperature": 31.0,
            "prediction": 1,
            "probability": 0.88,
            "confidence": 0.92,
        },
        headers=auth_headers,
    )
    exp2_id = exp2_res.json()["id"]

    # 3. Add research note to project
    await async_client.post(
        f"/api/v1/workspace/projects/{proj_id}/notes",
        json={"content": "Field observation note for Quezon sector."},
        headers=auth_headers,
    )

    # 4. Unauthenticated delete attempt -> 401 Unauthorized
    unauth_del = await async_client.delete(f"/api/v1/workspace/projects/{proj_id}/experiments/{exp1_id}")
    assert unauth_del.status_code == 401

    # 5. User 2 delete attempt of User 1's experiment -> 404 Not Found (ownership protection)
    user2_del = await async_client.delete(
        f"/api/v1/workspace/projects/{proj_id}/experiments/{exp1_id}",
        headers=auth_headers_user2,
    )
    assert user2_del.status_code == 404

    # 6. Nonexistent experiment delete attempt -> 404 Not Found
    fake_del = await async_client.delete(
        f"/api/v1/workspace/projects/{proj_id}/experiments/fake-exp-id-999",
        headers=auth_headers,
    )
    assert fake_del.status_code == 404

    # 7. Owner (User 1) deletes ONLY experiment 1 -> 204 No Content
    owner_del = await async_client.delete(
        f"/api/v1/workspace/projects/{proj_id}/experiments/{exp1_id}",
        headers=auth_headers,
    )
    assert owner_del.status_code == 204

    # 8. Verify project state after individual experiment deletion
    proj_detail = await async_client.get(f"/api/v1/workspace/projects/{proj_id}", headers=auth_headers)
    assert proj_detail.status_code == 200
    pdata = proj_detail.json()

    # Verify project still exists
    assert pdata["id"] == proj_id

    # Verify note still exists
    assert len(pdata["notes"]) == 1

    # Verify experiment 1 is GONE and experiment 2 REMAINS
    remaining_exp_ids = [e["id"] for e in pdata["experiments"]]
    assert exp1_id not in remaining_exp_ids
    assert exp2_id in remaining_exp_ids


@pytest.mark.asyncio
async def test_global_intelligence_read_only_protection(async_client: AsyncClient, auth_headers: dict):
    # Verify global summary returns 200 OK with auth
    summary_res = await async_client.get("/api/v1/intelligence/global-summary", headers=auth_headers)
    assert summary_res.status_code == 200
    regions = summary_res.json()
    assert len(regions) > 0

    # Ensure no DELETE endpoint exists for global intelligence (returns 404 or 405)
    del_res = await async_client.delete("/api/v1/intelligence/global-summary", headers=auth_headers)
    assert del_res.status_code in (404, 405)
