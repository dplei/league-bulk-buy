import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'
import type { UpdateStatus } from './index.d'

// Custom APIs for renderer — 命名空间化的 bulk-buy IPC
const api = {
  // -- bulk-buy 功能 --
  getStatus: () => ipcRenderer.invoke('bulk-buy:get-status'),
  getChampions: () => ipcRenderer.invoke('bulk-buy:get-champions'),
  purchase: (items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>) =>
    ipcRenderer.invoke('bulk-buy:purchase', items),

  // -- 自动更新 --
  getAppVersion: () => ipcRenderer.invoke('updater:get-version'),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => {
    const listener = (_: unknown, status: UpdateStatus) => cb(status)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  },

  // -- 窗口控制（与 poro-auth 完全一致） --
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
