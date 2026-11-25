"""FastAPI main application for Nexus Sentinel backend."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.database import get_db_connection, init_db, reset_db
from backend.schemas import (
    AssessmentRecord,
    AssessmentsResponse,
    DemoResetResponse,
    DemoStartRequest,
    DemoStartResponse,
    EndpointItem,
    EndpointsResponse,
    HealthResponse,
    IncidentRecord,
    IncidentsResponse,
)
from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment

ROOT_DIR = Path(__file__).resolve().parent.parent
METRICS_PATH = ROOT_DIR / "ml_engine" / "artifacts" / "metrics_phase2.json"

app = FastAPI(
    title="Nexus Sentinel API",
    version="1.0.0",
    description="Defensive ransomware early-warning API (synthetic tabular observations only).",
)

# CORS configuration for Vite frontend and local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/api/v1/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/v1/endpoints", response_model=EndpointsResponse)
def get_endpoints() -> EndpointsResponse:
    conn = get_db_connection()
    rows = conn.execute("SELECT endpoint_id, status FROM endpoints").fetchall()
    conn.close()
    items = [EndpointItem(endpoint_id=r["endpoint_id"], status=r["status"]) for r in rows]
    return EndpointsResponse(items=items)


@app.get("/api/v1/assessments", response_model=AssessmentsResponse)
def get_assessments() -> AssessmentsResponse:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT assessment_id, endpoint_id, timestamp, risk_score, label, indicators, simulated FROM assessments ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        items.append(
            AssessmentRecord(
                assessment_id=r["assessment_id"],
                endpoint_id=r["endpoint_id"],
                timestamp=r["timestamp"],
                risk_score=r["risk_score"],
                label=r["label"],
                indicators=json.loads(r["indicators"]),
                simulated=bool(r["simulated"]),
            )
        )
    return AssessmentsResponse(items=items)


@app.get("/api/v1/incidents", response_model=IncidentsResponse)
def get_incidents() -> IncidentsResponse:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT incident_id, endpoint_id, assessment_id, status, checklist, simulated FROM incidents"
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        items.append(
            IncidentRecord(
                incident_id=r["incident_id"],
                endpoint_id=r["endpoint_id"],
                assessment_id=r["assessment_id"],
                status=r["status"],
                checklist=json.loads(r["checklist"]),
                simulated=bool(r["simulated"]),
            )
        )
    return IncidentsResponse(items=items)


@app.get("/api/v1/metrics")
def get_evaluation_metrics() -> dict[str, Any]:
    """Expose verified Phase 2 evaluation metrics for dashboard visualization."""
    if not METRICS_PATH.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model evaluation metrics file not found",
        )
    try:
        with METRICS_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read evaluation metrics: {exc}",
        )


@app.post("/api/v1/demo/start", response_model=DemoStartResponse)
def post_demo_start(req: DemoStartRequest) -> DemoStartResponse:
    scenario = req.scenario.lower().strip()
    if scenario not in SYNTHETIC_INFERENCE_EXAMPLES:
        valid_scenarios = list(SYNTHETIC_INFERENCE_EXAMPLES.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scenario '{scenario}'. Choose from {valid_scenarios}",
        )

    observation = SYNTHETIC_INFERENCE_EXAMPLES[scenario]
    # Perform live ML engine inference
    ml_res = predict_assessment(observation)

    endpoint_id = "demo-01"
    assessment_id = f"a-{uuid.uuid4().hex[:6]}"
    now_utc = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Store assessment in SQLite
    cursor.execute(
        """
        INSERT INTO assessments (assessment_id, endpoint_id, timestamp, risk_score, label, indicators, simulated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            assessment_id,
            endpoint_id,
            now_utc,
            ml_res["risk_score"],
            ml_res["label"],
            json.dumps(ml_res["indicators"]),
            1 if ml_res.get("simulated", True) else 0,
        ),
    )

    incident_record = None
    if ml_res["label"] == "suspicious":
        incident_id = f"i-{uuid.uuid4().hex[:6]}"
        checklist = [
            "Notify security operations team",
            "Review multi-feature anomaly evidence",
            "Verify snapshot integrity",
            "Review simulated containment state",
        ]
        # Update endpoint status to simulated_isolated
        cursor.execute(
            "UPDATE endpoints SET status = 'simulated_isolated' WHERE endpoint_id = ?",
            (endpoint_id,),
        )
        cursor.execute(
            """
            INSERT INTO incidents (incident_id, endpoint_id, assessment_id, status, checklist, simulated)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                incident_id,
                endpoint_id,
                assessment_id,
                "simulated_isolated",
                json.dumps(checklist),
                1,
            ),
        )
        incident_record = IncidentRecord(
            incident_id=incident_id,
            endpoint_id=endpoint_id,
            assessment_id=assessment_id,
            status="simulated_isolated",
            checklist=checklist,
            simulated=True,
        )

    conn.commit()
    conn.close()

    assessment_record = AssessmentRecord(
        assessment_id=assessment_id,
        endpoint_id=endpoint_id,
        timestamp=now_utc,
        risk_score=ml_res["risk_score"],
        label=ml_res["label"],
        indicators=ml_res["indicators"],
        simulated=True,
    )

    return DemoStartResponse(
        status="success",
        scenario=scenario,
        assessment=assessment_record,
        incident=incident_record,
    )


@app.post("/api/v1/demo/reset", response_model=DemoResetResponse)
def post_demo_reset() -> DemoResetResponse:
    reset_db()
    return DemoResetResponse(status="reset_complete")
