#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-run-$(date +"%Y%m%d-%H%M%S").log"

if ! command -v codex >/dev/null 2>&1; then
  echo "ERROR: codex command not found."
  exit 1
fi

if [ ! -f "AGENTS.md" ]; then
  echo "ERROR: AGENTS.md not found. Please run this script from project root."
  exit 1
fi

if [ ! -f "$IMPLEMENTATION_MAP_FILE" ]; then
  echo "ERROR: $IMPLEMENTATION_MAP_FILE not found."
  exit 1
fi

if [ ! -f "$CURRENT_SLICE_FILE" ]; then
  echo "ERROR: $CURRENT_SLICE_FILE not found."
  exit 1
fi

if [ ! -f "$ACCEPTANCE_CHECKLIST_FILE" ]; then
  echo "ERROR: $ACCEPTANCE_CHECKLIST_FILE not found."
  exit 1
fi

echo "Current PRD: $CURRENT_PRD"
echo "Current implementation directory: $PRD_DIR"
echo "Current slice: $CURRENT_SLICE"
echo "Current status: $CURRENT_STATUS"
echo "Codex log: $LOG_FILE"
echo ""

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<PROMPT
Use the following skills if available:
- prd-queue-runner
- senior-feature-implementation
- frontend-interaction-review
- frontend-ui-layout-review
- frontend-ux-flow-review
- frontend-code-quality-review
- data-table-form-usability-review
- frontend-accessibility-review
- frontend-performance-review
- regression-quality-check
- prd-slice-self-review

Current PRD:
$CURRENT_PRD

Current implementation directory:
$PRD_DIR

Current slice:
$CURRENT_SLICE

Current status:
$CURRENT_STATUS

Read these files first:
1. AGENTS.md
2. $MASTER_QUEUE_FILE
3. $CURRENT_TASK_FILE
4. $IMPLEMENTATION_MAP_FILE
5. $PROGRESS_FILE
6. $CURRENT_SLICE_FILE
7. $ACCEPTANCE_CHECKLIST_FILE
8. $DECISIONS_FILE if it exists
9. package.json

Task:
1. Implement exactly the current slice in $CURRENT_SLICE_FILE.
2. Do not implement future slices.
3. Do not modify unrelated modules.
4. Follow the acceptance checklist in $IMPLEMENTATION_MAP_FILE and $ACCEPTANCE_CHECKLIST_FILE.
5. Keep implementation within the current slice boundary.
6. Do not create fake buttons, TODO-only behavior, unreachable UI, or placeholder business actions.
7. If this slice does not require UI, do not add UI.
8. If this slice requires UI, every visible control must have real interaction logic, disabled logic, loading state, error state, empty state, and permission behavior when applicable.
9. Do not hardcode a PRD directory such as docs/implementation/001_组织与身份中心. Always use the current implementation directory from $CURRENT_TASK_FILE.

Checks:
1. Run npm run type-check.
2. Run npm run build.
3. Run targeted lint only for files changed in the current slice, for example:
   - npx oxlint <changed-current-slice-files>
   - npx eslint <changed-current-slice-files>
4. Do not run full-project lint if it auto-fixes unrelated files or is known to fail because of existing unrelated issues.
5. Do not run lint autofix across the whole repository.
6. Run npm run test only if package.json defines a test script.
7. If a check fails because of unrelated existing issues, record the reason clearly and do not fix unrelated files.

Self-review:
1. Perform self-review using prd-slice-self-review.
2. Create or update $REVIEW_FILE.
3. Fix issues found by self-review once if they are within the current slice.
4. If issues are outside the current slice, record them but do not fix them.
5. At the end of self-review, classify the current slice as Low, Medium, or High risk.
6. Automatically decide whether Human Review is required.
7. Do not rely on $CURRENT_SLICE_FILE manually setting Human Review Yes or No.

Human Review Required rules:
If the slice touches any of the following, mark Human Review Required: Yes and do not advance to the next slice:
- global types
- mock seed data
- service contracts
- route guards
- permission matrix
- cross-page refresh
- audit logs
- global state
- deletion logic
- batch operation logic
- import/export logic
- License logic
- authentication or authorization logic
- security-sensitive behavior
- any shared infrastructure used by future slices

Document update rules:
1. If Final Status is Done and Human Review Required is No:
   - mark the current slice as Done in $CURRENT_SLICE_FILE, $PROGRESS_FILE, $IMPLEMENTATION_MAP_FILE, and $ACCEPTANCE_CHECKLIST_FILE where applicable.
   - update $CURRENT_SLICE_FILE to the next Ready or Not Started slice according to $IMPLEMENTATION_MAP_FILE recommended execution order.
   - update $CURRENT_TASK_FILE to point to the next slice.
   - update $MASTER_QUEUE_FILE with the new current slice.
   - do not implement the next slice in this run.
2. If Final Status is Human Review Required:
   - keep $CURRENT_SLICE_FILE on the current slice.
   - mark current status as Human Review Required.
   - update $PROGRESS_FILE, $IMPLEMENTATION_MAP_FILE, $CURRENT_TASK_FILE, $MASTER_QUEUE_FILE, and $REVIEW_FILE consistently.
   - list exact files the user should upload or review.
3. If Final Status is Needs Fix:
   - keep $CURRENT_SLICE_FILE on the current slice.
   - mark current status as Needs Fix.
   - explain the required fix clearly.
4. If Final Status is Blocked:
   - keep $CURRENT_SLICE_FILE on the current slice.
   - mark current status as Blocked.
   - explain the blocker clearly.
5. Never advance to the next slice if Human Review Required is Yes.
6. Never advance to the next slice if Final Status is Needs Fix, Blocked, Failed, or unclear.
7. Never start implementing the next slice unless $CURRENT_SLICE_FILE already points to that slice at the beginning of a new Codex run.

Multi-PRD rule:
1. If all slices of the current PRD are completed, do not invent work.
2. Mark the current PRD as Verified or ready for final verification according to the queue rules.
3. Find the next PRD in $MASTER_QUEUE_FILE whose status is Not Started or Ready.
4. If the next PRD has no implementation directory yet, create it and initialize required implementation docs.
5. Update $CURRENT_TASK_FILE to point to the next PRD and its implementation directory.
6. Do not implement the first slice of the next PRD in the same run.
7. The first slice of the next PRD must start only in a new Codex run.

Output format:
At the end, output only a concise summary:
- current PRD
- current slice
- files changed
- commands run
- self-review final status
- review risk level
- Human Review Required: yes/no
- recommended files to upload or review if Human Review is required
- whether $CURRENT_SLICE_FILE advanced or stayed
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== Codex run finished ====="
echo "Full log saved to: $LOG_FILE"
echo ""

echo "Changed files:"
git diff --name-only || true
echo ""

echo "Self review summary:"
if [ -f "$REVIEW_FILE" ]; then
  grep -E "Slice ID|Files Changed|Commands Run|Final Status|Review Risk Level|Risk Level|Human Review Required|Recommended files" "$REVIEW_FILE" || true
else
  echo "No SLICE_SELF_REVIEW.md found."
fi
