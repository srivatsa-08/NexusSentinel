"""Pydantic schemas for Nexus Sentinel backend complying with API_CONTRACT.md."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class EndpointItem(BaseModel):
    endpoint_id: str
    status: str


class EndpointsResponse(BaseModel):
    items: List[EndpointItem]


class TimelineEvent(BaseModel):
    event: str
    timestamp: str
    elapsed_ms: float


class ExplanationDetails(BaseModel):
    model_derived: List[str] = []
    heuristic: List[str] = []


class AssessmentRecord(BaseModel):
    assessment_id: str
    endpoint_id: str
    timestamp: str
    risk_score: Optional[int] = None
    label: str
    indicators: List[str]
    simulated: bool = True
    model_version: Optional[str] = None
    processing_time_ms: Optional[float] = None
    explanations: Optional[ExplanationDetails] = None
    timeline: Optional[List[TimelineEvent]] = None


class AssessmentsResponse(BaseModel):
    items: List[AssessmentRecord]


class IncidentRecord(BaseModel):
    incident_id: str
    endpoint_id: str
    assessment_id: str
    status: str
    checklist: List[str]
    simulated: bool = True
    timestamp: Optional[str] = None
    timeline: Optional[List[TimelineEvent]] = None


class IncidentsResponse(BaseModel):
    items: List[IncidentRecord]


class DemoStartRequest(BaseModel):
    scenario: str = Field(..., description="normal, backup, compression, or suspicious")


class DemoStartResponse(BaseModel):
    status: str
    scenario: str
    assessment: AssessmentRecord
    incident: Optional[IncidentRecord] = None


class DemoResetResponse(BaseModel):
    status: str = "reset_complete"


class BatchAssessmentRequest(BaseModel):
    records: List[Dict[str, Any]]


class BatchAssessmentSummary(BaseModel):
    total: int
    normal_count: int
    suspicious_count: int
    invalid_count: int
    total_processing_time_ms: float
    avg_latency_ms: float
    assessments: List[AssessmentRecord]
