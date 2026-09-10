import { useEnv } from '#core/env'

import { fetchBalance } from './api'
import { ELECTRICITY_CARNO_ENV_NAME, ELECTRICITY_TABLE_ID_ENV_NAME, TableName } from './constants'
import type { FetchBalanceOptions } from './types'

/**
 * 查询电费余额
 *
 * @param options 可选覆盖配置
 * @returns 余额字符串或 null
 */
export async function getElectricityBalance(options?: Partial<FetchBalanceOptions>): Promise<string | null> {
  const carno = options?.carno ?? useEnv<string>(ELECTRICITY_CARNO_ENV_NAME)
  const tableId = options?.tableId ?? useEnv<string>(ELECTRICITY_TABLE_ID_ENV_NAME)

  return fetchBalance({
    carno,
    tableId,
    tableName: TableName.electricity,
    timeout: 120,
    retries: 10,
    backoff: 30,
    ...options,
  })
}
