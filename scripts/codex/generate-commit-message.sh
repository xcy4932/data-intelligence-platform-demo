#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

CURRENT_PRD_ID="$(printf "%s" "$CURRENT_PRD" | awk '{ print $1 }')"
CURRENT_MODULE="$(printf "%s" "$CURRENT_PRD" | sed 's/^[^ ]*[[:space:]]*-[[:space:]]*//')"
CURRENT_SLICE_ID="$(printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }')"
CURRENT_SLICE_NAME="$(printf "%s" "$CURRENT_SLICE" | sed 's/^[^ ]*[[:space:]]*-[[:space:]]*//')"

CHANGED_FILES="$(git diff --name-only || true)"

TYPE="chore"

if echo "$CHANGED_FILES" | grep -E "^src/" >/dev/null 2>&1; then
  TYPE="feat"
fi

if echo "$CHANGED_FILES" | grep -E "^docs/" >/dev/null 2>&1 && ! echo "$CHANGED_FILES" | grep -E "^src/" >/dev/null 2>&1; then
  TYPE="docs"
fi

if echo "$CURRENT_SLICE_NAME" | grep -E "修复|fix|Fix|repair|Repair" >/dev/null 2>&1; then
  TYPE="fix"
fi

SCOPE="$(printf "%s" "$CURRENT_PRD_ID" | tr '[:upper:]' '[:lower:]')"

MESSAGE="$TYPE(prd-$SCOPE): complete $CURRENT_SLICE_ID $CURRENT_SLICE_NAME"

printf "%s\n" "$MESSAGE"
