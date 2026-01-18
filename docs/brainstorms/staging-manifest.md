# Staging Manifest - Complete Design Document

**Date:** 2026-01-18
**Status:** Brainstorm
**Author:** Session with Claude

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Solutions Explored](#solutions-explored)
4. [Why Watchdog/Inotifywait Don't Work](#why-watchdoginotifywait-dont-work)
5. [The Simple Solution](#the-simple-solution)
6. [Implementation Details](#implementation-details)
7. [Benefits](#benefits)

---

## Problem Statement

### Current Situation

```mermaid
flowchart LR
    subgraph CURRENT["Current: Single Monolithic Process"]
        A["Files arrive"] --> B["data-alchemy cycle"]
        B --> C["discover → tree → bronze → silver → gold"]
    end
```

**Issues:**
- Everything happens in one process
- No visibility before files are processed
- Can't preview/sample files before prod moves them
- No staging layer for validation

### What We Want

```mermaid
flowchart LR
    subgraph WANTED["Wanted: Staging + Prod Separation"]
        A["Files arrive"] --> B["Staging: scan & sample"]
        B --> C["Prod: process files"]
        B --> D["Sample files for preview"]
    end
```

**Goals:**
- Separate staging from production
- Sample files WITHOUT copying TBs of data
- No impact on prod performance
- Track what was processed (raw → bronze mapping)

---

## Root Cause Analysis

### Why Can't We Just Scan Raw Files?

```mermaid
flowchart TB
    subgraph PROBLEM["The Problem"]
        P1["Files can be TB in size"]
        P2["Millions of files per hour"]
        P3["Can't copy to temp for scanning"]
        P4["Scanning in prod cycle slows it down"]
    end

    P1 --> RESULT["Can't do traditional staging"]
    P2 --> RESULT
    P3 --> RESULT
    P4 --> RESULT
```

### Scale Challenges

| Challenge | Impact |
|-----------|--------|
| TB-sized files | Can't copy to temp location |
| Millions of files/hour | Can't process all proactively |
| Prod cycle every 5 min | Adding scan step slows prod |
| Raw files may be deleted | After move, raw is gone |

---

## Solutions Explored

### Solution 1: Watchdog (Python File Listener)

```mermaid
flowchart TB
    subgraph WATCHDOG["Watchdog Approach"]
        W1["watchdog detects file arrival"]
        W2["trigger scan immediately"]
        W3["mark file as 'ready'"]
        W4["prod cycle processes ready files"]
    end

    W1 --> W2 --> W3 --> W4
```

**What is Watchdog?**
- Python library for file system events
- Cross-platform (Windows, Linux, Mac)
- Detects: create, modify, move, delete events

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class MyHandler(FileSystemEventHandler):
    def on_created(self, event):
        # File created - trigger scan
        scan_file(event.src_path)
```

**Why It Doesn't Work:**

```mermaid
flowchart TB
    subgraph PROBLEM["Watchdog Problem"]
        A["watchdog: File arrived!"] --> B["scan done"]
        C["prod cycle (5 min later)"] --> D["runs anyway"]
        B -.- E["No coordination!"]
        D -.- E
    end
```

- Watchdog is reactive, prod cycle is scheduled
- No natural coordination between them
- Would need complex state management
- Still need to scan TB files (slow)

---

### Solution 2: Inotifywait (Linux Native)

```mermaid
flowchart TB
    subgraph INOTIFY["Inotifywait Approach"]
        I1["inotifywait watches directories"]
        I2["detects close_write, moved_to"]
        I3["debounce 30 seconds"]
        I4["trigger processing"]
    end

    I1 --> I2 --> I3 --> I4
```

**What is Inotifywait?**
- Linux native file system monitoring
- CLI tool from inotify-tools package
- More efficient than polling

```bash
inotifywait -m -r -e close_write /raw/
```

**Why It Doesn't Work:**

| Issue | Problem |
|-------|---------|
| Linux only | No Windows support |
| Same coordination issue | Async events vs scheduled cycle |
| Still need to scan | TB files still slow |
| Complex state | Need to track what's scanned |

---

### Solution 3: Scan Inside Prod Cycle

```mermaid
flowchart TB
    subgraph INLINE["Scan Inside Cycle"]
        A["discover files"] --> B["scan each file"]
        B --> C["if valid: process"]
        B --> D["if invalid: skip"]
    end
```

**Why It Doesn't Work:**

```mermaid
flowchart LR
    subgraph SLOW["Performance Impact"]
        A["Current: 5 min cycle"]
        B["With scan: 5 min + scan time"]
        C["Result: SLOWER PROD"]
    end

    A --> B --> C
```

- Adds latency to every cycle
- Scanning TB files takes time
- Defeats purpose of fast prod processing

---

### Solution 4: Two-Step (Scan Raw, Check Bronze)

```mermaid
flowchart TB
    subgraph TWOSTEP["Two-Step Approach"]
        A["Step 1: Scan raw, status=pending"]
        B["Prod runs: raw → bronze"]
        C["Step 2: Check bronze exists, sample"]
    end

    A --> B --> C
```

**Why It's Overcomplicated:**
- Two separate scans needed
- State management for pending/ready
- More moving parts to fail

---

## Why Watchdog/Inotifywait Don't Work

### The Core Problem

```mermaid
flowchart TB
    subgraph MISMATCH["Fundamental Mismatch"]
        direction TB
        A["File Listeners (watchdog/inotify)"]
        B["Event-driven: react to file changes"]
        C["Prod Cycle"]
        D["Schedule-driven: runs every 5 min"]
    end

    A --> B
    C --> D
    B -.- E["These don't naturally coordinate!"]
    D -.- E
```

### What Would Be Needed

```mermaid
flowchart TB
    subgraph COMPLEX["Complex Requirements"]
        R1["Shared state between services"]
        R2["Locking mechanism"]
        R3["Retry logic"]
        R4["Error handling"]
        R5["Monitoring"]
    end

    R1 --> RESULT["Too much complexity!"]
    R2 --> RESULT
    R3 --> RESULT
    R4 --> RESULT
    R5 --> RESULT
```

### The Insight

```mermaid
flowchart TB
    subgraph INSIGHT["Key Insight"]
        A["Bronze files ALREADY EXIST"]
        B["Bronze has same content as raw"]
        C["Bronze files PERSIST (not deleted)"]
        D["DB has raw → bronze mapping"]
    end

    A --> SOLUTION["Sample from Bronze instead!"]
    B --> SOLUTION
    C --> SOLUTION
    D --> SOLUTION
```

**Why sample from Bronze?**
- Files are already copied (no extra I/O)
- Files persist (safe to read anytime)
- Smaller time window (not TB backlog)
- Path mapping exists in DB

---

## Alternative Approaches

### Option A: Sample from Bronze (Recommended)

Generate sample files from bronze layer after prod processes.

```mermaid
flowchart LR
    A["raw file"] --> B["prod processes"]
    B --> C["bronze file"]
    C --> D["staging samples from bronze"]
```

**Pros:** No impact on prod, files already exist
**Cons:** Slight delay (after prod cycle)

---

### Option B: Temp File in Raw (Optional)

Create `temp_` prefixed file while writing, rename when complete.

```mermaid
flowchart TB
    subgraph RAW["Raw Layer"]
        A["File arriving..."]
        B["temp_data.csv (incomplete)"]
        C["data.csv (complete)"]
    end

    A --> B
    B -->|"write complete"| C
    C --> D["Staging can sample"]
```

**How it works:**

```mermaid
sequenceDiagram
    participant S as Source System
    participant R as Raw Directory
    participant ST as Staging Service

    S->>R: create temp_data.csv
    S->>R: write data...
    S->>R: write more...
    S->>R: rename temp_data.csv → data.csv

    Note over ST: Staging only reads files WITHOUT temp_ prefix

    ST->>R: scan for non-temp files
    ST->>ST: sample from complete files
```

**Rules:**
- Files with `temp_` prefix = incomplete, skip
- Files without `temp_` prefix = complete, safe to sample

**Pros:** Can sample from raw before bronze
**Cons:** Requires source system to follow temp_ convention

---

### Option C: Hybrid (Both)

```mermaid
flowchart TB
    subgraph OPTION["Choose based on need"]
        A["Need early sample?"]
        B["Sample from raw (after temp_ rename)"]
        C["Sample from bronze (after prod)"]
    end

    A -->|Yes| B
    A -->|No| C
```

---

## The Simple Solution

### Core Idea

```mermaid
flowchart TB
    subgraph SIMPLE["Simple Solution"]
        A["Prod processes file"]
        B["Append to manifest.jsonl"]
        C["Staging reads manifest"]
        D["Sample from bronze path"]
    end

    A --> B
    B --> C
    C --> D

    style B fill:#90EE90
```

**One line change in prod: append to JSONL**

---

### Complete Flow

```mermaid
flowchart TB
    subgraph RAW["1. Raw Layer"]
        R1["raw/env0/data.csv"]
        R2["raw/env1/file.parquet"]
    end

    subgraph PROD["2. Prod Service (existing)"]
        P1["rsync raw → bronze"]
        P2["NEW: append to manifest.jsonl"]
    end

    subgraph BRONZE["3. Bronze Layer"]
        B1["bronze/2026/01/18/143000--data.csv"]
        B2["bronze/2026/01/18/143005--file.parquet"]
    end

    subgraph MANIFEST["4. manifest.jsonl"]
        M1["{raw, bronze, mtime}"]
        M2["{raw, bronze, mtime}"]
    end

    subgraph STAGING["5. Staging Service (new)"]
        S1["read manifest.jsonl"]
        S2["check mtime (lazy load)"]
        S3["stream sample from bronze"]
    end

    subgraph SAMPLES["6. Sample Files"]
        SA1["samples/data_sample.csv"]
        SA2["samples/file_sample.parquet"]
    end

    R1 --> P1
    R2 --> P1
    P1 --> B1
    P1 --> B2
    P1 --> P2
    P2 --> M1
    P2 --> M2
    M1 --> S1
    M2 --> S1
    S1 --> S2
    S2 --> S3
    B1 --> S3
    B2 --> S3
    S3 --> SA1
    S3 --> SA2

    style P2 fill:#FFD700
    style S1 fill:#87CEEB
    style S2 fill:#87CEEB
    style S3 fill:#87CEEB
```

---

### JSONL Manifest Format

```mermaid
classDiagram
    class ManifestEntry {
        +string raw
        +string bronze
        +float mtime
    }

    note for ManifestEntry "One JSON line per processed file"
```

**Visual Structure:**

```mermaid
flowchart LR
    subgraph LINE1["Line 1"]
        direction TB
        A1["raw: raw/env0/data.csv"]
        A2["bronze: bronze/2026/01/18/143000--data.csv"]
        A3["mtime: 1737200000.0"]
    end

    subgraph LINE2["Line 2"]
        direction TB
        B1["raw: raw/env1/file.parquet"]
        B2["bronze: bronze/2026/01/18/143005--file.parquet"]
        B3["mtime: 1737200100.0"]
    end

    LINE1 --> LINE2
```

**Raw Example:**

```jsonl
{"raw": "raw/env0/data.csv", "bronze": "bronze/2026/01/18/143000--data.csv", "mtime": 1737200000.0}
{"raw": "raw/env1/file.parquet", "bronze": "bronze/2026/01/18/143005--file.parquet", "mtime": 1737200100.0}
```

---

### Path Transformation

```mermaid
flowchart LR
    subgraph RAW["Raw Path"]
        R["raw/env0/data.csv"]
    end

    subgraph TRANSFORM["Transformation"]
        T1["1. remove env0"]
        T2["2. add date: 2026/01/18"]
        T3["3. add time prefix: 143000--"]
    end

    subgraph BRONZE["Bronze Path"]
        B["bronze/2026/01/18/143000--data.csv"]
    end

    R --> T1 --> T2 --> T3 --> B
```

---

### Sample File Types (Same Format as Original)

```mermaid
flowchart TB
    subgraph INPUT["Bronze File"]
        B["bronze/data.xxx"]
    end

    subgraph DETECT["Detect File Type"]
        D{".ext?"}
    end

    subgraph OUTPUT["Sample File (Same Format)"]
        O1[".csv → sample.csv"]
        O2[".parquet → sample.parquet"]
        O3[".json → sample.json"]
        O4[".jsonl → sample.jsonl"]
        O5[".gz → sample.gz"]
        O6[".zip → sample.zip"]
        O7[".tar → sample.txt (list)"]
        O8["unknown → sample.meta.json"]
    end

    B --> D
    D -->|.csv| O1
    D -->|.parquet| O2
    D -->|.json| O3
    D -->|.jsonl| O4
    D -->|.gz| O5
    D -->|.zip| O6
    D -->|.tar| O7
    D -->|other| O8
```

**Sample Strategy by Type:**

| File Type | Sample Strategy | Output |
|-----------|-----------------|--------|
| `.csv` | First N rows | `.csv` |
| `.parquet` | First N rows | `.parquet` |
| `.json` | First N records (if array) | `.json` |
| `.jsonl` | First N lines | `.jsonl` |
| `.gz` | Decompress → first N lines → compress | `.gz` |
| `.zip` | Manifest + first small file | `.zip` |
| `.tar` | List contents only | `.txt` |
| unknown | Metadata (size, mtime) | `.meta.json` |

**Key Principle:** Sample files are **real files** in the same format - can be used for testing/preview.

---

### File Location

```mermaid
flowchart TB
    subgraph ROOT["{FP_PREFIX}"]
        subgraph VENDOR["sp/"]
            subgraph DATASET["gics_cwiq_pipe/"]
                subgraph VERSION["1.0/"]
                    BRONZE["bronze/"]
                    SILVER["silver/"]
                    GOLD["gold/"]
                    subgraph MANIFESTS["manifests/"]
                        M1["processed.jsonl"]
                    end
                    subgraph SAMPLES["samples/"]
                        S1["data_sample.csv"]
                        S2["file_sample.parquet"]
                    end
                end
            end
        end
    end

    style M1 fill:#90EE90
    style S1 fill:#87CEEB
    style S2 fill:#87CEEB
```

---

### Lazy Load (mtime Check)

```mermaid
flowchart TD
    A["Read manifest entry"] --> B{"mtime changed?"}
    B -->|Yes| C["Sample from bronze"]
    B -->|No| D["Skip - already sampled"]
    C --> E["Update cached mtime"]
    E --> F["Next entry"]
    D --> F
```

**Why mtime?**
- If file unchanged (same mtime), skip sampling
- Only sample new or modified files
- Efficient for millions of files

---

### Service Interaction

```mermaid
sequenceDiagram
    participant R as Raw Files
    participant P as Prod Service
    participant B as Bronze Layer
    participant M as manifest.jsonl
    participant S as Staging Service
    participant SA as Samples

    Note over R,P: File arrives in raw

    R->>P: new file detected
    P->>B: rsync copy to bronze
    P->>M: append {raw, bronze, mtime}

    Note over S: Staging runs (separate schedule)

    S->>M: read new entries
    S->>S: check mtime (lazy load)
    S->>B: stream first N rows
    S->>SA: save sample file

    Note over SA: Samples available for preview
```

---

## Implementation Details

### Prod Change (handle_bronze.py)

```python
import json
from pathlib import Path

def handle_bronze(raw_path, bronze_path, file_mtime, ...):
    # Existing rsync logic
    rsync_copy(raw_path, bronze_path)

    # NEW: Append to manifest
    manifest_path = get_manifest_path(vendor, dataset, version)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    with open(manifest_path, 'a') as f:
        f.write(json.dumps({
            "raw": str(raw_path),
            "bronze": str(bronze_path),
            "mtime": file_mtime
        }) + '\n')
```

**That's it. One append per file.**

---

### Staging Service (new file)

```python
import json
from pathlib import Path

def run_staging(manifest_path, samples_dir, cache_path):
    # Load mtime cache
    cached_mtime = load_cache(cache_path)

    # Read manifest
    with open(manifest_path) as f:
        for line in f:
            entry = json.loads(line)

            # Lazy load - skip if unchanged
            if cached_mtime.get(entry['raw']) == entry['mtime']:
                continue

            # Stream sample from bronze (first N rows only)
            sample = stream_sample(entry['bronze'], rows=100)

            # Save sample
            sample_name = Path(entry['raw']).stem + '_sample' + Path(entry['raw']).suffix
            save_sample(sample, samples_dir / sample_name)

            # Update cache
            cached_mtime[entry['raw']] = entry['mtime']

    # Save cache
    save_cache(cached_mtime, cache_path)


def create_sample_file(bronze_path, sample_path, rows=100):
    """Create sample file in SAME FORMAT as original."""

    ext = Path(bronze_path).suffix.lower()

    if ext == '.csv':
        # CSV → sample CSV
        import pandas as pd
        df = pd.read_csv(bronze_path, nrows=rows)
        df.to_csv(sample_path, index=False)

    elif ext == '.parquet':
        # Parquet → sample Parquet
        import pyarrow.parquet as pq
        table = pq.read_table(bronze_path).slice(0, rows)
        pq.write_table(table, sample_path)

    elif ext == '.json':
        # JSON → sample JSON (first N records)
        import json
        with open(bronze_path) as f:
            data = json.load(f)
        if isinstance(data, list):
            data = data[:rows]
        with open(sample_path, 'w') as f:
            json.dump(data, f, indent=2)

    elif ext == '.jsonl':
        # JSONL → sample JSONL (first N lines)
        with open(bronze_path) as f:
            lines = [next(f) for _ in range(rows)]
        with open(sample_path, 'w') as f:
            f.writelines(lines)

    elif ext == '.gz':
        # .gz → sample .gz (compressed)
        import gzip
        with gzip.open(bronze_path, 'rt') as f:
            lines = [next(f) for _ in range(rows)]
        with gzip.open(sample_path, 'wt') as f:
            f.writelines(lines)

    elif ext == '.zip':
        # ZIP → sample ZIP (list + first file sample)
        import zipfile
        with zipfile.ZipFile(bronze_path) as zin:
            names = zin.namelist()
            with zipfile.ZipFile(sample_path, 'w') as zout:
                # Write manifest
                zout.writestr('_manifest.txt', '\n'.join(names))
                # Sample first file if small
                if names and zin.getinfo(names[0]).file_size < 1_000_000:
                    zout.writestr(names[0], zin.read(names[0]))

    elif ext == '.tar':
        # TAR → sample TAR (list contents)
        import tarfile
        with tarfile.open(bronze_path) as tin:
            names = tin.getnames()
        with open(sample_path.with_suffix('.txt'), 'w') as f:
            f.write('\n'.join(names))

    else:
        # Unknown → metadata file
        import json
        stat = Path(bronze_path).stat()
        with open(sample_path.with_suffix('.meta.json'), 'w') as f:
            json.dump({
                "original": str(bronze_path),
                "size": stat.st_size,
                "mtime": stat.st_mtime,
                "type": "unknown"
            }, f, indent=2)
```

---

### Staging Service File

```ini
# /etc/systemd/system/staging-sampler.service
[Unit]
Description=Data Alchemy Staging Sampler
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python -m data_alchemy.staging_sampler
Restart=always
RestartSec=60
Environment=FP_PREFIX=/data

[Install]
WantedBy=multi-user.target
```

---

## Benefits

### Comparison Table

| Aspect | Watchdog/Inotify | JSONL Manifest |
|--------|------------------|----------------|
| Complexity | High (event coordination) | Low (just append) |
| Prod impact | Potential slowdown | Zero (one write) |
| State management | Complex | Simple (JSONL + cache) |
| Cross-platform | Varies | Works everywhere |
| Debugging | Hard (async events) | Easy (read JSONL) |

### Why This Works

```mermaid
flowchart TB
    subgraph BENEFITS["Benefits"]
        B1["No TB copies - stream samples"]
        B2["No prod slowdown - just append"]
        B3["Lazy load - skip unchanged"]
        B4["Decoupled - staging runs separately"]
        B5["Debuggable - JSONL is human-readable"]
    end
```

### Summary

```mermaid
flowchart LR
    subgraph BEFORE["Before"]
        A1["Monolithic process"]
        A2["No staging visibility"]
        A3["Complex event systems"]
    end

    subgraph AFTER["After"]
        B1["Prod: append JSONL"]
        B2["Staging: read & sample"]
        B3["Simple, decoupled"]
    end

    BEFORE --> |"Simple solution"| AFTER
```

