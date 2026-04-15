import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'

// Custom APIs for renderer — 命名空间化的 bulk-buy IPC
const api = {
  // -- bulk-buy 功能 --
  getStatus: () => ipcRenderer.invoke('bulk-buy:get-status'),
  getChampions: () => ipcRenderer.invoke('bulk-buy:get-champions'),
  purchase: (items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>) =>
    ipcRenderer.invoke('bulk-buy:purchase', items),

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
