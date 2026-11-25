"""Integration tests for demo_workspace/, WorkspaceMonitor, and independent harness."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from backend.main import app
from backend.workspace_monitor import WORKSPACE_DIR, WorkspaceMonitor
from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES

client = TestClient(app)


def test_demo_workspace_has_20_harmless_files() -> None:
    files = [p for p in WORKSPACE_DIR.iterdir() if p.is_file()]
    assert len(files) >= 20


def test_workspace_monitor_detects_manual_edit_without_fabricating(tmp_path: Path) -> None:
    dummy = tmp_path / "sample.txt"
    dummy.write_text("initial", encoding="utf-8")
    mon = WorkspaceMonitor(root_dir=tmp_path)
    assert mon.get_status()["telemetry_status"] == "idle_monitoring"

    dummy.write_text("edited content", encoding="utf-8")
    status = mon.get_status()
    assert status["telemetry_status"] == "insufficient_for_6_feature_model"
    assert status["recent_events"][0]["event_type"] == "modified"
    assert len(status["unavailable_features"]) == 3


def test_independent_harness_ingest_pipeline() -> None:
    res = client.post(
        "/api/v1/workspace/ingest",
        json={
            "endpoint_id": "DEV-001",
            "telemetry_source": "independent_harness",
            "observation": SYNTHETIC_INFERENCE_EXAMPLES["suspicious"],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ingested"
    assert data["telemetry_source"] == "independent_harness"
    assert data["assessment"]["label"] == "suspicious"
    assert data["incident"]["status"] == "simulated_isolated"

    # Clean up
    client.post("/api/v1/demo/reset")



def test_workspace_run_test_stops_on_containment_and_resets() -> None:
    res = client.post("/api/v1/workspace/run-test", json={"endpoint_id": "FIN-001"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "contained"
    assert data["steps_executed"] == 3
    ws = data["workspace"]
    assert ws["file_count"] >= 20
    assert len(ws["files"]) == ws["file_count"]
    assert ws["harness_state"]["virtually_affected_count"] == 6
    assert ws["harness_state"]["containment_timestamp"] is not None

    rst = client.post("/api/v1/workspace/reset")
    assert rst.status_code == 200
    assert rst.json()["harness_state"]["status"] == "idle"
    assert rst.json()["harness_state"]["virtually_affected_count"] == 0
    client.post("/api/v1/demo/reset")
