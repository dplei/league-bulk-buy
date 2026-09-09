/**
 * 五路筛选验证脚本 — 启动 Electron，校验位置缓存与分路筛选
 * 用法: pnpm run build && node scripts/verify-positions.mjs
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LANES = ['top', 'jungle', 'middle', 'bottom', 'support']

const app = await electron.launch({
  args: [path.join(ROOT, 'out', 'main', 'index.js')],
  executablePath: path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
})
const page = await app.firstWindow()
await page.waitForSelector('.home', { timeout: 15000 })

const champions = await page.evaluate(() => window.api.getChampions())
assert.ok(Array.isArray(champions) && champions.length > 0, '英雄列表为空（客户端未登录？）')

const withLane = champions.filter((c) => c.positions?.length > 0)
console.log(`英雄总数 ${champions.length}，有分路数据 ${withLane.length}`)
assert.ok(withLane.length / champions.length > 0.8, '分路覆盖率过低，位置缓存可能未生效')
assert.ok(
  withLane.every((c) => c.positions.every((p) => LANES.includes(p))),
  '出现未知分路值'
)

// 逐路点击筛选，核对渲染出的英雄都属于该路
const byName = new Map(champions.map((c) => [c.name, c.positions ?? []]))
for (const [index, lane] of LANES.entries()) {
  await page.locator('.filter-section', { hasText: '分路' }).locator('button').nth(index + 1).click()
  await page.waitForTimeout(150)
  const names = await page.locator('.champion-grid .champion-name').allInnerTexts()
  const wrong = names.filter((n) => !(byName.get(n) ?? []).includes(lane))
  console.log(`${lane}: 渲染 ${names.length} 个，错配 ${wrong.length}`)
  assert.deepEqual(wrong, [], `${lane} 筛选出不属于该路的英雄: ${wrong.join(', ')}`)
}

await page.locator('.filter-section', { hasText: '分路' }).locator('button').first().click()
await page.screenshot({ path: path.join(ROOT, 'scripts', 'verify-positions.png') })
console.log('PASS — 分路数据与筛选正常')
await app.close()
