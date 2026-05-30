#!/usr/bin/env bash
set -euo pipefail

MAX_PIPELINE_ROUNDS="${1:-20}"
DEV_ITERATIONS_PER_ROUND="${2:-5}"
MAPPING_REFINE_ROUNDS="${3:-3}"
DEV_REPAIR_ROUNDS="${4:-2}"
DRY_RUN="${5:-No}"

CURRENT_TASK_FILE="docs/implementation/CURRENT_TASK.md"
MASTER_QUEUE_FILE="docs/implementation/MASTER_PRD_QUEUE.md"

RUN_MAPPING_SCRIPT="./scripts/codex/run-prd-mapping-only.sh"
REVIEW_REFINE_MAPPING_SCRIPT="./scripts/codex/review-and-refine-prd-mapping.sh"
RUN_DEV_SCRIPT="./scripts/codex/run-prd-auto-loop-with-ai-review.sh"
VALIDATE_SCRIPT="./scripts/codex/validate-prd-md-consistency.sh"
FINAL_VERIFY_SCRIPT="./scripts/codex/run-prd-final-verification.sh"
SYNC_STATE_SCRIPT="./scripts/codex/sync-pipeline-state.sh"
DRY_RUN_SCRIPT="./scripts/codex/prd-pipeline-dry-run.sh"

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run this script from project root."
  exit 1
fi

if [ ! -f "$MASTER_QUEUE_FILE" ]; then
  echo "ERROR: $MASTER_QUEUE_FILE not found."
  exit 1
fi

for script in "$RUN_MAPPING_SCRIPT" "$REVIEW_REFINE_MAPPING_SCRIPT" "$RUN_DEV_SCRIPT" "$VALIDATE_SCRIPT" "$FINAL_VERIFY_SCRIPT" "$SYNC_STATE_SCRIPT" "$DRY_RUN_SCRIPT"; do
  if [ ! -x "$script" ]; then
    echo "ERROR: $script is not executable or not found."
    echo "Run: chmod +x $script"
    exit 1
  fi
done

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ "$DRY_RUN" = "--dry-run" ] || [ "$DRY_RUN" = "dry-run" ] || [ "$DRY_RUN" = "DryRun" ]; then
  "$DRY_RUN_SCRIPT"
  exit 0
fi

get_task_field() {
  local heading="$1"

  if [ ! -f "$CURRENT_TASK_FILE" ]; then
    return 0
  fi

  awk -v heading="$heading" '
    $0 == "## " heading { found=1; next }
    found && NF { print $0; exit }
  ' "$CURRENT_TASK_FILE" | tr -d '\r' || true
}

get_current_prd_id() {
  local current_prd
  current_prd="$(get_task_field "Current PRD")"
  printf "%s" "$current_prd" | awk '{ print $1 }'
}

queue_first_active_row() {
  python3 <<'PY'
from pathlib import Path

path = Path("docs/implementation/MASTER_PRD_QUEUE.md")
lines = path.read_text(encoding="utf-8").splitlines()

for line in lines:
    if not line.startswith("|"):
        continue
    if line.startswith("|---"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 8:
        continue
    if cells[0] == "Order":
        continue

    order, prd_file, module, impl_dir, status, current_slice, priority, notes = cells[:8]
    if status not in {"Verified", "Skipped"}:
        print("\t".join([order, prd_file, module, impl_dir, status, current_slice, priority, notes]))
        raise SystemExit(0)

raise SystemExit(1)
PY
}

queue_row_by_order() {
  local order="$1"

  python3 <<PY
from pathlib import Path

target = "$order"
path = Path("docs/implementation/MASTER_PRD_QUEUE.md")
lines = path.read_text(encoding="utf-8").splitlines()

for line in lines:
    if not line.startswith("|"):
        continue
    if line.startswith("|---"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 8:
        continue
    if cells[0] == "Order":
        continue

    order, prd_file, module, impl_dir, status, current_slice, priority, notes = cells[:8]
    if order == target:
        print("\t".join([order, prd_file, module, impl_dir, status, current_slice, priority, notes]))
        raise SystemExit(0)

raise SystemExit(1)
PY
}

update_current_task_for_prd_mapping() {
  local order="$1"
  local prd_file="$2"
  local module="$3"
  local impl_dir="$4"
  local status="$5"
  local current_slice="$6"

  mkdir -p docs/implementation

  cat > "$CURRENT_TASK_FILE" <<EOF_TASK
# CURRENT TASK

## Current PRD

$order - $module

## Current Implementation Directory

$impl_dir

## Current Slice

$current_slice

## Status

$status

## Last Run Summary

当前 PRD 已由总控脚本选中。若实施目录尚未完成切片拆解，将进入 Mapping Only 流程；若切片质量已通过，将进入开发流程。

## Next Recommended Action

Resolve the current PRD phase automatically. If mapping is missing or not approved, run mapping and mapping review first. If mapping is ready, implement the current slice only.
EOF_TASK
}

update_master_queue_row() {
  local order="$1"
  local new_status="$2"
  local new_slice="$3"
  local new_note="$4"

  python3 <<PY
from pathlib import Path

path = Path("docs/implementation/MASTER_PRD_QUEUE.md")
target = "$order"
new_status = "$new_status"
new_slice = "$new_slice"
new_note = "$new_note"

lines = path.read_text(encoding="utf-8").splitlines()
out = []
updated = False

for line in lines:
    if not line.startswith("|") or line.startswith("|---"):
        out.append(line)
        continue

    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 8 or cells[0] == "Order":
        out.append(line)
        continue

    if cells[0] == target:
        cells[4] = new_status
        cells[5] = new_slice
        cells[7] = new_note
        out.append("| " + " | ".join(cells) + " |")
        updated = True
    else:
        out.append(line)

if not updated:
    raise SystemExit(f"ERROR: could not find queue row {target}")

path.write_text("\\n".join(out) + "\\n", encoding="utf-8")
PY
}

implementation_docs_exist() {
  local impl_dir="$1"

  [ -f "$impl_dir/IMPLEMENTATION_MAP.md" ] &&
  [ -f "$impl_dir/CURRENT_SLICE.md" ] &&
  [ -f "$impl_dir/PROGRESS.md" ] &&
  [ -f "$impl_dir/ACCEPTANCE_CHECKLIST.md" ] &&
  [ -f "$impl_dir/DECISIONS.md" ] &&
  [ -f "$impl_dir/SLICE_SELF_REVIEW.md" ]
}

latest_mapping_review_log() {
  local impl_dir="$1"
  ls -t "$impl_dir"/logs/codex-prd-mapping-review-*.log 2>/dev/null | head -n 1 || true
}

mapping_review_passed() {
  local impl_dir="$1"
  local log_file
  log_file="$(latest_mapping_review_log "$impl_dir")"

  if [ -z "$log_file" ] || [ ! -f "$log_file" ]; then
    return 1
  fi

  local status score can_implement
  status="$(grep -E "^MAPPING_REVIEW_FINAL_STATUS:" "$log_file" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"
  score="$(grep -E "^MAPPING_REVIEW_SCORE:" "$log_file" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"
  can_implement="$(grep -E "^MAPPING_REVIEW_CAN_IMPLEMENT:" "$log_file" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"

  [ "$status" = "Passed" ] && [ "$can_implement" = "Yes" ] && [ "$score" -ge 90 ] 2>/dev/null
}

extract_first_ready_slice_from_current_slice_file() {
  local impl_dir="$1"

  awk -F '：' '
    /切片 ID/ {
      value=$2
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      id=value
    }
    /名称/ {
      value=$2
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      name=value
    }
    END {
      if (id != "" && name != "") {
        print id " - " name
      } else if (id != "") {
        print id
      }
    }
  ' "$impl_dir/CURRENT_SLICE.md"
}

extract_status_from_current_slice_file() {
  local impl_dir="$1"

  awk -F '：' '
    /状态/ {
      value=$2
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      print value
      exit
    }
  ' "$impl_dir/CURRENT_SLICE.md"
}

ensure_clean_worktree() {
  if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Working tree is not clean."
    echo "Please commit or stash current changes first."
    git status --short
    exit 1
  fi
}

commit_if_changed() {
  local message="$1"

  if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit."
    return 0
  fi

  "$SYNC_STATE_SCRIPT" || true

  git add .
  git commit -m "$message"
}

run_mapping_phase() {
  local order="$1"
  local prd_file="$2"
  local module="$3"
  local impl_dir="$4"

  echo ""
  echo "----- Mapping phase for PRD $order - $module -----"
  echo ""

  if ! implementation_docs_exist "$impl_dir"; then
    echo "Implementation docs missing. Run Mapping Only..."
    "$RUN_MAPPING_SCRIPT" "$order" "$prd_file" "$module"
    commit_if_changed "codex: map PRD $order - $module"
  else
    echo "Implementation docs already exist."
  fi

  echo ""
  echo "Run mapping review and automatic refinement..."
  "$REVIEW_REFINE_MAPPING_SCRIPT" "$impl_dir" "$MAPPING_REFINE_ROUNDS"

  if ! mapping_review_passed "$impl_dir"; then
    echo "ERROR: mapping review did not pass after refinement."
    exit 1
  fi

  local first_slice first_status
  first_slice="$(extract_first_ready_slice_from_current_slice_file "$impl_dir")"
  first_status="$(extract_status_from_current_slice_file "$impl_dir")"

  if [ -z "$first_slice" ]; then
    echo "ERROR: could not extract first Ready slice from $impl_dir/CURRENT_SLICE.md"
    exit 1
  fi

  if [ -z "$first_status" ]; then
    first_status="Ready"
  fi

  update_current_task_for_prd_mapping "$order" "$prd_file" "$module" "$impl_dir/" "$first_status" "$first_slice"
  update_master_queue_row "$order" "In Progress" "$first_slice" "Mapping review passed; ready for implementation."

  commit_if_changed "codex: approve PRD $order mapping"

  echo ""
  echo "Mapping phase passed. PRD $order is ready for implementation."
}

run_development_phase() {
  local order="$1"
  local module="$2"

  echo ""
  echo "----- Development phase for PRD $order - $module -----"
  echo ""

  "$VALIDATE_SCRIPT"

  "$RUN_DEV_SCRIPT" "$DEV_ITERATIONS_PER_ROUND" "$DEV_REPAIR_ROUNDS"

  echo ""
  echo "Development phase returned control to pipeline."
}


current_prd_ready_for_final_verification() {
  local impl_dir="$1"

  if [ ! -f "$impl_dir/IMPLEMENTATION_MAP.md" ]; then
    return 1
  fi

  if grep -E "^- 当前状态：(Ready|In Progress|Not Started|Needs Fix|Human Review Required|Blocked)" "$impl_dir/IMPLEMENTATION_MAP.md" >/dev/null 2>&1; then
    return 1
  fi

  return 0
}

run_final_verification_phase() {
  local order="$1"
  local module="$2"

  echo ""
  echo "----- Final verification phase for PRD $order - $module -----"
  echo ""

  "$FINAL_VERIFY_SCRIPT"

  commit_if_changed "codex: final verify PRD $order - $module"
}

for round in $(seq 1 "$MAX_PIPELINE_ROUNDS"); do
  echo ""
  echo "============================================================"
  echo "Full PRD pipeline round $round / $MAX_PIPELINE_ROUNDS"
  echo "============================================================"
  echo ""

  ensure_clean_worktree

  if [ ! -f "$CURRENT_TASK_FILE" ]; then
    echo "CURRENT_TASK.md not found. Select first active PRD from queue..."
    row="$(queue_first_active_row)" || {
      echo "No active PRD found. Pipeline finished."
      exit 0
    }

    IFS=$'\t' read -r order prd_file module impl_dir status current_slice priority notes <<< "$row"
    update_current_task_for_prd_mapping "$order" "$prd_file" "$module" "$impl_dir" "$status" "$current_slice"
    commit_if_changed "codex: initialize current task for PRD $order"
  fi

  current_prd_id="$(get_current_prd_id)"

  if [ -z "$current_prd_id" ]; then
    echo "Current PRD id is empty. Select first active PRD from queue..."
    row="$(queue_first_active_row)" || {
      echo "No active PRD found. Pipeline finished."
      exit 0
    }
  else
    row="$(queue_row_by_order "$current_prd_id")" || {
      echo "Current PRD $current_prd_id not found in queue. Select first active PRD..."
      row="$(queue_first_active_row)" || {
        echo "No active PRD found. Pipeline finished."
        exit 0
      }
    }
  fi

  IFS=$'\t' read -r order prd_file module impl_dir queue_status queue_slice priority notes <<< "$row"

  impl_dir="${impl_dir%/}"

  echo "Selected PRD: $order - $module"
  echo "PRD file: $prd_file"
  echo "Implementation dir: $impl_dir"
  echo "Queue status: $queue_status"
  echo "Queue current slice: $queue_slice"
  echo ""

  if [ "$queue_status" = "Verified" ] || [ "$queue_status" = "Skipped" ]; then
    echo "Current PRD is $queue_status. Select next active PRD..."
    row="$(queue_first_active_row)" || {
      echo "No active PRD found. Pipeline finished."
      exit 0
    }

    IFS=$'\t' read -r order prd_file module impl_dir queue_status queue_slice priority notes <<< "$row"
    impl_dir="${impl_dir%/}"
  fi

  if [ ! -f "$prd_file" ]; then
    echo "ERROR: PRD file not found: $prd_file"
    exit 1
  fi

  if current_prd_ready_for_final_verification "$impl_dir"; then
    run_final_verification_phase "$order" "$module"
    echo ""
    echo "Final verification completed or reported issues. Continue in next pipeline loop."
    continue
  fi

  if ! implementation_docs_exist "$impl_dir" || ! mapping_review_passed "$impl_dir"; then
    run_mapping_phase "$order" "$prd_file" "$module" "$impl_dir"
    echo ""
    echo "Mapping is approved. Continue to development in the next pipeline loop."
    continue
  fi

  run_development_phase "$order" "$module"

  echo ""
  echo "Refresh pipeline context after development..."
  echo ""
done

echo ""
echo "Reached MAX_PIPELINE_ROUNDS=$MAX_PIPELINE_ROUNDS. Stop."
