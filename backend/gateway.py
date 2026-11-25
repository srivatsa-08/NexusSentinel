"""Simulated Gateway Protection module for Nexus Sentinel.

Performs lightweight admission control on harmless synthetic request metadata
before AI assessment. Gateway decisions (accepted, throttled, rejected) are
strictly separate from ransomware classification.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any

# Measured warm mean latency of local RandomForest predict_assessment() in ms
MEASURED_AI_ASSESSMENT_MS = 24.4431


class GatewayController:
    """Thread-safe simulated gateway admission controller."""

    def __init__(
        self,
        quota_limit: int = 5,
        queue_capacity: int = 10,
        cooldown_seconds: float = 8.0,
    ) -> None:
        self._lock = threading.Lock()
        self.quota_limit = quota_limit
        self.queue_capacity = queue_capacity
        self.cooldown_seconds = cooldown_seconds
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self.total_requests = 0
            self.accepted_requests = 0
            self.throttled_requests = 0
            self.rejected_requests = 0
            self.queue_depth = 0
            self.gateway_latencies_ms: list[float] = []
            self.uploaders: dict[str, dict[str, Any]] = {}
            self.recent_decisions: list[dict[str, Any]] = []

    def _evaluate_locked(self, meta: dict[str, Any]) -> dict[str, Any]:
        t0 = time.perf_counter_ns()
        now_mono = time.monotonic()
        now_iso = datetime.now(timezone.utc).isoformat()

        uploader_id = str(meta["uploader_id"])
        fictional_ip = str(meta["fictional_ip"])
        interval_s = float(meta["interval_s"])
        declared_size_mb = float(meta["declared_size_mb"])

        u = self.uploaders.setdefault(
            uploader_id,
            {
                "uploader_id": uploader_id,
                "fictional_ip": fictional_ip,
                "request_count": 0,
                "accepted_count": 0,
                "restricted_count": 0,
                "last_interval_s": interval_s,
                "last_size_mb": declared_size_mb,
                "status": "active",
                "restricted_until_mono": 0.0,
            },
        )
        u["request_count"] += 1
        u["last_interval_s"] = interval_s
        u["last_size_mb"] = declared_size_mb
        self.total_requests += 1

        # Recover expired temporary restriction
        if u["status"] == "simulated_restricted" and now_mono >= u["restricted_until_mono"]:
            u["status"] = "active"
            u["accepted_count"] = 0

        if u["status"] == "simulated_restricted":
            decision = "rejected"
            reason = f"Temporary simulated restriction active for {uploader_id}; request blocked before AI queue."
            self.rejected_requests += 1
            u["restricted_count"] += 1
        elif self.queue_depth >= self.queue_capacity:
            decision = "rejected"
            reason = f"Bounded processing queue full ({self.queue_depth}/{self.queue_capacity}); request shed."
            self.rejected_requests += 1
            u["restricted_count"] += 1
        elif u["accepted_count"] >= self.quota_limit and interval_s < 1.0:
            decision = "throttled"
            reason = (
                f"Quota exceeded ({u['accepted_count']}/{self.quota_limit}) with rapid interval ({interval_s}s); "
                "temporary simulated restriction applied."
            )
            self.throttled_requests += 1
            u["restricted_count"] += 1
            u["status"] = "simulated_restricted"
            u["restricted_until_mono"] = now_mono + self.cooldown_seconds
        else:
            decision = "accepted"
            reason = f"Within quota ({u['accepted_count'] + 1}/{self.quota_limit}); admitted to AI assessment queue."
            self.accepted_requests += 1
            u["accepted_count"] += 1
            self.queue_depth = min(self.queue_capacity, self.queue_depth + 1)

        elapsed_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        self.gateway_latencies_ms.append(elapsed_ms)

        record = {
            "timestamp": now_iso,
            "uploader_id": uploader_id,
            "fictional_ip": fictional_ip,
            "interval_s": interval_s,
            "declared_size_mb": declared_size_mb,
            "decision": decision,
            "reason": reason,
            "gateway_latency_ms": round(elapsed_ms, 4),
            "simulated": True,
        }
        self.recent_decisions.insert(0, record)
        self.recent_decisions = self.recent_decisions[:20]
        return record

    def simulate_scenario(self, scenario: str) -> dict[str, Any]:
        sc = scenario.lower().strip()
        with self._lock:
            if sc == "normal_upload":
                batch = [
                    {"uploader_id": "uploader-alpha", "fictional_ip": "198.51.100.10", "interval_s": 5.0, "declared_size_mb": 1.2}
                    for _ in range(3)
                ]
            elif sc == "legitimate_bulk":
                batch = [
                    {"uploader_id": "uploader-backup", "fictional_ip": "198.51.100.20", "interval_s": 2.5, "declared_size_mb": 45.0}
                    for _ in range(4)
                ]
            elif sc == "excessive_requests":
                batch = [
                    {"uploader_id": "uploader-burst", "fictional_ip": "198.51.100.99", "interval_s": 0.1, "declared_size_mb": 2.0}
                    for _ in range(8)
                ]
            elif sc == "recover":
                for u in self.uploaders.values():
                    u["status"] = "active"
                    u["accepted_count"] = 0
                    u["restricted_until_mono"] = 0.0
                self.queue_depth = 0
                return self._status_locked()
            else:
                raise ValueError(
                    f"Invalid gateway scenario '{sc}'. Choose from normal_upload, legitimate_bulk, excessive_requests, recover."
                )

            for meta in batch:
                self._evaluate_locked(meta)
            return self._status_locked()

    def _status_locked(self) -> dict[str, Any]:
        avoided = self.throttled_requests + self.rejected_requests
        avg_lat = (
            round(sum(self.gateway_latencies_ms) / len(self.gateway_latencies_ms), 4)
            if self.gateway_latencies_ms
            else 0.0
        )
        return {
            "simulated": True,
            "gateway_status": "active",
            "quota_limit": self.quota_limit,
            "queue_depth": self.queue_depth,
            "queue_capacity": self.queue_capacity,
            "queue_utilization_pct": round((self.queue_depth / self.queue_capacity) * 100.0, 1),
            "total_requests": self.total_requests,
            "accepted_requests": self.accepted_requests,
            "throttled_requests": self.throttled_requests,
            "rejected_requests": self.rejected_requests,
            "avoided_assessments": avoided,
            "measured_avg_gateway_latency_ms": avg_lat,
            "estimated_cpu_saved_ms": round(avoided * MEASURED_AI_ASSESSMENT_MS, 2),
            "estimation_note": (
                f"Estimated from avoided_assessments * {MEASURED_AI_ASSESSMENT_MS} ms "
                "(measured warm local RandomForest mean latency); not a monetary API saving."
            ),
            "uploaders": list(self.uploaders.values()),
            "recent_decisions": self.recent_decisions,
        }

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            return self._status_locked()


gateway_controller = GatewayController()
