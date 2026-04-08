/// <reference types="vite/client" />

interface ElectronAPI {
  getStatus: () => Promise<any>
  getChampions: () => Promise<any>
  purchase: (payload: any) => Promise<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
