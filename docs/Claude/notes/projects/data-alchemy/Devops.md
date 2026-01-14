# DevOps - data-alchemy

## ACL Permission

### Overview

The pipeline requires `rwx` permissions for `svc_dat_alchemy` on specific directories.

### Layer Requirements

| Layer | Regular ACL | Default ACL | Reason |
|-------|-------------|-------------|--------|
| raw/ | Required | Required | Pipeline reads; env* dirs inherit |
| raw/env* | Required | Not needed | Pipeline reads files inside |
| bronze/ | Required | Not needed | Pipeline creates dirs/files |
| silver/ | Required | Not needed | Pipeline creates dirs/files |
| gold/ | Required | Not needed | Pipeline creates dirs/files |
| platinum/ | Required | Not needed | Final output (different path) |

### ACL Checker CLI

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

### Setup Commands

```bash
# Raw layer (both regular + default)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw
setfacl -d -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/raw

# Other layers (regular only)
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/bronze
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/silver
setfacl -m u:svc_dat_alchemy:rwx /sf/data/{vendor}/{dataset}/1.0/gold
```

### Common Issues

| Issue | Solution |
|-------|----------|
| NO_REGULAR_ACL | `setfacl -m u:svc_dat_alchemy:rwx /path` |
| NO_DEFAULT_ACL | `setfacl -d -m u:svc_dat_alchemy:rwx /path` |
| NOT_FOUND | Create dir first, then set ACL |

### Reference

Full docs: [`docs/data-alchemy/deployment/ACLPermission.md`](../../../../../../../Downloads/alchmy/docs/data-alchemy/deployment/ACLPermission.md)
