import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, Champion, Summoner, Wallet } from '../api/index.js'

export const useLcuStore = defineStore('lcu', () => {
  const connected = ref(false)
  const summoner = ref<Summoner | null>(null)
  const wallet = ref<Wallet | null>(null)
  const champions = ref<Champion[]>([])
  const selectedIds = ref<Set<number>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const purchasing = ref(false)
  const purchaseLog = ref<string[]>([])

  // 过滤器
  const filterOwned = ref<'all' | 'owned' | 'unowned'>('unowned')
  const filterCurrency = ref<'all' | 'IP' | 'RP'>('IP')
  const searchQuery = ref('')

  const filteredChampions = computed(() => {
    return champions.value.filter((c) => {
      if (filterOwned.value === 'owned' && !c.owned) return false
      if (filterOwned.value === 'unowned' && c.owned) return false
      if (filterCurrency.value === 'IP' && c.ipPrice === null) return false
      if (filterCurrency.value === 'RP' && c.rpPrice === null) return false
      if (searchQuery.value) {
        return c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      }
      return true
    })
  })

  const selectedChampions = computed(() =>
    champions.value.filter((c) => selectedIds.value.has(c.itemId))
  )

  const estimatedCost = computed(() => {
    return selectedChampions.value.reduce(
      (acc, c) => {
        const ipCost = c.saleIpPrice ?? c.ipPrice ?? 0
        const rpCost = c.saleRpPrice ?? c.rpPrice ?? 0
        if (filterCurrency.value === 'RP') {
          acc.rp += rpCost
        } else {
          acc.ip += ipCost
        }
        return acc
      },
      { ip: 0, rp: 0 }
    )
  })

  async function checkStatus() {
    loading.value = true
    error.value = null
    try {
      const status = await api.getStatus()
      connected.value = status.connected
      summoner.value = status.summoner
      wallet.value = status.wallet
    } catch (err) {
      error.value = err instanceof Error ? err.message : '连接失败'
      connected.value = false
    } finally {
      loading.value = false
    }
  }

  async function loadChampions() {
    loading.value = true
    error.value = null
    try {
      champions.value = await api.getChampions()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取英雄列表失败'
    } finally {
      loading.value = false
    }
  }

  function toggleSelect(itemId: number) {
    if (selectedIds.value.has(itemId)) {
      selectedIds.value.delete(itemId)
    } else {
      selectedIds.value.add(itemId)
    }
  }

  function selectAll() {
    filteredChampions.value
      .filter((c) => !c.owned)
      .forEach((c) => selectedIds.value.add(c.itemId))
  }

  function clearSelection() {
    selectedIds.value.clear()
  }

  async function purchaseSelected() {
    if (selectedChampions.value.length === 0) return

    purchasing.value = true
    purchaseLog.value = []
    error.value = null

    try {
      // 分批购买，每批最多 10 个
      const BATCH_SIZE = 10
      const currency = filterCurrency.value === 'RP' ? 'RP' : 'IP'

      const items = selectedChampions.value
        .filter((c) => !c.owned)
        .map((c) => ({
          itemId: c.itemId,
          currency: currency as 'IP' | 'RP',
          cost:
            currency === 'RP'
              ? (c.saleRpPrice ?? c.rpPrice ?? 0)
              : (c.saleIpPrice ?? c.ipPrice ?? 0),
        }))

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const batchNames = batch.map(
          (b) => champions.value.find((c) => c.itemId === b.itemId)?.name ?? b.itemId
        )

        purchaseLog.value.push(`购买批次 ${Math.floor(i / BATCH_SIZE) + 1}: ${batchNames.join(', ')}`)

        await api.purchase({ items: batch })

        purchaseLog.value.push(`✓ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 购买成功`)
      }

      // 刷新钱包和英雄列表
      await Promise.all([checkStatus(), loadChampions()])
      selectedIds.value.clear()
      purchaseLog.value.push('全部购买完成！')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '购买失败'
      purchaseLog.value.push(`✗ 错误: ${error.value}`)
    } finally {
      purchasing.value = false
    }
  }

  return {
    connected,
    summoner,
    wallet,
    champions,
    selectedIds,
    loading,
    error,
    purchasing,
    purchaseLog,
    filterOwned,
    filterCurrency,
    searchQuery,
    filteredChampions,
    selectedChampions,
    estimatedCost,
    checkStatus,
    loadChampions,
    toggleSelect,
    selectAll,
    clearSelection,
    purchaseSelected,
  }
})
