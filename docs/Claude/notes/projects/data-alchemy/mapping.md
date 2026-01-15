# Mapping

## Approach

### bbocax Mapping

Bloomberg Back Office Corporate Actions (bbocax) files from `bbocax_cwiq_pipe` need to be mapped to multiple target datasets.

---

## Branch Strategy

Each target dataset gets its own feature branch:

| Branch | Target Dataset | Status |
|--------|----------------|--------|
| `feature/bbocax-currency` | `back_office_currency/1.0` | Done |
| `feature/bbocax-equities` | `back_office_equities/1.0` | Done |
| `feature/bbocax-futures` | `back_office_futures/2.0` | In progress |
| `feature/bbocax-futures-extended` | `back_office_futures_extended/1.0` | TODO |
| `feature/bbocax-preferred-exch` | `back_office_preferred_exch/1.0` | TODO |
| `feature/bbocax-supplemental` | `back_office_supplemental/1.0` | TODO |

### Branch Creation Command

```bash
git -C data-alchemy checkout origin/dev -b feature/bbocax-{name}
git -C data-alchemy checkout feature/bbocax-new-mapping -- resc/grabber_maps/bloomberg_bbocax_cwiq_pipe_{name}_1_0.json
git -C data-alchemy add -A
git -C data-alchemy commit -m "feat: add bbocax {name} grabber map"
git -C data-alchemy push -u origin feature/bbocax-{name}
```

---

## File Pattern Details

| Grabber Map | Source Patterns | Extensions |
|-------------|-----------------|------------|
| currency | `curncy*` | .csv, .parquet |
| equities | `equity(?!Options|Index)*`, `equityWarrant*`, `equitySec13f2*` | .csv, .parquet |
| futures | `shareFuturesBulk*`, `nonShareFuturesBulk*` | .dif, .out |
| futures_extended | `shareFuturesExtended*`, `nonShareFuturesExtended*` | .csv, .parquet |
| preferred_exch | `pfdExch*Pricing*`, `pfdExch*HistoricalPricing*` | .csv, .parquet |
| supplemental | `condition_code.out`, `fields.csv`, `fields.dif` | .out, .csv, .dif |

**Pattern features:**

- All patterns handle optional `.gz` suffix: `(?:\.gz)?`
- Files with date suffix (`.csv.20251213`) → extract date from suffix
- Files without date suffix → use silver directory date

---

## Coverage Verification

### data-alchemy handles (from bbocax_cwiq_pipe)

```
/sf/data/bloomberg/back_office_currency/1.0/raw/
/sf/data/bloomberg/back_office_equities/1.0/raw/
/sf/data/bloomberg/back_office_futures/2.0/raw/
/sf/data/bloomberg/back_office_futures_extended/1.0/raw/share_futures_extended/
/sf/data/bloomberg/back_office_futures_extended/1.0/raw/non_share_futures_extended/
/sf/data/bloomberg/back_office_preferred_exch/1.0/raw/
/sf/data/bloomberg/back_office_supplemental/1.0/raw/
```

### sf-migration handles (NOT our scope)

```
/sf/data/bloomberg/back_office_convert_bonds/1.0/raw/
/sf/data/bloomberg/back_office_gov_bonds/1.0/raw/
/sf/data/bloomberg/back_office_preferred_bonds/1.0/raw/
/sf/data/bloomberg/corporate_events_calendar/1.0/raw/
/sf/data/bloomberg/global_economic_indicators/1.0/raw/
/sf/data/bloomberg/market_calendar/1.0/raw/
/sf/data/bloomberg/quantbeam/1.0/raw/
```

### Not mapped (by design)

- `back_office_commodity` - no source files in cwiq-pipe
- `equityOptions`, `equityIndexOptions` - no target directory exists

---

## bbocax-futures (Detail)

**Source:** `bloomberg/bbocax_cwiq_pipe/1.0/silver/`
**Target:** `bloomberg/back_office_futures/2.0/raw/`
**Compression:** `gzip_no_ext` (gzip content, no `.gz` extension)

### Files to Map

| File Pattern | Target Subdirectory |
|--------------|---------------------|
| `shareFuturesBulk*` | `share_futures/YYYY/YYYYMMDD/` |
| `nonShareFuturesBulk*` | `non_share_futures/YYYY/YYYYMMDD/` |

### Grabber Map Patterns (4 total)

1. `shareFuturesBulk` with date suffix (`.dif.20251229`)
2. `shareFuturesBulk` without date suffix (`.dif`)
3. `nonShareFuturesBulk` with date suffix
4. `nonShareFuturesBulk` without date suffix

### Output Structure

=== "share_futures"
    ```
    share_futures/YYYY/YYYYMMDD/
    ├── shareFuturesBulkAsia1.dif/.out
    ├── shareFuturesBulkAsia2.dif/.out
    ├── shareFuturesBulkAsia3.dif/.out
    ├── shareFuturesBulkEuro.dif/.out
    ├── shareFuturesBulkNamr.dif/.out
    ├── shareFuturesBulkOpenAsia1.dif/.out
    ├── shareFuturesBulkOpenAsia2.dif/.out
    ├── shareFuturesBulkOpenAsia3.dif/.out
    ├── shareFuturesBulkOpenEuro.dif/.out
    └── shareFuturesBulkOpenNamr.dif/.out
    ```

=== "non_share_futures"
    ```
    non_share_futures/YYYY/YYYYMMDD/
    ├── nonShareFuturesBulkAsia.dif/.out
    ├── nonShareFuturesBulkEuro.dif/.out
    ├── nonShareFuturesBulkLamr.dif/.out
    ├── nonShareFuturesBulkNamr.dif/.out
    ├── nonShareFuturesBulkOpen1Asia.dif/.out
    ├── nonShareFuturesBulkOpenAsia.dif/.out
    ├── nonShareFuturesBulkOpenEuro.dif/.out
    ├── nonShareFuturesBulkOpenLamr.dif/.out
    └── nonShareFuturesBulkOpenNamr.dif/.out
    ```

---

## Key Concepts

### Gold Layer Compression

Compression is controlled by `metadata.compression` in grabber map JSON files.

| Compression Value | Behavior |
|-------------------|----------|
| `none` | No compression (plain text output) |
| `gzip` | Gzip compress + add `.gz` extension |
| `gzip_no_ext` | Gzip compress + keep original filename |
| `lz4` | LZ4 compress + add `.lz4` extension |

**bbocax compression pattern:**

| Grabber Map | Compression | Reason |
|-------------|-------------|--------|
| `*_cax_*.json` | `gzip_no_ext` | `.cax` files match legacy gzip |
| `*_parquet_*.json` | `none` | Parquet already compressed |
| `*_futures_2_0.json` | `gzip_no_ext` | FuturesBulk match legacy gzip |
| `*_1_0.json` (others) | `none` | Plain text output |

### Decrypt Inclusion Logic

!!! warning "decrypt_filename_patterns = whitelist"
    - Files **IN** list → get decrypted
    - Files **NOT** in list → skipped (stay encrypted)
    - Bloomberg `.gz.enc` files need explicit inclusion in `resc/silver_decrypt_inclusions/bloomberg.json`

### Platinum Output Patterns

| Target | Extensions | Compression |
|--------|------------|-------------|
| `back_office_convert_bonds` | `.dif.gz`, `.out.gz` | Keep compressed + date |
| `back_office_futures` | `.dif`, `.out` | Decompress only |
| `back_office_preferred_exch_corporate_actions` | `.ndjson`, `.parquet`, `.cax` | Transform + raw |

### Files Modified per Dataset

1. **Grabber Map:** `resc/grabber_maps/bloomberg_bbocax_cwiq_pipe_{dataset}_{version}.json`
2. **Decrypt Inclusion:** `resc/silver_decrypt_inclusions/bloomberg.json` (if encrypted)

---

## Reference

### Source Branch (all maps)

**Branch:** `feature/bbocax-new-mapping`

Contains all 6 grabber maps (split into individual branches for MRs)

### Key Files

- `tfe-cdp-shovel/shovel/dataset_mapping/bbo.py` - shovel mapping logic
- `tfe-cdp-shovel/shovel/dataset_mapping/bbo_product_mapping.json` - 544 table→subproduct mappings
- `/sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_*` - platinum output structure

---
