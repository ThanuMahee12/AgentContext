# CLAUDE.md

AgentContext is a React app. It has two halves behind one deployment:

- **Public knowledge base** — Home, Brainstorm, KT, Ideas, Tech Commands.
  Authored as markdown, served from Firestore, bundled as a fallback.
- **Private session archive** — `/admin`, sign-in required, reads Firestore.

**Live:** https://agentcontext-sessions.web.app
**Capture:** [AgentProbe](https://github.com/ThanuMahee12/AgentProbe) writes the sessions this reads.

## Stack

React 18 · TypeScript · Vite · React Router · Redux Toolkit (UI state) ·
**TanStack Query** (server state) · **Tailwind v4** · Framer Motion ·
react-hook-form · react-icons · react-calendar · Firebase.

Two rules keep the styling from forking in half:

- **Tokens are the single source of truth.** `styles/tailwind.css` maps every
  Tailwind colour onto the CSS variable that already defines it, so `bg-surface`
  and `background: var(--surface)` cannot drift apart.
- **Preflight is deliberately not imported.** This project has its own reset and
  1500 lines of hand-written CSS that depends on it; Tailwind's reset would
  quietly restyle every heading, list and form control already on the page.
  Utilities are additive — new UI can use them, nothing existing must be rewritten.

Server state goes through TanStack Query, not `useEffect`. The archive is
append-only, so the defaults cache hard (5 min stale, 30 min gc) and retry is
off: a denied read is the *expected* outcome for a signed-out visitor hitting a
private collection, and retrying a 403 only delays the page they can see. A
private query carries `enabled` so it never fires at all when signed out.

## Layout

```
src/
├── main.tsx               entry; mounts App and imports styles/index.css
├── App.tsx                routing only - which path renders which page
├── firebase.ts            app init, auth, db
├── types.ts               shared record shapes
├── pages/                 one file per route
│   ├── Layout.tsx         public shell: nav, search, outlet
│   ├── Home.tsx  Section.tsx  Published.tsx
│   ├── Catchup.tsx        the activity calendar
│   └── Admin.tsx  ContentAdmin.tsx     signed-in
├── components/            shared UI: Markdown, CodeBlock, Media, Login,
│                          SessionDetail, Tree, shared
├── lib/                   data access: DataSource, Firestore, published,
│                          queryClient (+ query keys), fixtures (git-ignored)
├── store/                 Redux Toolkit slices
├── styles/                index.css imports the rest in cascade order;
│                          tailwind.css maps utilities onto the tokens
└── content/               content.json (generated) + section config
```

There is no `web/` directory, no mkdocs, and no `src/data` - data access lives
in `src/lib`.


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
published the moment it is committed. It is generated from `content/*.md` and
now carries **only documents marked `visibility: "published"`** — a draft is
filed in Firestore for the admin panel and never reaches the bundle. Before
that filter existed it shipped internal hostnames and a service-account name to
every visitor, which is the failure this guards against.

The private session archive is the opposite: `firestore.rules` denies every
collection to anonymous readers except `public/`, and `src/lib/fixtures.json`
is git-ignored because it holds real commands and paths. `scripts/verify-bundle.mjs`
fails the build if fixture data reaches the artifact.

## Commands

There are no build steps to run by hand. `predev` and `prebuild` are npm
lifecycle hooks, so `npm run dev` and `npm run build` already regenerate the
content bundle and the dev fixtures first.

```bash
npm run dev        # local, uses fixtures if present
npm run build      # content + typecheck + bundle
npm run verify     # assert no local session data in dist/
npm run typecheck
npm run content    # rebuild src/content/content.json from content/*.md
./scripts/export-fixtures.sh [path-to-AgentProbe]   # regenerate dev fixtures

agentprobe publish-docs content   # push markdown to Firestore (live, no deploy)
```

Deploys run from `.github/workflows/deploy-dashboard.yml` on push to `main`.
