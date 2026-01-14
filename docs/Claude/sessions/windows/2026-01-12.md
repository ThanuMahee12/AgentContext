# 2026-01-12

## Project: pathseek

**Repo:** https://github.com/ThanuMahee12/pathseek

**Environment:** Windows machine (`w-` prefix)

### Progress Today

**Session 1:**
- Validators, path_tree, argparse setup
- Tests for validators and path_tree

**Session 2:**
- Python 3.13, pylintrc, pre-commit hooks
- CI/CD pipeline (PR only)

**Session 3:**
- Added `-o` flag, `output_utils.py`
- Subcommands: `scan`, `convert`
- Parent parser for common flags (`-r`, `-g`, `-o`)

**Session 4 (latest):**
- Discussed glob modes: simple, medium, advanced
- Added `--mode` / `-m` flag (s/m/a)
- Created `extractors/` package:
  - `analyzer.py` - SegmentType enum, analyze_segment(), analyze_path()
  - `glob_extractor.py` - GlobMode enum, simple_glob()

### Current Structure

```
pathseek/
├── extractors/
│   ├── __init__.py
│   ├── analyzer.py        # SegmentType, analyze_segment(), analyze_path()
│   └── glob_extractor.py  # GlobMode, simple_glob()
├── util/
│   ├── validators.py
│   ├── path_tree.py
│   └── output_utils.py
├── tests/
├── pathseek.py
└── ...
```

### Glob Modes

| Mode | Flag | Pattern |
|------|------|---------|
| Simple | `-m s` | `*`, `*.csv` |
| Medium | `-m m` | `*_*`, `*-*-*` |
| Advanced | `-m a` | `[0-9][0-9]`, `[a-z]` |

### Analyzer Logic

```
/sf/data/bloomberg/bbocax_best/2025/01/file.csv
                    ↓ analyze_path()
[
  {sf, LITERAL},
  {data, LITERAL},
  {bloomberg, LITERAL},
  {bbocax_best, VARIABLE},   # has _
  {2025, DIGITS},
  {01, DIGITS},
  {file.csv, FILE_EXT},
]
                    ↓ simple_glob()
/sf/data/bloomberg/*/2025/01/*.csv
```

### SegmentType Enum

| Type | Detection | Example |
|------|-----------|---------|
| LITERAL | pure letters | `data`, `bloomberg` |
| DIGITS | all digits | `2025`, `01` |
| VARIABLE | has `_` or `-` | `bbocax_best` |
| FILE_EXT | has `.ext` | `file.csv` |
| HIDDEN | starts with `.` | `.env` |

### Next

- **Define scope** - determine output format, use cases
- Connect analyzer to glob_extractor
- Update simple_glob() to use SegmentAnalysis
- Add medium_glob(), advanced_glob()
- Wire to CLI convert command

### Scope (Decided)

**Core approach:** Regex first, glob = conversion from regex

```
path → patternfinder (regex) → output regex (-r)
                             → convert to glob (-g)
```

**Regex Modes:**

| Mode | Pattern | Example `2025` | Use |
|------|---------|----------------|-----|
| Simple | `\d+`, `\w+` | `\d+` | Quick match |
| Medium | `\d{4}`, `\d{2}` | `\d{4}` | Standard ✓ |
| Advanced | `20[0-2][0-9]` | `20[0-2][0-9]` | Precise range |

**Medium = Standard** - `\d{4}`, `\d{2}` most common use case

**Glob conversion from regex:**

| Regex | Glob |
|-------|------|
| `\d+` | `*` |
| `\d{4}` | `????` or `*` |
| `[0-9][0-9]` | `[0-9][0-9]` |
| `\w+\.csv` | `*.csv` |

**Structure:**
```
extractors/
├── patternfinder.py   # core: build regex pattern
└── to_glob.py         # convert regex → glob
```

**Batch/Multi-path → Alternation:**
```
a.csv, b.csv, c.csv → (a|b|c)\.csv
```

| Flag | Output |
|------|--------|
| `-r` | `\w+\.csv` (generic) |
| `-r --unique` | `(a\|b\|c)\.csv` (exact) |

**Default:** Medium mode (`-m m`) with `\d{4}`, `\d{2}`

---
