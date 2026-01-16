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
│   ├── Sessions/             # Daily session logs
│   │   ├── index.md
│   │   └── YYYY-MM-DD/
│   │       ├── claude-windows.md
│   │       ├── claude-linux.md
│   │       └── gemini.md
│   ├── Discussion/           # Topic discussions
│   │   └── index.md
│   ├── Notes/                # Persistent knowledge
│   │   ├── index.md
│   │   └── projects/
│   │       └── {project}/
│   ├── Brainstorms/          # Ideas, new tools
│   │   └── index.md
│   └── RunBooks/             # Operational guides
│       └── index.md
├── mkdocs.yml
└── CLAUDE.md
```

## Navigation

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard - current session, active projects, recent activity |
| **Sessions** | Daily work logs (date/agent-machine) |
| **Discussion** | Topic discussions |
| **Notes** | Persistent knowledge & learnings |
| **Brainstorms** | Ideas, new tools, experiments |
| **RunBooks** | Operational guides |

## Session Naming

```
Sessions/YYYY-MM-DD/claude-windows.md
Sessions/YYYY-MM-DD/claude-linux.md
Sessions/YYYY-MM-DD/gemini.md
```

## Workflow

### Start of session
```bash
cd ~/AgentContext && git pull
```
- Check `docs/Sessions/` for latest session
- Read previous day's session for context

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

### New session file
Create: `docs/Sessions/YYYY-MM-DD/claude-{machine}.md`

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

## Quick Reference

| Action | Command |
|--------|---------|
| Sync | `cd ~/AgentContext && git pull` |
| Save | `cd ~/AgentContext && git add -A && git commit -m "docs: update" && git push` |
| View sessions | `ls ~/AgentContext/docs/Sessions/` |
| New session | `mkdir -p ~/AgentContext/docs/Sessions/$(date +%Y-%m-%d)` |
