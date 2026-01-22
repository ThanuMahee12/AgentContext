# Bloomberg BBOCAX Mapping Notes

## Overview

Bloomberg Back Office Corporate Actions (BBOCAX) dataset mapping for data-alchemy pipeline.

**Source:** `bloomberg/bbocax_cwiq_pipe/1.0`
**Server:** ny5-predpalch01

---

## Grabber Maps

| Map | Target Dataset | Status |
|-----|----------------|--------|
| `bloomberg_bbocax_cwiq_pipe_backoffice_1_0.json` | back_office | Main |
| `bloomberg_bbocax_cwiq_pipe_backoffice_cax_1_0.json` | back_office | CAX v1 |
| `bloomberg_bbocax_cwiq_pipe_backoffice_cax_2_0.json` | back_office | CAX v2 |
| `bloomberg_bbocax_cwiq_pipe_backoffice_parquet_2_0.json` | back_office | Parquet |
| `bloomberg_bbocax_cwiq_pipe_corporate_actions_1_0.json` | corporate_actions | Main |
| `bloomberg_bbocax_cwiq_pipe_corporate_actions_cax_1_0.json` | corporate_actions | CAX v1 |
| `bloomberg_bbocax_cwiq_pipe_corporate_actions_cax_2_0.json` | corporate_actions | CAX v2 |
| `bloomberg_bbocax_cwiq_pipe_corporate_actions_parquet_2_0.json` | corporate_actions | Parquet |
| `bloomberg_bbocax_cwiq_pipe_futures_2_0.json` | futures | Main |
| `bloomberg_bbocax_cwiq_pipe_equities_1_0.json` | back_office_equities | **Branch** |
| `bloomberg_bbocax_cwiq_pipe_equities_parquet_1_0.json` | back_office_equities | **Branch** |

**Equities branch:** `feature/bbocax-equities`

---

## Bronze File Counts

**Path:** `/sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/`

### Daily Counts (2025-12 to 2026-01)

| Date | Files | Type |
|------|-------|------|
| 2025/12/08 | 1,672 | Weekend |
| 2025/12/09 | 8,226 | Full |
| 2025/12/10 | 8,026 | Full |
| 2025/12/11 | 1,832 | Partial |
| 2025/12/12 | 2,139 | Partial |
| 2025/12/18 | 1,656 | Partial |
| 2025/12/23 | 4,042 | Holiday |
| 2025/12/26 | 24 | Holiday |
| 2025/12/30 | 4,188 | Holiday |
| 2025/12/31 | 7,932 | Full |
| 2026/01/01 | 7,944 | Full |
| 2026/01/02 | 7,876 | Full |
| 2026/01/03 | 4,632 | Partial |
| 2026/01/04 | 7,926 | Full |
| 2026/01/05 | 7,946 | Full |
| 2026/01/06 | 7,969 | Full |
| 2026/01/07 | 7,932 | Full |
| 2026/01/08 | 7,924 | Full |
| 2026/01/09 | 8,130 | Full |
| 2026/01/10 | 4,634 | Partial |
| 2026/01/11 | 7,920 | Full |
| 2026/01/12 | 8,320 | Full |
| 2026/01/13 | 7,662 | Full |
| 2026/01/14 | 8,256 | Full |
| 2026/01/15 | 5,510 | Partial |
| 2026/01/16 | 5,604 | Partial |
| 2026/01/17 | 5,112 | Partial |
| 2026/01/18 | 7,830 | Full |
| 2026/01/19 | 8,090 | Full |
| 2026/01/20 | 8,412 | Full |
| 2026/01/21 | 8,402 | Full |

### Summary
- **Full weekday:** ~7,900-8,400 files
- **Weekends/holidays:** 1,600-4,600 files
- **Best test date:** 2026/01/21 (8,402 files)

---

## Equity File Categories

From tree analysis (`asserts/tree/crawler/bloomberg-bbocax_cwiq_pipe-1.0-tree.json`):

| Category | Unique Files | Mapping Status |
|----------|--------------|----------------|
| equityOptions* | 260 | EXCLUDED (separate map) |
| equityIndex* | 50 | EXCLUDED (separate map) |
| equityWarrant* | 47 | Partial |
| equitySec* | 10 | Partial |
| equityIndia* | 5 | Partial |
| equityMifid* | 8 | Partial |
| Core equity | 135 | Covered |
| **Total** | 548 | - |

### Envs
- **Total envs:** 100 (env0 - env99)

---

## Equities Grabber Map Coverage

**File:** `bloomberg_bbocax_cwiq_pipe_equities_1_0.json`
**Target:** `bloomberg/back_office_equities/1.0/raw/`

### Covered File Types

| Pattern | Extensions | Description |
|---------|------------|-------------|
| `equity*.csv` | .csv, .csv.gz | CSV files (excludes Options/Index) |
| `equity_*.out` | .out | Binary output (decrypted) |
| `equity_*.dif` | .dif | Diff files (decrypted) |
| `equity_*.px` | .px | Pricing files |
| `equity_*.rpx` | .rpx | Recap pricing |
| `equity_*.px.hpc` | .px.hpc | HPC pricing |

### Excluded (by negative lookahead)
- `equityOptions*` - handled by separate options map
- `equityIndex*` - handled by separate index map

---

## Commands Reference

```bash
# Count files per date in bronze
find /sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze -mindepth 3 -maxdepth 3 -type d -exec sh -c 'echo "$(find "$1" -type f | wc -l) $1"' _ {} \; | sort -k2

# Count equity files for a specific date
find /sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/2026/01/21 -type f -name "*equity*" -o -name "*Equity*" | wc -l

# List unique equity filenames (strip timestamps)
find /sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/2026/01/21 -type f \( -name "*equity*" -o -name "*Equity*" \) | sed 's|.*/||' | sed 's/--.*$//' | sort -u

# Count by file extension
find /sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/2026/01/21 -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20
```

---

## Local vs Real Server Comparison

**Checked:** 2026-01-22

| Date | Local /sf/data | Real Server | Match |
|------|----------------|-------------|-------|
| 2025/12/01 | 7,976 | - | N/A |
| 2025/12/02 | 7,974 | - | N/A |
| 2025/12/03 | 7,987 | - | N/A |
| 2025/12/04 | 9,533 | - | N/A |
| 2025/12/05 | 7,914 | - | N/A |
| 2025/12/06 | 4,733 | - | N/A |
| 2025/12/07 | 7,968 | - | N/A |
| 2025/12/08 | 5,536 | 1,672 | NO |
| 2025/12/09 | 8,218 | 8,226 | ~YES |
| 2025/12/10 | 10,518 | 8,026 | NO |
| 2025/12/11 | 5,861 | 1,832 | NO |
| 2025/12/12 | 9,985 | 2,139 | NO |
| 2025/12/13 | 4,721 | - | N/A |
| 2025/12/14 | 7,964 | - | N/A |
| 2025/12/15 | 7,965 | - | N/A |
| 2025/12/16 | 7,978 | - | N/A |
| 2025/12/17 | 6,034 | - | N/A |
| 2025/12/18 | 7,366 | 1,656 | NO |
| 2025/12/19 | 11,525 | - | N/A |
| 2025/12/20 | 4,721 | - | N/A |
| 2025/12/21 | 8,023 | - | N/A |
| 2025/12/22 | 8,028 | - | N/A |
| 2025/12/23 | 8,012 | 4,042 | NO |
| 2025/12/24 | 8,076 | - | N/A |
| 2025/12/25 | 8,035 | - | N/A |
| 2025/12/26 | 7,964 | 24 | NO |
| 2025/12/27 | 4,729 | - | N/A |
| 2025/12/28 | 8,044 | - | N/A |
| 2025/12/29 | 8,027 | - | N/A |
| 2025/12/30 | 7,983 | 4,188 | NO |
| 2025/12/31 | 7,929 | 7,932 | ~YES |
| 2026/01/01 | 7,938 | 7,944 | ~YES |
| 2026/01/02 | 7,870 | 7,876 | ~YES |
| 2026/01/03 | 4,629 | 4,632 | ~YES |
| 2026/01/04 | 7,922 | 7,926 | ~YES |
| 2026/01/05 | 7,942 | 7,946 | ~YES |
| 2026/01/06 | 7,958 | 7,969 | ~YES |
| 2026/01/07 | 7,929 | 7,932 | ~YES |
| 2026/01/08 | 7,921 | 7,924 | ~YES |
| 2026/01/09 | 8,120 | 8,130 | ~YES |
| 2026/01/10 | 4,631 | 4,634 | ~YES |
| 2026/01/11 | 7,917 | 7,920 | ~YES |
| 2026/01/12 | 40 | 8,320 | NO |

### Observations

- **Dec 2025:** Local has more data than real server (sample data from old tree?)
- **Jan 2026 (01-11):** Nearly match (~3-10 file difference)
- **2026/01/12:** Local has only 40 files vs 8,320 on server (incomplete)
- **Action needed:** Regenerate sample data from latest tree for accurate testing

---

## Related Files

- **Tree file:** `asserts/tree/crawler/bloomberg-bbocax_cwiq_pipe-1.0-tree.json`
- **CDP reference:** `asserts/cdp/bbocax_cdp.csv`
- **Env analyzer logs:** `asserts/logs/env_analyser/*/bloomberg_bbocax_cwiq_pipe.json`

---

## History

| Date | Action |
|------|--------|
| 2026-01-22 | Created notes, analyzed bronze counts |
| 2026-01-22 | Added local vs real server comparison chart |
