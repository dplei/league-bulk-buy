# League Bulk Buy - Electron 开发指南

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.ts            # 应用入口 + IPC handlers
│   └── lcu/                # LCU 游戏 API
│       ├── client.ts       # LCU HTTPS 连接
│       ├── api.ts          # LCU API 封装
│       └── lockfile.ts     # 游戏进程检测
├── preload/
│   └── index.ts            # IPC 桥接脚本
└── renderer/               # Electron 渲染进程（Vue 应用）
    ├── index.html
    └── src/
        ├── main.ts         # Vue 入口
        ├── App.vue         # 根组件
        ├── views/          # 页面组件
        │   └── HomeView.vue
        ├── stores/         # Pinia 状态管理
        │   └── lcu.ts
        ├── components/     # Vue 组件
        ├── api/            # IPC API 调用
        │   └── index.ts
        └── ...
```

## 开发环境启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm run dev
```

这会同时启动：
- **Electron 主进程**（自动重启）
- **Vite 开发服务器**（localhost:5173，HMR 热更新）
- **开发者工具**（自动打开，显示控制台日志）

### 3. 常见开发任务

#### 修改主进程代码
- 编辑 `src/main/` 中的文件
- 主进程会自动重启（electron-vite 监听）

#### 修改渲染进程代码
- 编辑 `src/renderer/src/` 中的文件
- Vite HMR 会自动更新（无需刷新）

#### 修改 IPC 通信
- 在 `src/main/index.ts` 中修改 handlers
- 在 `src/preload/index.ts` 中修改桥接 API
- 在 `src/renderer/src/api/index.ts` 中修改调用方式
- 重启主进程（Ctrl+R 或保存 main 文件）

## 运行前提

在启动应用前，**英雄联盟游戏客户端必须已启动**，否则 LCU 初始化会失败。

### 启动步骤
1. 启动英雄联盟游戏客户端（登陆到大厅）
2. 运行 `pnpm run dev`
3. Electron 窗口将打开，自动连接到 LCU

## 生产构建

### 1. 构建项目

```bash
pnpm run build
```

生成的文件：
- `out/main/` - 编译后的主进程代码
- `out/preload/` - 编译后的预加载脚本
- `out/renderer/` - 打包后的 Vue 应用（dist 目录）

### 2. 打包成 .exe

```bash
pnpm run dist
```

生成的文件在 `dist/` 目录：
- `League Bulk Buy Setup 1.0.0.exe` - 安装程序
- `League Bulk Buy 1.0.0.exe` - 单文件便携版

### 3. 本地测试打包

```bash
pnpm run pack
```

在 `dist/` 目录生成未签名的安装包（用于测试，不需要代码签名）

## IPC 通信流程

### 前端调用流程

```typescript
// src/renderer/src/api/index.ts
export const api = {
  getStatus(): Promise<StatusResponse> {
    return window.electronAPI.getStatus()  // 调用 IPC
  }
}
```

### 预加载脚本

```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: async () => {
    return ipcRenderer.invoke('lcu:status')  // 转发到主进程
  }
})
```

### 主进程处理

```typescript
// src/main/index.ts
ipcMain.handle('lcu:status', async () => {
  const api = getLcuApi()
  return {
    connected: true,
    summoner: await api.getSummoner(),
    wallet: await api.getWallet()
  }
})
```

## 调试技巧

### 查看主进程日志
在开发者工具的**主进程**标签页查看 `console.log` 输出

### 查看渲染进程日志
在开发者工具的**控制台**标签页查看

### 检查 IPC 通信
```typescript
// 在预加载脚本中添加日志
contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: async () => {
    console.log('IPC: getStatus called')
    return ipcRenderer.invoke('lcu:status')
  }
})
```

### 热重载不生效
如果 HMR 不工作，尝试：
1. 检查 Vite 开发服务器是否运行在 localhost:5173
2. 检查防火墙设置（允许 5173 端口）
3. 手动刷新窗口（Ctrl+R）

## 常见问题

### Q: LCU 初始化失败
**A:** 
- 确保英雄联盟客户端已启动并登陆
- 检查游戏客户端版本是否最新
- 查看主进程控制台的错误信息

### Q: IPC 调用超时
**A:**
- 检查主进程是否正确注册了 handler
- 确保 LCU API 调用没有卡住（检查网络连接）
- 增加超时时间或添加重试逻辑

### Q: 打包后无法运行
**A:**
- 检查 `resources/icon.ico` 是否存在
- 确保所有依赖都在 `node_modules` 中
- 使用 `pnpm run pack` 先在本地测试

### Q: 如何清除应用数据
应用数据存储在 Electron 的 userData 目录：
- Windows: `%APPDATA%/League Bulk Buy/`
- 删除其中的 `Local Storage` 或整个目录可清除所有缓存

## 性能优化

### 减小包体积
- 移除未使用的 Vue 组件
- 使用 tree-shaking 移除未使用的代码
- 考虑使用 dynamic import 延迟加载

### 改进启动速度
- 使用 `native-addon` 加快 LCU 初始化
- 缓存英雄列表和玩家信息
- 预加载关键组件

## 相关链接

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-vite 文档](https://electron-vite.org/)
- [electron-builder 文档](https://www.electron.build/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 状态管理](https://pinia.vuejs.org/)
