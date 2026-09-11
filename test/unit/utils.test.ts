import { describe, it, expect, vi } from 'vitest'

import { sleep } from '#core/utils'

describe('Core Utils', () => {
  it('should resolve after specified milliseconds', async () => {
    vi.useFakeTimers()
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})
