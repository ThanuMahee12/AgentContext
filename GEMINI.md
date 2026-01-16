# Initial Context for Gemini

You are working with the **AgentContext** repository - a shared knowledge base for AI agent sessions.

## Repository

- **Repo:** https://github.com/ThanuMahee12/AgentContext
- **Site:** https://thanumahee12.github.io/AgentContext

## Structure

```
AgentContext/
├── docs/
│   ├── index.md              # Home (AgentPortals)
│   ├── Sessions/             # Daily session logs
│   │   └── YYYY-MM-DD/
│   │       ├── claude-windows.md
│   │       ├── claude-linux.md
│   │       └── gemini.md     # YOUR sessions go here
│   ├── Discussion/           # Topic discussions
│   ├── Notes/                # Persistent knowledge
│   ├── Brainstorms/          # Ideas, new tools
│   └── RunBooks/             # Operational guides
├── mkdocs.yml
├── CLAUDE.md                 # Claude's context file
└── GEMINI.md                 # Your context file
```

## Your Session File

Create daily session logs at:
```
docs/Sessions/YYYY-MM-DD/gemini.md
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
- Check `docs/Sessions/` for latest sessions
- Read previous sessions for context (both yours and Claude's)

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

## Navigation Tabs

| Tab | Purpose |
|-----|---------|
| **Home** | AgentPortals - overview, recent sessions/discussions |
| **Sessions** | Daily work logs by date |
| **Discussion** | Topic-based discussions |
| **Notes** | Persistent knowledge & learnings |
| **Brainstorms** | Ideas, new tools, experiments |
| **RunBooks** | Operational guides |

## Key Points

1. **Sessions are date-organized:** `Sessions/2026-01-16/gemini.md`
2. **Share context with Claude:** You can read Claude's sessions and vice versa
3. **Persistent info goes in Notes/**, not Sessions
4. **Ideas go in Brainstorms/**
5. **Site uses MkDocs Material** with Mermaid diagram support

## Cross-Agent Collaboration

When continuing work started by Claude:
```markdown
**Continued from:** Claude session 2026-01-15 (section name)
```

## Current Projects

- **data-alchemy** - Data pipeline (Bronze → Silver → Gold → Platinum)
  - Branch: `feature/bbocax-futures`
  - Notes: `Notes/projects/data-alchemy/`

---

Ready to start. What would you like to work on?
