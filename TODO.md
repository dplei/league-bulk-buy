# Electron 改造计划 - League Bulk Buy

## 项目目标

将 Vue + Express 双进程架构改造为 **Electron 单进程应用**，打包成轻量化的 .exe 可执行文件。

---

## 现状分析

### 当前架构

```
Frontend (Vite/Vue)  ←→  HTTP (:3001)  ←→  Backend (Express)
  - 需要两个终端运行
  - 前后端通过 HTTP 通信
  - 用户需要 Node.js + pnpm 环境
```

### 目标架构

```
Renderer (Vue)  ←→  IPC  ←→  Main Process (LCU 逻辑)
  - 单进程，无 HTTP
  - 打包为单个 .exe
  - 双击即可运行，无需依赖
```

---

## 改造方案：electron-vite 重构

### 为什么选择 electron-vite？

- 专为 Electron + Vite 设计的官方构建工具
- 天然支持 Vue 3 + TypeScript
- 零配置开箱即用
- 与现有 Vite 工作流无缝衔接

---

## 新目录结构

```
league-bulk-buy/
├── src/
│   ├── main/                    # Electron 主进程 (原 backend)
│   │   ├── index.ts             # Electron 应用入口，创建窗口
│   │   ├── preload.ts           # 预加载脚本 (会移到 preload/)
│   │   └── lcu/                 # LCU 逻辑（直接迁移 backend/src/lcu/）
│   │       ├── api.ts           # LCU API 封装
│   │       ├── client.ts        # LCU 客户端连接
│   │       └── lockfile.ts      # Lockfile 处理
│   ├── preload/
│   │   └── index.ts             # contextBridge 暴露 IPC API
│   └── renderer/                # Electron 渲染进程 (原 frontend)
│       ├── src/
│       │   ├── main.ts          # Vue 应用入口
│       │   ├── App.vue
│       │   ├── views/
│       │   │   └── HomeView.vue
│       │   ├── stores/
│       │   │   └── lcu.ts       # 改用 IPC 调用
│       │   ├── components/
│       │   │   └── ChampionCard.vue
│       │   └── api/
│       │       └── index.ts     # 改为 IPC 调用而非 HTTP
│       └── index.html
├── resources/                   # 图标等资源
│   └── icon.ico
├── dist/                        # 打包输出目录 (构建后生成)
├── package.json                 # 项目根 package.json
├── tsconfig.json
├── electron.vite.config.ts      # electron-vite 配置
├── electron-builder.yml         # electron-builder 打包配置
└── .github/
    └── workflows/               # CI/CD (可选)
```

---

## IPC 通信设计

### 原理

主进程（backend 逻辑）和渲染进程（Vue UI）通过 IPC（Inter-Process Communication）通信，替代 HTTP。

### IPC 通道映射

| 功能         | 原路由               | IPC 通道        | 数据流向                |
| ------------ | -------------------- | --------------- | ----------------------- |
| 获取游戏状态 | `GET /api/status`    | `lcu:status`    | invoke（request-reply） |
| 获取英雄列表 | `GET /api/champions` | `lcu:champions` | invoke                  |
| 购买英雄     | `POST /api/purchase` | `lcu:purchase`  | invoke + 参数           |

### 实现代码框架

#### 1. `src/preload/index.ts` - 上下文桥接

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: async () => {
    return ipcRenderer.invoke('lcu:status');
  },

  getChampions: async () => {
    return ipcRenderer.invoke('lcu:champions');
  },

  purchase: async (payload) => {
    return ipcRenderer.invoke('lcu:purchase', payload);
  }
});
```

#### 2. `src/main/index.ts` - 主进程（IPC handlers）

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import { LcuClient } from './lcu/client';
import { LcuApi } from './lcu/api';

const lcuClient = new LcuClient();
const lcuApi = new LcuApi(lcuClient);

// 注册 IPC handlers（对应原 Express 路由）
ipcMain.handle('lcu:status', async () => {
  // 原 GET /api/status 逻辑
  const summoner = await lcuApi.summoner();
  const wallet = await lcuApi.wallet();
  return {
    connected: true,
    summoner,
    wallet
  };
});

ipcMain.handle('lcu:champions', async () => {
  // 原 GET /api/champions 逻辑
  return await lcuApi.champions();
});

ipcMain.handle('lcu:purchase', async (event, payload) => {
  // 原 POST /api/purchase 逻辑
  return await lcuApi.purchaseChampions(payload.items);
});

// 创建窗口
app.on('ready', () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  });

  const isDev = process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(isDev);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
});
```

#### 3. `src/renderer/src/api/index.ts` - 类型定义和 API 调用

```typescript
// 类型声明
declare global {
  interface Window {
    electronAPI: {
      getStatus: () => Promise<StatusResponse>;
      getChampions: () => Promise<Champion[]>;
      purchase: (payload: PurchasePayload) => Promise<void>;
    };
  }
}

// API 封装（改用 IPC）
export const api = {
  getStatus(): Promise<StatusResponse> {
    return window.electronAPI.getStatus();
  },

  getChampions(): Promise<Champion[]> {
    return window.electronAPI.getChampions();
  },

  purchase(payload: PurchasePayload) {
    return window.electronAPI.purchase(payload);
  }
};
```

#### 4. `src/renderer/src/stores/lcu.ts` - 状态管理（无需改动 API 调用部分）

保持原逻辑不变，调用 `api.getStatus()` 等方法会自动走 IPC 而非 HTTP。

---

## 打包配置

### `electron-builder.yml` - 构建配置

```yaml
appId: com.lei.league-bulk-buy
productName: League Bulk Buy
directories:
  buildResources: resources

win:
  target:
    - nsis # 生成安装向导
    - portable # 或生成单文件 .exe（选一个）
  certificateFile: null
  icon: resources/icon.ico

nsis:
  oneClick: true
  perMachine: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: resources/icon.ico
  installerHeaderIcon: resources/icon.ico

# 打包优化
asarUnpack:
  - node_modules/(@leagueakari)/**/* # LCU 插件需要解压

files:
  - dist/**/*
  - node_modules/**/*
  - package.json
```

### `electron.vite.config.ts` - Vite 构建配置

```typescript
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
});
```

---

## 改造执行步骤

### 初期准备 (0-2天)

- [x] **Step 1**: 创建 electron-vite 项目骨架 ✅ (已完成)

  **生成的文件：**
  - `package.json` - 更新了 electron 相关依赖和 scripts
  - `electron.vite.config.ts` - electron-vite 构建配置
  - `tsconfig.json` + `tsconfig.node.json` - TypeScript 配置
  - `src/main/index.ts` - Electron 应用入口（基础版本）
  - `src/preload/index.ts` - 预加载脚本（IPC 桥接）
  - `src/renderer/index.html` - 渲染进程 HTML
  - `src/renderer/src/main.ts` - Vue 应用入口
  - `src/renderer/src/App.vue` - 根组件（占位符）
  - `src/renderer/src/api/index.ts` - API 接口定义
  - `src/renderer/src/stores/lcu.ts` - 状态管理（占位符）
  - `src/renderer/src/env.d.ts` - 类型声明
  - `electron-builder.yml` - 打包配置
  - `resources/README.md` - 图标资源说明
  - `.gitignore` - Git 忽略规则

- [x] **Step 2**: 删除 `packages/` 目录（已无需 monorepo） ✅ (已完成)

  **执行步骤：**
  1. 先复制 `packages/frontend/src/*` → `src/renderer/src/`（确保不丢失任何代码）
  2. 删除 `packages/` 目录（整个 monorepo 结构）
  3. 项目结构扁平化完成，现在是单进程 Electron 应用

- [x] **Step 3**: 将后端逻辑迁移到主进程 ✅ (已完成)

  **迁移的文件：**
  - `src/main/lcu/lockfile.ts` - Lockfile 处理（检测游戏进程）
  - `src/main/lcu/client.ts` - LCU 客户端连接（HTTPS 通信）
  - `src/main/lcu/api.ts` - LCU API 封装（游戏数据访问）

  **更新的文件：**
  - `src/main/index.ts` - 添加 LCU 初始化逻辑
  - `package.json` - 更新 vendor 路径（`file:vendor/...`）
  - 复制 `vendor/` 目录到项目根目录（包含 @leagueakari/league-akari-addons）

- [x] **Step 4**: 将前端迁移到渲染进程 ✅ (已完成)

  **执行步骤：**
  - 复制 `packages/frontend/src/*` → `src/renderer/src/`（包含所有 Vue 组件、stores、views 等）
  - 完整的业务逻辑（HomeView.vue、lcu.ts store 等）已迁移

### 核心改造 (2-4天)

- [x] **Step 5**: 编写 `src/preload/index.ts` ✅ (已完成)
  - ✅ 暴露 `getStatus()`, `getChampions()`, `purchase()`
  - ✅ 使用 contextBridge 确保安全的 IPC 调用

- [x] **Step 6**: 编写 `src/main/index.ts` ✅ (已完成)
  - ✅ 注册 3 个 IPC handlers（lcu:status、lcu:champions、lcu:purchase）
  - ✅ 初始化 LcuClient 和 LcuApi
  - ✅ 创建 Electron 主窗口
  - ✅ 数据格式转换（LCU API 格式 → 前端格式）

- [x] **Step 7**: 修改 `src/renderer/src/api/index.ts` ✅ (已完成)
  - ✅ 删除 HTTP 调用逻辑（fetch）
  - ✅ 改用 `window.electronAPI.*` IPC 调用
  - ✅ 保留所有类型定义（Summoner、Wallet、Champion 等）

- [x] **Step 8**: 清理依赖 ✅ (已完成)
  - ✅ 删除 `express`, `cors` 等后端依赖
  - ✅ 保留 LCU 相关依赖（`@leagueakari/league-akari-addons`）

- [x] **Step 9**: 配置打包 ✅ (已完成)
  - ✅ 编写 `electron-builder.yml`
  - ✅ 编写 `electron.vite.config.ts`
  - ⚠️ icon 文件（需自行生成 `resources/icon.ico`）

### 测试验证 (1-2天)

- [ ] **Step 10**: 开发环境测试

  ```bash
  npm install           # 或 pnpm install
  npm run dev          # 启动 Electron 开发环境
  ```

  验证清单：
  - ✓ Electron 窗口正常打开（1200x800）
  - ✓ 开发者工具自动打开
  - ✓ Vite HMR 热更新工作正常
  - ✓ LCU 客户端初始化成功（查看控制台日志）
  - ✓ IPC 调用正常（getStatus、getChampions 等）
  - ✓ Vue 组件正确渲染
  - ✓ localStorage 持久化工作（清单模板保存）
  - ✓ 暗黑模式正常显示
  
  **常见问题排查：**
  - 如果 LCU 初始化失败：确保英雄联盟游戏客户端已启动
  - 如果 IPC 调用失败：检查主进程是否正确注册 handlers
  - 如果界面无法加载：检查 Vite 开发服务器是否在 localhost:5173

- [ ] **Step 11**: 生产构建和打包

  ```bash
  npm run build         # 构建 TypeScript + 打包资源
  npm run dist          # 生成 .exe 安装包
  ```

  输出文件位置：`dist/`
  
  验证清单：
  - ✓ 构建完成无错误
  - ✓ `out/` 目录包含 main/preload/renderer 的编译结果
  - ✓ `dist/` 目录生成 `*.exe` 文件
  - ✓ exe 文件大小约 150-200MB
  - ✓ 在无 Node.js 的干净 Windows 环境中运行 exe
  - ✓ 所有功能完整可用

- [ ] **Step 12**: 优化和验证
  - 移除未使用的依赖
  - 测试启动时间和内存占用
  - 调整 `asar` 配置以改进性能
  - 添加应用图标 `resources/icon.ico`

---

## 关键文件改动一览

| 文件                                  | 改动类型 | 改动量  | 备注                             |
| ------------------------------------- | -------- | ------- | -------------------------------- |
| `src/main/index.ts`                   | 新建     | ~100 行 | Electron 应用入口 + IPC handlers |
| `src/preload/index.ts`                | 新建     | ~20 行  | contextBridge 暴露 API           |
| `src/renderer/src/api/index.ts`       | 修改     | ~20 行  | fetch → IPC                      |
| `src/renderer/src/stores/lcu.ts`      | 无改动   | —       | 调用 api.\* 自动走 IPC           |
| `src/renderer/src/views/HomeView.vue` | 无改动   | —       | 组件逻辑不变                     |
| `packages/backend/src/lcu/*`          | 复制迁移 | —       | 整体移到 `src/main/lcu/`         |
| `packages/frontend/src/*`             | 复制迁移 | —       | 整体移到 `src/renderer/src/`     |
| `package.json` (root)                 | 修改     | ~15 行  | 更新依赖和 scripts               |
| `electron.vite.config.ts`             | 新建     | ~30 行  | electron-vite 构建配置           |
| `electron-builder.yml`                | 新建     | ~30 行  | electron-builder 打包配置        |

---

## 打包产物

构建完成后的输出：

```
dist/
├── League Bulk Buy Setup 1.0.0.exe         # 安装向导
├── League Bulk Buy 1.0.0.exe               # 单文件可执行程序（如配置 portable）
└── League Bulk Buy 1.0.0.exe.blockmap      # 增量更新清单
```

**文件大小预期**：

- 打包前：~150-200MB（包含 Chromium）
- 实际分发：~150MB (NSIS 会压缩)

---

## 后续优化方向

### 短期优化

- [ ] 移除不必要的 Chromium 功能（节省 50MB 空间）
- [ ] 添加自动更新机制（electron-updater）
- [ ] 实现应用日志和错误报告

### 中期优化

- [ ] 考虑 Tauri 替代品（Rust 后端，打包体积 5-10MB）
- [ ] 添加系统托盘支持
- [ ] 实现应用启动时最小化

### 长期规划

- [ ] 添加多语言支持
- [ ] 实现 OAuth 登录（替代本地 LCU 连接）
- [ ] 支持 macOS 和 Linux 跨平台构建

---

## 参考资源

- [electron-vite 官方文档](https://electron-vite.org/)
- [Electron IPC 文档](https://www.electronjs.org/docs/latest/api/ipc-main)
- [electron-builder 文档](https://www.electron.build/)
- [Vue 3 官方文档](https://vuejs.org/)

---

## 预期收益

| 指标     | 改造前                  | 改造后                |
| -------- | ----------------------- | --------------------- |
| 分发方式 | 需 Node.js 环境         | 单个 .exe（双击运行） |
| 进程数量 | 2（frontend + backend） | 1（Electron）         |
| 通信方式 | HTTP 本地连接           | IPC（进程内）         |
| 依赖安装 | 用户需装 Node.js + pnpm | 无任何依赖            |
| 启动速度 | 需启动两个 dev 服务器   | 秒级启动              |
| 用户体验 | 门槛高（非程序员困难）  | 即点即用              |

---

## 进度跟踪

**预计耗时**：4-6 天（全职开发）

- 准备阶段：1-2 天
- 改造阶段：2-3 天
- 测试优化：1-2 天

**当前阶段**：方案设计完成，待开始第一步
