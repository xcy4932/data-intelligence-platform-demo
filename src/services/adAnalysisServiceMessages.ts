import type { AdModuleGateReason } from '@/types/adAnalysis'

export const adAccessDecisionMessage = (reason: AdModuleGateReason) => {
  const messages: Record<AdModuleGateReason, string> = {
    version_closed: '广告投放分析功能对 V1.26 及更高版本的新用户停止开放。',
    not_purchased: '当前项目未开通广告投放分析能力，请联系商务或管理员开通。',
    not_deployed: '当前部署环境未开启广告投放分析能力，请联系管理员开通。',
    no_permission: '暂无广告投放分析权限，请联系项目管理员开通。',
    data_not_ready: '请先完成数据融合模块中的前置数据准备。',
    id_mapping_not_ready: '请先完成 ID Mapping 或 ID 关联配置。',
    monitoring_data_not_ready: '请先完成广告监测数据接入。',
    iad_required: '广告报表分析需要同时采购 veCDP 和 iAD。',
  }

  return messages[reason]
}
