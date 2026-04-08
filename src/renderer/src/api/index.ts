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
  summoner: Summoner
  wallet: Wallet
}

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
  // Add an index signature to allow the raw LCU fields
  [key: string]: any
}

export interface PurchasePayload {
  items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>
}

// IPC API 调用（通过 Electron 预加载脚本）
export const api = {
  async getStatus(): Promise<StatusResponse> {
    return window.electronAPI.getStatus()
  },

  async getChampions(): Promise<Champion[]> {
    return window.electronAPI.getChampions()
  },

  async purchase(payload: PurchasePayload): Promise<void> {
    return window.electronAPI.purchase(payload)
  },
}
