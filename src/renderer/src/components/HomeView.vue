<template>
  <section class="home">
    <header class="page-header">
      <div class="heading-group">
        <div class="eyebrow">CHAMPION STORE</div>
        <div class="heading-line">
          <h1>购买英雄</h1>
          <span v-if="store.connected" class="result-count">
            {{ store.filteredChampions.length }} 个结果
          </span>
        </div>
        <p>筛选英雄并生成你的批量购买清单</p>
      </div>

      <div class="account-panel">
        <div class="connection-status" :class="store.connected ? 'ok' : 'err'">
          <span class="status-dot" aria-hidden="true"></span>
          {{ store.connected ? '游戏已连接' : '等待连接' }}
        </div>
        <template v-if="store.connected">
          <span v-if="store.summoner?.displayName" class="summoner-name">
            {{ store.summoner.displayName }}
          </span>
          <div class="wallet ip">
            <span>蓝色精粹</span>
            <strong>{{ (store.wallet?.ip ?? 0).toLocaleString() }}</strong>
          </div>
          <div class="wallet rp">
            <span>RP</span>
            <strong>{{ (store.wallet?.rp ?? 0).toLocaleString() }}</strong>
          </div>
        </template>
        <n-button size="small" quaternary :loading="store.loading" @click="refreshAll">
          {{ store.loading ? '同步中' : '刷新' }}
        </n-button>
      </div>
    </header>

    <n-alert
      v-if="store.error && store.connected"
      title="部分数据加载失败"
      type="error"
      :show-icon="true"
      closable
      class="connection-alert"
    >
      {{ store.error }}
    </n-alert>

    <div v-if="!store.connected && !store.loading" class="not-connected">
      <div class="connection-illustration" aria-hidden="true">
        <span></span>
      </div>
      <h2>连接英雄联盟客户端</h2>
      <p>启动并登录游戏客户端后，即可浏览和批量选择英雄。</p>
      <n-button type="primary" size="large" @click="refreshAll">重新连接</n-button>
      <details v-if="store.error" class="diagnostics">
        <summary>查看诊断信息</summary>
        <p>{{ store.error }}</p>
      </details>
    </div>

    <template v-else>
      <section class="filter-panel" aria-label="英雄筛选">
        <div class="toolbar">
          <n-input
            v-model:value="store.searchQuery"
            placeholder="搜索英雄名称"
            clearable
            size="medium"
            class="search-input"
          />
          <n-select
            v-model:value="store.filterOwned"
            :options="ownedOptions"
            size="medium"
            class="owned-select"
          />
          <n-select
            v-model:value="store.filterCurrency"
            :options="currencyOptions"
            size="medium"
            class="currency-select"
          />
          <div class="toolbar-actions">
            <n-button secondary @click="store.selectAll">选择全部</n-button>
            <n-button quaternary :disabled="store.selectedIds.size === 0" @click="store.clearSelection">
              清空
            </n-button>
            <n-button quaternary @click="showTemplateDrawer = true">
              我的清单{{ store.templates.length > 0 ? ` ${store.templates.length}` : '' }}
            </n-button>
          </div>
        </div>

        <div class="filter-groups">
          <div class="filter-section">
            <span class="filter-title">分路</span>
            <n-space :size="6">
              <n-button
                v-for="position in positionPresets"
                :key="position.value"
                size="tiny"
                :type="store.filterPosition === position.value ? 'primary' : 'default'"
                :secondary="store.filterPosition !== position.value"
                :aria-pressed="store.filterPosition === position.value"
                @click="store.filterPosition = position.value"
              >
                {{ position.label }}
              </n-button>
            </n-space>
          </div>

          <div class="filter-section">
            <span class="filter-title">价格</span>
            <n-space :size="6">
              <n-button
                v-for="preset in pricePresets"
                :key="preset.label"
                size="tiny"
                :type="
                  store.priceRanges.min === preset.min &&
                  store.priceRanges.max === preset.max
                    ? 'primary'
                    : 'default'
                "
                :secondary="
                  !(
                    store.priceRanges.min === preset.min &&
                    store.priceRanges.max === preset.max
                  )
                "
                @click="store.setPriceRange(preset.min, preset.max)"
              >
                {{ preset.label }}
              </n-button>
            </n-space>
          </div>
        </div>
      </section>

      <div v-if="store.loading" class="loading">
        <n-spin size="large" />
        <p>正在同步英雄列表</p>
      </div>
      <div v-else class="grid-container">
        <n-empty
          v-if="store.filteredChampions.length === 0"
          description="没有符合筛选条件的英雄"
          class="empty-results"
        />
        <div v-else class="champion-grid">
          <ChampionCard
            v-for="champ in store.filteredChampions"
            :key="champ.itemId"
            :champion="champ"
            :is-selected="store.selectedIds.has(champ.itemId)"
            @toggle="store.toggleSelect"
          />
        </div>
      </div>

      <div v-if="store.purchaseLog.length > 0" class="purchase-log">
        <div class="purchase-log-title">购买进度</div>
        <div v-for="(log, i) in store.purchaseLog" :key="i" class="log-line">
          {{ log }}
        </div>
      </div>

      <footer v-if="store.selectedIds.size > 0" class="purchase-bar">
        <div class="purchase-summary">
          <strong>已选择 {{ store.selectedChampions.length }} 个英雄</strong>
          <span>
            <template v-if="store.estimatedCost.ip > 0">
              {{ store.estimatedCost.ip.toLocaleString() }} 精粹
            </template>
            <template v-if="store.estimatedCost.ip > 0 && store.estimatedCost.rp > 0"> · </template>
            <template v-if="store.estimatedCost.rp > 0">
              {{ store.estimatedCost.rp.toLocaleString() }} RP
            </template>
          </span>
        </div>
        <n-space>
          <n-button secondary @click="showTemplateDrawer = true">保存清单</n-button>
          <n-button type="primary" size="large" :loading="store.purchasing" @click="handlePurchase">
            {{ store.purchasing ? '购买中' : '立即购买' }}
          </n-button>
        </n-space>
      </footer>
    </template>

    <n-drawer v-model:show="showTemplateDrawer" :width="400" placement="right">
      <n-drawer-content title="我的清单/模板管理">
        <div class="template-manager">
          <!-- 保存新模板 -->
          <div v-if="store.selectedIds.size > 0" class="template-saver">
            <h3>保存当前清单为模板</h3>
            <n-input
              v-model:value="newTemplateName"
              placeholder="输入模板名称（如：必买上分池）"
              @keyup.enter="handleSaveTemplate"
            />
            <n-button
              type="primary"
              block
              style="margin-top: 8px"
              @click="handleSaveTemplate"
            >
              保存模板
            </n-button>
          </div>

          <!-- 已保存的模板列表 -->
          <div class="templates-list">
            <h3>已保存的模板（{{ store.templates.length }}）</h3>
            <n-empty
              v-if="store.templates.length === 0"
              description="暂无保存的模板"
            />
            <div v-else class="template-items">
              <div
                v-for="template in store.templates"
                :key="template.name"
                class="template-item"
              >
                <div class="template-info">
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-meta">
                    {{ template.championIds.length }} 个英雄 ·
                    {{ new Date(template.date).toLocaleDateString('zh-CN') }}
                  </div>
                </div>
                <n-space :size="6">
                  <n-button
                    size="tiny"
                    secondary
                    @click="handleApplyTemplate(template.name)"
                  >
                    应用
                  </n-button>
                  <n-button
                    size="tiny"
                    type="error"
                    secondary
                    @click="handleDeleteTemplate(template.name)"
                  >
                    删除
                  </n-button>
                </n-space>
              </div>
            </div>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  NButton,
  NInput,
  NSelect,
  NAlert,
  NSpace,
  NSpin,
  NDrawer,
  NDrawerContent,
  NEmpty,
  useMessage,
  useDialog
} from 'naive-ui';
import { useLcuStore } from '../stores/lcu';
import ChampionCard from './ChampionCard.vue';

const store = useLcuStore();
const message = useMessage();
const dialog = useDialog();
const showTemplateDrawer = ref(false);
const newTemplateName = ref('');

const ownedOptions = [
  { label: '全部', value: 'all' },
  { label: '未拥有', value: 'unowned' },
  { label: '已拥有', value: 'owned' }
];

const currencyOptions = [
  { label: '全部', value: 'all' },
  { label: '精粹', value: 'IP' },
  { label: 'RP', value: 'RP' }
];

const positionPresets = [
  { label: '全部', value: 'all' },
  { label: '上路', value: 'top' },
  { label: '打野', value: 'jungle' },
  { label: '中路', value: 'middle' },
  { label: '下路', value: 'bottom' },
  { label: '辅助', value: 'support' }
] as const;

const pricePresets = [
  { label: '全部价格', min: 0, max: Infinity },
  { label: '<3150 精粹', min: 0, max: 3150 },
  { label: '3150-4800 精粹', min: 3150, max: 4800 },
  { label: '4800-6300 精粹', min: 4800, max: 6300 },
  { label: '>6300 精粹', min: 6300, max: Infinity }
];

async function refreshAll() {
  await store.checkStatus();
  if (store.connected) {
    await store.loadChampions();
    store.loadTemplates();
  }
}

async function handlePurchase() {
  dialog.warning({
    title: '批量购买确认',
    content: `确认批量购买 ${store.selectedChampions.length} 个英雄？此操作不可撤销。`,
    positiveText: '确认购买',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.purchaseSelected();
      message.success('购买流程已启动，请查看日志');
    }
  });
}

function handleSaveTemplate() {
  if (!newTemplateName.value.trim()) {
    message.error('请输入模板名称');
    return;
  }
  store.saveTemplate(newTemplateName.value, Array.from(store.selectedIds));
  message.success(`模板 "${newTemplateName.value}" 已保存`);
  newTemplateName.value = '';
}

function handleApplyTemplate(templateName: string) {
  store.applyTemplate(templateName);
  message.info(`已应用模板 "${templateName}"`);
}

function handleDeleteTemplate(templateName: string) {
  dialog.warning({
    title: '删除确认',
    content: `确定要删除模板 "${templateName}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      store.deleteTemplate(templateName);
      message.success('模板已删除');
    }
  });
}

onMounted(refreshAll);
</script>

<style scoped>
.home {
  flex: 1;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px 24px 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-shrink: 0;
}

.heading-group {
  min-width: 0;
}

.eyebrow {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.4px;
  margin-bottom: 2px;
}

.heading-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.heading-line h1 {
  color: var(--color-text);
  font-size: 24px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.4px;
}

.result-count,
.heading-group p {
  color: var(--color-text-muted);
  font-size: 12px;
}

.heading-group p {
  margin-top: 4px;
}

.account-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 8px 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  flex-shrink: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px currentColor;
  opacity: 0.9;
}

.connection-status.ok {
  color: var(--color-success);
}

.connection-status.err {
  color: var(--color-danger);
}

.summoner-name {
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 64px;
  padding-left: 13px;
  border-left: 1px solid var(--color-border);
}

.wallet span {
  color: var(--color-text-subtle);
  font-size: 10px;
  line-height: 1.2;
}

.wallet strong {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.wallet.ip strong {
  color: var(--color-blue-essence);
}

.wallet.rp strong {
  color: var(--color-rp);
}

.connection-alert {
  flex-shrink: 0;
}

.not-connected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 20px;
  padding: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.connection-illustration {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border: 1px solid var(--color-border-strong);
  border-radius: 16px;
  background: var(--color-surface-raised);
}

.connection-illustration span {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-text-subtle);
  border-radius: 50%;
  position: relative;
}

.connection-illustration span::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 2px;
  top: 5px;
  left: -3px;
  background: var(--color-danger);
  transform: rotate(-45deg);
}

.not-connected h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
}

.not-connected > p {
  color: var(--color-text-muted);
  margin: 7px 0 20px;
}

.diagnostics {
  max-width: 640px;
  margin-top: 18px;
  color: var(--color-text-subtle);
  font-size: 12px;
}

.diagnostics summary {
  cursor: pointer;
}

.diagnostics p {
  margin-top: 8px;
  text-align: left;
}

.filter-panel {
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 220px;
}

.owned-select {
  width: 120px;
}

.currency-select {
  width: 108px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid var(--color-border);
}

.filter-groups {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
  overflow-x: auto;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.filter-title {
  color: var(--color-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-muted);
}

.grid-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  margin-right: -8px;
  padding-right: 8px;
}

.champion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(204px, 1fr));
  gap: 8px;
  padding: 1px 1px 16px;
}

.empty-results {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.purchase-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 -24px;
  padding: 11px 24px;
  background: rgba(19, 23, 29, 0.97);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.purchase-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.purchase-summary strong {
  color: var(--color-text);
  font-size: 14px;
}

.purchase-summary span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.purchase-log {
  flex-shrink: 0;
  padding: 10px 12px;
  max-height: 96px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 12px;
}

.purchase-log-title {
  color: var(--color-text);
  font-weight: 600;
  margin-bottom: 4px;
}

.log-line {
  color: var(--color-text-muted);
  line-height: 1.4;
}

.template-manager {
  padding: 0;
}

.template-saver {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.template-saver h3,
.templates-list h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.template-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.template-item:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.template-meta {
  font-size: 11px;
  color: var(--color-text-muted);
}

@media (max-width: 980px) {
  .page-header {
    align-items: flex-start;
  }

  .heading-group p,
  .summoner-name {
    display: none;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .search-input {
    flex-basis: 100%;
  }

  .toolbar-actions {
    margin-left: auto;
  }
}

@media (max-width: 720px) {
  .home {
    padding: 16px 16px 0;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .account-panel {
    width: 100%;
  }

  .purchase-bar {
    margin: 0 -16px;
    padding-inline: 16px;
  }
}
</style>
