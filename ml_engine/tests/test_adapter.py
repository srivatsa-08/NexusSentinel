"""Targeted tests for the CSV/JSON behavioural telemetry adapter."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml_engine.adapter import evaluate_adapted_telemetry, load_telemetry_file


def test_rejects_executable_or_unsupported_file(tmp_path: Path) -> None:
    exe_file = tmp_path / "payload.exe"
    exe_file.write_text("not_allowed", encoding="utf-8")
    with pytest.raises(ValueError, match="Unsupported file type"):
        load_telemetry_file(exe_file)


def test_rejects_incompatible_csv_missing_columns(tmp_path: Path) -> None:
    bad_csv = tmp_path / "bad.csv"
    bad_csv.write_text("file_mod_rate,entropy_delta\n10.0,0.2\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing required columns"):
        load_telemetry_file(bad_csv)


def test_loads_json_with_optional_metadata_and_evaluates(tmp_path: Path) -> None:
    json_file = tmp_path / "telemetry.json"
    records = [
        {
            "observation_id": "obs-1",
            "timestamp": "2026-11-25T10:00:00Z",
            "label": "normal",
            "file_mod_rate": 12.0,
            "entropy_delta": 0.35,
            "rename_ratio": 0.08,
            "unique_ext_count": 3,
            "burst_io_score": 0.22,
            "shadow_copy_access_flag": 0,
        },
        {
            "observation_id": "obs-2",
            "timestamp": "2026-11-25T10:01:00Z",
            "label": "suspicious",
            "file_mod_rate": 160.0,
            "entropy_delta": 2.8,
            "rename_ratio": 0.75,
            "unique_ext_count": 18,
            "burst_io_score": 0.88,
            "shadow_copy_access_flag": 1,
        },
    ]
    json_file.write_text(json.dumps(records), encoding="utf-8")

    adapted = load_telemetry_file(json_file)
    assert adapted.observation_ids == ["obs-1", "obs-2"]
    assert adapted.labels == [0, 1]
    assert "label" not in adapted.features[0]

    report = evaluate_adapted_telemetry(adapted)
    assert report["evaluated_samples"] == 2
    assert report["accuracy"] == 1.0
    assert report["precision"] == 1.0
    assert report["recall"] == 1.0
    assert report["f1_score"] == 1.0
    assert report["false_positive_rate"] == 0.0
    assert report["provenance"]["format"] == "json"

