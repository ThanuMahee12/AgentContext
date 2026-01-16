# PathSeeker

> 🔍 CLI tool for path analysis and pattern extraction

## The Problem

❓ How do we analyze directory structures and extract reusable patterns?

```mermaid
flowchart LR
    IN[/"📁 /sf/data/bloomberg/2025/11/28/file.csv"/]
    OUT[/"🎯 /sf/data/{vendor}/{YYYY}/{MM}/{DD}/*.csv"/]

    IN -->|"analyze"| OUT
```

## Core Idea

💡 **Split paths → Classify segments → Generate patterns**

```mermaid
flowchart LR
    subgraph Input
        PATH["📁 File Path"]
    end

    subgraph Process
        SPLIT["✂️ Split"]
        CLASS["🏷️ Classify"]
        GEN["⚡ Generate"]
    end

    subgraph Output
        GLOB["🌐 Glob Pattern"]
        REGEX["🔤 Regex Pattern"]
    end

    PATH --> SPLIT --> CLASS --> GEN
    GEN --> GLOB
    GEN --> REGEX
```

## Key Components

```mermaid
mindmap
  root((🔍 PathSeeker))
    📁 PathTree
      PathNode
      BFS Walker
      DFS Walker
    🏷️ Analyzer
      Segment Splitter
      Type Classifier
    ⚡ Extractors
      Glob Extractor
      Regex Extractor
    🖥️ CLI
      scan command
      convert command
```

## Segment Types

```mermaid
flowchart TB
    subgraph Types["🏷️ Segment Types"]
        LIT["📌 LITERAL\nsf, data, bronze"]
        DIG["🔢 DIGITS\n2025, 11, 28"]
        VAR["📝 VARIABLE\nvendor, dataset"]
        TS["⏰ TIMESTAMP\n070847, 235959"]
        DT["📅 DATE\n20251128"]
        EXT["📄 FILE_EXT\n.csv, .parquet"]
    end
```

## Analysis Flow

```mermaid
flowchart TD
    INPUT[/"📁 sf/data/bloomberg/2025/11/28/file.csv"/]

    subgraph Split["✂️ Split Path"]
        S1["sf"]
        S2["data"]
        S3["bloomberg"]
        S4["2025"]
        S5["11"]
        S6["28"]
        S7["file.csv"]
    end

    subgraph Classify["🏷️ Classify"]
        C1["📌 LITERAL"]
        C2["📌 LITERAL"]
        C3["📝 VARIABLE"]
        C4["🔢 YYYY"]
        C5["🔢 MM"]
        C6["🔢 DD"]
        C7["📄 FILE"]
    end

    subgraph Pattern["⚡ Pattern"]
        P1["sf"]
        P2["data"]
        P3["*"]
        P4["[0-9]{4}"]
        P5["[0-9]{2}"]
        P6["[0-9]{2}"]
        P7["*.csv"]
    end

    INPUT --> Split
    S1 --> C1 --> P1
    S2 --> C2 --> P2
    S3 --> C3 --> P3
    S4 --> C4 --> P4
    S5 --> C5 --> P5
    S6 --> C6 --> P6
    S7 --> C7 --> P7

    OUTPUT[/"🎯 sf/data/*/[0-9]{4}/[0-9]{2}/[0-9]{2}/*.csv"/]
    P1 & P2 & P3 & P4 & P5 & P6 & P7 --> OUTPUT
```

## Extraction Modes

```mermaid
flowchart TB
    PATH[/"📁 /data/vendor/2025/file.csv"/]

    subgraph Simple["🟢 SIMPLE"]
        SIM["data/*/2025/*.csv"]
    end

    subgraph Medium["🟡 MEDIUM"]
        MED["data/{vendor}/{YYYY}/{filename}.csv"]
    end

    subgraph Advanced["🔴 ADVANCED"]
        ADV["data/(?P<vendor>[^/]+)/(?P<year>\\d{4})/.*\\.csv"]
    end

    PATH --> Simple
    PATH --> Medium
    PATH --> Advanced
```

## PathTree Structure

```mermaid
flowchart TB
    subgraph PathTree["🌳 PathTree"]
        ROOT["📁 root"]
        ROOT --> N1["📁 data"]
        ROOT --> N2["📁 config"]
        N1 --> N3["📁 vendor1"]
        N1 --> N4["📁 vendor2"]
        N3 --> N5["📄 file.csv"]
        N3 --> N6["📄 file.json"]
    end

    subgraph Methods["Methods"]
        M1["build_tree()"]
        M2["walk_bfs()"]
        M3["walk_dfs()"]
        M4["get_all_files()"]
    end

    PathTree -.-> Methods
```

## CLI Commands

```mermaid
flowchart LR
    subgraph Commands["🖥️ CLI"]
        SCAN["pathseek scan"]
        CONV["pathseek convert"]
    end

    SCAN -->|"-L 3"| D1["Max depth 3"]
    SCAN -->|"-r"| D2["Output regex"]
    SCAN -->|"-g"| D3["Output glob"]
    SCAN -->|"-o file"| D4["Save to file"]

    CONV -->|"glob → regex"| D5["Format convert"]
```

## Output Formats

```mermaid
flowchart LR
    subgraph Formats["📤 Output"]
        CON["🖥️ Console"]
        FILE["📄 File"]
        JSON["📋 JSON"]
        SQL["🗄️ SQL"]
    end
```

## Integration

```mermaid
flowchart LR
    subgraph PathSeeker["🔍 PathSeeker"]
        SCAN["scan paths"]
        PAT["extract patterns"]
    end

    subgraph InvestigationDB["🗄️ Investigation DB"]
        FP["file_pattern"]
        PP["path_pattern"]
        PC["pattern_combo"]
    end

    SCAN --> PAT
    PAT -->|"export"| FP
    PAT -->|"export"| PP
    FP --> PC
    PP --> PC
```

## Project Structure

```mermaid
flowchart TB
    subgraph Project["📁 pathseek/"]
        CLI["🖥️ pathseek.py"]

        subgraph Util["📁 util/"]
            PT["path_tree.py"]
            VL["validators.py"]
            OU["output_utils.py"]
        end

        subgraph Ext["📁 extractors/"]
            AN["analyzer.py"]
            GE["glob_extractor.py"]
            RE["regex_extractor.py"]
        end
    end

    CLI --> Util
    CLI --> Ext
```

## Tech Stack

```mermaid
flowchart LR
    subgraph Stack["🛠️ Technologies"]
        PY["🐍 Python 3.13+"]
        STD["📦 stdlib only"]
        UV["⚡ uv"]
        RUFF["✨ ruff"]
        TEST["🧪 pytest"]
    end
```

## Status

```mermaid
flowchart LR
    subgraph Done["✅ Done"]
        D1["PathTree"]
        D2["BFS Walker"]
        D3["Validators"]
        D4["Segment Analyzer"]
    end

    subgraph Progress["🔄 In Progress"]
        P1["Type Classifier"]
    end

    subgraph Planned["📋 Planned"]
        PL1["Glob Extractor"]
        PL2["Regex Extractor"]
        PL3["CLI Polish"]
        PL4["DB Export"]
    end

    Done --> Progress --> Planned
```

## References

- 🔗 **Related:** [Investigation DB](investigation-db.md)
