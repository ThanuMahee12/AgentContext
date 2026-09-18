---
title: "data-alchemy-staging: Sample File Generation"
description: "Complete design for staging/sampling from bronze layer."
date: "2026-01-18"
url: "https://git.codewilling.com/-/snippets/6"
tags: ["staging", "sampling", "bronze", "manifest", "data-alchemy"]
visibility: "published"
---

Complete design for staging/sampling from bronze layer. Problem: Can't scan TB files in raw, millions of files/hour. Solution: Prod appends to manifest.jsonl (raw, bronze, mtime), Staging reads manifest and samples from bronze. Alternative: temp_ prefix in raw for early sampling. File type handling: csv, parquet, json, jsonl, gz, zip, tar - all create sample files in same format. Lazy load via mtime check. No watchdog/inotify needed - simple JSONL append.
