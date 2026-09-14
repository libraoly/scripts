import { describe, it, expect } from 'vitest'

import { runEvaStockCheck } from '#tasks/eva'
import { fetchEvaStock } from '#tasks/eva/api'
import { EVA_SKU_MAP } from '#tasks/eva/constants'

describe('E2E: Eva Stock Real API Integration', () => {
  it('should successfully query Eva stock via fetchEvaStock', async () => {
    const stockInfo = await fetchEvaStock({
      skuId: '5310000100278003',
      timeout: 15_000,
      retries: 2,
    })

    expect(stockInfo.skuId).toBe('5310000100278003')
    expect(stockInfo.skuName).toBe(EVA_SKU_MAP['5310000100278003'])
    expect(typeof stockInfo.stock).toBe('number')
    expect(stockInfo.stock).toBeGreaterThanOrEqual(0)
    expect(typeof stockInfo.inStock).toBe('boolean')
    expect(stockInfo.inStock).toBe(stockInfo.stock > 0)
  })

  it('should successfully run runEvaStockCheck for all default SKUs without notification', async () => {
    const result = await runEvaStockCheck({
      notify: true,
      fetchOptions: {
        timeout: 15_000,
        retries: 2,
      },
    })

    expect(result.success).toBe(true)
    expect(typeof result.timestamp).toBe('number')
    expect(typeof result.hasStock).toBe('boolean')
    expect(result.stocks['5310000100278003']).toBeDefined()
    expect(result.stocks['5310000100278002']).toBeDefined()
    expect(result.stocks['5310000100278003']?.skuName).toBe('Eva 高亮黑')
    expect(result.stocks['5310000100278002']?.skuName).toBe('Eva 极地白')
    expect(result.events['5310000100278003']?.title).toBeDefined()
    expect(result.records['5310000100278003']?.formattedTime).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
  })
})
