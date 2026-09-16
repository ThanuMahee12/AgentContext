# CLAUDE.md

AgentContext is a React app. It has two halves behind one deployment:

- **Public knowledge base** — Home, Brainstorm, KT, Ideas, Tech Commands.
  Authored as markdown, served from Firestore, bundled as a fallback.
- **Private session archive** — `/admin`, sign-in required, reads Firestore.

**Live:** https://agentcontext-sessions.web.app
**Capture:** [AgentProbe](https://github.com/ThanuMahee12/AgentProbe) writes the sessions this reads.

## Layout

```
src/
├── content/content.json   generated from content/*.md — the bundled fallback
├── content/index.ts       types + the section list
├── pages/public/          Layout, Home, Brainstorms, Discussions, Docs
├── store/contentSlice.ts  bundle as initial state, Firestore hydrates over it
├── pages/Admin.tsx        the session dashboard (authenticated)
├── pages/Published.tsx    a published page at /s/:slug
├── store/                 Redux Toolkit: search, tag filter, theme
├── data/                  DataSource interface; Firestore + local fixtures
└── components/            Markdown renderer, SessionDetail, Login
```

There is no `web/` directory and no mkdocs.

## Content: markdown in, Firestore out

```
content/brainstorm/*.md        →  npm run content  →  src/content/content.json  (bundled fallback)
content/ideas/*.md             →  agentprobe publish-docs content  →  Firestore docs/  (served)
content/kt/*.md
content/tech-commands/*.md
```

**Markdown is the source of truth.** Each file carries JSON frontmatter — values
are JSON so a colon or quote in a title cannot break the parse:

```markdown
---
title: "PathSeeker: Path Analysis"
date: "2026-01-16"
tags: ["cli", "tool"]
---

Body in markdown.
```

Fields by folder: `brainstorm` takes status/gist/notion, `ideas` takes url,
`kt` takes project, `tech-commands` takes none beyond title.

**Publishing does not need a deploy.** The site renders the bundled copy
immediately, then hydrates from Firestore over the top. So:

- edit markdown → `agentprobe publish-docs content` → the live site updates
- also run `npm run content` and commit, so the fallback stays current

`publish-docs` deletes Firestore documents whose markdown file is gone, or the
site would keep serving something the repository no longer has.

Bundle-first is deliberate: hydrating first would mean a blank page while a
request is in flight, and a permanently blank one during a Firestore outage,
for content already sitting in the JavaScript the browser downloaded. An empty
`docs/` collection is likewise ignored rather than treated as an update.

Markdown renders through `components/Markdown.tsx`, which returns React
elements rather than HTML — no `dangerouslySetInnerHTML` anywhere.

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
npm run content    # rebuild src/content/content.json from content/*.md
./scripts/export-fixtures.sh [path-to-AgentProbe]   # regenerate dev fixtures

agentprobe publish-docs content   # push markdown to Firestore (live, no deploy)
```

Deploys run from `.github/workflows/deploy-dashboard.yml` on push to `main`.
