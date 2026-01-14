# 2026-01-14

## Project: data-alchemy + AgentContext

**Repo:** alchmy (parent) + data-alchemy (submodule)

**Environment:** Linux machine

---

### Progress Today

**Session 1: bbocax-futures setup**
- Cleared bronze/silver/platinum for fresh backfill
- Reviewed grabber map (4 patterns: shareFuturesBulk, nonShareFuturesBulk)
- User running backfill manually

**Session 2: AgentContext reorganization**
- Pulled updates from Windows (new folder structure)
- Migrated `l-2026-01-13.md` → `linux/2026-01-13.md`
- Reorganized notes structure:
  - `notes/index.md` → main TOC
  - `notes/projects/data-alchemy/index.md` → project TOC
  - `notes/projects/data-alchemy/mapping.md` → bbocax approach
- Consolidated bbocax details from all sessions into `mapping.md`
- Updated `alchmy/CLAUDE.md` with AgentContext notes structure

**Session 3: AgentContext enhancements**
- Added Discussions section (`docs/Claude/discussions/`)
- Created `GicsDiscussion.md` - GICS shovel approach documentation
- Added mermaid diagram support to mkdocs
- Added advanced mkdocs features (toc, footnotes, abbreviations)
- Fixed workflow to use `requirements.txt` for awesome-pages plugin
- Removed push trigger (now schedule + manual only)

---

### GICS Shovel Understanding

Key insight from exploring `tfe-cdp-shovel/shovel/dataset_mapping/gics.py`:

**ZIP Expansion with `!/` notation:**
```
file.xffmt.zip → file.xffmt.zip!/inner.txt → inner.txt.lz4
```

- Don't extract ZIP at mapping time
- List contents → create virtual paths with `!/`
- Extract + LZ4 compress on final copy

**Products handled:** pkgGIC01, bgicshglb03, caintl, seg, CompustatRefDataV2, secid*

---

### Files Modified

| Repo | Files |
|------|-------|
| AgentContext | mkdocs.yml, discussions/, sessions/, notes/ |
| alchmy | CLAUDE.md |
| data-alchemy | (user running backfill) |

**Session 4: Cycle Duration Analysis & DQ Validation**

- Created cycle duration graph from prod logs (`data-alchemy-prod-bloomberg-1.0-bbocax_cwiq_pipe.log`)
- Analyzed 179 cycles from 2026-01-13 (00:01 - 23:55)
- Stats:
  - Mean duration: 3.04 min
  - Max: 120.7 min (Cycle 1581, 20:28-22:29)
  - Slow cycles (>10 min): 6 total, mostly 18:00-22:30 window
- Graph saved: `/home/thanumahee/dev/alchmy/cycle_duration_graph.png`

**DQ Validation (feature/bbocax-futures)**
- Ran `--dq --dq-date-range 20251101:20251120`
- Result: **PASSED** (20 dates checked)
- Findings:
  - 459 missing `.ndjson` files (legacy shovel outputs not mapped in grabber map)
  - 56 type mismatches: `.cax` files (legacy=text/plain, data-alchemy=gzip) - expected
- Missing files are intentional - data-alchemy doesn't produce `.ndjson` transformation outputs

**SCP Command for Prod Logs**
```bash
scp -J bthanujan.mahendran@10.202.210.201 svc_dat_alchemy@ny5-predpalch06:assets/prod/logs/systemd/data-alchemy-prod-bloomberg-1.0-bbocax_cwiq_pipe.log /home/thanumahee/dev/alchmy/
```

---

### Files Created

| Location | File |
|----------|------|
| alchmy | `cycle_duration_analysis.py` |
| alchmy | `cycle_duration_graph.png` |

---

### Next

- Review if `.ndjson` outputs should be added to grabber map
- Commit and push data-alchemy changes

---
