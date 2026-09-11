import { httpClient, type HttpClient, type KyOptions } from '#core/client'
import { useEnv } from '#core/env'

export const BARK_API_BASE_ENV_NAME = 'BARK_API_BASE'
export const BARK_DEVICE_KEY_ENV_NAME = 'BARK_DEVICE_KEY'
export const BARK_DEVICE_KEYS_ENV_NAME = 'BARK_DEVICE_KEYS'
export const DEFAULT_BARK_API_BASE = 'https://api.day.app'

export type BarkInterruptionLevel = 'critical' | 'active' | 'timeSensitive' | 'passive'

export interface BarkPayload {
  /** 推送标题 */
  title?: string
  /** 推送副标题 */
  subtitle?: string
  /** 推送内容 */
  body?: string
  /** 推送内容，支持基础 Markdown 格式。传递了此参数将忽略 body 字段 */
  markdown?: string
  /** 设备 key */
  device_key?: string
  /** key 数组，用于批量推送，仅支持 Json 请求使用 */
  device_keys?: string[]
  /** 推送中断级别：critical (重要警告, 静音也响铃), active (默认), timeSensitive (时效性通知), passive (仅通知列表) */
  level?: BarkInterruptionLevel
  /** 重要警告的通知音量，取值范围：0-10，不传默认值为5 */
  volume?: number
  /** 推送角标，可以是任意数字 */
  badge?: number
  /** 传 "1" 时，通知铃声重复播放 */
  call?: '1' | '0'
  /** 传 "1" 时，iOS 14.5 以下自动复制推送内容，iOS 14.5 以上需手动长按或下拉推送 */
  autoCopy?: '1' | '0'
  /** 复制推送时指定复制的内容，不传此参数将复制整个推送内容 */
  copy?: string
  /** 为推送设置不同的铃声 */
  sound?: string
  /** 为推送设置自定义图标 URL，替换默认 Bark 图标 */
  icon?: string
  /** 推送图片 URL */
  image?: string
  /** 对消息进行分组，按 group 分组显示在通知中心与历史列表中 */
  group?: string
  /** 加密推送的密文 */
  ciphertext?: string
  /** 传 1 保存推送，传 0 不保存推送，不传按 APP 内设置决定 */
  isArchive?: 0 | 1
  /** 保存推送的有效期，单位为秒。到期后自动删除 */
  ttl?: number
  /** 点击推送时跳转的 URL，支持 URL Scheme 和 Universal Link */
  url?: string
  /** 传 "alert" 时，点击推送跳转到 APP 会弹出操作弹窗 */
  action?: 'alert' | string
  /** 使用相同的 ID 值将更新对应推送的通知内容 (Json 传参使用字符串类型) */
  id?: string
  /** 传 "1" 时，将从系统通知中心和 APP 历史中删除对应 id 的通知（需搭配 id 参数使用） */
  delete?: '1'
}

export interface BarkResponse {
  code: number
  message: string
  timestamp: number
}

export interface BarkOptions {
  /** 自定义 Bark 服务 Host 基础地址（优先级高于环境变量 BARK_API_BASE，默认为 https://api.day.app） */
  apiBase?: string
  /** 单个设备 Key 或多个设备 Key 列表（优先级高于环境变量） */
  deviceKey?: string | string[]
  /** 多个设备 Key 列表，用于批量推送（优先级高于环境变量） */
  deviceKeys?: string[]
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient
  /** 自定义 ky 请求配置选项 */
  kyOptions?: KyOptions
}

export interface BarkClient {
  send(payloadOrBody: string | BarkPayload, options?: BarkOptions): Promise<BarkResponse>
}

/**
 * 将入参规整解析为非空字符串 Key 数组
 */
function parseKeys(input: unknown): string[] {
  if (!input) {
    return []
  }
  if (Array.isArray(input)) {
    return input.flatMap((item) => parseKeys(item))
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
  }
  return [String(input).trim()].filter((k) => k.length > 0)
}

/**
 * 提取所有来源的 Device Keys 并去重
 */
function extractDeviceKeys(payload: BarkPayload, options?: BarkOptions): string[] {
  const explicitKeys: string[] = [
    ...parseKeys(options?.deviceKeys),
    ...parseKeys(options?.deviceKey),
    ...parseKeys(payload.device_keys),
    ...parseKeys(payload.device_key),
  ]

  if (explicitKeys.length > 0) {
    return Array.from(new Set(explicitKeys))
  }

  const envKeys: string[] = [
    ...parseKeys(useEnv<string | string[]>(BARK_DEVICE_KEYS_ENV_NAME, '')),
    ...parseKeys(useEnv<string | string[]>(BARK_DEVICE_KEY_ENV_NAME, '')),
  ]

  return Array.from(new Set(envKeys))
}

/**
 * 规整 Host 基础地址（仅定义 Host，去除末尾斜杠及误传的 /push）
 */
function normalizeHost(base: string): string {
  let host = base.replace(/\/+$/, '')
  if (host.endsWith('/push')) {
    host = host.slice(0, -5).replace(/\/+$/, '')
  }
  try {
    new URL(host)
  } catch {
    throw new Error(`[sendToBark] Invalid base host URL: "${base}"`)
  }
  return host
}

/**
 * 根据 Host 与 Device Key 数量决策最终请求 URL 及 JSON Payload
 * - 单个 key: 使用完整 url (例如: https://api.day.app/:device_key)
 * - 多个 key: 使用 push 批量推送端点 (例如: https://api.day.app/push)
 */
function resolveEndpoint(
  base: string,
  payload: BarkPayload,
  keys: string[],
): { targetUrl: string; finalPayload: BarkPayload } {
  const host = normalizeHost(base)
  const finalPayload: BarkPayload = { ...payload }

  if (keys.length === 0) {
    throw new Error(
      '[sendToBark] Missing device_key. Please provide device_key in payload, options, or BARK_DEVICE_KEY environment variable.',
    )
  }

  // 单个 key 时使用完整 url
  if (keys.length === 1) {
    const key = keys[0]!
    delete finalPayload.device_key
    delete finalPayload.device_keys
    return {
      targetUrl: `${host}/${key}`,
      finalPayload,
    }
  }

  // 多个 key 时走 /push 批量推送端点
  delete finalPayload.device_key
  finalPayload.device_keys = keys
  return {
    targetUrl: `${host}/push`,
    finalPayload,
  }
}

/**
 * 发送 Bark 推送通知
 *
 * @param body 推送消息正文
 * @param options 可选配置项
 */
export async function sendToBark(body: string, options?: BarkOptions): Promise<BarkResponse>

/**
 * 发送 Bark 推送通知
 *
 * @param payload 完整推送载荷对象
 * @param options 可选配置项
 */
export async function sendToBark(payload: BarkPayload, options?: BarkOptions): Promise<BarkResponse>

/**
 * 发送 Bark 推送通知
 *
 * @param payloadOrBody 消息文本或完整推送载荷
 * @param options 可选配置项
 */
export async function sendToBark(payloadOrBody: string | BarkPayload, options?: BarkOptions): Promise<BarkResponse>

export async function sendToBark(payloadOrBody: string | BarkPayload, options?: BarkOptions): Promise<BarkResponse> {
  const base = options?.apiBase ?? useEnv<string>(BARK_API_BASE_ENV_NAME, DEFAULT_BARK_API_BASE)
  const rawPayload: BarkPayload = typeof payloadOrBody === 'string' ? { body: payloadOrBody } : { ...payloadOrBody }
  const keys = extractDeviceKeys(rawPayload, options)

  const { targetUrl, finalPayload } = resolveEndpoint(base, rawPayload, keys)

  const client = options?.client ?? httpClient

  const result = await client.post<BarkResponse>(targetUrl, {
    json: finalPayload,
    timeout: options?.timeout,
    ...options?.kyOptions,
  })
  if (result.code !== 200) {
    throw new Error(`Bark request failed [${result.code}]: ${result.message}`)
  }

  return result
}

/**
 * 创建具有预设配置的 Bark 客户端实例
 *
 * @param defaultOptions 默认配置项
 */
export function createBarkClient(defaultOptions?: BarkOptions): BarkClient {
  return {
    send(payloadOrBody: string | BarkPayload, options?: BarkOptions) {
      return sendToBark(payloadOrBody, { ...defaultOptions, ...options })
    },
  }
}
