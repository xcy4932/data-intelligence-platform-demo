#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

mkdir -p "$LOG_DIR"

AI_REVIEW_LOG="${1:-}"

if [ -z "$AI_REVIEW_LOG" ]; then
  AI_REVIEW_LOG="$(ls -t "$LOG_DIR"/codex-ai-review-*.log 2>/dev/null | head -n 1 || true)"
fi

if [ -z "$AI_REVIEW_LOG" ] || [ ! -f "$AI_REVIEW_LOG" ]; then
  echo "ERROR: AI review log not found."
  echo "Usage: $0 <ai-review-log-file>"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

AI_FINAL_STATUS="$(grep -E "^AI_REVIEW_FINAL_STATUS:" "$AI_REVIEW_LOG" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"
AI_CAN_RELEASE="$(grep -E "^AI_REVIEW_CAN_RELEASE:" "$AI_REVIEW_LOG" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"

echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Current slice: $CURRENT_SLICE"
echo "AI review log: $AI_REVIEW_LOG"
echo "AI final status: $AI_FINAL_STATUS"
echo "AI can release: $AI_CAN_RELEASE"
echo ""

if [ "$AI_FINAL_STATUS" != "Passed" ]; then
  echo "AI review did not pass. Stop release."
  exit 1
fi

if [ "$AI_CAN_RELEASE" != "Yes" ]; then
  echo "AI review did not allow release. Stop release."
  exit 1
fi

RELEASE_LOG="$LOG_DIR/codex-ai-release-$(date +"%Y%m%d-%H%M%S").log"

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
You are the release-state updater after AI second-pass review.

Current PRD:
$CURRENT_PRD

Current implementation directory:
$PRD_DIR

Current slice:
$CURRENT_SLICE

AI review log path:
$AI_REVIEW_LOG

Your role:
- Do not modify source code.
- Do not modify Vue, TypeScript, service, mock, router, component, or business implementation files.
- Only update implementation documents.
- Do not implement the next slice.
- Do not run code generation.
- Do not run lint autofix.
- Do not commit.
- Do not hardcode any PRD implementation directory.

Read these files:
1. AGENTS.md
2. $MASTER_QUEUE_FILE
3. $CURRENT_TASK_FILE
4. $IMPLEMENTATION_MAP_FILE
5. $PROGRESS_FILE
6. $CURRENT_SLICE_FILE
7. $ACCEPTANCE_CHECKLIST_FILE
8. $REVIEW_FILE
9. $DECISIONS_FILE if it exists
10. $AI_REVIEW_LOG

Task:
1. Confirm from the AI review log that:
   - AI_REVIEW_FINAL_STATUS is Passed
   - AI_REVIEW_CAN_RELEASE is Yes
2. Mark the current slice as Done in:
   - $CURRENT_SLICE_FILE
   - $IMPLEMENTATION_MAP_FILE
   - $ACCEPTANCE_CHECKLIST_FILE where applicable
   - $PROGRESS_FILE
   - $REVIEW_FILE
3. Add a note that the previous Human Review Required was resolved by AI second-pass review.
4. Advance $CURRENT_TASK_FILE to the next slice according to $IMPLEMENTATION_MAP_FILE recommended execution order.
5. Update $MASTER_QUEUE_FILE so the current PRD remains In Progress and Current Slice points to the next slice.
6. Update $CURRENT_SLICE_FILE to the next slice as Ready or equivalent, but do not implement it.
7. If there is no next slice, mark the PRD as ready for final verification instead of inventing a next slice.
8. If the current PRD is completed and verified:
   - mark it Verified in $MASTER_QUEUE_FILE
   - find the next PRD whose status is Not Started or Ready
   - create that PRD's implementation directory if missing
   - initialize required implementation docs
   - update $CURRENT_TASK_FILE to point to the next PRD
   - do not implement the next PRD's first slice in this run
9. Keep all document statuses consistent.
10. Do not modify any code file.

At the end, output:
- released PRD
- released slice
- next PRD
- next slice
- documents changed
- confirmation that no source code was modified
PROMPT
)" | tee "$RELEASE_LOG"

echo ""
echo "===== AI release-state update finished ====="
echo "Full release log saved to: $RELEASE_LOG"
echo ""

echo "Changed files after release:"
git diff --name-only || true
