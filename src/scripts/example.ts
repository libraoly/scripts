import { executeTask } from '../core/task.js'
import { formatDuration } from '../utils/format.js'
import { createLogger, logger } from '../utils/logger.js'

const scriptLogger = createLogger('example')

async function main(): Promise<void> {
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
  } else {
    scriptLogger.error(
      `Task "${result.name}" failed in ${formatDuration(result.durationMs)}:`,
      result.error
    )
  }
}

main().catch((err: unknown) => {
  logger.error('Fatal execution error:', err)
  process.exit(1)
})
