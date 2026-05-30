#!/usr/bin/env bash
set -euo pipefail

PRD_DIR="docs/implementation/001_组织与身份中心"
LOG_DIR="$PRD_DIR/logs"
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

Read these files:
1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. docs/implementation/CURRENT_TASK.md
4. docs/implementation/001_组织与身份中心/IMPLEMENTATION_MAP.md
5. docs/implementation/001_组织与身份中心/PROGRESS.md
6. docs/implementation/001_组织与身份中心/CURRENT_SLICE.md
7. docs/implementation/001_组织与身份中心/ACCEPTANCE_CHECKLIST.md
8. docs/implementation/001_组织与身份中心/SLICE_SELF_REVIEW.md
9. $AI_REVIEW_LOG

Task:
1. Confirm from the AI review log that:
   - AI_REVIEW_FINAL_STATUS is Passed
   - AI_REVIEW_CAN_RELEASE is Yes
2. Mark the current slice as Done in:
   - docs/implementation/001_组织与身份中心/CURRENT_SLICE.md
   - docs/implementation/001_组织与身份中心/IMPLEMENTATION_MAP.md
   - docs/implementation/001_组织与身份中心/ACCEPTANCE_CHECKLIST.md where applicable
   - docs/implementation/001_组织与身份中心/PROGRESS.md
   - docs/implementation/001_组织与身份中心/SLICE_SELF_REVIEW.md
3. Add a note that the previous Human Review Required was resolved by AI second-pass review.
4. Advance docs/implementation/CURRENT_TASK.md to the next slice according to IMPLEMENTATION_MAP.md recommended execution order.
5. Update docs/implementation/MASTER_PRD_QUEUE.md so PRD 001 remains In Progress and Current Slice points to the next slice.
6. Update CURRENT_SLICE.md to the next slice as Ready or equivalent, but do not implement it.
7. If there is no next slice, mark the PRD as ready for final verification instead of inventing a next slice.
8. Keep all document statuses consistent.
9. Do not modify any code file.

At the end, output:
- released slice
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
