#!/usr/bin/env bash
# Export real sessions from AgentProbe into the dashboard's local fixtures.
#
# The output is deliberately git-ignored: it contains actual commands, file
# paths and conversation previews. Regenerate it locally rather than sharing it.
#
#   ./scripts/export-fixtures.sh [path-to-AgentProbe]

set -euo pipefail

PROBE="${1:-${AGENTPROBE_PATH:-$HOME/AgentProbe}}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/web/src/data/fixtures.json"
EMAIL="${AGENTPROBE_EMAIL:-$(git config user.email 2>/dev/null || echo unknown@localhost)}"

if [ ! -d "$PROBE/agentprobe" ]; then
    echo "AgentProbe not found at: $PROBE" >&2
    echo "Pass the path as an argument or set AGENTPROBE_PATH." >&2
    exit 1
fi

mkdir -p "$(dirname "$OUT")"

PROBE="$PROBE" OUT="$OUT" EMAIL="$EMAIL" python3 - <<'PY'
import json, os, sys

probe = os.environ["PROBE"]
sys.path.insert(0, probe)

from agentprobe.probes.claude import ClaudeProbe
from agentprobe.context import extract_many

p = ClaudeProbe(user_email=os.environ["EMAIL"])
sessions = list(p.sessions())
items = extract_many(sessions)


def as_json(s):
    d = s.summary_doc()
    d["commands"] = [c.to_dict() for c in s.commands]
    d["files"] = [f.to_dict() for f in s.files]
    return d


out = {"sessions": [as_json(s) for s in sessions], "context": [i.to_dict() for i in items]}
with open(os.environ["OUT"], "w") as fh:
    json.dump(out, fh, indent=2)

print("sessions: %d  context items: %d" % (len(out["sessions"]), len(out["context"])))
print("wrote: %s" % os.environ["OUT"])
PY
