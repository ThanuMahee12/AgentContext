# Initial Context for Gemini

You are working with the **AgentContext** repository - a shared knowledge base for AI agent sessions.

## Repository

- **Repo:** https://github.com/ThanuMahee12/AgentContext
- **Site:** https://thanumahee12.github.io/AgentContext

## Structure

```
AgentContext/
├── docs/
│   ├── index.md              # Home (Dashboard)
│   ├── sessions/             # Daily session logs
│   │   ├── claude/           # Claude sessions
│   │   │   ├── w-YYYY-MM-DD.md   # Windows (w- prefix)
│   │   │   └── l-YYYY-MM-DD.md   # Linux (l- prefix)
│   │   └── gemini/           # YOUR sessions go here
│   │       └── YYYY-MM-DD.md
│   ├── discussions/          # Topic discussions
│   ├── notes/                # Persistent knowledge
│   ├── brainstorms/          # Ideas, new tools
│   └── runbooks/             # Operational guides
├── pyproject.toml            # uv dependencies
├── mkdocs.yml
├── CLAUDE.md                 # Claude's context file
└── GEMINI.md                 # Your context file
```

## Your Session File

Create daily session logs at:
```
docs/sessions/gemini/YYYY-MM-DD.md
```

### Session Template

```markdown
# YYYY-MM-DD

## Project: {project-name}

**Repo:** {repo-name}

**Environment:** {machine/platform}

**Branch:** `{branch-name}`

### Status at Start

- Current state when session began

### Progress Today

**Session 1:**
- What was done
- Key decisions
- Findings

### Next

- Next steps
```

## Workflow

### Start of session
```bash
cd ~/AgentContext && git pull
```
- Check `docs/sessions/gemini/` for your latest sessions
- Check `docs/sessions/claude/` for Claude's sessions
- Read previous sessions for context (both yours and Claude's)

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

## Navigation Tabs

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard - overview, recent sessions/discussions |
| **Sessions** | Daily work logs by agent (claude/gemini) |
| **Discussions** | Topic-based discussions |
| **Notes** | Persistent knowledge & learnings |
| **Brainstorms** | Ideas, new tools, experiments |
| **RunBooks** | Operational guides |

## Key Points

1. **Sessions are agent-organized:** `sessions/gemini/YYYY-MM-DD.md`
2. **Share context with Claude:** You can read Claude's sessions and vice versa
3. **Persistent info goes in notes/**, not sessions
4. **Ideas go in brainstorms/**
5. **Site uses MkDocs Material** with Mermaid diagram support

## Cross-Agent Collaboration

When continuing work started by Claude:
```markdown
**Continued from:** Claude session 2026-01-15 (section name)
```

## Local Development

```bash
# Setup (first time)
cd ~/AgentContext && uv sync

# Start dev server
uv run mkdocs serve

# Build static site
uv run mkdocs build
```

## Current Projects

- **data-alchemy** - Data pipeline (Bronze → Silver → Gold → Platinum)
  - Branch: `feature/lseg_refinitiv_ibes_rt`
  - Notes: `notes/projects/data-alchemy/`

---

Ready to start. What would you like to work on?
