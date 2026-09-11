import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { describe, it, expect } from 'vitest'

import { BALANCE_REGEX, hasBalanceEnv } from './helpers'

const execFileAsync = promisify(execFile)
const nodeRequire = createRequire(import.meta.url)

describe('E2E: Built Bundle & Subprocess Execution', () => {
  describe('ESM Bundle (dist/balance.mjs)', () => {
    it('should export runBalanceCheck from ESM bundle', async () => {
      const bundle = await import('../../dist/balance.mjs')
      expect(typeof bundle.runBalanceCheck).toBe('function')
    })

    it.skipIf(!hasBalanceEnv())('should successfully execute runBalanceCheck from ESM bundle', async () => {
      const { runBalanceCheck } = await import('../../dist/balance.mjs')
      const result = await runBalanceCheck({ notify: false })

      expect(result.success).toBe(true)
      expect(typeof result.electricity).toBe('string')
      expect(result.electricity).toMatch(BALANCE_REGEX)
      expect(typeof result.water).toBe('string')
      expect(result.water).toMatch(BALANCE_REGEX)
    })
  })

  describe('CommonJS Bundle (dist/balance.cjs)', () => {
    it('should export runBalanceCheck from CJS bundle', () => {
      const bundlePath = resolve(import.meta.dirname, '../../dist/balance.cjs')
      const bundle = nodeRequire(bundlePath)
      expect(typeof bundle.runBalanceCheck).toBe('function')
    })

    it.skipIf(!hasBalanceEnv())('should successfully execute runBalanceCheck from CJS bundle', async () => {
      const bundlePath = resolve(import.meta.dirname, '../../dist/balance.cjs')
      const { runBalanceCheck } = nodeRequire(bundlePath)
      const result = await runBalanceCheck({ notify: false })

      expect(result.success).toBe(true)
      expect(typeof result.electricity).toBe('string')
      expect(result.electricity).toMatch(BALANCE_REGEX)
      expect(typeof result.water).toBe('string')
      expect(result.water).toMatch(BALANCE_REGEX)
    })
  })

  describe('Root Entry Exports (dist/index.mjs & dist/index.cjs)', () => {
    it('should export runBalanceCheck from root ESM entry', async () => {
      const indexMjs = await import('../../dist/index.mjs')
      expect(typeof indexMjs.runBalanceCheck).toBe('function')
      // 验证 core 基础设施严禁对外导出
      expect((indexMjs as Record<string, unknown>).sendToBark).toBeUndefined()
      expect((indexMjs as Record<string, unknown>).httpClient).toBeUndefined()
      expect((indexMjs as Record<string, unknown>).useEnv).toBeUndefined()
    })

    it('should export runBalanceCheck from root CJS entry', () => {
      const indexPath = resolve(import.meta.dirname, '../../dist/index.cjs')
      const indexCjs = nodeRequire(indexPath)
      expect(typeof indexCjs.runBalanceCheck).toBe('function')
      // 验证 core 基础设施严禁对外导出
      expect(indexCjs.sendToBark).toBeUndefined()
      expect(indexCjs.httpClient).toBeUndefined()
      expect(indexCjs.useEnv).toBeUndefined()
    })
  })

  describe('CLI / Standalone Subprocess Execution', () => {
    it.skipIf(!hasBalanceEnv())(
      'should run balance check successfully in a standalone Node.js process with --env-file',
      async () => {
        const rootDir = resolve(import.meta.dirname, '../..')
        const code = `
          import('./dist/balance.mjs').then(m => m.runBalanceCheck({ notify: false })).then(res => {
            if (!res.success) {
              console.error('Balance check failed:', res);
              process.exit(1);
            }
            console.log('SUCCESS_RESULT:', JSON.stringify(res));
          }).catch(err => {
            console.error('Fatal execution error:', err);
            process.exit(1);
          });
        `

        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          ['--env-file=.env', '--input-type=module', '-e', code],
          { cwd: rootDir, timeout: 120_000 },
        )

        expect(stderr).toBe('')
        expect(stdout).toContain('SUCCESS_RESULT:')
        expect(stdout).toContain('"success":true')
      },
    )
  })
})
