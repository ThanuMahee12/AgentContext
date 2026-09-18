---
title: "SEC Short Selling & Supply Chain Code Fix"
description: "Bloomberg dataset onboarding with shared MR; grabber maps + silver encrypted passthrough + production deployment strategy"
date: "2026-09-18"
status: "draft"
visibility: "draft"
tags: ["data-alchemy", "onboarding", "bloomberg", "grabber-maps"]
agent: "claude-code"
tools: ["Bash", "Read", "Write"]
session: "afebfa76-1834-4a0a-81ef-faa96ba32ba0"
---

## Discussion

### Scope

Two Bloomberg datasets onboarded together in **MR !1210** (`feature/bloomberg-ssl-splc-mapping` → `staging`):

1. **SEC Short Selling** — `sec_short_selling_cwiq_pipe/1.0` → `sec_short_selling/1.0`
   - Four Sec13f2 families: equity, funds, preferred, warrant (base + V2 versions)
   - 64 gold files/day
   - Includes new silver encrypted-passthrough feature for `.enc` files

2. **Supply Chain** — `supply_chain_cwiq_pipe/1.0` → `supply_chain/1.0`
   - Three SPLC streams (EID34494, EID43990, EID46835)
   - Expected delivery: 2 CSV + 1 XML daily
   - Greenfield target (legacy dir never populated)

**Code Changes:** Silver-layer encrypted passthrough feature. New opt-in config: one `.enc` input → encrypted copy + decrypted rename. Preferred streams are encrypted-only in legacy, now replicated verbatim.

**Status:** Validation complete, approved by Wingate (2026-07-22). Ready for merge → staging deploy → prod.

---

### Validation Evidence

#### SEC Short Selling (22-day crawled overlap: 2026-06-23 to 2026-07-14)

**Local pipeline run:**
- 1,408/1,408 gold files (64/day) delivered
- All DQ checks **green, zero allowances/ignores:**
  - Bijective: 1,408 matched
  - NLookback: ✅
  - FilenameExistence: 1,408 checked / 0 missing
  - BronzeGoldConservation: ok=1,408 / unmapped=0
  - FileTypeFidelity: 0 mismatches

**Staging 24h+ watch run (live since 2026-07-16, box01):**
- 64/64 gold daily, including weekends
- Real-key `.enc` decrypt: 546 OK / 0 failures
- Size comparison vs legacy CDP (2026-07-17): 64/64 files both sides, 100% content parity
  - 24 gz-level size diffs are content-identical after decompression (re-compression level only)
- Time comparison (2026-07-19): delivery→gold avg 9m25s ±36s
  - Legacy CDP upstream has ~5min head start; our pipeline beat CDP on 4 warrant renames

**Discovery DQ pre-deployment verification (2026-07-16, ny5-predpalch01):**
- ControlDB read-replica: reachable from prod boxes
- Feed tracked under exact name: `bloomberg/sec_short_selling_cwiq_pipe`
- 103,006 delivery rows over 90 days
- Check correctly gates on "no bronze records — service not yet run" (no false alerts)

**DQ Report:** https://drive.google.com/file/d/1q-UiBu5Sc4tg2RZQKjJJWM96PY7NTEFH/view
**Slack thread:** https://codewilling.slack.com/archives/C09274AFYTY/p1784141952172939

---

#### Supply Chain (20-day validation: 2026-06-22 to 2026-07-14)

**Local pipeline run:**
- 69/69 files delivered, exact tree match
- All outputs verified intact gzip
- DQ all green:
  - BronzeGoldConservation: ok=69 / missing=0 / unmapped=0
  - NLookback: ✅
  - ExpectedFileCount: ✅ (2 CSV + 1 XML daily via literal per-EID validation templates)
  - Bijective/FilenameExistence: correctly skip (empty comparison tree)

**Staging 24h+ watch run (live since 2026-07-16, box01):**
- 3/3 daily deliveries
- 9/9 gold byte-identical (via `cmp`) to pipe source across 2026-07-17 to 2026-07-19
- Delivery→gold latency:
  - CSV batch: 48s–2m30s
  - XML: 2m–4m30s
  - Every day consistent

**Delivery shape confirmed:**
- Two batches: 2 CSV ~20:02 ET previous evening, XML ~00:08 ET

**DQ Report:** https://drive.google.com/file/d/1S2QQ9Oml7hNAVydBlRh9Xs_GB5LAFDBo/view

---

### Code Changes Required

#### Silver Encrypted Passthrough (New Feature)

**Scope:** SEC Short Selling only (supply chain has no encrypted files)

**Mechanism:**
- New opt-in config: `silver_encrypted_passthrough`
- Routes `.enc` files to gold as BOTH encrypted + decrypted variants (per-family rules)

**Dual-output behavior by family:**

| Family | `.enc` Input | Output 1 | Output 2 |
|---|---|---|---|
| **equity** | `equitySec13f2...csv.gz.YYYYMMDD.enc` | `.enc` verbatim (encrypted) | Decrypted date-rename (plaintext) |
| **funds** | `fundsSec13f2...csv.gz.YYYYMMDD.enc` | `.enc` verbatim (encrypted) | Decrypted date-rename (plaintext) |
| **warrant** | `warrantSec13f2...csv.gz.YYYYMMDD.enc` | `.enc` verbatim (encrypted) | Decrypted date-rename (plaintext) |
| **preferred** | `preferredSec13f2...csv.gz.YYYYMMDD.enc` | `.enc` verbatim (encrypted) | ❌ None (encrypted-only, legacy) |

**Legacy parity:**
- Preferred: encrypted-only archives (legacy default)
- Equity/funds/warrant: both forms delivered (legacy convention for flexibility)

**Implementation notes:**
- Configuration-based: `silver_encrypted_passthrough` (opt-in per dataset)
- Also leverages: `silver_decrypt_inclusions` (which families to decrypt)
- No impact on non-encrypted files (gzip, plaintext csv passthrough)
- Silver stage inspects both configs and applies only when active
- Staging/prod have `BLOOMBERG_DES_KEY` for decrypt operations

#### Grabber Maps — Target Path Handling ✅

Both datasets carry new patterns in **shared MR !1210** (3 commits):

**SEC Short Selling: `bloomberg_sec_short_selling_cwiq_pipe_1_0.json`**
- Five patterns covering four Sec13f2 families (equity/funds/preferred/warrant, base+V2)
- **Target path:** `bloomberg/sec_short_selling/1.0/raw/{YYYY}/{YYYYMMDD}/`
- **Multi-output handling:**
  1. **Verbatim archive:** `(equity|funds|warrant)Sec13f2(V\d+)?(Differences)?.csv.gz.YYYYMMDD` (preserved)
  2. **Dated rename:** `(equity|funds|warrant)Sec13f2(V\d+)?(Differences)?_YYYYMMDD.csv.gz` (SDP convention)
  3. **Preferred stream:** Verbatim only (encrypted-only in legacy, no decryption)
  4. **Encrypted passthrough:** `.enc` files kept verbatim, equity/funds/warrant additionally decrypted
- **Validation templates:** Per-output (verbatim + rename) with proper date folder extraction
- Back-office universe (futures, options, corpPfd) intentionally unmapped

**Supply Chain: `bloomberg_supply_chain_cwiq_pipe_1_0.json`**
- Three patterns, one per SPLC stream (EID34494, EID43990, EID46835)
- **Target path:** `bloomberg/supply_chain/1.0/raw/{YYYY}/{YYYYMMDD}/`
- **Filename structure:** `EIDxxxxx_YYYYMMDD.{csv,xml}.gz` (date from filename, not delivery path)
- **Date folder routing:** Extracted from `EID\d+_(\d{4})(\d{2})(\d{2})` → `\1/\1\2\3/`
  - Handles history/ backfill files with old dates under new delivery paths
- **Expected file count:** 2 CSV (daily) + 1 XML (daily), validated per-pattern
- **EID-enumerated:** New streams require deliberate addition (not auto-discovered)
- **Greenfield target:** Legacy dir unpopulated since 2026-04; SDP convention adopted

---

### Deployment Plan

**Sequence:**

1. **Merge MR !1210** → staging (feature/bloomberg-ssl-splc-mapping)
   - 4 commits: three for maps/config, fourth for staging service files

2. **Deploy to staging:**
   - Systemd service: `data-alchemy-staging-bloomberg-1.0-sec_short_selling_cwiq_pipe`
   - Entry in: `deploy-data-alchemy-staging.yml` (watch mode, real feed)
   - RAW_FP_PREFIX=/sf/data
   - Bonus: staging has `CWIQ_PIPE_DB_URL`, so Discovery DQ runs live during watch

3. **Monitor 24h+ watch run** (already done locally, staging runs confirmed)
   - Time & size comparison vs legacy CDP

4. **Production deployment:**
   - New MR after staging validation (box TBD by Wingate)
   - Service per box, watch mode, live feed

---

### Open Items

**SEC Short Selling:**
- Legacy history pre-dating the pipe feed (~pre-2026-06-22) not reproducible from pipe
- Prod backfill scope question for Wingate: how far back to fill?

**Supply Chain:**
- Initial history backfill (~14 days) requires `--fp` (raw discovery's mtime lookback misses older files)

**Testing progression (from tickets):**
- ✅ Bloomberg Family: tested
- ✅ BEST: tested
- 🔄 BBOCAX: next (with new code changes)

---

### Decision Gate

**Current state (2026-07-22):**
- Both datasets **approved** by Wingate
- Both ready for **merge → staging → prod**
- Code changes **configuration-based** (not intrusive)
- Discovery DQ verified against live ControlDB

**Blockers:**
- None. Waiting on code review sign-off to land MR !1210.

**Success criteria post-merge:**
- Staging 24h watch: both datasets cycle daily, DQ green
- Prod deployment: services start, files land in gold, no regressions on existing datasets
