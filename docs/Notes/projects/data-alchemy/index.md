# data-alchemy

Core data processing engine (Bronze → Silver → Gold → Platinum).

---

## Table of Contents

| Topic | Description |
|-------|-------------|
| [Mapping](mapping.md) | Grabber maps, bbocax approach, decrypt logic |
| [DevOps](Devops.md) | ACL permissions, deployment, CLI tools |

---

## Commands

=== "Testing"

    ```bash
    cd data-alchemy && uv run pytest tests/*_tests.py
    ```

=== "Linting"

    ```bash
    uv run python -m black data_alchemy/
    uv run python -m pylint data_alchemy/
    ```

=== "Run Pipeline"

    ```bash
    python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --backfill 720
    ```

---

## Key Notes

!!! info "Pipeline Flow"
    ```
    Bronze → Silver → Gold → Platinum
    ```

!!! tip "Libraries"
    - `attrs` for data classes
    - `polars` for DataFrames
    - `pyarrow` for Parquet I/O

---

## Structure

```
data_alchemy/
├── config/          # grabber_maps.py, timezone.py
├── handlers/        # handle_bronze.py, handle_silver.py
├── models/          # models.py (FileMetadata)
├── utils/           # db.py, file_discovery.py
└── main.py          # CLI entry point
```

---
