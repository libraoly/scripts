import { fileURLToPath } from 'node:url'
import { executeTask } from '../core/task'
import { formatDuration } from '../utils/format'
import { createLogger, logger } from '../utils/logger'

const scriptLogger = createLogger('example')

/**
 * 示例异步任务脚本
 */
export async function runExample(): Promise<{ success: boolean }> {
  scriptLogger.info('Starting example script...')

  const result = await executeTask({
    name: 'Sample Async Job',
    run: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { success: true }
    },
  })

  if (result.status === 'success') {
    scriptLogger.success(
      `Task "${result.name}" completed successfully in ${formatDuration(result.durationMs)}`
    )
    return result.data ?? { success: true }
  } else {
    scriptLogger.error(
      `Task "${result.name}" failed in ${formatDuration(result.durationMs)}:`,
      result.error
    )
    throw result.error ?? new Error('Task failed')
  }
}

// 仅在直接作为 CLI 脚本执行时触发，避免外部 import 时产生意外副作用
if (
  process.argv[1] &&
  (import.meta.filename === process.argv[1] || fileURLToPath(import.meta.url) === process.argv[1])
) {
  runExample().catch((err: unknown) => {
    logger.error('Fatal execution error:', err)
    process.exit(1)
  })
}
