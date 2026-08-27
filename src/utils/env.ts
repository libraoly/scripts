import process from 'node:process'
import { env } from 'std-env'

// 在支持的 Node.js 运行时下自动加载工作目录的 .env 文件
try {
  process.loadEnvFile?.()
} catch {
  // 忽略 .env 文件不存在或读取异常
}

/**
 * 规范化环境变量键名（全小写并去除下划线与中划线），用于容错与模糊匹配
 */
export function normalizeEnvKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '')
}

/**
 * 宽泛地从环境变量中查找指定的值
 *
 * 匹配策略：
 * 1. 精确匹配：依次尝试候选键列表中的精确键名
 * 2. 常见前缀扩展匹配：尝试在候选键前加上 BALANCE_、EASY_LIFE_、SCRIPTS_、APP_ 等前缀
 * 3. 规范化模糊匹配：忽略大小写、下划线与中划线（例如 electricity_table_id 匹配 ELECTRICITY_TABLE_ID / electricityTableId）
 *
 * @param keys 候选键名或键名列表
 * @param fallback 默认备用值
 * @param envSource 环境变量源字典（默认采用 std-env 的运行时无关 env）
 */
export function getEnv(
  keys: string | readonly string[],
  fallback?: string,
  envSource: Record<string, string | undefined> = env
): string | undefined {
  const keyList = Array.isArray(keys) ? keys : [keys]

  // 1. 精确匹配
  for (const key of keyList) {
    const val = envSource[key]
    if (val !== undefined && val !== '') {
      return val
    }
  }

  // 2. 常见前缀扩展匹配
  const prefixes = ['BALANCE_', 'EASY_LIFE_', 'SCRIPTS_', 'APP_']
  for (const key of keyList) {
    for (const prefix of prefixes) {
      if (key.toUpperCase().startsWith(prefix)) continue
      const prefixedKey = `${prefix}${key}`
      const val = envSource[prefixedKey]
      if (val !== undefined && val !== '') {
        return val
      }
    }
  }

  // 3. 规范化模糊匹配（大小写/符号无关）
  const normalizedTargets = new Set<string>()
  for (const key of keyList) {
    normalizedTargets.add(normalizeEnvKey(key))
    for (const prefix of prefixes) {
      normalizedTargets.add(normalizeEnvKey(`${prefix}${key}`))
    }
  }

  for (const [sourceKey, sourceVal] of Object.entries(envSource)) {
    if (sourceVal !== undefined && sourceVal !== '') {
      if (normalizedTargets.has(normalizeEnvKey(sourceKey))) {
        return sourceVal
      }
    }
  }

  return fallback
}

/**
 * 获取必需的环境变量，若缺失则抛出异常
 */
export function getRequiredEnv(
  keys: string | readonly string[],
  errorMessage?: string,
  envSource: Record<string, string | undefined> = env
): string {
  const value = getEnv(keys, undefined, envSource)
  if (value === undefined || value === '') {
    const keyStr = Array.isArray(keys) ? keys.join(' | ') : keys
    throw new Error(errorMessage ?? `Missing required environment variable: [${keyStr}]`)
  }
  return value
}

export { env }
