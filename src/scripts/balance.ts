import { fileURLToPath } from 'node:url'
import ky, { type KyInstance } from 'ky'
import { executeTask } from '../core/task'
import type { BalanceApiResponse, BalanceResult } from '../types'
import { getRequiredEnv } from '../utils/env'
import { formatDuration } from '../utils/format'
import { createLogger, logger } from '../utils/logger'

const scriptLogger = createLogger('balance')

const BASE_URL = 'http://system.es-it.cn/WebSolution/EasyLife/data.aspx'

const HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'http://system.es-it.cn',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.62',
}

const COMMON_FORM = {
  method: 'BuildRequest',
  propertyKey: 'changye',
  redirect: 'QueyThreeTableBalance',
  areaId: '3287eecc-7fe5-468c-a2db-ec98aeaefb04',
}

/**
 * 默认 ky 请求客户端实例
 */
export const defaultClient = ky.create({
  headers: HEADERS,
  timeout: 120_000,
  retry: {
    limit: 3,
    methods: ['post', 'get'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
    retryOnTimeout: true,
  },
})

/**
 * 查询表具余额
 * @param carno 户号 / 房号
 * @param tableId 表具 ID
 * @param tableName 表具类型标识 (如 electricity / water)
 * @param client 可选自定义 ky 客户端实例
 */
export async function fetchBalance(
  carno: string,
  tableId: string,
  tableName: string,
  client: KyInstance = defaultClient
): Promise<string | null> {
  const form = new URLSearchParams({
    ...COMMON_FORM,
    carno,
    tableId,
    tableName,
  })

  const res = await client
    .post(BASE_URL, {
      body: form,
    })
    .json<BalanceApiResponse>()

  return res?.body?.data?.balance ? String(res.body.data.balance) : null
}

/**
 * 查询电费余额（从环境变量读取 tableId）
 */
export async function getElectricityBalance(
  client: KyInstance = defaultClient
): Promise<string | null> {
  const tableId = getRequiredEnv(
    ['BALANCE_ELECTRICITY_TABLE_ID', 'ELECTRICITY_TABLE_ID'],
    '缺少环境变量 BALANCE_ELECTRICITY_TABLE_ID，无法查询电费余额'
  )
  return fetchBalance('2020030155,2020030155', tableId, 'electricity', client)
}

/**
 * 查询水费余额（从环境变量读取 tableId）
 */
export async function getWaterBalance(
  client: KyInstance = defaultClient
): Promise<string | null> {
  const tableId = getRequiredEnv(
    ['BALANCE_WATER_TABLE_ID', 'WATER_TABLE_ID'],
    '缺少环境变量 BALANCE_WATER_TABLE_ID，无法查询水费余额'
  )
  return fetchBalance('13,101001763', tableId, 'water', client)
}

/**
 * 运行完整的表具余额查询任务
 */
export async function runBalanceCheck(
  client: KyInstance = defaultClient
): Promise<BalanceResult> {
  scriptLogger.info('Starting balance check task...')

  const [electricityTask, waterTask] = await Promise.all([
    executeTask({
      name: 'Query Electricity Balance',
      run: () => getElectricityBalance(client),
    }),
    executeTask({
      name: 'Query Water Balance',
      run: () => getWaterBalance(client),
    }),
  ])

  if (electricityTask.status === 'success') {
    scriptLogger.success(
      `Electricity balance: ${electricityTask.data ?? 'N/A'} (took ${formatDuration(electricityTask.durationMs)})`
    )
  } else {
    scriptLogger.error(
      `Failed to query electricity balance (took ${formatDuration(electricityTask.durationMs)}):`,
      electricityTask.error?.message ?? electricityTask.error
    )
  }

  if (waterTask.status === 'success') {
    scriptLogger.success(
      `Water balance: ${waterTask.data ?? 'N/A'} (took ${formatDuration(waterTask.durationMs)})`
    )
  } else {
    scriptLogger.error(
      `Failed to query water balance (took ${formatDuration(waterTask.durationMs)}):`,
      waterTask.error?.message ?? waterTask.error
    )
  }

  return {
    electricity: electricityTask.status === 'success' ? electricityTask.data ?? null : null,
    water: waterTask.status === 'success' ? waterTask.data ?? null : null,
  }
}

// 仅在直接作为 CLI 脚本执行时触发，避免外部 import 时产生意外副作用
if (
  process.argv[1] &&
  (import.meta.filename === process.argv[1] || fileURLToPath(import.meta.url) === process.argv[1])
) {
  runBalanceCheck().catch((err: unknown) => {
    logger.error('Fatal balance execution error:', err)
    process.exit(1)
  })
}
