import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { httpClient, type HttpClient } from '#core/client'
import {
  sendToBark,
  createBarkClient,
  type BarkPayload,
  DEFAULT_BARK_GROUP,
  DEFAULT_BARK_ICON,
} from '#core/notify/bark'

describe('Bark Push Notification Client', () => {
  let mockPost: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BARK_API_BASE
    delete process.env.BARK_DEVICE_KEYS
    delete process.env.BARK_GROUP
    delete process.env.BARK_ICON

    mockPost = vi.spyOn(httpClient, 'post').mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: 1700000000,
    })
  })

  afterEach(() => {
    mockPost?.mockRestore()
    delete process.env.BARK_API_BASE
    delete process.env.BARK_DEVICE_KEYS
    delete process.env.BARK_GROUP
    delete process.env.BARK_ICON
  })

  describe('Single Device Key Routing (Full URL)', () => {
    it('should route to full URL when single key provided via options.deviceKeys', async () => {
      const res = await sendToBark('Hello World', {
        apiBase: 'https://api.day.app',
        deviceKeys: ['my_test_key'],
      })

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/my_test_key',
        expect.objectContaining({
          json: {
            body: 'Hello World',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should route to full URL when resolved from BARK_DEVICE_KEYS environment variable', async () => {
      process.env.BARK_DEVICE_KEYS = 'env_device_key'

      await sendToBark('Env Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/env_device_key',
        expect.objectContaining({
          json: {
            body: 'Env Test',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
        deviceKeys: ['my_test_key'],
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
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should route to /push when environment variable BARK_DEVICE_KEYS contains multiple comma-separated keys', async () => {
      process.env.BARK_DEVICE_KEYS = 'env1, env2'

      await sendToBark('Multi Env Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Multi Env Test',
            device_keys: ['env1', 'env2'],
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should route to /push when environment variable BARK_DEVICE_KEYS is a JSON array string', async () => {
      process.env.BARK_DEVICE_KEYS = '["key_a", "key_b"]'

      await sendToBark('BARK_DEVICE_KEYS JSON Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'BARK_DEVICE_KEYS JSON Test',
            device_keys: ['key_a', 'key_b'],
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should deduplicate keys when BARK_DEVICE_KEYS contains repeated keys', async () => {
      process.env.BARK_DEVICE_KEYS = 'key_1, key_2, key_1'

      await sendToBark('Deduplication Test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/push',
        expect.objectContaining({
          json: {
            body: 'Deduplication Test',
            device_keys: ['key_1', 'key_2'],
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })
  })

  describe('Host Normalization and Error Handling', () => {
    it('should normalize trailing slashes and /push in apiBase host', async () => {
      await sendToBark('Normalize Host Test', {
        apiBase: 'https://custom.bark.host/push/',
        deviceKeys: ['my_key'],
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://custom.bark.host/my_key',
        expect.objectContaining({
          json: {
            body: 'Normalize Host Test',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should throw error when base host URL is invalid', async () => {
      await expect(
        sendToBark('Invalid Host', {
          apiBase: 'not-a-valid-url',
          deviceKeys: ['my_key'],
        }),
      ).rejects.toThrow(/Invalid base host URL/i)
    })

    it('should throw error when device key is missing from all sources', async () => {
      await expect(
        sendToBark('No Key Test', {
          apiBase: 'https://api.day.app',
        }),
      ).rejects.toThrow(/Missing device_keys/i)
    })

    it('should throw error when Bark server returns non-200 code', async () => {
      mockPost.mockResolvedValueOnce({
        code: 400,
        message: 'failed to get device token',
        timestamp: 1700000000,
      })

      await expect(
        sendToBark('Failed Test', {
          deviceKeys: ['invalid_key'],
        }),
      ).rejects.toThrow(/Bark request failed \[400\]: failed to get device token/)
    })
  })

  describe('createBarkClient & Custom HTTP Client', () => {
    it('should create client with default options via createBarkClient', async () => {
      const client = createBarkClient({
        apiBase: 'https://api.day.app',
        deviceKeys: ['client_key'],
      })

      await client.send('Message via Client')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/client_key',
        expect.objectContaining({
          json: {
            body: 'Message via Client',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
        deviceKeys: ['custom_key'],
        client: customClient,
      })

      expect(customPost).toHaveBeenCalledWith(
        'https://api.day.app/custom_key',
        expect.objectContaining({
          json: {
            body: 'Custom Client Message',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
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
        deviceKeys: ['custom_key'],
        client: customClient,
      })

      await client.send('Message')
      expect(customPost).toHaveBeenCalledWith(
        'https://api.day.app/custom_key',
        expect.objectContaining({
          json: {
            body: 'Message',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
      expect(mockPost).not.toHaveBeenCalled()
    })
  })

  describe('Default Group and Icon Configuration', () => {
    it('should attach default group and icon when none are provided', async () => {
      await sendToBark('Default test', { deviceKeys: ['test_key'] })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Default test',
            group: DEFAULT_BARK_GROUP,
            icon: DEFAULT_BARK_ICON,
          },
        }),
      )
    })

    it('should allow overriding group and icon via options', async () => {
      await sendToBark('Options override test', {
        deviceKeys: ['test_key'],
        group: 'CustomOptionsGroup',
        icon: 'https://example.com/custom-options.png',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Options override test',
            group: 'CustomOptionsGroup',
            icon: 'https://example.com/custom-options.png',
          },
        }),
      )
    })

    it('should allow overriding group and icon via payload', async () => {
      await sendToBark(
        {
          body: 'Payload override test',
          group: 'CustomPayloadGroup',
          icon: 'https://example.com/custom-payload.png',
        },
        {
          deviceKeys: ['test_key'],
          group: 'ShouldBeOverriddenGroup',
          icon: 'https://example.com/should-be-overridden.png',
        },
      )

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Payload override test',
            group: 'CustomPayloadGroup',
            icon: 'https://example.com/custom-payload.png',
          },
        }),
      )
    })

    it('should read group and icon from environment variables', async () => {
      process.env.BARK_GROUP = 'EnvGroup'
      process.env.BARK_ICON = 'https://example.com/env-icon.png'

      await sendToBark('Env test', { deviceKeys: ['test_key'] })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Env test',
            group: 'EnvGroup',
            icon: 'https://example.com/env-icon.png',
          },
        }),
      )
    })

    it('should prioritize options over environment variables', async () => {
      process.env.BARK_GROUP = 'EnvGroup'
      process.env.BARK_ICON = 'https://example.com/env-icon.png'

      await sendToBark('Options vs Env test', {
        deviceKeys: ['test_key'],
        group: 'OptionsGroup',
        icon: 'https://example.com/options-icon.png',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Options vs Env test',
            group: 'OptionsGroup',
            icon: 'https://example.com/options-icon.png',
          },
        }),
      )
    })

    it('should configure default group and icon via createBarkClient', async () => {
      const client = createBarkClient({
        deviceKeys: ['test_key'],
        group: 'ClientDefaultGroup',
        icon: 'https://example.com/client-icon.png',
      })

      await client.send('Message via configured client')

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.day.app/test_key',
        expect.objectContaining({
          json: {
            body: 'Message via configured client',
            group: 'ClientDefaultGroup',
            icon: 'https://example.com/client-icon.png',
          },
        }),
      )
    })
  })
})
