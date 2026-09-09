import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { LcuClient } from './LcuClient'
import { LcuApi, PurchaseItem, Summoner, Wallet, PurchaseResult } from './LcuApi'

const POSITION_SOURCE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champion-statistics/global/default/rcp-fe-lol-champion-statistics.js'
const POSITIONS = ['top', 'jungle', 'middle', 'bottom', 'support'] as const

type ChampionPosition = (typeof POSITIONS)[number]
type ChampionPositionCache = Record<string, ChampionPosition[]>

function parseChampionPositions(source: string): ChampionPositionCache {
  const match = source.match(/JSON\.parse\('(\{"BOTTOM":.*\})'\)/)
  if (!match) throw new Error('未在客户端统计资源中找到位置数据')

  const rates = JSON.parse(match[1]) as Record<string, Record<string, number>>
  const cache: ChampionPositionCache = {}

  for (const position of POSITIONS) {
    const championIds = Object.keys(rates[position.toUpperCase()] ?? {})
    if (championIds.length === 0) throw new Error(`位置数据为空: ${position}`)
    for (const id of championIds) {
      ;(cache[id] ??= []).push(position)
    }
  }

  return cache
}

/**
 * 批量购买业务服务层
 * 与 IPC 完全解耦，方便未来提取为独立 feature 包
 */
export class BulkBuyService {
  private championPositions = new Map<number, ChampionPosition[]>()
  private positionSync: Promise<void> = Promise.resolve()

  initializeChampionPositions(cachePath: string): void {
    this.positionSync = this.refreshChampionPositions(cachePath).catch(async (error) => {
      console.warn('英雄位置数据同步失败，尝试使用本地缓存:', error)
      try {
        this.setChampionPositions(JSON.parse(await readFile(cachePath, 'utf8')))
      } catch (cacheError) {
        console.warn('英雄位置缓存不可用:', cacheError)
      }
    })
  }

  private async refreshChampionPositions(cachePath: string): Promise<void> {
    const response = await fetch(POSITION_SOURCE, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`位置资源请求失败: ${response.status}`)

    const cache = parseChampionPositions(await response.text())
    this.setChampionPositions(cache)
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, JSON.stringify(cache), 'utf8')
  }

  private setChampionPositions(cache: ChampionPositionCache): void {
    this.championPositions = new Map(
      Object.entries(cache)
        .map(([id, positions]) => [Number(id), positions.filter((p) => POSITIONS.includes(p))] as const)
        .filter(([id, positions]) => Number.isInteger(id) && positions.length > 0)
    )
  }

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
    await this.positionSync
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
        purchasable: !item.owned,
        positions: this.championPositions.get(item.itemId) ?? []
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
