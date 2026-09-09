/**
 * 购买分批逻辑自检（不需要客户端）
 * 用法: node scripts/test-batch.mjs
 */
import assert from 'node:assert/strict'
import { MAX_BATCH, purchaseInBatches } from '../src/renderer/src/utils/purchaseBatch.ts'

// 30 个英雄 = 3 条请求，每条 10 个，不重不漏
const items = Array.from({ length: 30 }, (_, i) => i)
const sent = []
await purchaseInBatches(items, async (batch) => sent.push(batch))
assert.deepEqual(sent.map((b) => b.length), [10, 10, 10])
assert.deepEqual(sent.flat(), items)

// 29 个 = 3 条请求，最后一条 9 个
const odd = []
await purchaseInBatches(items.slice(0, 29), async (batch) => odd.push(batch.length))
assert.deepEqual(odd, [10, 10, 9])

// 串行：上一批返回前不能发下一批
let inFlight = 0
await purchaseInBatches(items, async () => {
  assert.equal(inFlight, 0, '出现并行请求')
  inFlight++
  await new Promise((r) => setTimeout(r, 5))
  inFlight--
})

// 不足一批只发一条，且不超过上限
const tail = []
await purchaseInBatches([1, 2, 3], async (batch) => tail.push(batch))
assert.deepEqual(tail, [[1, 2, 3]])
assert.ok(sent.every((b) => b.length <= MAX_BATCH))

// 进度回调
const seen = []
await purchaseInBatches(items, async () => {}, (p) => seen.push([p.index, p.done, p.total]))
assert.deepEqual(seen, [[1, 10, 30], [2, 20, 30], [3, 30, 30]])

console.log('PASS — 30 个英雄拆 3 条串行请求，分批与进度正常')
