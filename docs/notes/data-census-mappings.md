# Data Census: Pattern Mappings

## Overview

Data Census scans `/sf/data/` directories to extract file metadata and maps files to delta tables via lineage mappings.

## Architecture

```
raw_pattern.jsonl          → Defines raw file patterns (pattern_id, directory, file_pattern)
raw_enriched_pattern.jsonl → Defines enriched file patterns
lineage_mapping.jsonl      → Links: raw_pattern_id → enriched_pattern_id → table_id
delta_table_repo.jsonl     → Maps table_id to table_name and repo_name
```

## Source of Truth

**Primary:** `inverstigationdb/export/normalized/`
- `raw_pattern.csv` / `raw_pattern.jsonl`
- `raw_enriched_pattern.csv` / `raw_enriched_pattern.jsonl`
- `lineage_mapping.csv` / `lineage_mapping.jsonl`
- `delta_table_repo.csv` / `delta_table_repo.jsonl`

**Deployed:** `data-census/config/` (JSONL files uploaded to S3)

## Key Rules

### 1. One Pattern Per Unique File
Each unique file pattern needs its own `raw_pattern_id`. Example:
- `equity_asia1.rpx` → pattern 444
- `equity_asia2.rpx` → pattern 5281
- `equity_euro.rpx` → pattern 5282

### 2. Exclude _delta_log
Scanner excludes `_delta_log/` directories (Delta Lake transaction logs).

### 3. Enriched Patterns Only .parq
All enriched patterns must end with `.parq`.

### 4. Directory Types
- `/raw/` → Raw file patterns
- `/raw_enriched/` → Enriched file patterns
- `/derived/` → Derived files (rare, only 2 datasets use this)

## Pattern Counts (as of 2026-03-15)

| Type | Count |
|------|-------|
| raw_pattern | 5,284 |
| raw_enriched_pattern | 6,471 |
| lineage_mapping | ~6,400 |
| delta_table_repo | 3,702 |

## Athena Query Template

```sql
-- Raw files with table names
SELECT r.*, dtr.table_name, dtr.repo_name
FROM data_census.raw r
JOIN data_census.lineage_mapping lm
    ON CAST(r.pattern_id AS VARCHAR) = lm.raw_pattern_id
JOIN data_census.delta_table_repo dtr
    ON lm.table_id = dtr.table_id
WHERE r.year = '2026' AND r.month = '03' AND r.day = '15'
    AND dtr.table_name LIKE '%coverage%';

-- Raw + Enriched (exclude _delta_log)
SELECT
    dtr.table_name,
    r.fullpath as raw_fullpath,
    re.fullpath as enriched_fullpath
FROM data_census.raw r
JOIN data_census.lineage_mapping lm
    ON CAST(r.pattern_id AS VARCHAR) = lm.raw_pattern_id
JOIN data_census.delta_table_repo dtr
    ON lm.table_id = dtr.table_id
LEFT JOIN data_census.raw_enriched re
    ON CAST(re.pattern_id AS VARCHAR) = lm.enriched_pattern_id
    AND re.year = r.year AND re.month = r.month AND re.day = r.day
    AND re.fullpath NOT LIKE '%_delta_log%'
WHERE r.year = '2026' AND r.month = '03' AND r.day = '15';
```

## Workflow: Adding New Patterns

1. Update `inverstigationdb/export/normalized/raw_pattern.csv`
2. Update `inverstigationdb/export/normalized/lineage_mapping.csv`
3. Regenerate JSONL files:
   ```python
   import csv, json
   with open('raw_pattern.csv', 'r') as f:
       reader = csv.DictReader(f)
       with open('raw_pattern.jsonl', 'w') as out:
           for row in reader:
               out.write(json.dumps(row) + '\n')
   ```
4. Copy JSONLs to `data-census/config/`
5. Upload to S3:
   ```bash
   aws s3 cp config/lineage_mapping.jsonl s3://beacon-delta-share-dq-reports/aws_raw_parquet_file_timestamp/mapping/lineage_mapping/
   aws s3 cp config/raw_pattern.jsonl s3://beacon-delta-share-dq-reports/aws_raw_parquet_file_timestamp/mapping/raw_pattern/
   ```
6. Re-run scanner on production
7. Reload Athena: `MSCK REPAIR TABLE data_census.raw;`

## Common Issues

### Cross-Product Joins
**Symptom:** One raw file joining to multiple enriched files
**Cause:** Multiple enriched patterns mapped to same raw_pattern_id
**Fix:** Create separate raw_pattern_id for each unique raw file

### NULL enriched_fullpath
**Symptom:** Raw files have no matching enriched files
**Cause:** lineage_mapping points to non-existent `/derived/` directory
**Fix:** Update mapping to use correct `/raw_enriched/` directory

### _delta_log Files in Results
**Symptom:** Athena results include `_delta_log` paths
**Fix:** Add `AND fullpath NOT LIKE '%_delta_log%'` filter
