# Bloomberg BBOCAX File Patterns Reference

All patterns for splitting `bbocax_cwiq_pipe` into separate platinum datasets.

## Currently Implemented (Split Services)

### 1. back_office_futures
```
(share|nonShare)FuturesBulk
```
**Files:**
- `shareFuturesBulkAsia1.dif`, `shareFuturesBulkAsia1.out`
- `shareFuturesBulkEuro.dif`, `shareFuturesBulkEuro.out`
- `nonShareFuturesBulkAsia.dif`, `nonShareFuturesBulkAsia.out`
- `nonShareFuturesBulkNamr.dif`, `nonShareFuturesBulkNamr.out`

### 2. corporate_actions
```
(equity_(asia1|asia2|euro|lamr|namr)\.cax|(equity|effDt).+CorporateActions)
```
**Files:**
- `equity_asia1.cax`, `equity_asia2.cax`, `equity_euro.cax`, `equity_lamr.cax`, `equity_namr.cax`
- `equityAsia1CorporateActions.parquet`, `equityAsia2CorporateActions.parquet`
- `effDtEquityAsia1CorporateActionsCorporateActions.parquet`
- `effDtPfdExchAsiaCorporateActionsCorporateActions.parquet`

### 3. back_office_preferred_exch_corporate_actions
```
(pfdExch(Asia|Euro|Lamr|Namr)CorporateActions|pfd_exch_(asia|euro|lamr|namr)\.cax)
```
**Files:**
- `pfdExchAsiaCorporateActions.parquet`, `pfdExchEuroCorporateActions.parquet`
- `pfd_exch_asia.cax`, `pfd_exch_euro.cax`, `pfd_exch_lamr.cax`, `pfd_exch_namr.cax`

---

## Future Services (Patterns Ready)

### 4. back_office_equities
```
(equity(Asia1|Asia2|Euro|Lamr|Namr|MifidEuro)(Cins|Pricing|HistoricalPricing|RecapPricing)?(?!CorporateActions)|equity_(asia1|asia2|euro|lamr|namr|mifid_euro)(_cins)?\.(dif|out|px))
```
**Files:**
- `equityAsia1.csv`, `equityAsia1.parquet`
- `equity_asia1.dif`, `equity_asia1.out`
- `equityAsia1Cins.csv`, `equityAsia1Cins.parquet`
- `equityAsia1Pricing.csv`, `equityAsia1Pricing.parquet`
- `equityAsia1HistoricalPricing.parquet`
- `equityAsia1RecapPricing.parquet`
- `equityMifidEuro.csv`, `equityMifidEuro.parquet`

**Simpler pattern (if no overlap issues):**
```
equity.*(Asia1|Asia2|Euro|Lamr|Namr|MifidEuro)(?!.*CorporateActions)
```

### 5. back_office_preferred_exch
```
(pfdExch(Asia|Euro|Lamr|Namr)(Cins|Pricing|HistoricalPricing)?(?!CorporateActions)|pfd_exch_(asia|euro|lamr|namr)(_cins|_bbid)?\.(dif|out|px))
```
**Files:**
- `pfdExchAsia.csv`, `pfdExchAsia.parquet`
- `pfd_exch_asia.dif`, `pfd_exch_asia.out`
- `pfdExchAsiaCins.csv`, `pfdExchAsiaCins.parquet`
- `pfdExchAsiaPricing.csv`, `pfdExchAsiaPricing.parquet`
- `pfdExchAsiaHistoricalPricing.parquet`
- `pfd_exch_asia_bbid.dif`, `pfd_exch_asia_bbid.out`

**Simpler pattern (if no overlap issues):**
```
pfdExch.*(Asia|Euro|Lamr|Namr)(?!.*CorporateActions)
```

### 6. back_office_futures_extended
```
(share|nonShare)FuturesExtended
```
**Files:**
- `shareFuturesExtendedAsia1.csv`, `shareFuturesExtendedAsia1.parquet`
- `shareFuturesExtendedAsia1.dif`, `shareFuturesExtendedAsia1.out`
- `nonShareFuturesExtendedAsia.csv`, `nonShareFuturesExtendedAsia.parquet`
- `nonShareFuturesExtendedNamr.csv`, `nonShareFuturesExtendedNamr.parquet`
- V2/V3 variants: `shareFuturesExtendedEuroV2.parquet`, `nonShareFuturesExtendedEuroV3.parquet`

---

## Dataset Separation Matrix

| Pattern Keyword | back_office_futures | back_office_futures_extended | corporate_actions | back_office_equities | back_office_preferred_exch | back_office_preferred_exch_corporate_actions |
|-----------------|---------------------|------------------------------|-------------------|----------------------|---------------------------|---------------------------------------------|
| `FuturesBulk` | ✓ | | | | | |
| `FuturesExtended` | | ✓ | | | | |
| `equity_*.cax` | | | ✓ | | | |
| `*CorporateActions` | | | ✓ | | | ✓ |
| `equity*.{csv,parquet,dif,out}` | | | | ✓ | | |
| `pfdExch*CorporateActions` | | | | | | ✓ |
| `pfd_exch_*.cax` | | | | | | ✓ |
| `pfdExch*.{csv,parquet}` (no CA) | | | | | ✓ | |
| `pfd_exch_*.{dif,out}` | | | | | ✓ | |

---

## Notes

1. **Negative lookahead**: Use `(?!CorporateActions)` to exclude CorporateActions files
2. **Region codes**: Asia, Asia1, Asia2, Euro, Lamr, Namr, MifidEuro
3. **File extensions**:
   - Raw: `.dif`, `.out`, `.px`, `.px.hpc`, `.rpx`
   - Processed: `.csv`, `.parquet`, `.cax`
4. **Version suffixes**: V2, V3 for newer versions
5. **Pricing variants**: Pricing, HistoricalPricing, RecapPricing

## Service File Template

```ini
Environment=VENDOR=bloomberg
Environment=DATASET=bbocax_cwiq_pipe
Environment=VERSION=1.0
Environment=DB_NAME={vendor}--{ds}--{platinum_dataset_name}
Environment="FILE_PATTERN={pattern}"
```
