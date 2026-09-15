import { KyInstance, Options as KyOptions, ResponsePromise } from "ky";
//#region src/core/client/types.d.ts
interface HttpClient {
  /** 底层 Ky 实例 */
  readonly raw: KyInstance;
  /** 发起底层通用请求 */
  request(url: string | URL | Request, options?: KyOptions): ResponsePromise;
  /** 发起 GET 请求并直接解析 JSON */
  get<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>;
  /** 发起 POST 请求并直接解析 JSON */
  post<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>;
  /** 发起 POST application/x-www-form-urlencoded 表单请求并解析 JSON */
  postForm<T = unknown>(url: string | URL | Request, data: Record<string, unknown> | URLSearchParams, options?: KyOptions): Promise<T>;
  /** 发起 PUT 请求并直接解析 JSON */
  put<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>;
  /** 发起 PATCH 请求并直接解析 JSON */
  patch<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>;
  /** 发起 DELETE 请求并直接解析 JSON */
  delete<T = unknown>(url: string | URL | Request, options?: KyOptions): Promise<T>;
  /** 扩展当前 client 配置生成新的 client 实例 */
  extend(options: KyOptions | ((currentOptions: KyOptions) => KyOptions)): HttpClient;
}
interface BaseTaskFetchOptions {
  /** 自定义请求目标基础 URL */
  baseUrl?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 超时时间（秒或毫秒） */
  timeout?: number;
  /** 最大尝试/重试次数（包含第一次） */
  retries?: number;
  /** 指数退避基数（秒） */
  backoff?: number;
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient;
  /** 自定义 ky 配置选项 */
  kyOptions?: KyOptions;
}
//#endregion
//#region src/core/notify/bark.d.ts
type BarkInterruptionLevel = 'critical' | 'active' | 'timeSensitive' | 'passive';
interface BarkOptions {
  /** 自定义 Bark 服务 Host 基础地址（优先级高于环境变量 BARK_API_BASE，默认为 https://api.day.app） */
  apiBase?: string;
  /** 设备 Key 列表（优先级高于环境变量） */
  deviceKeys?: string[];
  /** 自定义推送分组（优先级高于环境变量 BARK_GROUP，默认为 Scripts） */
  group?: string;
  /** 自定义推送图标 URL（优先级高于环境变量 BARK_ICON，默认为特定图标） */
  icon?: string;
  /** 自定义推送跳转 URL */
  url?: string;
  /** 自定义推送中断级别 */
  level?: BarkInterruptionLevel;
  /** 自定义推送声音 */
  sound?: string;
  /** 自定义推送角标 */
  badge?: number;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient;
  /** 自定义 ky 请求配置选项 */
  kyOptions?: KyOptions;
}
//#endregion
//#region src/core/notify/gotify.d.ts
type GotifyMessagePriority = number;
interface GotifyOptions {
  /** Gotify 服务 Host 地址（优先级高于环境变量 GOTIFY_API_BASE / GOTIFY_URL） */
  apiBase?: string;
  /** Gotify Application Token（优先级高于环境变量 GOTIFY_APP_TOKEN / GOTIFY_TOKEN） */
  appToken?: string;
  /** token 别名（兼容写法） */
  token?: string;
  /** 默认优先级（优先级高于环境变量 GOTIFY_DEFAULT_PRIORITY，默认为 5） */
  priority?: GotifyMessagePriority;
  /** 自定义默认标题（当 payload 中未提供 title 时生效） */
  title?: string;
  /** 便捷字段：通知点击跳转 URL（自动合并至 extras['client::notification'].click.url） */
  url?: string;
  /** 便捷字段：通知大图 URL（自动合并至 extras['client::notification'].bigImageUrl） */
  bigImageUrl?: string;
  /** 便捷字段：是否使用 Markdown 格式渲染正文（自动配置 extras['client::display'].contentType = 'text/markdown'） */
  markdown?: boolean;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient;
  /** 自定义 ky 请求配置选项 */
  kyOptions?: KyOptions;
}
//#endregion
//#region src/core/notify/types.d.ts
interface BaseTaskChannelOptions {
  /** Bark 通知渠道配置：true 使用环境变量默认读取，或传入 BarkOptions 自定义配置 */
  bark?: boolean | BarkOptions;
  /** Gotify 通知渠道配置：true 使用环境变量默认读取，或传入 GotifyOptions 自定义配置 */
  gotify?: boolean | GotifyOptions;
}
interface BaseTaskNotifyOptions extends BaseTaskChannelOptions {
  /** 自定义通知标题 */
  notifyTitle?: string;
  /** 自定义通知正文 */
  notifyMessage?: string;
}
//#endregion
export { BaseTaskNotifyOptions as n, BaseTaskFetchOptions as r, BaseTaskChannelOptions as t };