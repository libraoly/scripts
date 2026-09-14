import { httpClient, type HttpClient, type KyOptions, HTTPError } from '#core/client'
import { useEnv } from '#core/env'

export const GOTIFY_API_BASE_ENV_NAME = 'GOTIFY_API_BASE'
export const GOTIFY_APP_TOKEN_ENV_NAME = 'GOTIFY_APP_TOKEN'
export const GOTIFY_DEFAULT_PRIORITY_ENV_NAME = 'GOTIFY_DEFAULT_PRIORITY'
export const DEFAULT_GOTIFY_PRIORITY = 5

export type GotifyMessagePriority = number

export type GotifyDisplayContentType = 'text/plain' | 'text/markdown'

export interface GotifyDisplayExtras {
  /** 消息内容渲染类型：text/plain (默认纯文本) 或 text/markdown (Markdown 格式) */
  contentType?: GotifyDisplayContentType
  [key: string]: unknown
}

export interface GotifyNotificationExtras {
  /** 点击通知跳转的目标 URL */
  click?: {
    url?: string
    [key: string]: unknown
  }
  /** 通知大图 URL */
  bigImageUrl?: string
  [key: string]: unknown
}

export interface GotifyAndroidActionExtras {
  /** Android 客户端收到通知后触发的 Intent URL */
  onReceive?: {
    intentUrl: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface GotifyExtras {
  /** 客户端展示配置（如 Markdown 渲染） */
  'client::display'?: GotifyDisplayExtras
  /** 客户端通知行为定制（如点击跳转、大图展示） */
  'client::notification'?: GotifyNotificationExtras
  /** Android 客户端事件响应 */
  'android::action'?: GotifyAndroidActionExtras
  /** 其他自定义命名空间扩展参数 */
  [key: string]: unknown
}

export interface GotifyPayload {
  /** 消息正文（必填，当 extras['client::display'].contentType 为 text/markdown 时支持 Markdown） */
  message: string
  /** 消息标题 */
  title?: string
  /** 消息优先级（通常取值 0 - 10，数值越大越紧急） */
  priority?: GotifyMessagePriority
  /** 关联应用 ID（使用 application token 发送时服务端会自动推导，通常无需手动传入） */
  appid?: number
  /** 扩展元数据 (Extras) */
  extras?: GotifyExtras
}

export interface GotifyResponse {
  /** 消息唯一 ID */
  id: number
  /** 发送该消息的 Application ID */
  appid: number
  /** 消息正文 */
  message: string
  /** 消息标题 */
  title?: string
  /** 消息优先级 */
  priority: number
  /** 消息创建时间 (ISO-8601 格式) */
  date: string
  /** 附加的扩展元数据 */
  extras?: Record<string, unknown>
}

export interface GotifyVersionInfo {
  /** Gotify 服务版本号 */
  version: string
  /** 构建 Commit 哈希 */
  commit: string
  /** 构建日期 */
  buildDate: string
}

export interface GotifyHealthInfo {
  /** 服务健康状态（如 green） */
  health: string
  /** 数据库连通健康状态（如 green） */
  database: string
}

export interface GotifyErrorResponse {
  /** 错误简述 */
  error?: string
  /** 错误 HTTP 状态码 */
  errorCode?: number
  /** 详细错误描述 */
  errorDescription?: string
  [key: string]: unknown
}

export interface GotifyOptions {
  /** Gotify 服务 Host 地址（优先级高于环境变量 GOTIFY_API_BASE / GOTIFY_URL） */
  apiBase?: string
  /** Gotify Application Token（优先级高于环境变量 GOTIFY_APP_TOKEN / GOTIFY_TOKEN） */
  appToken?: string
  /** token 别名（兼容写法） */
  token?: string
  /** 默认优先级（优先级高于环境变量 GOTIFY_DEFAULT_PRIORITY，默认为 5） */
  priority?: GotifyMessagePriority
  /** 自定义默认标题（当 payload 中未提供 title 时生效） */
  title?: string
  /** 便捷字段：通知点击跳转 URL（自动合并至 extras['client::notification'].click.url） */
  url?: string
  /** 便捷字段：通知大图 URL（自动合并至 extras['client::notification'].bigImageUrl） */
  bigImageUrl?: string
  /** 便捷字段：是否使用 Markdown 格式渲染正文（自动配置 extras['client::display'].contentType = 'text/markdown'） */
  markdown?: boolean
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient
  /** 自定义 ky 请求配置选项 */
  kyOptions?: KyOptions
}

export interface GotifyClient {
  /** 发送 Gotify 消息 */
  send(payloadOrMessage: string | GotifyPayload, options?: GotifyOptions): Promise<GotifyResponse>
  /** 获取 Gotify 服务版本信息 */
  getVersion(options?: GotifyOptions): Promise<GotifyVersionInfo>
  /** 获取 Gotify 服务健康状态 */
  getHealth(options?: GotifyOptions): Promise<GotifyHealthInfo>
}

/**
 * 规整 Host 基础地址（去除末尾斜杠及误传的 /message）
 */
function normalizeHost(base: string): string {
  if (!base || typeof base !== 'string' || base.trim().length === 0) {
    throw new Error(
      '[sendToGotify] Missing apiBase. Please provide apiBase in options or GOTIFY_API_BASE / GOTIFY_URL environment variable.',
    )
  }
  let host = base.trim().replace(/\/+$/, '')
  if (host.endsWith('/message')) {
    host = host.slice(0, -8).replace(/\/+$/, '')
  }
  try {
    new URL(host)
  } catch {
    throw new Error(`[sendToGotify] Invalid base host URL: "${base}"`)
  }
  return host
}

/**
 * 提取并校验 Gotify Application Token
 */
function extractToken(options?: GotifyOptions): string {
  const explicitToken = options?.appToken ?? options?.token
  if (explicitToken && String(explicitToken).trim().length > 0) {
    return String(explicitToken).trim()
  }

  const envToken = useEnv<string>(GOTIFY_APP_TOKEN_ENV_NAME, '') || useEnv<string>('GOTIFY_TOKEN', '')

  const parsed = String(envToken).trim()
  if (parsed.length > 0) {
    return parsed
  }

  throw new Error(
    '[sendToGotify] Missing app token. Please provide appToken in options or GOTIFY_APP_TOKEN / GOTIFY_TOKEN environment variable.',
  )
}

/**
 * 解析计算消息优先级
 */
function resolvePriority(payloadPriority?: number, optionsPriority?: number): number {
  if (typeof payloadPriority === 'number') {
    return payloadPriority
  }
  if (typeof optionsPriority === 'number') {
    return optionsPriority
  }
  const envPriority = useEnv<number | string>(GOTIFY_DEFAULT_PRIORITY_ENV_NAME, '')
  if (envPriority !== undefined && envPriority !== null && envPriority !== '') {
    const num = Number(envPriority)
    if (!Number.isNaN(num)) {
      return num
    }
  }
  return DEFAULT_GOTIFY_PRIORITY
}

/**
 * 将入参消息或载荷规整为标准 GotifyPayload，并混入快捷配置与 Extras
 */
function buildPayload(payloadOrMessage: string | GotifyPayload, options?: GotifyOptions): GotifyPayload {
  const basePayload: GotifyPayload =
    typeof payloadOrMessage === 'string'
      ? {
          message: payloadOrMessage,
          ...(options?.title ? { title: options.title } : {}),
        }
      : {
          ...payloadOrMessage,
          ...(options?.title && !payloadOrMessage.title ? { title: options.title } : {}),
        }

  basePayload.priority = resolvePriority(basePayload.priority, options?.priority)

  const extras: GotifyExtras = {
    ...basePayload.extras,
  }

  // 处理 markdown 快捷配置
  if (options?.markdown) {
    const currentDisplay = extras['client::display']
    extras['client::display'] = {
      contentType: currentDisplay?.contentType ?? 'text/markdown',
      ...currentDisplay,
    }
  }

  // 处理 url / bigImageUrl 快捷配置
  if (options?.url || options?.bigImageUrl) {
    const currentNotification = extras['client::notification']
    const existingClick = currentNotification?.click
    const clickUrl = existingClick?.url ?? options?.url

    extras['client::notification'] = {
      ...currentNotification,
      ...(clickUrl ? { click: { ...existingClick, url: clickUrl } } : existingClick ? { click: existingClick } : {}),
      ...(options?.bigImageUrl && !currentNotification?.bigImageUrl ? { bigImageUrl: options.bigImageUrl } : {}),
    }
  }

  if (Object.keys(extras).length > 0) {
    basePayload.extras = extras
  }

  return basePayload
}

/**
 * 发送 Gotify 消息通知
 *
 * @param message 消息文本
 * @param options 可选配置项
 */
export async function sendToGotify(message: string, options?: GotifyOptions): Promise<GotifyResponse>

/**
 * 发送 Gotify 消息通知
 *
 * @param payload 完整推送载荷对象
 * @param options 可选配置项
 */
export async function sendToGotify(payload: GotifyPayload, options?: GotifyOptions): Promise<GotifyResponse>

/**
 * 发送 Gotify 消息通知
 *
 * @param payloadOrMessage 消息文本或完整推送载荷
 * @param options 可选配置项
 */
export async function sendToGotify(
  payloadOrMessage: string | GotifyPayload,
  options?: GotifyOptions,
): Promise<GotifyResponse>

export async function sendToGotify(
  payloadOrMessage: string | GotifyPayload,
  options?: GotifyOptions,
): Promise<GotifyResponse> {
  const base =
    options?.apiBase ??
    (useEnv<string>(GOTIFY_API_BASE_ENV_NAME, '') ||
      useEnv<string>('GOTIFY_URL', '') ||
      useEnv<string>('GOTIFY_BASE_URL', ''))
  const host = normalizeHost(base)
  const token = extractToken(options)
  const finalPayload = buildPayload(payloadOrMessage, options)

  const targetUrl = `${host}/message`
  const client = options?.client ?? httpClient

  try {
    return await client.post<GotifyResponse>(targetUrl, {
      json: finalPayload,
      headers: {
        'X-Gotify-Key': token,
      },
      timeout: options?.timeout,
      ...options?.kyOptions,
    })
  } catch (error) {
    if (error instanceof HTTPError && error.response) {
      try {
        const errBody = (await error.response.json()) as GotifyErrorResponse
        const desc = errBody.errorDescription || errBody.error || error.message
        const code = errBody.errorCode ?? error.response.status
        throw new Error(`Gotify request failed [${code}]: ${desc}`)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.startsWith('Gotify request failed')) {
          throw parseError
        }
        throw new Error(`Gotify request failed [${error.response.status}]: ${error.message}`)
      }
    }
    throw error
  }
}

/**
 * 获取 Gotify 服务版本信息
 *
 * @param options 可选配置项
 */
export async function getGotifyVersion(options?: GotifyOptions): Promise<GotifyVersionInfo> {
  const base =
    options?.apiBase ??
    (useEnv<string>(GOTIFY_API_BASE_ENV_NAME, '') ||
      useEnv<string>('GOTIFY_URL', '') ||
      useEnv<string>('GOTIFY_BASE_URL', ''))
  const host = normalizeHost(base)
  const client = options?.client ?? httpClient

  return await client.get<GotifyVersionInfo>(`${host}/version`, {
    timeout: options?.timeout,
    ...options?.kyOptions,
  })
}

/**
 * 获取 Gotify 服务健康状态
 *
 * @param options 可选配置项
 */
export async function getGotifyHealth(options?: GotifyOptions): Promise<GotifyHealthInfo> {
  const base =
    options?.apiBase ??
    (useEnv<string>(GOTIFY_API_BASE_ENV_NAME, '') ||
      useEnv<string>('GOTIFY_URL', '') ||
      useEnv<string>('GOTIFY_BASE_URL', ''))
  const host = normalizeHost(base)
  const client = options?.client ?? httpClient

  return await client.get<GotifyHealthInfo>(`${host}/health`, {
    timeout: options?.timeout,
    ...options?.kyOptions,
  })
}

/**
 * 创建具有预设配置的 Gotify 客户端实例
 *
 * @param defaultOptions 默认配置项
 */
export function createGotifyClient(defaultOptions?: GotifyOptions): GotifyClient {
  return {
    send(payloadOrMessage: string | GotifyPayload, options?: GotifyOptions) {
      return sendToGotify(payloadOrMessage, { ...defaultOptions, ...options })
    },
    getVersion(options?: GotifyOptions) {
      return getGotifyVersion({ ...defaultOptions, ...options })
    },
    getHealth(options?: GotifyOptions) {
      return getGotifyHealth({ ...defaultOptions, ...options })
    },
  }
}
