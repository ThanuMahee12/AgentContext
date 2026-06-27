#!/usr/bin/env python3
"""Extract conversation context from a Claude Code JSONL transcript
and write/append a session note to AgentContext.

Usage: extract-session.py <session_id> <cwd>

Finds the JSONL transcript under ~/.claude/projects/, extracts user
messages and assistant responses, and appends a session entry to
docs/sessions/claude/l-YYYY-MM-DD.md in the AgentContext repo.
"""

from __future__ import annotations  # 3.9-safe annotations (system python is 3.9)

import getpass
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Firestore push helper lives beside this script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import fb_common
    HAVE_FIRESTORE = True
except Exception:
    HAVE_FIRESTORE = False

# Per-user: look for transcripts in the CURRENT user's ~/.claude (multi-user safe).
CLAUDE_DIR = Path(os.path.expanduser("~")) / ".claude"

# AgentContext rollup is thanumahee-specific; only attempted when that user runs.
AGENT_CONTEXT = Path("/home/thanumahee/dev/AgentContext")
SESSIONS_DIR = AGENT_CONTEXT / "docs" / "sessions" / "claude"
S3_TRANSCRIPTS = Path("/mnt/s3-thanudev12/session/transcripts")

MAX_USER_MSG_LEN = 500
MAX_ASST_MSG_LEN = 800
MAX_ENTRIES = 40  # max conversation turns to include


def cwd_to_project_key(cwd: str) -> str:
    """Convert a CWD like /home/thanumahee/dev/CWIQ to project dir name."""
    return cwd.rstrip("/").replace("/", "-")


def find_jsonl(session_id: str, cwd: str) -> Path | None:
    """Find the JSONL file for a given session_id."""
    projects_dir = CLAUDE_DIR / "projects"
    if not projects_dir.exists():
        return None

    # Direct lookup: try the project key derived from cwd
    project_key = cwd_to_project_key(cwd)
    direct = projects_dir / project_key / f"{session_id}.jsonl"
    if direct.exists():
        return direct

    # Fallback: search all project dirs
    for jsonl in projects_dir.rglob(f"{session_id}.jsonl"):
        # Skip subagent files
        if "subagents" not in str(jsonl):
            return jsonl
    return None


def extract_messages(jsonl_path: Path) -> list[dict]:
    """Extract user and assistant messages from JSONL."""
    messages = []
    try:
        with open(jsonl_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg_type = entry.get("type")

                if msg_type == "user":
                    msg = entry.get("message", {})
                    if isinstance(msg, dict):
                        content = msg.get("content", "")
                    else:
                        content = str(msg)

                    # Handle content that is a list (tool results, etc.)
                    if isinstance(content, list):
                        text_parts = []
                        for part in content:
                            if isinstance(part, dict) and part.get("type") == "text":
                                text_parts.append(part["text"])
                        content = "\n".join(text_parts) if text_parts else ""

                    content = content.strip()
                    if content and len(content) > 10:
                        messages.append({
                            "role": "user",
                            "text": content[:MAX_USER_MSG_LEN],
                        })

                elif msg_type == "assistant":
                    msg = entry.get("message", {})
                    if isinstance(msg, dict):
                        content_list = msg.get("content", [])
                        text_parts = []
                        tools_used = []
                        for c in content_list:
                            if isinstance(c, dict):
                                if c.get("type") == "text":
                                    text_parts.append(c["text"])
                                elif c.get("type") == "tool_use":
                                    tools_used.append(c.get("name", "unknown"))

                        text = "\n".join(text_parts).strip()
                        if text:
                            messages.append({
                                "role": "assistant",
                                "text": text[:MAX_ASST_MSG_LEN],
                                "tools": tools_used,
                            })
                        elif tools_used:
                            messages.append({
                                "role": "assistant",
                                "text": f"[Used tools: {', '.join(tools_used[:5])}]",
                                "tools": tools_used,
                            })

    except Exception as e:
        messages.append({"role": "error", "text": f"Parse error: {e}"})

    return messages


def summarize_session(messages: list[dict], session_id: str, cwd: str) -> str:
    """Format messages into a markdown session section."""
    now = datetime.now()
    time_str = now.strftime("%H:%M")

    # Collect all tools used across the session
    all_tools = set()
    for m in messages:
        if m.get("tools"):
            all_tools.update(m["tools"])

    # Count turns
    user_turns = sum(1 for m in messages if m["role"] == "user")
    asst_turns = sum(1 for m in messages if m["role"] == "assistant")

    lines = []
    lines.append(f"### Session {session_id[:8]} — {time_str}")
    lines.append(f"**Working Directory:** `{cwd}`")
    lines.append(f"**Turns:** {user_turns} user / {asst_turns} assistant")
    if all_tools:
        # Show top tools, deduplicated
        tool_list = sorted(all_tools)[:15]
        lines.append(f"**Tools:** {', '.join(tool_list)}")
    lines.append("")

    # Extract conversation flow (trimmed)
    lines.append("#### Conversation")
    count = 0
    for m in messages:
        if count >= MAX_ENTRIES:
            lines.append(f"\n*... {len(messages) - count} more turns omitted*")
            break
        role = m["role"]
        text = m["text"]
        # Clean up multi-line text for readability
        text = text.replace("\n", " ").strip()
        if len(text) > 300:
            text = text[:300] + "..."

        if role == "user":
            lines.append(f"- **User:** {text}")
        elif role == "assistant":
            lines.append(f"- **Claude:** {text}")
        count += 1

    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def save_transcript_backup(jsonl_path: Path, session_id: str, session_dir: Path | None = None):
    """Copy transcript JSONL to the per-session folder (or legacy transcripts dir)."""
    try:
        import shutil
        if session_dir is not None:
            # New layout: session/<...>/transcript.jsonl
            session_dir.mkdir(parents=True, exist_ok=True)
            dest = session_dir / "transcript.jsonl"
            if not dest.exists():
                shutil.copy2(jsonl_path, dest)
            # Multi-user: the file is owned by whoever ran the session. The
            # parent tree is world-writable+sticky so others can still read it.
            return str(dest)
        # Legacy fallback: flat transcripts dir
        S3_TRANSCRIPTS.mkdir(parents=True, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d")
        dest = S3_TRANSCRIPTS / f"{date_str}_{session_id[:8]}.jsonl"
        if not dest.exists():
            shutil.copy2(jsonl_path, dest)
        return str(dest)
    except Exception:
        return None  # S3 backup is best-effort


def push_to_firestore(messages, session_id, cwd, transcript_path, jsonl_path):
    """Push a structured session document to Firestore (permanent store).

    Path: claude/session/{project}/{YYYY}/{YYYYMMDD}/{session_id}
    The full raw transcript is always stored, chunked across a parts/
    sub-collection, so rotating the /mnt copy after 48h loses nothing.
    Runs for ALL users (not just thanumahee).
    """
    if not HAVE_FIRESTORE:
        return False

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    project = cwd.rstrip("/").split("/")[-1] if cwd and cwd != "unknown" else "unknown"

    all_tools = sorted({t for m in messages for t in m.get("tools", [])})
    user_turns = sum(1 for m in messages if m["role"] == "user")
    asst_turns = sum(1 for m in messages if m["role"] == "assistant")
    convo = [{"role": m["role"], "text": m["text"][:300]} for m in messages[:MAX_ENTRIES]]

    doc_path = fb_common.session_doc_path(
        project, now.strftime("%Y"), now.strftime("%Y%m%d"), session_id
    )

    n_parts, transcript_bytes = 0, 0
    if jsonl_path and Path(jsonl_path).exists():
        try:
            raw = Path(jsonl_path).read_bytes().decode("utf-8", errors="replace")
            n_parts, transcript_bytes = fb_common.upsert_transcript_chunks(doc_path, raw)
        except Exception:
            pass

    doc = {
        "session_id": session_id,
        "date": date_str,
        "time": now.strftime("%H:%M"),
        "ended_at": fb_common.utc_now_iso(),
        "cwd": cwd,
        "project": project,
        "turns_user": user_turns,
        "turns_assistant": asst_turns,
        "tools": all_tools,
        "conversation": convo,
        "transcript_s3_path": transcript_path or "",
        "transcript_bytes": transcript_bytes,
        "transcript_parts": n_parts,          # -1 means upload incomplete
        "pushed_at": fb_common.utc_now_iso(),
    }
    return fb_common.upsert_document(doc_path, doc)


def push_agentcontext_md(md_path):
    """Push an AgentContext daily session-rollup markdown file to Firestore.

    Path: agentcontext/sessions/{platform}/{name}  (e.g. .../claude/l-2026-06-26)
    The whole markdown is stored inline (rollups are small); if one ever exceeds
    the doc limit it falls back to the chunked parts/ sub-collection.
    """
    if not HAVE_FIRESTORE:
        return False
    import re
    try:
        p = Path(md_path)
        content = p.read_text(errors="replace")
    except Exception:
        return False

    platform = p.parent.name          # 'claude' or 'gemini'
    name = p.stem                     # e.g. 'l-2026-06-26'
    m = re.search(r"(\d{4}-\d{2}-\d{2})", name)
    date = m.group(1) if m else ""
    nbytes = len(content.encode("utf-8"))
    doc_path = f"agentcontext/sessions/{platform}/{name}"

    inline, n_parts = content, 0
    if len(content) > fb_common.CHUNK_CHARS:          # too big for one doc
        n_parts, _ = fb_common.upsert_transcript_chunks(doc_path, content)
        inline = ""                                    # full text lives in parts/

    doc = {
        "name": name,
        "platform": platform,
        "date": date,
        "content": inline,
        "content_parts": n_parts,
        "bytes": nbytes,
        "updated_at": fb_common.utc_now_iso(),
    }
    return fb_common.upsert_document(doc_path, doc)


def main():
    if len(sys.argv) < 3:
        print("Usage: extract-session.py <session_id> <cwd>", file=sys.stderr)
        sys.exit(1)

    session_id = sys.argv[1]
    cwd = sys.argv[2]
    # Optional 4th arg: per-session folder to place the transcript in
    session_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else None

    # Find the JSONL transcript
    transcript_path = None
    jsonl_path = find_jsonl(session_id, cwd)
    if not jsonl_path:
        # No transcript found — write a minimal note
        messages = [{"role": "user", "text": "(no transcript found)"}]
    else:
        messages = extract_messages(jsonl_path)
        # Backup transcript into the per-session folder (or legacy dir)
        transcript_path = save_transcript_backup(jsonl_path, session_id, session_dir)

    if not messages:
        sys.exit(0)  # Empty session, skip

    # --- Firestore push: ALL users, permanent store (best-effort) ---
    try:
        push_to_firestore(messages, session_id, cwd, transcript_path, jsonl_path)
    except Exception:
        pass

    # --- AgentContext rollup: thanumahee-only (it's a git repo in their home) ---
    try:
        current_user = getpass.getuser()
    except Exception:
        current_user = ""
    if current_user != "thanumahee" or not AGENT_CONTEXT.exists():
        sys.exit(0)  # other users: S3 archive already done above; skip rollup

    # Generate session markdown
    section = summarize_session(messages, session_id, cwd)

    try:
        # Determine output file
        SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d")
        session_file = SESSIONS_DIR / f"l-{date_str}.md"

        if session_file.exists():
            # Append to existing daily file
            with open(session_file, "a") as f:
                f.write("\n" + section)
        else:
            # Create new daily file with header
            header = f"# Session: {date_str} (Linux)\n\n"
            with open(session_file, "w") as f:
                f.write(header + section)

        # Fix ownership so thanumahee can git-add
        import pwd
        pw = pwd.getpwnam("thanumahee")
        os.chown(session_file, pw.pw_uid, pw.pw_gid)

        # Also push the updated daily rollup md to Firestore (best-effort).
        try:
            push_agentcontext_md(session_file)
        except Exception:
            pass
    except Exception:
        pass


if __name__ == "__main__":
    main()
