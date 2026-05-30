# MASTER PRD QUEUE

## Rule

Codex must implement PRDs one by one.

Do not start the next PRD until the current PRD is Verified or explicitly advanced by the PRD automation rule.

Each Codex run may implement only one smallest coherent implementation slice.

Automation must resolve the current PRD from `docs/implementation/CURRENT_TASK.md`.

## Status Values

- Not Started
- Mapping
- In Progress
- Partial
- Needs Fix
- Human Review Required
- Verified
- Skipped

## Queue

| Order | PRD File | Module | Implementation Directory | Status | Current Slice | Priority | Notes |
|---|---|---|---|---|---|---|---|
| 001 | docs/prd/001-组织与身份中心 PRD.md | 组织与身份中心 | docs/implementation/001_组织与身份中心/ | Human Review Required | OIC-001H | P0 | OIC-001H 等待 AI 二次复核放行 |
| 002 | docs/prd/002_项目与空间中心.md | 项目与空间中心 | docs/implementation/002_项目与空间中心/ | Not Started | - | P0 | 依赖组织与身份 |
| 003 | docs/prd/003_权限与策略中心.md | 权限与策略中心 | docs/implementation/003_权限与策略中心/ | Not Started | - | P0 | 依赖组织、项目、角色 |
