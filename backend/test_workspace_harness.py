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
    assert ws["harness_state"]["virtually_affected_count"] == data["steps_executed"]
    assert ws["harness_state"]["containment_timestamp"] is not None

    rst = client.post("/api/v1/workspace/reset")
    assert rst.status_code == 200
    assert rst.json()["harness_state"]["status"] == "idle"
    assert rst.json()["harness_state"]["virtually_affected_count"] == 0
    client.post("/api/v1/demo/reset")


def test_universal_mixed_format_folder_import() -> None:
    import base64

    b64 = base64.b64encode(b"\x00\x01\x02BINARY_DUMMY").decode("ascii")
    mixed = [
        {"relative_path": "mix/doc.pdf", "content_base64": b64},
        {"relative_path": "mix/report.docx", "content_base64": b64},
        {"relative_path": "mix/image.png", "content_base64": b64},
        {"relative_path": "mix/photo.jpg", "content_base64": b64},
        {"relative_path": "mix/clip.mp4", "content_base64": b64},
        {"relative_path": "mix/archive.zip", "content_base64": b64},
        {"relative_path": "mix/data.csv", "content_base64": base64.b64encode(b"a,b\n1,2\n").decode("ascii")},
        {"relative_path": "mix/meta.json", "content_base64": base64.b64encode(b"{}").decode("ascii")},
        {"relative_path": "mix/notes.txt", "content_base64": base64.b64encode(b"hello").decode("ascii")},
        {"relative_path": "mix/README", "content_base64": base64.b64encode(b"no_ext").decode("ascii")},
        {"relative_path": "mix/tool.exe", "content_base64": b64},
    ]
    res = client.post("/api/v1/workspace/import", json={"files": mixed})
    assert res.status_code == 200
    data = res.json()
    assert data["imported_count"] == 11
    assert data["skipped_files"] == []

    # Verify .exe stored as metadata-only (0 bytes)
    exe_entry = next(f for f in data["files"] if f["filename"] == "tool.exe")
    assert exe_entry["size_bytes"] == 0
    assert exe_entry["observed_activity"] == "metadata_only_imported"

    # Verify graceful binary preview
    prev = client.get("/api/v1/workspace/file/preview", params={"relative_path": "imported/mix/image.png"})
    assert prev.status_code == 200
    assert prev.json()["preview_supported"] is False

    # Clean up imported test folder
    import shutil
    imp_dir = WORKSPACE_DIR / "imported" / "mix"
    if imp_dir.exists():
        shutil.rmtree(imp_dir)
