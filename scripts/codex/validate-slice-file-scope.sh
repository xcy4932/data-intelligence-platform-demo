#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

CURRENT_SLICE_ID="$(printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }')"

if [ -z "$CURRENT_SLICE_ID" ]; then
  echo "ERROR: Cannot parse current slice id from CURRENT_TASK.md"
  exit 1
fi

if [ ! -f "$CURRENT_SLICE_FILE" ]; then
  echo "ERROR: CURRENT_SLICE file not found: $CURRENT_SLICE_FILE"
  exit 1
fi

echo "===== Slice file scope validation ====="
echo "Current PRD: $CURRENT_PRD"
echo "Current slice: $CURRENT_SLICE"
echo "Current slice file: $CURRENT_SLICE_FILE"
echo ""

CHANGED_FILES="$(git diff --name-only || true)"

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

ALLOWED_BLOCK="$(
  awk '
    /^## Allowed Files/ { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$CURRENT_SLICE_FILE" || true
)"

DEFAULT_ALLOWED_PATTERNS="$(
cat <<EOF_ALLOWED
$PRD_DIR/
docs/implementation/CURRENT_TASK.md
docs/implementation/MASTER_PRD_QUEUE.md
EOF_ALLOWED
)"

if [ -n "$ALLOWED_BLOCK" ]; then
  ALLOWED_PATTERNS="$(
    printf "%s\n" "$ALLOWED_BLOCK" \
      | sed -n 's/^- `\(.*\)`/\1/p; s/^- \(.*\)/\1/p' \
      | sed '/^[[:space:]]*$/d'
  )"
else
  ALLOWED_PATTERNS=""
fi

ALLOWED_PATTERNS="$(
  printf "%s\n%s\n" "$ALLOWED_PATTERNS" "$DEFAULT_ALLOWED_PATTERNS" \
    | sed '/^[[:space:]]*$/d'
)"

echo "Allowed patterns:"
echo "$ALLOWED_PATTERNS"
echo ""

is_allowed() {
  local file="$1"

  while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue

    # Directory prefix
    if [[ "$pattern" == */ ]]; then
      if [[ "$file" == "$pattern"* ]]; then
        return 0
      fi
    fi

    # Exact file
    if [[ "$file" == "$pattern" ]]; then
      return 0
    fi

    # Prefix-like directory without slash
    if [[ "$file" == "$pattern/"* ]]; then
      return 0
    fi

    # Glob support
    if [[ "$file" == $pattern ]]; then
      return 0
    fi
  done <<< "$ALLOWED_PATTERNS"

  return 1
}

OUT_OF_SCOPE=()

while IFS= read -r file; do
  [ -z "$file" ] && continue

  if ! is_allowed "$file"; then
    OUT_OF_SCOPE+=("$file")
  fi
done <<< "$CHANGED_FILES"

if [ "${#OUT_OF_SCOPE[@]}" -gt 0 ]; then
  echo "ERROR: Changed files outside allowed scope:"
  printf ' - %s\n' "${OUT_OF_SCOPE[@]}"
  echo ""
  echo "Add valid expected files to CURRENT_SLICE.md under:"
  echo "## Allowed Files"
  echo ""
  echo "Or revert unrelated changes before continuing."
  exit 1
fi

echo "Slice file scope validation passed."
