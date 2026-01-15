# 2026-01-15

## Project: data-alchemy

**Repo:** alchmy (parent) + data-alchemy (submodule)

**Environment:** Linux machine

**Branch:** `feature/bbocax-futures` (data-alchemy submodule)

---

### Progress Today

**Session 1:**
- Pulled AgentContext updates (Windows session synced)
- Created Linux session file
- Verified `--file-pattern` CLI flag for filtering files (not `--pattern`)
- Confirmed raw cwiq_pipe file patterns for futures
- Created server-friendly command with `nice`, `nohup`, and `tee` for logging
- Ran DQ validation (20251110:20251120) - type mismatches found
- Fixed: Added `gzip_no_ext` compression to futures grabber map
- Pushed fix to `feature/bbocax-futures` (commit `6aa26f0`)
- Checked `feature/bbocax-currency` branch - no compression set yet

---

### bbocax-futures Real Server Testing

**Grabber map:** `bloomberg_bbocax_cwiq_pipe_futures_2_0.json`

**Raw files (cwiq_pipe/env0):**
- `shareFuturesBulk*.{out,dif}.gz.enc`
- `nonShareFuturesBulk*.{out,dif}.gz.enc`

**Command (basic):**
```bash
uv run python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --backfill 2000 --file-pattern "shareFuturesBulk|nonShareFuturesBulk"
```

**Command (server-friendly with tee):**
```bash
nice -n 10 nohup uv run python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --backfill 2000 --file-pattern "shareFuturesBulk|nonShareFuturesBulk" 2>&1 | tee /home/svc_dat_alche_u/workspace/thanudev/logs/bbocax-futures-$(date +%Y%m%d-%H%M%S).log &
```

**DQ validation command:**
```bash
nice -n 10 nohup uv run python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --dq --verbose-dq --dq-date-range 20251110:20251120 --file-pattern "shareFuturesBulk|nonShareFuturesBulk" 2>&1 | tee /home/svc_dat_alche_u/workspace/thanudev/logs/bbocax-futures-dq-$(date +%Y%m%d-%H%M%S).log &
```

**DQ Results (20251110:20251120) - Before Fix:**
- Dataset: `bloomberg/back_office_futures/2.0`
- Files Checked: 418
- Type mismatches: ~300 (all dates, all FuturesBulk files)
  - comparison: `application/gzip` (legacy shovel)
  - output: `text/plain` (data-alchemy - decompressed)

**Why type must match:**
- DQ validation checks MIME type for 100% shovel compatibility
- Legacy shovel outputs gzip files → `application/gzip`
- data-alchemy must output same type to pass DQ

**Fix Applied:**
- Added `"compression": "gzip_no_ext"` to `bloomberg_bbocax_cwiq_pipe_futures_2_0.json`
- `gzip_no_ext` = gzip content + keep original filename (no `.gz` extension)
- Result: output MIME type = `application/gzip` ✅
- Commit: `6aa26f0` on `feature/bbocax-futures`
- This matches existing bbocax pattern (`.cax` files use same compression)

**Compression Pattern (bbocax):**

| Grabber Map | Compression |
|-------------|-------------|
| `*_cax_*.json` | `gzip_no_ext` |
| `*_parquet_*.json` | `none` |
| `*_futures_2_0.json` | `gzip_no_ext` |
| `*_1_0.json` | `none` |

**Flow:**
```
raw/env0/shareFuturesBulkAsia1.dif.gz.enc.20251229
    ↓ (bronze → silver: decrypt + decompress)
silver/2025/12/29/work/053907-0500--shareFuturesBulkAsia1.dif
    ↓ (silver → gold: grabber map transformation)
back_office_futures/2.0/raw/share_futures/2025/20251229/shareFuturesBulkAsia1.dif
```

**Output locations:**
- `bloomberg/back_office_futures/2.0/raw/share_futures/{YYYY}/{YYYYMMDD}/`
- `bloomberg/back_office_futures/2.0/raw/non_share_futures/{YYYY}/{YYYYMMDD}/`

---

### Context from Yesterday

- Cycle duration analysis completed (179 cycles, mean 3.04 min)
- DQ validation **PASSED** (20 dates checked)
- 459 missing `.ndjson` files identified (intentional - not mapped)
- 56 `.cax` type mismatches (expected - gzip vs text/plain)

### Pending from Yesterday

- Review if `.ndjson` outputs should be added to grabber map
- Commit and push data-alchemy changes

---

### bbocax-currency Status

**Branch:** `feature/bbocax-currency`
**Grabber map:** `bloomberg_bbocax_cwiq_pipe_currency_1_0.json`
**MR:** https://git.codewilling.com/data/cwiq-pipe/data-alchemy/-/merge_requests/451

**Session 2 Progress:**
- Switched to `feature/bbocax-currency` branch
- Verified decryption already configured: `curncy_.*\.out\.gz\.enc` in `silver_decrypt_inclusions/bloomberg.json`
- Updated grabber map `validation` field to array format (consistent with newer maps)
- Merged `origin/dev` - resolved conflict in `bloomberg.json` (combined currency + futures patterns)
- Verified legacy shovel output at `/sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_currency/1.0/raw/`
- Split grabber map: `.out` files need `gzip_no_ext`, CSV/Parquet do not
  - `bloomberg_bbocax_cwiq_pipe_currency_1_0.json` → CSV/Parquet (no compression)
  - `bloomberg_bbocax_cwiq_pipe_currency_out_1_0.json` → `.out` files (`gzip_no_ext`)

**Legacy output file types verified:**

| File | MIME Type |
|------|-----------|
| `curncy_asia1.out` | application/gzip (gzip compressed) |
| `curncyAsia1.csv` | application/gzip (gzip compressed) |
| `curncyAsia1.parquet` | Apache Parquet |

**Session 3 Update:** Split grabber maps by file type and compression needs.

**Final Grabber Map Structure (2 maps, 6 patterns):**

| Grabber Map | File Types | Compression | Patterns |
|-------------|------------|-------------|----------|
| `_currency_1_0.json` | `.csv`, `.out` | `gzip_no_ext` | 4 |
| `_currency_parquet_1_0.json` | `.parquet` | none | 2 |

**Pattern Verification:**
- All patterns tested and matching correctly
- Capture groups extract `filename`, `y`, `m`, `d` properly
- Output path: `bloomberg/back_office_currency/1.0/raw/{YYYY}/{YYYYMMDD}/{filename}`

**Local DQ Validation (10 days - 20251105:20251114):**

| Metric | Value |
|--------|-------|
| Dates Checked | 10 |
| Files Checked | 40 |
| Missing Files | 0 ✓ |
| Total Errors | 0 ✓ |
| Status | PASSED |

**Compression Behavior Verified:**

| File Type | Grabber Map | Compression | Output Type |
|-----------|-------------|-------------|-------------|
| `.csv` | `_currency_1_0.json` | `gzip_no_ext` | gzip |
| `.out` | `_currency_1_0.json` | `gzip_no_ext` | gzip |
| `.parquet` | `_currency_parquet_1_0.json` | none | native parquet |

**Pending Decision:**
- DQ type mismatch: comparison `text/plain` vs output `application/gzip`
- Need to verify actual legacy shovel file types on server
- If legacy is `text/plain`, remove `gzip_no_ext` from `_currency_1_0.json`

**Server DQ Results:**
- 9 dates checked
- 90 files missing (only in COMPARISON_FP_PREFIX)
- Source files may not exist in cwiq_pipe/env0 for those dates
- Solution: Rsync from legacy shovel for missing dates

**Commits pushed:**
- `0c7a8be` - feat: update currency grabber map validation format to array
- `5fbd383` - merge: resolve conflict with origin/dev
- `b193dce` - feat: split currency grabber map - gzip_no_ext for .out files only
- `424e944` - feat: add gzip_no_ext compression to currency grabber map
- `9b6ea90` - feat: split currency grabber map - parquet without compression (FINAL)

---

### bbocax-futures Validation Fix

**Branch:** `fix/bbocax-futures-validation`
**Commit:** `d4d46d6`

Fixed `validation` field format from string to array (consistent with other grabber maps).

---

### Rsync Missing Files Workflow

When DQ validation identifies missing files, rsync from legacy shovel to fill gaps:

**For specific date:**
```bash
DATE=20260115
YEAR=2026

# Futures - share_futures
rsync -av /sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_futures/2.0/raw/share_futures/${YEAR}/${DATE}/ \
          /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/${YEAR}/${DATE}/

# Futures - non_share_futures
rsync -av /sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_futures/2.0/raw/non_share_futures/${YEAR}/${DATE}/ \
          /sf/data/bloomberg/back_office_futures/2.0/raw/non_share_futures/${YEAR}/${DATE}/

# Currency
rsync -av /sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_currency/1.0/raw/${YEAR}/${DATE}/ \
          /sf/data/bloomberg/back_office_currency/1.0/raw/${YEAR}/${DATE}/
```

**For today's date:**
```bash
DATE=$(date +%Y%m%d)
YEAR=$(date +%Y)
# ... same rsync commands
```

---

### Currency Source Investigation (Session 4)

**Key Finding:** CSV and parquet files for dates before 20251118 are **NOT in cwiq_pipe**.

**CWIQ_PIPE Source Availability:**

| File Type    | First Date in cwiq_pipe | Available Range |
|--------------|-------------------------|-----------------|
| `.out.gz.enc` | 20251012 or earlier    | All dates       |
| `.csv.gz`     | 20251118               | 20251118+       |
| `.parquet`    | 20251118               | 20251118+       |

**Legacy Shovel Output (15 files/date):**
- curncyAsia1/Asia2/Euro/Lamr/Namr × (.csv, .parquet, .out)

**Data-Alchemy Can Produce (before 20251118):**
- Only `.out` files (5 files/date)

**Root Cause of Missing Files:**
- CSV/parquet for dates < 20251118 are NOT in cwiq_pipe/env0
- Legacy shovel sources CSV/parquet from a **different location** (not cwiq_pipe)

**Recommended DQ Date Range:**
```bash
# Use dates where ALL file types exist in cwiq_pipe
uv run python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --dq --verbose-dq --dq-date-range 20251118:20251230 --file-pattern "curncy"
```

---

### Futures File Count Analysis

**Expected file count:** 38 files/day (20 share_futures + 18 non_share_futures)

**File Count Chart Command:**
```bash
echo "| Date       | share_futures | non_share_futures | Total |" && \
echo "|------------|---------------|-------------------|-------|" && \
for date in $(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/ 2>/dev/null | sort -r | head -15 | sort); do \
  share=$(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/$date/ 2>/dev/null | wc -l); \
  non_share=$(ls /sf/data/bloomberg/back_office_futures/2.0/raw/non_share_futures/2026/$date/ 2>/dev/null | wc -l); \
  total=$((share + non_share)); \
  printf "| %s |      %2d       |        %2d         |  %2d   |\n" "$date" "$share" "$non_share" "$total"; \
done
```

**Find Dates with Unexpected File Count:**
```bash
for date in $(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/ 2>/dev/null | sort); do \
  share=$(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/$date/ 2>/dev/null | wc -l); \
  non_share=$(ls /sf/data/bloomberg/back_office_futures/2.0/raw/non_share_futures/2026/$date/ 2>/dev/null | wc -l); \
  total=$((share + non_share)); \
  if [ "$total" -ne 38 ]; then \
    echo "$date: share=$share, non_share=$non_share, total=$total <- MISMATCH"; \
  fi; \
done
```

**Find Missing Files and Expected Arrival Time:**
```bash
# Compare yesterday vs today to find missing files
missing_files=$(comm -23 <(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/20260114/ | sort) \
                         <(ls /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/20260115/ | sort))

# Check arrival times of missing files over past 3 days
for date in 20260112 20260113 20260114; do \
  echo "--- $date ---"; \
  for file in $missing_files; do \
    ls -la /sf/data/bloomberg/back_office_futures/2.0/raw/share_futures/2026/$date/$file 2>/dev/null | awk '{print $6, $7, $8, "->", $9}'; \
  done | sort; \
done
```

---

### Next Steps

**bbocax-currency:**
- DQ validation should use date range `20251118:20251230` (where all files exist)
- For older dates, rsync from legacy shovel if needed

**bbocax-futures:**
- Monitor daily file counts (expected: 38)
- Files typically arrive in batches - check arrival times if count is low

---
