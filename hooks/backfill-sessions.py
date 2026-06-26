#!/usr/bin/env python3
"""One-time backfill: push pre-existing /mnt session folders to Firestore.

For each session folder under /mnt/s3-thanudev12/session/claude/, reads
notes.md for identity + historical date, locates a transcript (the folder's
transcript.jsonl, else the original under ~/.claude/projects), extracts the
conversation preview, and writes:

    main doc:  claude/session/{project}/{YYYY}/{YYYYMMDD}/{session_id}
    parts:     .../{session_id}/parts/{NNNN}   (full transcript, chunked)

Idempotent: skips sessions already fully pushed (transcript_bytes matches).
Use --force to re-push everything.
"""

from __future__ import annotations  # 3.9-safe annotations (system python is 3.9)

import importlib.util
import os
import re
import sys
from pathlib import Path

_HOOKS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HOOKS_DIR)
import fb_common

_spec = importlib.util.spec_from_file_location(
    "extract_session", os.path.join(_HOOKS_DIR, "extract-session.py")
)
es = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(es)

SESSION_ROOT = Path("/mnt/s3-thanudev12/session/claude")

_DATE_RE = re.compile(r"\*\*Date:\*\*\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})")
_SID_RE = re.compile(r"\*\*Session ID:\*\*\s*(\S+)")
_CWD_RE = re.compile(r"\*\*Working Directory:\*\*\s*(\S+)")


def parse_notes(notes_file: Path):
    try:
        text = notes_file.read_text(errors="replace")
    except Exception:
        return None
    sid, dm = _SID_RE.search(text), _DATE_RE.search(text)
    if not (sid and dm):
        return None
    cwd_m = _CWD_RE.search(text)
    cwd = cwd_m.group(1) if cwd_m else "unknown"
    project = cwd.rstrip("/").split("/")[-1] if cwd != "unknown" else "unknown"
    yyyy, mm, dd, hh, mi = dm.groups()
    return {
        "session_id": sid.group(1), "cwd": cwd, "project": project,
        "date": f"{yyyy}-{mm}-{dd}", "time": f"{hh}:{mi}",
        "yyyy": yyyy, "yyyymmdd": f"{yyyy}{mm}{dd}",
    }


def main():
    force = "--force" in sys.argv
    token = fb_common.get_access_token()
    if not token:
        print("ERROR: no Firestore token"); sys.exit(1)

    pushed = skipped = no_transcript = failed = 0
    folders = sorted(SESSION_ROOT.rglob("notes.md"))
    print(f"Found {len(folders)} session folders\n")

    for notes_file in folders:
        folder = notes_file.parent
        info = parse_notes(notes_file)
        if not info:
            print(f"  SKIP unparseable: {folder}"); failed += 1; continue

        doc_path = fb_common.session_doc_path(
            info["project"], info["yyyy"], info["yyyymmdd"], info["session_id"]
        )

        # Locate transcript: folder copy first, then the original
        local_t = folder / "transcript.jsonl"
        jsonl = local_t if local_t.exists() else es.find_jsonl(info["session_id"], info["cwd"])
        have_t = bool(jsonl and Path(jsonl).exists())
        src_bytes = Path(jsonl).stat().st_size if have_t else 0

        # Idempotency: skip if already pushed with matching byte count
        if not force:
            existing = fb_common.get_document(doc_path, token=token)
            if existing:
                eb = int(existing.get("transcript_bytes", {}).get("integerValue", -1))
                ep = int(existing.get("transcript_parts", {}).get("integerValue", 0))
                # Converge to the LARGEST transcript: a resumed session only
                # grows, so if Firestore already has >= this folder's bytes,
                # it holds a superset — skip. Only push when we have more.
                if ep != -1 and eb >= src_bytes:
                    skipped += 1
                    continue

        messages = es.extract_messages(Path(jsonl)) if have_t else []
        if not have_t:
            no_transcript += 1

        # Write full transcript chunks
        n_parts, transcript_bytes = 0, 0
        if have_t:
            raw = Path(jsonl).read_bytes().decode("utf-8", errors="replace")
            n_parts, transcript_bytes = fb_common.upsert_transcript_chunks(
                doc_path, raw, token=token
            )

        all_tools = sorted({t for m in messages for t in m.get("tools", [])})
        convo = [{"role": m["role"], "text": m["text"][:300]} for m in messages[:es.MAX_ENTRIES]]
        doc = {
            "session_id": info["session_id"], "date": info["date"], "time": info["time"],
            "ended_at": f"{info['date']}T{info['time']}:00Z",
            "cwd": info["cwd"], "project": info["project"],
            "turns_user": sum(1 for m in messages if m["role"] == "user"),
            "turns_assistant": sum(1 for m in messages if m["role"] == "assistant"),
            "tools": all_tools, "conversation": convo,
            "transcript_s3_path": str(local_t) if local_t.exists() else "",
            "transcript_bytes": transcript_bytes, "transcript_parts": n_parts,
            "pushed_at": fb_common.utc_now_iso(), "backfilled": True,
        }

        if fb_common.upsert_document(doc_path, doc, token=token):
            pushed += 1
            tag = f"{n_parts}p/{transcript_bytes}b" if have_t else "metadata-only"
            print(f"  PUSHED: {doc_path}  [{tag}]")
        else:
            failed += 1
            print(f"  FAILED: {doc_path}")

    print(f"\nDone. pushed={pushed} skipped={skipped} no_transcript={no_transcript} failed={failed}")


if __name__ == "__main__":
    main()
