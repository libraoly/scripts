import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    test: {
      projects: [
        {
          test: {
            name: 'unit',
            include: ['test/unit/*.{test,spec}.ts'],
            environment: 'node',
            env,
          },
        },
        {
          test: {
            name: 'e2e',
            include: ['test/e2e/*.{test,spec}.ts'],
            environment: 'node',
            testTimeout: 180_000,
            hookTimeout: 30_000,
            fileParallelism: false,
            maxConcurrency: 1,
            env,
          },
        },
      ],
    },
  }
})
