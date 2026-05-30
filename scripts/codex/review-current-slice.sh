#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-ai-review-$(date +"%Y%m%d-%H%M%S").log"

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run this script from project root."
  exit 1
fi

echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Current slice: $CURRENT_SLICE"
echo "AI review log: $LOG_FILE"
echo ""

codex exec --sandbox read-only --ask-for-approval on-request "$(cat <<PROMPT
You are the second-pass reviewer for the current PRD slice.

Current PRD:
$CURRENT_PRD

Current implementation directory:
$PRD_DIR

Current slice:
$CURRENT_SLICE

Current status:
$CURRENT_STATUS

Your role:
- Review only.
- Do not edit files.
- Do not implement fixes.
- Do not advance the slice.
- Do not commit.
- Do not approve based only on the previous self-review.
- Independently inspect the current repository state, including uncommitted changes.
- Do not hardcode any PRD implementation directory. Use the current implementation directory from $CURRENT_TASK_FILE.

Read these files first:
1. AGENTS.md
2. $MASTER_QUEUE_FILE
3. $CURRENT_TASK_FILE
4. $IMPLEMENTATION_MAP_FILE
5. $PROGRESS_FILE
6. $CURRENT_SLICE_FILE
7. $ACCEPTANCE_CHECKLIST_FILE
8. $REVIEW_FILE
9. $DECISIONS_FILE if it exists
10. package.json

Review method:
1. Use git diff --name-only to identify changed files.
2. Use git diff to inspect the actual code and document changes.
3. Verify the current slice boundary from $CURRENT_TASK_FILE and $CURRENT_SLICE_FILE.
4. Verify the implementation against the acceptance criteria in $IMPLEMENTATION_MAP_FILE and $ACCEPTANCE_CHECKLIST_FILE.
5. Verify that no future slice was implemented early.
6. Verify that no unrelated files were modified.
7. Verify that document status is consistent across:
   - $CURRENT_SLICE_FILE
   - $PROGRESS_FILE
   - $IMPLEMENTATION_MAP_FILE
   - $ACCEPTANCE_CHECKLIST_FILE
   - $CURRENT_TASK_FILE
   - $MASTER_QUEUE_FILE
   - $REVIEW_FILE
8. If the slice touches service contracts, permissions, route guards, audit logs, cross-page refresh, License logic, deletion, batch operations, import/export, or security-sensitive logic, inspect that logic carefully rather than approving mechanically.
9. Do not run commands that modify files.
10. Do not run lint autofix.

Decision rules:
- If the implementation satisfies the current slice acceptance criteria, does not cross boundaries, and documents are consistent or only need release-status updates, return Passed.
- If there is a concrete issue that must be fixed before release, return Needs Fix.
- If the slice cannot be reviewed due to missing files, unclear status, or conflicting docs, return Blocked.
- If the implementation contains any future-slice work, unrelated changes, fake UI, TODO-only behavior, unreachable UI, or missing key refresh/log/permission behavior, return Needs Fix.

Output requirements:
At the very end of your response, output these exact machine-readable lines:

AI_REVIEW_FINAL_STATUS: Passed | Needs Fix | Blocked
AI_REVIEW_RISK_LEVEL: Low | Medium | High
AI_REVIEW_CAN_RELEASE: Yes | No
AI_REVIEW_CURRENT_PRD: <current PRD>
AI_REVIEW_CURRENT_SLICE: <slice id and name>
AI_REVIEW_REQUIRED_FIXES:
- <required fix 1, or None>
AI_REVIEW_REVIEWED_FILES:
- <file 1>
- <file 2>
AI_REVIEW_SUMMARY:
- <short summary>
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== AI review finished ====="
echo "Full AI review log saved to: $LOG_FILE"
echo ""

echo "AI review decision:"
grep -E "^AI_REVIEW_FINAL_STATUS:|^AI_REVIEW_RISK_LEVEL:|^AI_REVIEW_CAN_RELEASE:|^AI_REVIEW_CURRENT_PRD:|^AI_REVIEW_CURRENT_SLICE:" "$LOG_FILE" || true
