"""FastAPI main application for Nexus Sentinel backend."""

from __future__ import annotations

import csv
import io
import json
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from backend.database import get_db_connection, init_db, reset_db
from backend.gateway import gateway_controller
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
from ml_engine.early_warning import run_multi_sequence_early_warning_evaluation
from ml_engine.examples import SYNTHETIC_INFERENCE_EXAMPLES
from ml_engine.predict import predict_assessment_detailed
from ml_engine.schema import FEATURE_NAMES, SCHEMA_VERSION

ROOT_DIR = Path(__file__).resolve().parent.parent
METRICS_PATH = ROOT_DIR / "ml_engine" / "artifacts" / "metrics_phase2.json"

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Nexus Sentinel API",
    version="1.1.0",
    description="Defensive ransomware early-warning API (synthetic tabular observations only).",
    lifespan=lifespan,
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


# CORS middleware above handles localhost origins


@app.get("/api/v1/health")
def get_health() -> dict[str, Any]:
    db_ok = "ok"
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
    except Exception:
        db_ok = "error"

    ml_ok = "ok"
    model_ver = "rf-phase2-v1"
    try:
        from ml_engine.predict import load_trusted_artifact

        art = load_trusted_artifact()
        model_ver = art.get("model_version", "rf-phase2-v1")
    except Exception:
        ml_ok = "error"

    return {
        "status": "ok" if db_ok == "ok" and ml_ok == "ok" else "degraded",
        "model_version": model_ver,
        "components": {
            "backend": "ok",
            "database": db_ok,
            "ml_engine": ml_ok,
            "gateway": "active",
        },
    }


@app.get("/api/v1/endpoints", response_model=EndpointsResponse)
def get_endpoints() -> EndpointsResponse:
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT endpoint_id, status, device_name, department, virtual_os,
               current_risk_score, last_activity, containment_status, virtual_files
        FROM endpoints
        """
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        vfiles = None
        if r["virtual_files"]:
            try:
                vfiles = json.loads(r["virtual_files"])
            except Exception:
                vfiles = []
        items.append(
            EndpointItem(
                endpoint_id=r["endpoint_id"],
                status=r["status"],
                device_name=r["device_name"],
                department=r["department"],
                virtual_os=r["virtual_os"],
                current_risk_score=r["current_risk_score"] or 0,
                last_activity=r["last_activity"],
                containment_status=r["containment_status"] or "none",
                virtual_files=vfiles,
            )
        )
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
        SELECT incident_id, endpoint_id, assessment_id, status, checklist, simulated,
               timestamp, timeline, severity, investigation_status, admin_notes,
               risk_score, model_version, detection_reason, processing_time_ms,
               explanations, raw_observation
        FROM incidents ORDER BY incident_id DESC
        """
    ).fetchall()
    conn.close()
    items = []
    for r in rows:
        timeline_list = None
        if r["timeline"]:
            try:
                timeline_list = [TimelineEvent(**t) for t in json.loads(r["timeline"])]
            except Exception:
                pass
        expl_obj = None
        if r["explanations"]:
            try:
                raw_e = json.loads(r["explanations"])
                expl_obj = ExplanationDetails(
                    model_derived=raw_e.get("model_derived", []),
                    heuristic=raw_e.get("heuristic", []),
                )
            except Exception:
                pass
        raw_obs = None
        if r["raw_observation"]:
            try:
                raw_obs = json.loads(r["raw_observation"])
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
                severity=r["severity"] or "high",
                investigation_status=r["investigation_status"] or "open",
                admin_notes=r["admin_notes"] or "",
                risk_score=r["risk_score"],
                model_version=r["model_version"],
                detection_reason=r["detection_reason"],
                processing_time_ms=r["processing_time_ms"],
                explanations=expl_obj,
                raw_observation=raw_obs,
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

    endpoint_id = req.endpoint_id.strip() or "FIN-001"
    conn = get_db_connection()
    cursor = conn.cursor()
    ep_row = cursor.execute(
        "SELECT endpoint_id, virtual_files FROM endpoints WHERE endpoint_id = ?",
        (endpoint_id,),
    ).fetchone()
    if ep_row is None:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Virtual endpoint '{endpoint_id}' not found.",
        )

    observation = SYNTHETIC_INFERENCE_EXAMPLES[scenario]
    assessment_record = _run_single_assessment(observation, endpoint_id=endpoint_id, t0_ns=t0_ns)

    vfiles = json.loads(ep_row["virtual_files"]) if ep_row["virtual_files"] else []
    if assessment_record.label == "suspicious":
        for idx, vf in enumerate(vfiles):
            if idx % 2 == 0:
                vf["status"] = "simulated_encrypted"
                if not vf["filename"].endswith(".locked"):
                    vf["filename"] = f"{vf['filename']}.locked"
                vf["last_activity"] = "Simulated high-entropy rename"
                vf["assessment_id"] = assessment_record.assessment_id
            elif idx < 6:
                vf["status"] = "simulated_altered"
                vf["last_activity"] = "Simulated burst write"
                vf["assessment_id"] = assessment_record.assessment_id
    else:
        for vf in vfiles:
            vf["status"] = "intact"
            vf["filename"] = vf["filename"].removesuffix(".locked")
            vf["last_activity"] = f"Verified ({scenario})"
            vf["assessment_id"] = assessment_record.assessment_id

    cursor.execute(
        """
        UPDATE endpoints
        SET current_risk_score = ?,
            last_activity = ?,
            virtual_files = ?
        WHERE endpoint_id = ?
        """,
        (
            assessment_record.risk_score or 0,
            f"{scenario} ({assessment_record.label})",
            json.dumps(vfiles),
            endpoint_id,
        ),
    )

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
            "UPDATE endpoints SET status = 'simulated_isolated', containment_status = 'simulated_isolated' WHERE endpoint_id = ?",
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
        det_reason = "; ".join(assessment_record.indicators[:3])
        severity = "critical" if (assessment_record.risk_score or 0) >= 85 else "high"
        cursor.execute(
            """
            INSERT INTO incidents (
                incident_id, endpoint_id, assessment_id, status, checklist, simulated,
                timestamp, timeline, severity, investigation_status, admin_notes,
                risk_score, model_version, detection_reason, processing_time_ms,
                explanations, raw_observation
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                severity,
                "open",
                "",
                assessment_record.risk_score,
                assessment_record.model_version,
                det_reason,
                assessment_record.processing_time_ms,
                json.dumps(assessment_record.explanations.model_dump() if assessment_record.explanations else {}),
                json.dumps(observation),
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
            severity=severity,
            investigation_status="open",
            admin_notes="",
            risk_score=assessment_record.risk_score,
            model_version=assessment_record.model_version,
            detection_reason=det_reason,
            processing_time_ms=assessment_record.processing_time_ms,
            explanations=assessment_record.explanations,
            raw_observation=observation,
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
    """Stateless offline batch evaluation; kept separate from live endpoint incident history."""
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
    gateway_controller.reset()
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


_EARLY_WARNING_CACHE: dict[str, Any] | None = None


@app.get("/api/v1/monitor/early-warning")
def get_early_warning_metrics() -> dict[str, Any]:
    """Return measured 120-sequence early-warning simulation evaluation metrics."""
    global _EARLY_WARNING_CACHE
    if _EARLY_WARNING_CACHE is None:
        _EARLY_WARNING_CACHE = run_multi_sequence_early_warning_evaluation()
    return _EARLY_WARNING_CACHE


@app.get("/api/v1/gateway/status")
def get_gateway_status() -> dict[str, Any]:
    return gateway_controller.get_status()


@app.post("/api/v1/gateway/simulate")
def post_gateway_simulate(req: DemoStartRequest) -> dict[str, Any]:
    try:
        return gateway_controller.simulate_scenario(req.scenario)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/v1/gateway/reset")
def post_gateway_reset() -> dict[str, Any]:
    gateway_controller.reset()
    return gateway_controller.get_status()


@app.post("/api/v1/gateway/bulk")
def post_gateway_bulk(payload: dict[str, Any]) -> dict[str, Any]:
    profile = str(payload.get("profile", ""))
    count = payload.get("count")
    try:
        return gateway_controller.simulate_custom_bulk(profile=profile, count=count)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/v1/endpoints/{endpoint_id}/toggle-monitoring")
def post_toggle_endpoint_monitoring(endpoint_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT endpoint_id, status FROM endpoints WHERE endpoint_id = ?",
        (endpoint_id,),
    ).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Endpoint '{endpoint_id}' not found.")
    new_status = "paused" if row["status"] == "monitoring" else "monitoring"
    conn.execute(
        "UPDATE endpoints SET status = ?, containment_status = 'none' WHERE endpoint_id = ?",
        (new_status, endpoint_id),
    )
    conn.commit()
    conn.close()
    return {"endpoint_id": endpoint_id, "status": new_status}


@app.post("/api/v1/incidents/{incident_id}/review")
def post_review_incident(incident_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    notes = str(payload.get("admin_notes", ""))
    conn = get_db_connection()
    row = conn.execute("SELECT incident_id FROM incidents WHERE incident_id = ?", (incident_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    conn.execute(
        "UPDATE incidents SET investigation_status = 'reviewed', admin_notes = ? WHERE incident_id = ?",
        (notes, incident_id),
    )
    conn.commit()
    conn.close()
    return {"incident_id": incident_id, "investigation_status": "reviewed", "admin_notes": notes}


@app.post("/api/v1/incidents/{incident_id}/resolve")
def post_resolve_incident(incident_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    notes = str((payload or {}).get("admin_notes", ""))
    conn = get_db_connection()
    row = conn.execute(
        "SELECT incident_id, endpoint_id FROM incidents WHERE incident_id = ?",
        (incident_id,),
    ).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    ep_id = row["endpoint_id"]
    conn.execute(
        "UPDATE incidents SET investigation_status = 'resolved', status = 'simulated_resolved', admin_notes = ? WHERE incident_id = ?",
        (notes, incident_id),
    )
    conn.execute(
        "UPDATE endpoints SET status = 'monitoring', containment_status = 'restored', current_risk_score = 0 WHERE endpoint_id = ?",
        (ep_id,),
    )
    conn.commit()
    conn.close()
    return {"incident_id": incident_id, "investigation_status": "resolved", "endpoint_id": ep_id, "endpoint_status": "monitoring"}


@app.get("/api/v1/incidents/{incident_id}/report")
def get_incident_report(incident_id: str) -> PlainTextResponse:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    report_md = f"""# Nexus Sentinel — Simulated Incident Investigation Report
- **Incident ID:** {row['incident_id']}
- **Endpoint ID:** {row['endpoint_id']}
- **Assessment ID:** {row['assessment_id']}
- **Timestamp:** {row['timestamp']}
- **Severity:** {row['severity']}
- **Investigation Status:** {row['investigation_status']}
- **Simulated Containment Status:** {row['status']}
- **Risk Score:** {row['risk_score']}/100 (uncalibrated)
- **Model Version:** {row['model_version']}
- **Measured Assessment Latency:** {row['processing_time_ms']} ms
- **Detection Reason:** {row['detection_reason']}
- **Administrator Notes:** {row['admin_notes'] or 'None'}
- **Simulated Notice:** All observations and containment actions are strictly simulated.
"""
    return PlainTextResponse(
        content=report_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={incident_id}_report.md"},
    )
