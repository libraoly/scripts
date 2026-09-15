import type { KyInstance, Options as KyOptions, ResponsePromise } from 'ky'
import { HTTPError, TimeoutError, NetworkError } from 'ky'

export { HTTPError, TimeoutError, NetworkError }
export type { KyInstance, KyOptions, ResponsePromise }

export interface HttpClientOptions extends KyOptions {
  /** 可选注入已存在的 ky 实例（主要用于测试 mock） */
  kyInstance?: KyInstance
}

export interface HttpClient {
  /** 底层 Ky 实例 */
  readonly raw: KyInstance
  /** 发起底层通用请求 */
  request(url: string | URL | Request, options?: KyOptions): ResponsePromise
  /** 发起 GET 请求并直接解析 JSON */
  get<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>
  /** 发起 POST 请求并直接解析 JSON */
  post<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>
  /** 发起 POST application/x-www-form-urlencoded 表单请求并解析 JSON */
  postForm<T = unknown>(
    url: string | URL | Request,
    data: Record<string, unknown> | URLSearchParams,
    options?: KyOptions,
  ): Promise<T>
  /** 发起 PUT 请求并直接解析 JSON */
  put<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>
  /** 发起 PATCH 请求并直接解析 JSON */
  patch<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>
  /** 发起 DELETE 请求并直接解析 JSON */
  delete<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>
  /** 扩展当前 client 配置生成新的 client 实例 */
  extend(options: KyOptions | ((currentOptions: KyOptions) => KyOptions)): HttpClient
}

export interface BaseTaskFetchOptions {
  /** 自定义请求目标基础 URL */
  baseUrl?: string
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 超时时间（秒或毫秒） */
  timeout?: number
  /** 最大尝试/重试次数（包含第一次） */
  retries?: number
  /** 指数退避基数（秒） */
  backoff?: number
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient
  /** 自定义 ky 配置选项 */
  kyOptions?: KyOptions
}

export type BaseFetchOptions = BaseTaskFetchOptions
