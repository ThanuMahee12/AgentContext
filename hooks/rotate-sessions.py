#!/usr/bin/env python3
"""Rotate /mnt session folders older than 48h.

For each session folder under /mnt/s3-thanudev12/session/claude/ whose
notes.md is older than the retention window, VERIFY the corresponding
Firestore document exists, then delete the local folder. A folder whose
doc is missing from Firestore is kept (never lose un-pushed data).

Run from cron (as thanumahee). Logs to the S3 logs tree.
"""

from __future__ import annotations  # 3.9-safe annotations (system python is 3.9)

import os
import shutil
import sys
import re
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fb_common

SESSION_ROOT = Path("/mnt/s3-thanudev12/session/claude")
RETENTION_HOURS = 48

_DATE_RE = re.compile(r"\*\*Date:\*\*\s*(\d{4})-(\d{2})-(\d{2})")
_SID_RE = re.compile(r"\*\*Session ID:\*\*\s*(\S+)")
_CWD_RE = re.compile(r"\*\*Working Directory:\*\*\s*(\S+)")


def parse_notes(notes_file: Path):
    """Pull session_id, cwd, and date parts out of notes.md."""
    try:
        text = notes_file.read_text(errors="replace")
    except Exception:
        return None
    sid = _SID_RE.search(text)
    cwd = _CWD_RE.search(text)
    dm = _DATE_RE.search(text)
    if not (sid and dm):
        return None
    yyyy, mm, dd = dm.group(1), dm.group(2), dm.group(3)
    cwd_val = cwd.group(1) if cwd else "unknown"
    project = cwd_val.rstrip("/").split("/")[-1] if cwd_val != "unknown" else "unknown"
    return {
        "session_id": sid.group(1),
        "cwd": cwd_val,
        "project": project,
        "yyyy": yyyy,
        "yyyymmdd": f"{yyyy}{mm}{dd}",
    }


def main():
    dry_run = "--dry-run" in sys.argv
    now = datetime.now()
    cutoff = now - timedelta(hours=RETENTION_HOURS)
    mode = "DRY-RUN" if dry_run else "LIVE"
    log_lines = [f"[{fb_common.utc_now_iso()}] rotation run [{mode}] (cutoff={cutoff:%Y-%m-%d %H:%M})"]

    if not SESSION_ROOT.exists():
        log_lines.append("  session root does not exist; nothing to do")
        emit_log(log_lines)
        return

    token = fb_common.get_access_token()
    if not token:
        log_lines.append("  ERROR: could not get Firestore token; skipping (no deletions)")
        emit_log(log_lines)
        return

    deleted = kept_unpushed = kept_recent = skipped = 0

    # Session folders are the parents of notes.md files
    for notes_file in SESSION_ROOT.rglob("notes.md"):
        folder = notes_file.parent
        try:
            mtime = datetime.fromtimestamp(notes_file.stat().st_mtime)
        except Exception:
            skipped += 1
            continue

        if mtime > cutoff:
            kept_recent += 1
            continue  # still within 48h window

        info = parse_notes(notes_file)
        if not info:
            log_lines.append(f"  SKIP (unparseable notes): {folder}")
            skipped += 1
            continue

        doc_path = fb_common.session_doc_path(
            info["project"], info["yyyy"], info["yyyymmdd"], info["session_id"]
        )

        fields = fb_common.get_document(doc_path, token=token)
        if not fields:
            kept_unpushed += 1
            log_lines.append(f"  KEPT (not in Firestore): {folder} -> {doc_path}")
            continue

        # Integrity gate: full transcript must be confirmed uploaded before delete.
        local_t = folder / "transcript.jsonl"
        doc_bytes = int(fields.get("transcript_bytes", {}).get("integerValue", -1))
        doc_parts = int(fields.get("transcript_parts", {}).get("integerValue", 0))

        if local_t.exists():
            local_bytes = local_t.stat().st_size
            # Firestore holding >= local bytes means it has a superset (a resumed
            # session only grows), so the local copy is safe to drop.
            ok = (doc_parts != -1) and (doc_bytes >= local_bytes)
            reason = f"doc_bytes {doc_bytes} >= local {local_bytes} parts={doc_parts}"
        else:
            # Metadata-only session (no transcript) — doc existence is enough.
            ok = True
            reason = "metadata-only (no transcript)"

        if not ok:
            kept_unpushed += 1
            log_lines.append(f"  KEPT (transcript mismatch): {folder} [{reason}]")
            continue

        if dry_run:
            deleted += 1
            log_lines.append(f"  WOULD ROTATE: {folder}  [{reason}]")
        else:
            try:
                shutil.rmtree(folder)
                deleted += 1
                log_lines.append(f"  ROTATED: {folder}  [{reason}]")
            except Exception as e:
                log_lines.append(f"  ERROR deleting {folder}: {e}")
                skipped += 1

    log_lines.append(
        f"  summary: deleted={deleted} kept_recent={kept_recent} "
        f"kept_unpushed={kept_unpushed} skipped={skipped}"
    )
    emit_log(log_lines)


def emit_log(lines):
    msg = "\n".join(lines)
    print(msg)
    try:
        now = datetime.now()
        log_dir = Path(
            f"/mnt/s3-thanudev12/output/logs/{now:%Y}/{now:%m}/{now:%d}/session"
        )
        log_dir.mkdir(parents=True, exist_ok=True)
        with open(log_dir / "rotation.log", "a") as f:
            f.write(msg + "\n")
    except Exception:
        pass


if __name__ == "__main__":
    main()
