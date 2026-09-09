<template>
  <n-modal
    v-model:show="show"
    preset="card"
    class="update-modal"
    style="width: 520px; max-width: calc(100vw - 48px)"
    :title="title"
    :closable="status?.state !== 'downloading'"
    :mask-closable="false"
  >
    <div v-if="status?.state === 'ready'" class="update-body">
      <p class="update-hint">新版本已下载完成，重启后即可使用。</p>
    </div>

    <div v-else-if="status?.state === 'downloading'" class="update-body">
      <n-progress type="line" :percentage="status.percent" :height="10" />
      <p class="update-hint">正在下载安装包…</p>
    </div>

    <div v-else-if="status?.state === 'available'" class="update-body">
      <p class="update-hint">当前版本 v{{ currentVersion }}，可更新到 v{{ status.version }}。</p>
      <div v-if="status.notes.length > 0" class="changelog">
        <section v-for="entry in status.notes" :key="entry.version">
          <h4>v{{ entry.version }}</h4>
          <pre>{{ entry.note }}</pre>
        </section>
      </div>
      <p v-else class="update-hint">这个版本没有提供更新日志。</p>
    </div>

    <template #footer>
      <div class="update-actions">
        <n-button v-if="status?.state === 'available'" quaternary @click="show = false">
          稍后再说
        </n-button>
        <n-button
          v-if="status?.state === 'available'"
          type="primary"
          :loading="starting"
          @click="download"
        >
          下载更新
        </n-button>
        <n-button v-else-if="status?.state === 'ready'" type="primary" @click="install">
          重启并安装
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NButton, NModal, NProgress } from 'naive-ui'
import type { UpdateStatus } from '../../../preload/index.d'

const status = ref<UpdateStatus | null>(null)
const currentVersion = ref('')
const show = ref(false)
const starting = ref(false)
let off: (() => void) | undefined

const title = computed(() => {
  if (status.value?.state === 'ready') return '更新已就绪'
  if (status.value?.state === 'downloading') return '正在下载更新'
  return '发现新版本'
})

async function download() {
  starting.value = true
  await window.api.downloadUpdate()
  starting.value = false
}

function install() {
  window.api.installUpdate()
}

onMounted(async () => {
  currentVersion.value = await window.api.getAppVersion()
  off = window.api.onUpdateStatus((next) => {
    status.value = next
    // 只有这三种状态需要打断用户，其余交给标题栏的提示
    if (next.state === 'available' || next.state === 'downloading' || next.state === 'ready') {
      show.value = true
    }
  })
})

onUnmounted(() => off?.())
</script>

<style scoped>
.update-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.update-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.changelog {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.changelog h4 {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--color-accent);
}

.changelog section + section {
  margin-top: 14px;
}

.changelog pre {
  margin: 0;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
