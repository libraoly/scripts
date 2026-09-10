import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    balance: 'src/tasks/balance/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  exports: true,
  publint: true,
  attw: true,
})
