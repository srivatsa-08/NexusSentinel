"""Verification tests for Nexus Sentinel Gateway Protection."""

from __future__ import annotations

from fastapi.testclient import TestClient

from backend.gateway import gateway_controller
from backend.main import app

client = TestClient(app)


def test_gateway_normal_and_bulk_accepted() -> None:
    gateway_controller.reset()
    res1 = client.post("/api/v1/gateway/simulate", json={"scenario": "normal_upload"})
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["accepted_requests"] == 3
    assert d1["throttled_requests"] == 0
    assert d1["rejected_requests"] == 0
    assert d1["avoided_assessments"] == 0

    res2 = client.post("/api/v1/gateway/simulate", json={"scenario": "legitimate_bulk"})
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["accepted_requests"] == 7
    assert d2["avoided_assessments"] == 0


def test_gateway_excessive_requests_restricted_and_recovery() -> None:
    gateway_controller.reset()
    res = client.post("/api/v1/gateway/simulate", json={"scenario": "excessive_requests"})
    assert res.status_code == 200
    d = res.json()
    # quota_limit=5 -> 5 accepted, 6th throttled, 7th & 8th rejected
    assert d["total_requests"] == 8
    assert d["accepted_requests"] == 5
    assert d["throttled_requests"] == 1
    assert d["rejected_requests"] == 2
    assert d["avoided_assessments"] == 3
    assert d["queue_depth"] == 5
    assert d["queue_depth"] <= d["queue_capacity"]
    assert d["estimated_cpu_saved_ms"] > 0

    # Recover restrictions
    rec = client.post("/api/v1/gateway/simulate", json={"scenario": "recover"})
    assert rec.status_code == 200
    assert rec.json()["queue_depth"] == 0
    assert all(u["status"] == "active" for u in rec.json()["uploaders"])

    # Reset
    rst = client.post("/api/v1/gateway/reset")
    assert rst.status_code == 200
    assert rst.json()["total_requests"] == 0



def test_gateway_custom_bulk_and_invalid_bounds() -> None:
    gateway_controller.reset()
    res = client.post("/api/v1/gateway/bulk", json={"profile": "excessive_requests", "count": 12})
    assert res.status_code == 200
    d = res.json()
    assert d["total_requests"] == 12
    assert d["accepted_requests"] == 5
    assert d["throttled_requests"] == 1
    assert d["rejected_requests"] == 6
    assert d["avoided_assessments"] == 7
    assert d["bulk_processing_duration_ms"] >= 0

    bad_count = client.post("/api/v1/gateway/bulk", json={"profile": "normal_upload", "count": 101})
    assert bad_count.status_code == 400

    bad_prof = client.post("/api/v1/gateway/bulk", json={"profile": "unknown", "count": 5})
    assert bad_prof.status_code == 400
