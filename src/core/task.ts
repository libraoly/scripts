import type { TaskOptions, TaskResult } from '../types/index.js'

/**
 * 执行指定任务并返回结构化执行结果
 */
export async function executeTask<T>(task: TaskOptions<T>): Promise<TaskResult<T>> {
  const startTime = performance.now()
  try {
    const data = await task.run()
    const durationMs = performance.now() - startTime
    return {
      name: task.name,
      status: 'success',
      data,
      durationMs,
    }
  } catch (err) {
    const durationMs = performance.now() - startTime
    return {
      name: task.name,
      status: 'failed',
      error: err instanceof Error ? err : new Error(String(err)),
      durationMs,
    }
  }
}
