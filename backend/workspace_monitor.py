"""Read-only workspace monitor and progressive simulated protection state for demo_workspace/."""

from __future__ import annotations

import base64
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE_DIR = (Path(__file__).resolve().parent.parent / "demo_workspace").resolve()
METADATA_ONLY_EXTENSIONS = {".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh", ".msi", ".vbs", ".scr", ".com"}
PREVIEWABLE_EXTENSIONS = {".txt", ".csv", ".md", ".json", ".log", ".yaml", ".yml"}
MAX_IMPORT_FILES = 100
MAX_SINGLE_FILE_BYTES = 15 * 1024 * 1024
MAX_IMPORT_BYTES = 50 * 1024 * 1024


class WorkspaceMonitor:
    """Observes manual file metadata changes inside demo_workspace/ only."""

    def __init__(self, root_dir: Path = WORKSPACE_DIR) -> None:
        self._lock = threading.Lock()
        self.root_dir = root_dir.resolve()
        self._snapshot: dict[str, tuple[int, int]] = {}
        self._file_activity: dict[str, str] = {}
        self._original_names: dict[str, str] = {}
        self._simulated_status: dict[str, str] = {}
        self._simulated_names: dict[str, str] = {}
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

    def _safe_resolve(self, rel_path: str) -> Path:
        if not rel_path or ".." in Path(rel_path).parts or Path(rel_path).is_absolute():
            raise ValueError("Unsafe path rejected.")
        target = (self.root_dir / rel_path).resolve()
        if not str(target).startswith(str(self.root_dir)):
            raise ValueError("Path escapes controlled workspace.")
        if target.is_symlink():
            raise ValueError("Symbolic links are not permitted.")
        return target

    def import_files(self, files: list[dict[str, Any]]) -> dict[str, Any]:
        total_bytes = 0
        staged: list[tuple[Path, bytes, str, bool]] = []
        skipped: list[dict[str, str]] = []

        for idx, item in enumerate(files):
            rel = str(item.get("relative_path", "")).replace("\\", "/").lstrip("/")
            if idx >= MAX_IMPORT_FILES:
                skipped.append({"relative_path": rel, "reason": f"Exceeds max file count ({MAX_IMPORT_FILES})."})
                continue
            ext = Path(rel).suffix.lower()
            is_metadata_only = ext in METADATA_ONLY_EXTENSIONS
            raw_b64 = str(item.get("content_base64", ""))
            data = b"" if is_metadata_only else base64.b64decode(raw_b64)
            if len(data) > MAX_SINGLE_FILE_BYTES:
                skipped.append({"relative_path": rel, "reason": "Exceeds 15 MB single-file limit."})
                continue
            if total_bytes + len(data) > MAX_IMPORT_BYTES:
                skipped.append({"relative_path": rel, "reason": "Exceeds 50 MB total folder limit."})
                continue
            try:
                dest = self._safe_resolve(f"imported/{rel}")
            except ValueError as exc:
                skipped.append({"relative_path": rel, "reason": str(exc)})
                continue
            total_bytes += len(data)
            staged.append((dest, data, f"imported/{rel}", is_metadata_only))

        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            for dest, data, rel_key, is_meta in staged:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                self._file_activity[rel_key] = "metadata_only_imported" if is_meta else "imported"
                self._original_names.setdefault(rel_key, Path(rel_key).name)
                self.recent_events.insert(
                    0,
                    {
                        "timestamp": now_iso,
                        "event_type": "metadata_only_imported" if is_meta else "imported",
                        "filename": rel_key,
                        "telemetry_source": "folder_import",
                    },
                )
            self.recent_events = self.recent_events[:30]
            self._scan_locked(record_events=False)

        status_out = self.get_status()
        status_out["skipped_files"] = skipped
        status_out["imported_count"] = len(staged)
        return status_out

    def rename_file(self, rel_path: str, new_name: str) -> dict[str, Any]:
        if not new_name or "/" in new_name or "\\" in new_name or ".." in new_name:
            raise ValueError("Invalid target filename.")
        src = self._safe_resolve(rel_path)
        if not src.is_file():
            raise FileNotFoundError(f"File not found: {rel_path}")
        dest = self._safe_resolve(str(Path(rel_path).parent / new_name))
        if dest.exists():
            raise ValueError(f"Target file already exists: {new_name}")

        old_ext, new_ext = src.suffix, dest.suffix
        evt_type = "extension_changed" if old_ext != new_ext else "renamed"
        src.rename(dest)

        new_rel = str(dest.relative_to(self.root_dir)).replace("\\", "/")
        with self._lock:
            orig = self._original_names.pop(rel_path, Path(rel_path).name)
            self._original_names[new_rel] = orig
            self._file_activity[new_rel] = evt_type
            self.recent_events.insert(
                0,
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "event_type": evt_type,
                    "filename": f"{rel_path} -> {new_rel}",
                    "telemetry_source": "workspace_observer",
                },
            )
            self.recent_events = self.recent_events[:30]
            self._scan_locked(record_events=False)
        return self.get_status()

    def preview_file(self, rel_path: str) -> dict[str, Any]:
        target = self._safe_resolve(rel_path)
        if not target.is_file():
            raise FileNotFoundError(f"File not found: {rel_path}")
        if target.suffix.lower() not in PREVIEWABLE_EXTENSIONS:
            st = target.stat()
            return {
                "relative_path": rel_path,
                "preview_supported": False,
                "content": f"[Binary or non-text format '{target.suffix or '(none)'}' — {st.st_size} bytes. Metadata only; never executed.]",
            }
        text = target.read_text(encoding="utf-8", errors="replace")[:4000]
        return {"relative_path": rel_path, "preview_supported": True, "content": text}

    def reset_simulation(self) -> None:
        """Clear virtual extension changes and test state without undoing manual edits or imports."""
        with self._lock:
            self._simulated_status.clear()
            self._simulated_names.clear()
            self.harness_state = self._initial_harness_state()
            self.recent_events = [
                e for e in self.recent_events if e.get("telemetry_source") in ("workspace_observer", "folder_import")
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

                names = sorted(self._snapshot.keys())
                # Affected count driven by observations processed before containment, never hardcoded
                affect_limit = min(len(names), max(1, self.harness_state["observations_processed"]))
                affected = 0
                for idx, rel_name in enumerate(names):
                    if idx < affect_limit:
                        self._simulated_status[rel_name] = (
                            "simulated_encrypted" if idx % 2 == 0 else "simulated_altered"
                        )
                        self._simulated_names[rel_name] = f"{rel_name}.locked (simulated)"
                        affected += 1
                    else:
                        self._simulated_status[rel_name] = "simulated_contained"
                self.harness_state["virtually_affected_count"] = affected
                self.harness_state["unaffected_count"] = max(0, len(names) - affected)

    def _scan_locked(self, record_events: bool = True) -> list[dict[str, Any]]:
        if not self.root_dir.is_dir():
            return []
        current: dict[str, tuple[int, int]] = {}
        files_list: list[dict[str, Any]] = []

        for p in sorted(self.root_dir.rglob("*")):
            if p.is_file() and not p.is_symlink():
                rel = str(p.relative_to(self.root_dir)).replace("\\", "/")
                st = p.stat()
                current[rel] = (st.st_mtime_ns, st.st_size)

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
                self._original_names[new_name] = self._original_names.pop(old_name, Path(old_name).name)
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

        for rel_name, (mtime_ns, size_bytes) in current.items():
            mtime_iso = datetime.fromtimestamp(mtime_ns / 1_000_000_000, tz=timezone.utc).isoformat()
            files_list.append(
                {
                    "relative_path": rel_name,
                    "filename": Path(rel_name).name,
                    "original_filename": self._original_names.get(rel_name, Path(rel_name).name),
                    "simulated_filename": self._simulated_names.get(rel_name),
                    "extension": Path(rel_name).suffix or "(none)",
                    "size_bytes": size_bytes,
                    "last_modified": mtime_iso,
                    "observed_activity": self._file_activity.get(rel_name, "intact"),
                    "simulated_status": self._simulated_status.get(rel_name, "protected"),
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
