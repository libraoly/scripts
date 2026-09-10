import { httpClient } from '#core/client'
import { sleep } from '#core/utils'

import { BASE_URL, COMMON_FORM, HEADERS } from './constants'
import type { BalanceResponse, FetchBalanceOptions } from './types'

/**
 * 查询余额（带自动重试与指数退避）
 *
 * @param options 查询参数及配置
 * @returns 余额字符串或 null
 */
export async function fetchBalance(options: FetchBalanceOptions): Promise<string | null> {
  const {
    carno,
    timeout = 60,
    retries = 3,
    backoff = 5,
    commonForm = COMMON_FORM,
    headers = HEADERS,
    client = httpClient,
    kyOptions,
  } = options

  const { tableId, tableName: tableNameRaw } = options
  const tableName =
    typeof tableNameRaw === 'object' && tableNameRaw !== null && 'value' in tableNameRaw
      ? String((tableNameRaw as { value: unknown }).value)
      : String(tableNameRaw ?? '')

  if (!carno) {
    throw new Error('[fetchBalance] Missing required parameter: "carno"')
  }
  if (!tableId) {
    throw new Error('[fetchBalance] Missing required parameter: "tableId"')
  }
  if (!tableName) {
    throw new Error('[fetchBalance] Missing required parameter: "tableName"')
  }

  const targetUrl = options.baseUrl ?? BASE_URL

  const form: Record<string, string> = {
    ...commonForm,
    carno,
    tableId,
    tableName,
  }

  // 超时时间单位统一转换：如果小于 1000 则认为是秒，转为毫秒
  const timeoutMs = timeout < 1000 ? timeout * 1000 : timeout

  let lastError: unknown = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const raw = await client.postForm<BalanceResponse>(targetUrl, form, {
        headers,
        timeout: timeoutMs,
        ...kyOptions,
      })

      if (raw && typeof raw === 'object' && 'body' in raw && raw.body && 'data' in raw.body && raw.body.data) {
        return raw.body.data.balance ?? null
      }

      return null
    } catch (error) {
      lastError = error

      // 最后一次尝试失败直接抛出
      if (attempt >= retries) {
        throw error
      }

      // 指数退避：backoff ** attempt 秒
      const delayMs = Math.max(0, backoff ** attempt * 1000)
      if (delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}
