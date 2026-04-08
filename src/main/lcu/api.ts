import { LcuClient } from './client.js'

export interface Summoner {
  displayName: string
  puuid: string
  summonerId: number
  summonerLevel: number
  profileIconId: number
}

export interface Wallet {
  ip: number // 蓝色精华 (Blue Essence)
  rp: number // RP
}

export interface CatalogItem {
  active: boolean
  description: string
  imagePath: string
  inactiveDate: number
  inventoryType: string
  itemId: number
  itemInstanceId: string
  loadScreenPath: string
  maxQuantity: number
  metadata: any
  name: string
  offerId: string
  owned: boolean
  ownershipType: any
  prices: Array<{
    currency: string
    cost: number
    costType?: string
  }>
  purchaseDate: number
  questSkinInfo: any
  rarity: string
  releaseDate: number
  sale: any
  subInventoryType: string
  subTitle: string
  taggedChampionsIds: number[]
  tags: string[]
  tilePath: string
}

export interface PurchaseItem {
  itemKey: {
    inventoryType: string // e.g., 'CHAMPION'
    itemId: number
  }
  purchaseCurrencyInfo: {
    currencyType: string // e.g., 'IP' or 'RP'
    price: number
    purchasable: boolean
  }
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

  async getWallet(): Promise<Wallet> {
    const [ipRes, rpRes] = await Promise.all([
      this.client.get<{ lol_blue_essence: number }>('/lol-inventory/v1/wallet/IP'),
      this.client.get<{ RP: number }>('/lol-inventory/v1/wallet/RP'),
    ])
    return {
      ip: ipRes.lol_blue_essence || 0,
      rp: rpRes.RP || 0,
    }
  }

  async getChampionCatalog(): Promise<CatalogItem[]> {
    const all = await this.client.get<CatalogItem[]>(
      '/lol-catalog/v1/items/CHAMPION'
    )
    return all
  }

  async getOwnedChampionIds(): Promise<number[]> {
    const inventory = await this.client.get<Array<{ itemId: number; inventoryType: string }>>(
      '/lol-inventory/v1/inventory?inventoryTypes=%5B%22CHAMPION%22%5D'
    )
    return inventory.map((i) => i.itemId)
  }

  purchaseItems(items: PurchaseItem[]): Promise<PurchaseResult> {
    return this.client.post('/lol-purchase-widget/v2/purchaseItems', { items })
  }
}
