"""Nexus Sentinel AI engine package (synthetic tabular demonstration)."""

from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment, predict_assessment_detailed
from ml_engine.schema import FEATURE_NAMES, SCHEMA_VERSION

__all__ = [
    "FEATURE_NAMES",
    "SCHEMA_VERSION",
    "SYNTHETIC_INFERENCE_EXAMPLES",
    "predict_assessment",
    "predict_assessment_detailed",
]

