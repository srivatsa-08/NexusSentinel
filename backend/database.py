"""Database configuration and virtual organization state for Nexus Sentinel."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "nexus_sentinel.db"

VIRTUAL_ORG_SEED: list[dict[str, Any]] = [
    {
        "endpoint_id": "FIN-001",
        "device_name": "FIN-WS-01",
        "department": "Finance",
        "virtual_os": "Windows 11 Enterprise (Simulated)",
        "files": [
            ("Q4_financial_ledger.xlsx", "Spreadsheet", "4.2 MB"),
            ("payroll_disbursement_nov.csv", "CSV Data", "1.8 MB"),
            ("tax_audit_2026.pdf", "PDF Document", "6.5 MB"),
            ("vendor_invoices_batch.xlsx", "Spreadsheet", "3.1 MB"),
            ("board_budget_deck.pptx", "Presentation", "12.4 MB"),
            ("treasury_reconciliation.xlsx", "Spreadsheet", "2.9 MB"),
            ("accounts_payable_export.csv", "CSV Data", "940 KB"),
            ("corporate_card_statements.pdf", "PDF Document", "5.1 MB"),
            ("fixed_assets_register.xlsx", "Spreadsheet", "1.4 MB"),
            ("quarterly_earnings_draft.docx", "Word Document", "820 KB"),
            ("bank_wire_templates.docx", "Word Document", "410 KB"),
            ("erp_gl_snapshot.bak", "Archive", "18.2 MB"),
            ("compliance_sox_checklist.xlsx", "Spreadsheet", "670 KB"),
            ("expense_reimbursements.csv", "CSV Data", "1.1 MB"),
            ("annual_forecast_model.xlsx", "Spreadsheet", "7.8 MB"),
        ],
    },
    {
        "endpoint_id": "DEV-001",
        "device_name": "DEV-WS-01",
        "department": "Engineering",
        "virtual_os": "Ubuntu 24.04 LTS (Simulated)",
        "files": [
            ("nexus_core_service.py", "Python Source", "48 KB"),
            ("ml_pipeline_config.yaml", "YAML Config", "12 KB"),
            ("architecture_diagram.svg", "Vector Graphic", "340 KB"),
            ("docker-compose.prod.yml", "YAML Config", "8 KB"),
            ("api_gateway_routes.ts", "TypeScript", "64 KB"),
            ("unit_test_fixtures.json", "JSON Data", "1.2 MB"),
            ("release_build_v2.tar.gz", "Compressed Archive", "42.0 MB"),
            ("kernel_telemetry_mock.c", "C Source", "29 KB"),
            ("ci_pipeline_logs.txt", "Log File", "3.4 MB"),
            ("schema_migrations_004.sql", "SQL Script", "18 KB"),
            ("frontend_bundle_map.js.map", "Source Map", "5.6 MB"),
            ("benchmark_results.csv", "CSV Data", "890 KB"),
            ("dependency_lockfile.json", "JSON Data", "410 KB"),
            ("ssh_config_template.txt", "Text Config", "4 KB"),
            ("readme_internal_wiki.md", "Markdown", "22 KB"),
        ],
    },
    {
        "endpoint_id": "HR-001",
        "device_name": "HR-WS-01",
        "department": "Human Resources",
        "virtual_os": "Windows 11 Pro (Simulated)",
        "files": [
            ("employee_directory_2026.xlsx", "Spreadsheet", "2.1 MB"),
            ("onboarding_handbook.pdf", "PDF Document", "4.8 MB"),
            ("benefits_enrollment_guide.pdf", "PDF Document", "3.2 MB"),
            ("offer_letter_template.docx", "Word Document", "310 KB"),
            ("performance_review_cycle.xlsx", "Spreadsheet", "1.5 MB"),
            ("payroll_adjustments_q4.csv", "CSV Data", "620 KB"),
            ("training_completion_log.csv", "CSV Data", "490 KB"),
            ("interview_scorecards.docx", "Word Document", "780 KB"),
            ("org_chart_update.pptx", "Presentation", "6.1 MB"),
            ("leave_balances_nov.xlsx", "Spreadsheet", "910 KB"),
            ("policy_remote_work_v3.pdf", "PDF Document", "1.9 MB"),
            ("contractor_agreements.zip", "Compressed Archive", "14.5 MB"),
            ("diversity_metrics_report.xlsx", "Spreadsheet", "1.1 MB"),
            ("exit_interview_notes.docx", "Word Document", "250 KB"),
            ("health_plan_summary.pdf", "PDF Document", "2.7 MB"),
        ],
    },
    {
        "endpoint_id": "BAK-001",
        "device_name": "BAK-SRV-01",
        "department": "IT & Backup",
        "virtual_os": "Debian 12 Server (Simulated)",
        "files": [
            ("nightly_db_dump_01.tar.gz", "Compressed Archive", "128.4 MB"),
            ("nightly_db_dump_02.tar.gz", "Compressed Archive", "130.1 MB"),
            ("vm_snapshot_fin_ws.img", "Disk Image", "512.0 MB"),
            ("vm_snapshot_hr_ws.img", "Disk Image", "480.0 MB"),
            ("incremental_backup_manifest.json", "JSON Data", "2.4 MB"),
            ("tape_archive_index.csv", "CSV Data", "1.9 MB"),
            ("rsync_verification_log.txt", "Log File", "4.5 MB"),
            ("backup_retention_policy.yaml", "YAML Config", "14 KB"),
            ("storage_pool_health.json", "JSON Data", "380 KB"),
            ("offsite_sync_checksums.sha256", "Checksum", "92 KB"),
            ("disaster_recovery_runbook.md", "Markdown", "56 KB"),
            ("nas_volume_quota_report.csv", "CSV Data", "410 KB"),
            ("syslog_aggregator_week47.gz", "Compressed Archive", "64.2 MB"),
            ("cert_store_backup.p12", "Certificate Archive", "120 KB"),
            ("cron_scheduler_config.conf", "Config", "6 KB"),
        ],
    },
    {
        "endpoint_id": "ADM-001",
        "device_name": "ADM-WS-01",
        "department": "Administration",
        "virtual_os": "macOS 15 Sequoia (Simulated)",
        "files": [
            ("executive_board_minutes.docx", "Word Document", "1.3 MB"),
            ("office_lease_renewal.pdf", "PDF Document", "8.4 MB"),
            ("vendor_nda_signed.pdf", "PDF Document", "2.2 MB"),
            ("travel_itinerary_summit.pdf", "PDF Document", "980 KB"),
            ("facility_access_badges.csv", "CSV Data", "340 KB"),
            ("annual_company_retreat.pptx", "Presentation", "19.5 MB"),
            ("insurance_policy_2026.pdf", "PDF Document", "5.7 MB"),
            ("procurement_requests.xlsx", "Spreadsheet", "1.8 MB"),
            ("legal_counsel_memo.docx", "Word Document", "640 KB"),
            ("press_release_draft.docx", "Word Document", "420 KB"),
            ("security_audit_schedule.xlsx", "Spreadsheet", "510 KB"),
            ("asset_inventory_hq.csv", "CSV Data", "760 KB"),
            ("meeting_recordings_index.json", "JSON Data", "180 KB"),
            ("emergency_contacts_list.xlsx", "Spreadsheet", "290 KB"),
            ("corporate_bylaws.pdf", "PDF Document", "3.9 MB"),
        ],
    },
]


def _build_initial_files(seed_entry: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "file_id": f"{seed_entry['endpoint_id']}-f{idx + 1:02d}",
            "filename": fname,
            "file_type": ftype,
            "size": fsize,
            "last_activity": "Baseline verified",
            "status": "intact",
            "assessment_id": None,
        }
        for idx, (fname, ftype, fsize) in enumerate(seed_entry["files"])
    ]


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_columns(cursor: sqlite3.Cursor, table: str, columns: dict[str, str]) -> None:
    """Idempotently add missing columns to an existing SQLite table."""
    existing = {row[1] for row in cursor.execute(f"PRAGMA table_info({table})").fetchall()}
    for col_name, col_type in columns.items():
        if col_name not in existing:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")


def init_db() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS endpoints (
            endpoint_id TEXT PRIMARY KEY,
            status TEXT NOT NULL
        )
        """
    )

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

    _ensure_columns(
        cursor,
        "endpoints",
        {
            "device_name": "TEXT",
            "department": "TEXT",
            "virtual_os": "TEXT",
            "current_risk_score": "INTEGER DEFAULT 0",
            "last_activity": "TEXT",
            "containment_status": "TEXT DEFAULT 'none'",
            "virtual_files": "TEXT",
        },
    )
    _ensure_columns(
        cursor,
        "assessments",
        {
            "model_version": "TEXT",
            "processing_time_ms": "REAL",
            "explanations": "TEXT",
            "timeline": "TEXT",
        },
    )
    _ensure_columns(
        cursor,
        "incidents",
        {
            "timestamp": "TEXT",
            "timeline": "TEXT",
            "severity": "TEXT DEFAULT 'high'",
            "investigation_status": "TEXT DEFAULT 'open'",
            "admin_notes": "TEXT DEFAULT ''",
            "risk_score": "INTEGER",
            "model_version": "TEXT",
            "detection_reason": "TEXT",
            "processing_time_ms": "REAL",
            "explanations": "TEXT",
            "raw_observation": "TEXT",
        },
    )

    for entry in VIRTUAL_ORG_SEED:
        files_json = json.dumps(_build_initial_files(entry))
        cursor.execute(
            """
            INSERT OR IGNORE INTO endpoints
            (endpoint_id, status, device_name, department, virtual_os, current_risk_score, last_activity, containment_status, virtual_files)
            VALUES (?, 'monitoring', ?, ?, ?, 0, 'Monitoring active', 'none', ?)
            """,
            (
                entry["endpoint_id"],
                entry["device_name"],
                entry["department"],
                entry["virtual_os"],
                files_json,
            ),
        )

    conn.commit()
    conn.close()


def reset_db() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessments")
    cursor.execute("DELETE FROM incidents")
    for entry in VIRTUAL_ORG_SEED:
        files_json = json.dumps(_build_initial_files(entry))
        cursor.execute(
            """
            UPDATE endpoints
            SET status = 'monitoring',
                current_risk_score = 0,
                last_activity = 'Monitoring active',
                containment_status = 'none',
                virtual_files = ?
            WHERE endpoint_id = ?
            """,
            (files_json, entry["endpoint_id"]),
        )
    conn.commit()
    conn.close()
