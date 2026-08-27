import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/scripts/index.ts', 'src/scripts/*.ts'],
  format: ['esm'],
  target: 'node24',
  clean: true,
  dts: true,
  sourcemap: true,
})
