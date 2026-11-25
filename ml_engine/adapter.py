"""Reusable CSV/JSON adapter for non-executable behavioural telemetry."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score

from ml_engine.predict import predict_assessment
from ml_engine.schema import FEATURE_NAMES, SCHEMA_VERSION, validate_observation

ALLOWED_EXTENSIONS = {".csv", ".json"}
LABEL_MAP = {"0": 0, "normal": 0, "1": 1, "suspicious": 1}


@dataclass(frozen=True)
class AdaptedTelemetry:
    """Validated telemetry records separated from optional metadata and labels."""

    features: list[dict[str, float | int]]
    labels: list[int | None]
    timestamps: list[str | None]
    observation_ids: list[str | None]
    provenance: dict[str, Any]


def _parse_label(raw: Any) -> int | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        raise ValueError(f"Invalid ground-truth label: {raw!r}")
    key = str(raw).strip().lower()
    if key not in LABEL_MAP:
        raise ValueError(f"Unsupported ground-truth label: {raw!r} (expected 0/1 or normal/suspicious)")
    return LABEL_MAP[key]


def _coerce_record(raw: dict[str, Any]) -> dict[str, float | int]:
    record: dict[str, float | int] = {}
    for name in FEATURE_NAMES:
        if name not in raw:
            raise ValueError(f"Missing required feature '{name}'")
        val = raw[name]
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                raise ValueError(f"Empty value for feature '{name}'")
            val = int(val) if name in ("unique_ext_count", "shadow_copy_access_flag") and val.isdigit() else float(val)
        record[name] = val
    ok, reasons, _ = validate_observation(record)
    if not ok:
        raise ValueError(f"Schema validation failed: {'; '.join(reasons)}")
    return record


def load_telemetry_file(file_path: str | Path, source_name: str | None = None) -> AdaptedTelemetry:
    """Load and validate a non-executable CSV or JSON telemetry file."""
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Only .csv and .json telemetry files are accepted.")
    if not path.is_file():
        raise FileNotFoundError(f"Telemetry file not found: {path}")

    raw_rows: list[dict[str, Any]]
    if ext == ".csv":
        with path.open("r", newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if not reader.fieldnames:
                raise ValueError("Incompatible CSV dataset: missing header row.")
            missing_cols = [c for c in FEATURE_NAMES if c not in reader.fieldnames]
            if missing_cols:
                raise ValueError(f"Incompatible CSV dataset: missing required columns {missing_cols}")
            raw_rows = list(reader)
    else:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(parsed, dict):
            raw_rows = [parsed]
        elif isinstance(parsed, list):
            raw_rows = parsed
        else:
            raise ValueError("Incompatible JSON dataset: expected a JSON object or array of objects.")

    if not raw_rows:
        raise ValueError("Incompatible dataset: contains zero records.")

    features: list[dict[str, float | int]] = []
    labels: list[int | None] = []
    timestamps: list[str | None] = []
    observation_ids: list[str | None] = []

    for idx, row in enumerate(raw_rows):
        if not isinstance(row, dict):
            raise ValueError(f"Record {idx} is not an object.")
        features.append(_coerce_record(row))
        labels.append(_parse_label(row.get("label")))
        ts = row.get("timestamp")
        timestamps.append(str(ts) if ts not in (None, "") else None)
        obs_id = row.get("observation_id") or row.get("assessment_id")
        observation_ids.append(str(obs_id) if obs_id not in (None, "") else None)

    labelled_count = sum(1 for lbl in labels if lbl is not None)
    provenance = {
        "source": source_name or path.name,
        "format": ext.lstrip("."),
        "schema_version": SCHEMA_VERSION,
        "record_count": len(features),
        "labelled_count": labelled_count,
        "limitations": (
            "Evaluated using existing model on adapted tabular telemetry; "
            "no retraining performed and no real-world protection claimed."
        ),
    }

    return AdaptedTelemetry(
        features=features,
        labels=labels,
        timestamps=timestamps,
        observation_ids=observation_ids,
        provenance=provenance,
    )


def evaluate_adapted_telemetry(
    adapted: AdaptedTelemetry,
    model_path: str | Path | None = None,
) -> dict[str, Any]:
    """Evaluate compatible labelled records using the existing saved model."""
    y_true: list[int] = []
    y_pred: list[int] = []

    for feat, lbl in zip(adapted.features, adapted.labels):
        if lbl is None:
            continue
        res = predict_assessment(feat, model_path=model_path)
        if res["label"] == "unknown":
            continue
        y_true.append(lbl)
        y_pred.append(1 if res["label"] == "suspicious" else 0)

    if not y_true:
        raise ValueError("No valid labelled records available for evaluation.")

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    total = len(y_true)
    accuracy = float((tp + tn) / total)
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    return {
        "provenance": adapted.provenance,
        "evaluated_samples": total,
        "accuracy": round(accuracy, 6),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 6),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 6),
        "f1_score": round(float(f1_score(y_true, y_pred, zero_division=0)), 6),
        "false_positive_rate": round(fpr, 6),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }

