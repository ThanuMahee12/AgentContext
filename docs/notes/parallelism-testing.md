# Parallelism Testing Notes

**Branch:** `feature/parallelism-from-dev`
**Date:** 2026-02-04

## Performance Benchmarks (bbocax_cwiq_pipe)

| Phase | Sequential | Parallel (4 workers) | Speedup |
|-------|------------|----------------------|---------|
| Bronze | 113s | 40s | 2.8x |
| Silver | 30s | 15s | 2.0x |
| Gold | 26s | 14s | 1.9x |
| **Total** | **173s** | **72s** | **2.4x** |

## Known Bug: Map[-1] in Sequential Mode

### Symptom
Non-parquet files (`.dif`, `.out`, `.dlt`) show `Map[-1] (unknown)` in sequential mode but correct `Map[68]`/`Map[69]` in parallel mode. Files still route correctly.

### Affected Files
- `shareFuturesExtendedOpenAsia1.dif.20260126` (with date suffix)
- `shareFuturesExtendedOpenAsia1.dif` (without date suffix)
- Similar patterns for `.out` and `.dlt` files

### Not Affected
- `.parquet` files work correctly in both modes

### Code Path Difference

**Parallel (workers > 1):**
1. `parallel_process_gold_ordered` pre-computes destinations via `get_destinations`
2. `get_destinations` calls `apply_grabber_maps` (logs `INFO | Map[X]`)
3. `process_gold_file` calls `handle_gold` -> `apply_grabber_maps` again

**Sequential (workers == 1):**
1. `parallel_process_gold_ordered` immediately delegates to `parallel_process`
2. Skips `get_destinations` pre-computation
3. `process_gold_file` calls `handle_gold` -> `apply_grabber_maps` (only call)

### Hypothesis
The pre-computation step in parallel mode may initialize or cache something that makes subsequent grabber map matching work correctly.

### Related Code
- `data_alchemy/utils/parallel.py:225-229` - sequential mode bypass
- `data_alchemy/handlers/handle_gold.py:569-660` - `apply_grabber_maps` function
- `data_alchemy/config/grabber_maps.py:28-118` - grabber maps loading

### Grabber Map Key Collision
All 6 `futures_extended` grabber map files share the same key:
```python
("bloomberg", "1.0", "bbocax_cwiq_pipe")
```
Patterns from different files get merged via `dict.update()`.

## CLI Usage

```bash
# Max parallelism (uses all CPU cores)
--parallel -1

# Specific worker count
--parallel 4

# Sequential (default when flag omitted)
# (no flag)

# Via environment variable
export DATA_ALCHEMY_WORKERS=4
```

## Next Steps

1. Add debug logging to `apply_grabber_maps` to trace pattern matching
2. Test if explicit `--parallel 1` behaves differently than no flag
3. Check if pattern order in merged dict affects matching
