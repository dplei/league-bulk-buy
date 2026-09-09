import { ElectronAPI } from '@electron-toolkit/preload'

export interface Champion {
  itemId: number
  name: string
  description: string
  ipPrice: number | null
  rpPrice: number | null
  saleIpPrice: number | null
  saleRpPrice: number | null
  onSale: boolean
  owned: boolean
  purchasable: boolean
  tags: string[]
  positions: Array<'top' | 'jungle' | 'middle' | 'bottom' | 'support'>
  [key: string]: any
}

export interface Summoner {
  displayName: string
  summonerId: number
  summonerLevel: number
  profileIconId: number
}

export interface Wallet {
  ip: number
  rp: number
}

export interface StatusResponse {
  connected: boolean
  summoner?: Summoner
  wallet?: Wallet
  error?: string
}

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'not-available'; version: string }
  | { state: 'available'; version: string; notes: Array<{ version: string; note: string }> }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }
  | { state: 'dev' }

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getStatus: () => Promise<StatusResponse>
      getChampions: () => Promise<Champion[]>
      purchase: (
        items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>
      ) => Promise<{ success: boolean; purchased: any }>
      getAppVersion: () => Promise<string>
      checkUpdate: () => Promise<{ ok: boolean; message?: string }>
      downloadUpdate: () => Promise<{ ok: boolean; message?: string }>
      installUpdate: () => Promise<void>
      onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void
      minimizeWindow: () => void
      closeWindow: () => void
    }
  }
}
