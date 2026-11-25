"""Integration examples of synthetic tabular observations for backend testing.

Purely synthetic numerical records representing normal, backup, compression,
suspicious, and malformed inputs.
"""

from __future__ import annotations

SYNTHETIC_INFERENCE_EXAMPLES: dict[str, dict[str, float | int]] = {
    "normal": {
        "file_mod_rate": 12.0,
        "entropy_delta": 0.35,
        "rename_ratio": 0.08,
        "unique_ext_count": 3,
        "burst_io_score": 0.22,
        "shadow_copy_access_flag": 0,
    },
    "backup": {
        "file_mod_rate": 110.0,
        "entropy_delta": 0.55,
        "rename_ratio": 0.15,
        "unique_ext_count": 5,
        "burst_io_score": 0.85,
        "shadow_copy_access_flag": 0,
    },
    "compression": {
        "file_mod_rate": 95.0,
        "entropy_delta": 2.30,
        "rename_ratio": 0.10,
        "unique_ext_count": 3,
        "burst_io_score": 0.72,
        "shadow_copy_access_flag": 0,
    },
    "suspicious": {
        "file_mod_rate": 160.0,
        "entropy_delta": 2.80,
        "rename_ratio": 0.75,
        "unique_ext_count": 18,
        "burst_io_score": 0.88,
        "shadow_copy_access_flag": 1,
    },
    "invalid_range": {
        "file_mod_rate": -15.0,
        "entropy_delta": 0.35,
        "rename_ratio": 0.08,
        "unique_ext_count": 3,
        "burst_io_score": 0.22,
        "shadow_copy_access_flag": 0,
    },
    "invalid_missing": {
        "file_mod_rate": 10.0,
    },
}
