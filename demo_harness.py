"""Standalone Python demonstration harness for Nexus Sentinel.

Emits harmless, clearly labelled synthetic telemetry directly to the running
backend API independently of the frontend UI. Does not touch or encrypt files.
"""

from __future__ import annotations

import argparse
import json
import urllib.request

from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES


def emit_synthetic_telemetry(
    scenario: str = "suspicious",
    endpoint_id: str = "FIN-001",
    base_url: str = "http://127.0.0.1:8000",
) -> dict:
    if scenario not in SYNTHETIC_INFERENCE_EXAMPLES:
        raise ValueError(f"Unknown scenario: {scenario}")

    payload = {
        "endpoint_id": endpoint_id,
        "scenario_label": scenario,
        "telemetry_source": "independent_harness",
        "observation": SYNTHETIC_INFERENCE_EXAMPLES[scenario],
    }
    req = urllib.request.Request(
        f"{base_url}/api/v1/workspace/ingest",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nexus Sentinel Independent Synthetic Telemetry Harness")
    parser.add_argument("--scenario", default="suspicious", choices=["normal", "backup", "compression", "suspicious"])
    parser.add_argument("--endpoint", default="FIN-001")
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    result = emit_synthetic_telemetry(args.scenario, args.endpoint, args.url)
    print(json.dumps(result, indent=2))
