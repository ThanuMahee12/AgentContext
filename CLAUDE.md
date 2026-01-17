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

Claude reads `discussions/*.json` for quick context. Each file contains:

```json
{
  "id": "topic-id",
  "title": "Topic Title",
  "url": "https://github.com/.../discussions/N",
  "summary": "Detailed summary for quick understanding...",
  "comments": [
    {"date": "YYYY-MM-DD", "topic": "subtopic", "content": "Details..."}
  ],
  "tags": ["tag1", "tag2"]
}
```

**Workflow:**
1. Read JSON → instant context (90% of time)
2. Need more? → Fetch GitHub Discussion via API

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
- Read `discussions/*.json` for topic context
- Check `docs/sessions/claude/` for latest session

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
