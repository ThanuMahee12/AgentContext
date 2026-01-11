# data-alchemy

## Important Commands

```bash
# Run tests
cd data-alchemy && uv run pytest tests/*_tests.py

# Lint
uv run python -m black data_alchemy/
uv run python -m pylint data_alchemy/

# Full pipeline
python -m data_alchemy.main --vendor sp --dataset gics_cwiq_pipe --version 1.0 --backfill 720
```

## Key Notes

- Bronze -> Silver -> Gold -> Platinum pipeline
- Uses `attrs` for data classes, `polars` for DataFrames
- Grabber maps in `resc/grabber_maps/`

## Learnings

<!-- Add important learnings here -->
