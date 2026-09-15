import consola from 'consola'

import { sendToBark, type BarkOptions } from '#core/notify/bark'
import { sendToGotify, type GotifyOptions, type GotifyPayload } from '#core/notify/gotify'

import { getElectricityBalance } from './electricity'
import type { BalanceCheckOptions, BalanceCheckResult } from './types'
import { getWaterBalance } from './water'

export * from './types'
export { getElectricityBalance } from './electricity'
export { getWaterBalance } from './water'

const logger = consola.withTag('Balance')

/**
 * 执行余额查询任务（可同时查询电费和水费，并支持 Bark / Gotify 等渠道通知与日志输出）
 *
 * @param options 运行配置选项
 * @returns 查询结果
 */
export async function runBalanceCheck(options: BalanceCheckOptions = {}): Promise<BalanceCheckResult> {
  const {
    electricity: checkElectricity = true,
    water: checkWater = true,
    bark = false,
    gotify = false,
    notifyTitle = '水电费余额通知',
    notifyMessage,
  } = options

  const shouldSendBark = Boolean(bark)
  const shouldSendGotify = Boolean(gotify)

  let electricityBalance: string | null = null
  let waterBalance: string | null = null
  let success = true
  const errors: NonNullable<BalanceCheckResult['errors']> = {}

  if (checkElectricity) {
    try {
      const opt = typeof checkElectricity === 'object' ? checkElectricity : undefined
      electricityBalance = await getElectricityBalance(opt)
      logger.info(`电费余额: ${electricityBalance ?? '无数据'} 元`)
    } catch (error) {
      success = false
      errors.electricity = error
      logger.error('查询电费余额失败:', error)
    }
  }

  if (checkWater) {
    try {
      const opt = typeof checkWater === 'object' ? checkWater : undefined
      waterBalance = await getWaterBalance(opt)
      logger.info(`水费余额: ${waterBalance ?? '无数据'} 元`)
    } catch (error) {
      success = false
      errors.water = error
      logger.error('查询水费余额失败:', error)
    }
  }

  // 1. 发送 Bark 渠道通知
  if (shouldSendBark) {
    try {
      const lines: string[] = []
      if (checkElectricity) {
        lines.push(`⚡ 电费余额: ${electricityBalance ?? '查询失败'} 元`)
      }
      if (checkWater) {
        lines.push(`💧 水费余额: ${waterBalance ?? '查询失败'} 元`)
      }
      const body = notifyMessage ?? lines.join('\n')

      const barkOpt: BarkOptions | undefined = typeof bark === 'object' && bark !== null ? bark : undefined

      const barkPayload = {
        title: notifyTitle,
        body,
        ...(barkOpt?.group ? { group: barkOpt.group } : {}),
        ...(barkOpt?.icon ? { icon: barkOpt.icon } : {}),
        ...(barkOpt?.url ? { url: barkOpt.url } : {}),
        ...(barkOpt?.level ? { level: barkOpt.level } : {}),
        ...(barkOpt?.sound ? { sound: barkOpt.sound } : {}),
        ...(barkOpt?.badge !== undefined ? { badge: barkOpt.badge } : {}),
      }

      if (barkOpt) {
        await sendToBark(barkPayload, barkOpt)
      } else {
        await sendToBark(barkPayload)
      }
      logger.success('Bark 通知发送成功')
    } catch (error) {
      errors.notify = error
      errors.notifyBark = error
      logger.warn('发送 Bark 通知失败:', error)
    }
  }

  // 2. 发送 Gotify 渠道通知
  if (shouldSendGotify) {
    try {
      const lines: string[] = []
      if (checkElectricity) {
        lines.push(`⚡ **电费余额**: ${electricityBalance ?? '查询失败'} 元`)
      }
      if (checkWater) {
        lines.push(`💧 **水费余额**: ${waterBalance ?? '查询失败'} 元`)
      }
      const message = notifyMessage ?? lines.join('\n')

      const gotifyOpt: GotifyOptions | undefined = typeof gotify === 'object' && gotify !== null ? gotify : undefined

      const priority = typeof gotifyOpt?.priority === 'number' ? gotifyOpt.priority : undefined

      const gotifyPayload: GotifyPayload = {
        title: notifyTitle,
        message,
        ...(priority !== undefined ? { priority } : {}),
        extras: {
          'client::display': { contentType: 'text/markdown' },
        },
      }

      if (gotifyOpt) {
        await sendToGotify(gotifyPayload, gotifyOpt)
      } else {
        await sendToGotify(gotifyPayload)
      }
      logger.success('Gotify 通知发送成功')
    } catch (error) {
      errors.notifyGotify = error
      if (!errors.notify) {
        errors.notify = error
      }
      logger.warn('发送 Gotify 通知失败:', error)
    }
  }

  const result: BalanceCheckResult = {
    timestamp: Date.now(),
    success,
    ...(checkElectricity ? { electricity: electricityBalance } : {}),
    ...(checkWater ? { water: waterBalance } : {}),
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  }

  return result
}
