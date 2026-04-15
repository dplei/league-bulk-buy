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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getStatus: () => Promise<StatusResponse>
      getChampions: () => Promise<Champion[]>
      purchase: (
        items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>
      ) => Promise<{ success: boolean; purchased: any }>
      minimizeWindow: () => void
      closeWindow: () => void
    }
  }
}
