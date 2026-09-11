import { describe, it, expect, afterEach } from 'vitest'

import { httpClient } from '#core/client'
import { runBalanceCheck } from '#tasks/balance'
import { fetchBalance } from '#tasks/balance/api'
import { TableName } from '#tasks/balance/constants'
import { getElectricityBalance } from '#tasks/balance/electricity'
import { getWaterBalance } from '#tasks/balance/water'

import { BALANCE_REGEX, hasBalanceEnv, hasBarkEnv, sleep } from './helpers'

describe('E2E: Balance Query Live Execution', () => {
  // 每个真实请求之间预留短暂延时，防止对目标物业服务器造成高频请求压力
  afterEach(async () => {
    await sleep(500)
  })

  describe('Live Bark Service Connectivity', () => {
    it('should successfully reach Bark server ping endpoint', async () => {
      const response = await httpClient.get<{ code: number; message: string }>('https://api.day.app/ping')
      expect(response).toBeDefined()
      expect(response.code).toBe(200)
      expect(response.message).toBe('pong')
    })
  })

  describe('Live Balance Queries', () => {
    it.skipIf(!hasBalanceEnv())(
      'should query both electricity and water balances via runBalanceCheck with real credentials',
      async () => {
        const startTime = Date.now() - 5000
        const result = await runBalanceCheck({ notify: false })

        expect(result.success).toBe(true)
        expect(typeof result.electricity).toBe('string')
        expect(result.electricity).toMatch(BALANCE_REGEX)
        expect(typeof result.water).toBe('string')
        expect(result.water).toMatch(BALANCE_REGEX)
        expect(result.timestamp).toBeGreaterThanOrEqual(startTime)
        expect(result.errors).toBeUndefined()
      },
    )

    it.skipIf(!hasBalanceEnv())('should selectively query only electricity balance via runBalanceCheck', async () => {
      const result = await runBalanceCheck({
        electricity: true,
        water: false,
        notify: false,
      })

      expect(result.success).toBe(true)
      expect(typeof result.electricity).toBe('string')
      expect(result.electricity).toMatch(BALANCE_REGEX)
      expect(result.water).toBeUndefined()
      expect(result.errors).toBeUndefined()
    })

    it.skipIf(!hasBalanceEnv())('should selectively query only water balance via runBalanceCheck', async () => {
      const result = await runBalanceCheck({
        electricity: false,
        water: true,
        notify: false,
      })

      expect(result.success).toBe(true)
      expect(result.electricity).toBeUndefined()
      expect(typeof result.water).toBe('string')
      expect(result.water).toMatch(BALANCE_REGEX)
      expect(result.errors).toBeUndefined()
    })

    it.skipIf(!hasBalanceEnv())(
      'should execute getElectricityBalance directly with environment variables',
      async () => {
        const balance = await getElectricityBalance()
        expect(typeof balance).toBe('string')
        expect(balance).toMatch(BALANCE_REGEX)
      },
    )

    it.skipIf(!hasBalanceEnv())('should execute getWaterBalance directly with environment variables', async () => {
      const balance = await getWaterBalance()
      expect(typeof balance).toBe('string')
      expect(balance).toMatch(BALANCE_REGEX)
    })

    it.skipIf(!hasBalanceEnv())(
      'should execute fetchBalance directly with explicit electricity parameters',
      async () => {
        const balance = await fetchBalance({
          carno: process.env.ELECTRICITY_CARNO!,
          tableId: process.env.ELECTRICITY_TABLE_ID!,
          tableName: TableName.electricity,
        })

        expect(typeof balance).toBe('string')
        expect(balance).toMatch(BALANCE_REGEX)
      },
    )

    it.skipIf(!hasBalanceEnv())('should execute fetchBalance directly with explicit water parameters', async () => {
      const balance = await fetchBalance({
        carno: process.env.WATER_CARNO!,
        tableId: process.env.WATER_TABLE_ID!,
        tableName: TableName.water,
      })

      expect(typeof balance).toBe('string')
      expect(balance).toMatch(BALANCE_REGEX)
    })

    it.skipIf(!hasBalanceEnv())('should return null or handle gracefully when querying invalid table ID', async () => {
      const balance = await fetchBalance({
        carno: '9999999999,9999999999',
        tableId: '00000000-0000-0000-0000-000000000000',
        tableName: TableName.electricity,
        retries: 1,
      })

      expect(balance).toBeNull()
    })
  })

  describe('Live Bark Notification Push', () => {
    it.runIf(hasBarkEnv())('should send live push notification when BARK_DEVICE_KEY is set', async () => {
      const result = await runBalanceCheck({
        notify: true,
        notifyTitle: '[E2E Test] 水电费余额巡检测试',
      })

      expect(result.success).toBe(true)
      expect(result.errors?.notify).toBeUndefined()
    })
  })
})
