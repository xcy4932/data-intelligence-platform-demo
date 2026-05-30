#!/usr/bin/env bash
set -euo pipefail

IMPLEMENTATION_DIR="${1:-}"
MAX_ROUNDS="${2:-3}"

if [ -z "$IMPLEMENTATION_DIR" ]; then
  echo "Usage:"
  echo "  ./scripts/codex/review-and-refine-prd-mapping.sh <IMPLEMENTATION_DIR> [MAX_ROUNDS]"
  exit 1
fi

if [ ! -d "$IMPLEMENTATION_DIR" ]; then
  echo "ERROR: implementation directory not found: $IMPLEMENTATION_DIR"
  exit 1
fi

REVIEW_SCRIPT="./scripts/codex/review-prd-mapping.sh"
REFINE_SCRIPT="./scripts/codex/refine-prd-mapping.sh"
LOG_DIR="$IMPLEMENTATION_DIR/logs"

if [ ! -x "$REVIEW_SCRIPT" ]; then
  echo "ERROR: $REVIEW_SCRIPT is not executable or not found."
  exit 1
fi

if [ ! -x "$REFINE_SCRIPT" ]; then
  echo "ERROR: $REFINE_SCRIPT is not executable or not found."
  exit 1
fi

latest_review_log() {
  ls -t "$LOG_DIR"/codex-prd-mapping-review-*.log 2>/dev/null | head -n 1 || true
}

extract_review_value() {
  local key="$1"
  local file="$2"

  grep -E "^$key:" "$file" | tail -n 1 | cut -d ':' -f 2- | xargs || true
}

extract_required_refinements() {
  local file="$1"

  awk '
    /^MAPPING_REVIEW_REQUIRED_REFINEMENTS:/ { found=1; next }
    found && /^MAPPING_REVIEW_GOOD_POINTS:/ { exit }
    found { print }
  ' "$file" | sed '/^[[:space:]]*$/d' || true
}

for round in $(seq 1 "$MAX_ROUNDS"); do
  echo ""
  echo "========================================"
  echo "Mapping review round $round / $MAX_ROUNDS"
  echo "========================================"
  echo ""

  BEFORE_LOG="$(latest_review_log)"

  "$REVIEW_SCRIPT" "$IMPLEMENTATION_DIR"

  AFTER_LOG="$(latest_review_log)"

  if [ -z "$AFTER_LOG" ]; then
    echo "ERROR: review log not found."
    exit 1
  fi

  if [ "$AFTER_LOG" = "$BEFORE_LOG" ]; then
    echo "ERROR: review log did not change."
    exit 1
  fi

  STATUS="$(extract_review_value "MAPPING_REVIEW_FINAL_STATUS" "$AFTER_LOG")"
  SCORE="$(extract_review_value "MAPPING_REVIEW_SCORE" "$AFTER_LOG")"
  CAN_IMPLEMENT="$(extract_review_value "MAPPING_REVIEW_CAN_IMPLEMENT" "$AFTER_LOG")"

  echo ""
  echo "Review status: $STATUS"
  echo "Review score: $SCORE"
  echo "Can implement: $CAN_IMPLEMENT"
  echo ""

  if [ "$STATUS" = "Passed" ] && [ "$CAN_IMPLEMENT" = "Yes" ]; then
    if [ "$SCORE" -ge 90 ] 2>/dev/null; then
      echo "Mapping review passed. Implementation can start."
      exit 0
    fi
  fi

  if [ "$STATUS" = "Blocked" ]; then
    echo "Mapping review blocked. Stop."
    exit 1
  fi

  if [ "$round" -eq "$MAX_ROUNDS" ]; then
    echo "Reached max refinement rounds. Mapping still not ready."
    exit 1
  fi

  REQUIRED_REFINEMENTS="$(extract_required_refinements "$AFTER_LOG")"

  if [ -z "$REQUIRED_REFINEMENTS" ]; then
    REQUIRED_REFINEMENTS="Mapping review score is below 90 or can implement is No. Refine oversized slices, missing states, missing permissions, missing audit/refresh/import/export/deletion/batch slices, dependencies, and acceptance criteria."
  fi

  echo "Run mapping refinement based on review feedback..."
  "$REFINE_SCRIPT" "$IMPLEMENTATION_DIR" "$REQUIRED_REFINEMENTS"
done
