# CLAUDE.md

Global context and session notes for Claude Code.

## Site

- **Repo:** https://github.com/ThanuMahee12/AgentContext
- **Site:** https://thanumahee12.github.io/AgentContext

## Structure

```
AgentContext/
├── discussions/             # Collaborative topics (JSON)
│   ├── gics.json
│   └── dq.json
├── brainstorms/             # Personal ideas (JSON)
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
│   ├── discussions/         # MkDocs page (renders from JSON)
│   ├── brainstorms/         # MkDocs page (renders from JSON)
│   ├── notes/               # Persistent markdown
│   └── runbooks/            # Operational guides
├── pyproject.toml
├── mkdocs.yml
└── CLAUDE.md
```

## Knowledge System (JSON)

**Two types:**

| Type | Folder | Purpose | Links |
|------|--------|---------|-------|
| **Discussions** | `discussions/` | Collaborative topics | GitHub Discussion URL |
| **Brainstorms** | `brainstorms/` | Personal ideas | GitHub Gist URL |

**JSON Schema:**
```json
{
  "id": "topic-id",
  "date": "YYYY-MM-DD",
  "title": "Topic Title",
  "url": "https://github.com/.../discussions/N",
  "gist": "https://gist.github.com/.../...",
  "summary": "Full detailed summary...",
  "related": ["other-id"],
  "tags": ["tag1", "tag2"]
}
```

**Key fields:**
- `date` - For sorting (newest first)
- `summary` - Full content
- `url` - GitHub Discussion link (discussions)
- `gist` - GitHub Gist link (brainstorms, Mermaid)
- `related` - Link to related topics

**Claude reads:**
1. `discussions/*.json` → Collaborative topics
2. `brainstorms/*.json` → Personal ideas
3. Follow `related` links if needed

**Current:**
- `discussions/gics.json` - S&P GICS pipeline
- `discussions/dq.json` - Data quality framework
- `brainstorms/pathseeker.json` - Path analysis tool
- `brainstorms/investigation-db.json` - Reverse lookup DB

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

## Gists (Brainstorms & Ideas)

**Use Gists for:** Ideas, brainstorms, diagrams, code snippets

**Benefits:**
- Mermaid diagrams render automatically
- Shareable URL
- Versioned (git history)
- Claude can create/read via `gh gist`

**Commands:**
```bash
# Create from file
gh gist create --public -d "description" file.md

# List gists
gh gist list

# View gist content
gh gist view <id>

# Edit gist
gh gist edit <id>
```

**Current Gists:**
- [PathSeeker](https://gist.github.com/ThanuMahee12/75938d6097425ee9c3d6690be29e6558) - Path analysis brainstorm

**Workflow:** Create gist → Share URL → Link in discussions JSON if needed

## Notion (Investigation DB)

**Use Notion for:** Databases, relational data, Investigation DB

**Credentials:** `~/.notion/credentials`

**Current Databases:**
- `alchemy_server` - Server infrastructure (ny5-predpalch02/04/06)
- `alchemy_service` - Data-alchemy services (32 services)

**API Usage:**
```bash
# Read credentials
cat ~/.notion/credentials

# Query database
curl -X POST "https://api.notion.com/v1/databases/{db_id}/query" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Notion-Version: 2022-06-28"

# Update page
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Notion-Version: 2022-06-28" \
  -d '{"properties": {...}}'
```

**Workflow:** Read ~/.notion/credentials → Use API via curl

## Quick Reference

| Action | Command |
|--------|---------|
| Sync repo | `cd ~/AgentContext && git pull` |
| Save changes | `git add -A && git commit -m "docs: update" && git push` |
| Dev server | `uv run mkdocs serve` |
| List topics | `ls discussions/*.json` |
| View sessions | `ls docs/sessions/claude/` |
| Create gist | `gh gist create --public -d "desc" file.md` |
| List gists | `gh gist list` |
| Notion creds | `cat ~/.notion/credentials` |
