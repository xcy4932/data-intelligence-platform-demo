export type EntityId = string

export type ISODateString = string

export type ISODateTimeString = string

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month'

export type TrendDirection = 'up' | 'down' | 'flat'

export type DataFreshness = 'real-time' | 'hourly' | 'daily'

export type BusinessDomain =
  | 'advertising'
  | 'engagement'
  | 'monetization'
  | 'retention'
  | 'operation'
  | 'experiment'

export type EntityStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export interface DateRange {
  start: ISODateString
  end: ISODateString
}

export interface Owner {
  id: EntityId
  name: string
  department: string
}

export interface ComparisonValue {
  current: number
  previous: number
  delta: number
  deltaRate: number
  trend: TrendDirection
}

export interface DataSourceRef {
  id: EntityId
  name: string
  tableName: string
  freshness: DataFreshness
  lastSyncedAt: ISODateTimeString
}

export interface ServiceMeta {
  generatedAt: ISODateTimeString
  scenarioId: EntityId
  scenarioName: string
}

export interface ServiceResponse<T> {
  data: T
  meta: ServiceMeta
}
