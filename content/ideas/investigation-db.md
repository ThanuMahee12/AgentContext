---
title: "Investigation DB: Pattern-Based Reverse Lookup + Notion"
description: "Pattern-based reverse lookup for data pipelines + Notion service tracking."
date: "2026-01-17"
url: "https://git.codewilling.com/-/snippets/4"
tags: ["notion", "infrastructure", "patterns", "reverse-lookup"]
---

Pattern-based reverse lookup for data pipelines + Notion service tracking. When a file is missing in Gold/Platinum, trace back to Bronze source, Service, and Server. Core idea: track patterns not files. Includes full entity relationships, layer definitions (raw→bronze→silver→gold→raw_enriched→delta), CLI ideas (invdb reverse/service/servers/trace/impact), and Notion integration with alchemy_service and alchemy_server databases.
