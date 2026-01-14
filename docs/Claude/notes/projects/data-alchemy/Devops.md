# DevOps - data-alchemy

## ACL Permission

### Overview

The pipeline requires `rwx` permissions for `svc_dat_alchemy` on specific directories.

### Layer Requirements

| Layer | Regular ACL | Default ACL | Owner | Reason |
|-------|:-----------:|:-----------:|-------|--------|
| raw/ | ✅ | ✅ | Upstream | New env* dirs inherit permission |
| raw/env* | ✅ | ✅ | Upstream | New subdirs inside inherit permission |
| bronze/ | ✅ | ❌ | svc_dat_alchemy | We create, we own |
| silver/ | ✅ | ❌ | svc_dat_alchemy | We create, we own |
| gold/ | ✅ | ❌ | svc_dat_alchemy | We create, we own |
| platinum/ | ✅ | ❌ | Other dataset | Different target path, not our owner |

### Platinum Output Structure

```
Source dataset:
/sf/data/vendor/dataset_cwiq_pipe/1.0/
├── raw/      <-- upstream owns
├── bronze/   <-- svc_dat_alchemy owns
├── silver/   <-- svc_dat_alchemy owns
└── gold/     <-- svc_dat_alchemy owns

Target dataset (platinum writes here):
/sf/data/target_vendor/target_dataset/1.0/raw/
└── subfolder/           <-- created at deployment
    └── 2026/            <-- we create from deployment date
        └── 20260114/    <-- date folders onward (we own)
```

---

## getfacl - Investigate Permissions

### Basic Commands

```bash
# View ACL for single path
getfacl /sf/data/vendor/dataset/1.0/raw

# Recursive - all files and subdirs
getfacl -R /sf/data/vendor/dataset/1.0/raw

# Numeric IDs instead of names
getfacl -n /path

# Skip header (cleaner output)
getfacl -c /path
```

### Advanced Options

| Option | Description |
|--------|-------------|
| `-R` | Recursive (all files/subdirs) |
| `-a` | Access ACL only |
| `-d` | Default ACL only |
| `-c` | Omit header (cleaner) |
| `-t` | Tabular format (side-by-side) |
| `-n` | Numeric user/group IDs |
| `-s` | Skip base entries (show only extended ACLs) |
| `-e` | Show all effective rights |
| `-p` | Absolute paths (keep leading /) |

### Useful Combinations

```bash
# Check only default ACLs recursively
getfacl -Rd /sf/data/vendor/dataset/1.0/raw

# Tabular format (easy to read)
getfacl -t /sf/data/vendor/dataset/1.0/raw

# Skip files with only base ACL (find extended ACLs)
getfacl -Rs /sf/data/vendor/dataset/1.0/

# Audit to file
getfacl -R /sf/data/vendor/dataset/1.0/ > acl_audit.txt

# Check specific user's access
getfacl -R /path | grep svc_dat_alchemy
```

### Backup & Restore ACLs

```bash
# Backup ACLs
getfacl -R /sf/data/vendor/dataset/1.0/ > acl_backup.txt

# Restore ACLs
setfacl --restore=acl_backup.txt

# Copy ACL from one file to another
getfacl file1 | setfacl --set-file=- file2
```

---

## ACL Checker CLI

Added in `feature/acl-handler-refactor` branch (2026-01-13).

**Location:** `scripts/pre_deployment_verification/acl_checker.py`

**Entry point:** `uv run acl`

```bash
# Basic check
uv run acl -p /sf/data/vendor/dataset/1.0

# With nested dirs inside env*
uv run acl -p /sf/data/vendor/dataset/1.0 -R

# With env pattern filter
uv run acl -p /sf/data/vendor/dataset/1.0 -e 'env[1-4]'

# Issues only
uv run acl -p /sf/data/vendor/dataset/1.0 -i
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `-p`/`--path` | Dataset path |
| `-e`/`--env` | Env pattern filter (env*, env[1-3]) |
| `-R`/`--recursive` | Show nested dirs inside env* |
| `-i`/`--issues-only` | Show only permission issues |

### Output Features

- Tree display with OK/issue status
- Issue envs shown individually
- OK envs grouped as pattern (e.g., `env[1-4]`)
- `format_env_range()` helper for compact display

---

## Setup Commands

### Source Dataset

```bash
# Raw layer (both regular + default)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw
setfacl -d -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw

# Raw env* (both regular + default)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw/env*
setfacl -d -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw/env*

# Bronze/Silver/Gold (regular only - we own these)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/bronze
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/silver
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/gold
```

### Platinum Target Dataset

```bash
# Target raw folder (regular only - we create subdirs from deployment)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{target_vendor}/{target_dataset}/1.0/raw
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| NO_REGULAR_ACL | `setfacl -m u:svc_dat_alchemy:rwx /path` |
| NO_DEFAULT_ACL | `setfacl -d -m u:svc_dat_alchemy:rwx /path` |
| NOT_FOUND | Create dir first, then set ACL |

---

## Reference

- Full docs: `alchmy/docs/data-alchemy/deployment/ACLPermission.md`
- [getfacl manual](https://man7.org/linux/man-pages/man1/getfacl.1.html)
- [setfacl/getfacl examples](https://www.golinuxcloud.com/setfacl-getfacl-command-in-linux/)
