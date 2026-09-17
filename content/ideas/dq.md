---
title: "Data Quality (DQ): Pipeline Validation"
description: "Data quality framework across entire data-alchemy pipeline."
date: "2026-01-17"
url: "https://git.codewilling.com/alchmy/inverstigations/-/issues/2"
tags: ["validation", "data-quality", "data-alchemy"]
---

Data quality framework across entire data-alchemy pipeline. Four stages: Bronze (file existence, completeness), Silver (schema validation, format), Gold (data type checks, nulls), Platinum (business rules, thresholds). Five DQ check types: completeness (all expected files present), timeliness (files arrive within SLA), validity (data conforms to schema), consistency (cross-file validation), uniqueness (no duplicate records). CLI usage: python -m data_alchemy.main --vendor sp --dataset gics_cwiq_pipe --version 1.0 --dq --lookback 20. Flags: --dq enables checks, --lookback N checks last N days.
