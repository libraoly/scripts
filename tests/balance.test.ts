import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import ky from 'ky'
import {
  defaultClient,
  fetchBalance,
  getElectricityBalance,
  getWaterBalance,
  runBalanceCheck,
} from '../src/scripts/balance'

let stderrSpy: ReturnType<typeof vi.spyOn>

beforeAll(() => {
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
})

afterAll(() => {
  stderrSpy.mockRestore()
})

function createTestClient(fetchFn: typeof globalThis.fetch) {
  return ky.create({
    fetch: fetchFn,
    retry: 0,
  })
}

describe('fetchBalance', () => {
  it('应当成功发送请求并解析返回的余额数据', async () => {
    const mockFetch = vi.fn().mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      expect(req.url).toContain('data.aspx')
      const body = await req.clone().text()
      expect(body).toContain('carno=test-carno')
      expect(body).toContain('tableId=test-table-id')
      expect(body).toContain('tableName=electricity')

      return new Response(
        JSON.stringify({
          body: {
            data: {
              balance: '128.50',
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    })

    const client = createTestClient(mockFetch)
    const balance = await fetchBalance('test-carno', 'test-table-id', 'electricity', client)

    expect(balance).toBe('128.50')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('当响应结构中无 balance 时应当返回 null', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          body: {
            data: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const client = createTestClient(mockFetch)
    const balance = await fetchBalance('test-carno', 'test-table-id', 'water', client)

    expect(balance).toBeNull()
  })

  it('当服务端返回 500 时应当抛出错误', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      })
    )

    const client = createTestClient(mockFetch)
    await expect(fetchBalance('test-carno', 'test-table-id', 'electricity', client)).rejects.toThrow()
  })
})

describe('getElectricityBalance & getWaterBalance', () => {
  it('未设置环境变量时应当抛出明确提示', async () => {
    delete process.env.BALANCE_ELECTRICITY_TABLE_ID
    delete process.env.ELECTRICITY_TABLE_ID
    delete process.env.BALANCE_WATER_TABLE_ID
    delete process.env.WATER_TABLE_ID

    await expect(getElectricityBalance()).rejects.toThrow('缺少环境变量 BALANCE_ELECTRICITY_TABLE_ID')
    await expect(getWaterBalance()).rejects.toThrow('缺少环境变量 BALANCE_WATER_TABLE_ID')
  })

  it('设置环境变量后能够直接运行并传入对应 tableId', async () => {
    process.env.BALANCE_ELECTRICITY_TABLE_ID = 'env-elec-id-999'
    process.env.BALANCE_WATER_TABLE_ID = 'env-water-id-888'

    const mockFetch = vi.fn().mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      const body = await req.clone().text()
      const isElectricity = body.includes('tableName=electricity')

      if (isElectricity) {
        expect(body).toContain('tableId=env-elec-id-999')
        expect(body).toContain('carno=2020030155%2C2020030155')
      } else {
        expect(body).toContain('tableId=env-water-id-888')
        expect(body).toContain('carno=13%2C101001763')
      }

      return new Response(
        JSON.stringify({
          body: {
            data: {
              balance: isElectricity ? '260.00' : '48.50',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const client = createTestClient(mockFetch)

    const elecBalance = await getElectricityBalance(client)
    const waterBalance = await getWaterBalance(client)

    expect(elecBalance).toBe('260.00')
    expect(waterBalance).toBe('48.50')

    delete process.env.BALANCE_ELECTRICITY_TABLE_ID
    delete process.env.BALANCE_WATER_TABLE_ID
  })
})

describe('runBalanceCheck', () => {
  it('设置环境变量后 runBalanceCheck 聚合查询电费和水费', async () => {
    process.env.BALANCE_ELECTRICITY_TABLE_ID = 'env-elec-id-999'
    process.env.BALANCE_WATER_TABLE_ID = 'env-water-id-888'

    const mockFetch = vi.fn().mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init)
      const body = await req.clone().text()
      const balance = body.includes('electricity') ? '199.90' : '45.20'
      return new Response(
        JSON.stringify({
          body: {
            data: {
              balance,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const client = createTestClient(mockFetch)
    const result = await runBalanceCheck(client)

    expect(result).toEqual({
      electricity: '199.90',
      water: '45.20',
    })

    delete process.env.BALANCE_ELECTRICITY_TABLE_ID
    delete process.env.BALANCE_WATER_TABLE_ID
  })

  it('当未配置环境变量时能够安全捕获并记录失败任务', async () => {
    delete process.env.BALANCE_ELECTRICITY_TABLE_ID
    delete process.env.ELECTRICITY_TABLE_ID
    delete process.env.BALANCE_WATER_TABLE_ID
    delete process.env.WATER_TABLE_ID

    const result = await runBalanceCheck()
    expect(result.electricity).toBeNull()
    expect(result.water).toBeNull()
  })
})
