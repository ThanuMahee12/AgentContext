"""MkDocs macros for AgentContext site."""

from pathlib import Path
import json
import re


def define_env(env):
    """Define macros for MkDocs."""

    @env.macro
    def discussions_list():
        """Generate simple discussion links from JSON files."""
        discussions_path = Path(env.project_dir) / "discussions"

        if not discussions_path.exists():
            return "*No discussions found.*"

        lines = []

        for json_file in sorted(discussions_path.glob("*.json")):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            title = data.get("title", json_file.stem)
            url = data.get("url")
            tags = data.get("tags", [])

            # Simple list item with link
            if url:
                tag_str = " ".join([f"`{t}`" for t in tags]) if tags else ""
                lines.append(f"- [{title}]({url}) {tag_str}")
            else:
                lines.append(f"- {title}")

        return "\n".join(lines) if lines else "*No discussions found.*"

    @env.macro
    def session_calendar():
        """Generate a calendar table of all sessions."""
        docs_path = Path(env.project_dir) / "docs" / "sessions"

        # Collect all sessions by date
        sessions = {}  # {date: {claude: [machines], gemini: bool}}

        # Scan Claude sessions
        claude_path = docs_path / "claude"
        if claude_path.exists():
            for f in claude_path.glob("*.md"):
                if f.name == "index.md":
                    continue
                # Parse: w-2026-01-17.md or l-2026-01-17.md
                match = re.match(r"([wl])-(\d{4}-\d{2}-\d{2})\.md", f.name)
                if match:
                    machine, date = match.groups()
                    if date not in sessions:
                        sessions[date] = {"claude": [], "gemini": False}
                    sessions[date]["claude"].append(machine.upper())

        # Scan Gemini sessions
        gemini_path = docs_path / "gemini"
        if gemini_path.exists():
            for f in gemini_path.glob("*.md"):
                if f.name == "index.md":
                    continue
                # Parse: 2026-01-17.md
                match = re.match(r"(\d{4}-\d{2}-\d{2})\.md", f.name)
                if match:
                    date = match.group(1)
                    if date not in sessions:
                        sessions[date] = {"claude": [], "gemini": False}
                    sessions[date]["gemini"] = True

        if not sessions:
            return "*No sessions found.*"

        # Build grid cards (sorted by date descending)
        lines = ['<div class="grid cards" markdown>']

        for date in sorted(sessions.keys(), reverse=True):
            data = sessions[date]

            # Build links
            links = []
            for m in sorted(data["claude"]):
                prefix = m.lower()
                links.append(f"[:simple-anthropic: {m}](claude/{prefix}-{date}.md)")
            if data["gemini"]:
                links.append(f"[:simple-google: G](gemini/{date}.md)")

            links_str = " ".join(links) if links else "-"

            lines.append(f"""
-   **{date}**

    ---

    {links_str}
""")

        lines.append("</div>")
        return "\n".join(lines)
