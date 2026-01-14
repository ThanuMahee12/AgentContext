# 2026-01-14

## Project: AgentContext + data-alchemy

**Repo:** AgentContext, alchmy

**Environment:** Windows machine

### Progress Today

**Session 1:**
- Reorganized session structure:
  - Split sessions into `windows/` and `linux/` subfolders
  - Added `awesome-pages` plugin for auto-nav (newest first)
  - Created `.pages` files for each folder
  - Removed `w-`/`l-` prefixes from filenames
- Updated `alchmy/CLAUDE.md` session path to `{windows,linux}/YYYY-MM-DD.md`
- Added `requirements.txt` with mkdocs dependencies
- Added `.gitignore` for tmpclaude-* temp files
- Pushed both AgentContext and alchmy repos

**Session 2:**
- Created `notes/projects/data-alchemy/Devops.md` with ACL documentation:
  - Corrected ACL layer requirements table
    - raw/ and raw/env*: both regular + default ACL (upstream owns)
    - bronze/silver/gold: regular only (svc_dat_alchemy owns)
    - platinum: regular only (different target dataset, not our owner)
  - Added platinum output structure explanation
  - Added getfacl investigation commands and advanced options
  - Added useful command combinations (-Rd, -t, -s, grep)
  - Added backup & restore workflows
- Updated data-alchemy notes index with DevOps link

### Commands

```bash
# ACL Checker
uv run acl -p /sf/data/vendor/dataset/1.0
uv run acl -p /sf/data/vendor/dataset/1.0 -R        # nested dirs
uv run acl -p /sf/data/vendor/dataset/1.0 -i        # issues only

# getfacl investigation
getfacl /sf/data/vendor/dataset/1.0/raw             # single path
getfacl -R /path                                     # recursive
getfacl -Rd /path                                    # default ACLs only
getfacl -t /path                                     # tabular format
getfacl -R /path | grep svc_dat_alchemy             # check specific user

# setfacl setup
setfacl -m u:svc_dat_alchemy:rwx /path              # regular ACL
setfacl -d -m u:svc_dat_alchemy:rwx /path           # default ACL

# Backup/Restore
getfacl -R /path > acl_backup.txt
setfacl --restore=acl_backup.txt
```

### Next

- Continue data-alchemy work on Linux

---
