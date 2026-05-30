#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

STATE_FILE="docs/implementation/PIPELINE_STATE.json"

CURRENT_PRD_ID="$(printf "%s" "$CURRENT_PRD" | awk '{ print $1 }')"
CURRENT_MODULE="$(printf "%s" "$CURRENT_PRD" | sed 's/^[^ ]*[[:space:]]*-[[:space:]]*//')"
CURRENT_SLICE_ID="$(printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }')"
CURRENT_SLICE_NAME="$(printf "%s" "$CURRENT_SLICE" | sed 's/^[^ ]*[[:space:]]*-[[:space:]]*//')"
UPDATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

PHASE="development"

if [ -f "$PROGRESS_FILE" ] && grep -qi "Mapping" "$PROGRESS_FILE"; then
  if ! grep -qi "当前切片.*Ready" "$PROGRESS_FILE"; then
    PHASE="mapping"
  fi
fi

if [ "$CURRENT_STATUS" = "Ready" ]; then
  PHASE="development_ready"
fi

if [ "$CURRENT_STATUS" = "Human Review Required" ]; then
  PHASE="review"
fi

if [ "$CURRENT_STATUS" = "Needs Fix" ]; then
  PHASE="fix"
fi

if [ "$CURRENT_STATUS" = "Verified" ]; then
  PHASE="verified"
fi

mkdir -p "$(dirname "$STATE_FILE")"

python3 <<PY
import json
from pathlib import Path

state = {
    "current_prd": "$CURRENT_PRD_ID",
    "current_module": "$CURRENT_MODULE",
    "implementation_dir": "$PRD_DIR",
    "current_slice": "$CURRENT_SLICE_ID",
    "current_slice_name": "$CURRENT_SLICE_NAME",
    "phase": "$PHASE",
    "status": "$CURRENT_STATUS",
    "current_task_file": "$CURRENT_TASK_FILE",
    "master_queue_file": "$MASTER_QUEUE_FILE",
    "current_slice_file": "$CURRENT_SLICE_FILE",
    "progress_file": "$PROGRESS_FILE",
    "implementation_map_file": "$IMPLEMENTATION_MAP_FILE",
    "acceptance_checklist_file": "$ACCEPTANCE_CHECKLIST_FILE",
    "review_file": "$REVIEW_FILE",
    "updated_at": "$UPDATED_AT"
}

path = Path("$STATE_FILE")
path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Synced pipeline state to {path}")
PY
