<script setup lang="ts">
import { computed } from 'vue'
import {
  NAlert,
  NButton,
  NDivider,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NRadio,
  NRadioGroup,
  NScrollbar,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import type {
  FieldSchema,
  ModelingNode,
  OperatorConfigField,
  OperatorDefinition,
  VisualModelingTask,
} from '@/types/visualModeling'
import { visualModelingService } from '@/services/visualModelingService'

const props = defineProps<{
  task: VisualModelingTask
  node: ModelingNode | null
  upstreamFields: FieldSchema[]
}>()

const emit = defineEmits<{
  update: [node: ModelingNode]
}>()

const staticOptions = visualModelingService.getStaticOptions()

type ConditionRelation = 'AND' | 'OR'
type ConditionRow = {
  field?: string
  operator?: string
  value?: unknown
  relation?: ConditionRelation
  conditions?: ConditionRow[]
}
type ConditionGroup = {
  relation: ConditionRelation
  conditions: ConditionRow[]
}

const relationOptions: SelectOption[] = [
  { label: 'AND', value: 'AND' },
  { label: 'OR', value: 'OR' },
]

const operatorOptions: SelectOption[] = [
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: 'in', value: 'in' },
  { label: 'contains', value: 'contains' },
  { label: 'is_null', value: 'is_null' },
  { label: 'between', value: 'between' },
]

const definition = computed<OperatorDefinition | null>(() => {
  if (!props.node) return null
  return visualModelingService.getOperatorDefinition(props.node.type)
})

const fieldOptions = computed<SelectOption[]>(() =>
  props.upstreamFields.map((field) => ({
    label: `${field.displayName ?? field.name} (${field.name})`,
    value: field.name,
  })),
)

const connectionOptions = computed<SelectOption[]>(() =>
  staticOptions.connections
    .filter((connection) => (props.task.taskType === 'realtime' ? connection.realtime : !connection.realtime))
    .map((connection) => ({
      label: `${connection.name} / ${connection.type}`,
      value: connection.id,
    })),
)

const datasetOptions: SelectOption[] = staticOptions.datasets.map((dataset) => ({
  label: dataset.name,
  value: dataset.id,
}))

const folderOptions: SelectOption[] = staticOptions.folders.map((folder) => ({
  label: folder.name,
  value: folder.id,
}))

const modelOptions: SelectOption[] = [
  { label: '客户意向度分类模型 / AUC 0.873', value: 'model_intent_lr' },
  { label: 'One-hot 广告位编码模型', value: 'model_onehot_ad_position' },
  { label: '付费金额回归模型 / RMSE 18.4', value: 'model_pay_regression' },
]

const databaseOptions: SelectOption[] = ['dwd', 'dws', 'ads_dm', 'member', 'topic', 'oss'].map((item) => ({
  label: item,
  value: item,
}))

const tableOptions: SelectOption[] = [
  'dwd_user_event_di',
  'dws_ad_watch_summary_di',
  'member_profile',
  'dwd_payment_success_di',
  'user_behavior_event',
  'ad_cost_daily.csv',
].map((item) => ({ label: item, value: item }))

const subjectOptions: SelectOption[] = [
  { label: '用户主体', value: 'subject_user' },
  { label: '设备主体', value: 'subject_device' },
]

const idTypeOptions: SelectOption[] = [
  { label: 'user_id', value: 'user_id' },
  { label: 'mobile', value: 'mobile' },
  { label: 'idfa', value: 'idfa' },
  { label: 'OneID', value: 'oneid' },
]

function clone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

function configValue<T = unknown>(key: string): T | undefined {
  return props.node?.config[key] as T | undefined
}

function updateConfig(key: string, value: unknown) {
  if (!props.node) return
  const next = clone(props.node)
  next.config[key] = value
  emit('update', next)
}

function updateDisplayName(value: string) {
  if (!props.node) return
  const next = clone(props.node)
  next.displayName = value
  next.config.displayName = value
  emit('update', next)
}

function visible(field: OperatorConfigField): boolean {
  if (!field.visibleWhen) return true
  return configValue(field.visibleWhen.field) === field.visibleWhen.equals
}

function optionsFor(field: OperatorConfigField): SelectOption[] {
  if (field.options) {
    return field.options.map((option) => ({
      label: option.label,
      value: typeof option.value === 'boolean' ? String(option.value) : option.value,
    }))
  }
  if (field.key.includes('connection')) return connectionOptions.value
  if (field.key.includes('dataset')) return datasetOptions
  if (field.key.includes('folder')) return folderOptions
  if (field.key.includes('database') || field.key.includes('schema')) return databaseOptions
  if (field.key.includes('table') || field.key === 'topic') return tableOptions
  if (field.key.includes('model')) return modelOptions
  if (field.key.includes('subject')) return subjectOptions
  if (field.key.includes('idType')) return idTypeOptions
  if (/(field|column|columns|fields)$/i.test(field.key)) return fieldOptions.value
  return []
}

function invalidMessage(key: string): string {
  return props.node?.validationErrors.find((error) => error.field === key)?.message ?? ''
}

const nodeErrors = computed(() => props.node?.validationErrors ?? [])

const fieldConfigRows = computed(() => {
  const value = configValue<Array<Record<string, unknown>>>('fieldConfig')
  if (Array.isArray(value) && value.length > 0) {
    return value
  }
  return props.upstreamFields.map((field, index) => ({
    id: `${field.name}_${index}`,
    source: field.name,
    target: field.name,
    type: field.type,
    keep: true,
  }))
})

function updateFieldRow(index: number, key: string, value: unknown) {
  const rows = clone(fieldConfigRows.value)
  rows[index] = { ...(rows[index] ?? {}), [key]: value }
  updateConfig('fieldConfig', rows)
}

function normalizeMappingRows(key: string) {
  const value = configValue<Array<Record<string, unknown>>>(key)
  if (Array.isArray(value) && value.length > 0) {
    return value
  }
  return [{ source: '', target: '', value: '' }]
}

function updateMappingRow(key: string, index: number, column: string, value: unknown) {
  const rows = clone(normalizeMappingRows(key))
  rows[index] = { ...(rows[index] ?? {}), [column]: value }
  updateConfig(key, rows)
}

function addMappingRow(key: string) {
  updateConfig(key, [...normalizeMappingRows(key), { source: '', target: '', value: '' }])
}

function removeMappingRow(key: string, index: number) {
  const rows = normalizeMappingRows(key).filter((_, rowIndex) => rowIndex !== index)
  updateConfig(key, rows.length ? rows : [{ source: '', target: '', value: '' }])
}

function emptyCondition(relation?: ConditionRelation): ConditionRow {
  return { relation, field: '', operator: '=', value: '' }
}

function emptyConditionGroup(relation?: ConditionRelation): ConditionRow {
  return {
    relation,
    conditions: [emptyCondition()],
  }
}

function isNestedCondition(row: ConditionRow): boolean {
  return Array.isArray(row.conditions)
}

function conditionGroup(key: string): ConditionGroup {
  const value = configValue<ConditionGroup>(key)
  return {
    relation: value?.relation ?? 'AND',
    conditions: Array.isArray(value?.conditions) ? value.conditions : [],
  }
}

function updateConditionConnector(key: string, index: number, relation: ConditionRelation) {
  const group = clone(conditionGroup(key))
  group.conditions[index] = { ...(group.conditions[index] ?? {}), relation }
  updateConfig(key, group)
}

function updateCondition(key: string, index: number, column: string, value: unknown) {
  const group = clone(conditionGroup(key))
  group.conditions[index] = { ...(group.conditions[index] ?? emptyCondition()), [column]: value }
  updateConfig(key, group)
}

function updateChildConditionConnector(key: string, groupIndex: number, childIndex: number, relation: ConditionRelation) {
  const group = clone(conditionGroup(key))
  const nested = group.conditions[groupIndex] ?? emptyConditionGroup()
  const children = nested.conditions?.length ? nested.conditions : [emptyCondition()]
  children[childIndex] = { ...(children[childIndex] ?? emptyCondition()), relation }
  group.conditions[groupIndex] = { ...nested, conditions: children }
  updateConfig(key, group)
}

function updateChildCondition(key: string, groupIndex: number, childIndex: number, column: string, value: unknown) {
  const group = clone(conditionGroup(key))
  const nested = group.conditions[groupIndex] ?? emptyConditionGroup()
  const children = nested.conditions?.length ? nested.conditions : [emptyCondition()]
  children[childIndex] = { ...(children[childIndex] ?? emptyCondition()), [column]: value }
  group.conditions[groupIndex] = { ...nested, conditions: children }
  updateConfig(key, group)
}

function addCondition(key: string) {
  const group = conditionGroup(key)
  updateConfig(key, { ...group, conditions: [...group.conditions, emptyCondition(group.relation)] })
}

function addConditionGroup(key: string) {
  const group = conditionGroup(key)
  updateConfig(key, { ...group, conditions: [...group.conditions, emptyConditionGroup(group.relation)] })
}

function addChildCondition(key: string, groupIndex: number) {
  const group = clone(conditionGroup(key))
  const nested = group.conditions[groupIndex] ?? emptyConditionGroup()
  const children = nested.conditions ?? []
  group.conditions[groupIndex] = {
    ...nested,
    conditions: [...children, emptyCondition(nested.relation ?? 'AND')],
  }
  updateConfig(key, group)
}

function removeCondition(key: string, index: number) {
  const group = conditionGroup(key)
  const conditions = group.conditions.filter((_, rowIndex) => rowIndex !== index)
  updateConfig(key, { ...group, conditions })
}

function removeChildCondition(key: string, groupIndex: number, childIndex: number) {
  const group = clone(conditionGroup(key))
  const nested = group.conditions[groupIndex] ?? emptyConditionGroup()
  const children = (nested.conditions ?? []).filter((_, index) => index !== childIndex)
  group.conditions[groupIndex] = {
    ...nested,
    conditions: children,
  }
  updateConfig(key, group)
}

function formatSql() {
  const sql = String(configValue('sql') ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\bfrom\b/gi, '\nfrom')
    .replace(/\bwhere\b/gi, '\nwhere')
    .replace(/\bgroup by\b/gi, '\ngroup by')
    .trim()
  updateConfig('sql', sql)
}
</script>

<template>
  <aside class="config-panel">
    <template v-if="node && definition">
      <div class="config-head">
        <div>
          <div class="panel-title">节点配置</div>
          <div class="panel-subtitle">{{ definition.name }} · {{ definition.category }}</div>
        </div>
        <n-tag :type="node.validationStatus === 'invalid' ? 'error' : node.validationStatus === 'warning' ? 'warning' : 'success'" size="small">
          {{ node.validationStatus === 'invalid' ? '未完成' : node.validationStatus === 'warning' ? '有提醒' : '可保存' }}
        </n-tag>
      </div>

      <n-scrollbar class="config-scrollbar">
        <n-form label-placement="top" size="small">
          <n-form-item label="节点名称">
            <n-input :value="node.displayName" maxlength="64" show-count @update:value="updateDisplayName" />
          </n-form-item>

          <n-alert v-if="nodeErrors.length" type="error" :bordered="false" class="config-alert">
            <div v-for="error in nodeErrors" :key="`${error.field}-${error.message}`">{{ error.message }}</div>
          </n-alert>

          <n-divider />

          <template v-for="field in definition.configFields" :key="field.key">
            <n-form-item
              v-if="visible(field)"
              :label="field.label"
              :feedback="invalidMessage(field.key) || field.help"
              :validation-status="invalidMessage(field.key) ? 'error' : undefined"
            >
              <n-input
                v-if="field.control === 'input'"
                :value="String(configValue(field.key) ?? '')"
                :placeholder="field.placeholder"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-input
                v-else-if="field.control === 'textarea'"
                type="textarea"
                :value="String(configValue(field.key) ?? '')"
                :placeholder="field.placeholder"
                :autosize="{ minRows: 2, maxRows: 5 }"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-input
                v-else-if="field.control === 'sql-editor'"
                type="textarea"
                class="sql-editor"
                :value="String(configValue(field.key) ?? '')"
                :placeholder="field.placeholder"
                :autosize="{ minRows: 8, maxRows: 12 }"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-input-number
                v-else-if="field.control === 'number'"
                :value="Number(configValue(field.key) ?? field.defaultValue ?? 0)"
                :min="field.min"
                :max="field.max"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-select
                v-else-if="field.control === 'select'"
                clearable
                filterable
                :value="configValue<string | number>(field.key)"
                :options="optionsFor(field)"
                :placeholder="field.placeholder ?? '请选择'"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-select
                v-else-if="field.control === 'multi-select'"
                multiple
                clearable
                filterable
                :value="configValue<string[]>(field.key) ?? []"
                :options="optionsFor(field)"
                :placeholder="field.placeholder ?? '请选择'"
                @update:value="updateConfig(field.key, $event)"
              />

              <n-radio-group
                v-else-if="field.control === 'radio'"
                :value="configValue<string | number | boolean>(field.key)"
                @update:value="updateConfig(field.key, $event)"
              >
                <n-space>
                  <n-radio v-for="option in optionsFor(field)" :key="String(option.value)" :value="option.value">
                    {{ option.label }}
                  </n-radio>
                </n-space>
              </n-radio-group>

              <n-switch
                v-else-if="field.control === 'switch'"
                :value="Boolean(configValue(field.key) ?? field.defaultValue)"
                @update:value="updateConfig(field.key, $event)"
              />

              <div v-else-if="field.control === 'field-list'" class="config-table">
                <div class="field-row header">
                  <span>来源字段</span>
                  <span>输出字段名</span>
                  <span>输出类型</span>
                  <span>保留</span>
                </div>
                <div v-for="(row, index) in fieldConfigRows" :key="String(row.source ?? index)" class="field-row">
                  <span class="row-source">{{ row.source }}</span>
                  <n-input
                    size="small"
                    :value="String(row.target ?? '')"
                    @update:value="updateFieldRow(index, 'target', $event)"
                  />
                  <n-select
                    size="small"
                    :value="String(row.type ?? 'string')"
                    :options="[
                      { label: 'string', value: 'string' },
                      { label: 'int', value: 'int' },
                      { label: 'bigint', value: 'bigint' },
                      { label: 'double', value: 'double' },
                      { label: 'decimal', value: 'decimal' },
                      { label: 'boolean', value: 'boolean' },
                      { label: 'date', value: 'date' },
                      { label: 'datetime', value: 'datetime' },
                      { label: 'json', value: 'json' },
                    ]"
                    @update:value="updateFieldRow(index, 'type', $event)"
                  />
                  <n-switch
                    size="small"
                    :value="Boolean(row.keep)"
                    @update:value="updateFieldRow(index, 'keep', $event)"
                  />
                </div>
                <n-space class="batch-actions">
                  <n-button size="tiny" secondary @click="updateConfig(field.key, fieldConfigRows.map((row) => ({ ...row, target: String(row.target).toUpperCase() })))">
                    大写
                  </n-button>
                  <n-button size="tiny" secondary @click="updateConfig(field.key, fieldConfigRows.map((row) => ({ ...row, target: String(row.target).toLowerCase() })))">
                    小写
                  </n-button>
                  <n-button size="tiny" secondary @click="updateConfig(field.key, fieldConfigRows.map((row) => ({ ...row, target: String(row.target).replace(/[^\u4e00-\u9fa5\w]/g, '_') })))">
                    修复非法字符
                  </n-button>
                </n-space>
              </div>

              <div v-else-if="field.control === 'mapping-table'" class="mapping-table">
                <div class="mapping-row header">
                  <span>来源 / 名称</span>
                  <span>目标 / 条件</span>
                  <span>类型 / 值</span>
                  <span></span>
                </div>
                <div v-for="(row, index) in normalizeMappingRows(field.key)" :key="index" class="mapping-row">
                  <n-input
                    size="small"
                    :value="String(row.source ?? row.name ?? '')"
                    placeholder="来源字段或名称"
                    @update:value="updateMappingRow(field.key, index, 'source', $event)"
                  />
                  <n-input
                    size="small"
                    :value="String(row.target ?? row.condition ?? '')"
                    placeholder="目标字段或条件"
                    @update:value="updateMappingRow(field.key, index, 'target', $event)"
                  />
                  <n-input
                    size="small"
                    :value="String(row.value ?? row.type ?? row.expression ?? row.ratio ?? '')"
                    placeholder="类型 / 值 / 表达式"
                    @update:value="updateMappingRow(field.key, index, 'value', $event)"
                  />
                  <n-button size="tiny" quaternary type="error" @click="removeMappingRow(field.key, index)">删</n-button>
                </div>
                <n-button size="tiny" secondary @click="addMappingRow(field.key)">添加一行</n-button>
              </div>

              <div v-else-if="field.control === 'condition-builder'" class="condition-builder">
                <div v-for="(row, index) in conditionGroup(field.key).conditions" :key="index" class="condition-row">
                  <div class="condition-relation">
                    <n-select
                      v-if="index > 0"
                      size="small"
                      :value="row.relation ?? conditionGroup(field.key).relation"
                      :options="relationOptions"
                      @update:value="updateConditionConnector(field.key, index, $event as ConditionRelation)"
                    />
                  </div>

                  <template v-if="isNestedCondition(row)">
                    <section class="nested-condition">
                      <div class="nested-head">
                        <span>二级条件组</span>
                        <n-button size="tiny" secondary @click="addChildCondition(field.key, index)">添加子条件</n-button>
                      </div>
                      <div v-for="(child, childIndex) in row.conditions" :key="childIndex" class="child-condition-row">
                        <div class="condition-relation">
                          <n-select
                            v-if="childIndex > 0"
                            size="small"
                            :value="child.relation ?? row.relation ?? conditionGroup(field.key).relation"
                            :options="relationOptions"
                            @update:value="updateChildConditionConnector(field.key, index, childIndex, $event as ConditionRelation)"
                          />
                        </div>
                        <div class="condition-fields">
                          <n-select
                            size="small"
                            filterable
                            :value="String(child.field ?? '')"
                            :options="fieldOptions"
                            placeholder="字段"
                            @update:value="updateChildCondition(field.key, index, childIndex, 'field', $event)"
                          />
                          <n-select
                            size="small"
                            :value="String(child.operator ?? '=')"
                            :options="operatorOptions"
                            @update:value="updateChildCondition(field.key, index, childIndex, 'operator', $event)"
                          />
                          <n-input
                            class="condition-value"
                            size="small"
                            :value="String(child.value ?? '')"
                            placeholder="值"
                            @update:value="updateChildCondition(field.key, index, childIndex, 'value', $event)"
                          />
                        </div>
                        <n-button class="condition-delete" size="tiny" quaternary type="error" @click="removeChildCondition(field.key, index, childIndex)">删</n-button>
                      </div>
                    </section>
                  </template>

                  <div v-else class="condition-fields">
                    <n-select
                      size="small"
                      filterable
                      :value="String(row.field ?? '')"
                      :options="fieldOptions"
                      placeholder="字段"
                      @update:value="updateCondition(field.key, index, 'field', $event)"
                    />
                    <n-select
                      size="small"
                      :value="String(row.operator ?? '=')"
                      :options="operatorOptions"
                      @update:value="updateCondition(field.key, index, 'operator', $event)"
                    />
                    <n-input
                      class="condition-value"
                      size="small"
                      :value="String(row.value ?? '')"
                      placeholder="值"
                      @update:value="updateCondition(field.key, index, 'value', $event)"
                    />
                  </div>
                  <n-button class="condition-delete" size="tiny" quaternary type="error" @click="removeCondition(field.key, index)">删</n-button>
                </div>
                <n-space class="condition-actions">
                  <n-button size="tiny" secondary @click="addCondition(field.key)">添加条件</n-button>
                  <n-button size="tiny" secondary @click="addConditionGroup(field.key)">添加二级条件组</n-button>
                </n-space>
              </div>

              <template v-else>
                <n-input
                  :value="String(configValue(field.key) ?? '')"
                  @update:value="updateConfig(field.key, $event)"
                />
              </template>
            </n-form-item>

            <n-space v-if="field.control === 'sql-editor' && visible(field)" class="sql-actions">
              <n-button size="tiny" secondary @click="formatSql">格式化</n-button>
              <n-tag size="small" :bordered="false" type="info">只允许 SELECT，预览最多返回 1000 行</n-tag>
            </n-space>
          </template>
        </n-form>
      </n-scrollbar>
    </template>

    <n-empty v-else class="config-empty" description="选择一个节点后配置参数、字段映射和预览数据" />
  </aside>
</template>

<style scoped lang="scss">
.config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
}

.config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 650;
  color: #111827;
}

.panel-subtitle {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.config-scrollbar {
  min-height: 0;
  flex: 1;
  margin-top: 10px;
}

.config-alert {
  margin-bottom: 10px;
}

.config-empty {
  margin: auto;
}

.sql-editor :deep(textarea) {
  font-family:
    'SFMono-Regular',
    Consolas,
    'Liberation Mono',
    monospace;
}

.sql-actions {
  margin: -10px 0 12px;
}

.config-table,
.mapping-table,
.condition-builder {
  width: 100%;
}

.field-row,
.mapping-row {
  display: grid;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-row {
  grid-template-columns: minmax(84px, 1fr) minmax(100px, 1.2fr) minmax(94px, 0.9fr) 46px;
}

.mapping-row {
  grid-template-columns: minmax(84px, 1fr) minmax(84px, 1fr) minmax(84px, 1fr) 36px;
}

.condition-row,
.child-condition-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.condition-row > *,
.child-condition-row > *,
.condition-fields > * {
  min-width: 0;
}

.condition-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
}

.condition-relation {
  min-height: 28px;
}

.condition-delete {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.child-condition-row {
  align-items: start;
}

.child-condition-row .condition-fields {
  grid-template-columns: minmax(0, 1fr) 58px;
}

.child-condition-row .condition-value {
  grid-column: 1 / -1;
}

.nested-condition {
  min-width: 0;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.nested-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: #475569;
  font-size: 12px;
  font-weight: 650;
}

.condition-actions {
  margin-top: 2px;
}

.header {
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

.row-source {
  overflow: hidden;
  color: #475569;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-actions {
  margin-top: 2px;
}
</style>
