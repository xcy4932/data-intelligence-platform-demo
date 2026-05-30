#!/usr/bin/env bash
set -euo pipefail

IMPLEMENTATION_DIR="${1:-}"

if [ -z "$IMPLEMENTATION_DIR" ]; then
  echo "Usage:"
  echo "  ./scripts/codex/review-prd-mapping.sh <IMPLEMENTATION_DIR>"
  exit 1
fi

if [ ! -d "$IMPLEMENTATION_DIR" ]; then
  echo "ERROR: implementation directory not found: $IMPLEMENTATION_DIR"
  exit 1
fi

LOG_DIR="$IMPLEMENTATION_DIR/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-prd-mapping-review-$(date +"%Y%m%d-%H%M%S").log"

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run from project root."
  exit 1
fi

if [ ! -f "$IMPLEMENTATION_DIR/IMPLEMENTATION_MAP.md" ]; then
  echo "ERROR: $IMPLEMENTATION_DIR/IMPLEMENTATION_MAP.md not found."
  exit 1
fi

codex exec --sandbox read-only --ask-for-approval on-request "$(cat <<PROMPT
Use the following skill if available:
- prd-mapping-quality-review

You are reviewing PRD slicing quality only.

Implementation directory:
$IMPLEMENTATION_DIR

Hard rules:
1. Review only.
2. Do not modify files.
3. Do not implement code.
4. Do not advance CURRENT_TASK.md.
5. Do not commit.
6. Do not judge by optimism. Judge whether this mapping is safe for many automated Codex runs.

Read:
1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. docs/implementation/CURRENT_TASK.md if it exists
4. $IMPLEMENTATION_DIR/IMPLEMENTATION_MAP.md
5. $IMPLEMENTATION_DIR/CURRENT_SLICE.md
6. $IMPLEMENTATION_DIR/PROGRESS.md
7. $IMPLEMENTATION_DIR/ACCEPTANCE_CHECKLIST.md
8. $IMPLEMENTATION_DIR/DECISIONS.md
9. the PRD file referenced in IMPLEMENTATION_MAP.md if available

Review goals:
1. Determine whether the slicing is granular enough.
2. Determine whether every slice can be done in one Codex run.
3. Detect oversized slices.
4. Detect missing foundation slices.
5. Detect missing UI state requirements.
6. Detect missing permission, audit, refresh, import/export, deletion, batch, License, and security slices.
7. Detect bad ordering or missing dependencies.
8. Detect vague acceptance criteria.
9. Detect places where future PRD work is mixed into the current PRD.
10. Decide whether implementation can safely start.

At the very end, output these exact machine-readable lines:

MAPPING_REVIEW_FINAL_STATUS: Passed | Needs Refinement | Blocked
MAPPING_REVIEW_SCORE: <0-100>
MAPPING_REVIEW_CAN_IMPLEMENT: Yes | No
MAPPING_REVIEW_MAIN_PROBLEMS:
- <problem 1 or None>
MAPPING_REVIEW_REQUIRED_REFINEMENTS:
- <refinement 1 or None>
MAPPING_REVIEW_GOOD_POINTS:
- <good point 1 or None>
MAPPING_REVIEW_SUMMARY:
- <short summary>
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== PRD mapping review finished ====="
echo "Full log saved to: $LOG_FILE"
echo ""

echo "Mapping review decision:"
grep -E "^MAPPING_REVIEW_FINAL_STATUS:|^MAPPING_REVIEW_SCORE:|^MAPPING_REVIEW_CAN_IMPLEMENT:" "$LOG_FILE" || true
