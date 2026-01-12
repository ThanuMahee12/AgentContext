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

## Repo

https://github.com/ThanuMahee12/AgentContext
