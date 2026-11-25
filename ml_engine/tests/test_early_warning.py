"""Targeted tests for early-warning evaluation and virtual stream suspension."""

from __future__ import annotations

from ml_engine.early_warning import run_early_warning_evaluation


def test_early_warning_flags_suspicious_and_suspends_stream() -> None:
    report = run_early_warning_evaluation()
    assert report["time_to_first_alert_sim_s"] == 6.0
    assert report["avg_assessment_latency_ms"] >= 0.0
    assert report["containment_recording_latency_ms"] is not None
    assert report["containment_recording_latency_ms"] >= 0.0
    assert report["early_detection_rate"] == 1.0
    assert report["missed_detections"] == 0
    assert report["false_alarms"] == 0
    assert report["stream_suspended"] is True
    assert len(report["simulated_incidents"]) == 1

    incident = report["simulated_incidents"][0]
    assert incident["status"] == "simulated_isolated"
    assert incident["simulated"] is True
    assert "model_derived" in incident["explanations"]
    assert "heuristic" in incident["explanations"]

