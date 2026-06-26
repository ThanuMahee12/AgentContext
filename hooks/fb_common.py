#!/usr/bin/env python3
"""Shared Firebase/Firestore helpers for session-note automation.

Pure stdlib (urllib) — no external dependencies. Mints fresh access
tokens from the firebase-tools stored refresh token on each run, so it
works unattended (hook/cron) without an interactive login.
"""

from __future__ import annotations  # 3.9-safe annotations (system python is 3.9)

import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone

# --- Config ---
PROJECT_ID = "agentcontext-sessions"
FIRESTORE_BASE = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
    f"/databases/(default)/documents"
)

# Document paths mirror the /mnt layout:
#   claude/session/{project}/{YYYY}/{YYYYMMDD}/{session_id}
# (alternating collection/document segments; ancestor docs are implicit)
ROOT_PATH = "claude/session"


def session_doc_path(project: str, yyyy: str, yyyymmdd: str, session_id: str) -> str:
    """Build the hierarchical Firestore document path for a session."""
    project = (project or "unknown").strip("/") or "unknown"
    return f"{ROOT_PATH}/{project}/{yyyy}/{yyyymmdd}/{session_id}"

# firebase-tools public OAuth client (constants from the open-source CLI)
OAUTH_CLIENT_ID = (
    "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
)
OAUTH_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"
FB_CONFIG_PATH = "/home/thanumahee/.config/configstore/firebase-tools.json"

# Firestore single-document size ceiling is 1 MiB. Chunk transcript text by
# characters with headroom (JSONL transcripts are ~1 byte/char), so every
# chunk doc stays safely under the limit. Full transcript is ALWAYS stored.
CHUNK_CHARS = 700_000


def get_access_token() -> str | None:
    """Mint a fresh access token from the stored refresh token."""
    try:
        with open(FB_CONFIG_PATH) as f:
            refresh = json.load(f)["tokens"]["refresh_token"]
    except Exception:
        return None

    data = urllib.parse.urlencode({
        "client_id": OAUTH_CLIENT_ID,
        "client_secret": OAUTH_CLIENT_SECRET,
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    }).encode()

    try:
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.load(resp).get("access_token")
    except Exception:
        return None


def _to_firestore_value(v):
    """Convert a Python value to a Firestore REST 'Value'."""
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, str):
        return {"stringValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [_to_firestore_value(x) for x in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: _to_firestore_value(x) for k, x in v.items()}}}
    if v is None:
        return {"nullValue": None}
    return {"stringValue": str(v)}


def to_firestore_fields(d: dict) -> dict:
    """Convert a flat/nested dict into a Firestore document body."""
    return {"fields": {k: _to_firestore_value(v) for k, v in d.items()}}


def upsert_document(doc_path: str, data: dict, token: str | None = None) -> bool:
    """Create or overwrite a document at a full hierarchical path."""
    if token is None:
        token = get_access_token()
    if not token:
        return False

    url = f"{FIRESTORE_BASE}/{urllib.parse.quote(doc_path, safe='/')}"
    body = json.dumps(to_firestore_fields(data)).encode()
    req = urllib.request.Request(url, data=body, method="PATCH")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        # Surface error body to stderr for debugging
        import sys
        sys.stderr.write(f"Firestore upsert error {e.code}: {e.read().decode()[:300]}\n")
        return False
    except Exception as e:
        import sys
        sys.stderr.write(f"Firestore upsert failed: {e}\n")
        return False


def document_exists(doc_path: str, token: str | None = None) -> bool:
    """Return True if a document exists at a full hierarchical path."""
    if token is None:
        token = get_access_token()
    if not token:
        return False

    url = f"{FIRESTORE_BASE}/{urllib.parse.quote(doc_path, safe='/')}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        return False
    except Exception:
        return False


def get_document(doc_path: str, token: str | None = None) -> dict | None:
    """Fetch a document's Firestore 'fields' dict, or None if missing/error."""
    if token is None:
        token = get_access_token()
    if not token:
        return None
    url = f"{FIRESTORE_BASE}/{urllib.parse.quote(doc_path, safe='/')}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.load(resp).get("fields", {})
    except Exception:
        return None


def upsert_transcript_chunks(doc_path: str, raw_text: str, token: str | None = None):
    """Write the full transcript to the `parts` sub-collection under doc_path,
    split into CHUNK_CHARS-sized pieces. Reassembly = concat parts by seq.

    Returns (n_parts, total_bytes); n_parts == -1 signals a partial failure.
    """
    if token is None:
        token = get_access_token()
    if not token:
        return (-1, 0)

    total_bytes = len(raw_text.encode("utf-8"))
    parts = [raw_text[i:i + CHUNK_CHARS] for i in range(0, len(raw_text), CHUNK_CHARS)] or [""]

    for idx, part in enumerate(parts):
        ppath = f"{doc_path}/parts/{idx:04d}"
        if not upsert_document(ppath, {"seq": idx, "data": part}, token=token):
            return (-1, total_bytes)  # partial upload — caller should NOT trust it
    return (len(parts), total_bytes)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
