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



def test_multi_sequence_early_warning_evaluation() -> None:
    from ml_engine.early_warning import run_multi_sequence_early_warning_evaluation

    report = run_multi_sequence_early_warning_evaluation(num_sequences=120, seed=424242)
    assert report["total_sequences"] == 120
    assert report["attack_sequences"] == 60
    assert report["benign_control_sequences"] == 60
    assert report["train_val_exact_overlap"] == 0
    assert report["ground_truth_excluded_from_inputs"] is True
    assert report["latency_benchmark_calls"] == 100
    assert report["latency_mean_ms"] > 0
    assert report["latency_median_ms"] > 0
    assert report["latency_p95_ms"] >= report["latency_median_ms"]
    assert report["peak_traced_memory_mb"] > 0
