# Data Census: Pattern Mappings

## Overview

Data Census scans `/sf/data/` directories to extract file metadata and maps files to delta tables via lineage mappings.

## Architecture

```
raw_pattern.jsonl                    → Defines raw file patterns (pattern_id, directory, file_pattern)
raw_enriched_pattern.jsonl           → Defines enriched file patterns (full_regex for matching)
raw_pattern_enriched_map.jsonl       → Links: raw_pattern_id → raw_enriched_id
delta_table_enriched_pattern_map.jsonl → Links: raw_enriched_id → delta_table_id
delta_table.jsonl                    → Maps table_id to table_name
repo_delta_table_map.jsonl           → Maps table_id to repo_id
repo.jsonl                           → Maps repo_id to repo_name
```

### Lineage Flow

```
raw_pattern_id (535)
    ↓ raw_pattern_enriched_map.jsonl
raw_enriched_id (1219)
    ↓ delta_table_enriched_pattern_map.jsonl
delta_table_id (850)
    ↓ repo_delta_table_map.jsonl
repo_id (26) → dataset-crunchbase
```

## Source of Truth

**Primary:** `inverstigationdb/export/normalized/`
- `raw_pattern.csv` / `raw_pattern.jsonl`
- `raw_enriched_pattern.csv` / `raw_enriched_pattern.jsonl`
- `lineage_mapping.csv` / `lineage_mapping.jsonl`
- `delta_table_repo.csv` / `delta_table_repo.jsonl`

**Deployed:** `data-census/config/` (JSONL files uploaded to S3)

**S3 Location:** `s3://beacon-delta-share-dq-reports/mapping/`

## Mapping Files Summary

| File | Key Field | Links To | Count |
|------|-----------|----------|-------|
| `raw_pattern.jsonl` | raw_pattern_id | - | 5,284 |
| `raw_enriched_pattern.jsonl` | enriched_pattern_id | - | 6,725 |
| `raw_pattern_enriched_map.jsonl` | raw_pattern_id → raw_enriched_id | - | 6,852 |
| `delta_table_enriched_pattern_map.jsonl` | raw_enriched_id → delta_table_id | - | ~6,500 |
| `delta_table.jsonl` | table_id → table_name | - | ~950 |
| `repo_delta_table_map.jsonl` | table_id → repo_id | - | ~950 |
| `repo.jsonl` | repo_id → repo_name | - | ~40 |

## Key Rules

### 1. Directory Types Scanned

Scanner only scans these directories:
- `/raw/` → Raw file patterns
- `/raw_enriched/` → Enriched file patterns

**NOT scanned:**
- `/derived/` → Some tables use this (e.g., `financial_company_detail`)

### 2. Enriched Pattern Regex

Enriched patterns use `full_regex` with optional date subdirectory:

```
/sf/data/vendor/dataset/1.0/raw_enriched/(\d{4}/\d{8}/)?\d{8}\.filename\.parq
                                         ^^^^^^^^^^^^^^^
                                         Optional YYYY/YYYYMMDD/
```

### 3. Exclude _delta_log

Scanner excludes `_delta_log/` directories (Delta Lake transaction logs).

### 4. One Pattern Per Unique File

Each unique file pattern needs its own `raw_pattern_id`. Example:
- `equity_asia1.rpx` → pattern 444
- `equity_asia2.rpx` → pattern 5281

## Lookup Commands

### Find Table Lineage

```bash
# 1. Find table by name
grep -i "table_name" config/delta_table.jsonl

# 2. Find enriched patterns for table
grep '"delta_table_id": <id>' config/delta_table_enriched_pattern_map.jsonl

# 3. Find raw patterns for enriched
grep '"raw_enriched_id": <id>' config/raw_pattern_enriched_map.jsonl

# 4. Get raw pattern details
grep '"raw_pattern_id": "<id>"' config/raw_pattern.jsonl

# 5. Get enriched pattern details
grep '"enriched_pattern_id": <id>' config/raw_enriched_pattern.jsonl

# 6. Get repo name
grep '"table_id": <id>' config/repo_delta_table_map.jsonl
grep '"repo_id": <id>' config/repo.jsonl
```

### Example: acquisitions table

```bash
grep -i "acquisitions" config/delta_table.jsonl
# → {"table_id": 850, "table_name": "acquisitions"}

grep '"delta_table_id": 850' config/delta_table_enriched_pattern_map.jsonl
# → {"raw_enriched_id": 1219, "delta_table_id": 850}

grep '"raw_enriched_id": 1219' config/raw_pattern_enriched_map.jsonl
# → {"raw_pattern_id": 535, "raw_enriched_id": 1219}

grep '"raw_pattern_id": "535"' config/raw_pattern.jsonl
# → {"raw_pattern_id": "535", "directory_path": "/sf/data/crunchbase/firmographic/1.0/raw/", ...}
```

## Known Issues

### 1. Missing raw_pattern_enriched_map Links

**Example:** `russell_3000_top_500` (table_id: 914)
- raw_pattern_id: 601 exists
- enriched_pattern_id: 1309 exists
- **No mapping between them** in `raw_pattern_enriched_map.jsonl`

**Fix:**
```bash
echo '{"raw_pattern_id": 601, "raw_enriched_id": 1309}' >> config/raw_pattern_enriched_map.jsonl
```

### 2. Wrong File Extensions

**Example:** `russell_3000_top_500`

| Source | Pattern |
|--------|---------|
| cds-jobs | `{file_name}_{YYYYMMDD}.csv` |
| data-census | `YYYYMMDD.{file_name}_{YYYYMMDD}.parq` |

**Root cause:** Pattern created incorrectly (`.parq` instead of `.csv`)

### 3. /derived/ Directory Not Scanned

**Example:** `financial_company_detail` (table_id: 922)

Enriched files are in:
```
/sf/data/lseg_refinitiv/reuters_fundamentals/1.0/derived/financial_company_detail/
```

Scanner only scans `/raw/` and `/raw_enriched/`, missing `/derived/`.

### 4. Missing Subdirectory in Pattern

**Example:** `russell_3000_top_500`

| Source | Path |
|--------|------|
| cds-jobs | `/raw_enriched/{YYYY}/{YYYYMMDD}/{YYYYMMDD}.file.parq` |
| data-census | `/raw_enriched/{YYYYMMDD}.file.parq` |

**Fix:** Add optional subdirectory to full_regex:
```
/path/raw_enriched/(\d{4}/\d{8}/)?\d{8}\.file\.parq
```

## Athena Query Templates

```sql
-- Raw files with table names
SELECT r.*, dt.table_name, repo.repo_name
FROM data_census.raw_meta_data r
JOIN data_census.raw_pattern_enriched_map rpem
    ON CAST(r.pattern_id AS VARCHAR) = CAST(rpem.raw_pattern_id AS VARCHAR)
JOIN data_census.delta_table_enriched_pattern_map dtepm
    ON rpem.raw_enriched_id = dtepm.raw_enriched_id
JOIN data_census.delta_table dt
    ON dtepm.delta_table_id = dt.table_id
JOIN data_census.repo_delta_table_map rdtm
    ON dt.table_id = rdtm.table_id
JOIN data_census.repo repo
    ON rdtm.repo_id = repo.repo_id
WHERE r.year = '2026' AND r.month = '03'
    AND dt.table_name = 'acquisitions';

-- Count files per pattern
SELECT pattern_id, COUNT(*) as cnt
FROM data_census.raw_meta_data
WHERE year = '2026' AND month = '03'
GROUP BY pattern_id
ORDER BY cnt DESC
LIMIT 20;
```

## Workflow: Adding New Patterns

1. Update source CSVs in `inverstigationdb/export/normalized/`
2. Regenerate JSONL files
3. Copy to `data-census/config/`
4. Upload to S3:
   ```bash
   aws s3 cp config/raw_pattern.jsonl s3://beacon-delta-share-dq-reports/mapping/raw_pattern.jsonl
   aws s3 cp config/raw_enriched_pattern.jsonl s3://beacon-delta-share-dq-reports/mapping/raw_enriched_pattern.jsonl
   ```
5. Re-run scanner
6. Reload Athena: `MSCK REPAIR TABLE data_census.raw_meta_data;`

## S3 Report

Check data coverage in S3:

```bash
python scripts/s3_report.py --profile meta_data_extract --start 2026-01-01 --end 2026-03-18
```

Output shows:
- Files per month (raw/enriched)
- Missing days
- Coverage percentage
