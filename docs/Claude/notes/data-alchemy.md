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

<!-- Add important learnings here -->

- [ ] Add learnings as you discover them
