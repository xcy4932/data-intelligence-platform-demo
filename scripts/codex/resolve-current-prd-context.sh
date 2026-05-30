#!/usr/bin/env bash

resolve_current_prd_context() {
  CURRENT_TASK_FILE="docs/implementation/CURRENT_TASK.md"
  MASTER_QUEUE_FILE="docs/implementation/MASTER_PRD_QUEUE.md"

  if [ ! -f "$CURRENT_TASK_FILE" ]; then
    echo "ERROR: $CURRENT_TASK_FILE not found." >&2
    return 1
  fi

  if [ ! -f "$MASTER_QUEUE_FILE" ]; then
    echo "ERROR: $MASTER_QUEUE_FILE not found." >&2
    return 1
  fi

  CURRENT_PRD="$(
    awk '
      /^## Current PRD/ { found=1; next }
      found && NF { print $0; exit }
    ' "$CURRENT_TASK_FILE" | tr -d '\r'
  )"

  CURRENT_IMPLEMENTATION_DIR="$(
    awk '
      /^## Current Implementation Directory/ { found=1; next }
      found && NF { print $0; exit }
    ' "$CURRENT_TASK_FILE" | tr -d '\r'
  )"

  CURRENT_SLICE="$(
    awk '
      /^## Current Slice/ { found=1; next }
      found && NF { print $0; exit }
    ' "$CURRENT_TASK_FILE" | tr -d '\r'
  )"

  CURRENT_STATUS="$(
    awk '
      /^## Status/ { found=1; next }
      found && NF { print $0; exit }
    ' "$CURRENT_TASK_FILE" | tr -d '\r'
  )"

  if [ -z "$CURRENT_PRD" ]; then
    echo "ERROR: Current PRD is empty in $CURRENT_TASK_FILE." >&2
    return 1
  fi

  if [ -z "$CURRENT_IMPLEMENTATION_DIR" ]; then
    echo "ERROR: Current Implementation Directory is empty in $CURRENT_TASK_FILE." >&2
    return 1
  fi

  if [ -z "$CURRENT_SLICE" ]; then
    echo "ERROR: Current Slice is empty in $CURRENT_TASK_FILE." >&2
    return 1
  fi

  CURRENT_IMPLEMENTATION_DIR="${CURRENT_IMPLEMENTATION_DIR%/}"

  if [ ! -d "$CURRENT_IMPLEMENTATION_DIR" ]; then
    echo "ERROR: Current implementation directory not found: $CURRENT_IMPLEMENTATION_DIR" >&2
    return 1
  fi

  PRD_DIR="$CURRENT_IMPLEMENTATION_DIR"
  REVIEW_FILE="$PRD_DIR/SLICE_SELF_REVIEW.md"
  CURRENT_SLICE_FILE="$PRD_DIR/CURRENT_SLICE.md"
  PROGRESS_FILE="$PRD_DIR/PROGRESS.md"
  IMPLEMENTATION_MAP_FILE="$PRD_DIR/IMPLEMENTATION_MAP.md"
  ACCEPTANCE_CHECKLIST_FILE="$PRD_DIR/ACCEPTANCE_CHECKLIST.md"
  DECISIONS_FILE="$PRD_DIR/DECISIONS.md"
  LOG_DIR="$PRD_DIR/logs"

  export CURRENT_TASK_FILE
  export MASTER_QUEUE_FILE
  export CURRENT_PRD
  export CURRENT_IMPLEMENTATION_DIR
  export CURRENT_SLICE
  export CURRENT_STATUS
  export PRD_DIR
  export REVIEW_FILE
  export CURRENT_SLICE_FILE
  export PROGRESS_FILE
  export IMPLEMENTATION_MAP_FILE
  export ACCEPTANCE_CHECKLIST_FILE
  export DECISIONS_FILE
  export LOG_DIR
}
