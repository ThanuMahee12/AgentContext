---
title: "Investigation DB: Pattern-Based Reverse Lookup"
description: "Pattern-based reverse lookup for data pipelines."
date: "2026-01-16"
status: "implementing"
gist: "https://gist.github.com/ThanuMahee12/10ca4add500e93626342da06475966eb"
notion: "https://www.notion.so/Investigation-DB"
tags: ["database", "reverse-lookup", "patterns", "pipeline", "notion"]
---

Pattern-based reverse lookup for data pipelines. Core idea: Don't track files - track patterns! When Gold/Platinum file is missing, trace back to Bronze source, Service, Server. Key entities: Infrastructure (Servers, Services, Credentials), Data Sources (Vendors, Datasets, Raw Landing), Patterns (File Patterns, Path Patterns, Pattern Combos), Pipeline (Projects, Layers, Full Paths). Six layers: raw (landing zone) → bronze (timestamped archives) → silver (extracted) → gold (restructured) → raw_enriched (CDP legacy) → delta (Delta Lake). Tables: alchemy_server, alchemy_service, vendor, vendor_credential, cwiq_pipe_source_dataset, alchemy_raw, filetype, file_pattern, path_pattern, pattern_combo, layer, full_path_pattern, delta_table, raw_enriched_data.

## use-cases

*2026-01-17*

Reverse Lookup (Gold → Bronze), Impact Analysis (missing file → affected datasets), Service Discovery (vendor + dataset → server & service), Pattern Tracing (combo_id → all layers).

## cli-ideas

*2026-01-17*

invdb reverse --gold pattern, invdb service --vendor --dataset, invdb servers --list, invdb trace --combo-id, invdb impact --layer --pattern.

## integration

*2026-01-17*

PathSeeker extracts patterns → Investigation DB stores patterns → Datasette browses & queries.

## notion-implementation

*2026-01-17*

Implemented in Notion. Tables created: alchemy_server (3 servers), alchemy_service (32 services). Credentials at ~/.notion/credentials. Server distribution: staging→ny5-predpalch02, prod→ny5-predpalch04/06.
