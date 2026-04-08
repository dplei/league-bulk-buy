# ⚡ 快速启动指南

## 一键启动（开发环境）

```bash
# 1. 安装依赖
pnpm install

# 2. 启动 Electron 应用
pnpm run dev
```

## 前置条件

**英雄联盟游戏客户端必须已启动并登陆到大厅**

如果 LCU 初始化失败，检查：
1. 游戏客户端是否已启动？
2. 是否已登陆大厅（不是在选择角色界面）？
3. 游戏是否在标准位置安装？

## 应用启动后

1. Electron 窗口自动打开
2. 开发者工具自动打开（底部）
3. Vue 应用加载完成
4. LCU 状态自动检测并显示

## 常见快捷键

| 快捷键 | 功能 |
|--------|------|
| F12 | 切换开发者工具 |
| Ctrl+R | 重新加载页面 |
| Ctrl+Shift+I | 打开开发者工具 |
| Ctrl+Q | 关闭应用 |

## 代码修改后

### 修改前端代码
- 自动热更新（Vite HMR）
- 界面实时刷新，无需重启

### 修改主进程代码
- 主进程自动重启
- 约 1-2 秒后生效

### 修改 IPC 相关代码
- 需要重新启动整个应用
- 按 Ctrl+Q 关闭，重新运行 `pnpm run dev`

## 生产构建

```bash
# 构建
pnpm run build

# 打包成 .exe
pnpm run dist
```

输出文件在 `dist/` 目录

## 故障排除

### 问题：LCU 初始化失败
```
错误：找不到英雄联盟客户端进程连接信息
```
**解决**：启动英雄联盟客户端，登陆到大厅后重试

### 问题：IPC 调用超时
```
错误：IPC handler 响应超时
```
**检查**：
- 主进程控制台是否有错误？
- LCU 连接是否正常？
- 网络是否连接到游戏服务器？

### 问题：HMR 热更新不工作
**解决**：
```bash
# 手动刷新
Ctrl+R

# 或重启应用
Ctrl+Q
pnpm run dev
```

### 问题：构建失败
**检查**：
1. 是否有 TypeScript 错误？
2. 依赖是否完整？
3. 是否修改了不支持的文件？

## 调试技巧

### 查看主进程日志
在 Electron 主窗口的开发者工具中，选择**主进程**标签

```javascript
// 在控制台输入，查看 LCU 连接状态
console.log('检查主进程日志看 LCU 初始化结果')
```

### 测试 IPC 通信
在渲染进程控制台输入：

```javascript
// 测试获取游戏状态
await window.electronAPI.getStatus()

// 应该返回
// {connected: true, summoner: {...}, wallet: {...}}
```

### 添加日志调试
```typescript
// src/main/index.ts
console.log('LCU API:', lcuApi)  // 检查 API 是否初始化

// src/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: async () => {
    console.log('IPC: getStatus 被调用')
    return ipcRenderer.invoke('lcu:status')
  }
})
```

## 项目信息

- **前端框架**：Vue 3 + TypeScript
- **状态管理**：Pinia
- **UI 组件库**：Element Plus
- **桌面框架**：Electron
- **构建工具**：electron-vite
- **打包工具**：electron-builder

## 更多信息

- 详细开发指南：`DEVELOPMENT.md`
- Electron 改造总结：`ELECTRON_MIGRATION.md`
- 项目计划：`TODO.md`
- 项目概览：`PROJECT.md`

---

**需要帮助？** 查看 DEVELOPMENT.md 的"常见问题"部分
