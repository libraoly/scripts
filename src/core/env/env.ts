import { destr } from 'destr'
import { env } from 'std-env'

export function useEnv<T = unknown>(key: string, fallback: T | undefined = undefined): T {
  const rawValue = env[key]

  if (rawValue === undefined && fallback === undefined) {
    throw new Error(`[useEnv] Missing required environment variable: "${key}"`)
  }

  if (rawValue === undefined && fallback !== undefined) {
    return fallback
  }

  return destr<T>(rawValue)
}
