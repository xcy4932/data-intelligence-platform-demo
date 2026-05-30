# MASTER PRD QUEUE

## Rule

Codex must implement PRDs one by one.

Do not start the next PRD until the current PRD is Verified or marked Human Review Required.

Each Codex run may implement only one smallest coherent implementation slice.

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

| Order | PRD File | Module | Status | Current Slice | Priority | Notes |
|---|---|---|---|---|---|---|
| 001 | docs/prd/001-组织与身份中心 PRD.md | 组织与身份中心 | In Progress | OIC-002 | P0 | OIC-001H 人工复核修复已完成；下一步执行 OIC-002 组织与身份概览 |
| 002 | docs/prd/002_项目与空间中心.md | 项目与空间中心 | Not Started | - | P0 | 依赖组织与身份 |
| 003 | docs/prd/003_权限与策略中心.md | 权限与策略中心 | Not Started | - | P0 | 依赖组织、项目、角色 |
