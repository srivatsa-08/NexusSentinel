"""Read-only workspace monitor restricted to demo_workspace/."""

from __future__ import annotations

import threading
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
        self.recent_events: list[dict[str, Any]] = []
        self._scan_locked(record_events=False)

    def _scan_locked(self, record_events: bool = True) -> int:
        if not self.root_dir.is_dir():
            return 0
        current: dict[str, tuple[int, int]] = {}
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

            # Pair simple 1-to-1 rename / extension change if sizes match
            if len(added) == 1 and len(removed) == 1:
                old_name, new_name = removed[0], added[0]
                old_ext, new_ext = Path(old_name).suffix, Path(new_name).suffix
                evt_type = "extension_changed" if old_ext != new_ext else "renamed"
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
                    self.recent_events.insert(
                        0,
                        {
                            "timestamp": now_iso,
                            "event_type": "modified",
                            "filename": name,
                            "telemetry_source": "workspace_observer",
                        },
                    )

            self.recent_events = self.recent_events[:25]

        self._snapshot = current
        return len(current)

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            file_count = self._scan_locked(record_events=True)
            mod_count = len(self.recent_events)
            rename_count = sum(
                1 for e in self.recent_events if e["event_type"] in ("renamed", "extension_changed")
            )
            exts = {
                Path(e["filename"].split(" -> ")[-1]).suffix
                for e in self.recent_events
                if Path(e["filename"].split(" -> ")[-1]).suffix
            }
            return {
                "monitoring_status": "active",
                "workspace_path": "demo_workspace/",
                "file_count": file_count,
                "recent_events": self.recent_events,
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
