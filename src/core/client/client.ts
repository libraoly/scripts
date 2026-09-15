import ky from 'ky'

import type { HttpClient, HttpClientOptions, KyOptions } from './types'

/**
 * 将对象键值对转换为 URLSearchParams，自动过滤 null 与 undefined
 *
 * @param data 表单对象或 URLSearchParams 实例
 */
export function toURLSearchParams(data: Record<string, unknown> | URLSearchParams): URLSearchParams {
  if (data instanceof URLSearchParams) {
    return data
  }

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  }

  return searchParams
}

/**
 * 在 CJS/ESM 混用编译环境（如 rolldown/tsdown 构建输出）中安全获取 ky 实例
 */
function resolveKy(k: unknown): typeof ky {
  const maybe = k as { default?: { default?: typeof ky; create?: unknown }; create?: unknown }
  if (typeof maybe?.default?.default?.create === 'function') {
    return maybe.default.default as unknown as typeof ky
  }
  if (typeof maybe?.default?.create === 'function') {
    return maybe.default as unknown as typeof ky
  }
  return k as typeof ky
}

/**
 * 创建基于 ky 的通用 HTTP 客户端实例
 *
 * @param options 配置选项
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const { kyInstance, ...kyOptions } = options
  const kyResolved = resolveKy(ky)

  const instance =
    kyInstance ??
    kyResolved.create({
      retry: {
        limit: 2,
        methods: ['get', 'post', 'put', 'delete', 'patch', 'head'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        retryOnTimeout: true,
      },
      ...kyOptions,
    })

  const client: HttpClient = {
    get raw() {
      return instance
    },
    request(url: string | URL | Request, reqOptions?: KyOptions) {
      return instance(url, reqOptions)
    },
    get<T = unknown>(url: string | URL | Request, reqOptions?: KyOptions): Promise<T> {
      return instance.get(url, reqOptions).json<T>()
    },
    post<T = unknown>(url: string | URL | Request, reqOptions?: KyOptions): Promise<T> {
      return instance.post(url, reqOptions).json<T>()
    },
    postForm<T = unknown>(
      url: string | URL | Request,
      data: Record<string, unknown> | URLSearchParams,
      reqOptions?: KyOptions,
    ): Promise<T> {
      const body = toURLSearchParams(data)
      return instance.post(url, { ...reqOptions, body }).json<T>()
    },
    put<T = unknown>(url: string | URL | Request, reqOptions?: KyOptions): Promise<T> {
      return instance.put(url, reqOptions).json<T>()
    },
    patch<T = unknown>(url: string | URL | Request, reqOptions?: KyOptions): Promise<T> {
      return instance.patch(url, reqOptions).json<T>()
    },
    delete<T = unknown>(url: string | URL | Request, reqOptions?: KyOptions): Promise<T> {
      return instance.delete(url, reqOptions).json<T>()
    },
    extend(extOptions: KyOptions | ((currentOptions: KyOptions) => KyOptions)): HttpClient {
      const extendedInstance = instance.extend(extOptions as any)
      return createHttpClient({ kyInstance: extendedInstance })
    },
  }

  return client
}

/**
 * 默认通用 HTTP 客户端实例
 */
export const httpClient: HttpClient = createHttpClient()

export default httpClient
