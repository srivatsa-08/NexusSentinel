"""Database configuration and models for Nexus Sentinel backend using SQLite."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "nexus_sentinel.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()

    # Endpoints table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS endpoints (
            endpoint_id TEXT PRIMARY KEY,
            status TEXT NOT NULL
        )
        """
    )

    # Assessments table with extra columns for explanations, timeline, latency, version
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS assessments (
            assessment_id TEXT PRIMARY KEY,
            endpoint_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            risk_score INTEGER,
            label TEXT NOT NULL,
            indicators TEXT NOT NULL,
            simulated INTEGER NOT NULL DEFAULT 1,
            model_version TEXT,
            processing_time_ms REAL,
            explanations TEXT,
            timeline TEXT
        )
        """
    )

    # Incidents table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id TEXT PRIMARY KEY,
            endpoint_id TEXT NOT NULL,
            assessment_id TEXT NOT NULL,
            status TEXT NOT NULL,
            checklist TEXT NOT NULL,
            simulated INTEGER NOT NULL DEFAULT 1,
            timestamp TEXT,
            timeline TEXT
        )
        """
    )

    # Insert default endpoint if not present
    cursor.execute(
        "INSERT OR IGNORE INTO endpoints (endpoint_id, status) VALUES ('demo-01', 'monitoring')"
    )

    conn.commit()
    conn.close()


def reset_db() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessments")
    cursor.execute("DELETE FROM incidents")
    cursor.execute("UPDATE endpoints SET status = 'monitoring' WHERE endpoint_id = 'demo-01'")
    conn.commit()
    conn.close()
