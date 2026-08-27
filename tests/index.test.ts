import { describe, it, expect } from 'vitest'
import { runExample } from '../src/index'
import { executeTask } from '../src/core/task'
import { formatDuration } from '../src/utils/format'
import { createLogger, logger } from '../src/utils/logger'

describe('formatDuration', () => {
  it('应当正确格式化小于 1 秒的毫秒数', () => {
    expect(formatDuration(50)).toBe('50ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('应当正确格式化大于等于 1 秒的耗时', () => {
    expect(formatDuration(1500)).toBe('1.50s')
    expect(formatDuration(2000)).toBe('2.00s')
  })
})

describe('executeTask', () => {
  it('应当成功执行任务并返回结构化数据', async () => {
    const result = await executeTask({
      name: 'test-success',
      run: async () => 'hello world',
    })

    expect(result.name).toBe('test-success')
    expect(result.status).toBe('success')
    expect(result.data).toBe('hello world')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
  })

  it('应当捕获异常并返回失败状态', async () => {
    const result = await executeTask({
      name: 'test-failure',
      run: () => {
        throw new Error('boom')
      },
    })

    expect(result.name).toBe('test-failure')
    expect(result.status).toBe('failed')
    expect(result.error?.message).toBe('boom')
    expect(result.data).toBeUndefined()
  })
})

describe('logger', () => {
  it('应当导出可用的全局 logger 实例', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.success).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('应当能够创建带有特定 Tag 的子 logger', () => {
    const subLogger = createLogger('sub-module')
    expect(subLogger).toBeDefined()
    expect(typeof subLogger.info).toBe('function')
  })
})

describe('scripts exports', () => {
  it('应当能正常调用从主包导出的 script 方法', async () => {
    const res = await runExample()
    expect(res).toEqual({ success: true })
  })
})
