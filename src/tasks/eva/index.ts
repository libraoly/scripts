import consola from 'consola'

import { sendToBark } from '#core/bark'
import { storage as defaultStorage } from '#core/storage'

import { fetchEvaStock } from './api'
import { DEFAULT_BARK_GROUP, DEFAULT_BARK_LEVEL, DEFAULT_JUMP_URL, EVA_SKU_MAP, EVA_STORAGE_PREFIX } from './constants'
import { determineStockEvent, shouldNotifySku } from './events'
import type { EvaStockCheckOptions, EvaStockCheckResult, SkuStockEvent, SkuStockInfo, SkuStockRecord } from './types'

export * from './constants'
export * from './events'
export * from './types'
export { fetchEvaStock }

const logger = consola.withTag('Eva')

/**
 * 格式化 SKU 列表输入为统一的 [skuId, skuName] 二维数组
 */
function resolveSkuEntries(skus?: EvaStockCheckOptions['skus']): Array<[string, string]> {
  if (!skus) {
    return Object.entries(EVA_SKU_MAP)
  }

  if (Array.isArray(skus)) {
    return skus.map((skuId) => {
      const id = String(skuId)
      const name = (EVA_SKU_MAP as Record<string, string>)[id] ?? `SKU ${id}`
      return [id, name]
    })
  }

  return Object.entries(skus).map(([id, name]) => [String(id), String(name)])
}

/**
 * 执行领克商城 Eva 机器人库存监控巡检
 *
 * @param options 任务调度配置选项
 * @returns 巡检聚合结果（包含各 SKU 当前库存、状态转移事件、历史记录及通知错误）
 */
export async function runEvaStockCheck(options: EvaStockCheckOptions = {}): Promise<EvaStockCheckResult> {
  const {
    skus,
    itemId,
    fetchOptions,
    saveRecord = true,
    storage = defaultStorage,
    rapidChangeThreshold,
    notifyTitle,
    notifyMessage,
    notifyGroup = DEFAULT_BARK_GROUP,
    notifyUrl = DEFAULT_JUMP_URL,
    notifyLevel = DEFAULT_BARK_LEVEL,
    notifyIcon,
  } = options

  const skuEntries = resolveSkuEntries(skus)
  const stocks: Record<string, SkuStockInfo> = {}
  const events: Record<string, SkuStockEvent> = {}
  const records: Record<string, SkuStockRecord> = {}
  const errors: NonNullable<EvaStockCheckResult['errors']> = {}
  let success = true

  for (const [skuId, fallbackName] of skuEntries) {
    try {
      const info = await fetchEvaStock({
        skuId,
        ...(itemId ? { itemId } : {}),
        ...fetchOptions,
      })

      if (fallbackName && (!info.skuName || info.skuName.startsWith('SKU '))) {
        info.skuName = fallbackName
      }

      stocks[skuId] = info
      const statusText = info.inStock ? `现货 ${info.stock} 件` : '缺货 (0 件)'
      logger.info(`[${info.skuName}] 当前库存: ${statusText}`)

      // 1. 读取历史记录并判定状态转移事件
      const storageKey = `${EVA_STORAGE_PREFIX}:${skuId}`
      const previous = await storage.getItem<SkuStockRecord>(storageKey)
      const event = determineStockEvent(info, previous, { rapidChangeThreshold })
      events[skuId] = event

      // 2. 构造新记录并在开启时持久化保存
      const record: SkuStockRecord = {
        skuId: info.skuId,
        skuName: info.skuName,
        stock: info.stock,
        inStock: info.inStock,
        price: info.price,
        warnStatus: info.warnStatus,
        timestamp: event.timestamp,
        formattedTime: event.formattedTime,
      }
      records[skuId] = record

      if (saveRecord) {
        await storage.setItem(storageKey, record)
      }

      // 3. 不同 SKU 分开发送通知
      if (shouldNotifySku(event, options)) {
        const title = typeof notifyTitle === 'function' ? notifyTitle(event) : (notifyTitle ?? event.title)
        const body = typeof notifyMessage === 'function' ? notifyMessage(event) : (notifyMessage ?? event.message)

        try {
          await sendToBark({
            title,
            body,
            url: notifyUrl,
            group: notifyGroup,
            level: notifyLevel,
            ...(notifyIcon ? { icon: notifyIcon } : {}),
          })
          logger.success(`[${info.skuName}] Bark 通知发送成功 (${event.eventType}): ${title}`)
        } catch (err) {
          errors[`notify:${skuId}`] = err
          logger.warn(`[${info.skuName}] 发送 Bark 通知失败:`, err)
        }
      }
    } catch (error) {
      success = false
      errors[skuId] = error
      logger.error(`[SKU ${skuId}] 查询库存失败:`, error)
    }
  }

  const hasStock = Object.values(stocks).some((item) => item.inStock)

  const result: EvaStockCheckResult = {
    hasStock,
    stocks,
    events,
    records,
    timestamp: Date.now(),
    success,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  }

  return result
}
