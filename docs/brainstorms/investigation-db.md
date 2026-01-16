# Investigation DB

> :mag: Pattern-based reverse lookup for data pipelines

## The Problem

:question: When a file is missing in Gold/Platinum, how do we trace it back?

```mermaid
flowchart LR
    Q[/"Missing Gold File"/]
    Q --> |"?"| B[Bronze Source]
    Q --> |"?"| S[Service]
    Q --> |"?"| SRV[Server]
```

## Sample Query

![Datasette Sample](../assets/images/invdb-datasette-sample.png)

*Reverse lookup: sf_table → enriched_file → platinum_path → raw_path*

## Core Idea

:bulb: **Don't track files - track patterns!**

```mermaid
flowchart LR
    subgraph Input
        G[":file_folder: Gold Pattern"]
    end

    subgraph Lookup
        DB[("Investigation DB")]
    end

    subgraph Output
        B[":package: Bronze Pattern"]
        SVC[":gear: Service"]
        SRV[":desktop_computer: Server"]
    end

    G --> DB
    DB --> B
    DB --> SVC
    DB --> SRV
```

## Key Entities

```mermaid
mindmap
  root((Investigation DB))
    Infrastructure
      Servers
      Services
      Credentials
    Data Sources
      Vendors
      Datasets
      Raw Landing
    Patterns
      File Patterns
      Path Patterns
      Pattern Combos
    Pipeline
      Projects
      Layers
      Full Paths
```

## Data Flow

```mermaid
flowchart TB
    subgraph Sources[":inbox_tray: Data Sources"]
        V[":office: Vendors"]
        S[":satellite: Services"]
    end

    subgraph Pipeline[":factory: Pipeline Layers"]
        RAW[":file_folder: Raw"]
        BRONZE[":package: Bronze"]
        SILVER[":gem: Silver"]
        GOLD[":star: Gold"]
        DELTA[":triangular_ruler: Delta"]

        RAW --> BRONZE --> SILVER --> GOLD --> DELTA
    end

    subgraph Patterns[":jigsaw: Pattern Registry"]
        FP[":page_facing_up: File Patterns"]
        PP[":open_file_folder: Path Patterns"]
        PC[":link: Pattern Combos"]
    end

    V --> RAW
    S --> RAW
    BRONZE -.-> FP
    SILVER -.-> FP
    GOLD -.-> FP
    FP --> PC
    PP --> PC
```

## Reverse Lookup Flow

```mermaid
flowchart TD
    INPUT[/"Gold: sp_global_mi/gics_direct/1.0/raw/*/*.zip"/]

    subgraph Step1[":one: Match Pattern"]
        MATCH["Find matching gold pattern"]
    end

    subgraph Step2[":two: Walk Chain"]
        CHAIN["Trace back through layers"]
    end

    subgraph Step3[":three: Get Details"]
        DETAILS["Fetch service & server info"]
    end

    subgraph Result[":white_check_mark: Result"]
        R1[":package: Bronze Pattern"]
        R2[":gear: Service Name"]
        R3[":desktop_computer: Server"]
    end

    INPUT --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> R1 & R2 & R3
```

## Entity Relationships

```mermaid
erDiagram
    VENDOR ||--o{ DATASET : owns
    SERVICE ||--o{ DATASET : delivers
    SERVER ||--o{ SERVICE : hosts
    DATASET ||--o{ PATTERN_COMBO : uses
    PATTERN_COMBO ||--|{ FILE_PATTERN : contains
    PATTERN_COMBO ||--|{ PATH_PATTERN : contains
    LAYER ||--o{ FULL_PATH : defines
    FULL_PATH }o--|| PATTERN_COMBO : references
```

## Table Details

### :desktop_computer: Infrastructure Tables

#### alchemy_server
> Production servers running Alchemy pipelines

| Column | Type | Description |
|--------|------|-------------|
| server_id | PK | Primary key |
| server_name | VARCHAR | Server hostname |
| ip_address | VARCHAR | IP address |
| cpu_cores | INT | CPU cores |
| ram_gb | INT | RAM in GB |
| disk_gb | INT | Disk in GB |
| os_version | VARCHAR | OS version |
| environment | VARCHAR | PROD/DEV |
| datacenter | VARCHAR | Datacenter location |
| status | VARCHAR | ACTIVE/INACTIVE |

```mermaid
flowchart LR
    S[":desktop_computer: alchemy_server"] -->|hosts| SVC[":gear: alchemy_service"]
```

---

#### alchemy_service
> Systemd services running data-alchemy pipelines

| Column | Type | Description |
|--------|------|-------------|
| service_id | PK | Primary key |
| server_id | FK | → alchemy_server |
| raw_id | FK | → alchemy_raw |
| vendor_id | FK | → vendor |
| dataset_name | VARCHAR | Dataset name |
| dataset_version | VARCHAR | Version |
| service_name | VARCHAR | Systemd service name |
| environment | VARCHAR | PROD/DEV |
| exec_script | VARCHAR | Execution script |
| watch_interval | INT | Watch interval (sec) |
| fp_prefix | VARCHAR | File path prefix |
| raw_fp_prefix | VARCHAR | Raw file path prefix |
| log_path | VARCHAR | Log file path |
| playbook_file | VARCHAR | Ansible playbook |
| is_active | BOOL | Active flag |

```mermaid
flowchart LR
    SVC[":gear: alchemy_service"] -->|on| S[":desktop_computer: server"]
    SVC -->|processes| R[":file_folder: raw"]
    SVC -->|for| V[":office: vendor"]
```

---

#### vendor
> Data vendors (bloomberg, factset, sp, etc.)

| Column | Type | Description |
|--------|------|-------------|
| vendor_id | PK | Primary key |
| vendor_code | VARCHAR | Short code (sp, bb) |
| vendor_name | VARCHAR | Full name |
| website | VARCHAR | Vendor website |

```mermaid
flowchart LR
    V[":office: vendor"] -->|owns| C[":key: credential"]
    V -->|provides| D[":satellite: dataset"]
```

---

#### vendor_credential
> Vendor credentials stored in AWS Secrets Manager

| Column | Type | Description |
|--------|------|-------------|
| credential_id | PK | Primary key |
| vendor_id | FK | → vendor |
| aws_secret_path | VARCHAR | AWS secret path |
| credential_type | VARCHAR | sftp/api/s3 |

---

### :inbox_tray: Data Source Tables

#### cwiq_pipe_source_dataset
> CWIQ pipe source datasets configuration

| Column | Type | Description |
|--------|------|-------------|
| source_id | PK | Primary key |
| vendor_id | FK | → vendor |
| credential_id | FK | → vendor_credential |
| dataset_name | VARCHAR | Dataset name |
| dataset_version | VARCHAR | Version |
| connector_type | VARCHAR | sftp/s3/api |
| exporter_type | VARCHAR | file_system |
| source_path | VARCHAR | Source path |
| source_host | VARCHAR | Source host |
| scan_time | INT | Scan interval |
| env_enabled | BOOL | Environment enabled |
| online | BOOL | Online flag |

```mermaid
flowchart LR
    V[":office: vendor"] -->|has| DS[":satellite: cwiq_pipe_source"]
    DS -->|lands in| R[":file_folder: alchemy_raw"]
```

---

#### alchemy_raw
> Dataset-level raw configuration

| Column | Type | Description |
|--------|------|-------------|
| raw_id | PK | Primary key |
| source_id | FK | → cwiq_pipe_source_dataset |
| base_path | VARCHAR | Base landing path |
| is_live | BOOL | Live data flag |

```mermaid
flowchart LR
    R[":file_folder: alchemy_raw"] -->|has| RFT[":link: raw_filetype"]
    R -->|uses| PC[":jigsaw: pattern_combo"]
```

---

#### filetype
> Reusable file extensions

| Column | Type | Description |
|--------|------|-------------|
| filetype_id | PK | Primary key |
| extension | VARCHAR | csv, parquet, gz |
| mime_type | VARCHAR | MIME type |
| category | VARCHAR | archive/data/text |

---

#### raw_filetype
> Links alchemy_raw to filetype (bridge)

| Column | Type | Description |
|--------|------|-------------|
| raw_filetype_id | PK | Primary key |
| raw_id | FK | → alchemy_raw |
| filetype_id | FK | → filetype |
| is_primary | BOOL | Primary type flag |

---

### :jigsaw: Pattern Tables

#### date_format
> Normalized date format patterns

| Column | Type | Description |
|--------|------|-------------|
| format_id | PK | Primary key |
| format_code | VARCHAR | YYYY, YYYYMMDD |
| format_regex | VARCHAR | `\d{4}`, `\d{8}` |
| example | VARCHAR | 2025, 20251210 |

---

#### file_pattern
> File name regex patterns (reusable)

| Column | Type | Description |
|--------|------|-------------|
| file_pattern_id | PK | Primary key |
| pattern_regex | VARCHAR | File regex |
| format_id | FK | → date_format |

```mermaid
flowchart LR
    DF[":calendar: date_format"] -->|used by| FP[":page_facing_up: file_pattern"]
    FP -->|combines into| PC[":link: pattern_combo"]
```

---

#### path_pattern
> Directory path structure patterns (reusable)

| Column | Type | Description |
|--------|------|-------------|
| path_pattern_id | PK | Primary key |
| pattern_structure | VARCHAR | YYYY/MM/DD/ |
| format_id | FK | → date_format |

```mermaid
flowchart LR
    DF[":calendar: date_format"] -->|used by| PP[":open_file_folder: path_pattern"]
    PP -->|combines into| PC[":link: pattern_combo"]
```

---

#### pattern_combo
> Combines file_pattern + path_pattern (reusable)

| Column | Type | Description |
|--------|------|-------------|
| combo_id | PK | Primary key |
| file_pattern_id | FK | → file_pattern |
| path_pattern_id | FK | → path_pattern |
| description | VARCHAR | Combo description |

```mermaid
flowchart TB
    FP[":page_facing_up: file_pattern"] --> PC[":link: pattern_combo"]
    PP[":open_file_folder: path_pattern"] --> PC
    PC --> EX[":eyes: path_example"]
    PC --> FPP[":world_map: full_path_pattern"]
```

---

#### path_example
> Full path examples linked to pattern_combo

| Column | Type | Description |
|--------|------|-------------|
| example_id | PK | Primary key |
| combo_id | FK | → pattern_combo |
| example_filename | VARCHAR | Full filename |
| example_rel_path | VARCHAR | Relative path |
| file_date | DATE | File date |

---

#### raw_pattern_rel
> Links alchemy_raw to pattern_combo (bridge)

| Column | Type | Description |
|--------|------|-------------|
| rel_id | PK | Primary key |
| raw_id | FK | → alchemy_raw |
| combo_id | FK | → pattern_combo |
| is_active | BOOL | Active flag |

---

### :factory: Pipeline Tables

#### project
> Systems that generate/manage data layers

| Column | Type | Description |
|--------|------|-------------|
| project_id | PK | Primary key |
| project_name | VARCHAR | cwiq_pipe, data_alchemy, cds_job |
| repo_url | VARCHAR | Git repo URL |

---

#### layer
> Data pipeline layers

| Column | Type | Description |
|--------|------|-------------|
| layer_id | PK | Primary key |
| layer_name | VARCHAR | raw, bronze, silver, gold |
| project_id | FK | → project |
| layer_order | INT | Layer sequence |

```mermaid
flowchart LR
    P[":briefcase: project"] -->|has| L[":layers: layer"]
    L -->|defines| FPP[":world_map: full_path_pattern"]
```

---

#### full_path_pattern
> Complete paths for traceability and impact analysis

| Column | Type | Description |
|--------|------|-------------|
| full_path_id | PK | Primary key |
| combo_id | FK | → pattern_combo |
| layer_id | FK | → layer |
| base_path | VARCHAR | Base path |
| full_path_pattern | VARCHAR | Full pattern |
| full_path_example | VARCHAR | Example path |
| is_active | BOOL | Active flag |

---

### :triangular_ruler: CDP Retirement Tables

#### delta_dataset_repo
> Unique dataset repository names

| Column | Type | Description |
|--------|------|-------------|
| repo_id | PK | Primary key |
| repo_name | VARCHAR | Repository name |

---

#### delta_table
> SF table names with repo relationship

| Column | Type | Description |
|--------|------|-------------|
| table_id | PK | Primary key |
| sf_table_name | VARCHAR | Snowflake table name |
| repo_id | FK | → delta_dataset_repo |

```mermaid
flowchart LR
    R[":package: delta_dataset_repo"] -->|contains| T[":triangular_ruler: delta_table"]
    T -->|mapped in| D[":star: raw_enriched_data"]
```

---

#### raw_enriched_directory
> Unique enriched directory paths

| Column | Type | Description |
|--------|------|-------------|
| directory_id | PK | Primary key |
| directory_path | VARCHAR | Directory path |

---

#### raw_enriched_file_pattern
> File patterns with regex and examples

| Column | Type | Description |
|--------|------|-------------|
| pattern_id | PK | Primary key |
| file_pattern | VARCHAR | File pattern |
| file_regex | VARCHAR | Regex version |
| file_example | VARCHAR | Example filename |

---

#### raw_enriched_data
> Maps tables to directories and patterns (fact)

| Column | Type | Description |
|--------|------|-------------|
| enriched_id | PK | Primary key |
| table_id | FK | → delta_table |
| directory_id | FK | → raw_enriched_directory |
| pattern_id | FK | → raw_enriched_file_pattern |

```mermaid
flowchart TB
    T[":triangular_ruler: delta_table"] --> D[":star: raw_enriched_data"]
    DIR[":open_file_folder: directory"] --> D
    P[":page_facing_up: file_pattern"] --> D
```

## Layers

```mermaid
flowchart LR
    subgraph Layers
        direction TB
        L1[":one: raw"]
        L2[":two: bronze"]
        L3[":three: silver"]
        L4[":four: gold"]
        L5[":five: raw_enriched"]
        L6[":six: delta"]
    end

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

| Layer | Description |
|-------|-------------|
| :inbox_tray: raw | Landing zone (cwiq-pipe) |
| :package: bronze | Timestamped archives |
| :gem: silver | Extracted files |
| :star: gold | Restructured/renamed |
| :file_cabinet: raw_enriched | CDP legacy format |
| :triangular_ruler: delta | Delta Lake tables |

## Use Cases

```mermaid
flowchart TB
    subgraph UC["Use Cases"]
        UC1[":mag: Reverse Lookup"]
        UC2[":warning: Impact Analysis"]
        UC3[":gear: Service Discovery"]
        UC4[":footprints: Pattern Tracing"]
    end

    UC1 --> |"Gold → Bronze"| R1["Find source pattern"]
    UC2 --> |"Missing file"| R2["Find affected datasets"]
    UC3 --> |"Vendor + Dataset"| R3["Find server & service"]
    UC4 --> |"combo_id"| R4["Trace across all layers"]
```

## Pattern Types

```mermaid
flowchart LR
    subgraph FilePatterns[":page_facing_up: File Patterns"]
        FP1["HHMMSS--*.tar.gz"]
        FP2["*.parquet"]
        FP3["*.csv"]
    end

    subgraph PathPatterns[":open_file_folder: Path Patterns"]
        PP1["YYYY/MM/DD/"]
        PP2["YYYY/YYYYMMDD/"]
        PP3["YYYY/"]
    end

    subgraph Combo[":link: Pattern Combo"]
        C["File + Path = Full Pattern"]
    end

    FilePatterns --> Combo
    PathPatterns --> Combo
```

## CLI Ideas

```mermaid
flowchart LR
    subgraph Commands
        C1["invdb reverse"]
        C2["invdb service"]
        C3["invdb servers"]
        C4["invdb trace"]
        C5["invdb impact"]
    end

    C1 --> |"--gold pattern"| O1["Bronze + Service"]
    C2 --> |"--vendor --dataset"| O2["Server info"]
    C3 --> |"--list"| O3["All servers"]
    C4 --> |"--combo-id"| O4["Full path chain"]
    C5 --> |"--layer --pattern"| O5["Affected datasets"]
```

## Integration

```mermaid
flowchart LR
    subgraph Tools
        PS[":mag: PathSeeker"]
        DB[":floppy_disk: Investigation DB"]
        DS[":bar_chart: Datasette"]
    end

    PS --> |"extract patterns"| DB
    DB --> |"browse & query"| DS
```

## Open Questions

- [ ] :thinking: Pattern versioning strategy?
- [ ] :thinking: Delta table tracking approach?
- [ ] :thinking: CDP migration status tracking?
- [ ] :thinking: Audit trail for changes?

## References

- :link: **Repo:** [alchmydb](https://git.codewilling.com/alchmy/database/alchmydb)
- :link: **Related:** [PathSeeker](pathseeker.md)
