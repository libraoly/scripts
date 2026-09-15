import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { HttpClient } from '#core/client'
import * as barkModule from '#core/notify/bark'
import * as gotifyModule from '#core/notify/gotify'
import { storage as testMemoryStorage } from '#core/storage'
import {
  BASE_URL,
  DEFAULT_APP_CODE,
  DEFAULT_BARK_GROUP,
  DEFAULT_BARK_LEVEL,
  DEFAULT_BARK_TITLE,
  DEFAULT_CITY_ID,
  DEFAULT_HEADERS,
  DEFAULT_ITEM_ID,
  DEFAULT_JUMP_URL,
  DEFAULT_PROVINCE_ID,
  DEFAULT_REGION_ID,
  EVA_APP_CODE_ENV_NAME,
  EVA_ITEM_ID_ENV_NAME,
  EVA_SKU_MAP,
  EVA_STORAGE_PREFIX,
  EVA_TOKEN_ENV_NAME,
  EVA_USER_ID_ENV_NAME,
  fetchEvaStock,
  runEvaStockCheck,
  TITLE_IN_STOCK,
  TITLE_NO_STOCK,
  TITLE_OUT_OF_STOCK,
  TITLE_RAPID_DECREASE,
  TITLE_STOCK_INCREASED,
} from '#tasks/eva'
import { determineStockEvent, shouldNotifySku } from '#tasks/eva/events'
import type { EvaDynamicResponse, SkuStockInfo, SkuStockRecord } from '#tasks/eva/types'

// 在单元测试环境中 Mock storage 核心模块，强制使用内存存储驱动，严禁污染本地 fs (.data)
vi.mock('#core/storage', async () => {
  const { createStorage } = await import('unstorage')
  const { default: memoryDriver } = await import('unstorage/drivers/memory')
  const memoryInstance = createStorage({ driver: memoryDriver() })

  return {
    DEFAULT_STORAGE_BASE: './.data',
    STORAGE_BASE_DIR_ENV_NAME: 'STORAGE_BASE_DIR',
    createFileStorage: vi.fn(() => memoryInstance),
    storage: memoryInstance,
  }
})

vi.mock('consola', () => {
  const consolaMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    withTag: vi.fn(),
  }
  consolaMock.withTag.mockReturnValue(consolaMock)
  return {
    default: consolaMock,
    ...consolaMock,
  }
})

describe('Eva Task Module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await testMemoryStorage.clear()
    delete process.env.EVA_ITEM_ID
    delete process.env.EVA_USER_ID
    delete process.env.EVA_APP_CODE
    delete process.env.EVA_TOKEN
  })

  describe('Constants and Defaults', () => {
    it('should define correct default constants and endpoints', () => {
      expect(BASE_URL).toBe('https://api-dmall.lynkco.com/portal/api/item/render/dynamic')
      expect(DEFAULT_ITEM_ID).toBe('5310000100239002')
      expect(DEFAULT_APP_CODE).toBe('3fa3314998bd4195a9fe2df3e85e6a12')
      expect(DEFAULT_PROVINCE_ID).toBe('110000')
      expect(DEFAULT_CITY_ID).toBe('110100')
      expect(DEFAULT_REGION_ID).toBe('110101')
      expect(DEFAULT_BARK_GROUP).toBe('领克商城')
      expect(DEFAULT_BARK_LEVEL).toBe('timeSensitive')
      expect(DEFAULT_BARK_TITLE).toBe('领克商城 Eva 库存提醒')
      expect(DEFAULT_JUMP_URL).toContain('id=5310000100239002')
      expect(EVA_STORAGE_PREFIX).toBe('eva:stock')
    })

    it('should define dynamic title constants', () => {
      expect(TITLE_IN_STOCK).toBe('🎉 发现 Eva 机器人现货！')
      expect(TITLE_NO_STOCK).toBe('ℹ️ Eva 机器人当前暂无库存')
      expect(TITLE_OUT_OF_STOCK).toBe('⚠️ Eva 机器人已售罄！')
      expect(TITLE_RAPID_DECREASE).toBe('⚡ Eva 机器人库存快速变化！')
      expect(TITLE_STOCK_INCREASED).toBe('📦 Eva 机器人补货增加！')
    })

    it('should define SKU mappings for black and white models', () => {
      expect(EVA_SKU_MAP['5310000100278003']).toBe('Eva 高亮黑')
      expect(EVA_SKU_MAP['5310000100278002']).toBe('Eva 极地白')
    })

    it('should configure required default headers', () => {
      expect(DEFAULT_HEADERS.Host).toBe('api-dmall.lynkco.com')
      expect(DEFAULT_HEADERS.Origin).toBe('https://app.lynkco.com')
      expect(DEFAULT_HEADERS.Referer).toBe('https://app.lynkco.com/')
      expect(DEFAULT_HEADERS['User-Agent']).toContain('Mobile/15E148')
      expect(DEFAULT_HEADERS['acl-app']).toBe('BUYER')
      expect(DEFAULT_HEADERS.Authentication).toBe('AppId=59701c08ed454a43a9b')
    })

    it('should export correct environment variable names', () => {
      expect(EVA_ITEM_ID_ENV_NAME).toBe('EVA_ITEM_ID')
      expect(EVA_USER_ID_ENV_NAME).toBe('EVA_USER_ID')
      expect(EVA_APP_CODE_ENV_NAME).toBe('EVA_APP_CODE')
      expect(EVA_TOKEN_ENV_NAME).toBe('EVA_TOKEN')
    })
  })

  describe('Events and Date-fns formatting (determineStockEvent & shouldNotifySku)', () => {
    const fixedDate = new Date('2026-09-14T11:00:00.000Z')

    it('should handle INITIAL event when stock > 0 with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 10,
        inStock: true,
      }

      const event = determineStockEvent(current, null, { date: fixedDate })
      expect(event.eventType).toBe('INITIAL')
      expect(event.title).toBe(TITLE_IN_STOCK)
      expect(event.message).toContain('【Eva 高亮黑】当前有现货 (10 件)，点击立即打开领克 App 选购！\n')
      expect(event.message).toMatch(/选购！\n\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
    })

    it('should handle INITIAL event when stock === 0 with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278002',
        skuName: 'Eva 极地白',
        stock: 0,
        inStock: false,
      }

      const event = determineStockEvent(current, null, { date: fixedDate })
      expect(event.eventType).toBe('INITIAL')
      expect(event.title).toBe(TITLE_NO_STOCK)
      expect(event.message).toContain('【Eva 极地白】当前暂无现货 (0 件)，持续缺货中。\n')
    })

    it('should detect RESTOCKED (0 -> 50) with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278002',
        skuName: 'Eva 极地白',
        stock: 50,
        inStock: true,
      }
      const previous: SkuStockRecord = {
        skuId: '5310000100278002',
        skuName: 'Eva 极地白',
        stock: 0,
        inStock: false,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }

      const event = determineStockEvent(current, previous, { date: fixedDate })
      expect(event.eventType).toBe('RESTOCKED')
      expect(event.title).toBe(TITLE_IN_STOCK)
      expect(event.diff).toBe(50)
      expect(event.message).toContain('当前有现货 (50 件)，点击立即打开领克 App 选购！\n')
    })

    it('should detect OUT_OF_STOCK (10 -> 0) with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 0,
        inStock: false,
      }
      const previous: SkuStockRecord = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 10,
        inStock: true,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }

      const event = determineStockEvent(current, previous, { date: fixedDate })
      expect(event.eventType).toBe('OUT_OF_STOCK')
      expect(event.title).toBe(TITLE_OUT_OF_STOCK)
      expect(event.diff).toBe(-10)
      expect(event.message).toContain('当前已售罄无货 (0 件)，已从有库存转为缺货。\n')
    })

    it('should detect RAPID_DECREASE (100 -> 80, diff >= 5) with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 80,
        inStock: true,
      }
      const previous: SkuStockRecord = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 100,
        inStock: true,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }

      const event = determineStockEvent(current, previous, { rapidChangeThreshold: 5, date: fixedDate })
      expect(event.eventType).toBe('RAPID_DECREASE')
      expect(event.title).toBe(TITLE_RAPID_DECREASE)
      expect(event.diff).toBe(-20)
      expect(event.message).toContain('库存紧张请尽快选购！\n')
    })

    it('should detect STOCK_INCREASED (50 -> 70) with newline before formattedTime', () => {
      const current: SkuStockInfo = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 70,
        inStock: true,
      }
      const previous: SkuStockRecord = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 50,
        inStock: true,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }

      const event = determineStockEvent(current, previous, { date: fixedDate })
      expect(event.eventType).toBe('STOCK_INCREASED')
      expect(event.title).toBe(TITLE_STOCK_INCREASED)
      expect(event.diff).toBe(20)
      expect(event.message).toContain('点击立即打开领克 App 选购！\n')
    })

    it('should detect STILL_IN_STOCK and STILL_OUT_OF_STOCK', () => {
      const inStockCurrent: SkuStockInfo = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 50,
        inStock: true,
      }
      const inStockPrev: SkuStockRecord = {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 52,
        inStock: true,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }
      const event1 = determineStockEvent(inStockCurrent, inStockPrev, { date: fixedDate })
      expect(event1.eventType).toBe('STILL_IN_STOCK')

      const outOfStockCurrent: SkuStockInfo = {
        skuId: '5310000100278002',
        skuName: 'Eva 极地白',
        stock: 0,
        inStock: false,
      }
      const outOfStockPrev: SkuStockRecord = {
        skuId: '5310000100278002',
        skuName: 'Eva 极地白',
        stock: 0,
        inStock: false,
        timestamp: fixedDate.getTime() - 10000,
        formattedTime: '2026-09-14 10:50:00',
      }
      const event2 = determineStockEvent(outOfStockCurrent, outOfStockPrev, { date: fixedDate })
      expect(event2.eventType).toBe('STILL_OUT_OF_STOCK')
      expect(event2.title).toBe(TITLE_NO_STOCK)
    })

    it('should correctly evaluate shouldNotifySku based on policy', () => {
      const restockedEvent = determineStockEvent(
        { skuId: '1', skuName: 'Eva', stock: 10, inStock: true },
        { skuId: '1', skuName: 'Eva', stock: 0, inStock: false, timestamp: 0, formattedTime: '' },
      )
      const outOfStockEvent = determineStockEvent(
        { skuId: '1', skuName: 'Eva', stock: 0, inStock: false },
        { skuId: '1', skuName: 'Eva', stock: 10, inStock: true, timestamp: 0, formattedTime: '' },
      )
      const stillNoStockEvent = determineStockEvent(
        { skuId: '1', skuName: 'Eva', stock: 0, inStock: false },
        { skuId: '1', skuName: 'Eva', stock: 0, inStock: false, timestamp: 0, formattedTime: '' },
      )

      expect(shouldNotifySku(restockedEvent, { bark: false, gotify: false })).toBe(false)
      expect(shouldNotifySku(restockedEvent, { bark: true, notifyPolicy: 'onChange' })).toBe(true)
      expect(shouldNotifySku(restockedEvent, { gotify: true, notifyPolicy: 'onChange' })).toBe(true)
      expect(shouldNotifySku(outOfStockEvent, { bark: true, notifyPolicy: 'onChange' })).toBe(true)
      expect(shouldNotifySku(stillNoStockEvent, { bark: true, notifyPolicy: 'onChange' })).toBe(false)
      expect(shouldNotifySku(outOfStockEvent, { bark: true, onlyInStock: true })).toBe(false)
    })
  })

  describe('fetchEvaStock', () => {
    it('should successfully query stock with defaults', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          selectedSkuStock: 312,
          selectedSkuId: 5310000100278003,
          price: 116900,
          originalPrice: 116900,
          warnStatus: 1,
        },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const stockInfo = await fetchEvaStock({
        skuId: '5310000100278003',
        client: mockClient,
      })

      expect(stockInfo).toEqual({
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 312,
        inStock: true,
        price: 116900,
        originalPrice: 116900,
        warnStatus: 1,
      })

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, reqOptions] = mockGet.mock.calls[0]!
      expect(url).toContain(BASE_URL)
      expect(url).toContain('skuId=5310000100278003')
      expect(url).toContain(`itemId=${DEFAULT_ITEM_ID}`)
      expect(reqOptions?.headers).toMatchObject({
        ...DEFAULT_HEADERS,
        Authorization: `APPCODE ${DEFAULT_APP_CODE}`,
      })
    })

    it('should handle out of stock response (stock = 0)', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          selectedSkuStock: 0,
          selectedSkuId: 5310000100278002,
          price: 116900,
          warnStatus: -1,
        },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const stockInfo = await fetchEvaStock({
        skuId: '5310000100278002',
        client: mockClient,
      })

      expect(stockInfo.stock).toBe(0)
      expect(stockInfo.inStock).toBe(false)
      expect(stockInfo.skuName).toBe('Eva 极地白')
    })

    it('should throw error when skuId is empty', async () => {
      const mockClient = { get: vi.fn() } as unknown as HttpClient

      await expect(
        fetchEvaStock({
          skuId: '',
          client: mockClient,
        }),
      ).rejects.toThrow('[fetchEvaStock] Missing required parameter: "skuId"')
    })

    it('should support environment variables for itemId, userId, appCode, and token', async () => {
      process.env.EVA_ITEM_ID = '99990000'
      process.env.EVA_USER_ID = '88887777'
      process.env.EVA_APP_CODE = 'custom_app_code_123'
      process.env.EVA_TOKEN = 'bearer_token_abc'

      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: {
          selectedSkuStock: 5,
        },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const stockInfo = await fetchEvaStock({
        skuId: '5310000100278003',
        client: mockClient,
      })

      expect(stockInfo.stock).toBe(5)
      const [url, reqOptions] = mockGet.mock.calls[0]!
      expect(url).toContain('itemId=99990000')
      expect(url).toContain('userId=88887777')
      expect(reqOptions?.headers?.Authorization).toBe('APPCODE custom_app_code_123')
      expect(reqOptions?.headers?.token).toBe('bearer_token_abc')
      expect(reqOptions?.headers?.svcsid).toBe('bearer_token_abc')
    })

    it('should fallback skuName when skuId is unknown', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 10 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const stockInfo = await fetchEvaStock({
        skuId: '9999999999999999',
        client: mockClient,
      })

      expect(stockInfo.skuName).toBe('SKU 9999999999999999')
      expect(stockInfo.stock).toBe(10)
    })

    it('should retry on failure and succeed if subsequent attempt succeeds', async () => {
      const mockGet = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 15 },
        } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const stockInfo = await fetchEvaStock({
        skuId: '5310000100278003',
        retries: 3,
        backoff: 0.01,
        client: mockClient,
      })

      expect(stockInfo.stock).toBe(15)
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('should throw error when all retries are exhausted', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Gateway timeout'))

      const mockClient = { get: mockGet } as unknown as HttpClient

      await expect(
        fetchEvaStock({
          skuId: '5310000100278003',
          retries: 2,
          backoff: 0.01,
          client: mockClient,
        }),
      ).rejects.toThrow('Gateway timeout')

      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('runEvaStockCheck with Separate Notifications and In-Memory Storage', () => {
    it('should check all default SKUs and store records in in-memory storage', async () => {
      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 312, selectedSkuId: 5310000100278003 },
        } satisfies EvaDynamicResponse)
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 0, selectedSkuId: 5310000100278002 },
        } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const result = await runEvaStockCheck({
        fetchOptions: { client: mockClient },
      })

      expect(result.success).toBe(true)
      expect(result.hasStock).toBe(true)
      expect(result.stocks['5310000100278003']?.stock).toBe(312)
      expect(result.stocks['5310000100278002']?.stock).toBe(0)
      expect(result.events['5310000100278003']?.eventType).toBe('INITIAL')
      expect(result.events['5310000100278002']?.eventType).toBe('INITIAL')

      // 验证内存 storage 正确保存了记录
      const savedBlack = await testMemoryStorage.getItem<SkuStockRecord>('eva:stock:5310000100278003')
      expect(savedBlack?.stock).toBe(312)
      expect(savedBlack?.formattedTime).toBeDefined()
    })

    it('should send Bark notifications SEPARATELY for each qualifying SKU with formatted message and newline', async () => {
      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 312 },
        } satisfies EvaDynamicResponse)
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 5 },
        } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })

      const result = await runEvaStockCheck({
        bark: true,
        fetchOptions: { client: mockClient },
      })

      expect(result.success).toBe(true)
      // 两款均首次发现现货，应当分开发送 2 条通知！
      expect(spySendToBark).toHaveBeenCalledTimes(2)

      const [firstCall, secondCall] = spySendToBark.mock.calls
      const payload1 = firstCall![0] as barkModule.BarkPayload
      const payload2 = secondCall![0] as barkModule.BarkPayload

      expect(payload1.title).toBe(TITLE_IN_STOCK)
      expect(payload1.body).toContain('【Eva 高亮黑】当前有现货 (312 件)，点击立即打开领克 App 选购！\n')
      expect(payload1.url).toBe(DEFAULT_JUMP_URL)
      expect(payload1.group).toBe(DEFAULT_BARK_GROUP)
      expect(payload1.level).toBe(DEFAULT_BARK_LEVEL)

      expect(payload2.title).toBe(TITLE_IN_STOCK)
      expect(payload2.body).toContain('【Eva 极地白】当前有现货 (5 件)，点击立即打开领克 App 选购！\n')

      spySendToBark.mockRestore()
    })

    it('should send out of stock notification when transitioning from in-stock to 0', async () => {
      // 预置上一次有货记录至内存 storage
      await testMemoryStorage.setItem('eva:stock:5310000100278003', {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 50,
        inStock: true,
        timestamp: Date.now() - 60000,
        formattedTime: '2026-09-14 10:00:00',
      })

      // 本次查询变为 0 件 (售罄)
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 0 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        bark: true,
        fetchOptions: { client: mockClient },
      })

      expect(result.events['5310000100278003']?.eventType).toBe('OUT_OF_STOCK')
      expect(spySendToBark).toHaveBeenCalledTimes(1)
      const payload = spySendToBark.mock.calls[0]![0] as barkModule.BarkPayload
      expect(payload.title).toBe(TITLE_OUT_OF_STOCK)
      expect(payload.body).toContain('【Eva 高亮黑】当前已售罄无货 (0 件)，已从有库存转为缺货。\n')

      spySendToBark.mockRestore()
    })

    it('should send rapid decrease notification when stock drops significantly', async () => {
      // 预置 100 件至内存 storage
      await testMemoryStorage.setItem('eva:stock:5310000100278003', {
        skuId: '5310000100278003',
        skuName: 'Eva 高亮黑',
        stock: 100,
        inStock: true,
        timestamp: Date.now() - 60000,
        formattedTime: '2026-09-14 10:00:00',
      })

      // 本次查询急降至 30 件
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 30 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        bark: true,
        rapidChangeThreshold: 5,
        fetchOptions: { client: mockClient },
      })

      expect(result.events['5310000100278003']?.eventType).toBe('RAPID_DECREASE')
      expect(spySendToBark).toHaveBeenCalledTimes(1)
      const payload = spySendToBark.mock.calls[0]![0] as barkModule.BarkPayload
      expect(payload.title).toBe(TITLE_RAPID_DECREASE)
      expect(payload.body).toContain('库存紧张请尽快选购！\n')

      spySendToBark.mockRestore()
    })

    it('should isolate error when one SKU fails without interrupting others', async () => {
      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { selectedSkuStock: 50 },
        } satisfies EvaDynamicResponse)
        .mockRejectedValueOnce(new Error('Network error on white model'))

      const mockClient = { get: mockGet } as unknown as HttpClient

      const result = await runEvaStockCheck({
        fetchOptions: { client: mockClient, retries: 1 },
      })

      expect(result.success).toBe(false)
      expect(result.hasStock).toBe(true)
      expect(result.stocks['5310000100278003']?.stock).toBe(50)
      expect(result.stocks['5310000100278002']).toBeUndefined()
      expect(result.errors?.['5310000100278002']).toBeDefined()
    })

    it('should catch and record Bark notification error per SKU without failing query', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 5 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockRejectedValue(new Error('Bark push failed'))

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        bark: true,
        fetchOptions: { client: mockClient },
      })

      expect(result.hasStock).toBe(true)
      expect(result.stocks['5310000100278003']?.stock).toBe(5)
      expect(result.errors?.['notify:5310000100278003']).toBeDefined()

      spySendToBark.mockRestore()
    })

    it('should send Gotify notification when gotify is configured', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 10 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToGotify = vi.spyOn(gotifyModule, 'sendToGotify').mockResolvedValue({
        id: 1,
        appid: 1,
        message: '',
        priority: 5,
        date: '',
      })

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        gotify: {
          priority: 8,
        },
        fetchOptions: { client: mockClient },
      })

      expect(result.hasStock).toBe(true)
      expect(spySendToGotify).toHaveBeenCalledTimes(1)
      expect(spySendToGotify).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 8,
          extras: expect.objectContaining({
            'client::display': { contentType: 'text/markdown' },
            'client::notification': { click: { url: DEFAULT_JUMP_URL } },
          }),
        }),
        {
          priority: 8,
        },
      )

      spySendToGotify.mockRestore()
    })

    it('should catch and record Gotify notification error per SKU without failing query', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 5 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToGotify = vi.spyOn(gotifyModule, 'sendToGotify').mockRejectedValue(new Error('Gotify push failed'))

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        gotify: true,
        fetchOptions: { client: mockClient },
      })

      expect(result.hasStock).toBe(true)
      expect(result.stocks['5310000100278003']?.stock).toBe(5)
      expect(result.errors?.['notifyGotify:5310000100278003']).toBeDefined()

      spySendToGotify.mockRestore()
    })

    it('should support direct channel parameters with both bark: true and gotify: true', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 15 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })
      const spySendToGotify = vi.spyOn(gotifyModule, 'sendToGotify').mockResolvedValue({
        id: 1,
        appid: 1,
        message: '',
        priority: 5,
        date: '',
      })

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        bark: true,
        gotify: true,
        notifyTitle: 'Eva 现货提醒',
        fetchOptions: { client: mockClient },
      })

      expect(result.hasStock).toBe(true)
      expect(spySendToBark).toHaveBeenCalledTimes(1)
      expect(spySendToBark).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eva 现货提醒',
        }),
      )
      expect(spySendToGotify).toHaveBeenCalledTimes(1)
      expect(spySendToGotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eva 现货提醒',
        }),
      )

      spySendToBark.mockRestore()
      spySendToGotify.mockRestore()
    })

    it('should support custom obj configurations for direct channel parameters in eva', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        success: true,
        data: { selectedSkuStock: 20 },
      } satisfies EvaDynamicResponse)

      const mockClient = { get: mockGet } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })
      const spySendToGotify = vi.spyOn(gotifyModule, 'sendToGotify').mockResolvedValue({
        id: 2,
        appid: 1,
        message: '',
        priority: 9,
        date: '',
      })

      const result = await runEvaStockCheck({
        skus: ['5310000100278003'],
        bark: { group: '领克机器人', icon: 'https://eva.png' },
        gotify: { priority: 9, appToken: 'eva-token' },
        notifyPolicy: 'inStock',
        fetchOptions: { client: mockClient },
      })

      expect(result.hasStock).toBe(true)
      expect(spySendToBark).toHaveBeenCalledWith(
        expect.objectContaining({
          group: '领克机器人',
          icon: 'https://eva.png',
        }),
        {
          group: '领克机器人',
          icon: 'https://eva.png',
        },
      )
      expect(spySendToGotify).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 9,
        }),
        {
          priority: 9,
          appToken: 'eva-token',
        },
      )

      spySendToBark.mockRestore()
      spySendToGotify.mockRestore()
    })
  })

  describe('Layered Exports', () => {
    it('should export all public APIs, events, and constants from index', async () => {
      const evaModule = await import('#tasks/eva')
      expect(evaModule.runEvaStockCheck).toBeTypeOf('function')
      expect(evaModule.fetchEvaStock).toBeTypeOf('function')
      expect(evaModule.determineStockEvent).toBeTypeOf('function')
      expect(evaModule.BASE_URL).toBeDefined()
      expect(evaModule.DEFAULT_ITEM_ID).toBe('5310000100239002')
      expect(evaModule.DEFAULT_APP_CODE).toBe('3fa3314998bd4195a9fe2df3e85e6a12')
      expect(evaModule.EVA_SKU_MAP).toBeDefined()
      expect(evaModule.TITLE_IN_STOCK).toBeDefined()
    })
  })
})
