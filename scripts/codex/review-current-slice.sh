#!/usr/bin/env bash
set -euo pipefail

PRD_DIR="docs/implementation/001_组织与身份中心"
LOG_DIR="$PRD_DIR/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/codex-ai-review-$(date +"%Y%m%d-%H%M%S").log"

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

echo "AI review log: $LOG_FILE"
echo ""

codex exec --sandbox read-only --ask-for-approval on-request "$(cat <<'PROMPT'
You are the second-pass reviewer for the current PRD slice.

Your role:
- Review only.
- Do not edit files.
- Do not implement fixes.
- Do not advance the slice.
- Do not commit.
- Do not approve based only on the previous self-review.
- Independently inspect the current repository state, including uncommitted changes.

Read these files first:
1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. docs/implementation/CURRENT_TASK.md
4. docs/implementation/001_组织与身份中心/IMPLEMENTATION_MAP.md
5. docs/implementation/001_组织与身份中心/PROGRESS.md
6. docs/implementation/001_组织与身份中心/CURRENT_SLICE.md
7. docs/implementation/001_组织与身份中心/ACCEPTANCE_CHECKLIST.md
8. docs/implementation/001_组织与身份中心/SLICE_SELF_REVIEW.md
9. package.json

Review method:
1. Use git diff --name-only to identify changed files.
2. Use git diff to inspect the actual code and document changes.
3. Verify the current slice boundary from CURRENT_TASK.md and CURRENT_SLICE.md.
4. Verify the implementation against the acceptance criteria in IMPLEMENTATION_MAP.md and ACCEPTANCE_CHECKLIST.md.
5. Verify that no future slice was implemented early.
6. Verify that no unrelated files were modified.
7. Verify that document status is consistent across:
   - CURRENT_SLICE.md
   - PROGRESS.md
   - IMPLEMENTATION_MAP.md
   - ACCEPTANCE_CHECKLIST.md
   - CURRENT_TASK.md
   - MASTER_PRD_QUEUE.md
   - SLICE_SELF_REVIEW.md
8. If the slice touches service contracts, permissions, route guards, audit logs, cross-page refresh, License logic, deletion, batch operations, import/export, or security-sensitive logic, inspect that logic carefully rather than approving mechanically.
9. Do not run commands that modify files.
10. Do not run lint autofix.

Decision rules:
- If the implementation satisfies the current slice acceptance criteria, does not cross boundaries, and documents are consistent or only need release-status updates, return Passed.
- If there is a concrete issue that must be fixed before release, return Needs Fix.
- If the slice cannot be reviewed due to missing files, unclear status, or conflicting docs, return Blocked.
- If the implementation contains any future-slice work, unrelated changes, fake UI, TODO-only behavior, unreachable UI, or missing key refresh/log/permission behavior, return Needs Fix.

Output requirements:
At the very end of your response, output these exact machine-readable lines:

AI_REVIEW_FINAL_STATUS: Passed | Needs Fix | Blocked
AI_REVIEW_RISK_LEVEL: Low | Medium | High
AI_REVIEW_CAN_RELEASE: Yes | No
AI_REVIEW_CURRENT_SLICE: <slice id and name>
AI_REVIEW_REQUIRED_FIXES:
- <required fix 1, or None>
AI_REVIEW_REVIEWED_FILES:
- <file 1>
- <file 2>
AI_REVIEW_SUMMARY:
- <short summary>
PROMPT
)" | tee "$LOG_FILE"

echo ""
echo "===== AI review finished ====="
echo "Full AI review log saved to: $LOG_FILE"
echo ""

echo "AI review decision:"
grep -E "^AI_REVIEW_FINAL_STATUS:|^AI_REVIEW_RISK_LEVEL:|^AI_REVIEW_CAN_RELEASE:|^AI_REVIEW_CURRENT_SLICE:" "$LOG_FILE" || true
