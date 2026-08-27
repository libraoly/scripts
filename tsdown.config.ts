import { readdirSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { defineConfig } from 'tsdown'

// 自动扫描并提取 src/scripts 下的所有独立脚本作为平铺的构建入口
const scriptFiles = readdirSync('src/scripts').filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.d.ts')
)

const scriptEntries = Object.fromEntries(
  scriptFiles.map((file) => [basename(file, extname(file)), `src/scripts/${file}`])
)

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ...scriptEntries,
  },
  format: ['esm'],
  target: 'node24',
  clean: true,
  dts: true,
  sourcemap: true,
})
