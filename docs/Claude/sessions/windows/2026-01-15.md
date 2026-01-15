# 2026-01-15

## Project: data-alchemy

**Repo:** alchmy

**Environment:** Windows machine

**Branch:** `feature/bbocax-futures` (data-alchemy submodule)

### Progress Today

**Session 1:**
- Switched to `feature/bbocax-futures` branch
- Preparing command for real server testing with backfill 2000

### Commands

```bash
# bbocax-futures real server test
uv run python -m data_alchemy.main --vendor bloomberg --dataset bbocax_cwiq_pipe --version 1.0 --backfill 2000 --pattern "shareFuturesBulk|nonShareFuturesBulk"
```

### Next

- Run pipeline on real server
- Verify output in `bloomberg/back_office_futures/2.0/raw/`
- Check share_futures/ and non_share_futures/ subdirectories

---
