# CLAUDE.md

AgentContext is a React app. It has two halves behind one deployment:

- **Public knowledge base** — Home, Brainstorms, KT, Discussions, Notes.
  Content ships in the bundle; there is no CMS and no runtime fetch.
- **Private session archive** — `/admin`, sign-in required, reads Firestore.

**Live:** https://agentcontext-sessions.web.app
**Capture:** [AgentProbe](https://github.com/ThanuMahee12/AgentProbe) writes the sessions this reads.

## Layout

```
src/
├── content/content.json   all public content, flat, imported at build time
├── content/index.ts       typed accessors + the section list
├── pages/public/          Layout, Home, Brainstorms, Discussions, Docs
├── pages/Admin.tsx        the session dashboard (authenticated)
├── pages/Published.tsx    a published page at /s/:slug
├── store/                 Redux Toolkit: search, tag filter, theme
├── data/                  DataSource interface; Firestore + local fixtures
└── components/            Markdown renderer, SessionDetail, Login
```

There is no `web/` directory and no mkdocs. The site was migrated off mkdocs on
2026-09-16: `discussions/*.json`, `brainstorms/*.json` and `docs/**/*.md` were
flattened into `src/content/content.json`, which is now the source of truth.

## Adding content

Edit `src/content/content.json` directly. Four arrays:

| Key | Shape |
|---|---|
| `discussions` | id, title, date, summary, url, tags, comments[], optional body |
| `brainstorms` | id, title, date, status, summary, gist, notion, tags, comments[] |
| `notes` | id, title, body (markdown), headings[], source, bytes |
| `kt` | same as notes, plus `project` |

Markdown in `body` renders through `components/Markdown.tsx`, which returns
React elements rather than HTML — no `dangerouslySetInnerHTML` anywhere.

## Anything public is genuinely public

This repository is public and Firebase Hosting serves the bundle to anyone.
`src/content/content.json` is shipped to every visitor, so treat it as
published the moment it is committed. It currently contains internal hostnames
(`ny5-predpalch01/02`), a service-account name (`svc_dat_alchemy`) and the
internal GitLab host — carried over from the mkdocs site, which already
published them.

The private session archive is the opposite: `firestore.rules` denies every
collection to anonymous readers except `public/`, and `src/data/fixtures.json`
is git-ignored because it holds real commands and paths. `scripts/verify-bundle.mjs`
fails the build if fixture data reaches the artifact.

## Commands

```bash
npm run dev        # local, uses fixtures if present
npm run build      # typecheck + bundle
npm run verify     # assert no local session data in dist/
npm run typecheck
./scripts/export-fixtures.sh [path-to-AgentProbe]   # regenerate dev fixtures
```

Deploys run from `.github/workflows/deploy-dashboard.yml` on push to `main`.
