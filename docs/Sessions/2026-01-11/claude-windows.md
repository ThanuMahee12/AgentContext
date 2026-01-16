# 2026-01-11

## Project: alchmy

### What I did
- Set up AgentContext repo for global session management
- Configured MkDocs with GitHub Pages CI/CD
- Organized structure: sessions/ + notes/

### Notes
- Moved session management from alchmy repo to global level
- Single markdown file per project in notes/
- Auto-deploy on push via GitHub Actions

---

## Project: alchmydb

### What I did
- Added `alchemy_service` table to track systemd services running data-alchemy pipelines
- Created 20 service records (15 vendor-version-dataset + 5 vendor-only)
- Updated `alchemy_server` with ny5-predpalch01 from ansible inventory
- Created `alchmydb/CLAUDE.md` for Claude Code guidance
- Optimized `alchmy/CLAUDE.md` with build commands

### Schema: alchemy_service
```sql
CREATE TABLE alchemy_service (
    service_id, server_id, raw_id, vendor_id,
    dataset_name, dataset_version, service_name,
    environment, exec_script, watch_interval,
    fp_prefix, raw_fp_prefix, log_path, playbook_file
);
```

### Source references
- Service files: `data-alchemy/build/service-files/`
- Playbook: `deploy-data-alchemy-prod06.yml`
- Inventory: `data-alchemy/build/inventory/hosts.yml`

---

## Project: alchmydb (continued)

### Filetype Normalization

Refactored `raw_filetype` from flat table to normalized structure:

**Before (flat):**
```
raw_filetype: filetype_id, raw_id, extension, mime_type
```

**After (normalized):**
```
filetype (lookup)           raw_filetype (bridge)
├── filetype_id PK          ├── raw_filetype_id PK
├── extension UNIQUE        ├── raw_id FK
├── mime_type               ├── filetype_id FK
├── category                └── is_primary
└── description
```

**Categories:**
- data: csv, parquet, json, xml, txt
- archive: gz, zip, lz4
- spreadsheet: xlsx
- vendor: dfrt, cov, rsk (MSCI)
- control: flg

**Benefit:** Reusable for bronze, gold, cdp layers

---

---

## Project: pathseek

Path analysis tool that scans directories and extracts regex/glob patterns.

**Repo:** https://github.com/ThanuMahee12/pathseek

**Core idea:** Scan folder → Analyze paths → Output patterns

**CLI Flags (Linux-style):**
| Flag | Short | Description | Like |
|------|-------|-------------|------|
| `PATH` | - | Base path to scan | - |
| `--level` | `-L` | Max level | `tree -L` |
| `--type` | `-t` | Type: f/d | `find -type` |
| `--count` | `-c` | Count only | `grep -c` |
| `--pattern` | `-p` | Per-path patterns | - |
| `--single` | `-s` | Single combined | - |
| `--unique` | `-u` | Deduplicated | `sort -u` |
| `--regex` | `-r` | Output regex | - |
| `--glob` | `-g` | Output glob | - |
| `--output` | `-o` | Save to file | `gcc -o` |

**Implemented:**
- `pathseek.py` with `-L`, `-t`, `-c` flags
- `walk_paths()`, `filter_paths()` generators

**Output examples:**
```bash
# Default (list paths)
python pathseek.py /sf/data

# With filters
python pathseek.py /sf/data -L 3 -t f

# Regex patterns
python pathseek.py /sf/data -p -r

# Glob patterns
python pathseek.py /sf/data -p -g

# Single combined
python pathseek.py /sf/data -s -r -o patterns.txt
```

**Structure:**
```
pathseek/
├── util/
│   ├── path_utils.py    # walk_paths(), filter_paths()
│   ├── output_utils.py  # output_list lambda
│   └── cli_utils.py     # add_common_args()
├── pathseek.py          # Main CLI
├── pattern_extractor.py # TODO
├── CLAUDE.md
├── CHANGELOG.md
├── LICENSE
├── README.md
└── .gitignore
```

**Key decisions:**
- Generator pattern for memory efficiency
- Lambda for simple functions
- Linux CLI conventions
- Reusable CLI args in cli_utils.py

**Next:**
- Create `pattern_extractor.py` - Pattern detection logic
- Add `-p`, `-s`, `-u`, `-r`, `-g`, `-o` flags

---

---

## Project: data-alchemy (bbocax mapping)

### Branch
`feature/bbocax-new-mapping`

### Investigation: Missing bbocax back_office mappings

**Current state:**
- Only 4 grabber map types exist for bbocax_cwiq_pipe:
  - backoffice (pfdExch parquet corporate actions)
  - backoffice_cax (pfdExch .cax corporate actions)
  - corporate_actions (equity .cax)
  - corporate_actions_parquet (equity .parquet)

**Missing back_office datasets (from shovel bbo.py):**
| Subproduct | Package | Table Count |
|------------|---------|-------------|
| futures | non_share_futures_extended | 120 |
| equity_options | - | 124 |
| futures | share_futures_extended | 90 |
| futures | share_futures | 56 |
| futures | non_share_futures | 51 |
| equity | - | 40 |
| preferred_exch | - | 24 |
| supplemental | - | 7 |
| currency | - | 5 |

**Key files examined:**
- `tfe-cdp-shovel/shovel/dataset_mapping/bbo.py` - shovel mapping logic
- `tfe-cdp-shovel/shovel/dataset_mapping/bbo_product_mapping.json` - 544 table→subproduct mappings
- `/sf/proj/data_alchemy/assets/cdp_out/bloomberg/back_office_*` - platinum output structure

**Understanding:**
1. Decrypt inclusions control which .enc files get decrypted at silver
2. Grabber maps control gold→platinum path transformation
3. Shovel does simple copy with path restructure (no data transform for most files)
4. Some files stay compressed (.gz), some get decompressed

**Platinum output patterns:**
- `back_office_convert_bonds` → `.dif.gz`, `.out.gz` (keep compressed + date)
- `back_office_futures` → `.dif`, `.out` (decompress only)
- `back_office_preferred_exch_corporate_actions` → `.ndjson`, `.parquet`, `.cax` (transform + raw)

### Next steps
- Create mapping table: source pattern → platinum path
- Update decrypt inclusions for all file types
- Create grabber maps for each back_office subproduct

---

### Next steps (tomorrow)
- CDP Target tables: `cdp_vendor`, `cdp_dataset`, `cwiq_cdp_mapping`
