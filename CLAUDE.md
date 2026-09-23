# CLAUDE.md

Agentix is the **reading half** of a pair. [AgentProbe](https://github.com/ThanuMahee12/AgentProbe)
captures agent sessions and publishes documents; this app displays them. It
authors nothing and stores nothing of its own — every byte it renders comes from
Firestore at runtime.

**Live:** https://agentcontext-sessions.web.app

### Three names, and only one of them is the brand

| | | |
|---|---|---|
| **Agentix** | the product | what every visible string says |
| `AgentContext` | the GitHub repo | `github.com/ThanuMahee12/AgentContext` |
| `agentcontext-sessions` | the Firebase project | `projectId`, `authDomain`, `storageBucket`, `.firebaserc`, the deploy workflow, the live URL |

Renaming the brand is cheap and done. The other two are not the same job: a
**Firebase project id cannot be renamed**, so moving off `agentcontext-sessions`
means standing up a new project and migrating Firestore data and auth — a
migration, not a rename. Until then the URL says the old name, and a custom
domain is the cheap way to close that gap. The repo can be renamed on GitHub
whenever you like; GitHub redirects the old URL, and the one link in
`Layout.tsx` would need updating with it.

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
**TanStack Table v9** (the session archive) · Redux Toolkit (UI state only) ·
**Tailwind v4** · three.js (lazy, Catchup only) · react-helmet-async ·
Framer Motion · react-calendar · react-hook-form · react-icons · Firebase.

**Not here, and each for a reason** — `redux-thunk` needs no install: Redux
Toolkit already depends on it and `configureStore` enables it, so a thunk
dispatches today. `axios` has no call site: there is no `fetch` or
`XMLHttpRequest` anywhere in `src/`, because every byte arrives through the
Firebase SDK, which axios cannot speak to.

## Layout

```
src/
├── main.tsx            entry: Redux + QueryClient providers, imports styles
├── App.tsx             routing only
├── firebase.ts         app init, auth, db
├── types.ts            Session, Command, ContextItem, Day, …
├── pages/              one file per route
│   ├── Layout.tsx      public shell: nav, search, outlet
│   ├── AdminShell.tsx  signed-in shell: nav, sign-out, aside + panel slots
│   ├── Home.tsx  Section.tsx  Published.tsx
│   ├── Catchup.tsx     activity calendar; public counts, private detail
│   └── Admin.tsx  ContentAdmin.tsx      signed-in
├── components/         Markdown, CodeBlock, Media, Login, Field, Decorative,
│                       SessionDetail,
│                       SessionTable (TanStack Table v9), CatchupScene (three.js,
│                       lazy), Title, State (Loading/Nothing/Failure/Chip),
│                       Facet, LinkRow, Tree, shared
├── lib/                queryClient (+ query keys), queries (every server read
│                       as a hook), format, sessions, useContent, sections,
│                       source (DataSource), firestore, published,
│                       fixtures.json (git-ignored)
├── store/              uiSlice only — search text, tag filter, nav state
└── styles/             index.css imports the rest in cascade order;
                        tailwind-plus.css is scoped preflight, in @layer base
                        so utilities outrank it
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

### Where shared code goes

Four modules exist so the same thing is not computed two ways. Reach for them
before writing a local helper:

| | |
|---|---|
| `lib/queries.ts` | **every** server read, as a hook. Admin and Catchup share `useArchive`, so the second screen costs no request. |
| `lib/format.ts` | dates, times, word counts, truncation. |
| `lib/sessions.ts` | values derived from a session: `failedCount`, `commandState`, `subagentCounts`, `mergeContext`, `countBy`. |
| `components/State.tsx` | `Loading`, `Nothing`, `Failure`, `Chip` — the states every data-backed screen renders. |

Two traps these were extracted from, both of which had already bitten:

- **`toDayKey`, never `toISOString().slice(0,10)`.** The latter converts to UTC
  first, so an evening in New York files under tomorrow and lands in the wrong
  calendar square.
- **`failedCount(session)`, never `failed_count ?? 0`.** Catchup used the latter
  and reported zero failures for any record predating the field, while the table
  and detail panel counted the commands and reported the real number. One
  session, two answers.

`shared.tsx` keeps `Empty`, which is a different thing from `State.tsx`'s
`Nothing`: `Empty` is about a *filter* matching nothing and offers to clear the
search.

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

**Tailwind first. New UI is utilities; a stylesheet is the exception.** The
hand-written CSS is being migrated out, not extended. `Login.tsx`,
`AdminShell.tsx` and `Facet.tsx` are fully on utilities and `styles/auth.css`
is deleted; what remains under `styles/` is the public site, the table and the
tokens.

**A migrated subtree must carry `.tw-scope`.** Preflight is not global here, so
outside it `border` draws nothing and an `<input>` renders in the browser's own
font. That is the whole reason the class exists.

Keep as CSS only what a utility genuinely cannot say: `.wordmark`/`.glyph` (a
four-layer gradient, shared with the public shell) and the token definitions.

- **Tokens are the single source of truth.** `styles/tailwind.css` maps every
  Tailwind colour onto the variable that already defines it, so `bg-surface`
  compiles to `background-color: var(--surface)`. Utilities and stylesheets
  cannot drift apart.
- **Preflight is deliberately not imported.** This project has its own reset and
  ~1500 lines of CSS that depend on it; Tailwind's reset would restyle every
  heading, list and form control already on the page. Utilities are additive.
- **One accent, everywhere.** `--hue` is global. There were six section hues —
  violet, aqua, yellow, blue, magenta, green — mapped by
  `[data-section="…"]`, and they are retired: the app wears the same colour on
  every page, public and signed-in. `data-section` still sits on those
  elements; it just no longer decides a colour. Git holds the retired values
  and their measured ratios.
- `--hue` #6f93d6 clears 4.5:1 on every ground it lands on — 6.23:1 on
  `--ground`, 5.71:1 on `--surface`, 5.23:1 on `--raised`, 5.63:1 on `--navy`.
  Check any replacement against all four, not just the ground.
- `--navy` is a **fill**, never a foreground: true navy is 1.91:1 here.
- Colours a three.js scene needs come from `lib/theme.ts`, never from the
  component. Both scenes used to carry their own fallback table and disagreed
  about the same token — and one of them fell back to the retired magenta.
- `index.css` import order is the original order of the file these were split
  out of. Reordering silently changes the cascade.
- Markdown renders through Tailwind's `prose` plus `prose-doc`, which points the
  prose variables at the tokens.

### Tailwind Plus: `.tw-scope`, never global preflight

Plus components are pasted markup that assumes preflight has run. Preflight is
not imported globally here and must not be — this project's own reset and
~1500 lines of CSS stand on it. `styles/tailwind-plus.css` carries the subset
Plus actually depends on, scoped to `.tw-scope`:

```jsx
<div className="tw-scope">{/* Plus markup, unmodified */}</div>
```

Nothing outside that subtree is touched. Plus is a **paid licence** and this
repository is **public** — do not commit Plus component source here.

## The session table is TanStack Table **v9**

v9 is not v8, and every example in circulation is v8. Features are registered
explicitly through `tableFeatures()`, the row models are slots on that same
object, and `getCoreRowModel()` no longer exists:

```ts
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },       // registered by name, so unused ones tree-shake
})
useTable({ features, columns, data })      // no getCoreRowModel
```

Register a feature and its row model or **sorting silently does nothing** —
`getIsSorted()` still reports a direction while `getRowModel()` hands back the
rows in input order. Column values are precomputed in `toRows()` rather than
derived in an accessor, so a column sorts by what it displays.

Because preflight is absent, `SessionTable` sets `border-collapse` itself; a
`<table>` here still carries the browser default.

## three.js is lazy, and must stay lazy

`CatchupScene` is reached only through `React.lazy`, which gives it its own
~547 kB chunk. A static `import * as THREE` anywhere would fold that into the
entry chunk and make every reader of a text page download a renderer. Check it
after touching Catchup:

```bash
npm run build && grep -c "WebGLRenderer" dist/assets/index-*.js   # must be 0
```

The scene renders **on demand** — no permanent `requestAnimationFrame` loop —
and takes its colours from `lib/theme.ts`, never from the component. It draws
only the public `daily` totals; nothing from the private archive is in scope.

## Two shells, and every signed-in screen uses one

`Layout.tsx` wraps the public routes; `AdminShell.tsx` wraps `/admin` and
`/content`. Before it existed, Admin built its own copy of the sidebar, and
three things were wrong at once: **`/content` was orphaned** — nothing linked to
it, so the screen that publishes a draft to the internet was reachable only by
typing the URL — the sidebar existed twice and the copies had drifted, and
sign-out lived on one screen.

There is no sidebar. A 250px column was taking a fifth of every screen to hold
six links, on a page whose job is an eleven-column table; the nav is a row now,
and the filters are a `toolbar` row under it, owned by the page because search
and facets mean nothing on `/content`.

It composes by props, not as a route layout:

```tsx
<AdminShell user={user} toolbar={<Facets/>} panel={<SessionDetail/>}>
```

`panel` is a sibling of `<main>`, never a child: `.detail` is
`flex: 0 0 min(52%, 720px)` against the row they share, so nesting it in the
main column collapses it into the scrolling body instead of splitting the row.

A new signed-in screen goes in the `PRIVATE` array in that file and is reachable
immediately. Do not add another `<aside className="sidenav">`.

## Sign-in: three modes, still no self-registration

`components/Login.tsx` is sign in, password reset and request access on one
panel. It is the only screen a stranger can reach, so two things are load-bearing:

- **Wrong email and wrong password give the same message.** Distinguishing them
  tells an attacker which addresses have accounts.
- **"Request access" creates nothing and sends nothing.** Access is an
  allow-list of addresses in `firestore.rules`, and sign-up is switched off in
  the Firebase console — `createUserWithEmailAndPassword` would fail with
  `auth/admin-restricted-operation`, and an account that did get created could
  sign in and read nothing. The panel says so and copies a line to the
  clipboard instead.

If sign-up is ever switched back on, `firestore.rules` says what must happen
first: put `email_verified` back into `canView()`. Read the comment at the top
of that file before touching the console setting.

`components/AgentField.tsx` is the animated backdrop: roots that periodically
emit children on a tether, which is the one relationship the data model is
built around — a session spawning subagents. It is **decoration and must stay
decoration**: lazy-loaded, `aria-hidden`, `pointer-events: none`, wrapped in an
error boundary so a WebGL failure costs a backdrop and never the ability to
sign in, one static frame under `prefers-reduced-motion`, and stopped entirely
while the tab is hidden.

Two dynamic imports now use three.js, so Rollup hoists it into a shared chunk —
`CatchupScene` fell from 547 kB to 24 kB. The entry chunk still carries none of
it, and the check in the three.js section covers both.

The page is entirely utilities — it has no stylesheet. It uses sentence-case
field labels rather than the tracked-out uppercase the public site uses for its
micro-labels.

`react-hook-form` earns its place here and nowhere else yet: validation, error
messages and `isSubmitting` on three forms that share two fields.

`components/Field.tsx` owns the label/input/message triple and wires the
`aria-describedby` association itself, because a call site can forget it — and
one did: the third copy set `aria-invalid` and rendered no message.
`components/Decorative.tsx` is the error boundary the backdrop sits in.
`lib/authErrors.ts` maps Firebase codes to sentences.

**Every action goes through `handleSubmit`, including the ones that are not
form submissions.** "Copy request" read the field directly and copied whatever
was in it, so an empty field produced *"Please add  to the Agentix viewer
list."* — a broken sentence, copied happily. Routing it through `handleSubmit`
is what validates the address and what gives that field its error message at
all.

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
