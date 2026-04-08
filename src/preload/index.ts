import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 类型
interface ElectronAPI {
  getStatus: () => Promise<any>
  getChampions: () => Promise<any>
  purchase: (payload: any) => Promise<any>
}

// 暴露 API 到全局作用域
contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: async () => {
    return ipcRenderer.invoke('lcu:status')
  },

  getChampions: async () => {
    return ipcRenderer.invoke('lcu:champions')
  },

  purchase: async (payload) => {
    return ipcRenderer.invoke('lcu:purchase', payload)
  },
} as ElectronAPI)

// 类型声明，供渲染进程使用
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
