import { rm } from 'node:fs/promises'

import { describe, it, expect, afterAll } from 'vitest'

import { createFileStorage, DEFAULT_STORAGE_BASE, storage, STORAGE_BASE_DIR_ENV_NAME } from '#core/storage'

describe('Core Storage Module (unstorage + fsDriver)', () => {
  const testBase = './.data/test-storage'
  const testStorage = createFileStorage({ base: testBase })

  afterAll(async () => {
    await testStorage.clear()
    await rm(testBase, { recursive: true, force: true }).catch(() => {})
  })

  it('should define default storage constants', () => {
    expect(DEFAULT_STORAGE_BASE).toBe('./.data')
    expect(STORAGE_BASE_DIR_ENV_NAME).toBe('STORAGE_BASE_DIR')
  })

  it('should create functional storage instance', async () => {
    expect(testStorage).toBeDefined()
    expect(typeof testStorage.getItem).toBe('function')
    expect(typeof testStorage.setItem).toBe('function')
  })

  it('should correctly save, read, check, and remove items', async () => {
    const key = 'test:key'
    const value = { name: 'Eva', stock: 10, valid: true }

    await testStorage.setItem(key, value)
    expect(await testStorage.hasItem(key)).toBe(true)

    const retrieved = await testStorage.getItem<typeof value>(key)
    expect(retrieved).toEqual(value)

    await testStorage.removeItem(key)
    expect(await testStorage.hasItem(key)).toBe(false)
  })

  it('should export default singleton storage instance', () => {
    expect(storage).toBeDefined()
    expect(typeof storage.getItem).toBe('function')
  })
})
