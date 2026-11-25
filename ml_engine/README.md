# Nexus Sentinel — ML Engine (`ml_engine/`)

Defensive ransomware early-warning classification using **synthetic tabular observations only**.

> **Scope & Limitations:** Trained and evaluated exclusively on synthetic tabular records (`datasets/`). `risk_score` is a model-derived score in `[0, 100]` and is **not** a calibrated real-world probability. Does **not** monitor live filesystems, terminate processes, modify networks, or claim real-world ransomware protection.

---

## 1. Backend Integration Guide

The ML engine provides a clean Python module interface that the FastAPI backend can directly import.

### Quick Start
```python
from ml_engine import predict_assessment, SYNTHETIC_INFERENCE_EXAMPLES

# Using standard synthetic scenario examples
sample_obs = SYNTHETIC_INFERENCE_EXAMPLES["suspicious"]
result = predict_assessment(sample_obs)
```

### Inference Output Specification (`API_CONTRACT.md` Compliant)
`predict_assessment(observation: dict)` returns the core assessment fields. The backend supplies `assessment_id`, `endpoint_id`, and `timestamp`:

```json
{
  "risk_score": 99,
  "label": "suspicious",
  "indicators": [
    "model: unique_ext_count increases suspicious score by 38.0 pts vs benign median",
    "model: rename_ratio increases suspicious score by 35.6 pts vs benign median",
    "model: entropy_delta increases suspicious score by 13.5 pts vs benign median",
    "heuristic: elevated entropy delta (>= 1.5)",
    "heuristic: elevated file rename ratio (>= 0.45)",
    "heuristic: broad extension diversity (>= 10)",
    "heuristic: high file modification rate (>= 80/min)",
    "heuristic: sustained I/O burst (>= 0.70)",
    "heuristic: shadow copy access pattern (flag == 1)"
  ],
  "simulated": true
}
```

### Invalid / Unknown Input Handling
If an observation is missing keys, contains invalid types, non-finite values, or out-of-range values, `predict_assessment` safely returns `label: "unknown"` and `risk_score: null` without throwing an unhandled exception:

```json
{
  "risk_score": null,
  "label": "unknown",
  "indicators": ["validation: missing feature: entropy_delta"],
  "simulated": true
}
```

### Detailed Explanations
For endpoints requiring structured separation of explainability indicators:
```python
from ml_engine import predict_assessment_detailed
detailed_result = predict_assessment_detailed(observation)
# detailed_result["explanations"]["model_derived"]
# detailed_result["explanations"]["heuristic"]
```

---

## 2. Feature Schema (`SCHEMA_VERSION = "1.0.0"`)

| Feature | Type | Valid Range | Description |
| :--- | :--- | :--- | :--- |
| `file_mod_rate` | `float` | `[0.0, 10000.0]` | Synthetic file modification rate per minute |
| `entropy_delta` | `float` | `[0.0, 8.0]` | Synthetic average file entropy change |
| `rename_ratio` | `float` | `[0.0, 1.0]` | Synthetic ratio of rename-to-write operations |
| `unique_ext_count` | `int/float` | `[0.0, 1000.0]` | Synthetic distinct file extensions touched |
| `burst_io_score` | `float` | `[0.0, 1.0]` | Synthetic I/O burstiness indicator |
| `shadow_copy_access_flag` | `int` | `0` or `1` | Synthetic shadow-copy-like access flag |

---

## 3. Artifacts, Versions & Dependencies

- **Phase 2 Artifact (Default):** `ml_engine/artifacts/rf_phase2.joblib` (`model_version: "rf-phase2-v1"`)
- **Phase 1 Fallback Artifact:** `ml_engine/artifacts/rf_baseline_v1.joblib` (`model_version: "rf-baseline-v1"`)
- **Evaluation Metrics JSON:** `ml_engine/artifacts/metrics_phase2.json` (Exposes `precision`, `recall`, `f1_score`, `false_positive_rate`, `confusion_matrix`, and scenario breakdown for frontend reporting)
- **Environment & Dependency Requirements:**
  - Python: `3.14.5` (or compatible 3.10+)
  - `scikit-learn`: `1.9.1`
  - `numpy`: `2.5.5`
  - `scipy`: `1.18.1`
  - `joblib`: `1.6.0`
  - `pytest`: `9.2.0`
  - *Note: `pandas` is deliberately avoided in `ml_engine/` due to a Windows Application Control DLL policy blocker on `pandas_datetime.pyd`.*

---

## 4. Latency Characteristics

- **Model inference latency:** Measured in-memory CPU computation for `predict_assessment()`. Single-sample call (including input validation + batched perturbation feature importance) is `~40 ms`; bulk vector inference without perturbation is `< 0.1 ms/sample`.
- **End-to-end detection latency:** Full pipeline latency includes simulator/telemetry generation, backend HTTP transport, database insertion, and frontend polling (typically seconds), which dwarfs raw model inference.

---

## 5. Running Tests

```powershell
.\.venv\Scripts\python.exe -m pytest ml_engine/tests -v
```
