#!/usr/bin/env python3
"""One-time backfill: push existing AgentContext session-rollup markdown to Firestore.

Walks docs/sessions/{claude,gemini}/*.md and upserts each to:
    agentcontext/sessions/{platform}/{name}

Idempotent: skips files whose stored byte count already matches.
Use --force to re-push everything.
"""

from __future__ import annotations  # 3.9-safe annotations (system python is 3.9)

import importlib.util
import os
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

SESSIONS_ROOT = Path("/home/thanumahee/dev/AgentContext/docs/sessions")


def main():
    force = "--force" in sys.argv
    token = fb_common.get_access_token()
    if not token:
        print("ERROR: no Firestore token"); sys.exit(1)

    pushed = skipped = failed = 0
    files = sorted(SESSIONS_ROOT.rglob("*.md"))
    print(f"Found {len(files)} markdown files\n")

    for md in files:
        if md.name == "index.md":
            continue
        platform = md.parent.name
        name = md.stem
        doc_path = f"agentcontext/sessions/{platform}/{name}"
        nbytes = md.stat().st_size

        if not force:
            existing = fb_common.get_document(doc_path, token=token)
            if existing:
                eb = int(existing.get("bytes", {}).get("integerValue", -1))
                if eb == nbytes:
                    skipped += 1
                    continue

        if es.push_agentcontext_md(str(md)):
            pushed += 1
            print(f"  PUSHED: {doc_path}  [{nbytes}b]")
        else:
            failed += 1
            print(f"  FAILED: {doc_path}")

    print(f"\nDone. pushed={pushed} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
