import type { BaseTaskFetchOptions } from '#core/client'
import type { BaseTaskNotifyOptions } from '#core/notify/types'

import type { TableName } from './constants'

export interface BalanceResponseData {
  state?: number
  msg?: string
  code?: string
  balance?: string
  tableId?: string
  bizType?: string
  rebateAmount?: string
  [key: string]: unknown
}

export interface BalanceResponseBody {
  data?: BalanceResponseData
  [key: string]: unknown
}

export interface BalanceResponse {
  response?: {
    code?: string
    msg?: string
    [key: string]: unknown
  }
  body?: BalanceResponseBody
  [key: string]: unknown
}

export interface FetchBalanceOptions extends BaseTaskFetchOptions {
  /** 卡号 / 户号 */
  carno: string
  /** 表 ID */
  tableId?: string
  /** 表类型名称：electricity / water */
  tableName?: TableName | string
  /** 自定义公共表单参数 */
  commonForm?: Record<string, string>
}

export interface BalanceCheckOptions extends BaseTaskNotifyOptions {
  /** 是否查询电费，默认 true；也可以传入自定义覆盖配置 */
  electricity?: boolean | Partial<FetchBalanceOptions>
  /** 是否查询水费，默认 true；也可以传入自定义覆盖配置 */
  water?: boolean | Partial<FetchBalanceOptions>
}

export interface BalanceCheckResult {
  /** 电费余额（如果未查询或失败可能为 null / undefined） */
  electricity?: string | null
  /** 水费余额（如果未查询或失败可能为 null / undefined） */
  water?: string | null
  /** 查询发生时间戳 */
  timestamp: number
  /** 是否全部查询成功 */
  success: boolean
  /** 错误信息记录 */
  errors?: {
    electricity?: unknown
    water?: unknown
    notify?: unknown
    notifyBark?: unknown
    notifyGotify?: unknown
    [key: string]: unknown
  }
}
