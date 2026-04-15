<template>
  <div class="home">
    <!-- 顶部状态栏 -->
    <header class="header">
      <div class="header-left">
        <div class="connection-status" :class="store.connected ? 'ok' : 'err'">
          {{ store.connected ? '● 已连接' : '● 未连接' }}
        </div>
      </div>

      <div v-if="store.summoner" class="summoner-info">
        <span class="summoner-name">{{ store.summoner.displayName }}</span>
        <n-tag :bordered="false" size="small" class="wallet-tag ip">
          {{ store.wallet?.ip.toLocaleString() }} 精粹
        </n-tag>
        <n-tag :bordered="false" size="small" class="wallet-tag rp">
          {{ store.wallet?.rp.toLocaleString() }} RP
        </n-tag>
      </div>

      <n-button
        size="small"
        secondary
        :loading="store.loading"
        @click="refreshAll"
      >
        {{ store.loading ? '加载中...' : '刷新' }}
      </n-button>
    </header>

    <!-- 错误提示 -->
    <n-alert
      v-if="store.error"
      type="error"
      :show-icon="true"
      closable
      style="margin-bottom: 12px"
    >
      {{ store.error }}
    </n-alert>

    <!-- 未连接提示 -->
    <div v-if="!store.connected && !store.loading" class="not-connected">
      <p>无法连接到 League of Legends 客户端</p>
      <p class="hint">
        请确保：1. 英雄联盟客户端已启动并登录 2. 安装路径在默认位置
      </p>
      <n-button type="primary" @click="refreshAll" style="margin-top: 16px">
        重新连接
      </n-button>
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="toolbar">
        <n-input
          v-model:value="store.searchQuery"
          placeholder="搜索英雄..."
          clearable
          size="small"
          style="flex: 1; min-width: 160px"
        />

        <n-select
          v-model:value="store.filterOwned"
          :options="ownedOptions"
          size="small"
          style="width: 110px"
        />

        <n-select
          v-model:value="store.filterCurrency"
          :options="currencyOptions"
          size="small"
          style="width: 100px"
        />

        <n-button size="small" secondary @click="store.selectAll">
          全选未拥有
        </n-button>
        <n-button size="small" secondary @click="store.clearSelection">
          清空选择
        </n-button>
        <n-button size="small" secondary @click="showTemplateDrawer = true">
          📋 我的清单{{
            store.templates.length > 0 ? ` (${store.templates.length})` : ''
          }}
        </n-button>
      </div>

      <!-- 高级筛选栏 -->
      <div class="advanced-filters">
        <div class="filter-section">
          <div class="filter-title">角色职位：</div>
          <n-space :size="6">
            <n-button
              v-for="tag in roleTagPresets"
              :key="tag.value"
              size="tiny"
              :type="store.selectedTags.has(tag.value) ? 'primary' : 'default'"
              :secondary="!store.selectedTags.has(tag.value)"
              @click="store.toggleTag(tag.value)"
            >
              {{ tag.label }}
            </n-button>
            <n-button
              v-if="store.selectedTags.size > 0"
              size="tiny"
              quaternary
              @click="store.clearTags"
            >
              清除筛选
            </n-button>
          </n-space>
        </div>

        <div class="filter-section">
          <div class="filter-title">价格范围：</div>
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

      <!-- 英雄列表 -->
      <div v-if="store.loading" class="loading">
        <n-spin size="large" />
        <p style="margin-top: 12px">加载英雄列表中...</p>
      </div>
      <div v-else class="grid-container">
        <div class="champion-grid">
          <ChampionCard
            v-for="champ in store.filteredChampions"
            :key="champ.itemId"
            :champion="champ"
            :is-selected="store.selectedIds.has(champ.itemId)"
            @toggle="store.toggleSelect"
          />
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div v-if="store.selectedIds.size > 0" class="purchase-bar">
        <div class="purchase-summary">
          已选择 <strong>{{ store.selectedChampions.length }}</strong> 个英雄
          <span v-if="store.estimatedCost.ip > 0">
            · 预计消耗 {{ store.estimatedCost.ip.toLocaleString() }} 精粹</span
          >
          <span v-if="store.estimatedCost.rp > 0">
            · 预计消耗 {{ store.estimatedCost.rp.toLocaleString() }} RP</span
          >
        </div>

        <n-space>
          <n-button size="small" secondary @click="showTemplateDrawer = true">
            💾 保存清单
          </n-button>
          <n-button
            type="primary"
            size="large"
            :loading="store.purchasing"
            @click="handlePurchase"
          >
            {{ store.purchasing ? '购买中...' : '立即购买' }}
          </n-button>
        </n-space>
      </div>

      <!-- 购买日志 -->
      <div v-if="store.purchaseLog.length > 0" class="purchase-log">
        <div v-for="(log, i) in store.purchaseLog" :key="i" class="log-line">
          {{ log }}
        </div>
      </div>
    </template>

    <!-- 清单管理抽屉 -->
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  NButton,
  NInput,
  NSelect,
  NTag,
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

const roleTagPresets = [
  { label: '战士', value: 'Fighter' },
  { label: '射手', value: 'Marksman' },
  { label: '辅助', value: 'Support' },
  { label: '法师', value: 'Mage' },
  { label: '坦克', value: 'Tank' },
  { label: '刺客', value: 'Assassin' }
];

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
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #16213e;
  border-radius: 8px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.connection-status {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
}

.connection-status.ok {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.connection-status.err {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.summoner-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.summoner-name {
  color: #e5d5a0;
  font-weight: 600;
}

.wallet-tag.ip {
  background: rgba(126, 200, 227, 0.15);
  color: #7ec8e3;
}

.wallet-tag.rp {
  background: rgba(168, 126, 227, 0.15);
  color: #a87ee3;
}

.not-connected {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  flex: 1;
}

.not-connected p {
  margin: 8px 0;
}

.not-connected .hint {
  font-size: 13px;
  color: #555;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #16213e;
  border-radius: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  flex: 1;
}

.grid-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* needed for flex child scrolling */
}

.champion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  padding-bottom: 80px;
}

.purchase-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #16213e;
  border-top: 2px solid #c89b3c;
  z-index: 100;
  flex-wrap: wrap;
}

.purchase-summary {
  font-size: 14px;
  color: #e5d5a0;
}

.purchase-log {
  position: fixed;
  bottom: 60px;
  right: 16px;
  background: #16213e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 12px;
  max-width: 360px;
  max-height: 200px;
  overflow-y: auto;
  font-size: 12px;
  z-index: 99;
}

.log-line {
  color: #aaa;
  margin-bottom: 4px;
  line-height: 1.4;
}

/* 高级筛选栏 */
.advanced-filters {
  background: #16213e;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 清单管理器 */
.template-manager {
  padding: 0;
}

.template-saver {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #2a2a3e;
}

.template-saver h3,
.templates-list h3 {
  font-size: 14px;
  font-weight: 600;
  color: #e5d5a0;
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
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 6px;
  transition: all 0.15s;
}

.template-item:hover {
  border-color: #c89b3c;
  background: #252540;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 13px;
  font-weight: 600;
  color: #e5d5a0;
  margin-bottom: 4px;
}

.template-meta {
  font-size: 11px;
  color: #888;
}
</style>
