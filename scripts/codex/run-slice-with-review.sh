#!/usr/bin/env bash
set -euo pipefail

PRD_DIR="docs/implementation/001_组织与身份中心"
LOG_DIR="$PRD_DIR/logs"
REVIEW_FILE="$PRD_DIR/SLICE_SELF_REVIEW.md"

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

if [ ! -f "docs/implementation/CURRENT_TASK.md" ]; then
  echo "ERROR: docs/implementation/CURRENT_TASK.md not found."
  exit 1
fi

if [ ! -f "$PRD_DIR/CURRENT_SLICE.md" ]; then
  echo "ERROR: $PRD_DIR/CURRENT_SLICE.md not found."
  exit 1
fi

codex exec --sandbox workspace-write --ask-for-approval on-request "$(cat <<'EOF'
Use the following skills if available:
- prd-queue-runner
- senior-feature-implementation
- frontend-interaction-review
- regression-quality-check
- prd-slice-self-review

Read these files first:
1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. docs/implementation/CURRENT_TASK.md
4. docs/implementation/001_组织与身份中心/IMPLEMENTATION_MAP.md
5. docs/implementation/001_组织与身份中心/PROGRESS.md
6. docs/implementation/001_组织与身份中心/CURRENT_SLICE.md
7. docs/implementation/001_组织与身份中心/ACCEPTANCE_CHECKLIST.md
8. package.json

Task:
1. Implement exactly the current slice in CURRENT_SLICE.md.
2. Do not implement future slices.
3. Do not modify unrelated modules.
4. Follow the acceptance checklist in IMPLEMENTATION_MAP.md.
5. Keep implementation within the current slice boundary.
6. Do not create fake buttons, TODO-only behavior, unreachable UI, or placeholder business actions.
7. If this slice does not require UI, do not add UI.
8. If this slice requires UI, every visible control must have real interaction logic, disabled logic, loading state, error state, empty state, and permission behavior when applicable.

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
2. Create or update docs/implementation/001_组织与身份中心/SLICE_SELF_REVIEW.md.
3. Fix issues found by self-review once if they are within the current slice.
4. If issues are outside the current slice, record them but do not fix them.
5. At the end of self-review, classify the current slice as Low, Medium, or High risk.
6. Automatically decide whether Human Review is required.
7. Do not rely on CURRENT_SLICE.md manually setting Human Review Yes or No.

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
   - mark the current slice as Done in CURRENT_SLICE.md, PROGRESS.md, IMPLEMENTATION_MAP.md, and ACCEPTANCE_CHECKLIST.md where applicable.
   - update CURRENT_SLICE.md to the next Ready or Not Started slice according to IMPLEMENTATION_MAP.md recommended execution order.
   - update docs/implementation/CURRENT_TASK.md to point to the next slice.
   - update docs/implementation/MASTER_PRD_QUEUE.md with the new current slice.
   - do not implement the next slice in this run.
2. If Final Status is Human Review Required:
   - keep CURRENT_SLICE.md on the current slice.
   - mark current status as Human Review Required.
   - update PROGRESS.md, IMPLEMENTATION_MAP.md, CURRENT_TASK.md, MASTER_PRD_QUEUE.md, and SLICE_SELF_REVIEW.md consistently.
   - list exact files the user should upload for human review.
3. If Final Status is Needs Fix:
   - keep CURRENT_SLICE.md on the current slice.
   - mark current status as Needs Fix.
   - explain the required fix clearly.
4. If Final Status is Blocked:
   - keep CURRENT_SLICE.md on the current slice.
   - mark current status as Blocked.
   - explain the blocker clearly.
5. Never advance to the next slice if Human Review Required is Yes.
6. Never advance to the next slice if Final Status is Needs Fix, Blocked, Failed, or unclear.
7. Never start implementing OIC-002 or any next slice unless CURRENT_SLICE.md already points to that slice at the beginning of a new Codex run.

Output format:
At the end, output only a concise summary:
- current slice
- files changed
- commands run
- self-review final status
- review risk level
- Human Review Required: yes/no
- recommended files to upload if Human Review is required
- whether CURRENT_SLICE.md advanced or stayed
EOF
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