#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${1:-3}"

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

RUN_SLICE_SCRIPT="./scripts/codex/run-slice-with-review.sh"
AI_REVIEW_SCRIPT="./scripts/codex/review-current-slice.sh"
AI_RELEASE_SCRIPT="./scripts/codex/release-current-slice-after-ai-review.sh"

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

if [ ! -x "$AI_REVIEW_SCRIPT" ]; then
  echo "ERROR: $AI_REVIEW_SCRIPT is not executable or not found."
  echo "Run: chmod +x $AI_REVIEW_SCRIPT"
  exit 1
fi

if [ ! -x "$AI_RELEASE_SCRIPT" ]; then
  echo "ERROR: $AI_RELEASE_SCRIPT is not executable or not found."
  echo "Run: chmod +x $AI_RELEASE_SCRIPT"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

refresh_context() {
  resolve_current_prd_context
  mkdir -p "$LOG_DIR"
}

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

get_current_prd() {
  awk '
    /^## Current PRD/ { found=1; next }
    found && NF { print $0; exit }
  ' "$CURRENT_TASK_FILE" | tr -d '\r' || true
}

extract_line() {
  local pattern="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "$pattern" "$file" | tail -n 1 || true
}

extract_ai_value() {
  local key="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep -E "^$key:" "$file" | tail -n 1 | cut -d ':' -f 2- | xargs || true
}

latest_ai_review_log() {
  ls -t "$LOG_DIR"/codex-ai-review-*.log 2>/dev/null | head -n 1 || true
}

commit_current_iteration() {
  local iteration="$1"
  local slice_name="$2"

  if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit."
    return 0
  fi

  git add .
  git commit -m "codex: complete PRD slice auto iteration $iteration - $slice_name" || {
    echo "Git commit failed. Stop auto loop."
    exit 1
  }
}

for i in $(seq 1 "$MAX_ITERATIONS"); do
  refresh_context

  echo ""
  echo "========================================"
  echo "Codex PRD auto loop with AI review iteration $i / $MAX_ITERATIONS"
  echo "========================================"
  echo ""

  CURRENT_PRD_BEFORE="$(get_current_prd)"
  CURRENT_SLICE_BEFORE="$(get_current_slice)"
  CURRENT_STATUS_BEFORE="$(get_current_status)"

  echo "Current PRD before run:"
  echo "$CURRENT_PRD_BEFORE"
  echo ""
  echo "Current implementation directory before run:"
  echo "$PRD_DIR"
  echo ""
  echo "Current slice before run:"
  echo "$CURRENT_SLICE_BEFORE"
  echo ""
  echo "Current status before run:"
  echo "$CURRENT_STATUS_BEFORE"
  echo ""

  if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Working tree is not clean before iteration $i."
    echo "Please commit or stash current changes first."
    echo ""
    git status --short
    exit 1
  fi

  IMPLEMENT_LOG="$LOG_DIR/codex-auto-loop-$(date +"%Y%m%d-%H%M%S")-iter-$i.log"

  "$RUN_SLICE_SCRIPT" | tee "$IMPLEMENT_LOG"

  refresh_context

  echo ""
  echo "Checking self-review result..."
  echo ""

  if [ ! -f "$REVIEW_FILE" ]; then
    echo "SLICE_SELF_REVIEW.md was not generated. Stop."
    exit 1
  fi

  FINAL_STATUS="$(extract_line "Final Status|final status|最终状态" "$REVIEW_FILE")"
  HUMAN_REVIEW="$(extract_line "Human Review Required|Human review required|人工复核" "$REVIEW_FILE")"
  RISK_LEVEL="$(extract_line "Review Risk Level|Risk Level|risk level|风险等级" "$REVIEW_FILE")"

  CURRENT_PRD_AFTER_IMPLEMENT="$(get_current_prd)"
  CURRENT_SLICE_AFTER_IMPLEMENT="$(get_current_slice)"
  CURRENT_STATUS_AFTER_IMPLEMENT="$(get_current_status)"

  echo "Final status line: $FINAL_STATUS"
  echo "Human review line: $HUMAN_REVIEW"
  echo "Risk level line: $RISK_LEVEL"
  echo ""
  echo "Current PRD after implementation:"
  echo "$CURRENT_PRD_AFTER_IMPLEMENT"
  echo ""
  echo "Current slice after implementation:"
  echo "$CURRENT_SLICE_AFTER_IMPLEMENT"
  echo ""
  echo "Current status after implementation:"
  echo "$CURRENT_STATUS_AFTER_IMPLEMENT"
  echo ""

  if echo "$FINAL_STATUS" | grep -qi "Needs Fix"; then
    echo "Slice needs fix. Stop auto loop."
    git status --short
    exit 0
  fi

  if echo "$FINAL_STATUS" | grep -qi "Blocked"; then
    echo "Slice is blocked. Stop auto loop."
    git status --short
    exit 0
  fi

  if echo "$FINAL_STATUS" | grep -qi "Failed"; then
    echo "Slice failed. Stop auto loop."
    git status --short
    exit 0
  fi

  NEED_AI_REVIEW="No"

  if echo "$FINAL_STATUS" | grep -qi "Human Review Required"; then
    NEED_AI_REVIEW="Yes"
  fi

  if echo "$HUMAN_REVIEW" | grep -Eqi "Yes|true|required|需要|是"; then
    NEED_AI_REVIEW="Yes"
  fi

  if echo "$RISK_LEVEL" | grep -qi "High"; then
    NEED_AI_REVIEW="Yes"
  fi

  if [ "$NEED_AI_REVIEW" = "Yes" ]; then
    echo ""
    echo "Human Review Required was detected."
    echo "Run AI second-pass read-only review instead of stopping immediately."
    echo ""

    AI_REVIEW_BEFORE="$(latest_ai_review_log)"

    "$AI_REVIEW_SCRIPT"

    refresh_context

    AI_REVIEW_AFTER="$(latest_ai_review_log)"

    if [ -z "$AI_REVIEW_AFTER" ]; then
      echo "AI review log was not generated. Stop."
      exit 1
    fi

    if [ "$AI_REVIEW_AFTER" = "$AI_REVIEW_BEFORE" ]; then
      echo "AI review log did not change. Stop."
      exit 1
    fi

    AI_FINAL_STATUS="$(extract_ai_value "AI_REVIEW_FINAL_STATUS" "$AI_REVIEW_AFTER")"
    AI_CAN_RELEASE="$(extract_ai_value "AI_REVIEW_CAN_RELEASE" "$AI_REVIEW_AFTER")"
    AI_RISK_LEVEL="$(extract_ai_value "AI_REVIEW_RISK_LEVEL" "$AI_REVIEW_AFTER")"

    echo ""
    echo "AI review final status: $AI_FINAL_STATUS"
    echo "AI review can release: $AI_CAN_RELEASE"
    echo "AI review risk level: $AI_RISK_LEVEL"
    echo ""

    if [ "$AI_FINAL_STATUS" != "Passed" ]; then
      echo "AI second-pass review did not pass. Stop auto loop."
      git status --short
      exit 0
    fi

    if [ "$AI_CAN_RELEASE" != "Yes" ]; then
      echo "AI second-pass review did not allow release. Stop auto loop."
      git status --short
      exit 0
    fi

    "$AI_RELEASE_SCRIPT" "$AI_REVIEW_AFTER"

    refresh_context

    CURRENT_PRD_AFTER_RELEASE="$(get_current_prd)"
    CURRENT_SLICE_AFTER_RELEASE="$(get_current_slice)"
    CURRENT_STATUS_AFTER_RELEASE="$(get_current_status)"

    echo ""
    echo "Current PRD after AI release:"
    echo "$CURRENT_PRD_AFTER_RELEASE"
    echo ""
    echo "Current slice after AI release:"
    echo "$CURRENT_SLICE_AFTER_RELEASE"
    echo ""
    echo "Current status after AI release:"
    echo "$CURRENT_STATUS_AFTER_RELEASE"
    echo ""

    commit_current_iteration "$i" "$CURRENT_SLICE_BEFORE"

    echo ""
    echo "Committed iteration $i after AI second-pass release."
    echo "Continue to next slice."
    continue
  fi

  if ! echo "$FINAL_STATUS" | grep -qi "Done"; then
    echo "Final status is not Done and no AI release path applies. Stop auto loop."
    git status --short
    exit 0
  fi

  if echo "$CURRENT_STATUS_AFTER_IMPLEMENT" | grep -Eqi "Human Review Required|Needs Fix|Blocked|Failed|Skipped"; then
    echo "Current task status requires stop: $CURRENT_STATUS_AFTER_IMPLEMENT"
    git status --short
    exit 0
  fi

  if [ -z "$(git status --porcelain)" ]; then
    if [ "$CURRENT_SLICE_BEFORE" = "$CURRENT_SLICE_AFTER_IMPLEMENT" ] && [ "$CURRENT_PRD_BEFORE" = "$CURRENT_PRD_AFTER_IMPLEMENT" ]; then
      echo "No changed files and current task did not advance. Stop to avoid infinite loop."
      exit 0
    fi

    echo "No changed files, but current task advanced. Continue to next iteration."
    continue
  fi

  commit_current_iteration "$i" "$CURRENT_SLICE_BEFORE"

  echo ""
  echo "Committed iteration $i."
  echo "Continue to next slice."
done

echo ""
echo "Auto loop with AI review finished $MAX_ITERATIONS iteration(s)."
