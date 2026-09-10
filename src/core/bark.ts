import { httpClient, type HttpClient, type KyOptions } from '#core/client'
import { useEnv } from '#core/env'

export const BARK_API_BASE_ENV_NAME = 'BARK_API_BASE'
export const BARK_DEVICE_KEY_ENV_NAME = 'BARK_DEVICE_KEY'
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
  /** 自定义 Bark 服务基础地址或包含 key 的完整推送地址（优先级高于环境变量 BARK_API_BASE） */
  apiBase?: string
  /** 设备 Key（优先级高于环境变量 BARK_DEVICE_KEY） */
  deviceKey?: string
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
 * 根据传入参数和环境变量解析最终请求 URL 及 JSON Payload
 */
function resolveEndpoint(
  base: string,
  payload: BarkPayload,
  deviceKey?: string,
): { targetUrl: string; finalPayload: BarkPayload } {
  const normalizedBase = base.replace(/\/+$/, '')
  let parsedUrl: URL
  try {
    parsedUrl = new URL(normalizedBase)
  } catch {
    throw new Error(`[sendToBark] Invalid base URL: "${base}"`)
  }

  const finalPayload: BarkPayload = { ...payload }

  // 批量推送必须走 /push 端点
  if (finalPayload.device_keys && finalPayload.device_keys.length > 0) {
    const targetUrl = normalizedBase.endsWith('/push') ? normalizedBase : `${normalizedBase}/push`
    return { targetUrl, finalPayload }
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, '')
  const isRootOrPush = pathname === '' || pathname === '/' || pathname === '/push'

  if (isRootOrPush) {
    const key = finalPayload.device_key || deviceKey
    if (!key) {
      throw new Error(
        '[sendToBark] Missing device_key. Please provide device_key in payload, options, BARK_DEVICE_KEY env, or configure BARK_API_BASE with a key path.',
      )
    }
    finalPayload.device_key = key
    const targetUrl = normalizedBase.endsWith('/push') ? normalizedBase : `${normalizedBase}/push`
    return { targetUrl, finalPayload }
  }

  return {
    targetUrl: normalizedBase,
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
  const envDeviceKey = useEnv<string>(BARK_DEVICE_KEY_ENV_NAME, '')
  const deviceKey = options?.deviceKey || envDeviceKey

  const rawPayload: BarkPayload = typeof payloadOrBody === 'string' ? { body: payloadOrBody } : { ...payloadOrBody }

  const { targetUrl, finalPayload } = resolveEndpoint(base, rawPayload, deviceKey)

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
