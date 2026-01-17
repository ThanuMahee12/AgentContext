# CLAUDE.md

Global context and session notes for Claude Code.

## Site

- **Repo:** https://github.com/ThanuMahee12/AgentContext
- **Site:** https://thanumahee12.github.io/AgentContext

## Structure

```
AgentContext/
├── docs/
│   ├── index.md              # Dashboard (Home)
│   ├── sessions/             # Daily session logs
│   │   ├── index.md
│   │   ├── claude/           # Claude sessions
│   │   │   ├── w-YYYY-MM-DD.md   # Windows (w- prefix)
│   │   │   └── l-YYYY-MM-DD.md   # Linux (l- prefix)
│   │   └── gemini/           # Gemini sessions
│   │       └── YYYY-MM-DD.md
│   ├── discussions/          # Topic discussions
│   │   └── index.md
│   ├── notes/                # Persistent knowledge
│   │   ├── index.md
│   │   └── projects/
│   │       └── {project}/
│   ├── brainstorms/          # Ideas, new tools
│   │   └── index.md
│   └── runbooks/             # Operational guides
│       └── index.md
├── pyproject.toml            # uv dependencies
├── mkdocs.yml
└── CLAUDE.md
```

## Navigation

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard - current session, active projects, recent activity |
| **Sessions** | Daily work logs by agent (claude/gemini) |
| **Discussions** | Topic discussions |
| **Notes** | Persistent knowledge & learnings |
| **Brainstorms** | Ideas, new tools, experiments |
| **RunBooks** | Operational guides |

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
- Check `docs/sessions/claude/` for latest session
- Read previous day's session for context

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

### New session file
Create: `docs/sessions/claude/w-YYYY-MM-DD.md` (Windows) or `l-YYYY-MM-DD.md` (Linux)

## Session Content

**Include:**
- Branch name and project context
- What was done (bullet points)
- Key decisions/findings
- Next steps

**Keep in Notes/ instead:**
- Long-lived reference info (schemas, mappings)
- Project-specific guidelines

**Keep in Brainstorms/ instead:**
- New tool ideas
- Feature proposals
- Experiments

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
| Build site | `uv run mkdocs build` |
| View sessions | `ls docs/sessions/claude/` |
