# League Bulk Buy - 项目文档

## 项目概述

**League Bulk Buy** 是一款英雄联盟批量购买英雄的工具，旨在帮助玩家快速批量购买游戏中的英雄。项目采用现代化的前后端分离架构，使用 Vue 3 + TypeScript + Pinia + Element Plus 构建用户界面。

## 项目架构

```
league-bulk-buy/
├── packages/
│   ├── frontend/          # Vue 3 前端应用
│   │   ├── src/
│   │   │   ├── api/       # API 接口定义 (index.ts)
│   │   │   ├── components/  # Vue 组件 (ChampionCard.vue)
│   │   │   ├── stores/    # Pinia 状态管理 (lcu.ts)
│   │   │   ├── views/     # 页面组件 (HomeView.vue)
│   │   │   ├── main.ts    # 应用入口
│   │   │   └── App.vue    # 根组件
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── backend/           # Node.js + Express 后端服务
│       ├── src/
│       │   ├── index.ts    # 应用主入口
│       │   ├── lcu/        # LCU 客户端相关
│       │   │   ├── api.ts      # LCU API 接口封装
│       │   │   ├── client.ts   # LCU 客户端连接
│       │   │   └── lockfile.ts # Lockfile 处理
│       │   └── routes/     # API 路由定义 (lcu.ts)
│       ├── package.json
│       └── tsconfig.json
│
├── implementation_plan.md  # 功能实现计划 (Phase 1-4)
└── PROJECT.md             # 本文件
```

## 核心功能

### Phase 1: 现代化 UI 框架 ✅
- 使用 **Element Plus** 替代原生弹窗
- 实现**深色主题**支持（已在 main.ts 中配置）
- 美观、响应式的界面设计

### Phase 2: 余额防爆破安全校验 ✅
- 购买前自动检查钱包余额
- 如果余额不足，显示详细的缺少金额提示
- 防止误操作导致的购买失败

### Phase 3: 多维度高级筛选功能 ✅
- **角色/职位筛选**：根据英雄的 tags（如：战士、刺客、法师等）进行筛选
- **价格范围筛选**：预设 5 种价格档位（全部、<3150、3150-4800、4800-6300、>6300）
- **搜索功能**：按英雄名称搜索
- **货币筛选**：精粹(IP) 和 RP

### Phase 4: 购物车模板清单管理 ✅
- **保存清单**：将当前选中的英雄保存为模板
- **应用模板**：一键应用已保存的模板，快速加载英雄清单
- **本地持久化**：使用 localStorage 存储模板数据
- **模板管理**：查看、删除已保存的模板
- **模板信息**：显示模板创建日期和包含的英雄数

## 技术栈

### 前端
- **框架**：Vue 3 (Composition API)
- **状态管理**：Pinia
- **UI 框架**：Element Plus 2.13.6
- **构建工具**：Vite 5.4
- **语言**：TypeScript 5.6
- **工具库**：@vueuse/core

### 后端
- **运行时**：Node.js
- **框架**：Express
- **语言**：TypeScript

## 数据结构

### Champion 接口
```typescript
interface Champion {
  itemId: number
  name: string
  description: string
  ipPrice: number | null          // 精粹价格
  rpPrice: number | null          // RP价格
  saleIpPrice: number | null      // 折扣精粹价格
  saleRpPrice: number | null      // 折扣RP价格
  onSale: boolean                 // 是否在售
  owned: boolean                  // 是否已拥有
  purchasable: boolean            // 是否可购买
  tags: string[]                  // 角色标签（如：战士、刺客等）
  [key: string]: any              // LCU 原始字段
}
```

### Summoner 接口
```typescript
interface Summoner {
  displayName: string
  summonerId: number
  summonerLevel: number
  profileIconId: number
}
```

### Wallet 接口
```typescript
interface Wallet {
  ip: number      // 蓝色精华(精粹)
  rp: number      // RP
}
```

### Template 接口 (清单模板)
```typescript
interface Template {
  name: string              // 模板名称
  championIds: number[]     // 包含的英雄 ID 列表
  date: number              // 创建时间戳
}
```

## 后端 API 端点

### GET /api/status
获取连接状态、当前召唤师信息和钱包信息
```json
{
  "connected": true,
  "summoner": { /* Summoner */ },
  "wallet": { "ip": 10000, "rp": 5000 }
}
```

### GET /api/champions
获取英雄列表（包含价格、拥有状态、标签等）
返回数组：`Champion[]`

### POST /api/purchase
批量购买英雄
```json
{
  "items": [
    { "itemId": 1, "currency": "IP", "cost": 3150 },
    { "itemId": 2, "currency": "IP", "cost": 4800 }
  ]
}
```

## Pinia Store (lcu.ts)

### 状态 (State)
```typescript
connected: boolean                    // LCU 连接状态
summoner: Summoner | null            // 当前召唤师信息
wallet: Wallet | null                // 钱包余额
champions: Champion[]                // 英雄列表
selectedIds: Set<number>             // 已选中的英雄 ID
loading: boolean                     // 加载状态
error: string | null                 // 错误信息
purchasing: boolean                  // 购买中标志
purchaseLog: string[]                // 购买日志
filterOwned: 'all' | 'owned' | 'unowned'  // 拥有状态筛选
filterCurrency: 'all' | 'IP' | 'RP' // 货币筛选
searchQuery: string                  // 搜索关键词
selectedTags: Set<string>            // 已选中的角色标签
priceRanges: { min, max }            // 价格范围
templates: Template[]                // 保存的清单模板
```

### 计算属性 (Computed)
- `filteredChampions`：根据所有筛选条件过滤后的英雄列表
- `selectedChampions`：当前选中的英雄列表
- `estimatedCost`：预计消耗（IP 和 RP）

### 方法 (Actions)
- `checkStatus()`：检查连接状态
- `loadChampions()`：加载英雄列表
- `toggleSelect(itemId)`：切换英雄选中状态
- `selectAll()`：选中所有未拥有英雄
- `clearSelection()`：清空选择
- `toggleTag(tag)`：切换角色标签筛选
- `clearTags()`：清除所有标签筛选
- `setPriceRange(min, max)`：设置价格范围
- `purchaseSelected()`：执行批量购买（含余额校验）
- `loadTemplates()`：从 localStorage 加载清单
- `saveTemplate(name, championIds)`：保存新清单
- `deleteTemplate(name)`：删除清单
- `applyTemplate(templateName)`：应用清单（恢复选中状态）

## UI 组件

### HomeView.vue
主页面，包含：
- 顶部状态栏（连接状态、召唤师信息、钱包余额）
- 工具栏（搜索、货币/拥有状态筛选、快捷按钮）
- 高级筛选栏（角色标签、价格范围）
- 英雄网格列表
- 底部购买操作栏
- 购买日志显示区域
- 清单管理抽屉（保存/应用/删除模板）

### ChampionCard.vue
英雄卡片组件，显示：
- 英雄头像
- 英雄名称
- 价格信息（可显示原价和折扣价）
- 状态徽章（已拥有、折扣中、已选中）
- 点击选择交互

## 本地存储 (localStorage)

### 清单模板存储
- **键**：`champion-templates`
- **值**：JSON 格式的 Template 数组
- **作用**：跨会话保存用户的英雄购买清单模板

## 样式主题

### 颜色方案
- **主色**：`#c89b3c` (黄金色)
- **背景**：`#0d0d1a` (深紫黑)
- **卡片背景**：`#1a1a2e`
- **强调色**：
  - IP (精粹)：`#7ec8e3` (蓝色)
  - RP：`#a87ee3` (紫色)
  - 错误：`#f44336` (红色)
  - 成功：`#4caf50` (绿色)

## 开发流程

### 启动开发服务器
```bash
# 前端开发服务器
cd packages/frontend
npm run dev

# 后端开发服务器
cd packages/backend
npm run dev
```

### 构建项目
```bash
npm run build
```

## 重要特性

### 余额防爆破
在 `purchaseSelected()` 中实现：
```typescript
const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
const currentWallet = currency === 'RP' ? (wallet.value?.rp ?? 0) : (wallet.value?.ip ?? 0)

if (totalCost > currentWallet) {
  throw new Error(`余额不足！需要 ${totalCost} ${currency}，缺少 ${shortage}...`)
}
```

### 多筛选条件联动
`filteredChampions` 计算属性同时考虑：
1. 拥有状态
2. 货币类型
3. 搜索关键词
4. 角色标签
5. 价格范围

### 模板持久化
清单模板使用 localStorage 存储，支持：
- 自动保存到浏览器本地存储
- 多账号同一浏览器下独立存储
- 模板删除和更新功能

## 后续优化建议

1. **后端验证**：在后端也实现余额校验和权限验证
2. **批量操作日志**：保存购买历史记录
3. **导入/导出**：支持清单的 JSON 导出和导入
4. **云同步**：支持清单在多设备间同步
5. **快捷键**：添加快捷键支持（如 Enter 快速购买）
6. **动画优化**：优化列表加载、筛选的动画效果

## 相关文件

- `implementation_plan.md` - 详细的四阶段实现计划
- `CLAUDE.md` - Claude Code 项目配置和上下文指南