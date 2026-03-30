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
        <span class="wallet be">{{ store.wallet?.ip.toLocaleString() }} BE</span>
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
            <option value="BE">蓝色精华</option>
            <option value="RP">RP</option>
          </select>
        </div>

        <button class="btn btn-secondary btn-sm" @click="store.selectAll">全选未拥有</button>
        <button class="btn btn-secondary btn-sm" @click="store.clearSelection">清空选择</button>
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
          <span v-if="store.estimatedCost.be > 0"> · 预计消耗 {{ store.estimatedCost.be.toLocaleString() }} BE</span>
          <span v-if="store.estimatedCost.rp > 0"> · 预计消耗 {{ store.estimatedCost.rp.toLocaleString() }} RP</span>
        </div>

        <button
          class="btn btn-primary btn-purchase"
          :disabled="store.purchasing"
          @click="handlePurchase"
        >
          {{ store.purchasing ? '购买中...' : '立即购买' }}
        </button>
      </div>

      <!-- 购买日志 -->
      <div v-if="store.purchaseLog.length > 0" class="purchase-log">
        <div v-for="(log, i) in store.purchaseLog" :key="i" class="log-line">
          {{ log }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useLcuStore } from '../stores/lcu.js'
import ChampionCard from '../components/ChampionCard.vue'

const store = useLcuStore()

async function refreshAll() {
  await store.checkStatus()
  if (store.connected) {
    await store.loadChampions()
  }
}

async function handlePurchase() {
  const confirmed = confirm(
    `确认批量购买 ${store.selectedChampions.length} 个英雄？此操作不可撤销。`
  )
  if (confirmed) {
    await store.purchaseSelected()
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

.wallet.be {
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
</style>
