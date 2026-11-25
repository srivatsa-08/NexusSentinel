"""Read-only workspace monitor and progressive simulated protection state for demo_workspace/."""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE_DIR = (Path(__file__).resolve().parent.parent / "demo_workspace").resolve()


class WorkspaceMonitor:
    """Observes manual file metadata changes inside demo_workspace/ only."""

    def __init__(self, root_dir: Path = WORKSPACE_DIR) -> None:
        self._lock = threading.Lock()
        self.root_dir = root_dir.resolve()
        self._snapshot: dict[str, tuple[int, int]] = {}
        self._file_activity: dict[str, str] = {}
        self._simulated_status: dict[str, str] = {}
        self.recent_events: list[dict[str, Any]] = []
        self.harness_state: dict[str, Any] = self._initial_harness_state()
        self._scan_locked(record_events=False)

    def _initial_harness_state(self) -> dict[str, Any]:
        return {
            "status": "idle",
            "test_start_timestamp": None,
            "first_suspicious_timestamp": None,
            "containment_timestamp": None,
            "measured_detection_latency_ms": None,
            "observations_processed": 0,
            "virtually_affected_count": 0,
            "unaffected_count": 0,
            "latest_assessment": None,
            "timeline": [],
        }

    def reset_simulation(self) -> None:
        with self._lock:
            self._simulated_status.clear()
            self.harness_state = self._initial_harness_state()
            self.recent_events = [
                e for e in self.recent_events if e.get("telemetry_source") == "workspace_observer"
            ]

    def record_harness_event(
        self,
        assessment: dict[str, Any],
        telemetry_source: str = "independent_harness",
        test_start_ts: str | None = None,
    ) -> None:
        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            if self.harness_state["test_start_timestamp"] is None:
                self.harness_state["test_start_timestamp"] = test_start_ts or now_iso

            self.harness_state["observations_processed"] += 1
            self.harness_state["latest_assessment"] = assessment
            self.harness_state["measured_detection_latency_ms"] = assessment.get("processing_time_ms")

            self.recent_events.insert(
                0,
                {
                    "timestamp": now_iso,
                    "event_type": f"synthetic_{assessment.get('label', 'unknown')}",
                    "filename": f"Endpoint {assessment.get('endpoint_id', 'FIN-001')} (score {assessment.get('risk_score')})",
                    "telemetry_source": telemetry_source,
                },
            )
            self.recent_events = self.recent_events[:30]

            if assessment.get("label") == "suspicious":
                if self.harness_state["first_suspicious_timestamp"] is None:
                    self.harness_state["first_suspicious_timestamp"] = now_iso
                self.harness_state["containment_timestamp"] = now_iso
                self.harness_state["status"] = "contained"
                self.harness_state["timeline"] = assessment.get("timeline") or []

                # Progressively mark a subset of virtual file states (never touching real files)
                names = sorted(self._snapshot.keys())
                affected = 0
                for idx, name in enumerate(names):
                    if idx < 6:
                        self._simulated_status[name] = (
                            "simulated_encrypted" if idx % 2 == 0 else "simulated_altered"
                        )
                        affected += 1
                    else:
                        self._simulated_status[name] = "simulated_contained"
                self.harness_state["virtually_affected_count"] = affected
                self.harness_state["unaffected_count"] = max(0, len(names) - affected)

    def _scan_locked(self, record_events: bool = True) -> list[dict[str, Any]]:
        if not self.root_dir.is_dir():
            return []
        current: dict[str, tuple[int, int]] = {}
        files_list: list[dict[str, Any]] = []

        for p in sorted(self.root_dir.iterdir()):
            if p.is_file():
                st = p.stat()
                current[p.name] = (st.st_mtime_ns, st.st_size)

        if record_events:
            now_iso = datetime.now(timezone.utc).isoformat()
            prev_names = set(self._snapshot.keys())
            curr_names = set(current.keys())

            added = sorted(curr_names - prev_names)
            removed = sorted(prev_names - curr_names)

            if len(added) == 1 and len(removed) == 1:
                old_name, new_name = removed[0], added[0]
                old_ext, new_ext = Path(old_name).suffix, Path(new_name).suffix
                evt_type = "extension_changed" if old_ext != new_ext else "renamed"
                self._file_activity[new_name] = evt_type
                self.recent_events.insert(
                    0,
                    {
                        "timestamp": now_iso,
                        "event_type": evt_type,
                        "filename": f"{old_name} -> {new_name}",
                        "telemetry_source": "workspace_observer",
                    },
                )
            else:
                for name in added:
                    self._file_activity[name] = "created"
                    self.recent_events.insert(
                        0,
                        {
                            "timestamp": now_iso,
                            "event_type": "created",
                            "filename": name,
                            "telemetry_source": "workspace_observer",
                        },
                    )
                for name in removed:
                    self.recent_events.insert(
                        0,
                        {
                            "timestamp": now_iso,
                            "event_type": "deleted",
                            "filename": name,
                            "telemetry_source": "workspace_observer",
                        },
                    )

            for name in sorted(curr_names & prev_names):
                if current[name] != self._snapshot[name]:
                    self._file_activity[name] = "modified"
                    self.recent_events.insert(
                        0,
                        {
                            "timestamp": now_iso,
                            "event_type": "modified",
                            "filename": name,
                            "telemetry_source": "workspace_observer",
                        },
                    )

            self.recent_events = self.recent_events[:30]

        self._snapshot = current

        for name, (mtime_ns, size_bytes) in current.items():
            mtime_iso = datetime.fromtimestamp(mtime_ns / 1_000_000_000, tz=timezone.utc).isoformat()
            files_list.append(
                {
                    "filename": name,
                    "extension": Path(name).suffix or "(none)",
                    "size_bytes": size_bytes,
                    "last_modified": mtime_iso,
                    "observed_activity": self._file_activity.get(name, "intact"),
                    "simulated_status": self._simulated_status.get(name, "protected"),
                }
            )
        return files_list

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            files_list = self._scan_locked(record_events=True)
            obs_events = [e for e in self.recent_events if e.get("telemetry_source") == "workspace_observer"]
            mod_count = len(obs_events)
            rename_count = sum(
                1 for e in obs_events if e["event_type"] in ("renamed", "extension_changed")
            )
            exts = {
                Path(e["filename"].split(" -> ")[-1]).suffix
                for e in obs_events
                if Path(e["filename"].split(" -> ")[-1]).suffix
            }
            if self.harness_state["unaffected_count"] == 0 and self.harness_state["virtually_affected_count"] == 0:
                self.harness_state["unaffected_count"] = len(files_list)

            return {
                "monitoring_status": "active",
                "workspace_path": "demo_workspace/",
                "file_count": len(files_list),
                "files": files_list,
                "recent_events": self.recent_events,
                "harness_state": dict(self.harness_state),
                "measurable_features": {
                    "observed_event_count": mod_count,
                    "unique_ext_count": len(exts),
                    "rename_ratio_observed": round(rename_count / mod_count, 3) if mod_count else 0.0,
                },
                "unavailable_features": [
                    "entropy_delta (not measured from directory stat polling)",
                    "burst_io_score (not measured without kernel/OS I/O counters)",
                    "shadow_copy_access_flag (not measured without OS process/VSS telemetry)",
                ],
                "telemetry_status": (
                    "insufficient_for_6_feature_model"
                    if mod_count > 0
                    else "idle_monitoring"
                ),
            }


workspace_monitor = WorkspaceMonitor()
