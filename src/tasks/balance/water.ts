import { useEnv } from '#core/env'

import { fetchBalance } from './api'
import { TableName, WATER_CARNO_ENV_NAME, WATER_TABLE_ID_ENV_NAME } from './constants'
import type { FetchBalanceOptions } from './types'

/**
 * 查询水费余额
 *
 * @param options 可选覆盖配置
 * @returns 余额字符串或 null
 */
export async function getWaterBalance(options?: Partial<FetchBalanceOptions>): Promise<string | null> {
  const carno = options?.carno ?? useEnv<string>(WATER_CARNO_ENV_NAME)
  const tableId = options?.tableId ?? useEnv<string>(WATER_TABLE_ID_ENV_NAME)

  return fetchBalance({
    carno,
    tableId,
    tableName: TableName.water,
    timeout: 120,
    retries: 5,
    ...options,
  })
}
