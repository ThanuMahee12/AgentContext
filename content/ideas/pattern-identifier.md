---
title: "Pattern Identifier: Auto Regex Suggestion"
date: "2026-01-18"
url: "https://git.codewilling.com/-/snippets/7"
tags: ["regex", "patterns", "sf-storage-migration", "automation"]
---

Tool to identify patterns and suggest regex for unknown file paths. Problem: 232 handlers, new paths require manual regex creation. Solution: pattern.py script that searches existing patterns, if UNKNOWN suggests regex automatically. Features: date format detection (YYYY/MM/DD, YYYYMMDD, YYYY-MM-DD, etc.), component extraction (vendor, dataset, subdirs, filename), similar pattern finding, batch directory scanning.
