# Server Commands Reference

Useful commands for production server operations.

---

## Server-Friendly Execution

Always use low priority for non-urgent tasks:

```bash
nice -n 19 ionice -c2 -n7 <command>
```

| Flag | Purpose |
|------|---------|
| `nice -n 19` | Lowest CPU priority |
| `ionice -c2 -n7` | Best-effort I/O, lowest priority |

---

## Directory Tree Scan

### JSON Output with mtime (Files & Folders)
```bash
nice -n 19 ionice -c2 -n7 tree -J -D --timefmt '%Y-%m-%d %H:%M:%S' /sf/data > ~/sf_data_tree.json
```

### Tree Flags
| Flag | Purpose |
|------|---------|
| `-J` | JSON output |
| `-D` | Include modification time |
| `--timefmt` | Date format (e.g., `'%Y-%m-%d %H:%M:%S'`) |
| `-L N` | Depth limit |
| `-d` | Directories only |

### Per-Vendor with Progress (Sequential)
```bash
for vendor in /sf/data/*/; do
  echo "[$(date '+%H:%M:%S')] Scanning: $(basename $vendor)"
  nice -n 19 ionice -c2 -n7 tree -J -D --timefmt '%Y-%m-%d %H:%M:%S' "$vendor" > ~/tree_$(basename $vendor).json
done && echo "[$(date '+%H:%M:%S')] Done!"
```

### Parallel Execution (Multi-Core)
```bash
# Use N cores with xargs -P N
ls -d /sf/data/*/ | xargs -P 2 -I {} bash -c '
  vendor=$(basename "{}")
  echo "[$(date "+%H:%M:%S")] Scanning: $vendor"
  nice -n 19 ionice -c2 -n7 tree -J -D --timefmt "%Y-%m-%d %H:%M:%S" "{}" > ~/tree_${vendor}.json
'
echo "[$(date '+%H:%M:%S')] Done!"
```

### Core Usage Guidelines (4-core machine)
| `-P` Value | Cores | Speed | Impact |
|------------|-------|-------|--------|
| 1 (default) | 1 | Baseline | Minimal |
| 2 | 2 | 2x faster | Low |
| 4 | 4 | 4x faster | Medium |

### Check Available Cores
```bash
nproc
```

---

## Alternative: Find with JSONL (Real-time Progress)

```bash
nice -n 19 ionice -c2 -n7 find /sf/data -printf '{"path":"%p","type":"%y","mtime":"%TY-%Tm-%Td %TH:%TM:%TS","size":%s}\n' 2>/dev/null > ~/sf_data_tree.jsonl &

# Watch progress
watch -n 5 'wc -l ~/sf_data_tree.jsonl'
```

---

## Background Execution

### Run with nohup (survives SSH disconnect)
```bash
nohup nice -n 19 ionice -c2 -n7 <command> > ~/output.log 2>&1 &
```

### Check Progress
```bash
# Check if running
ps aux | grep tree
ps aux | grep find

# Check output file size
ls -lh ~/output.json

# Tail log
tail -f ~/output.log
```

---

## rsync (Server-Friendly Copy)

```bash
nice -n 19 ionice -c2 -n7 rsync -avh --progress --bwlimit=50000 <source> <dest>
```

| Flag | Purpose |
|------|---------|
| `-a` | Archive mode |
| `-v` | Verbose |
| `-h` | Human-readable |
| `--progress` | Show progress |
| `--bwlimit=50000` | Limit to 50MB/s |
| `--relative` | Preserve path structure |

### Example: Copy with Structure
```bash
nice -n 19 ionice -c2 -n7 rsync -avh --progress --relative --bwlimit=50000 \
  /sf/data/./vendor/dataset/version/raw/ \
  /destination/
```

---

## Process Management

### List Processes
```bash
ps aux | grep $USER
ps -u $USER -o pid,cmd,%cpu,%mem,etime
jobs -l
```

### Kill Processes
```bash
# Kill background jobs
kill $(jobs -p) 2>/dev/null

# Kill by PID
kill <PID>

# Find specific process
ps -u $USER -o pid,cmd | grep -E 'tree|find|rsync'
```

---

## JSON Output Format (tree -J)

```json
[
  {"type":"directory","name":"vendor","time":"2026-01-19 09:00:00","contents":[
    {"type":"directory","name":"dataset","time":"2026-01-19 08:00:00","contents":[
      {"type":"file","name":"file.csv","time":"2026-01-19 07:30:00"}
    ]}
  ]}
]
```

---

## Servers

| Server | Purpose |
|--------|---------|
| ny5-predpalch02 | Production data processing |

---

## Quick Reference

```bash
# Check cores
nproc

# Server-friendly tree scan (2 cores)
ls -d /sf/data/*/ | xargs -P 2 -I {} bash -c 'nice -n 19 ionice -c2 -n7 tree -J -D --timefmt "%Y-%m-%d %H:%M:%S" "{}" > ~/tree_$(basename {}).json && echo "Done: $(basename {})"'

# Copy JSON files to local
scp user@server:~/tree_*.json /local/path/
```
