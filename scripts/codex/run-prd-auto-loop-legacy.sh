#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${1:-3}"

PRD_DIR="docs/implementation/001_组织与身份中心"
REVIEW_FILE="$PRD_DIR/SLICE_SELF_REVIEW.md"
CURRENT_TASK_FILE="docs/implementation/CURRENT_TASK.md"
MASTER_QUEUE_FILE="docs/implementation/MASTER_PRD_QUEUE.md"
RUN_SLICE_SCRIPT="./scripts/codex/run-slice-with-review.sh"
LOG_DIR="$PRD_DIR/logs"

mkdir -p "$LOG_DIR"

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run this script from project root."
  exit 1
fi

if [ ! -f "$CURRENT_TASK_FILE" ]; then
  echo "ERROR: $CURRENT_TASK_FILE not found."
  exit 1
fi

if [ ! -f "$MASTER_QUEUE_FILE" ]; then
  echo "ERROR: $MASTER_QUEUE_FILE not found."
  exit 1
fi

if [ ! -x "$RUN_SLICE_SCRIPT" ]; then
  echo "ERROR: $RUN_SLICE_SCRIPT is not executable or not found."
  echo "Run: chmod +x $RUN_SLICE_SCRIPT"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

get_current_status() {
  awk '
    /^## Status/ { found=1; next }
    found && NF { print $0; exit }
  ' "$CURRENT_TASK_FILE" | tr -d '\r' || true
}

get_current_slice() {
  awk '
    /^## Current Slice/ { found=1; next }
    found && NF { print $0; exit }
  ' "$CURRENT_TASK_FILE" | tr -d '\r' || true
}

extract_review_value() {
  local pattern="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "$pattern" "$file" | tail -n 1 || true
}

for i in $(seq 1 "$MAX_ITERATIONS"); do
  echo ""
  echo "========================================"
  echo "Codex PRD auto loop iteration $i / $MAX_ITERATIONS"
  echo "========================================"
  echo ""

  CURRENT_SLICE_BEFORE="$(get_current_slice)"
  CURRENT_STATUS_BEFORE="$(get_current_status)"

  echo "Current slice before run:"
  echo "$CURRENT_SLICE_BEFORE"
  echo ""
  echo "Current status before run:"
  echo "$CURRENT_STATUS_BEFORE"
  echo ""

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ERROR: Working tree is not clean before iteration $i."
    echo "Please commit or stash current changes first."
    echo ""
    git status --short
    exit 1
  fi

  LOG_FILE="$LOG_DIR/codex-auto-loop-$(date +"%Y%m%d-%H%M%S")-iter-$i.log"

  "$RUN_SLICE_SCRIPT" | tee "$LOG_FILE"

  echo ""
  echo "Checking self-review result..."
  echo ""

  if [ ! -f "$REVIEW_FILE" ]; then
    echo "SLICE_SELF_REVIEW.md was not generated. Stop."
    exit 1
  fi

  FINAL_STATUS="$(extract_review_value "Final Status|final status|最终状态" "$REVIEW_FILE")"
  HUMAN_REVIEW="$(extract_review_value "Human Review Required|Human review required|人工复核" "$REVIEW_FILE")"
  RISK_LEVEL="$(extract_review_value "Review Risk Level|Risk Level|risk level|风险等级" "$REVIEW_FILE")"

  CURRENT_SLICE_AFTER="$(get_current_slice)"
  CURRENT_STATUS_AFTER="$(get_current_status)"
  CHANGED_FILES="$(git diff --name-only || true)"

  echo "Final status line: $FINAL_STATUS"
  echo "Human review line: $HUMAN_REVIEW"
  echo "Risk level line: $RISK_LEVEL"
  echo ""
  echo "Current slice after run:"
  echo "$CURRENT_SLICE_AFTER"
  echo ""
  echo "Current status after run:"
  echo "$CURRENT_STATUS_AFTER"
  echo ""

  echo "Changed files:"
  if [ -n "$CHANGED_FILES" ]; then
    echo "$CHANGED_FILES"
  else
    echo "(none)"
  fi
  echo ""

  if echo "$FINAL_STATUS" | grep -qi "Needs Fix"; then
    echo "Slice needs fix. Stop auto loop."
    exit 0
  fi

  if echo "$FINAL_STATUS" | grep -qi "Blocked"; then
    echo "Slice is blocked. Stop auto loop."
    exit 0
  fi

  if echo "$FINAL_STATUS" | grep -qi "Failed"; then
    echo "Slice failed. Stop auto loop."
    exit 0
  fi

  if echo "$FINAL_STATUS" | grep -qi "Human Review Required"; then
    echo "Human review required by final status. Stop auto loop."
    exit 0
  fi

  if echo "$HUMAN_REVIEW" | grep -Eqi "Yes|true|required|需要|是"; then
    echo "Human review required. Stop auto loop."
    exit 0
  fi

  if echo "$RISK_LEVEL" | grep -qi "High"; then
    echo "High risk slice. Stop auto loop."
    exit 0
  fi

  if ! echo "$FINAL_STATUS" | grep -qi "Done"; then
    echo "Final status is not Done. Stop auto loop."
    exit 0
  fi

  if echo "$CURRENT_STATUS_AFTER" | grep -Eqi "Human Review Required|Needs Fix|Blocked|Failed|Verified|Skipped"; then
    echo "Current task status requires stop: $CURRENT_STATUS_AFTER"
    exit 0
  fi

  if [ -z "$CHANGED_FILES" ]; then
    if [ "$CURRENT_SLICE_BEFORE" = "$CURRENT_SLICE_AFTER" ]; then
      echo "No changed files and current slice did not advance. Stop to avoid infinite loop."
      exit 0
    fi

    echo "No changed files, but current slice advanced. Continue to next iteration."
    continue
  fi

  git add .
  git commit -m "codex: complete PRD slice auto iteration $i" || {
    echo "Git commit failed. Stop auto loop."
    exit 1
  }

  echo ""
  echo "Committed iteration $i."
  echo "Continue to next slice."
done

echo ""
echo "Auto loop finished $MAX_ITERATIONS iteration(s)."