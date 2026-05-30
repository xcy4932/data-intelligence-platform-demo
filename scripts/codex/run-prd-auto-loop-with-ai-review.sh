#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS="${1:-3}"
MAX_REPAIR_ROUNDS="${2:-2}"

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

RUN_SLICE_SCRIPT="./scripts/codex/run-slice-with-review.sh"
AI_REVIEW_SCRIPT="./scripts/codex/review-current-slice.sh"
AI_RELEASE_SCRIPT="./scripts/codex/release-current-slice-after-ai-review.sh"
AI_REPAIR_SCRIPT="./scripts/codex/repair-current-slice-after-ai-review.sh"
VALIDATE_SCRIPT="./scripts/codex/validate-prd-md-consistency.sh"
SCOPE_VALIDATE_SCRIPT="./scripts/codex/validate-slice-file-scope.sh"
ARCHIVE_REVIEW_SCRIPT="./scripts/codex/archive-slice-review.sh"

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

for script in "$RUN_SLICE_SCRIPT" "$AI_REVIEW_SCRIPT" "$AI_RELEASE_SCRIPT" "$AI_REPAIR_SCRIPT" "$VALIDATE_SCRIPT" "$SCOPE_VALIDATE_SCRIPT" "$ARCHIVE_REVIEW_SCRIPT"; do
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

refresh_context() {
  resolve_current_prd_context
  mkdir -p "$LOG_DIR"
}

validate_context() {
  "$VALIDATE_SCRIPT"
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

  validate_context

  git add .
  git commit -m "codex: complete PRD slice auto iteration $iteration - $slice_name" || {
    echo "Git commit failed. Stop auto loop."
    exit 1
  }
}

run_ai_review_once() {
  local before_log after_log

  before_log="$(latest_ai_review_log)"
  "$AI_REVIEW_SCRIPT"
  refresh_context
  after_log="$(latest_ai_review_log)"

  if [ -z "$after_log" ]; then
    echo "AI review log was not generated. Stop."
    exit 1
  fi

  if [ "$after_log" = "$before_log" ]; then
    echo "AI review log did not change. Stop."
    exit 1
  fi

  echo "$after_log"
}

ai_review_can_release() {
  local review_log="$1"

  local final_status can_release blocking_count
  final_status="$(extract_ai_value "AI_REVIEW_FINAL_STATUS" "$review_log")"
  can_release="$(extract_ai_value "AI_REVIEW_CAN_RELEASE" "$review_log")"
  blocking_count="$(extract_ai_value "AI_REVIEW_BLOCKING_COUNT" "$review_log")"

  echo "AI review final status: $final_status"
  echo "AI review can release: $can_release"
  echo "AI review blocking count: ${blocking_count:-unknown}"

  [ "$final_status" = "Passed" ] && [ "$can_release" = "Yes" ] && { [ -z "$blocking_count" ] || [ "$blocking_count" = "0" ]; }
}

run_repair_review_loop() {
  local initial_review_log="$1"
  local review_log="$initial_review_log"

  for repair_round in $(seq 0 "$MAX_REPAIR_ROUNDS"); do
    echo ""
    echo "----------------------------------------"
    echo "AI release check / repair round $repair_round / $MAX_REPAIR_ROUNDS"
    echo "----------------------------------------"
    echo ""

    if ai_review_can_release "$review_log"; then
      echo ""
      echo "AI review allows release."
      echo "$review_log"
      return 0
    fi

    if [ "$repair_round" -eq "$MAX_REPAIR_ROUNDS" ]; then
      echo ""
      echo "Reached MAX_REPAIR_ROUNDS=$MAX_REPAIR_ROUNDS. Stop auto loop."
      git status --short
      return 1
    fi

    local final_status can_release blocking_count
    final_status="$(extract_ai_value "AI_REVIEW_FINAL_STATUS" "$review_log")"
    can_release="$(extract_ai_value "AI_REVIEW_CAN_RELEASE" "$review_log")"
    blocking_count="$(extract_ai_value "AI_REVIEW_BLOCKING_COUNT" "$review_log")"

    if [ "$final_status" = "Blocked" ]; then
      echo "AI review is Blocked. Do not repair automatically."
      git status --short
      return 1
    fi

    if [ -n "$blocking_count" ] && [ "$blocking_count" = "0" ] && [ "$can_release" != "Yes" ]; then
      echo "No blocking issues but AI review still cannot release. Stop for manual decision."
      git status --short
      return 1
    fi

    echo ""
    echo "Run AI repair round $((repair_round + 1))..."
    echo ""

    "$AI_REPAIR_SCRIPT" "$review_log"

    refresh_context

    echo ""
    echo "Validate PRD md consistency after repair..."
    validate_context

    echo ""
    echo "Validate changed files are within current slice scope after repair..."
    "$SCOPE_VALIDATE_SCRIPT"

    echo ""
    echo "Run AI review again after repair..."
    review_log="$(run_ai_review_once)"
  done

  return 1
}

for i in $(seq 1 "$MAX_ITERATIONS"); do
  refresh_context

  echo ""
  echo "========================================"
  echo "Codex PRD auto loop with AI review iteration $i / $MAX_ITERATIONS"
  echo "Max repair rounds per slice: $MAX_REPAIR_ROUNDS"
  echo "========================================"
  echo ""

  echo "Validate PRD md consistency before iteration..."
  validate_context

  CURRENT_PRD_BEFORE="$(get_current_prd)"
  CURRENT_SLICE_BEFORE="$(get_current_slice)"
  CURRENT_STATUS_BEFORE="$(get_current_status)"

  echo ""
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
  echo "Validate PRD md consistency after implementation..."
  validate_context

  echo ""
  echo "Validate changed files are within current slice scope..."
  "$SCOPE_VALIDATE_SCRIPT"

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
    echo "Slice needs fix from self-review. Stop auto loop."
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
    echo "Run AI second-pass review and limited repair loop."
    echo ""

    INITIAL_AI_REVIEW_LOG="$(run_ai_review_once)"

    if ! FINAL_AI_REVIEW_LOG="$(run_repair_review_loop "$INITIAL_AI_REVIEW_LOG")"; then
      echo "AI review/repair loop did not reach releasable state. Stop auto loop."
      exit 0
    fi

    "$AI_RELEASE_SCRIPT" "$FINAL_AI_REVIEW_LOG"

    refresh_context

    echo ""
    echo "Validate PRD md consistency after AI release..."
    validate_context

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

    "$ARCHIVE_REVIEW_SCRIPT"

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
