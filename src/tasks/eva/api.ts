import { httpClient, toURLSearchParams } from '#core/client'
import { useEnv } from '#core/env'
import { sleep } from '#core/utils'

import {
  BASE_URL,
  DEFAULT_APP_CODE,
  DEFAULT_CITY_ID,
  DEFAULT_HEADERS,
  DEFAULT_ITEM_ID,
  DEFAULT_PROVINCE_ID,
  DEFAULT_REGION_ID,
  EVA_APP_CODE_ENV_NAME,
  EVA_ITEM_ID_ENV_NAME,
  EVA_SKU_MAP,
  EVA_TOKEN_ENV_NAME,
  EVA_USER_ID_ENV_NAME,
} from './constants'
import type { EvaDynamicResponse, FetchEvaStockOptions, SkuStockInfo } from './types'

/**
 * 查询领克商城指定 SKU 的 Eva 机器人库存（内置指数退避重试机制）
 *
 * @param options 查询配置参数
 * @returns SKU 库存信息实体
 */
export async function fetchEvaStock(options: FetchEvaStockOptions): Promise<SkuStockInfo> {
  const {
    skuId: rawSkuId,
    provinceId = DEFAULT_PROVINCE_ID,
    cityId = DEFAULT_CITY_ID,
    regionId = DEFAULT_REGION_ID,
    timeout = 30,
    retries = 3,
    backoff = 2,
    headers,
    baseUrl = BASE_URL,
    client = httpClient,
    kyOptions,
  } = options

  const skuId = String(rawSkuId ?? '').trim()
  if (!skuId) {
    throw new Error('[fetchEvaStock] Missing required parameter: "skuId"')
  }

  const itemId = String(options.itemId ?? useEnv<string>(EVA_ITEM_ID_ENV_NAME, DEFAULT_ITEM_ID))
  const userId = options.userId ?? useEnv<string>(EVA_USER_ID_ENV_NAME, '')
  const appCode = options.appCode ?? useEnv<string>(EVA_APP_CODE_ENV_NAME, DEFAULT_APP_CODE)
  const token = options.token ?? useEnv<string>(EVA_TOKEN_ENV_NAME, '')

  const queryParams: Record<string, string> = {
    provinceId,
    cityId,
    regionId,
    itemId,
    skuId,
  }
  if (userId) {
    queryParams.userId = userId
  }

  const searchParams = toURLSearchParams(queryParams)
  const targetUrl = `${baseUrl}?${searchParams.toString()}`

  const requestHeaders: Record<string, string> = {
    ...DEFAULT_HEADERS,
    Authorization: `APPCODE ${appCode}`,
    ...headers,
  }
  if (token) {
    requestHeaders.token = token
    requestHeaders.svcsid = token
  }

  const timeoutMs = timeout < 1000 ? timeout * 1000 : timeout
  let lastError: unknown = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const raw = await client.get<EvaDynamicResponse>(targetUrl, {
        headers: requestHeaders,
        timeout: timeoutMs,
        ...kyOptions,
      })

      const skuData = raw?.data
      const stock = typeof skuData?.selectedSkuStock === 'number' ? skuData.selectedSkuStock : 0
      const inStock = stock > 0
      const skuName = (EVA_SKU_MAP as Record<string, string>)[skuId] ?? `SKU ${skuId}`

      return {
        skuId,
        skuName,
        stock,
        inStock,
        price: skuData?.price,
        originalPrice: skuData?.originalPrice,
        warnStatus: skuData?.warnStatus,
      }
    } catch (error) {
      lastError = error

      if (attempt >= retries) {
        throw error
      }

      const delayMs = Math.max(0, backoff ** attempt * 1000)
      if (delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error('[fetchEvaStock] Unexpected execution termination without result')
}
