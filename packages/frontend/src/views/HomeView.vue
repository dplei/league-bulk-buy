<template>
  <div class="home">
    <!-- 顶部状态栏 -->
    <header class="header">
      <div class="header-left">
        <h1 class="title">League Bulk Buy</h1>
        <div class="connection-status" :class="store.connected ? 'ok' : 'err'">
          {{ store.connected ? '● 已连接' : '● 未连接' }}
        </div>
      </div>

      <div v-if="store.summoner" class="summoner-info">
        <span class="summoner-name">{{ store.summoner.displayName }}</span>
        <span class="wallet ip">{{ store.wallet?.ip.toLocaleString() }} 精粹</span>
        <span class="wallet rp">{{ store.wallet?.rp.toLocaleString() }} RP</span>
      </div>

      <button class="btn btn-secondary" @click="refreshAll" :disabled="store.loading">
        {{ store.loading ? '加载中...' : '刷新' }}
      </button>
    </header>

    <!-- 错误提示 -->
    <div v-if="store.error" class="error-banner">
      {{ store.error }}
    </div>

    <!-- 未连接提示 -->
    <div v-if="!store.connected && !store.loading" class="not-connected">
      <p>无法连接到 League of Legends 客户端</p>
      <p class="hint">请确保：1. 英雄联盟客户端已启动并登录  2. 安装路径在默认位置</p>
      <button class="btn btn-primary" @click="refreshAll">重新连接</button>
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="toolbar">
        <input
          v-model="store.searchQuery"
          class="search-input"
          placeholder="搜索英雄..."
          type="search"
        />

        <div class="filter-group">
          <label>显示：</label>
          <select v-model="store.filterOwned">
            <option value="all">全部</option>
            <option value="unowned">未拥有</option>
            <option value="owned">已拥有</option>
          </select>
        </div>

        <div class="filter-group">
          <label>货币：</label>
          <select v-model="store.filterCurrency">
            <option value="all">全部</option>
            <option value="IP">精粹</option>
            <option value="RP">RP</option>
          </select>
        </div>

        <button class="btn btn-secondary btn-sm" @click="store.selectAll">全选未拥有</button>
        <button class="btn btn-secondary btn-sm" @click="store.clearSelection">清空选择</button>
      </div>

      <!-- 高级筛选栏 -->
      <div class="advanced-filters">
        <!-- 角色/职位筛选 -->
        <div class="filter-section">
          <div class="filter-title">角色职位：</div>
          <div class="tag-group">
            <button
              v-for="tag in availableTags"
              :key="tag"
              class="tag-btn"
              :class="{ active: store.selectedTags.has(tag) }"
              @click="store.toggleTag(tag)"
            >
              {{ tag }}
            </button>
            <button
              v-if="store.selectedTags.size > 0"
              class="tag-btn clear-btn"
              @click="store.clearTags"
            >
              清除筛选
            </button>
          </div>
        </div>

        <!-- 价格范围筛选 -->
        <div class="filter-section">
          <div class="filter-title">价格范围：</div>
          <div class="price-group">
            <button
              v-for="preset in pricePresets"
              :key="preset.label"
              class="price-btn"
              :class="{
                active:
                  store.priceRanges.min === preset.min && store.priceRanges.max === preset.max,
              }"
              @click="store.setPriceRange(preset.min, preset.max)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 英雄列表 -->
      <div v-if="store.loading" class="loading">
        加载英雄列表中...
      </div>
      <div v-else class="champion-grid">
        <ChampionCard
          v-for="champ in store.filteredChampions"
          :key="champ.itemId"
          :champion="champ"
          :is-selected="store.selectedIds.has(champ.itemId)"
          @toggle="store.toggleSelect"
        />
      </div>

      <!-- 底部操作栏 -->
      <div v-if="store.selectedIds.size > 0" class="purchase-bar">
        <div class="purchase-summary">
          已选择 <strong>{{ store.selectedChampions.length }}</strong> 个英雄
          <span v-if="store.estimatedCost.ip > 0"> · 预计消耗 {{ store.estimatedCost.ip.toLocaleString() }} 精粹</span>
          <span v-if="store.estimatedCost.rp > 0"> · 预计消耗 {{ store.estimatedCost.rp.toLocaleString() }} RP</span>
        </div>

        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" @click="showTemplateDrawer = true">
            💾 保存清单
          </button>
          <button
            class="btn btn-primary btn-purchase"
            :disabled="store.purchasing"
            @click="handlePurchase"
          >
            {{ store.purchasing ? '购买中...' : '立即购买' }}
          </button>
        </div>
      </div>

      <!-- 购买日志 -->
      <div v-if="store.purchaseLog.length > 0" class="purchase-log">
        <div v-for="(log, i) in store.purchaseLog" :key="i" class="log-line">
          {{ log }}
        </div>
      </div>
    </template>

    <!-- 清单管理抽屉 -->
    <el-drawer
      v-model="showTemplateDrawer"
      title="我的清单/模板管理"
      direction="rtl"
      size="400px"
    >
      <div class="template-manager">
        <!-- 保存新模板 -->
        <div v-if="store.selectedIds.size > 0" class="template-saver">
          <h3>保存当前清单为模板</h3>
          <el-input
            v-model="newTemplateName"
            placeholder="输入模板名称（如：必买上分池）"
            @keyup.enter="handleSaveTemplate"
          />
          <button class="btn btn-primary btn-full" @click="handleSaveTemplate">保存模板</button>
        </div>

        <!-- 已保存的模板列表 -->
        <div class="templates-list">
          <h3>已保存的模板（{{ store.templates.length }}）</h3>
          <div v-if="store.templates.length === 0" class="empty-state">
            暂无保存的模板
          </div>
          <div v-else class="template-items">
            <div v-for="template in store.templates" :key="template.name" class="template-item">
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-meta">
                  {{ template.championIds.length }} 个英雄 · {{ new Date(template.date).toLocaleDateString('zh-CN') }}
                </div>
              </div>
              <div class="template-actions">
                <button class="btn btn-secondary btn-sm" @click="handleApplyTemplate(template.name)">
                  应用
                </button>
                <button class="btn btn-danger btn-sm" @click="handleDeleteTemplate(template.name)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox, ElDrawer } from 'element-plus'
import { useLcuStore } from '../stores/lcu.js'
import ChampionCard from '../components/ChampionCard.vue'

const store = useLcuStore()
const showTemplateDrawer = ref(false)
const newTemplateName = ref('')
const availableTags = computed(() => {
  const tags = new Set<string>()
  store.champions.forEach((c) => {
    c.tags?.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).sort()
})

// 预设价格范围
const pricePresets = [
  { label: '全部价格', min: 0, max: Infinity },
  { label: '<3150 精粹', min: 0, max: 3150 },
  { label: '3150-4800 精粹', min: 3150, max: 4800 },
  { label: '4800-6300 精粹', min: 4800, max: 6300 },
  { label: '>6300 精粹', min: 6300, max: Infinity },
]

async function refreshAll() {
  await store.checkStatus()
  if (store.connected) {
    await store.loadChampions()
    store.loadTemplates()
  }
}

async function handlePurchase() {
  try {
    await ElMessageBox.confirm(
      `确认批量购买 ${store.selectedChampions.length} 个英雄？此操作不可撤销。`,
      '批量购买确认',
      {
        confirmButtonText: '确认购买',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await store.purchaseSelected()
    ElMessage.success('购买流程已启动，请查看日志')
  } catch (err: any) {
    if (err.message !== 'cancel') {
      ElMessage.error(err.message || '购买被取消')
    }
  }
}

async function handleSaveTemplate() {
  if (!newTemplateName.value.trim()) {
    ElMessage.error('请输入模板名称')
    return
  }
  store.saveTemplate(newTemplateName.value, Array.from(store.selectedIds))
  ElMessage.success(`模板 "${newTemplateName.value}" 已保存`)
  newTemplateName.value = ''
}

function handleApplyTemplate(templateName: string) {
  store.applyTemplate(templateName)
  ElMessage.info(`已应用模板 "${templateName}"`)
}

async function handleDeleteTemplate(templateName: string) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板 "${templateName}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    store.deleteTemplate(templateName)
    ElMessage.success('模板已删除')
  } catch (err: any) {
    if (err.message !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #16213e;
  border-radius: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #c89b3c;
  margin: 0;
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

.wallet {
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.wallet.ip {
  background: rgba(126, 200, 227, 0.15);
  color: #7ec8e3;
}

.wallet.rp {
  background: rgba(168, 126, 227, 0.15);
  color: #a87ee3;
}

.error-banner {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  color: #f44336;
  padding: 10px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}

.not-connected {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.not-connected p { margin: 8px 0; }
.not-connected .hint { font-size: 13px; color: #555; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #16213e;
  border-radius: 8px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 160px;
  padding: 6px 10px;
  background: #0f3460;
  border: 1px solid #2a2a3e;
  border-radius: 4px;
  color: #e5d5a0;
  font-size: 13px;
  outline: none;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #888;
}

.filter-group select {
  background: #0f3460;
  border: 1px solid #2a2a3e;
  border-radius: 4px;
  color: #e5d5a0;
  padding: 5px 8px;
  font-size: 13px;
  outline: none;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
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

.btn {
  padding: 7px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm { padding: 5px 10px; font-size: 12px; }

.btn-primary {
  background: #c89b3c;
  color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) { background: #e0b84a; }

.btn-secondary {
  background: #2a2a3e;
  color: #e5d5a0;
}

.btn-secondary:hover:not(:disabled) { background: #3a3a5e; }

.btn-purchase {
  padding: 10px 24px;
  font-size: 15px;
}

.btn-full {
  width: 100%;
  margin-top: 8px;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

/* 高级筛选栏 */
.advanced-filters {
  background: #16213e;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
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

.tag-group,
.price-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn,
.price-btn {
  padding: 5px 12px;
  background: #0f3460;
  border: 1px solid #2a2a3e;
  border-radius: 4px;
  color: #e5d5a0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.tag-btn:hover,
.price-btn:hover {
  border-color: #c89b3c;
}

.tag-btn.active,
.price-btn.active {
  background: #c89b3c;
  color: #1a1a2e;
  border-color: #c89b3c;
  font-weight: 600;
}

.clear-btn {
  background: #2a2a3e;
  border-color: #3a3a5e;
}

.clear-btn:hover {
  background: #3a3a5e;
}

/* 购买栏改进 */
.purchase-bar {
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 清单管理器 */
.template-manager {
  padding: 16px 0;
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

.template-saver :deep(.el-input__wrapper) {
  background: #0f3460;
  border: 1px solid #2a2a3e;
}

.template-saver :deep(.el-input__inner) {
  color: #e5d5a0;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: #666;
  font-size: 13px;
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

.template-actions {
  display: flex;
  gap: 6px;
}
</style>
