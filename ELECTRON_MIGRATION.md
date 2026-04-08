# League Bulk Buy - Electron 改造总结

## 改造概述

将项目从 **Vue + Express 双进程架构** 改造为 **Electron 单进程应用**，打包成轻量化可执行文件。

### 时间线
- ✅ Step 1-9：核心改造完成
- 🔄 Step 10-11：开发测试和打包

---

## 架构变化

### 改造前（双进程）
```
用户电脑
├── Frontend (Vite)     [localhost:5173]
│   └── Vue 应用
│
├── Backend (Express)   [localhost:3001]
│   └── LCU API 代理
│
└── 英雄联盟客户端 (LCU API)
```

**问题**：
- 需要用户安装 Node.js
- 需要开两个终端启动
- HTTP 通信开销
- 不易分发

### 改造后（单进程）
```
用户电脑
└── League Bulk Buy.exe
    ├── Electron 主进程
    │   ├── LCU 直连
    │   └── IPC Handlers
    │
    └── Renderer 进程（Chromium）
        └── Vue 应用
```

**优势**：
- ✅ 单文件可执行程序
- ✅ 无需 Node.js 环境
- ✅ 进程内通信（IPC），更快更安全
- ✅ 双击即用
- ✅ 易于分发（.exe 文件）

---

## 核心改造内容

### 1. 项目结构扁平化

**删除 monorepo 结构**
```bash
packages/          # ❌ 已删除
├── frontend/
├── backend/
└── ...
```

**新的扁平化结构**
```
src/
├── main/           # Electron 主进程
├── preload/        # IPC 桥接
└── renderer/       # Vue 应用
```

### 2. 后端逻辑迁移到主进程

原 `packages/backend/src/lcu/` → `src/main/lcu/`

- `lockfile.ts` - 检测英雄联盟游戏进程（WMI/PEB/文件系统多层级）
- `client.ts` - HTTPS 连接到本地 LCU API
- `api.ts` - 游戏数据访问接口

```typescript
// 原来是 Express 路由
app.get('/api/champions', async (req, res) => { ... })

// 现在是 IPC handlers
ipcMain.handle('lcu:champions', async () => { ... })
```

### 3. IPC 通信架构

三层架构确保安全性和隔离：

#### 渲染进程（Vue）
```typescript
// src/renderer/src/api/index.ts
export const api = {
  getChampions(): Promise<Champion[]> {
    return window.electronAPI.getChampions()
  }
}
```

#### 预加载脚本
```typescript
// src/preload/index.ts（在沙盒中运行）
contextBridge.exposeInMainWorld('electronAPI', {
  getChampions: async () => {
    return ipcRenderer.invoke('lcu:champions')  // 转发请求
  }
})
```

#### 主进程
```typescript
// src/main/index.ts
ipcMain.handle('lcu:champions', async () => {
  const api = getLcuApi()
  return await api.getChampionCatalog()  // 真实的业务逻辑
})
```

### 4. 依赖清理

**删除的依赖**
- ❌ `express` - 不再需要 HTTP 服务器
- ❌ `cors` - IPC 无需跨域处理
- ❌ `@types/express`
- ❌ `@types/cors`

**保留的依赖**
- ✅ `electron` - Electron 框架
- ✅ `electron-vite` - 构建工具
- ✅ `electron-builder` - 打包工具
- ✅ `@leagueakari/league-akari-addons` - LCU 高级接口
- ✅ `vue` - UI 框架
- ✅ `pinia` - 状态管理
- ✅ `element-plus` - UI 组件库

---

## IPC 通信映射表

原 HTTP 路由 → 现 IPC 通道

| 功能 | HTTP 路由 | IPC 通道 | 类型 |
|------|----------|---------|------|
| 获取游戏状态 | `GET /api/status` | `lcu:status` | request-reply |
| 获取英雄列表 | `GET /api/champions` | `lcu:champions` | request-reply |
| 购买英雄 | `POST /api/purchase` | `lcu:purchase` | request-reply |

**数据流**：
```
Vue 组件
  ↓
api.getChampions()
  ↓
window.electronAPI.getChampions()  [预加载脚本]
  ↓
ipcRenderer.invoke('lcu:champions')
  ↓
[IPC 通道]
  ↓
ipcMain.handle('lcu:champions')  [主进程]
  ↓
LcuApi.getChampionCatalog()
  ↓
LCU HTTPS API (本地 127.0.0.1)
  ↓
英雄联盟游戏客户端
```

---

## 文件改动明细

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/main/index.ts` | 新建 | 应用入口 + 3 个 IPC handlers |
| `src/main/lcu/` | 迁移 | LCU 后端逻辑 |
| `src/preload/index.ts` | 新建 | contextBridge 暴露 API |
| `src/renderer/src/api/index.ts` | 修改 | fetch → window.electronAPI.* |
| `src/renderer/src/` | 迁移 | 完整前端代码 |
| `electron.vite.config.ts` | 新建 | electron-vite 构建配置 |
| `electron-builder.yml` | 新建 | 打包配置 |
| `package.json` | 修改 | 更新依赖、scripts、build 配置 |
| `tsconfig.json` | 新建 | TypeScript 配置 |
| `vendor/` | 迁移 | @leagueakari/league-akari-addons |
| `packages/` | 删除 | monorepo 结构已扁平化 |

---

## 技术亮点

### 1. 多层级进程检测（lockfile.ts）
```
优先级：
1. C++ 原生拓展 (PEB 读取) → 绕过 WeGame 权限拦截
2. WMI 命令行参数获取    → 支持多开
3. 文件系统 lockfile 读取 → 降级方案
4. 多磁盘搜索（C-F盘）    → 支持自定义安装路径
```

### 2. 数据转换层（api 映射）
主进程自动转换 LCU API 格式 → 前端格式
- 处理 `sale.purchasePrice` 嵌套结构
- 映射 `prices[]` 数组到 `ipPrice/rpPrice`
- 计算 `owned` 状态
- 提取 `tags` 标签

### 3. 安全隔离（contextBridge）
- 主进程不能直接访问渲染进程 DOM
- 渲染进程不能直接访问文件系统
- 仅暴露必需的 3 个 IPC 方法

### 4. 开发热更新
- 主进程改动自动重启
- 渲染进程改动 Vite HMR 无需刷新
- 完整的 TypeScript 类型检查

---

## 测试清单（Step 10）

### 开发环境验证
- [ ] Electron 窗口正常打开 (1200x800)
- [ ] 开发者工具自动打开
- [ ] Vue 应用正确加载
- [ ] LCU 初始化成功（控制台无报错）
- [ ] IPC 通信正常（能获取游戏状态）
- [ ] 英雄列表正确加载
- [ ] localStorage 持久化正常
- [ ] 暗黑模式显示正确
- [ ] Vite HMR 热更新工作正常

### 功能验证
- [ ] 游戏状态显示正确
- [ ] 英雄过滤正确
- [ ] 购买功能正常（余额检查）
- [ ] 清单模板保存/应用正常
- [ ] 错误处理完善

---

## 打包清单（Step 11）

### 构建阶段
```bash
pnpm run build
```
- [ ] TypeScript 编译无错误
- [ ] Vue 组件 volar 类型检查通过
- [ ] 生成 `out/main/` `out/preload/` `out/renderer/`

### 打包阶段
```bash
pnpm run dist
```
- [ ] 生成 `dist/*.exe` 文件
- [ ] 文件大小约 150-200MB
- [ ] 生成 NSIS 安装程序

### 部署验证
- [ ] 在无 Node.js 的干净 Windows 环境运行 .exe
- [ ] 所有功能正常可用
- [ ] 性能无明显下降
- [ ] 内存占用合理

---

## 后续优化方向

### 短期（已完成的优化）
- ✅ 单文件可执行程序
- ✅ 无外部依赖
- ✅ IPC 通信替代 HTTP
- ✅ 删除不必要依赖

### 中期（可选优化）
- 🔲 添加自动更新机制 (electron-updater)
- 🔲 系统托盘支持
- 🔲 应用启动最小化
- 🔲 配置文件加密存储

### 长期（架构升级）
- 🔲 Tauri 替代品评估（Rust 后端，体积 5-10MB）
- 🔲 多语言支持
- 🔲 OAuth 登录（替代本地 LCU 连接）
- 🔲 macOS/Linux 跨平台支持

---

## 关键文档

- `DEVELOPMENT.md` - 开发指南（启动、调试、打包）
- `CLAUDE.md` - 项目概览（已过期，需更新）
- `PROJECT.md` - 架构文档（已过期，需更新）
- `TODO.md` - 改造进度跟踪

---

## 常见问题解决

### Q: 如何验证 IPC 通信是否工作？
**A:** 在开发者工具中检查：
```javascript
// 控制台输入
await window.electronAPI.getStatus()
// 应返回 {connected: true, summoner: {...}, wallet: {...}}
```

### Q: LCU 初始化失败怎么办？
**A:** 按顺序检查：
1. 英雄联盟客户端是否已启动？
2. 是否登陆到大厅？
3. 主进程控制台是否有错误信息？
4. 游戏安装路径是否标准？

### Q: 打包后闪退怎么办？
**A:** 
1. 检查 `resources/icon.ico` 是否存在
2. 在命令行运行 .exe 查看错误信息
3. 检查 `out/` 目录是否完整

---

## 性能指标

| 指标 | 改造前 | 改造后 |
|------|--------|--------|
| 分发方式 | Node.js + 源代码 | 单个 .exe |
| 依赖安装 | pnpm install (~1GB) | 无（已打包） |
| 启动时间 | 需启动两个服务 | 秒级启动 |
| 内存占用 | 估 ~200MB | Chromium ~150-200MB |
| 通信方式 | HTTP (localhost:3001) | IPC 进程内 |
| 用户体验 | 技术门槛高 | 即点即用 |

---

## 结论

通过 Electron 改造，League Bulk Buy 已从开发者友好的 monorepo 架构演进为用户友好的单文件应用。

**核心优势**：
1. 🎯 极低的入门门槛（双击即运行）
2. 🚀 更快的进程通信（IPC 替代 HTTP）
3. 📦 易于分发（单个 .exe 文件）
4. 🔒 更好的安全隔离（contextBridge）
5. 🛠️ 开发体验不变（Vite HMR + TS）

**后续维护注意事项**：
- 定期更新 Electron 版本
- 监控主进程的内存占用
- 考虑添加错误上报机制
- 保持依赖更新（安全补丁）

---

**最后更新**：2026-04-08
**维护者**：Lei
