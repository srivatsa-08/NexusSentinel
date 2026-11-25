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

