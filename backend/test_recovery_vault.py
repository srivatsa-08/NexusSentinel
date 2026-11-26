from pathlib import Path
from backend.recovery_vault import RecoveryVaultManager


def test_vault_snapshot_recover_and_integrity(tmp_path: Path):
    ws = tmp_path / "ws"
    vault = tmp_path / "vault"
    rec = tmp_path / "rec"
    ws.mkdir()

    samples = {
        "notes.txt": b"hello fintech",
        "ledger.csv": b"id,amt\n1,100\n",
        "meta.json": b'{"ok":true}',
        "report.pdf": b"%PDF-1.4\n%sample",
        "deck.pptx": b"PK\x03\x04pptx",
    }
    for name, content in samples.items():
        (ws / name).write_bytes(content)

    mgr = RecoveryVaultManager(ws, vault, rec)
    snap = mgr.snapshot_workspace()
    assert snap["snapshotted_count"] == 5

    # Individual recovery + duplicate filename handling
    r1 = mgr.recover_file("notes.txt")
    assert r1["integrity_verified"] is True
    assert (rec / r1["restored_path"]).read_bytes() == samples["notes.txt"]

    r2 = mgr.recover_file("notes.txt")
    assert r2["restored_path"] != r1["restored_path"]
    assert (rec / r2["restored_path"]).read_bytes() == samples["notes.txt"]

    # Bulk recovery
    bulk = mgr.recover_all()
    assert bulk["recovered_count"] == 5
    assert bulk["error_count"] == 0

    # Reset clears recovered_dir and history but keeps backups
    mgr.reset()
    st = mgr.get_status()
    assert st["recovered_count"] == 0
    assert st["backup_count"] == 5


def test_vault_rejects_unsafe_paths_and_detects_mismatch(tmp_path: Path):
    ws = tmp_path / "ws"
    vault = tmp_path / "vault"
    rec = tmp_path / "rec"
    ws.mkdir()
    (ws / "a.txt").write_bytes(b"clean-data")

    mgr = RecoveryVaultManager(ws, vault, rec)
    mgr.snapshot_workspace()

    # Unsafe path
    try:
        mgr.recover_file("../secret.txt")
        assert False, "Expected ValueError"
    except ValueError:
        pass

    # Missing backup
    try:
        mgr.recover_file("missing.txt")
        assert False, "Expected FileNotFoundError"
    except FileNotFoundError:
        pass

    # Simulate hash mismatch in vault file
    (vault / "a.txt").write_bytes(b"tampered")
    res = mgr.recover_file("a.txt")
    assert res["integrity_verified"] is False

