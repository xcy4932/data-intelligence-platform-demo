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
AI_BLOCKING_COUNT="$(grep -E "^AI_REVIEW_BLOCKING_COUNT:" "$AI_REVIEW_LOG" | tail -n 1 | cut -d ':' -f 2- | xargs || true)"

echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Current slice: $CURRENT_SLICE"
echo "AI review log: $AI_REVIEW_LOG"
echo "AI final status: $AI_FINAL_STATUS"
echo "AI can release: $AI_CAN_RELEASE"
echo "AI blocking count: ${AI_BLOCKING_COUNT:-unknown}"
echo ""

REPAIR_LOG="$LOG_DIR/codex-ai-repair-$(date +"%Y%m%d-%H%M%S").log"

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
You are repairing the current PRD slice after AI second-pass review.

Current PRD:
$CURRENT_PRD

Current implementation directory:
$PRD_DIR

Current slice:
$CURRENT_SLICE

Current status:
$CURRENT_STATUS

AI review log:
$AI_REVIEW_LOG

Your role:
- Repair only Blocking issues reported by AI second-pass review.
- Do not fix Suggestions.
- Do not expand the slice scope.
- Do not implement future slices.
- Do not redesign unrelated modules.
- Do not modify unrelated files.
- Do not advance CURRENT_SLICE.md to the next slice.
- Do not release the slice.
- Do not commit.
- Do not run full-repo lint autofix.

Read first:
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
11. git diff --name-only
12. git diff

Repair rules:
1. Only repair AI_REVIEW_AUTO_FIXABLE_BLOCKING_ISSUES.
2. A repair is allowed only if it is clearly inside the current slice.
3. If an issue is listed under AI_REVIEW_NON_AUTO_FIXABLE_BLOCKING_ISSUES, do not repair it. Mark the slice as Needs Fix or Blocked and stop.
4. If a Blocking issue is caused by unrelated files, do not modify those files unless they were changed by the current slice.
5. Keep permission checks before write operations.
6. Keep business validations before refresh/log emits.
7. Preserve service return contracts.
8. Preserve route/menu boundaries.
9. Preserve current PRD implementation directory.
10. After repair, run:
   - npm run type-check
   - npm run build
   - targeted lint for changed current-slice files only, for example npx oxlint and npx eslint
11. Do not run full-project lint if it auto-fixes unrelated files.
12. Update $REVIEW_FILE to record:
   - repair attempt
   - repaired Blocking issues
   - commands run
   - remaining risks
   - final status after repair
13. Update $PROGRESS_FILE only to record repair attempt status.
14. Do not mark current slice Done unless the next AI review confirms release.
15. Do not advance to next slice.

At the end, output:
- repaired slice
- blocking issues repaired
- files changed
- commands run
- remaining blocking issues if any
- whether another AI review is required
PROMPT
)" | tee "$REPAIR_LOG"

echo ""
echo "===== AI repair finished ====="
echo "Full repair log saved to: $REPAIR_LOG"
echo ""

echo "Changed files after repair:"
git diff --name-only || true
