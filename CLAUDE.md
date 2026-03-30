# CLAUDE.md - League Bulk Buy 项目指南

## 项目快速导航

**完整项目文档**：查看 `PROJECT.md` 了解详细的架构、功能、数据结构等信息。

**实现计划**：查看 `implementation_plan.md` 了解 Phase 1-4 的详细功能说明。

## 项目状态

- ✅ **Phase 1**：现代化 UI 框架 (Element Plus + Dark Mode) - 已完成
- ✅ **Phase 2**：余额防爆破安全校验 - 已完成
- ✅ **Phase 3**：多维度高级筛选 (角色/职位、价格范围) - 已完成
- ✅ **Phase 4**：购物车模板清单管理 (localStorage 持久化) - 已完成

## 核心文件速查

### 前端源代码
| 文件 | 说明 |
|------|------|
| `packages/frontend/src/main.ts` | Vue 应用入口，Element Plus 和 Dark Mode 配置 |
| `packages/frontend/src/App.vue` | 根组件，全局样式定义 |
| `packages/frontend/src/views/HomeView.vue` | 主页面，包含所有 UI 组件和交互逻辑 |
| `packages/frontend/src/stores/lcu.ts` | Pinia 状态管理 store，包含所有业务逻辑 |
| `packages/frontend/src/api/index.ts` | API 接口定义和类型 |
| `packages/frontend/src/components/ChampionCard.vue` | 英雄卡片组件 |

### 后端源代码
| 文件 | 说明 |
|------|------|
| `packages/backend/src/index.ts` | Express 应用主入口 |
| `packages/backend/src/routes/lcu.ts` | API 路由定义 (/api/status, /api/champions, /api/purchase) |
| `packages/backend/src/lcu/api.ts` | LCU API 接口封装 |
| `packages/backend/src/lcu/client.ts` | LCU 客户端连接管理 |
| `packages/backend/src/lcu/lockfile.ts` | LCU Lockfile 处理 |

## 技术栈概览

**前端**：Vue 3 + TypeScript + Pinia + Element Plus + Vite
**后端**：Node.js + Express + TypeScript

## 关键实现细节

### Phase 2: 余额防爆破校验
**位置**：`packages/frontend/src/stores/lcu.ts` > `purchaseSelected()` 函数

关键代码：
```typescript
// 计算总成本
const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
const currentWallet = currency === 'RP' ? (wallet.value?.rp ?? 0) : (wallet.value?.ip ?? 0)

// 余额检查
if (totalCost > currentWallet) {
  throw new Error(`余额不足！需要 ${totalCost}，缺少 ${shortage}...`)
}
```

### Phase 3: 多维度筛选
**位置**：`packages/frontend/src/stores/lcu.ts` > `filteredChampions` 计算属性

支持的筛选维度：
1. **拥有状态**：`filterOwned` (all/owned/unowned)
2. **货币类型**：`filterCurrency` (all/IP/RP)
3. **搜索关键词**：`searchQuery` (英雄名称)
4. **角色标签**：`selectedTags` (战士、刺客、法师等)
5. **价格范围**：`priceRanges` (min/max)

### Phase 4: 清单模板管理
**位置**：`packages/frontend/src/stores/lcu.ts` > 模板相关方法

核心方法：
- `loadTemplates()`：从 localStorage 读取
- `saveTemplate(name, championIds)`：保存新模板
- `applyTemplate(templateName)`：应用模板
- `deleteTemplate(name)`：删除模板

**存储位置**：浏览器 localStorage，键为 `champion-templates`

## UI 使用 Element Plus 组件

### 已使用的组件
- `ElDrawer`：清单管理侧边栏
- `ElInput`：输入框（模板名称）
- `ElMessage`：消息提示
- `ElMessageBox`：确认对话框（替代原生 confirm()）

### 导入方式
在 `HomeView.vue` 中：
```typescript
import { ElMessage, ElMessageBox, ElDrawer } from 'element-plus'
```

## 添加新功能的指南

### 添加新的筛选维度
1. 在 `lcu.ts` state 中添加新的 ref
2. 在 `filteredChampions` 计算属性中添加过滤逻辑
3. 在 `HomeView.vue` 中添加 UI 控件

### 添加新的 API 端点
1. 在 `backend/src/routes/lcu.ts` 中定义路由
2. 在 `LcuApi` 类中实现具体逻辑
3. 在 `frontend/src/api/index.ts` 中定义调用方法

### 修改 UI 样式
所有样式均使用 scoped CSS，方便维护。
颜色系统定义见 `PROJECT.md` 的样式主题部分。

## 常见问题处理

### 类型错误：Cannot find name 'BluetoothLEScanFilter'
这是 TypeScript 依赖项的兼容性问题，不影响开发。
可以在开发模式下运行 `npm run dev`，vite 会正确处理。

### localStorage 模板加载失败
在 `onMounted()` 钩子中调用 `store.loadTemplates()`。
确保在 `checkStatus()` 和 `loadChampions()` 之后加载。

### 英雄头像加载失败
使用 CDN 备选方案：
- 首选：Community Dragon
- 备选：DdRagon (见 `ChampionCard.vue` 的 `onImgError` 函数)

## 开发工作流

### 启动开发环境
```bash
# 同时启动前后端
cd packages/frontend && npm run dev  # 终端1
cd packages/backend && npm run dev  # 终端2

# 前端默认：http://localhost:5173
# 后端默认：http://localhost:3000
```

### 构建生产版本
```bash
npm run build  # 在项目根目录
```

### 代码检查和格式化
项目使用 TypeScript，运行 `npm run build` 可检查类型。

## 性能优化建议

1. **虚拟滚动**：英雄列表多时，考虑使用虚拟滚动组件
2. **请求合并**：多个 API 调用可使用 `Promise.all()` 并行
3. **缓存策略**：可在 store 中添加英雄列表缓存
4. **图片优化**：使用 WebP 格式或图片压缩服务

## 安全性考虑

1. **前端余额校验**：用户体验，不作为安全保证
2. **后端校验**：必须在后端也实现余额校验
3. **CSRF 保护**：后端应添加 CSRF token
4. **输入验证**：API 端点应验证所有输入

## 下一个 Session 快速启动

1. 阅读本文件了解项目状态和核心实现
2. 查看 `PROJECT.md` 了解详细架构
3. 根据需要修改相应文件：
   - 改逻辑 → `packages/frontend/src/stores/lcu.ts`
   - 改 UI → `packages/frontend/src/views/HomeView.vue`
   - 改组件 → `packages/frontend/src/components/`
   - 改 API → `packages/backend/src/routes/lcu.ts`
4. 运行 `npm run build` 检查类型错误
5. 在对应目录运行 `npm run dev` 测试

## 联系信息

项目维护者：Lei
上次更新时间：2026-03-30