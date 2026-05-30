# CURRENT SLICE

## Slice

- 切片 ID：OIC-002
- 名称：组织与身份概览
- 状态：Ready
- PRD 章节：7

## 目标

展示统计卡片、待处理事项、用户增长趋势、第三方绑定概览、快捷入口和最近操作记录。

## 范围

- 概览页面默认态、加载态、空态、错误态和无权限态。
- 读取概览统计、待处理事项和最近操作记录。
- 快捷入口和卡片跳转按权限展示、禁用或提示。
- License 未开启时隐藏 License 相关卡片和待办。
- 最近操作记录读取审计日志。

## 非范围

- 本轮不实现 OIC-002；该文件仅标记下一步切片。
- 不实现 OIC-003 或后续业务切片。
- 不实现用户管理、部门管理、用户组管理、License 管理等页面详情逻辑。
- 不新增写操作。

## 预计涉及文件

- `src/views/organization-identity/OrganizationOverviewView.vue`
- `src/components/business/organization-identity/`
- `src/services/organizationIdentityService.ts`
- `src/types/organizationIdentity.ts`

## 验收标准

- [ ] 8 类统计卡按配置显示或隐藏。
- [ ] 待处理事项按钮按 PRD 跳转。
- [ ] 无目标权限时卡片不可点击并提示。
- [ ] 最近操作记录读取审计日志。
