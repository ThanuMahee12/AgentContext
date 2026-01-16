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

## Table Maps

### :desktop_computer: Infrastructure Tables

```mermaid
flowchart TB
    subgraph Servers[":desktop_computer: alchemy_server"]
        S1["server_name, ip_address"]
        S2["cpu_cores, ram_gb, disk_gb"]
        S3["environment, datacenter"]
    end

    subgraph Services[":gear: alchemy_service"]
        SVC1["service_name, dataset_name"]
        SVC2["exec_script, watch_interval"]
        SVC3["fp_prefix, playbook_file"]
    end

    subgraph Vendor[":office: vendor"]
        V1["vendor_code, vendor_name"]
        V2["website"]
    end

    subgraph Cred[":key: vendor_credential"]
        C1["aws_secret_path"]
        C2["credential_type"]
    end

    Servers -->|hosts| Services
    Vendor -->|owns| Cred
    Services -->|uses| Vendor
```

### :inbox_tray: Data Source Tables

```mermaid
flowchart TB
    subgraph Source[":satellite: cwiq_pipe_source_dataset"]
        DS1["dataset_name, dataset_version"]
        DS2["connector_type, exporter_type"]
        DS3["source_path, source_host"]
    end

    subgraph Raw[":file_folder: alchemy_raw"]
        R1["base_path"]
        R2["is_live"]
    end

    subgraph FT[":page_facing_up: filetype"]
        FT1["extension, mime_type"]
        FT2["category"]
    end

    subgraph RFT[":link: raw_filetype"]
        RFT1["is_primary"]
    end

    Source -->|lands in| Raw
    Raw -->|has| RFT
    RFT -->|references| FT
```

### :jigsaw: Pattern Tables

```mermaid
flowchart TB
    subgraph DateFmt[":calendar: date_format"]
        DF1["YYYY, YYYYMM, YYYYMMDD"]
        DF2["format_regex, example"]
    end

    subgraph FilePat[":page_facing_up: file_pattern"]
        FP1["pattern_regex"]
        FP2["*.tar.gz, *.parquet"]
    end

    subgraph PathPat[":open_file_folder: path_pattern"]
        PP1["pattern_structure"]
        PP2["YYYY/MM/DD/"]
    end

    subgraph Combo[":link: pattern_combo"]
        PC1["file + path combined"]
        PC2["description"]
    end

    subgraph Example[":eyes: path_example"]
        PE1["example_filename"]
        PE2["example_rel_path"]
        PE3["file_date"]
    end

    subgraph Rel[":chains: raw_pattern_rel"]
        RPR1["links raw → combo"]
        RPR2["is_active"]
    end

    DateFmt -->|used by| FilePat
    DateFmt -->|used by| PathPat
    FilePat -->|combines into| Combo
    PathPat -->|combines into| Combo
    Combo -->|has| Example
    Combo -->|linked via| Rel
```

### :factory: Pipeline Tables

```mermaid
flowchart LR
    subgraph Project[":briefcase: project"]
        P1["cwiq_pipe"]
        P2["data_alchemy"]
        P3["cds_job"]
        P4["delta_share"]
    end

    subgraph Layer[":layers: layer"]
        L1["raw → bronze → silver"]
        L2["gold → raw_enriched → delta"]
    end

    subgraph FullPath[":world_map: full_path_pattern"]
        FPP1["base_path"]
        FPP2["full_path_example"]
    end

    Project -->|has| Layer
    Layer -->|defines| FullPath
    FullPath -->|uses| Combo[":link: pattern_combo"]
```

### :triangular_ruler: CDP Retirement Tables

```mermaid
flowchart TB
    subgraph Repo[":package: delta_dataset_repo"]
        DR1["repo_name"]
    end

    subgraph Table[":triangular_ruler: delta_table"]
        DT1["sf_table_name"]
    end

    subgraph Dir[":open_file_folder: raw_enriched_directory"]
        RED1["directory_path"]
    end

    subgraph Pattern[":page_facing_up: raw_enriched_file_pattern"]
        REP1["file_pattern, file_regex"]
        REP2["file_example"]
    end

    subgraph Data[":star: raw_enriched_data"]
        RD1["maps tables → dirs → patterns"]
    end

    Repo -->|contains| Table
    Table -->|mapped in| Data
    Dir -->|used by| Data
    Pattern -->|used by| Data
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

- :link: **Repo:** `git.codewilling.com:alchmy/database/alchmydb`
- :link: **Related:** [PathSeeker](pathseeker.md)
