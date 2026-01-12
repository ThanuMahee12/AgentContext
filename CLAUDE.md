# CLAUDE.md

Global context and session notes for Claude Code.

## Structure

```
AgentContext/
├── docs/Claude/
│   ├── sessions/          # Daily session logs
│   │   ├── w-YYYY-MM-DD.md   # Windows machine
│   │   └── l-YYYY-MM-DD.md   # Linux/remote machine
│   └── notes/             # Project-specific notes
│       └── {project}.md
└── CLAUDE.md
```

## Session Naming

| Prefix | Machine |
|--------|---------|
| `w-` | Windows |
| `l-` | Linux/remote |

## Workflow

### Start of session (new machine)
```bash
cd ~/AgentContext && git pull
```
Read latest session from `docs/Claude/sessions/`

### End of session
```bash
cd ~/AgentContext && git add -A && git commit -m "docs: update session" && git push
```

## Cross-Machine Continuity

When continuing work started on another machine:
```markdown
**Continued from:** w-2026-01-11 (section name)
```

Same-day sessions on different machines are separate files (`w-` and `l-` can coexist).

## Session Content

**Include:**
- Branch name and project context
- What was done (bullet points)
- Key decisions/findings
- Next steps

**Keep in notes/ instead:**
- Long-lived reference info (schemas, mappings)
- Project-specific guidelines

## Quick Reference

| Action | Command |
|--------|---------|
| Sync | `cd ~/dev/AgentContext && git pull` |
| Save | `cd ~/dev/AgentContext && git add -A && git commit -m "docs: update session" && git push` |
| View sessions | `ls ~/dev/AgentContext/docs/Claude/sessions/` |

## Repo

https://github.com/ThanuMahee12/AgentContext
