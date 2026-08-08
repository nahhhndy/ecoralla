"""Dedicated automated unit tests for authentication, tokens, user profile, and error scenarios."""
from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_auth_registration_and_login_flow():
    test_email = f"authtest_{os.urandom(4).hex()}@ecoral.io"
    test_password = "EcoRalTestPassword123!"

    # 1. Register new user
    reg_res = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Auth Test User",
        "password": test_password
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    tokens = reg_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    # 2. Login with valid credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_tokens = login_res.json()
    assert "access_token" in login_tokens
    access_token = login_tokens["access_token"]
    refresh_token = login_tokens["refresh_token"]

    # 3. GET /api/v1/auth/me with valid Bearer token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200, f"/auth/me failed: {me_res.text}"
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["full_name"] == "Auth Test User"
    assert me_data["is_active"] is True

    # 4. Token Refresh
    refresh_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens


def test_auth_invalid_password():
    test_email = f"authtest_badpass_{os.urandom(4).hex()}@ecoral.io"
    client.post("/api/v1/auth/register", json={
        "email": test_email,
        "full_name": "Bad Pass User",
        "password": "CorrectPassword123!"
    })

    login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123!"
    })
    assert login_res.status_code == 401
    data = login_res.json()
    assert data["detail"] == "Invalid email or password"


def test_auth_nonexistent_user():
    login_res = client.post("/api/v1/auth/login", json={
        "email": f"nonexistent_{os.urandom(4).hex()}@ecoral.io",
        "password": "SomePassword123!"
    })
    assert login_res.status_code == 401
    data = login_res.json()
    assert data["detail"] == "Invalid email or password"


def test_auth_unauthenticated_me():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_auth_duplicate_registration():
    dup_email = f"authtest_dup_{os.urandom(4).hex()}@ecoral.io"
    client.post("/api/v1/auth/register", json={
        "email": dup_email,
        "full_name": "First Registration",
        "password": "Password123!"
    })

    second_reg = client.post("/api/v1/auth/register", json={
        "email": dup_email,
        "full_name": "Second Registration",
        "password": "Password123!"
    })
    assert second_reg.status_code == 409
    assert "Email already registered" in second_reg.json()["detail"]
