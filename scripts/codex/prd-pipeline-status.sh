#!/usr/bin/env bash
set -euo pipefail

CURRENT_TASK_FILE="docs/implementation/CURRENT_TASK.md"

if [ ! -f "$CURRENT_TASK_FILE" ]; then
  echo "ERROR: $CURRENT_TASK_FILE not found."
  exit 1
fi

CURRENT_IMPL_DIR="$(
  awk '
    /^## Current Implementation Directory/ { found=1; next }
    found && NF { print $0; exit }
  ' "$CURRENT_TASK_FILE" | tr -d '\r' | sed 's#/$##'
)"

echo "===== CURRENT TASK ====="
cat "$CURRENT_TASK_FILE"
echo ""

echo "===== GIT STATUS ====="
git status --short
echo ""

echo "===== RECENT COMMITS ====="
git log --oneline -8 || true
echo ""

if [ -n "$CURRENT_IMPL_DIR" ] && [ -d "$CURRENT_IMPL_DIR" ]; then
  echo "===== CURRENT SLICE ====="
  cat "$CURRENT_IMPL_DIR/CURRENT_SLICE.md" 2>/dev/null || true
  echo ""

  echo "===== SELF REVIEW SUMMARY ====="
  if [ -f "$CURRENT_IMPL_DIR/SLICE_SELF_REVIEW.md" ]; then
    grep -E "Slice ID|Final Status|Review Risk Level|Human Review Required|Remaining Risks|Commands Run|Needs Fix|Failed|Partial" "$CURRENT_IMPL_DIR/SLICE_SELF_REVIEW.md" || true
  else
    echo "No SLICE_SELF_REVIEW.md found."
  fi
  echo ""

  echo "===== LATEST AI REVIEW ====="
  LATEST_REVIEW="$(ls -t "$CURRENT_IMPL_DIR"/logs/codex-ai-review-*.log 2>/dev/null | head -1 || true)"
  if [ -n "$LATEST_REVIEW" ]; then
    echo "$LATEST_REVIEW"
    grep -E "AI_REVIEW_FINAL_STATUS|AI_REVIEW_CAN_RELEASE|AI_REVIEW_BLOCKING_COUNT|AI_REVIEW_SHOULD_FIX_COUNT|AI_REVIEW_SUGGESTION_COUNT|AI_REVIEW_CURRENT_SLICE" "$LATEST_REVIEW" || true
  else
    echo "No AI review log found."
  fi
  echo ""

  echo "===== LATEST MAPPING REVIEW ====="
  LATEST_MAPPING="$(ls -t "$CURRENT_IMPL_DIR"/logs/codex-prd-mapping-review-*.log 2>/dev/null | head -1 || true)"
  if [ -n "$LATEST_MAPPING" ]; then
    echo "$LATEST_MAPPING"
    grep -E "MAPPING_REVIEW_FINAL_STATUS|MAPPING_REVIEW_SCORE|MAPPING_REVIEW_CAN_IMPLEMENT" "$LATEST_MAPPING" || true
  else
    echo "No mapping review log found."
  fi
fi

echo ""
echo "===== MD CONSISTENCY ====="
if [ -x "./scripts/codex/validate-prd-md-consistency.sh" ]; then
  ./scripts/codex/validate-prd-md-consistency.sh || true
else
  echo "validate-prd-md-consistency.sh not found."
fi
