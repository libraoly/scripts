import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as barkModule from '#core/bark'
import type { HttpClient } from '#core/client'
import * as gotifyModule from '#core/gotify'
import { runBalanceCheck } from '#tasks/balance'
import { fetchBalance } from '#tasks/balance/api'
import { BASE_URL, COMMON_FORM, HEADERS, TableName } from '#tasks/balance/constants'
import { getElectricityBalance } from '#tasks/balance/electricity'
import type { BalanceResponse } from '#tasks/balance/types.js'
import { getWaterBalance } from '#tasks/balance/water'

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

describe('Balance Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ELECTRICITY_CARNO
    delete process.env.ELECTRICITY_TABLE_ID
    delete process.env.WATER_CARNO
    delete process.env.WATER_TABLE_ID
  })

  describe('Constants and Enums', () => {
    it('should define correct TableName values', () => {
      expect(TableName.electricity).toBe('electricity')
      expect(TableName.water).toBe('water')
    })

    it('should define default BASE_URL, COMMON_FORM and HEADERS', () => {
      expect(BASE_URL).toBe('http://system.es-it.cn/WebSolution/EasyLife/data.aspx')
      expect(COMMON_FORM).toEqual({
        method: 'BuildRequest',
        propertyKey: 'changye',
        redirect: 'QueyThreeTableBalance',
        areaId: '3287eecc-7fe5-468c-a2db-ec98aeaefb04',
      })
      expect(HEADERS.Accept).toContain('application/json')
      expect(HEADERS.Origin).toBe('http://system.es-it.cn')
      expect(HEADERS['User-Agent']).toContain('MicroMessenger')
    })
  })

  describe('fetchBalance', () => {
    it('should successfully query balance with camelCase params', async () => {
      const mockPostForm = vi.fn().mockResolvedValue({
        response: { code: '200', msg: '' },
        body: {
          data: {
            balance: '188.30',
            tableId: '218233ca-e17e-426c-b351-9834c4feb730',
          },
        },
      } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await fetchBalance({
        carno: '2020030155,2020030155',
        tableId: '218233ca-e17e-426c-b351-9834c4feb730',
        tableName: TableName.electricity,
        client: mockClient,
      })

      expect(balance).toBe('188.30')
      expect(mockPostForm).toHaveBeenCalledTimes(1)
      const [url, form, options] = mockPostForm.mock.calls[0]!
      expect(url).toBe(BASE_URL)
      expect(form).toEqual({
        method: 'BuildRequest',
        propertyKey: 'changye',
        redirect: 'QueyThreeTableBalance',
        areaId: '3287eecc-7fe5-468c-a2db-ec98aeaefb04',
        carno: '2020030155,2020030155',
        tableId: '218233ca-e17e-426c-b351-9834c4feb730',
        tableName: 'electricity',
      })
      expect(options?.headers).toMatchObject(HEADERS)
    })

    it('should throw error when required parameters are missing', async () => {
      const mockClient = { postForm: vi.fn() } as unknown as HttpClient

      await expect(
        fetchBalance({
          carno: '',
          tableId: '123',
          tableName: TableName.electricity,
          client: mockClient,
        }),
      ).rejects.toThrow('[fetchBalance] Missing required parameter: "carno"')

      await expect(
        fetchBalance({
          carno: '123',
          tableName: TableName.electricity,
          client: mockClient,
        }),
      ).rejects.toThrow('[fetchBalance] Missing required parameter: "tableId"')

      await expect(
        fetchBalance({
          carno: '123',
          tableId: '456',
          client: mockClient,
        }),
      ).rejects.toThrow('[fetchBalance] Missing required parameter: "tableName"')
    })

    it('should return null when body or data has no balance', async () => {
      const mockPostForm = vi.fn().mockResolvedValue({
        response: { code: '200', msg: 'empty' },
        body: undefined,
      } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await fetchBalance({
        carno: '123',
        tableId: '456',
        tableName: TableName.water,
        client: mockClient,
      })

      expect(balance).toBeNull()
    })

    it('should retry on failure and succeed if subsequent attempt succeeds', async () => {
      const mockPostForm = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          body: {
            data: {
              balance: '99.00',
            },
          },
        } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await fetchBalance({
        carno: '123',
        tableId: '456',
        tableName: TableName.water,
        retries: 3,
        backoff: 0.01, // Fast backoff for test
        client: mockClient,
      })

      expect(balance).toBe('99.00')
      expect(mockPostForm).toHaveBeenCalledTimes(2)
    })

    it('should throw error when all retries are exhausted', async () => {
      const mockPostForm = vi.fn().mockRejectedValue(new Error('Persistent server error'))

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      await expect(
        fetchBalance({
          carno: '123',
          tableId: '456',
          tableName: TableName.water,
          retries: 2,
          backoff: 0.01,
          client: mockClient,
        }),
      ).rejects.toThrow('Persistent server error')

      expect(mockPostForm).toHaveBeenCalledTimes(2)
    })
  })

  describe('getElectricityBalance and getWaterBalance', () => {
    it('should fetch electricity balance with environment variables', async () => {
      process.env.ELECTRICITY_CARNO = '2020030155,2020030155'
      process.env.ELECTRICITY_TABLE_ID = '218233ca-e17e-426c-b351-9834c4feb730'

      const mockPostForm = vi.fn().mockResolvedValue({
        body: {
          data: {
            balance: '188.30',
          },
        },
      } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await getElectricityBalance({ client: mockClient })

      expect(balance).toBe('188.30')
      expect(mockPostForm).toHaveBeenCalledTimes(1)
      const [, form, options] = mockPostForm.mock.calls[0]!
      expect(form.carno).toBe('2020030155,2020030155')
      expect(form.tableId).toBe('218233ca-e17e-426c-b351-9834c4feb730')
      expect(form.tableName).toBe('electricity')
      expect(options?.timeout).toBe(120_000)
    })

    it('should throw error when electricity environment variables are missing', async () => {
      const mockClient = { postForm: vi.fn() } as unknown as HttpClient
      await expect(getElectricityBalance({ client: mockClient })).rejects.toThrow(
        '[useEnv] Missing required environment variable: "ELECTRICITY_CARNO"',
      )
    })

    it('should fetch water balance with environment variables', async () => {
      process.env.WATER_CARNO = '13,101001763'
      process.env.WATER_TABLE_ID = '15b0b07b-9a70-4324-85fb-c16e1a806b3c'

      const mockPostForm = vi.fn().mockResolvedValue({
        body: {
          data: {
            balance: '72.49',
          },
        },
      } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await getWaterBalance({ client: mockClient })

      expect(balance).toBe('72.49')
      expect(mockPostForm).toHaveBeenCalledTimes(1)
      const [, form, options] = mockPostForm.mock.calls[0]!
      expect(form.carno).toBe('13,101001763')
      expect(form.tableId).toBe('15b0b07b-9a70-4324-85fb-c16e1a806b3c')
      expect(form.tableName).toBe('water')
      expect(options?.timeout).toBe(120_000)
    })

    it('should throw error when water environment variables are missing', async () => {
      const mockClient = { postForm: vi.fn() } as unknown as HttpClient
      await expect(getWaterBalance({ client: mockClient })).rejects.toThrow(
        '[useEnv] Missing required environment variable: "WATER_CARNO"',
      )
    })

    it('should allow overriding parameters in getElectricityBalance without env', async () => {
      const mockPostForm = vi.fn().mockResolvedValue({
        body: {
          data: {
            balance: '300.00',
          },
        },
      } satisfies BalanceResponse)

      const mockClient = {
        postForm: mockPostForm,
      } as unknown as HttpClient

      const balance = await getElectricityBalance({
        carno: 'custom_carno',
        tableId: 'custom_id',
        client: mockClient,
      })

      expect(balance).toBe('300.00')
      const [, form] = mockPostForm.mock.calls[0]!
      expect(form.carno).toBe('custom_carno')
      expect(form.tableId).toBe('custom_id')
    })
  })

  describe('runBalanceCheck', () => {
    it('should query both electricity and water balances successfully', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockResolvedValueOnce({ body: { data: { balance: '45.20' } } }),
      } as unknown as HttpClient

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient },
      })

      expect(result.success).toBe(true)
      expect(result.electricity).toBe('120.50')
      expect(result.water).toBe('45.20')
      expect(typeof result.timestamp).toBe('number')
      expect(result.errors).toBeUndefined()
    })

    it('should handle partial failures gracefully', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockRejectedValueOnce(new Error('Water query network timeout')),
      } as unknown as HttpClient

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient, retries: 1 },
      })

      expect(result.success).toBe(false)
      expect(result.electricity).toBe('120.50')
      expect(result.water).toBeNull()
      expect(result.errors?.water).toBeDefined()
    })

    it('should respect selective checking options', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'

      const mockClient = {
        postForm: vi.fn().mockResolvedValue({ body: { data: { balance: '150.00' } } }),
      } as unknown as HttpClient

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: false,
      })

      expect(result.success).toBe(true)
      expect(result.electricity).toBe('150.00')
      expect(result.water).toBeUndefined()
      expect(mockClient.postForm).toHaveBeenCalledTimes(1)
    })

    it('should send notification via sendToBark with custom group and icon', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockResolvedValueOnce({ body: { data: { balance: '45.20' } } }),
      } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient },
        notify: true,
        notifyTitle: '余额通知',
        notifyGroup: 'CustomGroup',
        notifyIcon: 'https://example.com/custom-icon.png',
      })

      expect(result.success).toBe(true)
      expect(spySendToBark).toHaveBeenCalledTimes(1)
      expect(spySendToBark).toHaveBeenCalledWith({
        title: '余额通知',
        body: '⚡ 电费余额: 120.50 元\n💧 水费余额: 45.20 元',
        group: 'CustomGroup',
        icon: 'https://example.com/custom-icon.png',
      })

      spySendToBark.mockRestore()
    })

    it('should send notification with defaults when notifyGroup and notifyIcon are omitted', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockResolvedValueOnce({ body: { data: { balance: '45.20' } } }),
      } as unknown as HttpClient

      const spySendToBark = vi.spyOn(barkModule, 'sendToBark').mockResolvedValue({
        code: 200,
        message: 'success',
        timestamp: 1700000000,
      })

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient },
        notify: true,
      })

      expect(result.success).toBe(true)
      expect(spySendToBark).toHaveBeenCalledTimes(1)
      expect(spySendToBark).toHaveBeenCalledWith({
        title: '水电费余额通知',
        body: '⚡ 电费余额: 120.50 元\n💧 水费余额: 45.20 元',
      })

      spySendToBark.mockRestore()
    })

    it('should send Gotify notification when notifyGotify is true', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockResolvedValueOnce({ body: { data: { balance: '45.20' } } }),
      } as unknown as HttpClient

      const spySendToGotify = vi.spyOn(gotifyModule, 'sendToGotify').mockResolvedValue({
        id: 1,
        appid: 1,
        message: '',
        priority: 5,
        date: '',
      })

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient },
        notifyGotify: true,
        notifyTitle: 'Gotify水电余额',
        gotifyPriority: 7,
      })

      expect(result.success).toBe(true)
      expect(spySendToGotify).toHaveBeenCalledTimes(1)
      expect(spySendToGotify).toHaveBeenCalledWith(
        {
          title: 'Gotify水电余额',
          message: '⚡ **电费余额**: 120.50 元\n💧 **水费余额**: 45.20 元',
          priority: 7,
          extras: {
            'client::display': { contentType: 'text/markdown' },
          },
        },
        undefined,
      )

      spySendToGotify.mockRestore()
    })

    it('should isolate Gotify notification failure without failing query success', async () => {
      process.env.ELECTRICITY_CARNO = 'elec_carno'
      process.env.ELECTRICITY_TABLE_ID = 'elec_id'
      process.env.WATER_CARNO = 'water_carno'
      process.env.WATER_TABLE_ID = 'water_id'

      const mockClient = {
        postForm: vi
          .fn()
          .mockResolvedValueOnce({ body: { data: { balance: '120.50' } } })
          .mockResolvedValueOnce({ body: { data: { balance: '45.20' } } }),
      } as unknown as HttpClient

      const spySendToGotify = vi
        .spyOn(gotifyModule, 'sendToGotify')
        .mockRejectedValue(new Error('Gotify network error'))

      const result = await runBalanceCheck({
        electricity: { client: mockClient },
        water: { client: mockClient },
        notifyGotify: true,
      })

      expect(result.success).toBe(true)
      expect(result.errors?.notifyGotify).toBeDefined()
      expect(result.errors?.notify).toBeDefined()

      spySendToGotify.mockRestore()
    })
  })

  describe('Layered Exports', () => {
    it('should properly export constants module', async () => {
      const constants = await import('#tasks/balance/constants')
      expect(constants.BASE_URL).toBeDefined()
      expect(constants.TableName).toBeDefined()
      expect(constants.COMMON_FORM).toBeDefined()
      expect(constants.HEADERS).toBeDefined()
      expect(constants.ELECTRICITY_CARNO_ENV_NAME).toBe('ELECTRICITY_CARNO')
      expect(constants.WATER_CARNO_ENV_NAME).toBe('WATER_CARNO')
    })

    it('should properly export api module', async () => {
      const api = await import('#tasks/balance/api')
      expect(api.fetchBalance).toBeTypeOf('function')
    })

    it('should properly export electricity module', async () => {
      const elec = await import('#tasks/balance/electricity')
      expect(elec.getElectricityBalance).toBeTypeOf('function')
    })

    it('should properly export water module', async () => {
      const water = await import('#tasks/balance/water')
      expect(water.getWaterBalance).toBeTypeOf('function')
    })
  })
})
