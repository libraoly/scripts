import { format } from 'date-fns'

import {
  DEFAULT_RAPID_CHANGE_THRESHOLD,
  TITLE_IN_STOCK,
  TITLE_NO_STOCK,
  TITLE_OUT_OF_STOCK,
  TITLE_RAPID_DECREASE,
  TITLE_STOCK_INCREASED,
} from './constants'
import type { EvaStockCheckOptions, EvaStockEventType, SkuStockEvent, SkuStockInfo, SkuStockRecord } from './types'

export interface DetermineEventOptions {
  rapidChangeThreshold?: number
  date?: Date | number
}

/**
 * 根据最新查询结果与上一次存储的历史记录，判定当前库存状态变动事件
 *
 * @param current 当前查询到的 SKU 库存信息
 * @param previous 上一次保存的记录（若首次查询则可能为 null 或 undefined）
 * @param options 配置选项
 */
export function determineStockEvent(
  current: SkuStockInfo,
  previous?: SkuStockRecord | null,
  options: DetermineEventOptions = {},
): SkuStockEvent {
  const { rapidChangeThreshold = DEFAULT_RAPID_CHANGE_THRESHOLD, date = new Date() } = options
  const targetDate = typeof date === 'number' ? new Date(date) : date
  const formattedTime = format(targetDate, 'yyyy-MM-dd HH:mm:ss')
  const timestamp = targetDate.getTime()

  const currentStock = current.stock
  const previousStock = previous?.stock
  const diff = previousStock !== undefined ? currentStock - previousStock : 0

  let eventType: EvaStockEventType
  let title: string
  let message: string

  if (previousStock === undefined) {
    eventType = 'INITIAL'
    if (currentStock > 0) {
      title = TITLE_IN_STOCK
      message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`
    } else {
      title = TITLE_NO_STOCK
      message = `【${current.skuName}】当前暂无现货 (0 件)，持续缺货中。\n${formattedTime}`
    }
  } else if (previousStock === 0 && currentStock > 0) {
    eventType = 'RESTOCKED'
    title = TITLE_IN_STOCK
    message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`
  } else if (previousStock > 0 && currentStock === 0) {
    eventType = 'OUT_OF_STOCK'
    title = TITLE_OUT_OF_STOCK
    message = `【${current.skuName}】当前已售罄无货 (0 件)，已从有库存转为缺货。\n${formattedTime}`
  } else if (previousStock > currentStock && currentStock > 0 && Math.abs(diff) >= rapidChangeThreshold) {
    eventType = 'RAPID_DECREASE'
    title = TITLE_RAPID_DECREASE
    message = `【${current.skuName}】库存剧烈变动：从 ${previousStock} 件快速减至 ${currentStock} 件（减少 ${Math.abs(diff)} 件），库存紧张请尽快选购！\n${formattedTime}`
  } else if (currentStock > previousStock && previousStock > 0) {
    eventType = 'STOCK_INCREASED'
    title = TITLE_STOCK_INCREASED
    message = `【${current.skuName}】库存增加补货：从 ${previousStock} 件增至 ${currentStock} 件（增加 ${diff} 件），点击立即打开领克 App 选购！\n${formattedTime}`
  } else if (currentStock > 0) {
    eventType = 'STILL_IN_STOCK'
    title = TITLE_IN_STOCK
    message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`
  } else {
    eventType = 'STILL_OUT_OF_STOCK'
    title = TITLE_NO_STOCK
    message = `【${current.skuName}】当前暂无现货 (0 件)，持续缺货中。\n${formattedTime}`
  }

  return {
    skuId: current.skuId,
    skuName: current.skuName,
    eventType,
    previousStock,
    currentStock,
    diff,
    timestamp,
    formattedTime,
    title,
    message,
  }
}

/**
 * 判断指定 SKU 事件是否应当触发通知推送
 */
export function shouldNotifySku(event: SkuStockEvent, options: EvaStockCheckOptions): boolean {
  const { notify = false, notifyGotify = false, notifyPolicy = 'onChange', onlyInStock } = options

  if (!notify && !notifyGotify) {
    return false
  }

  // 若显式指定 onlyInStock 为 true，则当前库存 <= 0 均不推送
  if (onlyInStock === true && event.currentStock <= 0) {
    return false
  }

  switch (notifyPolicy) {
    case 'always':
      return true

    case 'inStock':
      return event.currentStock > 0

    case 'onChange':
    default:
      if (
        event.eventType === 'RESTOCKED' ||
        event.eventType === 'OUT_OF_STOCK' ||
        event.eventType === 'RAPID_DECREASE' ||
        event.eventType === 'STOCK_INCREASED'
      ) {
        return true
      }

      if (event.eventType === 'INITIAL') {
        return event.currentStock > 0 || onlyInStock === false
      }

      return false
  }
}
