import type { KyInstance } from 'ky'
import { describe, it, expect, vi } from 'vitest'

import { createHttpClient, httpClient, toURLSearchParams } from '#core/client'

describe('toURLSearchParams helper', () => {
  it('should convert an object to URLSearchParams ignoring null and undefined', () => {
    const params = toURLSearchParams({
      foo: 'bar',
      count: 42,
      active: true,
      skipNull: null,
      skipUndefined: undefined,
    })

    expect(params.toString()).toBe('foo=bar&count=42&active=true')
  })

  it('should return existing URLSearchParams as-is', () => {
    const original = new URLSearchParams({ a: '1', b: '2' })
    const result = toURLSearchParams(original)
    expect(result).toBe(original)
  })
})

describe('Generic HttpClient', () => {
  it('should export a default httpClient instance', () => {
    expect(httpClient).toBeDefined()
    expect(typeof httpClient.get).toBe('function')
    expect(typeof httpClient.post).toBe('function')
    expect(typeof httpClient.postForm).toBe('function')
    expect(typeof httpClient.put).toBe('function')
    expect(typeof httpClient.patch).toBe('function')
    expect(typeof httpClient.delete).toBe('function')
    expect(typeof httpClient.extend).toBe('function')
    expect(typeof httpClient.request).toBe('function')
  })

  it('should create custom client via createHttpClient', () => {
    const custom = createHttpClient({ timeout: 5000 })
    expect(custom).toBeDefined()
    expect(typeof custom.postForm).toBe('function')
    expect(custom.raw).toBeDefined()
  })

  it('should delegate postForm with URLSearchParams body', async () => {
    const mockPost = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ success: true }),
    })
    const fakeKy = {
      post: mockPost,
    } as unknown as KyInstance

    const client = createHttpClient({ kyInstance: fakeKy })
    const result = await client.postForm('https://example.com/api', {
      user: 'alice',
      id: 123,
    })

    expect(result).toEqual({ success: true })
    expect(mockPost).toHaveBeenCalledTimes(1)
    const [url, options] = mockPost.mock.calls[0]!
    expect(url).toBe('https://example.com/api')
    expect(options.body).toBeInstanceOf(URLSearchParams)
    expect((options.body as URLSearchParams).toString()).toBe('user=alice&id=123')
  })

  it('should delegate get and parse json', async () => {
    const mockGet = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ data: 'ok' }),
    })
    const fakeKy = {
      get: mockGet,
    } as unknown as KyInstance

    const client = createHttpClient({ kyInstance: fakeKy })
    const res = await client.get('https://example.com/items')
    expect(res).toEqual({ data: 'ok' })
    expect(mockGet).toHaveBeenCalledWith('https://example.com/items', undefined)
  })

  it('should delegate post and parse json', async () => {
    const mockPost = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({ created: true }),
    })
    const fakeKy = {
      post: mockPost,
    } as unknown as KyInstance

    const client = createHttpClient({ kyInstance: fakeKy })
    const res = await client.post('https://example.com/items', { json: { name: 'widget' } })
    expect(res).toEqual({ created: true })
    expect(mockPost).toHaveBeenCalledWith('https://example.com/items', { json: { name: 'widget' } })
  })

  it('should delegate put, patch, delete and parse json', async () => {
    const mockPut = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue('put-ok') })
    const mockPatch = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue('patch-ok') })
    const mockDelete = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue('delete-ok') })

    const fakeKy = {
      put: mockPut,
      patch: mockPatch,
      delete: mockDelete,
    } as unknown as KyInstance

    const client = createHttpClient({ kyInstance: fakeKy })
    await expect(client.put('https://example.com')).resolves.toBe('put-ok')
    await expect(client.patch('https://example.com')).resolves.toBe('patch-ok')
    await expect(client.delete('https://example.com')).resolves.toBe('delete-ok')
  })

  it('should support extend to create derived client', () => {
    const mockExtend = vi.fn().mockReturnValue({} as KyInstance)
    const fakeKy = {
      extend: mockExtend,
    } as unknown as KyInstance

    const client = createHttpClient({ kyInstance: fakeKy })
    client.extend({ headers: { Authorization: 'Bearer token' } })
    expect(mockExtend).toHaveBeenCalledWith({ headers: { Authorization: 'Bearer token' } })
  })
})
