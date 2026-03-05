# SQLite Parallelism Bottleneck: Per-Worker SQLite + DuckDB Read Layer

**Date:** 2026-03-05
**Status:** Initial Proposal - Needs Team Discussion
**Author:** Thanu

---

## Problem Statement

Current SQLite architecture has write lock contention when running parallel workers (`-p N`):
- Single SQLite per date → multiple workers compete for write lock
- `busy_timeout=30000` expires under heavy load
- Files marked for reprocessing → wasted cycles

---

## Proposed Solution

### Architecture

```
silver/YYYY/MM/DD/
├── {vendor}--{ds}.sqlite          ← canonical (persists across cycles)
└── workers_db/
    ├── w001.sqlite
    ├── w002.sqlite
    └── w003.sqlite
```

### Core Design Decisions

| Component | Decision |
|-----------|----------|
| **Write path** | Each worker writes to `workers_db/w{id}.sqlite` |
| **Read path** | DuckDB attaches all worker SQLites for unified queries |
| **Worker ID** | Thread-local in `parallel.py` |
| **Canonical DB** | Persists across cycles, synced from worker DBs |
| **Query engine** | DuckDB replaces SQLAlchemy for all read queries |

---

## Implementation Details

### 1. Directory Structure
```
silver/2026/03/05/
├── bloomberg--bbocax_cwiq_pipe.sqlite      ← canonical
└── workers_db/
    ├── w001.sqlite                          ← worker 1 writes here
    ├── w002.sqlite                          ← worker 2 writes here
    └── w003.sqlite                          ← worker 3 writes here
```

### 2. Write Path (Zero Contention)
- Each worker gets thread-local ID
- Writes exclusively to `workers_db/w{id}.sqlite`
- No locking between workers
- Standard SQLite operations unchanged

### 3. Read Path (DuckDB Unified View)
```python
import duckdb

def get_unified_reader(silver_dir: Path, db_name: str) -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(":memory:")

    # Attach all worker databases
    worker_dbs = list((silver_dir / "workers_db").glob("w*.sqlite"))
    for i, db_path in enumerate(worker_dbs):
        conn.execute(f"ATTACH '{db_path}' AS w{i} (TYPE SQLITE, READ_ONLY)")

    # Attach canonical if exists
    canonical = silver_dir / f"{db_name}.sqlite"
    if canonical.exists():
        conn.execute(f"ATTACH '{canonical}' AS canonical (TYPE SQLITE, READ_ONLY)")

    # Create unified view
    # ... UNION ALL across all attached DBs

    return conn
```

### 4. Thread-Local Worker IDs
```python
# In parallel.py
import threading

_worker_id = threading.local()

def get_worker_id() -> int:
    return getattr(_worker_id, 'id', 0)

def set_worker_id(worker_id: int) -> None:
    _worker_id.id = worker_id
```

---

## Needs Team Discussion

### 1. Canonical DB Sync Strategy

**Question:** When do we sync worker DBs → canonical?

| Option | Pros | Cons |
|--------|------|------|
| **Per-cycle** | Clean state each cycle | Sync overhead every cycle |
| **Per-phase** | Finer granularity | More complex |
| **Background thread** | Non-blocking | Complexity, race conditions |
| **End of day only** | Minimal overhead | Large sync at end |

### 2. Canonical DB Ownership

**Question:** Who writes to canonical, and when to clear worker files?

- Option A: Main thread merges after all workers complete
- Option B: Dedicated sync worker thread
- Option C: First worker to finish triggers merge

### 3. Cycle Naming Convention

**Question:** Should worker DBs include cycle info?

| Option | Example | Use Case |
|--------|---------|----------|
| Simple | `w001.sqlite` | Overwrite each cycle |
| Cycle-prefixed | `c01_w001.sqlite` | Debug/audit trail |
| Timestamp | `20260305_093000_w001.sqlite` | Full history |

**Recommendation:** Start simple (`w{id}.sqlite`), add complexity if needed.

### 4. Cleanup Strategy

**Question:** When/how to delete `workers_db/` and canonical?

| Scenario | Cleanup Action |
|----------|----------------|
| After gold complete | Delete `workers_db/`, keep canonical |
| End of day | Delete both (current behavior) |
| On new cycle start | Clear `workers_db/`, preserve canonical |
| Manual | Never auto-delete |

### 5. Investigation Workflow

**Question:** How do ops/devs query data on servers?

| Option | Tool | Pros | Cons |
|--------|------|------|------|
| Keep canonical | `sqlite3` | Familiar, simple | Sync overhead |
| DuckDB only | `duckdb` CLI | No sync needed | New tool to install |
| Both | Either | Flexibility | Maintenance burden |

**Consideration:** Is DuckDB CLI available on prod servers?

---

## Migration Path

### Phase 1: Infrastructure
- [ ] Add DuckDB dependency to `pyproject.toml`
- [ ] Create `workers_db/` directory handling in `init_db()`
- [ ] Implement thread-local worker ID in `parallel.py`

### Phase 2: Write Path
- [ ] Modify `init_db()` to return worker-specific DB path
- [ ] Update `upsert_metadata()` to write to worker DB
- [ ] Test: verify zero contention with `-p 8`

### Phase 3: Read Path
- [ ] Implement `get_unified_reader()` with DuckDB
- [ ] Replace SQLAlchemy reads: `is_file_already_processed()`
- [ ] Replace SQLAlchemy reads: `get_existing_outputs()`
- [ ] Replace SQLAlchemy reads: `get_bronze_files_needing_silver_processing()`
- [ ] Replace SQLAlchemy reads: `get_silver_files_needing_gold_processing()`

### Phase 4: Canonical Sync
- [ ] Implement sync strategy (per team decision)
- [ ] Add cleanup logic
- [ ] Test full cycle with canonical persistence

---

## Open Questions

1. What's our target parallelism? (`-p 4` vs `-p 32` vs `-p -1`)
2. Current failure rate from DB locks? (need log analysis)
3. DuckDB version/availability on prod servers?
4. Do we need backwards compatibility with existing SQLite DBs?

---

## Team Feedback

### Wingate Jones (2026-03-05)

| Topic | Decision |
|-------|----------|
| **Canonical sync** | Merge at end of cycle, but **not required** if using DuckDB |
| **Structure** | Canonical DB separate from shards (canonical + workers_db/ separate) |
| **Cycle naming** | Not needed - keep simple (`w{id}.sqlite`) |
| **Cleanup** | Delete worker DBs when merged (if merged) |
| **Investigation** | Prefer DuckDB, update docs to suggest DuckDB |

**Key Insight:** Canonical merge is **optional** - DuckDB can read worker DBs directly, making canonical DB a convenience rather than requirement.

### Thanu Reply (2026-03-05)

- **Cycle naming:** Optional, can ignore at this point
- **Merge timing:** No need to wait - runs in background after cycle completes
  - Cycle 12 completes → Cycle 12 worker DBs start merging (background)
  - Worker can merge and remove its own DB
- **If canonical not required:** Skip all merge steps entirely

### Full Team Discussion (2026-03-05)

**Wingate:**
- Canonical DB is fine, unless merge is slow
- If slow → keep 12 separate DBs, no merging needed
- Merge via DuckDB with `SET threads TO N` (parallel merge)
- Concerned about 20GB database merge latency
- Preference: merge only at **end of cycle**, not per-layer

**Kumaran:**
- Confirmed: Workers need to READ canonical (previous layer) + WRITE own DB
- Not just main thread reading
- Handlers need 2 engines: `read_engine` + `write_engine`

**Key Reads During Phase:**
1. `is_file_already_processed()` — was file processed before?
2. `get_existing_outputs()` — what outputs exist?
3. `file_needs_reprocessing_by_mtime()` — file changed?

---

## Final Agreed Architecture

```
Phase (Bronze/Silver/Gold):

Main Thread                              Workers (parallel)
───────────                              ──────────────────
Query canonical DB
→ find files needing processing
→ distribute to workers ───────────────→ Worker 1: READ canonical + WRITE w001.sqlite
                                         Worker 2: READ canonical + WRITE w002.sqlite
                                         Worker 3: READ canonical + WRITE w003.sqlite

Wait for all workers done ←──────────── All finished

DuckDB merge (SET threads = N)
w001 + w002 + w003 → {vendor}--{ds}.sqlite
Delete w001, w002, w003

Next phase → query canonical again
```

### Design Decisions

| Component | Decision |
|-----------|----------|
| **Worker READ** | From canonical DB (previous layer data) |
| **Worker WRITE** | To own `workers_db/w{id}.sqlite` |
| **Merge timing** | End of cycle only (not per-layer) |
| **Merge method** | DuckDB with `SET threads TO N` |
| **Handler change** | Pass 2 engines: `read_engine` + `write_engine` |
| **Fallback** | If merge slow → skip merge, query worker DBs via DuckDB |

### Implementation Requirements

1. **Pass 2 engines to handlers:**
   - `read_engine` → canonical DB
   - `write_engine` → worker DB

2. **DuckDB merge query:**
   ```sql
   SET threads TO 8;  -- or -p value
   -- INSERT INTO canonical SELECT * FROM w001 UNION ALL ...
   ```

3. **Cleanup after merge:**
   - Delete `workers_db/w*.sqlite`
   - Keep canonical

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 20GB merge slow | Skip merge, use DuckDB to query all worker DBs |
| Handler changes | Existing safety checks preserved |
| Complexity | Start with end-of-cycle merge only |

---

## Continued Discussion (2026-03-05)

### Kumaran's Concern

Current code in `handle_silver.py:384`:
```python
if is_file_already_processed(engine, fp, "silver") and not needs_reprocessing:
    outputs = get_existing_outputs(engine, fp, "silver")
    return SilverOutput(outputs, db_path)
```

- Runs inside worker thread
- Checks "did I process this file before?"
- Data lives in canonical, not worker's empty shard
- Without canonical read → `is_file_already_processed()` always returns False → reprocess everything

### Wingate's Key Insight

**Reading all DBs at START of phase = same as merging**

| Approach | When | Result |
|----------|------|--------|
| Merge then read | Before phase | Same data |
| Read all DBs | Before phase | Same data |
| Read mid-phase | During phase | Different (needs fresh data) |

**Question:** Do we read DB mid-phase or only at start?

### Wingate's Proposal: Separate DB from File Operations

```
Phase Structure:
─────────────────
1. START: All DB reads (query all DBs via DuckDB)
   → Collect: files to process, already processed, outputs

2. MIDDLE: File operations only (parallelizable)
   → Move files, transform, compress
   → NO DB reads inside this function

3. END: All DB writes
   → Write to worker DBs
```

**Benefits:**
- No DB reads mid-phase → no locking concerns
- File operations can be fully parallelized
- Clean separation of concerns

### Testing Approach (Agreed)

1. **Audit DB calls** - Log all queries, identify mid-phase reads
2. **Single-threaded test** - 1 file workload, move queries to start
3. **Verify stability** - Ensure no DB calls inside file-handling logic
4. **Parallelize** - Only file-moving logic, writes at end

### Graceful Shutdown

**Kumaran:** How handle shutdown mid-layer?
**Wingate:** Same as now - wait until end of cycle. Code already handles this.

---

## Revised Architecture (Post-Discussion)

```
Phase (Bronze/Silver/Gold):

┌─────────────────────────────────────────────────────────────┐
│ 1. DB READS (Main Thread - Single)                          │
│    ─────────────────────────────────                        │
│    DuckDB query all: canonical + workers_db/*.sqlite        │
│    → files_to_process[]                                     │
│    → already_processed{}                                    │
│    → existing_outputs{}                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FILE OPERATIONS (Workers - Parallel)                     │
│    ───────────────────────────────────                      │
│    Worker 1 ──→ process files (NO DB reads)                 │
│    Worker 2 ──→ process files (NO DB reads)                 │
│    Worker N ──→ process files (NO DB reads)                 │
│                                                             │
│    Each worker collects: results_to_write[]                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DB WRITES (Workers - Own DB)                             │
│    ────────────────────────────                             │
│    Worker 1 ──→ WRITE w001.sqlite                           │
│    Worker 2 ──→ WRITE w002.sqlite                           │
│    Worker N ──→ WRITE w00N.sqlite                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. MERGE (End of Cycle - DuckDB)                            │
│    ─────────────────────────────                            │
│    SET threads TO N;                                        │
│    workers_db/*.sqlite → canonical                          │
│    Delete worker DBs                                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Change from Original

| Original | Revised |
|----------|---------|
| Workers READ canonical mid-phase | All reads at START of phase |
| 2 engines per worker | 1 write engine only |
| Reads during file processing | NO reads during file processing |

### Implementation Steps

1. [ ] Audit all DB calls in handlers - log to identify mid-phase reads
2. [ ] Refactor: move `is_file_already_processed()` to main thread pre-filter
3. [ ] Refactor: move `get_existing_outputs()` to main thread, pass as param
4. [ ] Test single-threaded (1 file) - verify no DB reads in file logic
5. [ ] Parallelize file operations only
6. [ ] Add worker DB writes
7. [ ] Add DuckDB merge at end of cycle

---

## Graceful Shutdown Discussion

**Current behavior (Kumaran confirmed):**
1. SIGTERM/SIGINT → `_shutdown_requested = True`
2. In-flight workers finish current file (can't interrupt mid-file)
3. Pending workers check `shutdown_flag()` → return immediately
4. `as_completed` loop → cancels remaining futures
5. Between phases → checks flag → skips remaining phases
6. Between cycles → checks flag → exits loop

**Result:** Waits for current in-flight files only, not full layer/cycle.

**Wingate's concern:** This could leave incomplete phases, requiring `--ignore-db` to repopulate.

**Status:** To be discussed further.

---

## FINAL PLAN (For Team Agreement)

### Goal
Eliminate SQLite write lock contention when running `-p N` parallel workers.

### Architecture

```
silver/YYYY/MM/DD/
├── {vendor}--{ds}.sqlite      ← canonical (source of truth after merge)
└── workers_db/
    ├── w001.sqlite            ← Worker 1 writes
    ├── w002.sqlite            ← Worker 2 writes
    └── w00N.sqlite            ← Worker N writes
```

### Phase Flow

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE START (Main Thread)                                    │
├──────────────────────────────────────────────────────────────┤
│ 1. DuckDB reads ALL: canonical + workers_db/*.sqlite         │
│ 2. Collect:                                                  │
│    - files_to_process[]                                      │
│    - already_processed{} (from previous runs)                │
│    - existing_outputs{} (for skip logic)                     │
│ 3. Distribute files to workers                               │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ FILE OPERATIONS (Workers - Parallel)                         │
├──────────────────────────────────────────────────────────────┤
│ - NO DB reads inside file processing                         │
│ - Just file operations: move, transform, compress            │
│ - Each worker collects: results_to_write[]                   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ PHASE END (Workers - Own DB)                                 │
├──────────────────────────────────────────────────────────────┤
│ Worker 1 → WRITE w001.sqlite                                 │
│ Worker 2 → WRITE w002.sqlite                                 │
│ Worker N → WRITE w00N.sqlite                                 │
│ (Zero contention - each worker owns its DB)                  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ CYCLE END (Main Thread - DuckDB Merge)                       │
├──────────────────────────────────────────────────────────────┤
│ SET threads TO N;                                            │
│ INSERT INTO canonical SELECT * FROM w001 UNION ALL ...       │
│ DELETE workers_db/*.sqlite                                   │
└──────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Worker writes | Own `w{id}.sqlite` | Zero lock contention |
| Worker reads | None during processing | All reads moved to main thread |
| Merge timing | End of cycle only | Avoid per-layer overhead |
| Merge tool | DuckDB (parallel) | `SET threads TO N` |
| Canonical | Required | Source of truth after merge |
| Graceful shutdown | TBD | Needs further discussion |

### Implementation Phases

**Phase 1: Audit & Prep**
- [ ] Log all DB calls in handlers
- [ ] Identify mid-phase reads
- [ ] Document current query patterns

**Phase 2: Refactor Reads**
- [ ] Move `is_file_already_processed()` to main thread
- [ ] Move `get_existing_outputs()` to main thread
- [ ] Pass pre-fetched data to workers as params

**Phase 3: Test Single-Threaded**
- [ ] 1 file workload
- [ ] Verify no DB reads in file logic
- [ ] Confirm existing behavior unchanged

**Phase 4: Implement Worker DBs**
- [ ] Create `workers_db/` directory structure
- [ ] Thread-local worker IDs
- [ ] Worker writes to own DB

**Phase 5: DuckDB Merge**
- [ ] Add DuckDB dependency
- [ ] Implement merge at end of cycle
- [ ] Cleanup worker DBs after merge

**Phase 6: Parallelize & Test**
- [ ] Enable `-p N` with new architecture
- [ ] Benchmark vs current implementation
- [ ] Production rollout

### Open Items

- [ ] Graceful shutdown handling with incomplete phases
- [ ] `--ignore-db` behavior with worker DBs
- [ ] Backwards compatibility with existing canonical DBs

---

## TEAM AGREEMENT (2026-03-05 4:30 PM)

### Final Plan (Wingate Summary)

**Problem:** SQLite DB locking under parallel workers. Single DB = contention.

**Plan (agreed):**

1. Each worker gets its own SQLite for writes only (`workers_db/w001.sqlite`, etc.)
2. All reads happen BEFORE the phase starts — main thread queries canonical + worker shards via DuckDB, builds the full work list, distributes to workers
3. No DB reads inside per-file handler logic — workers only write (success, failure, retry marks). Any reads currently happening mid-phase get moved to the pre-phase bulk query step.
4. Merge worker shards into canonical at end of cycle (not per-phase) using DuckDB with `n_threads = -p`
5. If merge latency becomes an issue, skip merging entirely — just read all shards at phase start via DuckDB

**Key insight:** Per-file handler reads (`is_file_already_processed`, `get_existing_outputs`, `file_needs_reprocessing_by_mtime`) all check previous cycle/phase state, so they can be hoisted to the pre-phase bulk query. No per-phase merge needed.

### 3-Step Structure (Kumaran)

```
Step 1: READS (main thread, single bulk query)
─────────────────────────────────────────────
    DuckDB/SQLAlchemy reads canonical DB once
    → already_processed = set of processed files
    → existing_outputs = dict of file → outputs
    → reprocessing_flags = dict of file → mtime
    → pass this context to workers as plain data (sets, dicts)

Step 2: FILE I/O (parallel workers, no DB access)
──────────────────────────────────────────────────
    Workers receive:
      - file path to process
      - pre-fetched context (already_processed, existing_outputs, etc.)
    Workers do:
      - check context dict (in-memory, no DB call)
      - file copy/move/transform
      - return metadata dict (not written to DB yet)

Step 3: WRITES (main thread or workers, bulk call)
──────────────────────────────────────────────────
    Collect all worker results
    Batch write:
      - successful → INSERT metadata
      - failed → mark for retry
      - skipped → no-op
    DuckDB merge into canonical (end of cycle)
```

### Next Steps (Agreed)

1. **Audit/move DB reads** out of per-file handler logic into pre-phase bulk calls
2. **Test single-threaded** single-file workload to confirm no regressions
3. **Parallelize** per-file processing (file moves, transforms) with write-only worker DBs

### Investigation Item

**Wingate noted:** Still need to confirm no mid-phase reads depend on what other workers wrote during same phase. First MR will audit this.

---

**Status: AGREED** ✓
- Wingate: Confirmed
- Kumaran: "Looks good"
- Thanu: Implementing

---

## FINAL AGREED PLAN (Wingate Summary)

**Problem:** SQLite DB locking under parallel workers. Single DB = contention.

**Plan (agreed):**

1. Each worker gets its own SQLite for writes only (`worker_db/w001.sqlite`, etc.)
2. All reads happen BEFORE the phase starts — main thread queries canonical + worker shards via DuckDB, builds the full work list, distributes to workers
3. No DB reads inside per-file handler logic — workers only write (success, failure, retry marks). Any reads currently happening mid-phase get moved to the pre-phase bulk query step.
4. Merge worker shards into canonical at **end of cycle (not per-phase)** using DuckDB with `n_threads = -p`
5. If merge latency becomes an issue, skip merging entirely — just read all shards at phase start via DuckDB

**Key insight:** Per-file handler reads (`is_file_already_processed`, `get_existing_outputs`, `file_needs_reprocessing_by_mtime`) all check previous cycle/phase state, so they can be hoisted to the pre-phase bulk query. No per-phase merge needed.

**To investigate (first MR):** Confirm no mid-phase reads depend on what other workers wrote during same phase.

**Next steps:**

1. Audit/move DB reads out of per-file handler logic into pre-phase bulk calls
2. Test with single-threaded single-file workload to confirm no regressions
3. Then parallelize the per-file processing (file moves, transforms) with write-only worker DBs

---

## TL;DR

```
                              ONE PHASE (Bronze/Silver/Gold)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────┐      ┌─────────────────────────────┐      ┌───────────┐  │
│   │  CANONICAL  │      │      PARALLEL WORKERS       │      │  WORKER   │  │
│   │   (READ)    │ ──▶  │       (FILE I/O ONLY)       │ ──▶  │  SHARDS   │  │
│   │             │      │                             │      │  (WRITE)  │  │
│   └─────────────┘      │  ┌─────┐ ┌─────┐ ┌─────┐   │      └───────────┘  │
│         │              │  │ W1  │ │ W2  │ │ W3  │   │            │        │
│         │              │  │     │ │     │ │     │   │            │        │
│   Main thread          │  │ NO  │ │ NO  │ │ NO  │   │            │        │
│   queries DB           │  │ DB  │ │ DB  │ │ DB  │   │            ▼        │
│   builds work list     │  └─────┘ └─────┘ └─────┘   │      ┌───────────┐  │
│                        └─────────────────────────────┘      │  DuckDB   │  │
│                                                             │  MERGE    │  │
│                                                             └─────┬─────┘  │
│                                                                   │        │
│   ◀───────────────────────────────────────────────────────────────┘        │
│                         Updates canonical                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

       ┌──────────┐         ┌──────────┐         ┌──────────┐
       │  BRONZE  │  ────▶  │  SILVER  │  ────▶  │   GOLD   │
       │  PHASE   │         │  PHASE   │         │  PHASE   │
       └──────────┘         └──────────┘         └──────────┘
              │                   │                    │
              ▼                   ▼                    ▼
         canonical           canonical            canonical
         updated             updated              updated
```

**Flow:** `Canonical READ → Parallel File I/O (no DB) → Worker Shards WRITE → DuckDB Merge (end of cycle)`

**One sentence:** Move all DB reads to pre-phase (main thread queries canonical + shards via DuckDB), parallelize file operations with zero DB access, each worker writes to its own shard, DuckDB merges shards back to canonical at **end of cycle** (not per-phase).

---

## Complete Architecture Diagram

### Overall Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ONE CYCLE                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 1: BRONZE                                                │  │
│  │                                                                │  │
│  │  PRE-PHASE (main thread):                                      │  │
│  │    Query canonical DB → build raw_files_needing_bronze          │  │
│  │                                                                │  │
│  │  PARALLEL (workers):                                           │  │
│  │    ┌──────────┐  ┌──────────┐  ┌──────────┐                    │  │
│  │    │ Worker 1 │  │ Worker 2 │  │ Worker 3 │                    │  │
│  │    │ NO READS │  │ NO READS │  │ NO READS │                    │  │
│  │    │ WRITE:   │  │ WRITE:   │  │ WRITE:   │                    │  │
│  │    │ w001.sq  │  │ w002.sq  │  │ w003.sq  │                    │  │
│  │    └──────────┘  └──────────┘  └──────────┘                    │  │
│  │                                                                │  │
│  │  POST-PHASE: DuckDB merge → canonical.sqlite                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│        │                                                             │
│        ▼  canonical now has all Bronze metadata                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 2: SILVER  (same pattern)                                │  │
│  │  PRE-PHASE: Query canonical → bronze files needing silver      │  │
│  │  PARALLEL:  Workers do file I/O + WRITE to own shard           │  │
│  │  POST-PHASE: DuckDB merge → canonical                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│        │                                                             │
│        ▼  canonical now has all Silver metadata                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 3: GOLD  (same pattern)                                  │  │
│  │  PRE-PHASE: Query canonical → silver files needing gold        │  │
│  │  PARALLEL:  Workers do file I/O + WRITE to own shard           │  │
│  │  POST-PHASE: DuckDB merge → canonical                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  END OF CYCLE: Cleanup workerDB dirs, old SQLite files               │
└──────────────────────────────────────────────────────────────────────┘
```

### What Changes Inside Handlers

```
BEFORE (reads + writes mixed):              AFTER (write-only):
┌──────────────────────────────┐            ┌──────────────────────────────┐
│ handle_bronze/silver/gold    │            │ handle_bronze/silver/gold    │
│                              │            │                              │
│ ❌ file_needs_reprocessing() │            │  (no DB reads at all)        │
│ ❌ is_file_already_processed │            │                              │
│ ❌ get_existing_outputs()    │            │  ── file I/O only ──         │
│                              │            │  rsync, decompress, etc.     │
│  ── file I/O ──              │            │                              │
│                              │            │ ✅ upsert_metadata()         │
│ ✅ upsert_metadata()         │            │    → writes to worker shard  │
│    → writes to SHARED DB     │            │                              │
│    → 🔥 DB LOCK CONTENTION   │            └──────────────────────────────┘
└──────────────────────────────┘
```

### Why No Mid-Phase Reads Are Needed

```
Pre-phase (main thread) already does:       Handler (worker) only needs to:
─────────────────────────────────────       ───────────────────────────────
✅ file_needs_reprocessing_by_mtime()       ✅ Do file I/O (rsync/copy/move)
✅ is_file_already_processed()              ✅ upsert_metadata() → own shard
✅ get_existing_outputs()
✅ reprocessing record check

Work list is FULLY filtered before
files reach workers
```

### Directory Layout

```
silver/YYYY/MM/DD/
├── {vendor}--{dataset}.sqlite     ← canonical (main thread reads + merge target)
├── workerDB/                      ← temporary, deleted after merge
│   ├── w001.sqlite                ← worker 1 writes here
│   ├── w002.sqlite                ← worker 2 writes here
│   └── w003.sqlite                ← worker 3 writes here
└── work/
    ├── file1.csv
    └── file2.csv
```

### DuckDB Merge (After Each Phase)

```
DuckDB (n_threads = -p flag)
┌─────────────────────────────────────────┐
│  ATTACH canonical.sqlite AS canonical   │
│  ATTACH w001.sqlite AS worker           │
│  INSERT INTO canonical.filemetadata     │
│    SELECT * FROM worker.filemetadata    │
│  DETACH worker                          │
│  (repeat for w002, w003...)             │
│                                         │
│  _fixup_reprocessing_after_merge()      │
│  DELETE workerDB/                       │
└─────────────────────────────────────────┘
```

---

## Revised Architecture (Post-Feedback)

```
silver/YYYY/MM/DD/
├── {vendor}--{ds}.sqlite          ← canonical (OPTIONAL - for sqlite3 users)
└── workers_db/
    ├── w001.sqlite                 ← worker writes (source of truth)
    ├── w002.sqlite
    └── w003.sqlite
```

**Read Strategy:**
- Primary: DuckDB attaches `workers_db/*.sqlite` directly
- Fallback: Optional canonical merge for sqlite3 CLI users

**Cleanup Strategy:**
- If canonical merged → delete `workers_db/`
- If DuckDB-only → keep `workers_db/`, no canonical needed

---

## Notes

_Additional discussion notes go here._
