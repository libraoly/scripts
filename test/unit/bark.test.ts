import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { sendToBark, createBarkClient, type BarkPayload } from '#core/bark'
import { httpClient, type HttpClient } from '#core/client'

describe('Bark Push Notification Client', () => {
  let mockPost: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BARK_API_BASE
    delete process.env.BARK_DEVICE_KEY
    delete process.env.BARK_DEVICE_KEYS

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
    delete process.env.BARK_DEVICE_KEYS
  })

  describe('Single Device Key Routing (Full URL)', () => {
    it('should route to full URL when single key provided via options.deviceKey', async () => {
      const res = await sendToBark('Hello World', {
        apiBase: 'https://api.day.app',
        deviceKey: 'my_test_key',
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

    it('should route to full URL when single key provided in payload.device_key', async () => {
      await sendToBark({
        title: 'Notice',
        body: 'Alert Message',
        device_key: 'device_key_123',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/device_key_123',
        expect.objectContaining({
          json: {
            title: 'Notice',
            body: 'Alert Message',
          },
        }),
      )
    })

    it('should route to full URL when single key array provided in payload.device_keys', async () => {
      await sendToBark({
        title: 'Notice',
        body: 'Alert Message',
        device_keys: ['single_key'],
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/single_key',
        expect.objectContaining({
          json: {
            title: 'Notice',
            body: 'Alert Message',
          },
        }),
      )
    })

    it('should route to full URL when resolved from BARK_DEVICE_KEY environment variable', async () => {
      process.env.BARK_DEVICE_KEY = 'env_device_key'

      await sendToBark('Env Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/env_device_key',
        expect.objectContaining({
          json: {
            body: 'Env Test',
          },
        }),
      )
    })

    it('should support full payload with markdown and custom fields via single key', async () => {
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
        deviceKey: 'my_test_key',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/my_test_key',
        expect.objectContaining({
          json: payload,
        }),
      )
    })
  })

  describe('Multiple Device Keys Routing (/push)', () => {
    it('should route to /push when device_keys array contains multiple keys in payload', async () => {
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

    it('should route to /push when options.deviceKeys has multiple keys', async () => {
      await sendToBark('Batch from options', {
        deviceKeys: ['k1', 'k2'],
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Batch from options',
            device_keys: ['k1', 'k2'],
          },
        }),
      )
    })

    it('should route to /push when options.deviceKey is comma-separated string', async () => {
      await sendToBark('Comma keys', {
        deviceKey: 'k1, k2, k3',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Comma keys',
            device_keys: ['k1', 'k2', 'k3'],
          },
        }),
      )
    })

    it('should route to /push when options.deviceKey is string array with multiple items', async () => {
      await sendToBark('Array keys', {
        deviceKey: ['k1', 'k2'],
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Array keys',
            device_keys: ['k1', 'k2'],
          },
        }),
      )
    })

    it('should route to /push when environment variable BARK_DEVICE_KEY contains multiple comma-separated keys', async () => {
      process.env.BARK_DEVICE_KEY = 'env1, env2'

      await sendToBark('Multi Env Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Multi Env Test',
            device_keys: ['env1', 'env2'],
          },
        }),
      )
    })

    it('should route to /push when environment variable BARK_DEVICE_KEYS is used', async () => {
      process.env.BARK_DEVICE_KEYS = 'key_a, key_b'

      await sendToBark('BARK_DEVICE_KEYS Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'BARK_DEVICE_KEYS Test',
            device_keys: ['key_a', 'key_b'],
          },
        }),
      )
    })

    it('should merge and deduplicate when both BARK_DEVICE_KEY and BARK_DEVICE_KEYS are set simultaneously', async () => {
      process.env.BARK_DEVICE_KEY = 'key_1, key_overlap'
      process.env.BARK_DEVICE_KEYS = 'key_2, key_overlap'

      await sendToBark('Dual Env Merge Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Dual Env Merge Test',
            device_keys: ['key_2', 'key_overlap', 'key_1'],
          },
        }),
      )
    })
  })

  describe('Host Normalization and Error Handling', () => {
    it('should normalize trailing slashes and /push in apiBase host', async () => {
      await sendToBark('Normalize Host Test', {
        apiBase: 'https://custom.bark.host/push/',
        deviceKey: 'my_key',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://custom.bark.host/my_key',
        expect.objectContaining({
          json: { body: 'Normalize Host Test' },
        }),
      )
    })

    it('should throw error when base host URL is invalid', async () => {
      await expect(
        sendToBark('Invalid Host', {
          apiBase: 'not-a-valid-url',
          deviceKey: 'my_key',
        }),
      ).rejects.toThrow(/Invalid base host URL/i)
    })

    it('should throw error when device key is missing from all sources', async () => {
      await expect(
        sendToBark('No Key Test', {
          apiBase: 'https://api.day.app',
        }),
      ).rejects.toThrow(/Missing device_key/i)
    })

    it('should throw error when Bark server returns non-200 code', async () => {
      mockPost.mockResolvedValueOnce({
        code: 400,
        message: 'failed to get device token',
        timestamp: 1700000000,
      })

      await expect(
        sendToBark('Failed Test', {
          deviceKey: 'invalid_key',
        }),
      ).rejects.toThrow(/Bark request failed \[400\]: failed to get device token/)
    })
  })

  describe('createBarkClient & Custom HTTP Client', () => {
    it('should create client with default options via createBarkClient', async () => {
      const client = createBarkClient({
        apiBase: 'https://api.day.app',
        deviceKey: 'client_key',
      })

      await client.send('Message via Client')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/client_key',
        expect.objectContaining({
          json: {
            body: 'Message via Client',
          },
        }),
      )
    })

    it('should support custom HttpClient instance in sendToBark', async () => {
      const customPost = vi.fn().mockResolvedValue({
        code: 200,
        message: 'ok',
        timestamp: 1700000000,
      })
      const customClient = { post: customPost } as unknown as HttpClient

      await sendToBark('Custom Client Message', {
        deviceKey: 'custom_key',
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

    it('should support custom HttpClient in createBarkClient', async () => {
      const customPost = vi.fn().mockResolvedValue({
        code: 200,
        message: 'ok',
        timestamp: 1700000000,
      })
      const customClient = { post: customPost } as unknown as HttpClient

      const client = createBarkClient({
        deviceKey: 'custom_key',
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
})
