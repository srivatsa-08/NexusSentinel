"""Integration tests for backend readiness and synthetic inference examples."""

from __future__ import annotations

import json

from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment, predict_assessment_detailed


def test_synthetic_examples_all_conform_to_contract() -> None:
    for name, obs in SYNTHETIC_INFERENCE_EXAMPLES.items():
        res = predict_assessment(obs)
        # JSON serializability check
        dumped = json.dumps(res)
        loaded = json.loads(dumped)

        assert set(loaded.keys()) == {"risk_score", "label", "indicators", "simulated"}
        assert loaded["simulated"] is True

        if name.startswith("invalid"):
            assert loaded["risk_score"] is None
            assert loaded["label"] == "unknown"
            assert len(loaded["indicators"]) > 0
        else:
            assert isinstance(loaded["risk_score"], int)
            assert 0 <= loaded["risk_score"] <= 100
            assert loaded["label"] in ("normal", "suspicious")
            assert len(loaded["indicators"]) > 0


def test_detailed_assessment_serializable() -> None:
    obs = SYNTHETIC_INFERENCE_EXAMPLES["compression"]
    res = predict_assessment_detailed(obs)
    dumped = json.dumps(res)
    loaded = json.loads(dumped)
    assert "explanations" in loaded
    assert "model_derived" in loaded["explanations"]
    assert "heuristic" in loaded["explanations"]
