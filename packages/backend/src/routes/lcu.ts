import { Router, Request, Response } from 'express'
import { LcuClient } from '../lcu/client.js'
import { LcuApi, PurchaseItem } from '../lcu/api.js'

const router = Router()

async function createApi() {
  const client = await LcuClient.create()
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
    const api = await createApi()
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
    const api = await createApi()
    const [catalog, ownedIds] = await Promise.all([
      api.getChampionCatalog(),
      api.getOwnedChampionIds(),
    ])

    const ownedSet = new Set(ownedIds)

    const champions = catalog.map((item) => {
      const ipPrice = item.prices.find(
        (p: any) => p.currency === 'IP' || p.currency === 'BluEssence'
      )
      const rpPrice = item.prices.find((p: any) => p.currency === 'RP')

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
      }
    })

    res.json(champions)
  } catch (err) {
    handleError(res, err)
  }
})

// POST /api/purchase - 批量购买
// Body: { items: Array<{ itemId: number, currency: 'IP' | 'RP' }> }
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as {
      items: Array<{ itemId: number; currency: 'IP' | 'RP'; cost: number }>
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '请提供要购买的英雄列表' })
      return
    }

    if (items.length > 50) {
      res.status(400).json({ error: '单次最多批量购买 50 个英雄' })
      return
    }

    const api = await createApi()

    const purchaseItems: PurchaseItem[] = items.map((item) => ({
      itemKey: {
        inventoryType: 'CHAMPION',
        itemId: item.itemId,
      },
      purchaseCurrencyInfo: {
        currencyType: (item.currency as string) === 'BE' ? 'IP' : item.currency,
        price: item.cost,
        purchasable: true,
      },
      quantity: 1,
    }))

    const result = await api.purchaseItems(purchaseItems)
    res.json({ success: true, purchased: result })
  } catch (err) {
    handleError(res, err)
  }
})

export default router
