"""Early-warning evaluation module for Nexus Sentinel synthetic simulations."""

from __future__ import annotations

import time
from typing import Any

from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment_detailed


DEFAULT_MILESTONE_SEQUENCE: list[dict[str, Any]] = [
    {"sim_time_s": 0.0, "expected": "normal", "milestone": False, "observation": SYNTHETIC_INFERENCE_EXAMPLES["normal"]},
    {"sim_time_s": 2.0, "expected": "normal", "milestone": False, "observation": SYNTHETIC_INFERENCE_EXAMPLES["backup"]},
    {"sim_time_s": 4.0, "expected": "normal", "milestone": False, "observation": SYNTHETIC_INFERENCE_EXAMPLES["compression"]},
    {"sim_time_s": 6.0, "expected": "suspicious", "milestone": True, "observation": SYNTHETIC_INFERENCE_EXAMPLES["suspicious"]},
]


def run_early_warning_evaluation(
    sequence: list[dict[str, Any]] | None = None,
    model_path: str | None = None,
) -> dict[str, Any]:
    """Evaluate early-warning detection, latencies, and virtual stream suspension."""
    seq = sequence if sequence is not None else DEFAULT_MILESTONE_SEQUENCE
    stream_active = True
    stream_suspended = False
    simulated_incidents: list[dict[str, Any]] = []
    assessment_latencies_ms: list[float] = []
    containment_latencies_ms: list[float] = []

    time_to_first_alert_sim_s: float | None = None
    milestones_total = 0
    milestones_detected = 0
    missed_detections = 0
    false_alarms = 0

    for idx, step in enumerate(seq):
        if not stream_active:
            break

        obs = step["observation"]
        expected = step["expected"]
        sim_time_s = float(step["sim_time_s"])
        is_milestone = bool(step.get("milestone", False))
        if is_milestone and expected == "suspicious":
            milestones_total += 1

        t_start = time.monotonic_ns()
        res = predict_assessment_detailed(obs, model_path=model_path)
        t_assess_end = time.monotonic_ns()

        assess_ms = (t_assess_end - t_start) / 1_000_000.0
        assessment_latencies_ms.append(assess_ms)

        predicted = res["label"]
        if expected == "normal" and predicted == "suspicious":
            false_alarms += 1
        elif expected == "suspicious" and predicted != "suspicious":
            missed_detections += 1

        if predicted == "suspicious":
            if time_to_first_alert_sim_s is None:
                time_to_first_alert_sim_s = sim_time_s
            if is_milestone and expected == "suspicious":
                milestones_detected += 1

            t_contain_start = time.monotonic_ns()
            incident = {
                "step_index": idx,
                "sim_time_s": sim_time_s,
                "risk_score": res["risk_score"],
                "label": predicted,
                "status": "simulated_isolated",
                "explanations": res["explanations"],
                "simulated": True,
            }
            simulated_incidents.append(incident)
            stream_active = False
            stream_suspended = True
            t_contain_end = time.monotonic_ns()
            containment_latencies_ms.append((t_contain_end - t_contain_start) / 1_000_000.0)

    early_detection_rate = (
        round(milestones_detected / milestones_total, 4) if milestones_total > 0 else 0.0
    )

    return {
        "time_to_first_alert_sim_s": time_to_first_alert_sim_s,
        "avg_assessment_latency_ms": round(
            sum(assessment_latencies_ms) / max(len(assessment_latencies_ms), 1), 4
        ),
        "containment_recording_latency_ms": round(
            sum(containment_latencies_ms) / max(len(containment_latencies_ms), 1), 4
        )
        if containment_latencies_ms
        else None,
        "early_detection_rate": early_detection_rate,
        "missed_detections": missed_detections,
        "false_alarms": false_alarms,
        "stream_suspended": stream_suspended,
        "simulated_incidents": simulated_incidents,
    }



def run_multi_sequence_early_warning_evaluation(
    num_sequences: int = 120,
    seed: int = 424242,
    model_path: str | None = None,
) -> dict[str, Any]:
    """Evaluate early-warning performance across >=100 independent synthetic sequences."""
    import statistics
    import tracemalloc

    import numpy as np

    from datasets.generate_phase2 import _sample_phase2_scenario
    from ml_engine.predict import predict_assessment
    from ml_engine.schema import FEATURE_NAMES
    from ml_engine.train import load_csv_dataset
    from ml_engine.train_phase2 import PHASE2_TRAIN_CSV, PHASE2_VAL_CSV, count_exact_row_overlap

    rng = np.random.default_rng(seed)
    benign_count = num_sequences // 2
    attack_count = num_sequences - benign_count
    milestone_s = 8.0

    early_detections = 0
    late_detections = 0
    missed_detections = 0
    premature_alerts = 0
    benign_control_false_alarms = 0
    benign_control_true_negatives = 0
    first_alert_times: list[float] = []

    def _to_obs(row: dict[str, Any]) -> dict[str, float | int]:
        return {k: row[k] for k in FEATURE_NAMES}

    # 1. Benign-only control sequences
    for _ in range(benign_count):
        seq_rows = (
            _sample_phase2_scenario(rng, "normal", 2)
            + _sample_phase2_scenario(rng, "backup", 2)
            + _sample_phase2_scenario(rng, "compression", 2)
        )
        flagged = False
        for row in seq_rows:
            if predict_assessment(_to_obs(row), model_path=model_path)["label"] == "suspicious":
                flagged = True
                break
        if flagged:
            benign_control_false_alarms += 1
        else:
            benign_control_true_negatives += 1

    # 2. Attack-onset sequences (3 benign steps at 0,2,4s + 3 suspicious steps at 6,8,10s)
    for _ in range(attack_count):
        benign_prefix = (
            _sample_phase2_scenario(rng, "normal", 1)
            + _sample_phase2_scenario(rng, "backup", 1)
            + _sample_phase2_scenario(rng, "compression", 1)
        )
        suspicious_suffix = _sample_phase2_scenario(rng, "suspicious", 3)
        seq_rows = benign_prefix + suspicious_suffix

        detected_time: float | None = None
        pre_attack_fp = False
        for step_idx, row in enumerate(seq_rows):
            sim_t = float(step_idx * 2.0)
            res = predict_assessment(_to_obs(row), model_path=model_path)
            if res["label"] == "suspicious":
                if step_idx < 3:
                    pre_attack_fp = True
                else:
                    detected_time = sim_t
                break

        if pre_attack_fp:
            premature_alerts += 1
        elif detected_time is None:
            missed_detections += 1
        else:
            first_alert_times.append(detected_time)
            if detected_time <= milestone_s:
                early_detections += 1
            else:
                late_detections += 1

    # 3. 100 warm assessment calls WITHOUT tracemalloc
    sample_obs = _to_obs(_sample_phase2_scenario(rng, "suspicious", 1)[0])
    predict_assessment(sample_obs, model_path=model_path)
    latencies_ms: list[float] = []
    for _ in range(100):
        t0 = time.perf_counter_ns()
        predict_assessment(sample_obs, model_path=model_path)
        latencies_ms.append((time.perf_counter_ns() - t0) / 1_000_000.0)
    lat_sorted = sorted(latencies_ms)

    # 4. Separate memory measurement using tracemalloc
    tracemalloc.start()
    predict_assessment(sample_obs, model_path=model_path)
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # 5. Overlap & ground-truth exclusion check
    x_tr, _, _ = load_csv_dataset(PHASE2_TRAIN_CSV)
    x_va, _, _ = load_csv_dataset(PHASE2_VAL_CSV)
    overlap = count_exact_row_overlap(x_tr, x_va)

    sorted_alerts = sorted(first_alert_times)
    median_alert = round(statistics.median(sorted_alerts), 4) if sorted_alerts else None
    p95_alert = (
        round(sorted_alerts[min(len(sorted_alerts) - 1, int(0.95 * len(sorted_alerts)))], 4)
        if sorted_alerts
        else None
    )

    return {
        "evaluation_seed": seed,
        "total_sequences": num_sequences,
        "attack_sequences": attack_count,
        "benign_control_sequences": benign_count,
        "milestone_sim_s": milestone_s,
        "early_detections": early_detections,
        "late_detections": late_detections,
        "missed_detections": missed_detections,
        "premature_alerts": premature_alerts,
        "benign_control_true_negatives": benign_control_true_negatives,
        "benign_control_false_alarms": benign_control_false_alarms,
        "early_detection_rate": round(early_detections / attack_count, 4) if attack_count else 0.0,
        "benign_control_false_alarm_rate": round(benign_control_false_alarms / benign_count, 4) if benign_count else 0.0,
        "median_time_to_first_alert_sim_s": median_alert,
        "p95_time_to_first_alert_sim_s": p95_alert,
        "time_to_first_alert_note": "Reflects fixed synthetic observation schedule (attack onset at sim_t = 6.0 s).",
        "latency_benchmark_calls": 100,
        "latency_mean_ms": round(statistics.mean(latencies_ms), 4),
        "latency_median_ms": round(statistics.median(latencies_ms), 4),
        "latency_p95_ms": round(lat_sorted[94], 4),
        "peak_traced_memory_mb": round(peak_bytes / (1024 * 1024), 4),
        "memory_method": "Python tracemalloc peak traced Python allocations over 1 suspicious assessment call (excludes native C/sklearn heap)",
        "train_val_exact_overlap": overlap,
        "ground_truth_excluded_from_inputs": "label" not in FEATURE_NAMES and "scenario" not in FEATURE_NAMES,
    }
