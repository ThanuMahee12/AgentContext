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

## Notes

_Team discussion notes go here._
