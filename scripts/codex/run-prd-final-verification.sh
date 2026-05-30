#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

mkdir -p "$LOG_DIR"

VERIFY_LOG="$LOG_DIR/codex-prd-final-verification-$(date +"%Y%m%d-%H%M%S").log"

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run from project root."
  exit 1
fi

echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Verification log: $VERIFY_LOG"
echo ""

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
You are performing final verification for the current PRD.

Current PRD:
$CURRENT_PRD

Current implementation directory:
$PRD_DIR

Your role:
- Final PRD verification only.
- Do not implement new features.
- Do not implement future PRDs.
- Do not modify source code unless the change is a tiny documentation consistency fix.
- Do not invent missing features.
- Do not mark Verified unless the PRD is actually complete.

Read:
1. AGENTS.md
2. $MASTER_QUEUE_FILE
3. $CURRENT_TASK_FILE
4. $IMPLEMENTATION_MAP_FILE
5. $PROGRESS_FILE
6. $CURRENT_SLICE_FILE
7. $ACCEPTANCE_CHECKLIST_FILE
8. $REVIEW_FILE
9. $DECISIONS_FILE if it exists
10. current PRD file referenced by IMPLEMENTATION_MAP.md
11. package.json

Verification checklist:
1. Confirm all implementation slices in IMPLEMENTATION_MAP.md are Done.
2. Confirm ACCEPTANCE_CHECKLIST.md slice checklist is complete.
3. Confirm PRD final acceptance mapping is complete.
4. Confirm no slice remains Ready, Not Started, In Progress, Needs Fix, Human Review Required, or Blocked.
5. Confirm all pages required by PRD exist.
6. Confirm required route/menu entries exist.
7. Confirm role/permission behavior is covered.
8. Confirm loading, empty, filtered-empty, error, 403, 404, disabled, success, failure, and retry states are covered where required.
9. Confirm all PRD required write actions record audit logs.
10. Confirm write operations refresh required list/detail/statistics/log areas.
11. Confirm import/export/batch/delete/License/security-sensitive flows are covered if PRD requires them.
12. Run npm run type-check.
13. Run npm run build.
14. Run targeted lint only if final verification changes any current PRD files.
15. Do not run full-repo lint autofix.

Decision:
- If complete, update:
  - $PROGRESS_FILE
  - $IMPLEMENTATION_MAP_FILE
  - $ACCEPTANCE_CHECKLIST_FILE
  - $CURRENT_TASK_FILE
  - $MASTER_QUEUE_FILE
  - $REVIEW_FILE
- Mark current PRD as Verified in MASTER_PRD_QUEUE.md only if all checks pass.
- If not complete, mark Final Verification as Needs Fix and list exact missing slices or acceptance items.
- If product judgment is required, mark Blocked.

Output exact machine-readable lines at the end:

PRD_FINAL_VERIFICATION_STATUS: Verified | Needs Fix | Blocked
PRD_FINAL_VERIFICATION_CAN_ADVANCE: Yes | No
PRD_FINAL_VERIFICATION_MISSING_ITEMS:
- <item or None>
PRD_FINAL_VERIFICATION_COMMANDS:
- <command result>
PRD_FINAL_VERIFICATION_SUMMARY:
- <summary>
PROMPT
)" | tee "$VERIFY_LOG"

echo ""
echo "===== PRD final verification finished ====="
echo "Full verification log saved to: $VERIFY_LOG"
echo ""

grep -E "^PRD_FINAL_VERIFICATION_STATUS:|^PRD_FINAL_VERIFICATION_CAN_ADVANCE:" "$VERIFY_LOG" || true
