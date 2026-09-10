import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { sendToBark, createBarkClient, type BarkPayload } from '#core/bark'
import { httpClient, type HttpClient } from '#core/client'

describe('Bark Push Notification Client', () => {
  let mockPost: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BARK_API_BASE
    delete process.env.BARK_DEVICE_KEY

    mockPost = vi.spyOn(httpClient, 'post').mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: 1700000000,
    })
  })

  afterEach(() => {
    mockPost?.mockRestore()
    delete process.env.BARK_API_BASE
    delete process.env.BARK_DEVICE_KEY
  })

  it('should send simple string message to base URL with key', async () => {
    const res = await sendToBark('Hello World', {
      apiBase: 'https://api.day.app/my_test_key',
    })

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/my_test_key',
      expect.objectContaining({
        json: {
          body: 'Hello World',
        },
      }),
    )
    expect(res).toEqual({
      code: 200,
      message: 'success',
      timestamp: 1700000000,
    })
  })

  it('should send full payload with markdown and optional parameters', async () => {
    const payload: BarkPayload = {
      title: 'Alert Title',
      subtitle: 'Alert Subtitle',
      body: 'Alert Body',
      markdown: '# Alert Markdown',
      level: 'timeSensitive',
      volume: 8,
      badge: 2,
      call: '1',
      autoCopy: '1',
      copy: 'copy content',
      sound: 'minuet',
      icon: 'https://example.com/icon.png',
      image: 'https://example.com/image.png',
      group: 'system-alerts',
      ciphertext: 'secret',
      isArchive: 1,
      ttl: 3600,
      url: 'https://example.com',
      action: 'alert',
      id: 'msg-001',
      delete: '1',
    }

    await sendToBark(payload, {
      apiBase: 'https://api.day.app/my_test_key',
    })

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/my_test_key',
      expect.objectContaining({
        json: payload,
      }),
    )
  })

  it('should route to /push endpoint when apiBase is root domain and device_key is provided', async () => {
    await sendToBark(
      {
        title: 'Title',
        body: 'Body',
        device_key: 'device_key_123',
      },
      {
        apiBase: 'https://api.day.app',
      },
    )

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/push',
      expect.objectContaining({
        json: {
          title: 'Title',
          body: 'Body',
          device_key: 'device_key_123',
        },
      }),
    )
  })

  it('should use device_keys for batch push to /push', async () => {
    await sendToBark(
      {
        body: 'Batch notification',
        device_keys: ['key1', 'key2', 'key3'],
      },
      {
        apiBase: 'https://api.day.app',
      },
    )

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/push',
      expect.objectContaining({
        json: {
          body: 'Batch notification',
          device_keys: ['key1', 'key2', 'key3'],
        },
      }),
    )
  })

  it('should resolve device key from options or environment variable', async () => {
    process.env.BARK_DEVICE_KEY = 'env_device_key'

    await sendToBark('Env Test', {
      apiBase: 'https://api.day.app',
    })

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/push',
      expect.objectContaining({
        json: {
          body: 'Env Test',
          device_key: 'env_device_key',
        },
      }),
    )
  })

  it('should throw error when device key is missing and base URL has no key path', async () => {
    await expect(
      sendToBark('No Key Test', {
        apiBase: 'https://api.day.app',
      }),
    ).rejects.toThrow(/device_key/i)
  })

  it('should create client with default options via createBarkClient', async () => {
    const client = createBarkClient({
      apiBase: 'https://api.day.app',
      deviceKey: 'client_key',
    })

    await client.send('Message via Client')

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.day.app/push',
      expect.objectContaining({
        json: {
          body: 'Message via Client',
          device_key: 'client_key',
        },
      }),
    )
  })

  it('should throw error when Bark server returns non-200 code', async () => {
    mockPost.mockResolvedValueOnce({
      code: 400,
      message: 'failed to get device token',
      timestamp: 1700000000,
    })

    await expect(
      sendToBark('Failed Test', {
        apiBase: 'https://api.day.app/invalid_key',
      }),
    ).rejects.toThrow(/Bark request failed \[400\]: failed to get device token/)
  })

  it('should support custom HttpClient instance', async () => {
    const customPost = vi.fn().mockResolvedValue({
      code: 200,
      message: 'ok',
      timestamp: 1700000000,
    })
    const customClient = { post: customPost } as unknown as HttpClient

    await sendToBark('Custom Client Message', {
      apiBase: 'https://api.day.app/custom_key',
      client: customClient,
    })

    expect(customPost).toHaveBeenCalledWith(
      'https://api.day.app/custom_key',
      expect.objectContaining({
        json: {
          body: 'Custom Client Message',
        },
      }),
    )
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('should allow custom HttpClient in createBarkClient', async () => {
    const customPost = vi.fn().mockResolvedValue({
      code: 200,
      message: 'ok',
      timestamp: 1700000000,
    })
    const customClient = { post: customPost } as unknown as HttpClient

    const client = createBarkClient({
      apiBase: 'https://api.day.app/custom_key',
      client: customClient,
    })

    await client.send('Message')
    expect(customPost).toHaveBeenCalledWith(
      'https://api.day.app/custom_key',
      expect.objectContaining({
        json: { body: 'Message' },
      }),
    )
    expect(mockPost).not.toHaveBeenCalled()
  })
})
