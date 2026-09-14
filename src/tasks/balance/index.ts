import consola from 'consola'

import { sendToBark } from '#core/bark'
import { sendToGotify } from '#core/gotify'

import { getElectricityBalance } from './electricity'
import type { BalanceCheckOptions, BalanceCheckResult } from './types'
import { getWaterBalance } from './water'

const logger = consola.withTag('Balance')

/**
 * 执行余额查询任务（可同时查询电费和水费，并支持 Bark / Gotify 通知与日志输出）
 *
 * @param options 运行配置选项
 * @returns 查询结果
 */
export async function runBalanceCheck(options: BalanceCheckOptions = {}): Promise<BalanceCheckResult> {
  const {
    electricity: checkElectricity = true,
    water: checkWater = true,
    notify = false,
    notifyTitle = '水电费余额通知',
    notifyGroup,
    notifyIcon,
    notifyGotify = false,
    gotifyPriority,
  } = options

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

  if (notify) {
    try {
      const lines: string[] = []
      if (checkElectricity) {
        lines.push(`⚡ 电费余额: ${electricityBalance ?? '查询失败'} 元`)
      }
      if (checkWater) {
        lines.push(`💧 水费余额: ${waterBalance ?? '查询失败'} 元`)
      }
      const body = lines.join('\n')
      await sendToBark({
        title: notifyTitle,
        body,
        ...(notifyGroup ? { group: notifyGroup } : {}),
        ...(notifyIcon ? { icon: notifyIcon } : {}),
      })
      logger.success('Bark 通知发送成功')
    } catch (error) {
      errors.notify = error
      errors.notifyBark = error
      logger.warn('发送 Bark 通知失败:', error)
    }
  }

  if (notifyGotify) {
    try {
      const lines: string[] = []
      if (checkElectricity) {
        lines.push(`⚡ **电费余额**: ${electricityBalance ?? '查询失败'} 元`)
      }
      if (checkWater) {
        lines.push(`💧 **水费余额**: ${waterBalance ?? '查询失败'} 元`)
      }
      const message = lines.join('\n')
      const gotifyOpt = typeof notifyGotify === 'object' ? notifyGotify : undefined
      await sendToGotify(
        {
          title: notifyTitle,
          message,
          ...(gotifyPriority !== undefined ? { priority: gotifyPriority } : {}),
          extras: {
            'client::display': { contentType: 'text/markdown' },
          },
        },
        gotifyOpt,
      )
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
