import type { HttpClient, KyOptions } from '#core/client'

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

export interface FetchBalanceOptions {
  /** 卡号 / 户号 */
  carno: string
  /** 表 ID */
  tableId?: string
  /** 表类型名称：electricity / water */
  tableName?: TableName | string
  /** 超时时间（秒或毫秒，默认 60 秒） */
  timeout?: number
  /** 最大尝试次数（包含第一次，默认 3 次） */
  retries?: number
  /** 指数退避基数（秒，默认 5 秒） */
  backoff?: number
  /** 自定义请求目标 URL */
  baseUrl?: string
  /** 自定义公共表单参数 */
  commonForm?: Record<string, string>
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient
  /** 自定义 ky 配置选项 */
  kyOptions?: KyOptions
}

export interface BalanceCheckOptions {
  /** 是否查询电费，默认 true；也可以传入自定义覆盖配置 */
  electricity?: boolean | Partial<FetchBalanceOptions>
  /** 是否查询水费，默认 true；也可以传入自定义覆盖配置 */
  water?: boolean | Partial<FetchBalanceOptions>
  /** 是否发送 Bark 推送通知，默认 false */
  notify?: boolean
  /** 自定义 Bark 标题，默认 '水电费余额通知' */
  notifyTitle?: string
  /** 自定义 Bark 分组名 */
  notifyGroup?: string
  /** 自定义 Bark 图标 URL */
  notifyIcon?: string
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
  }
}
