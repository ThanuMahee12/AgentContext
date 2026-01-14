# :fontawesome-solid-flask: data-alchemy

## :material-console: Important Commands

=== ":material-test-tube: Testing"

    ```bash
    # Run all tests
    cd data-alchemy && uv run pytest tests/*_tests.py

    # Single test
    cd data-alchemy && uv run pytest tests/bronze_tests.py -v
    ```

=== ":material-format-paint: Linting"

    ```bash
    uv run python -m black data_alchemy/
    uv run python -m pylint data_alchemy/
    ```

=== ":material-play: Run Pipeline"

    ```bash
    python -m data_alchemy.main --vendor sp --dataset gics_cwiq_pipe --version 1.0 --backfill 720
    ```

---

## :material-information: Key Notes

!!! info "Pipeline Flow"
    ```
    Bronze → Silver → Gold → Platinum
    ```

!!! tip "Libraries"
    - `attrs` for data classes
    - `polars` for DataFrames
    - `pyarrow` for Parquet I/O

---

## :material-file-tree: Structure

```
data_alchemy/
├── config/          # grabber_maps.py, timezone.py
├── handlers/        # handle_bronze.py, handle_silver.py
├── models/          # models.py (FileMetadata)
├── utils/           # db.py, file_discovery.py
└── main.py          # CLI entry point
```

---

## :material-lightbulb: Learnings

### Decrypt Inclusion Logic

!!! warning "decrypt_filename_patterns = whitelist"
    - Files **IN** list → get decrypted
    - Files **NOT** in list → skipped (stay encrypted)
    - Bloomberg `.gz.enc` files need explicit inclusion

---

## :material-git: bbocax Branch Status

| Branch | Target Dataset | Status |
|--------|----------------|--------|
| `feature/bbocax-currency` | `back_office_currency/1.0` | Done |
| `feature/bbocax-equities` | `back_office_equities/1.0` | Done |
| `feature/bbocax-futures` | `back_office_futures/2.0` | In progress |
| `feature/bbocax-futures-extended` | `back_office_futures_extended/1.0` | TODO |
| `feature/bbocax-preferred-exch` | `back_office_preferred_exch/1.0` | TODO |
| `feature/bbocax-supplemental` | `back_office_supplemental/1.0` | TODO |

---

## :material-folder-outline: bbocax Futures Output Structure

**Target:** `bloomberg/back_office_futures/2.0/raw/`

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
