import { LcuClient } from './client.js'

export interface Summoner {
  displayName: string
  puuid: string
  summonerId: number
  summonerLevel: number
  profileIconId: number
}

export interface Wallet {
  ip: number   // 蓝色精华 (Blue Essence)
  rp: number   // RP
}

export interface CatalogItem {
  itemId: number
  localizations: Record<string, { name: string; description: string }>
  prices: Array<{
    currency: string
    cost: number
    costType: string
  }>
  inventoryType: string
  subInventoryType: string
  sale?: {
    startDate: string
    endDate: string
    prices: Array<{ currency: string; cost: number }>
  }
  active: boolean
  inactiveDate?: string
  maxQuantity: number
  purchasable: boolean
}

export interface PurchaseItem {
  inventoryType: string
  itemId: number
  ipCost: number
  rpCost: number
  quantity: number
}

export interface PurchaseResult {
  items: Array<{
    data: { itemId: number }
    id: number
    inventoryType: string
    purchaseDate: string
  }>
}

export class LcuApi {
  constructor(private client: LcuClient) {}

  getSummoner(): Promise<Summoner> {
    return this.client.get('/lol-summoner/v1/current-summoner')
  }

  getWallet(): Promise<Wallet> {
    return this.client.get('/lol-store/v1/wallet')
  }

  async getChampionCatalog(): Promise<CatalogItem[]> {
    const all = await this.client.get<CatalogItem[]>(
      '/lol-store/v1/catalog?inventoryType=CHAMPION'
    )
    // 只返回可购买的
    return all.filter((item) => item.purchasable)
  }

  async getOwnedChampionIds(): Promise<number[]> {
    const inventory = await this.client.get<Array<{ itemId: number; inventoryType: string }>>(
      '/lol-inventory/v1/inventory?inventoryTypes=CHAMPION'
    )
    return inventory.map((i) => i.itemId)
  }

  purchaseItems(items: PurchaseItem[]): Promise<PurchaseResult> {
    return this.client.post('/lol-purchase-widget/v1/purchaseItems', { items })
  }
}
