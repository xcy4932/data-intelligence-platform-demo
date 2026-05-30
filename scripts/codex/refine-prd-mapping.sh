#!/usr/bin/env bash
set -euo pipefail

IMPLEMENTATION_DIR="${1:-}"
REVIEW_NOTE="${2:-}"

if [ -z "$IMPLEMENTATION_DIR" ]; then
  echo "Usage:"
  echo "  ./scripts/codex/refine-prd-mapping.sh <IMPLEMENTATION_DIR> '<review note>'"
  exit 1
fi

if [ ! -d "$IMPLEMENTATION_DIR" ]; then
  echo "ERROR: implementation directory not found: $IMPLEMENTATION_DIR"
  exit 1
fi

LOG_DIR="$IMPLEMENTATION_DIR/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-prd-mapping-refine-$(date +"%Y%m%d-%H%M%S").log"

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
You are refining an existing PRD implementation map.

Implementation directory:
$IMPLEMENTATION_DIR

User review note:
$REVIEW_NOTE

Hard rules:
1. Do not implement code.
2. Do not modify src/.
3. Only update implementation documents in $IMPLEMENTATION_DIR.
4. Preserve already good slice ideas.
5. Improve slice granularity, ordering, dependencies, acceptance criteria, and boundary clarity.
6. Make every slice small enough for one Codex run.
7. Split oversized slices.
8. Add missing high-risk slices for permissions, audit logs, deletion, batch operations, import/export, License, refresh, service contracts, or shared state.
9. Do not remove important PRD coverage.
10. Update CURRENT_SLICE.md only if the first Ready slice changes.

Read:
1. AGENTS.md
2. $IMPLEMENTATION_DIR/IMPLEMENTATION_MAP.md
3. $IMPLEMENTATION_DIR/CURRENT_SLICE.md
4. $IMPLEMENTATION_DIR/PROGRESS.md
5. $IMPLEMENTATION_DIR/ACCEPTANCE_CHECKLIST.md
6. $IMPLEMENTATION_DIR/DECISIONS.md

Then refine:
- IMPLEMENTATION_MAP.md
- CURRENT_SLICE.md
- PROGRESS.md
- ACCEPTANCE_CHECKLIST.md
- DECISIONS.md if needed
- SLICE_SELF_REVIEW.md

At the end, output:
- what changed in the slicing
- number of slices before/after if known
- first Ready slice
- remaining mapping risks
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== PRD mapping refinement finished ====="
echo "Full log saved to: $LOG_FILE"
echo ""
echo "Changed files:"
git diff --name-only || true
