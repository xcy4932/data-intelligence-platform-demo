import type { ChartConfig, EventAnalysisResult } from '@/types/eventAnalysis'

export interface ChartClickParams {
  componentType?: string
  seriesName?: string
  name?: string
  dataIndex?: number
}

export interface EventChartProps {
  result: EventAnalysisResult | null
  config: ChartConfig
  loading: boolean
}
