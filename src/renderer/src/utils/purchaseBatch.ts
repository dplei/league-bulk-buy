/** 一次 LCU 购买请求最多带几个英雄：客户端一口气吃太多会卡 */
export const MAX_BATCH = 10
/** 批次之间的间隔，给客户端喘口气刷新库存 */
const PAUSE_MS = 400

export interface BatchProgress<T> {
  index: number
  batch: T[]
  done: number
  total: number
}

/** 把整单拆成不超过 MAX_BATCH 的多次请求，串行发送（并行会把客户端顶爆） */
export async function purchaseInBatches<T>(
  items: T[],
  send: (batch: T[]) => Promise<unknown>,
  onProgress?: (info: BatchProgress<T>) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += MAX_BATCH) {
    const batch = items.slice(i, i + MAX_BATCH)
    await send(batch)
    const done = i + batch.length
    onProgress?.({ index: i / MAX_BATCH + 1, batch, done, total: items.length })
    if (done < items.length) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
  }
}
