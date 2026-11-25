"""Integration tests for Nexus Sentinel FastAPI backend."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.database import init_db, reset_db
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown_db():
    init_db()
    reset_db()
    yield
    reset_db()


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_endpoints_list():
    res = client.get("/api/v1/endpoints")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) >= 1
    assert data["items"][0]["endpoint_id"] == "demo-01"
    assert data["items"][0]["status"] == "monitoring"


def test_metrics_endpoint():
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "phase2_model" in data
    assert "precision" in data["phase2_model"]
    assert "confusion_matrix" in data["phase2_model"]


def test_demo_normal_scenario():
    res = client.post("/api/v1/demo/start", json={"scenario": "normal"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "success"
    assert body["scenario"] == "normal"
    assert body["assessment"]["label"] == "normal"
    assert body["assessment"]["risk_score"] == 0
    assert body["incident"] is None

    # Check database persistence
    assess_res = client.get("/api/v1/assessments")
    assert assess_res.status_code == 200
    items = assess_res.json()["items"]
    assert len(items) == 1
    assert items[0]["label"] == "normal"


def test_demo_backup_scenario():
    res = client.post("/api/v1/demo/start", json={"scenario": "backup"})
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "backup"
    assert body["assessment"]["label"] == "normal"
    assert body["incident"] is None


def test_demo_compression_scenario():
    res = client.post("/api/v1/demo/start", json={"scenario": "compression"})
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "compression"
    assert body["assessment"]["label"] == "normal"
    assert body["incident"] is None


def test_demo_suspicious_scenario_and_simulated_containment():
    res = client.post("/api/v1/demo/start", json={"scenario": "suspicious"})
    assert res.status_code == 200
    body = res.json()
    assert body["scenario"] == "suspicious"
    assert body["assessment"]["label"] == "suspicious"
    assert body["assessment"]["risk_score"] >= 50
    assert body["incident"] is not None
    assert body["incident"]["status"] == "simulated_isolated"
    assert len(body["incident"]["checklist"]) > 0

    # Verify endpoint is updated in database
    ep_res = client.get("/api/v1/endpoints")
    assert ep_res.status_code == 200
    eps = {e["endpoint_id"]: e["status"] for e in ep_res.json()["items"]}
    assert eps["demo-01"] == "simulated_isolated"

    # Verify incidents endpoint
    inc_res = client.get("/api/v1/incidents")
    assert inc_res.status_code == 200
    inc_items = inc_res.json()["items"]
    assert len(inc_items) == 1
    assert inc_items[0]["status"] == "simulated_isolated"


def test_demo_reset():
    # First trigger suspicious incident
    client.post("/api/v1/demo/start", json={"scenario": "suspicious"})
    # Verify isolated
    assert client.get("/api/v1/endpoints").json()["items"][0]["status"] == "simulated_isolated"

    # Reset
    reset_res = client.post("/api/v1/demo/reset")
    assert reset_res.status_code == 200
    assert reset_res.json() == {"status": "reset_complete"}

    # Verify clean state
    assert client.get("/api/v1/endpoints").json()["items"][0]["status"] == "monitoring"
    assert len(client.get("/api/v1/assessments").json()["items"]) == 0
    assert len(client.get("/api/v1/incidents").json()["items"]) == 0


def test_invalid_scenario_error_handling():
    res = client.post("/api/v1/demo/start", json={"scenario": "nonexistent"})
    assert res.status_code == 400
    assert "Invalid scenario" in res.json()["detail"]
