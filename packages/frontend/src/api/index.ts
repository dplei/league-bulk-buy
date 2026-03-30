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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error ?? `请求失败: ${res.status}`)
  }
  return data as T
}

export const api = {
  getStatus(): Promise<StatusResponse> {
    return request('/api/status')
  },

  getChampions(): Promise<Champion[]> {
    return request('/api/champions')
  },

  purchase(payload: PurchasePayload) {
    return request('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },
}
