import { Router, Request, Response } from 'express'
import { LcuClient } from '../lcu/client.js'
import { LcuApi, PurchaseItem } from '../lcu/api.js'

const router = Router()

function createApi() {
  const client = LcuClient.create()
  return new LcuApi(client)
}

function handleError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  const status = message.includes('找不到') ? 503 : 500
  res.status(status).json({ error: message })
}

// GET /api/status - 检查 LCU 连接状态 + 当前召唤师信息
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const api = createApi()
    const [summoner, wallet] = await Promise.all([
      api.getSummoner(),
      api.getWallet(),
    ])
    res.json({ connected: true, summoner, wallet })
  } catch (err) {
    handleError(res, err)
  }
})

// GET /api/champions - 获取商城英雄列表（过滤已拥有）
router.get('/champions', async (_req: Request, res: Response) => {
  try {
    const api = createApi()
    const [catalog, ownedIds] = await Promise.all([
      api.getChampionCatalog(),
      api.getOwnedChampionIds(),
    ])

    const ownedSet = new Set(ownedIds)

    const champions = catalog.map((item) => {
      const localization =
        item.localizations['zh_CN'] ||
        item.localizations['en_US'] ||
        Object.values(item.localizations)[0]

      const bePrice = item.prices.find(
        (p) => p.currency === 'IP' || p.currency === 'BluEssence'
      )
      const rpPrice = item.prices.find((p) => p.currency === 'RP')

      const saleBePrice = item.sale?.prices.find(
        (p) => p.currency === 'IP' || p.currency === 'BluEssence'
      )
      const saleRpPrice = item.sale?.prices.find((p) => p.currency === 'RP')

      return {
        itemId: item.itemId,
        name: localization?.name ?? `Champion ${item.itemId}`,
        description: localization?.description ?? '',
        bePrice: bePrice?.cost ?? null,
        rpPrice: rpPrice?.cost ?? null,
        saleBePrice: saleBePrice?.cost ?? null,
        saleRpPrice: saleRpPrice?.cost ?? null,
        onSale: !!item.sale,
        owned: ownedSet.has(item.itemId),
        purchasable: item.purchasable,
      }
    })

    res.json(champions)
  } catch (err) {
    handleError(res, err)
  }
})

// POST /api/purchase - 批量购买
// Body: { items: Array<{ itemId: number, currency: 'BE' | 'RP' }> }
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as {
      items: Array<{ itemId: number; currency: 'BE' | 'RP'; cost: number }>
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '请提供要购买的英雄列表' })
      return
    }

    if (items.length > 50) {
      res.status(400).json({ error: '单次最多批量购买 50 个英雄' })
      return
    }

    const api = createApi()

    const purchaseItems: PurchaseItem[] = items.map((item) => ({
      inventoryType: 'CHAMPION',
      itemId: item.itemId,
      ipCost: item.currency === 'BE' ? item.cost : 0,
      rpCost: item.currency === 'RP' ? item.cost : 0,
      quantity: 1,
    }))

    const result = await api.purchaseItems(purchaseItems)
    res.json({ success: true, purchased: result })
  } catch (err) {
    handleError(res, err)
  }
})

export default router
