import type { EventMetricConfig } from './eventAnalysis'

export type FormulaTokenType = 'metric' | 'operator' | 'parenthesis' | 'constant'

export type FormulaOperator = '+' | '-' | '*' | '/'

export interface FormulaToken {
  id: string
  type: FormulaTokenType
  label: string
  value: string
  conditionId?: string
  operator?: FormulaOperator
  parenthesis?: '(' | ')'
  constantValue?: number
}

export interface FormulaCondition {
  id: string
  label: string
  metricConfig: EventMetricConfig
  participateInGroup: boolean
}

export interface FormulaDisplayConfig {
  format: 'number' | 'percent' | 'currency'
  precision: number
  unit: string
  showAtomicMetrics: boolean
}

export interface CustomFormulaMetric {
  id: string
  name: string
  metricType: 'custom' | 'formula'
  tokens: FormulaToken[]
  conditions: FormulaCondition[]
  displayConfig: FormulaDisplayConfig
  enabled: boolean
}

export interface FormulaValidationResult {
  valid: boolean
  message: string
}
