# Staging Manifest - Simple Approach

**Date:** 2026-01-18

---

## Overview

Simple staging solution: Prod writes JSONL manifest, Staging samples from Bronze.

---

## Flow Diagram

```mermaid
flowchart TB
    subgraph RAW["Raw Layer"]
        R1["raw/env0/data.csv"]
        R2["raw/env1/file.parquet"]
    end

    subgraph PROD["Prod Service"]
        P1["rsync raw → bronze"]
        P2["append to manifest.jsonl"]
    end

    subgraph BRONZE["Bronze Layer"]
        B1["bronze/2026/01/18/143000--data.csv"]
        B2["bronze/2026/01/18/143005--file.parquet"]
    end

    subgraph MANIFEST["manifest.jsonl"]
        M1["{raw, bronze, mtime}"]
    end

    subgraph STAGING["Staging Service"]
        S1["read manifest.jsonl"]
        S2["sample from bronze"]
        S3["create sample files"]
    end

    subgraph SAMPLES["Samples"]
        SA1["samples/data_sample.csv"]
        SA2["samples/file_sample.parquet"]
    end

    R1 --> P1
    R2 --> P1
    P1 --> B1
    P1 --> B2
    P1 --> P2
    P2 --> M1
    B1 --> S2
    B2 --> S2
    M1 --> S1
    S1 --> S2
    S2 --> S3
    S3 --> SA1
    S3 --> SA2
```

---

## Manifest Format

```mermaid
flowchart TB
    subgraph JSONL["📄 manifest.jsonl"]
        direction TB
        L1["Line 1"]
        L2["Line 2"]
        L3["Line 3"]
        L4["..."]
    end

    subgraph ENTRY["Each Line Structure"]
        direction LR
        F1["raw"]
        F2["bronze"]
        F3["mtime"]
    end

    L1 --> ENTRY
```

---

## JSONL Entry Structure

```mermaid
classDiagram
    class ManifestEntry {
        +string raw
        +string bronze
        +float mtime
    }

    note for ManifestEntry "One entry per processed file"
```

---

## JSONL Visual Example

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

---

## Path Transformation

```mermaid
flowchart LR
    subgraph RAW["Raw Path"]
        R["raw/env0/data.csv"]
    end

    subgraph TRANSFORM["Transformation"]
        T1["remove env0"]
        T2["add date: 2026/01/18"]
        T3["add time prefix: 143000--"]
    end

    subgraph BRONZE["Bronze Path"]
        B["bronze/2026/01/18/143000--data.csv"]
    end

    R --> T1 --> T2 --> T3 --> B
```

---

## JSONL File Location

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
                        M2["processed_2026-01-18.jsonl"]
                    end
                end
            end
        end
    end

    style M1 fill:#90EE90
    style M2 fill:#90EE90
```

---

## Write Flow

```mermaid
flowchart TD
    A["File processed: raw/env0/data.csv"] --> B["rsync to bronze"]
    B --> C["Get bronze path"]
    C --> D["Get file mtime"]
    D --> E["Create JSON object"]
    E --> F["Append to manifest.jsonl"]

    subgraph JSON["JSON Object"]
        J1["{"]
        J2["  raw: raw/env0/data.csv"]
        J3["  bronze: bronze/.../data.csv"]
        J4["  mtime: 1737200000.0"]
        J5["}"]
    end

    E --> JSON
```

---

## Raw JSON Example

```jsonl
{"raw": "raw/env0/data.csv", "bronze": "bronze/2026/01/18/143000--data.csv", "mtime": 1737200000.0}
{"raw": "raw/env1/file.parquet", "bronze": "bronze/2026/01/18/143005--file.parquet", "mtime": 1737200100.0}
```

---

## Service Interaction

```mermaid
sequenceDiagram
    participant R as Raw Files
    participant P as Prod Service
    participant B as Bronze Layer
    participant M as manifest.jsonl
    participant S as Staging Service
    participant SA as Samples

    R->>P: file arrives
    P->>B: rsync copy
    P->>M: append {raw, bronze, mtime}

    Note over S: runs after prod cycle

    S->>M: read new entries
    S->>B: stream sample (first N rows)
    S->>SA: save sample file
```

---

## Lazy Load (mtime check)

```mermaid
flowchart TD
    A["Read manifest entry"] --> B{"mtime changed?"}
    B -->|Yes| C["Sample from bronze"]
    B -->|No| D["Skip - already sampled"]
    C --> E["Update cached mtime"]
    D --> F["Next entry"]
    E --> F
```

---

## File Structure

```mermaid
flowchart TB
    subgraph FP["{FP_PREFIX}/{vendor}/{dataset}/{version}"]
        subgraph LAYERS["Layers"]
            RAW["raw/env*/"]
            BRONZE["bronze/YYYY/MM/DD/"]
            SILVER["silver/"]
            GOLD["gold/"]
        end
        subgraph META["Metadata"]
            MANIFEST["manifests/processed.jsonl"]
            SAMPLES["samples/"]
        end
    end
```

---

## Implementation

### Prod Change (handle_bronze.py)

```python
# After rsync success
manifest_path = fp_prefix / vendor / dataset / version / "manifests" / "processed.jsonl"
manifest_path.parent.mkdir(parents=True, exist_ok=True)

with open(manifest_path, 'a') as f:
    f.write(json.dumps({
        "raw": str(raw_path),
        "bronze": str(bronze_path),
        "mtime": file_mtime
    }) + '\n')
```

### Staging Service

```python
def run_staging(manifest_path, samples_dir):
    cached_mtime = load_cache()

    for line in open(manifest_path):
        entry = json.loads(line)

        # Lazy load - skip if unchanged
        if cached_mtime.get(entry['raw']) == entry['mtime']:
            continue

        # Sample from bronze
        sample = stream_sample(entry['bronze'], rows=100)
        save_sample(sample, samples_dir / Path(entry['raw']).name)

        # Update cache
        cached_mtime[entry['raw']] = entry['mtime']

    save_cache(cached_mtime)
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| Simple | One JSONL append per file |
| No prod slowdown | Just one write per file |
| Lazy load | mtime check skips unchanged |
| Stream sample | No TB copy, just first N rows |
| Decoupled | Staging runs independently |

---

## Links

- [Investigation DB](https://git.codewilling.com/-/snippets/4)
- [staging-watcher-design.md](../../alchmy/docs/data-alchemy/staging-watcher-design.md)
