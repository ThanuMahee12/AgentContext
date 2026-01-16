# PathSeeker

CLI tool for path analysis and pattern extraction.

## Problem

How do we analyze directory structures and extract reusable regex/glob patterns?

```
Input: /sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/2025/11/28/070847--file.tar.gz
Output: /sf/data/{vendor}/{dataset}/{version}/bronze/{YYYY}/{MM}/{DD}/{HHMMSS}--{filename}
```

## Full Architecture

### System Overview

```mermaid
flowchart TB
    subgraph Input["Input"]
        DIR[Directory Path]
        OPTS[CLI Options]
    end

    subgraph Core["Core Engine"]
        direction TB
        VAL[Validator]
        TREE[PathTree Builder]
        WALK[BFS Walker]

        VAL --> TREE --> WALK
    end

    subgraph Analysis["Analysis"]
        direction TB
        SEG[Segment Analyzer]
        TYPE[Type Classifier]

        SEG --> TYPE
    end

    subgraph Extraction["Pattern Extraction"]
        direction TB
        REGEX[Regex Extractor]
        GLOB[Glob Extractor]

        REGEX
        GLOB
    end

    subgraph Output["Output"]
        CONSOLE[Console]
        FILE[File]
        JSON[JSON]
    end

    DIR --> VAL
    OPTS --> VAL
    WALK --> SEG
    TYPE --> REGEX
    TYPE --> GLOB
    REGEX --> CONSOLE
    REGEX --> FILE
    GLOB --> CONSOLE
    GLOB --> FILE
```

### Component Diagram

```mermaid
flowchart LR
    subgraph CLI["pathseek.py"]
        MAIN[main]
        SCAN[scan command]
        CONVERT[convert command]
    end

    subgraph Util["util/"]
        PT[path_tree.py]
        VL[validators.py]
        OU[output_utils.py]
    end

    subgraph Extractors["extractors/"]
        AN[analyzer.py]
        GE[glob_extractor.py]
        RE[regex_extractor.py]
    end

    MAIN --> SCAN
    MAIN --> CONVERT
    SCAN --> PT
    SCAN --> VL
    SCAN --> AN
    SCAN --> GE
    SCAN --> RE
    CONVERT --> AN
    AN --> GE
    AN --> RE
    GE --> OU
    RE --> OU
```

### PathTree Structure

```mermaid
classDiagram
    class PathNode {
        +Path path
        +str name
        +bool is_dir
        +int depth
        +PathNode parent
        +list children
        +add_child()
        +get_full_path()
    }

    class PathTree {
        +PathNode root
        +int max_depth
        +build_tree()
        +walk_bfs()
        +walk_dfs()
        +get_all_files()
        +get_all_dirs()
    }

    class SegmentAnalyzer {
        +analyze_path()
        +classify_segment()
        +get_segment_type()
    }

    class GlobExtractor {
        +extract_simple()
        +extract_medium()
        +extract_advanced()
    }

    class RegexExtractor {
        +extract_pattern()
        +extract_named_groups()
        +combine_patterns()
    }

    PathTree "1" --> "*" PathNode
    PathNode "1" --> "*" PathNode : children
    PathTree --> SegmentAnalyzer
    SegmentAnalyzer --> GlobExtractor
    SegmentAnalyzer --> RegexExtractor
```

### Segment Analysis Flow

```mermaid
flowchart TD
    INPUT[/"sf/data/bloomberg/2025/11/28/file.csv"/]

    subgraph Segmentation["Split into segments"]
        S1[sf]
        S2[data]
        S3[bloomberg]
        S4[2025]
        S5[11]
        S6[28]
        S7[file.csv]
    end

    subgraph Classification["Classify each segment"]
        C1["LITERAL"]
        C2["LITERAL"]
        C3["VARIABLE"]
        C4["DIGITS (YYYY)"]
        C5["DIGITS (MM)"]
        C6["DIGITS (DD)"]
        C7["FILE_EXT (.csv)"]
    end

    subgraph PatternGen["Generate patterns"]
        P1["sf"]
        P2["data"]
        P3["[^/]+"]
        P4["\d{4}"]
        P5["\d{2}"]
        P6["\d{2}"]
        P7[".*\.csv"]
    end

    INPUT --> Segmentation
    S1 --> C1 --> P1
    S2 --> C2 --> P2
    S3 --> C3 --> P3
    S4 --> C4 --> P4
    S5 --> C5 --> P5
    S6 --> C6 --> P6
    S7 --> C7 --> P7

    OUTPUT[/"sf/data/[^/]+/\d{4}/\d{2}/\d{2}/.*\.csv"/]
    P1 & P2 & P3 & P4 & P5 & P6 & P7 --> OUTPUT
```

### Extraction Modes

```mermaid
flowchart LR
    subgraph Input
        PATH[/data/vendor/2025/file.csv]
    end

    subgraph Simple["SIMPLE Mode"]
        SIM["data/*/2025/*.csv"]
    end

    subgraph Medium["MEDIUM Mode"]
        MED["data/{vendor}/{YYYY}/{filename}.csv"]
    end

    subgraph Advanced["ADVANCED Mode"]
        ADV["data/(?P<vendor>[^/]+)/(?P<year>\d{4})/(?P<file>.*\.csv)"]
    end

    PATH --> Simple
    PATH --> Medium
    PATH --> Advanced
```

## Data Structures

### SegmentType Enum

```python
class SegmentType(Enum):
    LITERAL = "literal"       # Exact match: "data", "sf"
    DIGITS = "digits"         # Numeric: "2025", "11", "28"
    VARIABLE = "variable"     # Dynamic: vendor names, dataset names
    FILE_EXT = "file_ext"     # Extensions: ".csv", ".json"
    HIDDEN = "hidden"         # Hidden files: ".git", ".env"
    TIMESTAMP = "timestamp"   # Time patterns: "070847", "235959"
    DATE = "date"             # Date patterns: "20251128"
    UUID = "uuid"             # UUID patterns
    HASH = "hash"             # Hash patterns: MD5, SHA
```

### PathNode Class

```python
@dataclass(slots=True)
class PathNode:
    path: Path
    name: str
    is_dir: bool
    depth: int
    parent: Optional["PathNode"] = None
    children: list["PathNode"] = field(default_factory=list)

    def add_child(self, node: "PathNode") -> None:
        node.parent = self
        self.children.append(node)

    def get_full_path(self) -> str:
        return str(self.path)
```

## CLI Reference

### Commands

```bash
# Scan command
pathseek scan <path> [options]

# Convert command
pathseek convert <pattern> --from <format> --to <format>
```

### Scan Options

| Flag | Description | Example |
|------|-------------|---------|
| `-L, --depth` | Max depth | `-L 3` |
| `-t, --type` | File type filter | `-t f` (files), `-t d` (dirs) |
| `-r, --regex` | Output as regex | `--regex` |
| `-g, --glob` | Output as glob | `--glob` |
| `-p, --per-path` | Pattern per path | `--per-path` |
| `-s, --single` | Single combined pattern | `--single` |
| `-u, --unique` | Unique patterns only | `--unique` |
| `-c, --count` | Count only | `--count` |
| `-o, --output` | Output file | `-o patterns.txt` |
| `-m, --mode` | Extraction mode | `-m advanced` |

### Examples

```bash
# Basic scan
pathseek scan /sf/data/bloomberg -L 3

# Extract regex patterns
pathseek scan /sf/data/bloomberg -r -s -m advanced

# Save glob patterns to file
pathseek scan /sf/data/bloomberg -g -p -o patterns.txt

# Count files by pattern
pathseek scan /sf/data/bloomberg -c --group-by pattern

# Convert between formats
pathseek convert "data/*/2025/*.csv" --from glob --to regex
```

## Output Examples

### Per-path Output

```
/sf/data/bloomberg/bbocax_cwiq_pipe/1.0/bronze/2025/11/28/070847--file.tar.gz
  glob:  sf/data/*/*/*/*/bronze/[0-9][0-9][0-9][0-9]/[0-9][0-9]/[0-9][0-9]/*--*.tar.gz
  regex: sf/data/[^/]+/[^/]+/[^/]+/bronze/\d{4}/\d{2}/\d{2}/\d{6}--.*\.tar\.gz
```

### Combined Output

```
Pattern: sf/data/{vendor}/{dataset}/{version}/bronze/{YYYY}/{MM}/{DD}/{HHMMSS}--{filename}
Matches: 1,234 files
```

### JSON Output

```json
{
  "input_path": "/sf/data/bloomberg",
  "scan_depth": 3,
  "total_files": 1234,
  "total_dirs": 56,
  "patterns": [
    {
      "glob": "sf/data/*/*/bronze/*/*/*/*.tar.gz",
      "regex": "sf/data/[^/]+/[^/]+/bronze/\\d{4}/\\d{2}/\\d{2}/.*\\.tar\\.gz",
      "match_count": 890,
      "example": "sf/data/bloomberg/bbocax/bronze/2025/11/28/file.tar.gz"
    }
  ]
}
```

## Integration with Investigation DB

```mermaid
flowchart LR
    subgraph PathSeeker
        PS[pathseek scan]
        PAT[Extracted Patterns]
    end

    subgraph InvestigationDB
        PR[(pattern_registry)]
        TR[(transformations)]
    end

    PS --> PAT
    PAT -->|"export"| PR
    PAT -->|"transform rules"| TR
```

### Export to Investigation DB

```bash
# Extract patterns and export to SQL
pathseek scan /sf/data --export-sql patterns.sql

# Export as JSON for import
pathseek scan /sf/data -o patterns.json --format json
```

## Project Structure

```
pathseek/
├── pathseek.py              # CLI entry point
├── __init__.py
├── util/
│   ├── __init__.py
│   ├── path_tree.py         # PathNode, PathTree classes
│   ├── validators.py        # Input validation
│   └── output_utils.py      # Output formatting
├── extractors/
│   ├── __init__.py
│   ├── analyzer.py          # SegmentType, segment analysis
│   ├── glob_extractor.py    # Glob pattern generation
│   └── regex_extractor.py   # Regex pattern generation
├── tests/
│   ├── test_path_tree.py
│   ├── test_analyzer.py
│   └── test_extractors.py
├── pyproject.toml
└── README.md
```

## Technologies

| Component | Technology |
|-----------|------------|
| Language | Python 3.13+ |
| Dependencies | None (stdlib only) |
| CLI | argparse |
| Data Classes | dataclasses with slots |
| Path Handling | pathlib |
| Linting | ruff |
| Testing | pytest |
| Package Manager | uv |

## Roadmap

```mermaid
gantt
    title PathSeeker Development
    dateFormat  YYYY-MM-DD
    section Core
    PathTree & BFS          :done, 2026-01-01, 7d
    Validators              :done, 2026-01-08, 3d
    section Analysis
    Segment Analyzer        :done, 2026-01-11, 5d
    Type Classification     :active, 2026-01-16, 5d
    section Extraction
    Glob Extractor          :2026-01-21, 5d
    Regex Extractor         :2026-01-26, 5d
    section Integration
    CLI Polish              :2026-02-01, 3d
    Investigation DB Export :2026-02-04, 3d
```

## Status

| Component | Status |
|-----------|--------|
| PathTree | Complete |
| BFS Walker | Complete |
| Validators | Complete |
| Segment Analyzer | Complete |
| Type Classifier | In Progress |
| Glob Extractor | Planned |
| Regex Extractor | Planned |
| CLI | Basic |
| Tests | Partial |
