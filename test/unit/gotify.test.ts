import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { httpClient, type HttpClient, HTTPError } from '#core/client'
import {
  sendToGotify,
  createGotifyClient,
  getGotifyVersion,
  getGotifyHealth,
  type GotifyPayload,
  DEFAULT_GOTIFY_PRIORITY,
  GOTIFY_API_BASE_ENV_NAME,
  GOTIFY_APP_TOKEN_ENV_NAME,
  GOTIFY_DEFAULT_PRIORITY_ENV_NAME,
} from '#core/notify/gotify'

describe('Gotify Push Notification Client', () => {
  let mockPost: ReturnType<typeof vi.spyOn>
  let mockGet: ReturnType<typeof vi.spyOn>

  const cleanEnv = () => {
    delete process.env.GOTIFY_API_BASE
    delete process.env.GOTIFY_URL
    delete process.env.GOTIFY_BASE_URL
    delete process.env.GOTIFY_APP_TOKEN
    delete process.env.GOTIFY_TOKEN
    delete process.env.GOTIFY_DEFAULT_PRIORITY
  }

  beforeEach(() => {
    vi.clearAllMocks()
    cleanEnv()

    mockPost = vi.spyOn(httpClient, 'post').mockResolvedValue({
      id: 101,
      appid: 1,
      message: 'success message',
      title: 'success title',
      priority: 5,
      date: '2026-09-14T12:00:00.000Z',
    })

    mockGet = vi.spyOn(httpClient, 'get').mockResolvedValue({
      version: '2.5.0',
      commit: 'abc1234',
      buildDate: '2026-09-01',
    })
  })

  afterEach(() => {
    mockPost?.mockRestore()
    mockGet?.mockRestore()
    cleanEnv()
  })

  describe('Basic Message Sending', () => {
    it('should send plain string message with default priority', async () => {
      const res = await sendToGotify('Hello Gotify', {
        apiBase: 'https://push.example.com',
        appToken: 'my_app_token',
      })

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: {
            message: 'Hello Gotify',
            priority: DEFAULT_GOTIFY_PRIORITY,
          },
          headers: {
            'X-Gotify-Key': 'my_app_token',
          },
        }),
      )
      expect(res).toEqual(
        expect.objectContaining({
          id: 101,
          appid: 1,
          message: 'success message',
        }),
      )
    })

    it('should support full GotifyPayload with custom fields', async () => {
      const payload: GotifyPayload = {
        title: 'System Alert',
        message: '**CPU usage high**',
        priority: 8,
        appid: 2,
        extras: {
          'client::display': {
            contentType: 'text/markdown',
          },
          'client::notification': {
            click: { url: 'https://monitor.example.com' },
            bigImageUrl: 'https://example.com/chart.png',
          },
          custom_meta: { key: 'value' },
        },
      }

      await sendToGotify(payload, {
        apiBase: 'https://push.example.com',
        appToken: 'my_app_token',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: payload,
          headers: {
            'X-Gotify-Key': 'my_app_token',
          },
        }),
      )
    })

    it('should use token alias in options', async () => {
      await sendToGotify('Alias test', {
        apiBase: 'https://push.example.com',
        token: 'alias_token',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          headers: {
            'X-Gotify-Key': 'alias_token',
          },
        }),
      )
    })
  })

  describe('Shortcuts and Extras Builder', () => {
    it('should configure markdown rendering when markdown: true is provided', async () => {
      await sendToGotify('# Markdown Title\nContent', {
        apiBase: 'https://push.example.com',
        appToken: 'tok',
        markdown: true,
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: {
            message: '# Markdown Title\nContent',
            priority: DEFAULT_GOTIFY_PRIORITY,
            extras: {
              'client::display': {
                contentType: 'text/markdown',
              },
            },
          },
        }),
      )
    })

    it('should configure click url and bigImageUrl via options shortcuts', async () => {
      await sendToGotify('Click me', {
        apiBase: 'https://push.example.com',
        appToken: 'tok',
        url: 'https://target.url.com',
        bigImageUrl: 'https://target.url.com/img.png',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: {
            message: 'Click me',
            priority: DEFAULT_GOTIFY_PRIORITY,
            extras: {
              'client::notification': {
                click: { url: 'https://target.url.com' },
                bigImageUrl: 'https://target.url.com/img.png',
              },
            },
          },
        }),
      )
    })

    it('should preserve explicit payload extras when combining shortcuts', async () => {
      await sendToGotify(
        {
          message: 'Combined',
          extras: {
            'client::notification': {
              click: { url: 'https://original.url' },
            },
            'android::action': {
              onReceive: { intentUrl: 'intent://test' },
            },
          },
        },
        {
          apiBase: 'https://push.example.com',
          appToken: 'tok',
          url: 'https://override-not-applied-if-already-exists',
          bigImageUrl: 'https://big.image.url',
          markdown: true,
        },
      )

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: {
            message: 'Combined',
            priority: DEFAULT_GOTIFY_PRIORITY,
            extras: {
              'client::display': {
                contentType: 'text/markdown',
              },
              'client::notification': {
                click: { url: 'https://original.url' },
                bigImageUrl: 'https://big.image.url',
              },
              'android::action': {
                onReceive: { intentUrl: 'intent://test' },
              },
            },
          },
        }),
      )
    })

    it('should set title from options if omitted in payload', async () => {
      await sendToGotify('Simple Body', {
        apiBase: 'https://push.example.com',
        appToken: 'tok',
        title: 'Option Title',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            title: 'Option Title',
            message: 'Simple Body',
          }),
        }),
      )
    })
  })

  describe('Priority Resolution', () => {
    it('should prioritize payload priority over options priority and env priority', async () => {
      process.env[GOTIFY_DEFAULT_PRIORITY_ENV_NAME] = '2'

      await sendToGotify(
        { message: 'Priority Check', priority: 9 },
        {
          apiBase: 'https://push.example.com',
          appToken: 'tok',
          priority: 6,
        },
      )

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            priority: 9,
          }),
        }),
      )
    })

    it('should prioritize options priority over env priority', async () => {
      process.env[GOTIFY_DEFAULT_PRIORITY_ENV_NAME] = '2'

      await sendToGotify('Priority Check', {
        apiBase: 'https://push.example.com',
        appToken: 'tok',
        priority: 7,
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            priority: 7,
          }),
        }),
      )
    })

    it('should fallback to env priority when neither payload nor options provide it', async () => {
      process.env[GOTIFY_DEFAULT_PRIORITY_ENV_NAME] = '3'

      await sendToGotify('Env Priority', {
        apiBase: 'https://push.example.com',
        appToken: 'tok',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://push.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            priority: 3,
          }),
        }),
      )
    })
  })

  describe('Environment Variables & Fallbacks', () => {
    it('should resolve apiBase from GOTIFY_API_BASE', async () => {
      process.env[GOTIFY_API_BASE_ENV_NAME] = 'https://env-api.example.com'
      process.env[GOTIFY_APP_TOKEN_ENV_NAME] = 'env_app_tok'

      await sendToGotify('Env test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://env-api.example.com/message',
        expect.objectContaining({
          headers: { 'X-Gotify-Key': 'env_app_tok' },
        }),
      )
    })

    it('should fallback apiBase to GOTIFY_URL', async () => {
      process.env.GOTIFY_URL = 'https://gotify-url.example.com'
      process.env[GOTIFY_APP_TOKEN_ENV_NAME] = 'env_tok'

      await sendToGotify('GOTIFY_URL test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://gotify-url.example.com/message',
        expect.objectContaining({
          headers: { 'X-Gotify-Key': 'env_tok' },
        }),
      )
    })

    it('should fallback appToken to GOTIFY_TOKEN', async () => {
      process.env[GOTIFY_API_BASE_ENV_NAME] = 'https://env.example.com'
      process.env.GOTIFY_TOKEN = 'token_fallback'

      await sendToGotify('Token fallback test')

      expect(mockPost).toHaveBeenCalledWith(
        'https://env.example.com/message',
        expect.objectContaining({
          headers: { 'X-Gotify-Key': 'token_fallback' },
        }),
      )
    })
  })

  describe('Host Normalization and URL Validation', () => {
    it('should trim trailing slashes and redundant /message suffix', async () => {
      await sendToGotify('Normalize Test', {
        apiBase: 'https://gotify.example.com/message///',
        appToken: 'tok',
      })

      expect(mockPost).toHaveBeenCalledWith('https://gotify.example.com/message', expect.anything())
    })

    it('should throw error when apiBase is missing from all sources', async () => {
      await expect(
        sendToGotify('Missing Base', {
          appToken: 'tok',
        }),
      ).rejects.toThrow(/Missing apiBase/i)
    })

    it('should throw error when base host URL is invalid', async () => {
      await expect(
        sendToGotify('Invalid URL', {
          apiBase: 'not-a-valid-http-url',
          appToken: 'tok',
        }),
      ).rejects.toThrow(/Invalid base host URL/i)
    })

    it('should throw error when app token is missing', async () => {
      await expect(
        sendToGotify('No Token', {
          apiBase: 'https://push.example.com',
        }),
      ).rejects.toThrow(/Missing app token/i)
    })
  })

  describe('Error Handling and Gotify Error Parsing', () => {
    it('should parse Gotify JSON error response from HTTPError', async () => {
      const mockResponse = {
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: 'Unauthorized',
          errorCode: 401,
          errorDescription: 'you need to provide a valid token or user / password to access this api',
        }),
      } as unknown as Response

      const httpError = new HTTPError(mockResponse, new Request('https://push.example.com/message'), {} as any)
      mockPost.mockRejectedValueOnce(httpError)

      await expect(
        sendToGotify('Error Test', {
          apiBase: 'https://push.example.com',
          appToken: 'invalid_token',
        }),
      ).rejects.toThrow(/Gotify request failed \[401\]: you need to provide a valid token/)
    })

    it('should fallback to status code and message if error JSON parsing fails', async () => {
      const mockResponse = {
        status: 502,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response

      const httpError = new HTTPError(mockResponse, new Request('https://push.example.com/message'), {} as any)
      mockPost.mockRejectedValueOnce(httpError)

      await expect(
        sendToGotify('Bad Gateway', {
          apiBase: 'https://push.example.com',
          appToken: 'tok',
        }),
      ).rejects.toThrow(/Gotify request failed \[502\]/)
    })

    it('should rethrow ordinary network or runtime errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(
        sendToGotify('Network Fail', {
          apiBase: 'https://push.example.com',
          appToken: 'tok',
        }),
      ).rejects.toThrow(/Network timeout/)
    })
  })

  describe('createGotifyClient', () => {
    it('should create client instance with preset options', async () => {
      const client = createGotifyClient({
        apiBase: 'https://client-api.example.com',
        appToken: 'client_token',
        priority: 7,
      })

      await client.send('Hello from client')

      expect(mockPost).toHaveBeenCalledWith(
        'https://client-api.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            message: 'Hello from client',
            priority: 7,
          }),
          headers: {
            'X-Gotify-Key': 'client_token',
          },
        }),
      )
    })

    it('should allow overriding client preset options in send call', async () => {
      const client = createGotifyClient({
        apiBase: 'https://client-api.example.com',
        appToken: 'client_token',
        priority: 7,
      })

      await client.send('Override call', {
        priority: 2,
        appToken: 'new_token',
      })

      expect(mockPost).toHaveBeenCalledWith(
        'https://client-api.example.com/message',
        expect.objectContaining({
          json: expect.objectContaining({
            priority: 2,
          }),
          headers: {
            'X-Gotify-Key': 'new_token',
          },
        }),
      )
    })

    it('should call getVersion and getHealth on client instance', async () => {
      const client = createGotifyClient({
        apiBase: 'https://client-api.example.com',
      })

      const version = await client.getVersion()
      expect(mockGet).toHaveBeenCalledWith('https://client-api.example.com/version', expect.anything())
      expect(version.version).toBe('2.5.0')

      mockGet.mockResolvedValueOnce({
        health: 'green',
        database: 'green',
      })

      const health = await client.getHealth()
      expect(mockGet).toHaveBeenCalledWith('https://client-api.example.com/health', expect.anything())
      expect(health.health).toBe('green')
    })
  })

  describe('Direct getGotifyVersion & getGotifyHealth', () => {
    it('should fetch version info via getGotifyVersion', async () => {
      const ver = await getGotifyVersion({
        apiBase: 'https://gotify.direct.com',
      })

      expect(mockGet).toHaveBeenCalledWith('https://gotify.direct.com/version', expect.anything())
      expect(ver.version).toBe('2.5.0')
    })

    it('should fetch health info via getGotifyHealth', async () => {
      mockGet.mockResolvedValueOnce({
        health: 'green',
        database: 'green',
      })

      const health = await getGotifyHealth({
        apiBase: 'https://gotify.direct.com',
      })

      expect(mockGet).toHaveBeenCalledWith('https://gotify.direct.com/health', expect.anything())
      expect(health.health).toBe('green')
      expect(health.database).toBe('green')
    })
  })

  describe('Custom HttpClient Injection', () => {
    it('should support custom HttpClient instance in sendToGotify', async () => {
      const customPost = vi.fn().mockResolvedValue({
        id: 999,
        appid: 5,
        message: 'custom',
        priority: 1,
        date: '2026-09-14T00:00:00Z',
      })
      const customClient = { post: customPost } as unknown as HttpClient

      await sendToGotify('Custom Client Message', {
        apiBase: 'https://custom.gotify.com',
        appToken: 'custom_token',
        client: customClient,
      })

      expect(customPost).toHaveBeenCalledTimes(1)
      expect(customPost).toHaveBeenCalledWith(
        'https://custom.gotify.com/message',
        expect.objectContaining({
          headers: { 'X-Gotify-Key': 'custom_token' },
        }),
      )
      expect(mockPost).not.toHaveBeenCalled()
    })
  })
})
