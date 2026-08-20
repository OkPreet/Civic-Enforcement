"""Test fixtures: isolated temp DB + uploads, wired via env BEFORE app import."""

import os
import tempfile

_TMP_DIR = tempfile.mkdtemp(prefix="sentinel_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_TMP_DIR, 'test.db')}"
os.environ["UPLOAD_DIR"] = os.path.join(_TMP_DIR, "uploads")

import pytest
from fastapi.testclient import TestClient

from app.main import app

DEMO_ADMIN = ("admin", "password123")
DEMO_CITIZEN = ("citizen", "citizen123")


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    from app.ratelimit import login_limiter, report_limiter

    login_limiter.reset()
    report_limiter.reset()
    yield


@pytest.fixture()
def admin_token(client):
    r = client.post("/api/auth/login", json={"username": DEMO_ADMIN[0], "password": DEMO_ADMIN[1]})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture()
def citizen_token(client):
    r = client.post("/api/auth/login", json={"username": DEMO_CITIZEN[0], "password": DEMO_CITIZEN[1]})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(token: str):
    return {"Authorization": f"Bearer {token}"}
