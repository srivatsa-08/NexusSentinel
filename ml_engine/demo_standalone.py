"""Standalone demonstration runner for Nexus Sentinel ML Engine.

Requires NO frontend and NO backend. Performs live in-memory inference
on synthetic records representing normal, backup, compression, and suspicious activity.
"""

from __future__ import annotations

import json
from ml_engine.predict import predict_assessment, predict_assessment_detailed
from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES


def run_demo() -> None:
    print("=" * 70)
    print(" NEXUS SENTINEL: STANDALONE ML ENGINE LIVE DEMONSTRATION")
    print(" Defensive Ransomware Early-Warning Tabular Classification")
    print(" [100% Synthetic Tabular Observations | Simulated Containment]")
    print("=" * 70)
    print()

    scenarios = ["normal", "backup", "compression", "suspicious"]

    for sc in scenarios:
        obs = SYNTHETIC_INFERENCE_EXAMPLES[sc]
        print(f">> SCENARIO: {sc.upper()}")
        print("  Synthetic Input Features:")
        for k, v in obs.items():
            print(f"    - {k:24}: {v}")

        # Execute actual live model inference
        detailed = predict_assessment_detailed(obs)
        res = predict_assessment(obs)

        print("\n  Live Model Inference Output:")
        print(f"    - Risk Score      : {res['risk_score']} / 100")
        print(f"    - Classification  : {res['label'].upper()}")
        print(f"    - Model Version   : {detailed['model_version']}")
        print(f"    - Simulated Flag  : {res['simulated']}")

        print("\n  Explainable AI - Model-Derived Attributions (Perturbation vs Median):")
        for expl in detailed["explanations"]["model_derived"]:
            print(f"    * {expl}")

        print("\n  Explainable AI - Rule-Based Heuristic Indicators:")
        for expl in detailed["explanations"]["heuristic"]:
            print(f"    * {expl}")

        print("\n" + "-" * 70 + "\n")

    # Edge Case / Input Validation Demo
    print(">> SCENARIO: MALFORMED / INVALID INPUT (Input Validation Check)")
    bad_obs = SYNTHETIC_INFERENCE_EXAMPLES["invalid_range"]
    print("  Input: file_mod_rate = -15.0 (out of bounds)")
    bad_res = predict_assessment(bad_obs)
    print(f"  Result: risk_score = {bad_res['risk_score']} (None), label = '{bad_res['label']}'")
    print(f"  Safely Caught Reasons: {bad_res['indicators']}")
    print("=" * 70)
    print(" Demonstration Complete - Live Inference Verified.")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()
