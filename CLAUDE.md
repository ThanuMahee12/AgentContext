# CLAUDE.md

AgentContext is the **reading half** of a pair. [AgentProbe](https://github.com/ThanuMahee12/AgentProbe)
captures agent sessions and publishes documents; this app displays them. It
authors nothing and stores nothing of its own — every byte it renders comes from
Firestore at runtime.

**Live:** https://agentcontext-sessions.web.app

Two halves behind one deployment, and the split is enforced by the database
rather than by which component the router mounts:

| | |
|---|---|
| **Public** | Home, Brainstorm, KT, Ideas, Tech Commands, Daily Catchup |
| **Private** | `/admin` (session archive), `/content` (promote a draft), and the per-day conversations inside Catchup |

`firestore.rules` denies every private collection to anonymous readers, so a
signed-out visitor who reads this source learns nothing they can act on.

## Stack

React 18 · TypeScript · Vite · React Router · **TanStack Query** (server state) ·
Redux Toolkit (UI state only) · **Tailwind v4** · Framer Motion · react-calendar ·
react-hook-form · react-icons · Firebase.

## Layout

```
src/
├── main.tsx            entry: Redux + QueryClient providers, imports styles
├── App.tsx             routing only
├── firebase.ts         app init, auth, db
├── types.ts            Session, Command, ContextItem, Day, …
├── pages/              one file per route
│   ├── Layout.tsx      public shell: nav, search, outlet
│   ├── Home.tsx  Section.tsx  Published.tsx
│   ├── Catchup.tsx     activity calendar; public counts, private detail
│   └── Admin.tsx  ContentAdmin.tsx      signed-in
├── components/         Markdown, CodeBlock, Media, Login, SessionDetail,
│                       Tree, shared
├── lib/                queryClient (+ query keys), useContent, sections,
│                       source (DataSource), firestore, published,
│                       fixtures.json (git-ignored)
├── store/              uiSlice only — search text, tag filter, nav state
└── styles/             index.css imports the rest in cascade order
```

No `web/`, no mkdocs, no `src/data`, and **no bundled content**.

## Data: Firestore at runtime, nothing bundled

The app used to ship a snapshot of every document inside its own JavaScript and
hydrate Firestore over the top. That is gone. It was a second source of truth
that went stale the moment anything was published, and it handed every document
to every visitor — which is how internal hostnames reached the bundle once.

**Server state goes through TanStack Query. Never `useEffect` + `useState`.**

- Keys live in `lib/queryClient.ts`. Use them; do not inline a key string.
- Defaults cache hard — 5 min stale, 30 min gc — because the archive is
  append-only and a session never changes once written.
- **Retry is off.** A denied read is the *expected* outcome for a signed-out
  visitor hitting a private collection, not a transient fault. Retrying a 403
  three times only delays the page they can actually see.
- A private query carries `enabled` so it never fires at all when signed out,
  rather than firing and failing in everyone's console.

Redux holds `uiSlice` and nothing else. If you find yourself putting server data
in a slice, that is what the query client is for.

### Collections

| Collection | Read by | Public? |
|---|---|---|
| `docs` | `lib/useContent.ts` | only where `visibility == "published"` |
| `daily` | `pages/Catchup.tsx` | **yes** — counts and a date, nothing else |
| `sessions` (collection group) + `commands` | `lib/source.ts` | no |
| `context` | `lib/source.ts` | no |
| `public/{slug}` | `lib/published.ts` | yes |

## Visibility: `visibility`, never `status`

```
draft      admin panel only. The default when the field is absent.
published  reaches the public page.
```

`status` is a **workflow** state the author picks — `open`, `implementing`,
`done`. It once doubled as the visibility switch, and that was a bug: any value
the author chose that was not the magic word silently hid the page, and every
future workflow rename became a security change.

An agent writes a draft and stops. Promoting is a human decision, made at
`/content`.

**A public list query must carry `where('visibility','==','published')`.** The
rule is a per-document condition, so an unconstrained query is *rejected*, not
filtered. That is deliberate: a query that forgets the filter fails loudly
instead of leaking.

## Styling

Hand-written CSS in `styles/`, with Tailwind available for new work.

- **Tokens are the single source of truth.** `styles/tailwind.css` maps every
  Tailwind colour onto the variable that already defines it, so `bg-surface`
  compiles to `background-color: var(--surface)`. Utilities and stylesheets
  cannot drift apart.
- **Preflight is deliberately not imported.** This project has its own reset and
  ~1500 lines of CSS that depend on it; Tailwind's reset would restyle every
  heading, list and form control already on the page. Utilities are additive.
- Every section registers a hue: `[data-section="…"] { --hue: … }`. A new
  section needs one, **measured** — the palette promises ≥4.5:1 against the
  ground, and each colour is committed with its ratio in a comment.
- `index.css` import order is the original order of the file these were split
  out of. Reordering silently changes the cascade.
- Markdown renders through Tailwind's `prose` plus `prose-doc`, which points the
  prose variables at the tokens.

## Markdown

`components/Markdown.tsx` returns React elements — **no `dangerouslySetInnerHTML`
anywhere**. Document bodies are markdown stored in the `body` field; the app
reads no `.md` files.

## Commands

Nothing is run by hand. `predev` and `prebuild` are npm lifecycle hooks.

```bash
npm run dev        # fixtures if present
npm run build      # typecheck + bundle
npm run verify     # assert no local session data reached dist/
npm run typecheck
./scripts/export-fixtures.sh [path-to-AgentProbe]
```

`scripts/verify-bundle.mjs` is a security control, not a lint step: Hosting is
public, and it fails the build if strings from `lib/fixtures.json` — real
commands and paths — reach the artifact. Do not remove it.

Deploy by hand: `firebase deploy --only hosting` (also `firestore:rules`,
`firestore:indexes` when those change — no workflow touches those).

## CI/CD: releases drive deploys

Three workflows, one chain. A push to `main` releases and deploys itself.

```
pull_request ──► ci.yml            install · typecheck · build · verify
push to main ──► release.yml
                   ├─ ci.yml       the gate: a broken build never gets tagged
                   ├─ bump patch   npm version → commit "Release vX.Y.Z" → tag → GitHub Release
                   └─ deploy-dashboard.yml (ref = the new tag)
nightly 18:30 UTC ► deploy-dashboard.yml   backstop only
```

**Versions come from `package.json`, not from commit messages.** This repo
writes prose commit subjects, so a Conventional-Commits parser would read every
one as "no release". Patch is automatic; a minor or major bump is deliberate —
run **Release** from the Actions tab and choose one.

- `deploy-dashboard.yml` no longer triggers on push. `release.yml` calls it, so
  every deploy corresponds to a tag. Two workflows watching `push: main` would
  have raced for one Hosting site; they now share the `firebase-hosting`
  concurrency group instead.
- The bump commit is pushed with `GITHUB_TOKEN`, which GitHub refuses to let
  trigger further workflows. `release.yml` *also* skips any head commit starting
  `Release v`, because that platform guarantee disappears the day someone
  switches to a PAT.
- `paths-ignore` keeps markdown, `content/` and `pages/` from minting versions —
  none of it reaches the bundle.
- **Requires** repo secret `FIREBASE_SERVICE_ACCOUNT`, Actions permitted to
  write contents, and `main` not protected against the bot's push.

## Things that have actually gone wrong here

**Verify against the deployed bundle, not the local build.** Fetch the JS from
the live URL and grep it. A clean `dist/` has twice been claimed as proof while
the site served something else.

**Clearing content takes three steps.** Delete → publish (reconciles Firestore)
→ **rebuild** → deploy. Skipping the rebuild leaves the old content rendering
while the database is empty, and steps 1 and 3 both report success.

**`publish-docs` reconciles.** It deletes documents whose markdown is missing
from the directory you point it at. More than one source publishes into `docs`,
so pointing it at a partial tree destroys the rest.

**Documents are published under a UTC-dated path** — `content/ideas/2026/09/18/slug.md`
— so the section page lists `2026` and `09` as folders instead of documents.
The date belongs in frontmatter, not in the path. **This is unfixed.**

**This repository is public.** Anything committed is published, including
commit messages. Two internal documents reached its history this way. Check
before adding anything that names hosts, datasets, tickets or people.
