#!/usr/bin/env bash
set -euo pipefail

CURRENT_TASK_FILE="docs/implementation/CURRENT_TASK.md"
MASTER_QUEUE_FILE="docs/implementation/MASTER_PRD_QUEUE.md"

if [ ! -f "$CURRENT_TASK_FILE" ]; then
  echo "ERROR: $CURRENT_TASK_FILE not found."
  exit 1
fi

if [ ! -f "$MASTER_QUEUE_FILE" ]; then
  echo "ERROR: $MASTER_QUEUE_FILE not found."
  exit 1
fi

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

echo "===== PRD PIPELINE DRY RUN ====="
echo ""

echo "Current PRD:"
echo "  $CURRENT_PRD"
echo ""

echo "Current implementation directory:"
echo "  $PRD_DIR"
echo ""

echo "Current slice:"
echo "  $CURRENT_SLICE"
echo ""

echo "Current status:"
echo "  $CURRENT_STATUS"
echo ""

echo "Expected phase:"
case "$CURRENT_STATUS" in
  Ready)
    echo "  Development can start for the current Ready slice."
    ;;
  "Human Review Required")
    echo "  AI second-pass review or repair/review loop is expected before release."
    ;;
  "Needs Fix")
    echo "  Fix current slice before continuing."
    ;;
  Verified)
    echo "  Current PRD is verified; pipeline should select the next active PRD."
    ;;
  *)
    echo "  Inspect current status manually: $CURRENT_STATUS"
    ;;
esac
echo ""

echo "Required files:"
for file in \
  "$CURRENT_TASK_FILE" \
  "$MASTER_QUEUE_FILE" \
  "$CURRENT_SLICE_FILE" \
  "$PROGRESS_FILE" \
  "$IMPLEMENTATION_MAP_FILE" \
  "$ACCEPTANCE_CHECKLIST_FILE" \
  "$DECISIONS_FILE"; do
  if [ -f "$file" ]; then
    echo "  OK  $file"
  else
    echo "  MISSING  $file"
  fi
done
echo ""

echo "Latest self review:"
if [ -f "$REVIEW_FILE" ]; then
  grep -E "Slice ID|Final Status|Review Risk Level|Human Review Required|Remaining Risks" "$REVIEW_FILE" || true
else
  echo "  No SLICE_SELF_REVIEW.md found."
fi
echo ""

echo "Latest AI review:"
LATEST_AI_REVIEW="$(ls -t "$LOG_DIR"/codex-ai-review-*.log 2>/dev/null | head -1 || true)"
if [ -n "$LATEST_AI_REVIEW" ]; then
  echo "  $LATEST_AI_REVIEW"
  grep -E "AI_REVIEW_FINAL_STATUS|AI_REVIEW_CAN_RELEASE|AI_REVIEW_BLOCKING_COUNT|AI_REVIEW_AUTO_FIXABLE_BLOCKING_COUNT|AI_REVIEW_NON_AUTO_FIXABLE_BLOCKING_COUNT" "$LATEST_AI_REVIEW" || true
else
  echo "  No AI review log found."
fi
echo ""

echo "Latest mapping review:"
LATEST_MAPPING_REVIEW="$(ls -t "$LOG_DIR"/codex-prd-mapping-review-*.log 2>/dev/null | head -1 || true)"
if [ -n "$LATEST_MAPPING_REVIEW" ]; then
  echo "  $LATEST_MAPPING_REVIEW"
  grep -E "MAPPING_REVIEW_FINAL_STATUS|MAPPING_REVIEW_SCORE|MAPPING_REVIEW_CAN_IMPLEMENT" "$LATEST_MAPPING_REVIEW" || true
else
  echo "  No mapping review log found."
fi
echo ""

echo "Git status:"
git status --short
echo ""

echo "MD consistency:"
if [ -x "./scripts/codex/validate-prd-md-consistency.sh" ]; then
  ./scripts/codex/validate-prd-md-consistency.sh || true
else
  echo "  validate-prd-md-consistency.sh not found."
fi
echo ""

echo "Next suggested command:"
if [ "$CURRENT_STATUS" = "Ready" ]; then
  echo "  ./scripts/codex/run-full-prd-pipeline.sh 5 1 3 2"
elif [ "$CURRENT_STATUS" = "Human Review Required" ]; then
  echo "  ./scripts/codex/run-prd-auto-loop-with-ai-review.sh 1 2"
elif [ "$CURRENT_STATUS" = "Needs Fix" ]; then
  echo "  ./scripts/codex/run-prd-auto-loop-with-ai-review.sh 1 2"
else
  echo "  Review status first, then run the appropriate pipeline command."
fi

echo ""
echo "===== DRY RUN COMPLETE ====="
