<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref, watch } from 'vue'
import { NAlert, NButton, NCheckbox, NCheckboxGroup, NDatePicker, NForm, NFormItem, NInput, NModal, NSpace } from 'naive-ui'
import type { RunTaskPayload, VisualModelingTask } from '@/types/visualModeling'

const props = defineProps<{
  show: boolean
  task: VisualModelingTask | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [payload: RunTaskPayload]
}>()

const selectedOutputIds = ref<string[]>([])
const dateValue = ref<number | [number, number]>(dayjs('2026-05-24').valueOf())
const remark = ref('')
const errorMessage = ref('')

const outputs = computed(() => {
  return (
    props.task?.dag.nodes
      .filter((node) => node.category === '输出')
      .map((node) => ({
        id: node.id,
        name: String(node.config.datasetName ?? node.config.topic ?? node.config.tagName ?? node.displayName),
      })) ?? []
  )
})

watch(
  () => props.show,
  (show) => {
    if (!show) return
    selectedOutputIds.value = outputs.value.map((output) => output.id)
    dateValue.value = props.task?.taskType === 'realtime'
      ? dayjs('2026-05-24').valueOf()
      : [dayjs('2026-05-24').valueOf(), dayjs('2026-05-24').valueOf()]
    remark.value = ''
    errorMessage.value = ''
  },
)

function formatDate(value: number): string {
  return dayjs(value).format('YYYY-MM-DD')
}

function submit() {
  const task = props.task
  if (!task) return
  if (selectedOutputIds.value.length === 0) {
    errorMessage.value = '至少选择一个输出节点'
    return
  }
  const range = Array.isArray(dateValue.value) ? dateValue.value : [dateValue.value, dateValue.value]
  const [start, end] = range
  if (!start || !end) {
    errorMessage.value = '业务日期不能为空'
    return
  }
  if (start > end) {
    errorMessage.value = '开始日期不能晚于结束日期'
    return
  }
  if (task.taskType === 'realtime' && formatDate(start) !== '2026-05-24') {
    errorMessage.value = '实时任务不允许选择历史业务日期，只能立即启动'
    return
  }
  emit('submit', {
    outputNodeIds: selectedOutputIds.value,
    businessDateStart: formatDate(start),
    businessDateEnd: formatDate(end),
    runType: 'manual',
    remark: remark.value.trim() || undefined,
  })
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="运行配置"
    class="run-modal"
    @update:show="emit('update:show', $event)"
  >
    <n-form label-placement="top">
      <n-alert v-if="task?.taskType === 'realtime'" type="info" :bordered="false" class="modal-alert">
        实时任务将立即启动持续运行，不支持历史业务日期回溯。
      </n-alert>
      <n-alert v-if="errorMessage" type="error" :bordered="false" class="modal-alert">{{ errorMessage }}</n-alert>

      <n-form-item label="输出节点" required>
        <n-checkbox-group v-model:value="selectedOutputIds">
          <n-space vertical>
            <n-checkbox v-for="output in outputs" :key="output.id" :value="output.id">
              {{ output.name }}
            </n-checkbox>
          </n-space>
        </n-checkbox-group>
      </n-form-item>

      <n-form-item label="业务日期" required>
        <n-date-picker
          v-if="task?.taskType === 'offline'"
          v-model:value="dateValue"
          type="daterange"
          clearable
        />
        <n-date-picker v-else v-model:value="dateValue" type="date" disabled />
      </n-form-item>

      <n-form-item label="运行说明">
        <n-input v-model:value="remark" type="textarea" :autosize="{ minRows: 3, maxRows: 5 }" placeholder="记录本次运行备注" />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="submit">提交运行</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped lang="scss">
.run-modal {
  width: 560px;
}

.modal-alert {
  margin-bottom: 12px;
}
</style>
