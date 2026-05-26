<script setup lang="ts">
import { ref } from 'vue'
import { NAlert, NButton, NFormItem, NGi, NGrid, NInput, NSelect, NSpace, useMessage } from 'naive-ui'
import { tagService } from '@/services/tagService'
import type { TagCreatePayload, TagUploadResult } from '@/types/tag'

defineOptions({ name: 'ManualTagEditor' })

const draft = defineModel<TagCreatePayload>('draft', { required: true })
const uploadResult = defineModel<TagUploadResult | undefined>('uploadResult', { required: true })

const emit = defineEmits<{
  change: []
}>()

const message = useMessage()
const manualUploadFile = ref<File>()

const markChanged = (): void => {
  uploadResult.value = undefined
  emit('change')
}

const downloadText = (fileName: string, content: string): void => {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

const handleManualFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  manualUploadFile.value = file
  draft.value.rule.dataSource = file.name
  markChanged()
}

const previewUpload = async (): Promise<void> => {
  try {
    const file = manualUploadFile.value
    const fileText = file && /\.csv$/i.test(file.name) ? await file.text() : undefined
    uploadResult.value = await tagService.previewUpload(draft.value.rule.dataSource ?? file?.name ?? '标签上传.csv', draft.value.valueType, fileText)
    message.success('文件校验完成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '上传失败')
  }
}

const downloadManualTemplate = (): void => {
  downloadText('manual-tag-template.csv', 'user_id,tag_value\nu_10001,高意向\nu_10002,中意向')
  message.success('人工录入模板已下载')
}

const downloadUploadErrors = async (): Promise<void> => {
  if (!uploadResult.value) return
  const csv = await tagService.exportUploadErrorCsv(uploadResult.value)
  downloadText('manual-tag-upload-errors.csv', csv)
  message.success('失败明细已下载')
}
</script>

<template>
  <div class="type-editor">
    <n-grid :cols="3" :x-gap="16">
      <n-gi>
        <n-form-item label="ID 类型">
          <n-select
            v-model:value="draft.rule.manualIdType"
            :options="[
              { label: '用户ID', value: 'user_id' },
              { label: '会员ID', value: 'member_id' },
              { label: '主体ID', value: 'subject_id' },
            ]"
            @update:value="markChanged"
          />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="上传文件名">
          <n-input v-model:value="draft.rule.dataSource" placeholder="manual_tag_upload.csv" @input="markChanged" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="编辑方式">
          <n-select
            v-model:value="draft.rule.uploadMode"
            :options="[
              { label: '覆盖', value: 'cover' },
              { label: '移除', value: 'remove' },
            ]"
            @update:value="markChanged"
          />
        </n-form-item>
      </n-gi>
      <n-gi v-if="draft.valueType.startsWith('multi')">
        <n-form-item label="多值分隔符">
          <n-select
            v-model:value="draft.rule.manualDelimiter"
            :options="[
              { label: '逗号', value: ',' },
              { label: '空格', value: ' ' },
              { label: '换行符', value: '\n' },
            ]"
            @update:value="markChanged"
          />
        </n-form-item>
      </n-gi>
    </n-grid>

    <section class="upload-panel">
      <input class="file-input" type="file" accept=".csv,.xlsx" @change="handleManualFileChange" />
      <n-space>
        <n-button @click="downloadManualTemplate">下载模板</n-button>
        <n-button type="primary" @click="previewUpload">校验文件</n-button>
        <n-button v-if="uploadResult?.failedRows" @click="downloadUploadErrors">下载失败明细</n-button>
      </n-space>
    </section>

    <n-alert v-if="uploadResult" class="soft-alert" type="info">
      成功 {{ uploadResult.successRows }} 行，失败 {{ uploadResult.failedRows }} 行；可下载失败明细。
    </n-alert>
  </div>
</template>

<style scoped>
.type-editor,
.upload-panel {
  display: grid;
  gap: 12px;
}

.upload-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.file-input {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  width: 100%;
}
</style>
