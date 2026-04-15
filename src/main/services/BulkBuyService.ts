import { LcuClient } from './LcuClient'
import { LcuApi, PurchaseItem, Summoner, Wallet, PurchaseResult } from './LcuApi'

/**
 * 批量购买业务服务层
 * 与 IPC 完全解耦，方便未来提取为独立 feature 包
 */
export class BulkBuyService {
  private async createApi(): Promise<LcuApi> {
    const client = await LcuClient.create()
    return new LcuApi(client)
  }

  async getStatus(): Promise<{ connected: boolean; summoner: Summoner; wallet: Wallet }> {
    const api = await this.createApi()
    const [summoner, wallet] = await Promise.all([api.getSummoner(), api.getWallet()])
    return { connected: true, summoner, wallet }
  }

  async getChampions() {
    const api = await this.createApi()
    const [catalog, ownedIds] = await Promise.all([
      api.getChampionCatalog(),
      api.getOwnedChampionIds()
    ])

    const ownedSet = new Set(ownedIds)

    return catalog.map((item) => {
      const ipPrice = item.prices.find(
        (p) => p.currency === 'IP' || p.currency === 'BluEssence'
      )
      const rpPrice = item.prices.find((p) => p.currency === 'RP')

      const saleIpPrice = item.sale?.prices.find(
        (p: any) => p.currency === 'IP' || p.currency === 'BluEssence'
      )
      const saleRpPrice = item.sale?.prices.find((p: any) => p.currency === 'RP')

      return {
        ...item,
        itemId: item.itemId,
        name: item.name ?? `Champion ${item.itemId}`,
        description: item.description ?? '',
        ipPrice: ipPrice?.cost ?? null,
        rpPrice: rpPrice?.cost ?? null,
        saleIpPrice: saleIpPrice?.cost ?? null,
        saleRpPrice: saleRpPrice?.cost ?? null,
        onSale: !!item.sale,
        owned: ownedSet.has(item.itemId) || item.owned,
        purchasable: !item.owned
      }
    })
  }

  async purchase(
    items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>
  ): Promise<{ success: boolean; purchased: PurchaseResult }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('请提供要购买的英雄列表')
    }

    if (items.length > 50) {
      throw new Error('单次最多批量购买 50 个英雄')
    }

    const api = await this.createApi()

    const purchaseItems: PurchaseItem[] = items.map((item) => ({
      itemKey: {
        inventoryType: 'CHAMPION',
        itemId: item.itemId
      },
      purchaseCurrencyInfo: {
        currencyType: (item.currency as string) === 'BE' ? 'IP' : item.currency,
        price: item.cost,
        purchasable: true
      },
      quantity: 1
    }))

    const result = await api.purchaseItems(purchaseItems)
    return { success: true, purchased: result }
  }
}
