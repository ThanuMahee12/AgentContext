# CLAUDE.md

Global context and session notes for Claude Code.

## Site

- **Repo:** https://github.com/ThanuMahee12/AgentContext
- **Site:** https://thanumahee12.github.io/AgentContext

## Structure

```
AgentContext/
├── discussions/             # JSON knowledge (Claude reads first)
│   ├── gics.json
│   ├── dq.json
│   ├── pathseeker.json
│   └── investigation-db.json
├── docs/
│   ├── index.md
│   ├── sessions/            # Daily logs
│   │   ├── claude/
│   │   │   ├── w-YYYY-MM-DD.md   # Windows
│   │   │   └── l-YYYY-MM-DD.md   # Linux
│   │   └── gemini/
│   │       └── YYYY-MM-DD.md
│   ├── notes/               # Persistent markdown
│   ├── brainstorms/         # Ideas markdown
│   └── runbooks/            # Operational guides
├── pyproject.toml
├── mkdocs.yml
└── CLAUDE.md
```

## Discussions (JSON Knowledge)

**Two-tier approach:**

| Tier | Source | Speed | Use |
|------|--------|-------|-----|
| 1 | `discussions/*.json` | Instant | 90% - quick context |
| 2 | GitHub Discussion API | Network | 10% - deep dive |

**JSON Schema:**
```json
{
  "id": "topic-id",
  "date": "YYYY-MM-DD",
  "title": "Topic Title",
  "url": "https://github.com/.../discussions/N",
  "summary": "Full detailed summary for quick understanding...",
  "comments": [
    {"date": "YYYY-MM-DD", "topic": "subtopic", "content": "Details..."}
  ],
  "tags": ["tag1", "tag2"]
}
```

**Key fields:**
- `date` - For sorting (newest first on site)
- `summary` - Full content (no truncation)
- `url` - Link to GitHub Discussion for deep dive
- `comments` - Sub-topics/updates

**Adding new discussion:**
1. Create `discussions/{topic}.json` with schema above
2. Optionally create GitHub Discussion and add URL
3. MkDocs renders automatically (sorted by date, newest first)

**Current topics:**
- `gics.json` - S&P GICS pipeline analysis
- `dq.json` - Data quality framework
- `pathseeker.json` - Path analysis tool
- `investigation-db.json` - Pattern-based reverse lookup

## Session Naming

```
sessions/claude/w-YYYY-MM-DD.md   # Windows (w- prefix)
sessions/claude/l-YYYY-MM-DD.md   # Linux (l- prefix)
sessions/gemini/YYYY-MM-DD.md     # Gemini sessions
```

## Workflow

### Start of session
```bash
cd ~/AgentContext && git pull
```
1. **Read `discussions/*.json`** - instant topic context (IMPORTANT)
2. Check `docs/sessions/claude/` for latest session
3. Need deep dive? → Fetch GitHub Discussion via API

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

### Adding knowledge
- Quick context → Add to `discussions/{topic}.json`
- Detailed discussion → GitHub Discussion (link in JSON)
- Daily log → `docs/sessions/claude/`

## Local Development

```bash
# Setup (first time)
cd ~/AgentContext && uv sync

# Start dev server
uv run mkdocs serve

# Build static site
uv run mkdocs build
```

## Quick Reference

| Action | Command |
|--------|---------|
| Sync repo | `cd ~/AgentContext && git pull` |
| Save changes | `git add -A && git commit -m "docs: update" && git push` |
| Dev server | `uv run mkdocs serve` |
| List topics | `ls discussions/*.json` |
| View sessions | `ls docs/sessions/claude/` |
