# Nexus Sentinel — Backend Service (`backend/`)

FastAPI backend with SQLite persistence for simulated ransomware early-warning demonstration.

## Startup Command

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

## Implemented API Routes

- `GET  /api/v1/health` — Service health check.
- `GET  /api/v1/endpoints` — Monitored endpoints list and status (`monitoring` or `simulated_isolated`).
- `GET  /api/v1/assessments` — Stored assessment history.
- `GET  /api/v1/incidents` — Stored incident list with containment status and checklist.
- `GET  /api/v1/metrics` — Phase 2 model evaluation metrics JSON for the frontend dashboard.
- `POST /api/v1/demo/start` — Trigger synthetic observation scenario (`normal`, `backup`, `compression`, `suspicious`) through `ml_engine.predict_assessment()`.
- `POST /api/v1/demo/reset` — Reset endpoint status to `monitoring` and clear synthetic assessments/incidents.

## Run Tests

```powershell
.\.venv\Scripts\python.exe -m pytest backend/test_backend.py -v
```

