---
title: "Centralized agent memory: tiered storage, one DB, many agents"
description: "48h local / warm DB / cold S3, one schema for Claude + Gemini + Antigravity + OpenCode, and who owns the symlinked config"
date: "2026-09-18"
status: "open"
tags: ["agentprobe", "agentcontext", "storage", "firestore", "supabase", "architecture"]
---

## Discussion

The proposal: make agent history a **centralized, persistent store** rather than a
pile of per-machine JSONL. Keep only a short hot window locally, push everything
else to a shared database, make it work for every agent — Claude, Gemini,
Antigravity, OpenCode — not just Claude Code, and manage the global instruction
files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `MEMORY.md`) from one repo via
symlinks.

The direction is right and most of the pieces already exist. What follows is what
the machine actually looks like today, where the proposal collides with reality,
and the three decisions that have to be made before any of it gets built.

---

## What is already built

Not a greenfield. AgentProbe already does more than half of this.

| Piece | State |
|---|---|
| Normalized `Session` schema, provider-agnostic | ✅ `schema.py`, has a `provider` field already |
| Probe interface for multiple agents | ✅ `probes/base.py`, only `claude.py` implemented |
| Firestore writer, batched, retry + backoff | ✅ `store.py` |
| Checksum state so re-push is idempotent | ✅ `State` in `store.py` |
| URL/context extraction + keyword tokenizer | ✅ `context.py` |
| SessionEnd hook wired for 4 users | ✅ via `install.sh` |
| Read path (queries, decode) | ⚠️ written this session, not yet wired to a command |
| Periodic/hourly sync | ❌ |
| Local retention / eviction | ❌ |
| Non-Claude probes | ❌ |
| Symlinked global agent config | ❌ |

---

## Findings from the box, 2026-09-18

These are measurements, not estimates, and two of them are the reason the
proposal matters.

**The S3 mounts are down.** `findmnt /mnt/s3-thanudev12` exits non-zero and `df`
resolves the path to `/dev/xvda4`. Both mountpoints are bare local directories,
and there is already shadowed content under them (`output/`, `session/`, owned by
`thanumahee`) consuming root-disk space while being invisible to S3. Root is at
**84% used, 8.3 GB free**. Remount per the `rc.local` lines before anything in
this design writes to `/mnt`.

**73% of local transcript volume is already cold.**

| Slice | Files | Size |
|---|---|---|
| All transcripts | 209 | 244 MB |
| Older than 48h | 173 | 178 MB |
| `/home/thanumahee` alone | — | 234 MB |

Oldest transcript is 2026-08-19 — a month of history sitting on a disk at 84%.

**The config drift is total, not partial.** `/root/.claude/CLAUDE.md` vs
`/home/thanumahee/.claude/CLAUDE.md` is a **208-line diff**. They are not a shared
file that drifted; they are two different documents that happen to share a name.
Whatever either user taught their agent, the other one never learned.

---

## Decision 1: Firestore, Supabase, or both

This is the decision everything else hangs off, and there is now direct evidence
for it.

Building search over the existing archive this session ran straight into it:
**Firestore has no full-text search.** The workaround that had to be designed is a
*bounded recent-window scan* — pull the newest N documents of a kind and rank them
in memory — because the database cannot answer "which sessions mention this
phrase". The existing `keywords` array with `array-contains-any` only ever matches
whole tokens, which is why it was built in the first place.

That is not a gap in the search code. It is the database being wrong for the
workload.

| | Firestore | Supabase (Postgres) |
|---|---|---|
| Full-text search | none — keyword array + client-side scan | `tsvector` + GIN, ranked, built in |
| Semantic search later | no | `pgvector` |
| Joins / aggregates | no | yes |
| Blob-shaped data | 1 MiB doc cap → forced the `parts/` 700k-char chunking | `TEXT` or external |
| Free tier | 1 GiB storage, 50k reads/day | 500 MB DB, project pauses after 7d idle |
| Already deployed | **yes** — 225 sessions, dashboard, rules, indexes, CI | no |

The 1 MiB cap is worth dwelling on: the `parts/` subcollection exists purely to
work around it. Storing transcripts in Firestore means paying that tax forever,
and every deep search burns reads out of a 50k/day budget.

**Three ways forward:**

- **A — Stay on Firestore.** Search stays a windowed scan; it works, it is
  bounded, it will never do phrase ranking properly. Zero migration cost.
- **B — Supabase for search + archive, Firestore keeps serving the dashboard.**
  Real FTS immediately, dashboard untouched. Cost: two stores to keep consistent,
  which is the classic trap — dual-write becomes permanent unless it has an end date.
- **C — Migrate to Supabase as the single centralized DB.** This is what
  "centralize database" actually means. Dashboard queries get rewritten. Most
  work, best end state, and the only option that makes the multi-agent story
  clean.

**Recommendation: C, reached via B, with the cutover written down.** Add Supabase
as the search and archive store now, keep Firestore serving the dashboard until
the dashboard is ported, then cut Firestore loose. B is only acceptable as a path
with a stated end — as a permanent state it is the worst of the three.

Neither free tier holds this data long, which leads directly to the next point.

---

## Decision 2: tiering — the DB should not hold transcripts at all

244 MB of transcripts today, growing. Firestore free is 1 GiB; Supabase free is
500 MB. Putting raw transcripts in either fills the tier within months and makes
every query more expensive.

Transcripts are blobs. Blobs belong in object storage — and **there are already
two S3 buckets mounted on this box** with a documented dated-path convention.

```
hot    0-48h      ~/.claude/projects/*.jsonl        local disk, untouched
                  the agent itself reads these for --resume / --continue

warm   forever    Postgres (or Firestore)           session summaries, commands,
                  small, queryable, KB per session   files, context links, search text

cold   >48h       s3://thanudev12/archive/...       full transcripts, zstd
                  ~25 MB compressed, ~$0.006/mo      restorable on demand
```

zstd on JSONL runs 8-10x, so 244 MB of transcripts is roughly 25 MB in S3.
That is a rounding error in cost and removes the storage pressure from the
database entirely.

**The retention rule has a sharp edge.** Claude Code reads its own JSONL to power
`--resume` and `--continue`. Deleting a 3-day-old transcript means that session can
no longer be resumed locally. So eviction must be, in strict order:

1. upload to S3
2. **verify** the object exists and its checksum matches
3. only then remove the local file
4. keep a small local index of what was archived where, so `restore` does not
   need a network round trip just to find the file

Never delete on an unverified upload. And it has to handle `subagents/` — those
transcripts report the *parent's* sessionId, which has already caused 12 files to
collapse onto one document once.

---

## Decision 3: which repo owns the symlinked config

The instinct is right and the pattern is already proven on this box — `shellrc`
does exactly this: one root-owned tree in `/opt`, symlinked into every user's home,
installed by a script, verified by `scripts/verify-ssh.sh`.

**It must not be AgentContext, and it must not be AgentProbe. Both are public.**
`CLAUDE.md` on this machine documents jump-host IPs, production IPs, EC2 instance
IDs and service-account names. AgentContext is already known to be leaking the old
session notes through its git history. Committing agent instruction files to a
public repo publishes all of it, and deleting them later does not remove them from
history.

**Recommendation: `shellrc` owns agent config.** It is private, root-owned, already
symlinked everywhere, and the house rule already says shellrc is the starting point
for anything global on this box.

```
/opt/shellrc/agents/
  AGENTS.md        <- canonical; the emerging cross-tool standard
  CLAUDE.md        -> symlink to AGENTS.md
  GEMINI.md        -> symlink to AGENTS.md

~/.claude/CLAUDE.md -> ~/shellrc/agents/CLAUDE.md
~/.gemini/GEMINI.md -> ~/shellrc/agents/GEMINI.md
~/AGENTS.md         -> ~/shellrc/agents/AGENTS.md
```

The content is tool-agnostic instructions, so one file behind three names is
enough — no generator, no include mechanism, no drift.

### `MEMORY.md` is the exception — do not symlink it

`CLAUDE.md` is *authored* — one source, many readers, symlink is exactly right.
`MEMORY.md` and the memory directory behind it are *accumulated* — the agent
appends to them during sessions. Symlinking one file across 4 users and N agents
means concurrent writers on a single file and silently lost updates.

Memory entries are already structured records: each has frontmatter with `name`,
`description` and `type`. That is a database row wearing a filename. The right
move is to **sync memory through the central DB rather than symlink it** — push on
write, pull on session start, merge by `name`. That reuses the pipeline that
already exists, and it makes memory follow the user across machines *and* across
agents, which a symlink on one box never could.

---

## Decision 4 (not really a decision): hourly sync and multi-agent are one job

These read as two asks but they are the same piece of work.

Today capture is `SessionEnd`-only, which means a session that never cleanly ends —
long-running, machine killed, agent crashed — is **never captured at all**. A
periodic sync fixes that, and the checksum state in `State` already makes repeated
pushes idempotent, so it is close to free.

And the reason the other agents have no probe is not the schema — `provider` is
already a field and `probes/base.py` is already the interface. It is that **only
Claude Code exposes lifecycle hooks**. Gemini, Antigravity, OpenCode and Cursor all
need poll-and-diff, which needs something running on a timer.

So the timer is not a nice-to-have alongside multi-agent support. It *is* the
multi-agent enabler. Build it once:

- `systemd` timer (systemd 252 is present), not cron — better logging, no
  `rc.local` fragility, and `rc.local` on this box has already silently lost the
  S3 mounts
- hourly, `Persistent=true` so a rebooted box catches up
- one `agentprobe sync` that polls every registered probe, pushes what changed,
  then runs the retention pass

Probe storage paths for the other agents are listed in the README as
**best-effort and unverified** — they need checking against a real install before
anything is written against them.

---

## Suggested order

Storage decision first, because everything else writes into it.

1. **Remount S3.** It is down now and root is at 84%. Nothing else should write
   to `/mnt` until this is fixed.
2. **Decide 1 (Firestore / Supabase / both).** Blocks the schema work.
3. **`agentprobe sync` on a systemd timer.** Standalone value — it closes the
   never-captured-session hole regardless of which DB wins.
4. **Archive + verified eviction to S3.** Reclaims 178 MB immediately.
5. **`shellrc/agents/` + symlink install.** Independent of 1-4, can go in parallel.
6. **Memory sync through the DB.** Needs 2 decided.
7. **Second probe** (whichever agent is actually in daily use) to prove the
   provider abstraction holds.

---

## Open questions

- Which of A / B / C on the storage decision? If Supabase, does the dashboard get
  ported in the same push or does Firestore keep serving it for a while?
- Is 48h the right hot window, or should it follow *session activity* rather than
  file mtime? A session resumed after a week would be evicted mid-life by an
  mtime rule.
- Which agents are actually in daily use besides Claude Code? The probe order
  should follow real usage, not the README's list.
- Does memory sync need per-user scoping, or is one shared memory pool across
  root / thanumahee / bench / ec2-user the intent?
- AgentContext is still a public repo with internal data in its git history. That
  is unresolved and it constrains anything that gets committed near it.
