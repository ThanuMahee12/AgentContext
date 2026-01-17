"""MkDocs macros for AgentContext site."""

from pathlib import Path
import json
import re


def define_env(env):
    """Define macros for MkDocs."""

    @env.macro
    def discussions_list():
        """Generate discussion links with summary, ordered by date (newest first)."""
        discussions_path = Path(env.project_dir) / "discussions"

        if not discussions_path.exists():
            return "*No discussions found.*"

        # Load all discussions
        discussions = []
        for json_file in discussions_path.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["_file"] = json_file.stem
                discussions.append(data)

        # Sort by date (newest first)
        discussions.sort(key=lambda x: x.get("date", ""), reverse=True)

        lines = []
        for data in discussions:
            title = data.get("title", data["_file"])
            url = data.get("url")
            summary = data.get("summary", "")
            tags = data.get("tags", [])
            date = data.get("date", "")

            # Title with link
            if url:
                lines.append(f"### [{title}]({url})")
            else:
                lines.append(f"### {title}")

            # Date and tags
            tag_str = " ".join([f"`{t}`" for t in tags]) if tags else ""
            if date:
                lines.append(f"*{date}* {tag_str}")
            elif tag_str:
                lines.append(tag_str)
            lines.append("")

            # Summary (full)
            if summary:
                lines.append(summary)
                lines.append("")

            lines.append("---")
            lines.append("")

        return "\n".join(lines) if lines else "*No discussions found.*"

    @env.macro
    def brainstorms_list():
        """Generate brainstorm links with summary, ordered by date (newest first)."""
        brainstorms_path = Path(env.project_dir) / "brainstorms"

        if not brainstorms_path.exists():
            return "*No brainstorms found.*"

        # Load all brainstorms
        brainstorms = []
        for json_file in brainstorms_path.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["_file"] = json_file.stem
                brainstorms.append(data)

        # Sort by date (newest first)
        brainstorms.sort(key=lambda x: x.get("date", ""), reverse=True)

        lines = []
        for data in brainstorms:
            title = data.get("title", data["_file"])
            gist = data.get("gist")
            url = data.get("url")
            summary = data.get("summary", "")
            tags = data.get("tags", [])
            date = data.get("date", "")

            # Title with gist link (prefer gist for brainstorms)
            if gist:
                lines.append(f"### [{title}]({gist})")
            elif url:
                lines.append(f"### [{title}]({url})")
            else:
                lines.append(f"### {title}")

            # Date and tags
            tag_str = " ".join([f"`{t}`" for t in tags]) if tags else ""
            if date:
                lines.append(f"*{date}* {tag_str}")
            elif tag_str:
                lines.append(tag_str)
            lines.append("")

            # Summary (full)
            if summary:
                lines.append(summary)
                lines.append("")

            # Links row
            link_items = []
            if gist:
                link_items.append(f"[:octicons-file-code-16: Gist]({gist})")
            if url:
                link_items.append(f"[:octicons-comment-discussion-16: Discussion]({url})")
            if link_items:
                lines.append(" | ".join(link_items))
                lines.append("")

            lines.append("---")
            lines.append("")

        return "\n".join(lines) if lines else "*No brainstorms found.*"

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
