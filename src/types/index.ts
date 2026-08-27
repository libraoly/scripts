/**
 * 任务执行状态
 */
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed'

/**
 * 任务执行结果
 */
export interface TaskResult<T = unknown> {
  readonly name: string
  readonly status: TaskStatus
  readonly data?: T
  readonly error?: Error
  readonly durationMs: number
}

/**
 * 任务定义选项
 */
export interface TaskOptions<T> {
  readonly name: string
  readonly run: () => Promise<T> | T
}

/**
 * 远程表具类型
 */
export const TableName = {
  Electricity: 'electricity',
  Water: 'water',
  Gas: 'gas',
} as const

export type TableName = (typeof TableName)[keyof typeof TableName] | string

/**
 * 余额查询参数选项
 */
export interface BalanceQueryOptions {
  readonly carno: string
  readonly tableId: string
  readonly tableName: TableName
  readonly timeoutMs?: number
  readonly timeout?: number
  readonly retries?: number
  readonly backoffSeconds?: number
  readonly backoff?: number
}

/**
 * 远程 API 响应模型
 */
export interface BalanceApiResponse {
  readonly body?: {
    readonly data?: {
      readonly balance?: string | number | null
      readonly [key: string]: unknown
    } | null
    readonly [key: string]: unknown
  } | null
  readonly [key: string]: unknown
}

/**
 * 综合余额查询结果
 */
export interface BalanceResult {
  readonly electricity: string | null
  readonly water: string | null
}

