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
