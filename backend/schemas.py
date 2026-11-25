"""Pydantic schemas for Nexus Sentinel backend complying with API_CONTRACT.md."""

from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class EndpointItem(BaseModel):
    endpoint_id: str
    status: str


class EndpointsResponse(BaseModel):
    items: List[EndpointItem]


class AssessmentRecord(BaseModel):
    assessment_id: str
    endpoint_id: str
    timestamp: str
    risk_score: Optional[int] = None
    label: str
    indicators: List[str]
    simulated: bool = True


class AssessmentsResponse(BaseModel):
    items: List[AssessmentRecord]


class IncidentRecord(BaseModel):
    incident_id: str
    endpoint_id: str
    assessment_id: str
    status: str
    checklist: List[str]
    simulated: bool = True


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
