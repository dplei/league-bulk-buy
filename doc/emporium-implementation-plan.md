# 蓝色精粹商店 — 批量购买炫彩/战利品宝箱

## 背景

LOL 蓝色精粹商店（Blue Essence Emporium）是限时活动，开放通过蓝色精粹购买皮肤炫彩、战利品宝箱等道具。当前项目只支持批量购买英雄，需要扩展为支持蓝精商店的炫彩/战利品宝箱批量购买。

## 现有架构分析

当前项目是 Electron + Vue 3 + Naive UI 架构：

```
src/main/services/
├── LcuClient.ts          # LCU HTTPS 客户端（连接、请求）
├── LcuApi.ts             # LCU 接口封装（仅英雄相关）
├── LockfileResolver.ts   # 读取 lockfile 获取端口/密码
└── BulkBuyService.ts     # 业务层（英雄批量购买）

src/preload/
├── index.ts              # IPC bridge（3 个 channel：get-status/get-champions/purchase）
└── index.d.ts            # 类型定义（Champion/Summoner/Wallet）

src/renderer/src/
├── App.vue               # 根组件（Naive UI dark theme）
├── stores/lcu.ts         # Pinia store（筛选/选择/购买/模板）
└── components/
    ├── HomeView.vue      # 主页面（英雄网格 + 筛选 + 购买栏）
    ├── ChampionCard.vue  # 英雄卡片
    └── TitleBar.vue      # 标题栏
```

**关键特征**：购买使用 `POST /lol-purchase-widget/v2/purchaseItems`，`inventoryType: 'CHAMPION'`。

---

## 需要确认的问题

> [!IMPORTANT]
> 以下问题会影响实现方案的选择，请确认：

1. **商店体系选择**：蓝精商店可能走两套不同的 API：
   - `lol-store` 经典商店 — 通过 `GET /lol-store/v1/catalog` 获取，`POST /lol-store/v3/purchase` 购买
   - `lol-shoppefront` 新商城（ChemtechShoppe）— 通过 `GET /lol-shoppefront/v1/stores` 获取，`POST /lol-shoppefront/v1/bulk-purchases` 批量购买

   **需要在蓝精商店开放时实际调用两个接口确认哪套有数据。** 建议在实现时两套都做探测，优先用 `lol-shoppefront`（原生批量），回退到 `lol-store`。

2. **UI 设计**：是做成独立 Tab 页（英雄 / 蓝精商店 两个 Tab），还是在同一页面增加物品类型切换？

3. **战利品宝箱**：购买后宝箱进入 `lol-loot`，是否也需要批量开箱功能？

---

## Proposed Changes

### Phase 1：后端 — LCU API 扩展

#### [MODIFY] [LcuApi.ts](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/main/services/LcuApi.ts)

新增以下接口方法：

```typescript
// --- 蓝精商店（lol-shoppefront）---

/** 获取所有活动商店（含蓝精商店） */
getShoppefrontStores(): Promise<ShoppefrontStore[]>

/** 获取指定商店详情 */
getShoppefrontStore(storeId: string): Promise<ShoppefrontStore>

/** 单个购买 */
shoppefrontPurchase(req: ShoppefrontPurchaseRequest): Promise<string>

/** 批量购买 */
shoppefrontBulkPurchase(req: ShoppefrontBulkPurchaseRequest): Promise<string>

/** 查询购买状态 */
getShoppefrontPurchaseStatus(purchaseId: string): Promise<any>

// --- 经典商店（lol-store，备选）---

/** 获取商店目录（按 inventoryType 过滤） */
getStoreCatalog(inventoryTypes?: string[]): Promise<StoreCatalogItem[]>

/** 经典商店购买 */
storePurchase(items: StorePurchaseItem[]): Promise<StorePurchaseResult>

// --- 炫彩查询 ---

/** 获取某皮肤的炫彩列表 */
getChromasBySkin(summonerId: number, championId: number, skinId: number): Promise<ChromaInfo[]>

// --- 战利品（可选）---

/** 获取玩家战利品 */
getPlayerLoot(): Promise<PlayerLootItem[]>

/** 获取战利品物品定义 */
getLootItems(): Promise<LootItemDef[]>
```

新增类型定义：

```typescript
interface ShoppefrontStore {
  id: string
  name: string
  type: string
  startTime: string
  endTime: string
  catalogEntries: ShoppefrontCatalogEntry[]
}

interface ShoppefrontCatalogEntry {
  id: string
  name: string
  productId: string
  displayMetadata: any        // 图标、描述等
  purchaseUnits: Array<{
    fulfillment: any
    paymentOptions: Array<{
      key: string
      payments: Array<{ currencyId: string; delta: number }>
    }>
  }>
  prerequisites: string       // 前置要求（如需拥有基础皮肤）
  purchaseLimits: string      // 购买限制
}

interface ShoppefrontPurchaseRequest {
  catalogEntryId: string
  paymentOptions: string[]
  quantity: number
  storeId: string
}

interface ShoppefrontBulkPurchaseRequest {
  purchaseItems: ShoppefrontPurchaseRequest[]
  purchaseTimeOut: number
}

interface StoreCatalogItem {
  inventoryType: string       // "CHAMPION", "CHAMPION_SKIN", "CHROMA" 等
  subInventoryType: string
  itemId: number
  active: boolean
  prices: Array<{ cost: number; currency: string; discount: number }>
  tags: string[]
  sale: any
  localizations: any
}

interface ChromaInfo {
  id: number
  championId: number
  name: string
  chromaPath: string
  colors: string[]
  disabled: boolean
  ownership: { owned: boolean }
  stillObtainable: boolean
}
```

---

#### [NEW] [EmporiumService.ts](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/main/services/EmporiumService.ts)

蓝色精粹商店业务服务层，与 `BulkBuyService`（英雄购买）并列：

```typescript
export class EmporiumService {
  /** 探测蓝精商店是否开放 + 使用哪套 API */
  async detectEmporium(): Promise<EmporiumDetectResult>

  /** 获取蓝精商店道具列表（统一格式） */
  async getEmporiumItems(): Promise<EmporiumItem[]>

  /** 批量购买蓝精商店道具 */
  async bulkPurchase(items: EmporiumPurchaseRequest[]): Promise<BulkPurchaseResult>
}

interface EmporiumDetectResult {
  available: boolean
  backend: 'shoppefront' | 'store' | null  // 使用哪套 API
  storeId?: string                          // shoppefront 的 storeId
  storeName?: string
}

interface EmporiumItem {
  id: string                    // 统一 ID（catalogEntryId 或 itemId）
  name: string
  type: 'chroma' | 'loot' | 'other'
  iconUrl: string
  beCost: number                // 蓝色精粹价格
  owned: boolean
  prerequisite?: string         // 前置要求描述
  // 原始数据
  _raw: ShoppefrontCatalogEntry | StoreCatalogItem
}
```

核心逻辑：
1. 先调用 `GET /lol-shoppefront/v1/stores`，查找蓝精商店
2. 如果没找到，回退到 `GET /lol-store/v1/catalog`，过滤 IP 价格的炫彩/战利品
3. 统一转化为 `EmporiumItem[]` 返回前端

---

#### [MODIFY] [BulkBuyService.ts](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/main/services/BulkBuyService.ts)

不修改现有英雄购买逻辑，保持不变。

---

### Phase 2：IPC 层扩展

#### [MODIFY] [index.ts (main)](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/main/index.ts)

新增 `emporium:` 命名空间的 IPC handlers：

```typescript
const emporiumService = new EmporiumService()

ipcMain.handle('emporium:detect', async () => {
  return await emporiumService.detectEmporium()
})

ipcMain.handle('emporium:get-items', async () => {
  return await emporiumService.getEmporiumItems()
})

ipcMain.handle('emporium:bulk-purchase', async (_, items) => {
  return await emporiumService.bulkPurchase(items)
})
```

#### [MODIFY] [index.ts (preload)](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/preload/index.ts)

在 `api` 对象中新增：

```typescript
// -- emporium（蓝精商店）功能 --
detectEmporium: () => ipcRenderer.invoke('emporium:detect'),
getEmporiumItems: () => ipcRenderer.invoke('emporium:get-items'),
emporiumBulkPurchase: (items) => ipcRenderer.invoke('emporium:bulk-purchase', items),
```

#### [MODIFY] [index.d.ts (preload)](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/preload/index.d.ts)

新增类型定义：

```typescript
export interface EmporiumItem {
  id: string
  name: string
  type: 'chroma' | 'loot' | 'other'
  iconUrl: string
  beCost: number
  owned: boolean
  prerequisite?: string
}

export interface EmporiumDetectResult {
  available: boolean
  backend: 'shoppefront' | 'store' | null
  storeName?: string
}

// Window.api 扩展
detectEmporium: () => Promise<EmporiumDetectResult>
getEmporiumItems: () => Promise<EmporiumItem[]>
emporiumBulkPurchase: (items: Array<{ id: string; beCost: number }>) => Promise<any>
```

---

### Phase 3：前端 — Store + UI

#### [NEW] [emporium.ts](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/renderer/src/stores/emporium.ts)

新的 Pinia store，管理蓝精商店状态：

```typescript
export const useEmporiumStore = defineStore('emporium', () => {
  const available = ref(false)
  const backend = ref<'shoppefront' | 'store' | null>(null)
  const storeName = ref('')
  const items = ref<EmporiumItem[]>([])
  const selectedIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const purchasing = ref(false)
  const purchaseLog = ref<string[]>([])
  const error = ref<string | null>(null)

  // 筛选器
  const filterType = ref<'all' | 'chroma' | 'loot'>('all')
  const filterOwned = ref<'all' | 'owned' | 'unowned'>('unowned')
  const searchQuery = ref('')

  // computed
  const filteredItems = computed(...)
  const selectedItems = computed(...)
  const estimatedCost = computed(...)

  // actions
  async function detect() { ... }
  async function loadItems() { ... }
  function toggleSelect(id: string) { ... }
  function selectAll() { ... }
  function clearSelection() { ... }
  async function purchaseSelected() { ... }  // 含余额校验 + 分批
})
```

#### [NEW] [EmporiumView.vue](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/renderer/src/components/EmporiumView.vue)

蓝精商店页面组件，布局参考 `HomeView.vue`：

- 顶部：商店状态指示（是否开放、商店名称、蓝精余额）
- 工具栏：搜索 + 类型筛选（全部/炫彩/战利品）+ 拥有状态筛选
- 网格列表：道具卡片（图标 + 名称 + BE 价格 + 拥有状态 + 选中状态）
- 底部操作栏：已选数量 + 预计花费 + 全选/清空/购买按钮
- 购买日志区

#### [NEW] [EmporiumItemCard.vue](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/renderer/src/components/EmporiumItemCard.vue)

道具卡片组件，类似 `ChampionCard.vue`，展示：
- 道具图标
- 名称 + 类型标签（炫彩/战利品）
- BE 价格
- 拥有/已选状态徽章
- 前置要求提示（如"需拥有基础皮肤"）

#### [MODIFY] [App.vue](file:///d:/lesuire/code/lol-workflow/league-bulk-buy/src/renderer/src/App.vue)

添加 Tab 切换，在"英雄购买"和"蓝精商店"之间切换：

```vue
<n-tabs v-model:value="activeTab" type="segment" animated>
  <n-tab-pane name="champions" tab="🛡️ 英雄购买">
    <HomeView />
  </n-tab-pane>
  <n-tab-pane name="emporium" tab="💎 蓝精商店">
    <EmporiumView />
  </n-tab-pane>
</n-tabs>
```

---

### Phase 4（可选）：战利品开箱

> [!NOTE]
> 此阶段为可选扩展，在 Phase 1-3 完成后再决定是否实现。

如果需要批量开箱功能：

- 使用 `GET /lol-loot/v1/player-loot` 获取玩家拥有的宝箱
- 使用 `POST /lol-loot/v1/recipes/{recipeName}/craft` 开箱
- 使用 `POST /lol-loot/v1/craft/mass` 批量合成
- 新增 `LootView.vue` 页面 + 对应 store

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/main/services/LcuApi.ts` | 新增 shoppefront/store/chroma/loot 接口 |
| NEW | `src/main/services/EmporiumService.ts` | 蓝精商店业务服务 |
| MODIFY | `src/main/index.ts` | 新增 `emporium:` IPC handlers |
| MODIFY | `src/preload/index.ts` | 新增 emporium IPC bridge |
| MODIFY | `src/preload/index.d.ts` | 新增类型定义 |
| NEW | `src/renderer/src/stores/emporium.ts` | 蓝精商店 Pinia store |
| NEW | `src/renderer/src/components/EmporiumView.vue` | 蓝精商店页面 |
| NEW | `src/renderer/src/components/EmporiumItemCard.vue` | 道具卡片组件 |
| MODIFY | `src/renderer/src/App.vue` | 添加 Tab 页切换 |

---

## 实现优先级

```
Phase 1（后端）→ Phase 2（IPC）→ Phase 3（前端）→ Phase 4（开箱，可选）
```

> [!WARNING]
> **实现前必须先做**：在蓝精商店开放时，手动调用 `GET /lol-shoppefront/v1/stores` 和 `GET /lol-store/v1/catalog` 确认实际数据结构，因为文档中的 schema 可能与实际返回有差异。可以在客户端开启时用浏览器访问 `https://127.0.0.1:{port}/lol-shoppefront/v1/stores` 抓取响应。

## Verification Plan

### Automated Tests
- 构建检查：`npm run build` 确保无类型错误
- 在蓝精商店开放期间启动应用，验证：
  1. Tab 切换正常
  2. 蓝精商店探测成功
  3. 道具列表正确加载（名称、图标、价格、拥有状态）
  4. 筛选功能正常
  5. 选择 + 余额校验正常
  6. 批量购买功能正常

### Manual Verification
- 在测试环境中购买少量低价道具验证购买流程
- 检查购买后余额更新、拥有状态刷新
