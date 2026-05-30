#!/usr/bin/env bash
set -euo pipefail

PRD_ORDER="${1:-}"
PRD_FILE="${2:-}"
MODULE_NAME="${3:-}"

if [ -z "$PRD_ORDER" ] || [ -z "$PRD_FILE" ] || [ -z "$MODULE_NAME" ]; then
  echo "Usage:"
  echo "  ./scripts/codex/run-prd-mapping-only.sh <PRD_ORDER> <PRD_FILE> <MODULE_NAME>"
  echo ""
  echo "Example:"
  echo "  ./scripts/codex/run-prd-mapping-only.sh 002 'docs/prd/002 开放平台与集成中心 PRD.md' '开放平台与集成中心'"
  exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
  echo "ERROR: PRD file not found: $PRD_FILE"
  exit 1
fi

SAFE_MODULE_NAME="$(echo "$MODULE_NAME" | tr ' /' '__')"
IMPLEMENTATION_DIR="docs/implementation/${PRD_ORDER}_${SAFE_MODULE_NAME}"
LOG_DIR="$IMPLEMENTATION_DIR/logs"

mkdir -p "$IMPLEMENTATION_DIR"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-prd-mapping-$(date +"%Y%m%d-%H%M%S").log"

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run from project root."
  exit 1
fi

echo "PRD order: $PRD_ORDER"
echo "PRD file: $PRD_FILE"
echo "Module: $MODULE_NAME"
echo "Implementation dir: $IMPLEMENTATION_DIR"
echo "Log file: $LOG_FILE"
echo ""

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
You are the PRD mapping and slicing agent.

Your task is to create a high-quality implementation map for one PRD only.

PRD Order:
$PRD_ORDER

PRD File:
$PRD_FILE

Module Name:
$MODULE_NAME

Implementation Directory:
$IMPLEMENTATION_DIR

Hard rules:
1. Do not implement any code.
2. Do not modify src/.
3. Do not create Vue components.
4. Do not create service files.
5. Do not create mock data.
6. Do not create routes.
7. Only create or update implementation documents under:
   - $IMPLEMENTATION_DIR
   - docs/implementation/CURRENT_TASK.md
   - docs/implementation/MASTER_PRD_QUEUE.md if needed
8. The output must be a product-function-logic-level implementation plan, not a function-list-level plan.
9. Every slice must be small enough for one Codex run.
10. Every slice must have clear boundary, dependencies, affected pages, affected components, affected data objects, service methods, refresh requirements, audit log requirements, states, permissions, validation rules, interaction rules, and acceptance criteria.
11. Do not group unrelated features into one slice.
12. Do not create oversized slices such as complete user management page if it contains table, filter, detail, create, edit, delete, import, export, batch operations.
13. For list pages, split page shell, filters, table/pagination, row actions, export/batch operations when needed.
14. For forms/modals/drawers, split base structure, field validation, relation selection, submit/save behavior when needed.
15. For high-risk flows such as permission, audit log, import/export, deletion, batch operations, License, cross-page refresh, split them into explicit slices.
16. If a slice touches shared infrastructure, mark it as requiring Human Review.
17. The first implementation slice should usually be a foundation or page shell slice, not a large business flow.

Read first:
1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. $PRD_FILE

Create or update these files:
1. $IMPLEMENTATION_DIR/IMPLEMENTATION_MAP.md
2. $IMPLEMENTATION_DIR/CURRENT_SLICE.md
3. $IMPLEMENTATION_DIR/PROGRESS.md
4. $IMPLEMENTATION_DIR/ACCEPTANCE_CHECKLIST.md
5. $IMPLEMENTATION_DIR/DECISIONS.md
6. $IMPLEMENTATION_DIR/SLICE_SELF_REVIEW.md

Document requirements:

IMPLEMENTATION_MAP.md must include:
- basic info
- existing code context assumptions
- slice status definitions
- decomposition summary
- recommended execution order
- complete slice breakdown
- for every slice:
  - slice id
  - PRD section
  - page/module
  - goal
  - dependencies
  - blocked future slices
  - affected pages
  - affected components
  - affected data objects
  - affected service methods
  - data refresh requirements
  - audit log requirements
  - state requirements
  - permission requirements
  - validation requirements
  - interaction requirements
  - human review points
  - acceptance criteria
  - current status

CURRENT_SLICE.md must point to the first Ready slice only.

PROGRESS.md must record:
- status Mapping Completed
- current slice Ready
- mapping summary
- not yet implemented notice

ACCEPTANCE_CHECKLIST.md must include:
- global acceptance checklist
- slice acceptance checklist
- final PRD acceptance mapping

DECISIONS.md must include:
- PRD path decision
- implementation directory decision
- first slice selection decision
- slicing strategy decision

SLICE_SELF_REVIEW.md must say:
- mapping only
- no code implemented
- files changed
- next recommended action

At the end, output:
- PRD mapped
- number of slices
- first Ready slice
- files changed
- any mapping risks
- suggested user review focus
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== PRD mapping finished ====="
echo "Full log saved to: $LOG_FILE"
echo ""
echo "Changed files:"
git diff --name-only || true
