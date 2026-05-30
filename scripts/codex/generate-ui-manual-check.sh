#!/usr/bin/env bash
set -euo pipefail

source ./scripts/codex/resolve-current-prd-context.sh
resolve_current_prd_context

CURRENT_SLICE_ID="$(printf "%s" "$CURRENT_SLICE" | awk '{ print $1 }')"
CHECK_DIR="$PRD_DIR/ui-checks"
CHECK_FILE="$CHECK_DIR/${CURRENT_SLICE_ID}_manual_ui_check.md"
mkdir -p "$CHECK_DIR"

echo "# Manual UI Check - $CURRENT_SLICE_ID" > "$CHECK_FILE"
echo "" >> "$CHECK_FILE"
echo "- Current PRD: $CURRENT_PRD" >> "$CHECK_FILE"
echo "- Current Slice: $CURRENT_SLICE" >> "$CHECK_FILE"
echo "- Generated At: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"

echo "## Suggested Routes To Inspect" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"

# Heuristic route suggestions based on slice id/name
case "$CURRENT_SLICE" in
  *概览*|*Overview*)
    echo "- /organization-identity/overview" >> "$CHECK_FILE"
    ;;
  *用户管理*|*用户*|*User*)
    echo "- /organization-identity/users" >> "$CHECK_FILE"
    ;;
  *部门*|*组织架构*|*Department*)
    echo "- /organization-identity/departments" >> "$CHECK_FILE"
    ;;
  *用户组*|*Group*)
    echo "- /organization-identity/groups" >> "$CHECK_FILE"
    ;;
  *角色*|*Role*)
    echo "- /organization-identity/roles" >> "$CHECK_FILE"
    ;;
  *第三方*|*绑定*|*Identity*)
    echo "- /organization-identity/bindings" >> "$CHECK_FILE"
    ;;
  *License*|*license*)
    echo "- /organization-identity/licenses" >> "$CHECK_FILE"
    ;;
  *个人资料*|*Profile*)
    echo "- /organization-identity/profile" >> "$CHECK_FILE"
    ;;
  *)
    echo "- Inspect the route/page affected by this slice." >> "$CHECK_FILE"
    ;;
esac

echo "" >> "$CHECK_FILE"
echo "## User Roles / Scenarios" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"
echo "- system_admin: verify full access." >> "$CHECK_FILE"
echo "- organization_admin: verify scoped access and hidden/disabled actions." >> "$CHECK_FILE"
echo "- user_admin: verify operational access only." >> "$CHECK_FILE"
echo "- normal_user: verify no management data is exposed." >> "$CHECK_FILE"
echo "- License disabled: verify License-only UI is hidden or disabled according to PRD." >> "$CHECK_FILE"
echo "- No third-party identity source: verify empty state where relevant." >> "$CHECK_FILE"

echo "" >> "$CHECK_FILE"
echo "## UI States To Inspect" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"
echo "- Default state" >> "$CHECK_FILE"
echo "- Loading state" >> "$CHECK_FILE"
echo "- Empty state" >> "$CHECK_FILE"
echo "- Filtered-empty state, if list/table page" >> "$CHECK_FILE"
echo "- Error state" >> "$CHECK_FILE"
echo "- 403/no-permission state" >> "$CHECK_FILE"
echo "- 404/not-found state, if detail route/drawer" >> "$CHECK_FILE"
echo "- Disabled action state and disabled reason" >> "$CHECK_FILE"
echo "- Success feedback" >> "$CHECK_FILE"
echo "- Failure feedback" >> "$CHECK_FILE"
echo "- Retry behavior" >> "$CHECK_FILE"

echo "" >> "$CHECK_FILE"
echo "## Layout / UX Checklist" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"
echo "- Page title and primary action are clear." >> "$CHECK_FILE"
echo "- Spacing and grouping are consistent with surrounding pages." >> "$CHECK_FILE"
echo "- Table columns are readable and action column is not crowded." >> "$CHECK_FILE"
echo "- Filter area is not visually overwhelming." >> "$CHECK_FILE"
echo "- Modal/drawer width is reasonable." >> "$CHECK_FILE"
echo "- Destructive actions have confirmation." >> "$CHECK_FILE"
echo "- Icon-only actions have tooltip or visible label." >> "$CHECK_FILE"
echo "- Status is not communicated by color alone." >> "$CHECK_FILE"

echo "" >> "$CHECK_FILE"
echo "## Notes" >> "$CHECK_FILE"
echo "" >> "$CHECK_FILE"
echo "- Fill this section manually if visual issues are found." >> "$CHECK_FILE"

echo "Generated manual UI check file: $CHECK_FILE"
