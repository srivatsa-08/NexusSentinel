from __future__ import annotations

import hashlib
import shutil
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


class RecoveryVaultManager:
    """
    Isolated backup & recovery vault for authorized disposable demonstration files.
    - Stores clean copies & SHA-256 hashes in `vault_dir`.
    - Restores clean copies into `recovered_dir` without modifying original files.
    """

    def __init__(self, workspace_dir: Path, vault_dir: Path, recovered_dir: Path) -> None:
        self.workspace_dir = workspace_dir.resolve()
        self.vault_dir = vault_dir.resolve()
        self.recovered_dir = recovered_dir.resolve()
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.recovered_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._backups: dict[str, dict[str, Any]] = {}
        self._recovered: dict[str, dict[str, Any]] = {}
        self._history: list[dict[str, Any]] = []

    def _safe_rel_path(self, rel_path: str) -> Path:
        raw = str(rel_path or "").strip().replace("\\", "/")
        if not raw or "\x00" in raw or raw.startswith("/") or ":" in raw:
            raise ValueError("Invalid or unsafe relative path.")
        parts = [p for p in raw.split("/") if p]
        if not parts or any(p in (".", "..") for p in parts):
            raise ValueError("Path traversal is not permitted.")
        return Path(*parts)

    def snapshot_workspace(self) -> dict[str, Any]:
        with self._lock:
            count = 0
            for item in sorted(self.workspace_dir.rglob("*")):
                if item.is_symlink() or not item.is_file():
                    continue
                rel = item.relative_to(self.workspace_dir)
                rel_str = rel.as_posix()
                dest = (self.vault_dir / rel).resolve()
                if self.vault_dir not in dest.parents and dest != self.vault_dir:
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dest)
                stat = item.stat()
                self._backups[rel_str] = {
                    "relative_path": rel_str,
                    "filename": item.name,
                    "size_bytes": stat.st_size,
                    "sha256": _sha256_file(dest),
                    "backed_up_at": datetime.now(timezone.utc).isoformat(),
                }
                count += 1
            return {"snapshotted_count": count, "total_backups": len(self._backups)}

    def _recover_single_locked(self, rel_path: str) -> dict[str, Any]:
        t0 = time.perf_counter_ns()
        rel = self._safe_rel_path(rel_path)
        rel_str = rel.as_posix()

        backup_meta = self._backups.get(rel_str)
        backup_file = (self.vault_dir / rel).resolve()
        if not backup_meta or not backup_file.is_file():
            raise FileNotFoundError(f"No clean backup found in vault for '{rel_str}'.")

        dest = (self.recovered_dir / rel).resolve()
        if self.recovered_dir not in dest.parents and dest != self.recovered_dir:
            raise ValueError("Unsafe recovery destination.")
        dest.parent.mkdir(parents=True, exist_ok=True)

        # Handle duplicate filenames in recovered_dir without touching original workspace
        final_dest = dest
        if final_dest.exists():
            stem = final_dest.stem
            suffix = final_dest.suffix
            idx = 1
            while final_dest.exists():
                final_dest = final_dest.with_name(f"{stem}_restored_{idx}{suffix}")
                idx += 1

        shutil.copy2(backup_file, final_dest)
        restored_hash = _sha256_file(final_dest)
        expected_hash = backup_meta["sha256"]
        integrity_ok = restored_hash == expected_hash
        duration_ms = round((time.perf_counter_ns() - t0) / 1_000_000.0, 3)

        record = {
            "relative_path": rel_str,
            "restored_path": final_dest.relative_to(self.recovered_dir).as_posix(),
            "backup_sha256": expected_hash,
            "restored_sha256": restored_hash,
            "integrity_verified": integrity_ok,
            "duration_ms": duration_ms,
            "recovered_at": datetime.now(timezone.utc).isoformat(),
        }
        self._recovered[rel_str] = record
        self._history.insert(0, record)
        self._history = self._history[:50]
        return record

    def recover_file(self, rel_path: str) -> dict[str, Any]:
        with self._lock:
            return self._recover_single_locked(rel_path)

    def recover_all(self, target_paths: list[str] | None = None) -> dict[str, Any]:
        t0 = time.perf_counter_ns()
        with self._lock:
            paths = target_paths if target_paths is not None else list(self._backups.keys())
            results = []
            errors = []
            for p in paths:
                try:
                    results.append(self._recover_single_locked(p))
                except (FileNotFoundError, ValueError) as exc:
                    errors.append({"relative_path": p, "error": str(exc)})
            total_ms = round((time.perf_counter_ns() - t0) / 1_000_000.0, 3)
            return {
                "recovered_count": len(results),
                "error_count": len(errors),
                "total_duration_ms": total_ms,
                "results": results,
                "errors": errors,
            }

    def reset(self) -> None:
        with self._lock:
            self._recovered.clear()
            self._history.clear()
            if self.recovered_dir.exists():
                for child in self.recovered_dir.iterdir():
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink(missing_ok=True)

    def get_status(self, workspace_files: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        with self._lock:
            ws_files = workspace_files or []
            affected = [
                f["relative_path"]
                for f in ws_files
                if f.get("simulated_status") in ("simulated_encrypted", "simulated_altered", "simulated_contained")
            ]
            recoverable = [p for p in affected if p in self._backups]
            return {
                "vault_dir": "demo_vault/",
                "recovered_dir": "demo_recovered/",
                "protected_count": len(ws_files),
                "backup_count": len(self._backups),
                "affected_count": len(affected),
                "recoverable_count": len(recoverable),
                "recovered_count": len(self._recovered),
                "backups": list(self._backups.values()),
                "affected_files": affected,
                "recoverable_files": recoverable,
                "recovered_files": list(self._recovered.values()),
                "recovery_history": list(self._history),
            }

