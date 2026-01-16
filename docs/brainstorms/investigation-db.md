# Investigation DB

> 🔍 Pattern-based reverse lookup for data pipelines

## The Problem

❓ When a file is missing in Gold/Platinum, how do we trace it back?

```mermaid
flowchart LR
    Q[/"❌ Missing Gold File"/]
    Q --> |"?"| B["📦 Bronze Source"]
    Q --> |"?"| S["⚙️ Service"]
    Q --> |"?"| SRV["🖥️ Server"]
```

## Sample Query

![Datasette Sample](../assets/images/invdb-datasette-sample.png)

*Reverse lookup: sf_table → enriched_file → platinum_path → raw_path*

## Core Idea

💡 **Don't track files - track patterns!**

```mermaid
flowchart LR
    subgraph Input
        G["📁 Gold Pattern"]
    end

    subgraph Lookup
        DB[("🗄️ Investigation DB")]
    end

    subgraph Output
        B["📦 Bronze Pattern"]
        SVC["⚙️ Service"]
        SRV["🖥️ Server"]
    end

    G --> DB
    DB --> B
    DB --> SVC
    DB --> SRV
```

## Key Entities

```mermaid
mindmap
  root((🗄️ Investigation DB))
    🖥️ Infrastructure
      Servers
      Services
      Credentials
    📥 Data Sources
      Vendors
      Datasets
      Raw Landing
    🧩 Patterns
      File Patterns
      Path Patterns
      Pattern Combos
    🏭 Pipeline
      Projects
      Layers
      Full Paths
```

## Data Flow

```mermaid
flowchart TB
    subgraph Sources["📥 Data Sources"]
        V["🏢 Vendors"]
        S["📡 Services"]
    end

    subgraph Pipeline["🏭 Pipeline Layers"]
        RAW["📁 Raw"]
        BRONZE["📦 Bronze"]
        SILVER["💎 Silver"]
        GOLD["⭐ Gold"]
        DELTA["📐 Delta"]

        RAW --> BRONZE --> SILVER --> GOLD --> DELTA
    end

    subgraph Patterns["🧩 Pattern Registry"]
        FP["📄 File Patterns"]
        PP["📂 Path Patterns"]
        PC["🔗 Pattern Combos"]
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
    INPUT[/"⭐ Gold: sp_global_mi/gics_direct/1.0/raw/*/*.zip"/]

    subgraph Step1["1️⃣ Match Pattern"]
        MATCH["Find matching gold pattern"]
    end

    subgraph Step2["2️⃣ Walk Chain"]
        CHAIN["Trace back through layers"]
    end

    subgraph Step3["3️⃣ Get Details"]
        DETAILS["Fetch service & server info"]
    end

    subgraph Result["✅ Result"]
        R1["📦 Bronze Pattern"]
        R2["⚙️ Service Name"]
        R3["🖥️ Server"]
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

### 🖥️ Infrastructure Tables

```mermaid
flowchart TB
    subgraph alchemy_server["🖥️ alchemy_server"]
        AS_L["server_name\nip_address"] ~~~ AS_R["environment\ndatacenter"]
    end
    alchemy_server -->|hosts| alchemy_service

    subgraph alchemy_service["⚙️ alchemy_service"]
        SVC_L["service_name\nexec_script"] ~~~ SVC_R["fp_prefix\nplaybook_file"]
    end
    alchemy_service -->|for| vendor
    alchemy_service -->|processes| alchemy_raw

    subgraph vendor["🏢 vendor"]
        V_L["vendor_code"] ~~~ V_R["vendor_name"]
    end
    vendor -->|owns| vendor_credential

    subgraph vendor_credential["🔑 vendor_credential"]
        VC["aws_secret_path\ncredential_type"]
    end
```

---

### 📥 Data Source Tables

```mermaid
flowchart TB
    vendor["🏢 vendor"] -->|has| cwiq_pipe

    subgraph cwiq_pipe["📡 cwiq_pipe_source_dataset"]
        CP_L["dataset_name\nconnector_type"] ~~~ CP_R["source_path\nsource_host"]
    end
    cwiq_pipe -->|lands in| alchemy_raw

    subgraph alchemy_raw["📁 alchemy_raw"]
        AR["base_path\nis_live"]
    end
    alchemy_raw -->|has types| raw_filetype

    subgraph raw_filetype["🔗 raw_filetype"]
        RF["is_primary"]
    end
    raw_filetype -->|refs| filetype

    subgraph filetype["📄 filetype"]
        FT["extension\nmime_type\ncategory"]
    end
```

---

### 🧩 Pattern Tables

```mermaid
flowchart TB
    subgraph date_format["📅 date_format"]
        DF["format_code: YYYY, YYYYMMDD\nformat_regex: \\d{4}, \\d{8}"]
    end
    date_format -->|used by| file_pattern
    date_format -->|used by| path_pattern

    subgraph file_pattern["📄 file_pattern"]
        FP["pattern_regex\n*.tar.gz, *.parquet"]
    end

    subgraph path_pattern["📂 path_pattern"]
        PP["pattern_structure\nYYYY/MM/DD/"]
    end

    file_pattern -->|+| pattern_combo
    path_pattern -->|+| pattern_combo

    subgraph pattern_combo["🔗 pattern_combo"]
        PC["file + path combined"]
    end
    pattern_combo -->|has| path_example
    pattern_combo -->|linked via| raw_pattern_rel

    subgraph path_example["👁️ path_example"]
        PE["example_filename\nfile_date"]
    end

    subgraph raw_pattern_rel["⛓️ raw_pattern_rel"]
        RPR["raw_id → combo_id"]
    end
    raw_pattern_rel -->|links to| alchemy_raw["📁 alchemy_raw"]
```

---

### 🏭 Pipeline Tables

```mermaid
flowchart TB
    subgraph project["💼 project"]
        PJ["cwiq_pipe\ndata_alchemy\ncds_job\ndelta_share"]
    end
    project -->|has| layer

    subgraph layer["🗂️ layer"]
        LY["raw → bronze → silver\ngold → raw_enriched → delta"]
    end
    layer -->|defines| full_path_pattern

    subgraph full_path_pattern["🗺️ full_path_pattern"]
        FPP_L["base_path"] ~~~ FPP_R["full_path_example"]
    end
    full_path_pattern -->|uses| pattern_combo["🔗 pattern_combo"]
```

---

### 📐 CDP Retirement Tables

```mermaid
flowchart TB
    subgraph delta_dataset_repo["📦 delta_dataset_repo"]
        DR["repo_name"]
    end
    delta_dataset_repo -->|contains| delta_table

    subgraph delta_table["📐 delta_table"]
        DT["sf_table_name"]
    end
    delta_table -->|mapped in| raw_enriched_data

    subgraph raw_enriched_directory["📂 raw_enriched_directory"]
        RED["directory_path"]
    end

    subgraph raw_enriched_file_pattern["📄 raw_enriched_file_pattern"]
        REP["file_pattern\nfile_regex\nfile_example"]
    end

    raw_enriched_directory -->|used by| raw_enriched_data
    raw_enriched_file_pattern -->|used by| raw_enriched_data

    subgraph raw_enriched_data["⭐ raw_enriched_data"]
        RD["table → directory → pattern"]
    end
```

## Layers

```mermaid
flowchart LR
    subgraph Layers
        direction TB
        L1["1️⃣ raw"]
        L2["2️⃣ bronze"]
        L3["3️⃣ silver"]
        L4["4️⃣ gold"]
        L5["5️⃣ raw_enriched"]
        L6["6️⃣ delta"]
    end

    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

| Layer | Description |
|-------|-------------|
| 📥 raw | Landing zone (cwiq-pipe) |
| 📦 bronze | Timestamped archives |
| 💎 silver | Extracted files |
| ⭐ gold | Restructured/renamed |
| 🗄️ raw_enriched | CDP legacy format |
| 📐 delta | Delta Lake tables |

## Use Cases

```mermaid
flowchart TB
    subgraph UC["Use Cases"]
        UC1["🔍 Reverse Lookup"]
        UC2["⚠️ Impact Analysis"]
        UC3["⚙️ Service Discovery"]
        UC4["👣 Pattern Tracing"]
    end

    UC1 --> |"Gold → Bronze"| R1["Find source pattern"]
    UC2 --> |"Missing file"| R2["Find affected datasets"]
    UC3 --> |"Vendor + Dataset"| R3["Find server & service"]
    UC4 --> |"combo_id"| R4["Trace across all layers"]
```

## Pattern Types

```mermaid
flowchart LR
    subgraph FilePatterns["📄 File Patterns"]
        FP1["HHMMSS--*.tar.gz"]
        FP2["*.parquet"]
        FP3["*.csv"]
    end

    subgraph PathPatterns["📂 Path Patterns"]
        PP1["YYYY/MM/DD/"]
        PP2["YYYY/YYYYMMDD/"]
        PP3["YYYY/"]
    end

    subgraph Combo["🔗 Pattern Combo"]
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

    C1 --> |"--gold pattern"| O1["📦 Bronze + Service"]
    C2 --> |"--vendor --dataset"| O2["🖥️ Server info"]
    C3 --> |"--list"| O3["All servers"]
    C4 --> |"--combo-id"| O4["Full path chain"]
    C5 --> |"--layer --pattern"| O5["Affected datasets"]
```

## Integration

```mermaid
flowchart LR
    subgraph Tools
        PS["🔍 PathSeeker"]
        DB["🗄️ Investigation DB"]
        DS["📊 Datasette"]
    end

    PS --> |"extract patterns"| DB
    DB --> |"browse & query"| DS
```

## References

- 🔗 **Repo:** [alchmydb](https://git.codewilling.com/alchmy/database/alchmydb)
- 🔗 **Related:** [PathSeeker](pathseeker.md)
