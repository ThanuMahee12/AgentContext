# 2026-01-12

## Project: data-alchemy (bbocax mapping)

**Environment:** Linux machine (`l-` prefix)

**Continued from:** w-2026-01-11 (bbocax mapping section)

---

### Summary

1. Created 6 grabber maps for bbocax_cwiq_pipe → back_office_* targets
2. Verified target structure from `/sf/proj/data_alchemy/assets/cdp_out/bloomberg/`
3. Verified no overlap with sf-storage-migration targets
4. Fixed alerting dataset name in logs (`feature/alerting-datasetname`)
5. Started splitting grabber maps into separate branches (1 done: currency)

---

### Grabber Maps Split into Branches

Need to create separate branch for each grabber map from `origin/dev`:

| Branch | Grabber Map | Target | Status |
|--------|-------------|--------|--------|
| `feature/bbocax-currency` | `bloomberg_bbocax_cwiq_pipe_currency_1_0.json` | back_office_currency/1.0/raw/ | ✅ DONE |
| `feature/bbocax-equities` | `bloomberg_bbocax_cwiq_pipe_equities_1_0.json` | back_office_equities/1.0/raw/ | ✅ DONE |
| `feature/bbocax-futures` | `bloomberg_bbocax_cwiq_pipe_futures_1_0.json` | back_office_futures/1.0/raw/ | ⏳ TODO |
| `feature/bbocax-futures-extended` | `bloomberg_bbocax_cwiq_pipe_futures_extended_1_0.json` | back_office_futures_extended/1.0/raw/ | ⏳ TODO |
| `feature/bbocax-preferred-exch` | `bloomberg_bbocax_cwiq_pipe_preferred_exch_1_0.json` | back_office_preferred_exch/1.0/raw/ | ⏳ TODO |
| `feature/bbocax-supplemental` | `bloomberg_bbocax_cwiq_pipe_supplemental_1_0.json` | back_office_supplemental/1.0/raw/ | ⏳ TODO |

**Command pattern to create branch:**
```bash
git -C /home/thanumahee/dev/alchmy/data-alchemy checkout origin/dev -b feature/bbocax-{name}
git -C /home/thanumahee/dev/alchmy/data-alchemy checkout feature/bbocax-new-mapping -- resc/grabber_maps/bloomberg_bbocax_cwiq_pipe_{name}_1_0.json
git -C /home/thanumahee/dev/alchmy/data-alchemy add -A
git -C /home/thanumahee/dev/alchmy/data-alchemy commit -m "feat: add bbocax {name} grabber map"
git -C /home/thanumahee/dev/alchmy/data-alchemy push -u origin feature/bbocax-{name}
```

---

### Alerting Fix (feature/alerting-datasetname)

**Issue:** Logs showed `[vendor]` instead of `[vendor/dataset]`

**Root cause:** `init_db()` was called AFTER `logger.info()` in Bronze/Silver/Gold phases

**Fix:** Moved `init_db()` before `logger.info()` so context is set before logging

**Commit:** `f289293 fix: move init_db before logging to set vendor/dataset context`

**MR:** https://git.codewilling.com/data/cwiq-pipe/data-alchemy/-/merge_requests/395

**Before:**
```
[lseg_refinitiv] Bronze ✗ InstitutionalT3Archive...
```

**After:**
```
[lseg_refinitiv/street_events_cwiq_pipe] Bronze ✗ InstitutionalT3Archive...
```

---

### Coverage Verification (data-alchemy vs sf-migration)

**data-alchemy handles (from bbocax_cwiq_pipe):**
```
/sf/data/bloomberg/back_office_currency/1.0/raw/
/sf/data/bloomberg/back_office_equities/1.0/raw/
/sf/data/bloomberg/back_office_futures/1.0/raw/
/sf/data/bloomberg/back_office_futures_extended/1.0/raw/share_futures_extended/
/sf/data/bloomberg/back_office_futures_extended/1.0/raw/non_share_futures_extended/
/sf/data/bloomberg/back_office_preferred_exch/1.0/raw/
/sf/data/bloomberg/back_office_supplemental/1.0/raw/
```

**sf-migration handles (from /mktdata/BLOOMBERG/ - NOT our scope):**
```
/sf/data/bloomberg/back_office_convert_bonds/1.0/raw/
/sf/data/bloomberg/back_office_gov_bonds/1.0/raw/
/sf/data/bloomberg/back_office_preferred_bonds/1.0/raw/
/sf/data/bloomberg/corporate_events_calendar/1.0/raw/
/sf/data/bloomberg/global_economic_indicators/1.0/raw/
/sf/data/bloomberg/market_calendar/1.0/raw/
/sf/data/bloomberg/quantbeam/1.0/raw/
```

**Not mapped (by design):**
- `back_office_commodity` - no source files in cwiq-pipe
- `equityOptions`, `equityIndexOptions` - no target directory exists

---

### File Pattern Details

| Grabber Map | Source Patterns | Extensions |
|-------------|-----------------|------------|
| currency | `curncy*` | .csv, .parquet |
| equities | `equity(?!Options|Index)*`, `equityWarrant*`, `equitySec13f2*` | .csv, .parquet |
| futures | `globalShareFuturesSanctions*` | .csv, .parquet |
| futures_extended | `shareFuturesExtended*` → `share_futures_extended/`, `nonShareFuturesExtended*` → `non_share_futures_extended/` | .csv, .parquet |
| preferred_exch | `pfdExch*Pricing*`, `pfdExch*HistoricalPricing*` | .csv, .parquet |
| supplemental | `condition_code.out`, `fields.csv`, `fields.dif` | .out, .csv, .dif |

**Pattern features:**
- All patterns handle optional `.gz` suffix: `(?:\.gz)?`
- Files with date suffix (`.csv.20251213`) → extract date from suffix
- Files without date suffix → use silver directory date

---

### Source Branch with All Maps

**Branch:** `feature/bbocax-new-mapping`

**Contains all 6 grabber maps** (but also has ACL-related commits mixed in, so splitting into individual branches)

---

### Next Steps

1. Create remaining 4 branches: futures, futures_extended, preferred_exch, supplemental
2. Test pipeline with each grabber map
3. Create MRs for each branch
4. Merge alerting fix MR

---
