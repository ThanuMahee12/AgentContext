# DuckDB Worker Shards - Implementation Notes

## Architecture

```
silver/YYYY/MM/DD/
├── vendor--dataset.sqlite              ← canonical DB
└── worker_dbs/
    ├── vendor--dataset_w001.sqlite     ← worker 1 shard
    ├── vendor--dataset_w002.sqlite     ← worker 2 shard
    └── vendor--dataset_w003.sqlite     ← worker 3 shard
```

## Per-Phase Flow

```
Phase Start  → DuckDB query canonical (clean, no shards)
Phase        → Workers write to w001, w002, ...
Phase End    → Merge shards → canonical → DELETE shards
```

## Key Design Decisions

### 1. threading.local() for worker ID
```python
_thread_local = threading.local()
_get_worker_id = lambda: getattr(_thread_local, "worker_id", 0)
_set_worker_id = lambda wid: setattr(_thread_local, "worker_id", wid)
```
- Correct for ThreadPoolExecutor
- ContextVar is for asyncio, not OS threads

### 2. UNION ALL Merge (not sequential)
```python
# Attach all shards at once
for i, shard_path in enumerate(shards):
    conn.execute(f"ATTACH '{shard_path}' AS s{i} (TYPE SQLITE, READ_ONLY)")

# Single INSERT with UNION ALL
union_query = " UNION ALL ".join(f"SELECT * FROM s{i}.filemetadata" for i in range(len(shards)))
conn.execute(f"INSERT INTO canonical.filemetadata SELECT ... FROM ({union_query})")
```
- Much faster than sequential attach/insert/detach per shard

### 3. Empty Shard Handling
```python
def _shard_has_table(conn, alias, table_name="filemetadata") -> bool:
    result = conn.execute(
        f"SELECT COUNT(*) FROM information_schema.tables "
        f"WHERE table_schema = '{alias}' AND table_name = '{table_name}'"
    ).fetchone()
    return result[0] > 0
```
- Workers may create shard files but not write data
- Must check table exists before including in UNION ALL

### 4. DELETE Journal Mode (not WAL)
```python
conn.execute(text("PRAGMA journal_mode=DELETE"))
```
- WAL doesn't work on NFS (causes disk I/O errors)

### 5. Graceful Shutdown
- Finish current file
- Merge worker shards to canonical
- Skip remaining phases
- Critical: merge before skip to prevent data loss

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Table filemetadata does not exist` | Empty shard | Filter with `_shard_has_table()` |
| `attempt to write a readonly database` | NFS permissions | Check mount, permissions |
| `database is locked` | Lock contention | Worker shards eliminate this |

## Environment Variables

```bash
DUCKDB_MEMORY_LIMIT=4GB      # Memory cap for DuckDB
DUCKDB_LOG_LEVEL=DEBUG       # DuckDB-specific logging
DUCKDB_TEMP_DIR=/tmp/duckdb  # Spill to disk location
```

## Files

| File | Purpose |
|------|---------|
| `utils/worker_shards.py` | Worker ID management, shard paths |
| `utils/duckdb_ops.py` | DuckDB merge operations |
| `utils/db.py` | `init_worker_shard_db()`, `get_db_for_current_worker()` |
| `utils/parallel.py` | Worker ID assignment in thread pool |

---

## Lesson Learned: No Caching for Worker Shards

### Problem
Cached engine returned for non-existent shard file → "readonly database" error

### Why Caching Failed
```
1. Worker creates shard → engine cached
2. Phase ends → shard deleted (merge + cleanup)
3. Next cycle → cached engine returned
4. File doesn't exist → "readonly database" error
```

### Solution
No caching for worker shards - they're short-lived:
```python
# Simple: create fresh engine each time
engine = create_engine(url, ...)
return shard_path, engine
```

### When to Cache
| DB Type | Cache? | Reason |
|---------|--------|--------|
| Canonical | Yes | Long-lived, reused across phases |
| Worker shard | No | Deleted after each phase merge |

---

## Troubleshooting "readonly database" Error

### Common Causes
1. **Stale cache** - Engine cached, file deleted
2. **NFS permissions** - Mount read-only or no write access
3. **Disk full** - `df -h`
4. **File locked** - `fuser *.sqlite`

### Debug Commands
```bash
# Check permissions
ls -la /path/to/silver/YYYY/MM/DD/worker_dbs/

# Check disk space
df -h /path/to/data/

# Check routing logs
grep "Routing to" <logfile>
grep "get_db_for_current_worker: worker_id" <logfile>
```

---

## Graceful Shutdown

### Signal Handling
```python
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def signal_handler(signum, frame):
    global _shutdown_requested
    _shutdown_requested = True
```

### Flow
1. Signal received → `_shutdown_requested = True`
2. `parallel_process` checks `shutdown_flag` before each file
3. Current file finishes, remaining skipped
4. Phase ends → **MERGE HAPPENS** (always)
5. Check `_shutdown_requested` → skip remaining phases
6. Exit gracefully

### Key Code (main.py)
```python
# Merge first (always)
if effective_workers > 1:
    duckdb_merge_shards_to_canonical(db_path, effective_workers)

# THEN check shutdown
if _shutdown_requested:
    continue  # Skip remaining phases
```

### Guarantee
- Processed files always merged before exit
- No data loss on Ctrl+C or SIGTERM
- Clean canonical state for next run

---

## Final Design: NullPool, No Caching

```python
engine = create_engine(
    url,
    poolclass=NullPool,  # No pooling
)
```

### Why NullPool
- Fresh connection each time
- No stale state
- Simpler code
- Worker shards are short-lived anyway

### Why No Caching
- Caching caused stale engine issues
- Shards deleted after each phase
- No benefit from caching short-lived objects
