# Nexus Sentinel — Final Technical Documentation

> **Scope & Disclaimer:** Nexus Sentinel is a defensive ransomware early-warning **prototype** evaluated exclusively on **synthetic tabular observations**. All endpoint isolation and containment actions are **simulated**. This prototype does **not** claim production ransomware protection, live OS/filesystem monitoring, or external real-world validation.

---

## 1. Problem Addressed
Ransomware early-warning systems must distinguish malicious encryption bursts from legitimate high-I/O or high-entropy workloads (such as automated backups and archive compression). Rule-only thresholds on single metrics (e.g., high entropy or high file modification rate) trigger high false-positive rates on benign workloads. Nexus Sentinel demonstrates a lightweight, explainable tabular ML approach that separates benign high-I/O/high-entropy activity from multi-feature ransomware-like patterns.

---

## 2. System Architecture (Implemented)
1. **ML Engine (`ml_engine/`, `datasets/`):**
   - Versioned 6-feature schema (`SCHEMA_VERSION = "1.0.0"`): `file_mod_rate`, `entropy_delta`, `rename_ratio`, `unique_ext_count`, `burst_io_score`, `shadow_copy_access_flag`.
   - CPU-based `RandomForestClassifier` (`rf_phase2.joblib`, with `rf_baseline_v1.joblib` preserved as fallback).
   - Reusable CSV/JSON telemetry adapter (`ml_engine/adapter.py`) and early-warning evaluator (`ml_engine/early_warning.py`).
2. **Backend (`backend/`):**
   - FastAPI + SQLite (`backend/nexus_sentinel.db`) with CORS for `localhost:5173`.
   - Routes: `/api/v1/health`, `/api/v1/endpoints`, `/api/v1/assessments`, `/api/v1/incidents`, `/api/v1/metrics`, `/api/v1/demo/start`, `/api/v1/demo/reset`, `/api/v1/assessment/batch`, `/api/v1/download/sample-dataset/{format}`, and `/api/v1/monitor/{status,start,pause,resume,stop,step,early-warning}`.
3. **Frontend (`frontend/`):**
   - React + Vite + Tailwind CSS + Recharts + Lucide icons.
   - Views: Overview, Simulation Lab (file picker, virtual in-memory workspace, continuous replay controls, batch summary), Endpoints, Incidents, and Model Analytics.

---

## 3. ML Methodology
- **Model:** CPU `RandomForestClassifier` (`n_estimators=120`, `max_depth=8`, `min_samples_leaf=3`, `random_state=42`, `n_jobs=1`).
- **Training & Validation Separation:**
  - `datasets/train_phase2.csv`: `1,200` synthetic rows (`400` normal, `250` backup, `150` compression, `400` suspicious; `seed=2027`).
  - `datasets/val_phase2.csv`: `600` independent synthetic rows (`200` normal, `125` backup, `75` compression, `200` suspicious; `seed=9001`).
  - Exact feature-row overlap between train and validation: **`0`**. Ground-truth labels (`label`, `scenario`) are excluded from `FEATURE_NAMES`.
- **Explainability:** `predict_assessment_detailed()` separates:
  - **Model-derived explanations (`model: ...`):** Local perturbation sensitivity comparing `P(suspicious | x)` against benign training medians.
  - **Heuristic explanations (`heuristic: ...`):** Explicit threshold checks.

---

## 4. Detection & Simulated Containment Workflow
1. Synthetic observation enters via `/api/v1/demo/start`, `/api/v1/monitor/step`, or `/api/v1/assessment/batch`.
2. `validate_observation()` checks types, finiteness, and bounds; invalid inputs return `label: "unknown"`, `risk_score: null`.
3. `predict_assessment_detailed()` computes `risk_score` (`0–100`, uncalibrated) and `label` (`"suspicious"` if `>= 50`, else `"normal"`).
4. If `"suspicious"`, the backend records a simulated incident (`status: "simulated_isolated"`), updates `demo-01` to `simulated_isolated` in SQLite, and logs monotonic event timings (`Observation Received` → `Assessment Completed` → `Alert Generated` → `Simulated Containment Recorded`).

---

## 5. Verified Performance Metrics (Synthetic Benchmarks)
Measured on `datasets/val_phase2.csv` (`600` synthetic records):

| Metric | Phase 1 Baseline (`rf_baseline_v1`) | Phase 2 Model (`rf_phase2-v1`) |
| :--- | :---: | :---: |
| **Precision** | `68.99%` | **`98.01%`** |
| **Recall** | `99.00%` | **`98.50%`** |
| **F1 Score** | `0.8131` | **`0.9825`** |
| **False-Positive Rate** | `22.25%` (`89/400`) | **`1.00%`** (`4/400`) |
| **Backup FP / Compression FP** | `23/125` / `66/75` | **`3/125`** / **`1/75`** |
| **Confusion Matrix** | `TN=311, FP=89, FN=2, TP=198` | **`TN=396, FP=4, FN=3, TP=197`** |

- **Single-call `predict_assessment()` latency (100 calls, warm cache):** Mean `24.44 ms`, Median `23.11 ms`, p95 `37.19 ms`; Peak traced memory: `0.0228 MB`.
- **Early-warning evaluation (`DEFAULT_MILESTONE_SEQUENCE`, 4 steps):** `time_to_first_alert_sim_s = 6.0 s`, `early_detection_rate = 1.0`, `missed_detections = 0`, `false_alarms = 0`, `stream_suspended = True`.

---

## 6. Test Results
- **Full `pytest` suite (`.\.venv\Scripts\python.exe -m pytest -v`):** **`31 passed in 3.82s`** (11 backend API/monitoring tests + 20 ML/adapter/early-warning/regression tests).
- **Frontend build (`npm run build`):** **`built in 733ms`** (zero errors).

---

## 7. Limitations & Future Scope
- **Implemented vs Future:**
  - *Implemented:* Synthetic tabular classification, local SQLite persistence, simulated containment, CSV/JSON telemetry adapter, and React dashboard.
  - *Future Scope (Not Implemented):* Validation on external real-world endpoint telemetry, probability calibration (e.g., Platt scaling/isotonic), OS-level ETW/eBPF sensor integration, and multi-host fleet orchestration.

---

## 8. Three-Minute Demonstration Sequence
1. **0:00–0:45 (Overview & Analytics):** Show `API ONLINE (:8000)`, Simulation Mode banner, and Model Analytics (`89 → 4` false-positive reduction, confusion matrix).
2. **0:45–1:45 (Simulation Lab — Benign Stress):** Click **Backup** and **Compression**; show `risk_score: 0`, `label: "normal"`, and virtual files remaining `INTACT`.
3. **1:45–2:30 (Simulation Lab — Suspicious & Containment):** Click **Suspicious** (or **Start** continuous replay); show `risk_score: 99`, `simulated_isolated` status, virtual files switching to `SIM_LOCKED`, and measured timeline.
4. **2:30–3:00 (Batch & Reset):** Click **Fill Example Batch** → **Run Batch Assessment** (showing normal, suspicious, and invalid handling), then click **Reset**.

---

## 9. Fifteen Potential Technical Judging Questions & Answers

1. **Why Random Forest instead of a deep neural network?**
   Low CPU latency (~24 ms including perturbation explanations), no GPU requirement, strong performance on skewed tabular features, and straightforward local interpretability.
2. **How did you reduce false positives from 89 to 4?**
   Phase 2 added legitimate `compression` and overlapping `backup` scenarios to training with `min_samples_leaf=3` regularization so entropy alone does not trigger alerts.
3. **How do you prevent data leakage?**
   Train (`seed=2027`) and validation (`seed=9001`) use independent RNG seeds, `count_exact_row_overlap == 0` is tested, and `label`/`scenario` are excluded from `FEATURE_NAMES`.
4. **Is `risk_score` a calibrated probability?**
   No. It is a model-derived `0–100` score from tree vote proportions; we explicitly document it as uncalibrated.
5. **How are invalid or missing inputs handled?**
   `validate_observation()` rejects missing, non-finite, or out-of-range values and returns `label: "unknown"`, `risk_score: null`.
6. **How do you separate model explanations from heuristics?**
   `predict_assessment_detailed()` computes local perturbation sensitivity against benign medians (`model: ...`) separately from static threshold rules (`heuristic: ...`).
7. **Does the system execute real malware or isolate real hosts?**
   No. All records are synthetic tabular numbers and isolation (`simulated_isolated`) is strictly a simulated database/UI state.
8. **Why is `pandas` not used in `ml_engine/`?**
   Windows Application Control blocked `pandas_datetime.pyd` on the development machine; `ml_engine/` uses `numpy`, `scikit-learn`, `joblib`, and stdlib `csv`/`json`.
9. **What is the difference between inference latency and end-to-end latency?**
   Inference latency (~24 ms) is the in-memory `predict_assessment()` call; end-to-end latency includes HTTP transport, SQLite writes, and frontend polling.
10. **How does the CSV/JSON adapter handle executable uploads?**
    It rejects any file extension other than `.csv` or `.json` with a `ValueError`.
11. **How does continuous monitoring prevent duplicate sessions?**
    `backend/main.py` guards `_MONITOR_STATE` with a `threading.Lock` and returns `409 Conflict` if `/api/v1/monitor/start` is called while running.
12. **What happens when the early-warning module flags a suspicious step?**
    It records a `simulated_isolated` incident and sets `stream_suspended = True` to halt further steps in that virtual stream.
13. **What is the Phase 1 fallback?**
    `rf_baseline_v1.joblib` is preserved and automatically used by `resolve_model_path()` if `rf_phase2.joblib` is absent.
14. **How is the backend tested?**
    `backend/test_backend.py` runs 11 FastAPI `TestClient` tests covering health, scenarios, batch assessment, monitoring lifecycle, reset, and error handling.
15. **What is the next step for production readiness?**
    External validation on real, non-synthetic endpoint telemetry, probability calibration, and integration with a real OS telemetry collector.

