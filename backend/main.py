"""FastAPI main application for Nexus Sentinel backend."""

from __future__ import annotations

import csv
import io
import json
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from backend.database import get_db_connection, init_db, reset_db
from backend.schemas import (
    AssessmentRecord,
    AssessmentsResponse,
    BatchAssessmentRequest,
    BatchAssessmentSummary,
    DemoResetResponse,
    DemoStartRequest,
    DemoStartResponse,
    EndpointItem,
    EndpointsResponse,
    ExplanationDetails,
    HealthResponse,
    IncidentRecord,
    IncidentsResponse,
    TimelineEvent,
)
from ml_engine.early_warning import run_early_warning_evaluation
from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment_detailed
from ml_engine.schema import FEATURE_NAMES, SCHEMA_VERSION

ROOT_DIR = Path(__file__).resolve().parent.parent
METRICS_PATH = ROOT_DIR / "ml_engine" / "artifacts" / "metrics_phase2.json"

app = FastAPI(
    title="Nexus Sentinel API",
    version="1.1.0",
    description="Defensive ransomware early-warning API (synthetic tabular observations only).",
)

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
        """
        SELECT assessment_id, endpoint_id, timestamp, risk_score, label, indicators,
               simulated, model_version, processing_time_ms, explanations, timeline
        FROM assessments ORDER BY timestamp DESC
        """
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        expl_obj = None
        if r["explanations"]:
            try:
                raw = json.loads(r["explanations"])
                expl_obj = ExplanationDetails(
                    model_derived=raw.get("model_derived", []),
                    heuristic=raw.get("heuristic", []),
                )
            except Exception:
                pass

        timeline_list = None
        if r["timeline"]:
            try:
                raw_tl = json.loads(r["timeline"])
                timeline_list = [TimelineEvent(**t) for t in raw_tl]
            except Exception:
                pass

        items.append(
            AssessmentRecord(
                assessment_id=r["assessment_id"],
                endpoint_id=r["endpoint_id"],
                timestamp=r["timestamp"],
                risk_score=r["risk_score"],
                label=r["label"],
                indicators=json.loads(r["indicators"]),
                simulated=bool(r["simulated"]),
                model_version=r["model_version"],
                processing_time_ms=r["processing_time_ms"],
                explanations=expl_obj,
                timeline=timeline_list,
            )
        )
    return AssessmentsResponse(items=items)


@app.get("/api/v1/incidents", response_model=IncidentsResponse)
def get_incidents() -> IncidentsResponse:
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT incident_id, endpoint_id, assessment_id, status, checklist, simulated, timestamp, timeline
        FROM incidents ORDER BY incident_id DESC
        """
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        timeline_list = None
        if r["timeline"]:
            try:
                raw_tl = json.loads(r["timeline"])
                timeline_list = [TimelineEvent(**t) for t in raw_tl]
            except Exception:
                pass

        items.append(
            IncidentRecord(
                incident_id=r["incident_id"],
                endpoint_id=r["endpoint_id"],
                assessment_id=r["assessment_id"],
                status=r["status"],
                checklist=json.loads(r["checklist"]),
                simulated=bool(r["simulated"]),
                timestamp=r["timestamp"],
                timeline=timeline_list,
            )
        )
    return IncidentsResponse(items=items)


@app.get("/api/v1/metrics")
def get_evaluation_metrics() -> dict[str, Any]:
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


@app.get("/api/v1/download/sample-dataset/{format_type}")
def download_sample_dataset(format_type: str):
    format_type = format_type.lower().strip()
    samples = []
    for sc in ["normal", "backup", "compression", "suspicious"]:
        rec = dict(SYNTHETIC_INFERENCE_EXAMPLES[sc])
        rec["scenario_label"] = sc
        samples.append(rec)

    if format_type == "json":
        return samples
    elif format_type == "csv":
        output = io.StringIO()
        fieldnames = ["scenario_label"] + list(FEATURE_NAMES)
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(samples)
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=synthetic_telemetry_sample.csv"},
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'json'.")


def _run_single_assessment(
    observation: Dict[str, Any], endpoint_id: str = "demo-01", t0_ns: int = None
) -> AssessmentRecord:
    if t0_ns is None:
        t0_ns = time.perf_counter_ns()

    t_obs_iso = datetime.now(timezone.utc).isoformat()
    t_after_obs_ns = time.perf_counter_ns()
    elapsed_obs_ms = (t_after_obs_ns - t0_ns) / 1_000_000.0

    # Execute actual ML inference
    t_ml_start = time.perf_counter_ns()
    ml_res = predict_assessment_detailed(observation)
    t_ml_end = time.perf_counter_ns()

    processing_time_ms = round((t_ml_end - t_ml_start) / 1_000_000.0, 3)
    t_assess_iso = datetime.now(timezone.utc).isoformat()
    elapsed_assess_ms = round((t_ml_end - t0_ns) / 1_000_000.0, 3)

    timeline: List[TimelineEvent] = [
        TimelineEvent(
            event="Observation Received (Synthetic Telemetry)",
            timestamp=t_obs_iso,
            elapsed_ms=round(elapsed_obs_ms, 3),
        ),
        TimelineEvent(
            event="Assessment Completed (ML Scoring + Explanation)",
            timestamp=t_assess_iso,
            elapsed_ms=elapsed_assess_ms,
        ),
    ]

    expl_obj = ExplanationDetails(
        model_derived=ml_res["explanations"].get("model_derived", []),
        heuristic=ml_res["explanations"].get("heuristic", []),
    )

    assessment_id = f"a-{uuid.uuid4().hex[:6]}"
    return AssessmentRecord(
        assessment_id=assessment_id,
        endpoint_id=endpoint_id,
        timestamp=t_assess_iso,
        risk_score=ml_res["risk_score"],
        label=ml_res["label"],
        indicators=ml_res["indicators"],
        simulated=True,
        model_version=ml_res.get("model_version"),
        processing_time_ms=processing_time_ms,
        explanations=expl_obj,
        timeline=timeline,
    )


@app.post("/api/v1/demo/start", response_model=DemoStartResponse)
def post_demo_start(req: DemoStartRequest) -> DemoStartResponse:
    t0_ns = time.perf_counter_ns()
    scenario = req.scenario.lower().strip()
    if scenario not in SYNTHETIC_INFERENCE_EXAMPLES:
        valid_scenarios = list(SYNTHETIC_INFERENCE_EXAMPLES.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scenario '{scenario}'. Choose from {valid_scenarios}",
        )

    endpoint_id = "demo-01"
    observation = SYNTHETIC_INFERENCE_EXAMPLES[scenario]
    assessment_record = _run_single_assessment(observation, endpoint_id=endpoint_id, t0_ns=t0_ns)

    conn = get_db_connection()
    cursor = conn.cursor()

    incident_record = None
    if assessment_record.label == "suspicious":
        incident_id = f"i-{uuid.uuid4().hex[:6]}"
        checklist = [
            "Notify security operations team",
            "Review multi-feature anomaly evidence",
            "Verify snapshot integrity",
            "Review simulated containment state",
        ]

        t_alert_ns = time.perf_counter_ns()
        t_alert_iso = datetime.now(timezone.utc).isoformat()
        elapsed_alert_ms = round((t_alert_ns - t0_ns) / 1_000_000.0, 3)

        cursor.execute(
            "UPDATE endpoints SET status = 'simulated_isolated' WHERE endpoint_id = ?",
            (endpoint_id,),
        )

        t_iso_ns = time.perf_counter_ns()
        t_iso_iso = datetime.now(timezone.utc).isoformat()
        elapsed_iso_ms = round((t_iso_ns - t0_ns) / 1_000_000.0, 3)

        # Extend assessment timeline
        assessment_record.timeline.append(
            TimelineEvent(
                event="Alert Generated (Threshold Exceeded)",
                timestamp=t_alert_iso,
                elapsed_ms=elapsed_alert_ms,
            )
        )
        assessment_record.timeline.append(
            TimelineEvent(
                event="Simulated Containment Recorded (Host State Flagged)",
                timestamp=t_iso_iso,
                elapsed_ms=elapsed_iso_ms,
            )
        )

        incident_timeline = list(assessment_record.timeline)
        cursor.execute(
            """
            INSERT INTO incidents (incident_id, endpoint_id, assessment_id, status, checklist, simulated, timestamp, timeline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                incident_id,
                endpoint_id,
                assessment_record.assessment_id,
                "simulated_isolated",
                json.dumps(checklist),
                1,
                t_alert_iso,
                json.dumps([t.model_dump() for t in incident_timeline]),
            ),
        )
        incident_record = IncidentRecord(
            incident_id=incident_id,
            endpoint_id=endpoint_id,
            assessment_id=assessment_record.assessment_id,
            status="simulated_isolated",
            checklist=checklist,
            simulated=True,
            timestamp=t_alert_iso,
            timeline=incident_timeline,
        )

    # Store assessment
    cursor.execute(
        """
        INSERT INTO assessments (assessment_id, endpoint_id, timestamp, risk_score, label, indicators,
                                simulated, model_version, processing_time_ms, explanations, timeline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            assessment_record.assessment_id,
            endpoint_id,
            assessment_record.timestamp,
            assessment_record.risk_score,
            assessment_record.label,
            json.dumps(assessment_record.indicators),
            1,
            assessment_record.model_version,
            assessment_record.processing_time_ms,
            json.dumps(assessment_record.explanations.model_dump() if assessment_record.explanations else {}),
            json.dumps([t.model_dump() for t in assessment_record.timeline] if assessment_record.timeline else []),
        ),
    )

    conn.commit()
    conn.close()

    return DemoStartResponse(
        status="success",
        scenario=scenario,
        assessment=assessment_record,
        incident=incident_record,
    )


@app.post("/api/v1/assessment/batch", response_model=BatchAssessmentSummary)
def post_batch_assessment(req: BatchAssessmentRequest) -> BatchAssessmentSummary:
    t_start = time.perf_counter_ns()
    assessments_list: List[AssessmentRecord] = []
    normal_c = 0
    suspicious_c = 0
    invalid_c = 0

    for obs in req.records:
        rec = _run_single_assessment(obs, endpoint_id="demo-01")
        assessments_list.append(rec)
        if rec.label == "normal":
            normal_c += 1
        elif rec.label == "suspicious":
            suspicious_c += 1
        else:
            invalid_c += 1

    t_end = time.perf_counter_ns()
    total_time_ms = round((t_end - t_start) / 1_000_000.0, 3)
    avg_latency = round(total_time_ms / max(len(req.records), 1), 3)

    return BatchAssessmentSummary(
        total=len(req.records),
        normal_count=normal_c,
        suspicious_count=suspicious_c,
        invalid_count=invalid_c,
        total_processing_time_ms=total_time_ms,
        avg_latency_ms=avg_latency,
        assessments=assessments_list,
    )


@app.post("/api/v1/demo/reset", response_model=DemoResetResponse)
def post_demo_reset() -> DemoResetResponse:
    reset_db()
    with _MONITOR_LOCK:
        _MONITOR_STATE["status"] = "stopped"
        _MONITOR_STATE["index"] = 0
        _MONITOR_STATE["processed_count"] = 0
        _MONITOR_STATE["started_at"] = None
        _MONITOR_STATE["accumulated_s"] = 0.0
    return DemoResetResponse(status="reset_complete")


_MONITOR_LOCK = threading.Lock()
_MONITOR_SEQUENCE: tuple[str, ...] = (
    "normal",
    "normal",
    "backup",
    "compression",
    "normal",
    "suspicious",
)
_MONITOR_STATE: dict[str, Any] = {
    "status": "stopped",
    "index": 0,
    "processed_count": 0,
    "started_at": None,
    "accumulated_s": 0.0,
}


def _get_monitor_snapshot() -> dict[str, Any]:
    elapsed = _MONITOR_STATE["accumulated_s"]
    if _MONITOR_STATE["status"] == "running" and _MONITOR_STATE["started_at"] is not None:
        elapsed += time.monotonic() - _MONITOR_STATE["started_at"]
    conn = get_db_connection()
    row = conn.execute("SELECT status FROM endpoints WHERE endpoint_id = 'demo-01'").fetchone()
    conn.close()
    return {
        "status": _MONITOR_STATE["status"],
        "processed_count": _MONITOR_STATE["processed_count"],
        "total_sequence": len(_MONITOR_SEQUENCE),
        "duration_seconds": round(elapsed, 2),
        "endpoint_status": row["status"] if row else "monitoring",
    }


@app.get("/api/v1/monitor/status")
def get_monitor_status() -> dict[str, Any]:
    with _MONITOR_LOCK:
        return _get_monitor_snapshot()


@app.post("/api/v1/monitor/start")
def post_monitor_start() -> dict[str, Any]:
    with _MONITOR_LOCK:
        if _MONITOR_STATE["status"] == "running":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Monitoring session is already running.",
            )
        _MONITOR_STATE["status"] = "running"
        _MONITOR_STATE["started_at"] = time.monotonic()
        return _get_monitor_snapshot()


@app.post("/api/v1/monitor/pause")
def post_monitor_pause() -> dict[str, Any]:
    with _MONITOR_LOCK:
        if _MONITOR_STATE["status"] != "running":
            raise HTTPException(status_code=400, detail="Monitoring is not running.")
        if _MONITOR_STATE["started_at"] is not None:
            _MONITOR_STATE["accumulated_s"] += time.monotonic() - _MONITOR_STATE["started_at"]
        _MONITOR_STATE["started_at"] = None
        _MONITOR_STATE["status"] = "paused"
        return _get_monitor_snapshot()


@app.post("/api/v1/monitor/resume")
def post_monitor_resume() -> dict[str, Any]:
    with _MONITOR_LOCK:
        if _MONITOR_STATE["status"] != "paused":
            raise HTTPException(status_code=400, detail="Monitoring is not paused.")
        _MONITOR_STATE["status"] = "running"
        _MONITOR_STATE["started_at"] = time.monotonic()
        return _get_monitor_snapshot()


@app.post("/api/v1/monitor/stop")
def post_monitor_stop() -> dict[str, Any]:
    with _MONITOR_LOCK:
        if _MONITOR_STATE["status"] == "running" and _MONITOR_STATE["started_at"] is not None:
            _MONITOR_STATE["accumulated_s"] += time.monotonic() - _MONITOR_STATE["started_at"]
        _MONITOR_STATE["started_at"] = None
        _MONITOR_STATE["status"] = "stopped"
        return _get_monitor_snapshot()


@app.post("/api/v1/monitor/step")
def post_monitor_step() -> dict[str, Any]:
    with _MONITOR_LOCK:
        if _MONITOR_STATE["status"] != "running":
            raise HTTPException(status_code=400, detail="Monitoring is not running.")
        idx = _MONITOR_STATE["index"] % len(_MONITOR_SEQUENCE)
        scenario_key = _MONITOR_SEQUENCE[idx]
        _MONITOR_STATE["index"] += 1
        _MONITOR_STATE["processed_count"] += 1
        res = post_demo_start(DemoStartRequest(scenario=scenario_key))
        return {
            "monitor": _get_monitor_snapshot(),
            "assessment": res.assessment,
            "incident": res.incident,
        }


@app.get("/api/v1/monitor/early-warning")
def get_early_warning_metrics() -> dict[str, Any]:
    """Return measured early-warning simulation evaluation metrics."""
    return run_early_warning_evaluation()
