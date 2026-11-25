"""Regression tests for stability and performance fixes."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from backend import database
from backend.gateway import GatewayController


def test_sqlite_migration_preserves_records_and_is_idempotent(tmp_path: Path, monkeypatch) -> None:
    db_file = tmp_path / "legacy.db"
    conn = sqlite3.connect(str(db_file))
    conn.execute("CREATE TABLE endpoints (endpoint_id TEXT PRIMARY KEY, status TEXT NOT NULL)")
    conn.execute(
        "CREATE TABLE assessments (assessment_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, "
        "timestamp TEXT NOT NULL, risk_score INTEGER, label TEXT NOT NULL, indicators TEXT NOT NULL, "
        "simulated INTEGER NOT NULL DEFAULT 1)"
    )
    conn.execute(
        "CREATE TABLE incidents (incident_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, "
        "assessment_id TEXT NOT NULL, status TEXT NOT NULL, checklist TEXT NOT NULL, "
        "simulated INTEGER NOT NULL DEFAULT 1)"
    )
    conn.execute(
        "INSERT INTO assessments VALUES ('a-old', 'demo-01', '2026-01-01T00:00:00Z', 0, 'normal', '[]', 1)"
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(database, "DB_PATH", db_file)
    database.init_db()
    database.init_db()  # idempotent second run

    conn2 = sqlite3.connect(str(db_file))
    cols = {r[1] for r in conn2.execute("PRAGMA table_info(assessments)").fetchall()}
    assert {"model_version", "processing_time_ms", "explanations", "timeline"}.issubset(cols)
    row = conn2.execute("SELECT assessment_id FROM assessments WHERE assessment_id = 'a-old'").fetchone()
    assert row is not None
    conn2.close()


def test_gateway_queue_releases_capacity_for_legitimate_traffic() -> None:
    gw = GatewayController(quota_limit=5, queue_capacity=10)
    for _ in range(5):
        status = gw.simulate_scenario("normal_upload")
        assert status["queue_depth"] == 0
    assert status["accepted_requests"] == 15
    assert status["rejected_requests"] == 0
