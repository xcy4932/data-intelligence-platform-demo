#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

trim() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf "%s" "$value"
}

extract_task_slice_id() {
  printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }'
}

extract_task_prd_id() {
  printf "%s" "$CURRENT_PRD" | awk '{ print $1 }'
}

extract_current_slice_file_id() {
  awk -F '：' '
    /切片 ID/ {
      value=$2
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      print value
      exit
    }
  ' "$CURRENT_SLICE_FILE" | awk '{ print $1 }'
}

extract_current_slice_file_status() {
  awk -F '：' '
    /状态/ {
      value=$2
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      print value
      exit
    }
  ' "$CURRENT_SLICE_FILE"
}

extract_map_slice_status() {
  local slice_id="$1"

  awk -v slice="$slice_id" '
    $0 ~ "^### " slice "([[:space:]]|$)" { in_section=1; next }
    in_section && /^### / { exit }
    in_section && /当前状态/ {
      value=$0
      sub(/^- 当前状态：/, "", value)
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      print value
      exit
    }
  ' "$IMPLEMENTATION_MAP_FILE"
}

extract_queue_row() {
  local prd_id="$1"

  awk -F '|' -v prd="$prd_id" '
    NR > 1 {
      order=$2
      gsub(/^[ \t]+|[ \t]+$/, "", order)
      if (order == prd) {
        print $0
        exit
      }
    }
  ' "$MASTER_QUEUE_FILE"
}

extract_queue_field() {
  local row="$1"
  local index="$2"

  printf "%s\n" "$row" | awk -F '|' -v idx="$index" '{
    value=$idx
    gsub(/^[ \t]+|[ \t]+$/, "", value)
    print value
  }'
}

is_queue_status_compatible() {
  local task_status="$1"
  local queue_status="$2"

  case "$task_status" in
    Ready|In\ Progress|Done)
      [ "$queue_status" = "In Progress" ]
      ;;
    "Human Review Required")
      [ "$queue_status" = "Human Review Required" ] || [ "$queue_status" = "In Progress" ]
      ;;
    "Needs Fix")
      [ "$queue_status" = "Needs Fix" ]
      ;;
    Blocked)
      [ "$queue_status" = "Partial" ] || [ "$queue_status" = "Needs Fix" ] || [ "$queue_status" = "Human Review Required" ]
      ;;
    Verified)
      [ "$queue_status" = "Verified" ]
      ;;
    *)
      return 1
      ;;
  esac
}

fail() {
  echo "ERROR: $1"
  exit 1
}

warn() {
  echo "WARN: $1"
}

echo "===== PRD MD consistency check ====="
echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Current slice: $CURRENT_SLICE"
echo "Current status: $CURRENT_STATUS"
echo ""

if grep -Eq "^cat >|<<'EOF'|^EOF$|^EOF[[:space:]]*$" "$CURRENT_TASK_FILE"; then
  fail "$CURRENT_TASK_FILE contains shell wrapper text such as cat/EOF. It must be clean markdown."
fi

[ -f "$CURRENT_SLICE_FILE" ] || fail "$CURRENT_SLICE_FILE not found."
[ -f "$PROGRESS_FILE" ] || fail "$PROGRESS_FILE not found."
[ -f "$IMPLEMENTATION_MAP_FILE" ] || fail "$IMPLEMENTATION_MAP_FILE not found."
[ -f "$ACCEPTANCE_CHECKLIST_FILE" ] || fail "$ACCEPTANCE_CHECKLIST_FILE not found."
[ -f "$REVIEW_FILE" ] || warn "$REVIEW_FILE not found. This is acceptable only before first slice review."

TASK_PRD_ID="$(extract_task_prd_id)"
TASK_SLICE_ID="$(extract_task_slice_id)"
SLICE_FILE_ID="$(extract_current_slice_file_id)"
SLICE_FILE_STATUS="$(extract_current_slice_file_status)"
MAP_SLICE_STATUS="$(extract_map_slice_status "$TASK_SLICE_ID")"
QUEUE_ROW="$(extract_queue_row "$TASK_PRD_ID")"

[ -n "$TASK_PRD_ID" ] || fail "Cannot parse Current PRD id from $CURRENT_TASK_FILE."
[ -n "$TASK_SLICE_ID" ] || fail "Cannot parse Current Slice id from $CURRENT_TASK_FILE."
[ -n "$SLICE_FILE_ID" ] || fail "Cannot parse slice id from $CURRENT_SLICE_FILE."
[ -n "$SLICE_FILE_STATUS" ] || fail "Cannot parse slice status from $CURRENT_SLICE_FILE."
[ -n "$MAP_SLICE_STATUS" ] || fail "Cannot parse current slice status from $IMPLEMENTATION_MAP_FILE for $TASK_SLICE_ID."
[ -n "$QUEUE_ROW" ] || fail "Cannot find PRD $TASK_PRD_ID in $MASTER_QUEUE_FILE."

QUEUE_IMPL_DIR="$(extract_queue_field "$QUEUE_ROW" 5)"
QUEUE_STATUS="$(extract_queue_field "$QUEUE_ROW" 6)"
QUEUE_CURRENT_SLICE="$(extract_queue_field "$QUEUE_ROW" 7)"

echo "Parsed task PRD id: $TASK_PRD_ID"
echo "Parsed task slice id: $TASK_SLICE_ID"
echo "CURRENT_SLICE.md slice id: $SLICE_FILE_ID"
echo "CURRENT_TASK.md status: $CURRENT_STATUS"
echo "CURRENT_SLICE.md status: $SLICE_FILE_STATUS"
echo "IMPLEMENTATION_MAP.md slice status: $MAP_SLICE_STATUS"
echo "MASTER_PRD_QUEUE.md implementation dir: $QUEUE_IMPL_DIR"
echo "MASTER_PRD_QUEUE.md status: $QUEUE_STATUS"
echo "MASTER_PRD_QUEUE.md current slice: $QUEUE_CURRENT_SLICE"
echo ""

[ "$TASK_SLICE_ID" = "$SLICE_FILE_ID" ] || fail "CURRENT_TASK.md slice ($TASK_SLICE_ID) does not match CURRENT_SLICE.md slice ($SLICE_FILE_ID)."

[ "$CURRENT_STATUS" = "$SLICE_FILE_STATUS" ] || fail "CURRENT_TASK.md status ($CURRENT_STATUS) does not match CURRENT_SLICE.md status ($SLICE_FILE_STATUS)."

[ "$CURRENT_STATUS" = "$MAP_SLICE_STATUS" ] || fail "CURRENT_TASK.md status ($CURRENT_STATUS) does not match IMPLEMENTATION_MAP.md status for $TASK_SLICE_ID ($MAP_SLICE_STATUS)."

[ "${CURRENT_IMPLEMENTATION_DIR%/}" = "${QUEUE_IMPL_DIR%/}" ] || fail "CURRENT_TASK.md implementation dir ($CURRENT_IMPLEMENTATION_DIR) does not match MASTER_PRD_QUEUE.md implementation dir ($QUEUE_IMPL_DIR)."

[ "$TASK_SLICE_ID" = "$QUEUE_CURRENT_SLICE" ] || fail "CURRENT_TASK.md slice ($TASK_SLICE_ID) does not match MASTER_PRD_QUEUE.md current slice ($QUEUE_CURRENT_SLICE)."

if ! is_queue_status_compatible "$CURRENT_STATUS" "$QUEUE_STATUS"; then
  fail "CURRENT_TASK.md status ($CURRENT_STATUS) is not compatible with MASTER_PRD_QUEUE.md status ($QUEUE_STATUS)."
fi

if [ "$CURRENT_STATUS" = "Ready" ]; then
  if grep -Eq "本轮不实现|仅标记下一步切片" "$CURRENT_SLICE_FILE"; then
    echo "Note: CURRENT_SLICE.md is a Ready marker for the next slice. This is acceptable."
  fi
fi

echo "PRD MD consistency check passed."
