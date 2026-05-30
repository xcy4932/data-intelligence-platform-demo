#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

CURRENT_SLICE_ID="$(printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }')"
ARCHIVE_DIR="$PRD_DIR/reviews"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"

mkdir -p "$ARCHIVE_DIR"

if [ -z "$CURRENT_SLICE_ID" ]; then
  echo "ERROR: Cannot parse current slice id."
  exit 1
fi

if [ ! -f "$REVIEW_FILE" ]; then
  echo "ERROR: Review file not found: $REVIEW_FILE"
  exit 1
fi

TARGET_FILE="$ARCHIVE_DIR/${CURRENT_SLICE_ID}_${TIMESTAMP}.md"

{
  echo "# Slice Review Snapshot"
  echo ""
  echo "- Current PRD: $CURRENT_PRD"
  echo "- Current Slice: $CURRENT_SLICE"
  echo "- Snapshot Time: $TIMESTAMP"
  echo ""
  echo "---"
  echo ""
  cat "$REVIEW_FILE"
} > "$TARGET_FILE"

echo "Archived slice review to: $TARGET_FILE"
