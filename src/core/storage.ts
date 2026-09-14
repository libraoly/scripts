import { createStorage, type Storage, type StorageValue } from 'unstorage'
import fsDriver, { type FSStorageOptions } from 'unstorage/drivers/fs'

import { useEnv } from '#core/env'

export const STORAGE_BASE_DIR_ENV_NAME = 'STORAGE_BASE_DIR'
export const DEFAULT_STORAGE_BASE = './.data'

export interface StorageOptions extends FSStorageOptions {
  base?: string
}

/**
 * 创建基于文件系统 (fs) 的通用持久化存储实例
 *
 * @param options 配置项（默认 base 为 ./.data）
 */
export function createFileStorage(options: StorageOptions = {}): Storage {
  const base = options.base ?? useEnv<string>(STORAGE_BASE_DIR_ENV_NAME, DEFAULT_STORAGE_BASE)
  return createStorage({
    driver: fsDriver({
      base,
      ...options,
    }),
  })
}

/**
 * 默认核心文件持久化存储实例
 */
export const storage: Storage = createFileStorage()

export type { Storage, StorageValue }
export default storage
