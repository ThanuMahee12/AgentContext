# Mapping

## Approach

### bbocax Mapping

Bloomberg Back Office Corporate Actions (bbocax) files from `bbocax_cwiq_pipe` need to be mapped to multiple target datasets.

#### Branch Strategy

Each target dataset gets its own feature branch:

| Branch | Target Dataset | Status |
|--------|----------------|--------|
| `feature/bbocax-currency` | `back_office_currency/1.0` | Done |
| `feature/bbocax-equities` | `back_office_equities/1.0` | Done |
| `feature/bbocax-futures` | `back_office_futures/2.0` | In progress |
| `feature/bbocax-futures-extended` | `back_office_futures_extended/1.0` | TODO |
| `feature/bbocax-preferred-exch` | `back_office_preferred_exch/1.0` | TODO |
| `feature/bbocax-supplemental` | `back_office_supplemental/1.0` | TODO |

---

### bbocax-futures

**Source:** `bloomberg/bbocax_cwiq_pipe/1.0/silver/`
**Target:** `bloomberg/back_office_futures/2.0/raw/`

#### Files to Map

| File Pattern | Target Subdirectory |
|--------------|---------------------|
| `shareFuturesBulk*` | `share_futures/YYYY/YYYYMMDD/` |
| `nonShareFuturesBulk*` | `non_share_futures/YYYY/YYYYMMDD/` |

#### Grabber Map Patterns (4 total)

1. `shareFuturesBulk` with date suffix (`.dif.20251229`)
2. `shareFuturesBulk` without date suffix (`.dif`)
3. `nonShareFuturesBulk` with date suffix
4. `nonShareFuturesBulk` without date suffix

#### Output Structure

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

### Decrypt Inclusion Logic

!!! warning "decrypt_filename_patterns = whitelist"
    - Files **IN** list → get decrypted
    - Files **NOT** in list → skipped (stay encrypted)
    - Bloomberg `.gz.enc` files need explicit inclusion in `resc/silver_decrypt_inclusions/bloomberg.json`

### Files Modified per Dataset

1. **Grabber Map:** `resc/grabber_maps/bloomberg_bbocax_cwiq_pipe_{dataset}_{version}.json`
2. **Decrypt Inclusion:** `resc/silver_decrypt_inclusions/bloomberg.json` (if encrypted)

---
