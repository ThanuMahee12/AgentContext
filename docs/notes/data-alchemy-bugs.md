# Data Alchemy Bugs

Tracking bugs found in data-alchemy for future fixes.

---

## 1. `--file-pattern` and `--file-patterns` Silent Overwrite

**Location:** `data_alchemy/main.py:626-633`

**Issue:** When both `--file-pattern` and `--file-patterns` are used together, `--file-patterns` silently overwrites `--file-pattern` with no warning.

**Code:**
```python
# Handle --file-patterns: combine multiple patterns into single regex with OR
if file_patterns:
    file_pattern = "|".join(file_patterns)  # OVERWRITES --file-pattern!
```

**Example:**
```bash
python -m data_alchemy.main \
  --file-pattern ".*calendar.*" \
  --file-patterns ".*equity.*" --file-patterns ".*futures.*"
```

- **Expected:** `.*calendar.*|.*equity.*|.*futures.*`
- **Actual:** `.*equity.*|.*futures.*` (calendar pattern lost!)

**Fix Options:**

1. **Error when both used:**
```python
if file_pattern and file_patterns:
    raise typer.BadParameter("Cannot use both --file-pattern and --file-patterns")
```

2. **Combine them:**
```python
if file_patterns:
    combined = "|".join(file_patterns)
    file_pattern = f"{file_pattern}|{combined}" if file_pattern else combined
```

**Status:** Not fixed
**Found:** 2026-03-18
**Branch:** feature/test-bbocax
