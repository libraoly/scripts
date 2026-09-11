import { KyInstance, Options as KyOptions, ResponsePromise } from "ky";
//#region src/core/client.d.ts
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
//#endregion
//#region src/tasks/balance/constants.d.ts
declare const TableName: {
  readonly electricity: 'electricity';
  readonly water: 'water';
};
type TableName = (typeof TableName)[keyof typeof TableName];
//#endregion
//#region src/tasks/balance/types.d.ts
interface FetchBalanceOptions {
  /** 卡号 / 户号 */
  carno: string;
  /** 表 ID */
  tableId?: string;
  /** 表类型名称：electricity / water */
  tableName?: TableName | string;
  /** 超时时间（秒或毫秒，默认 60 秒） */
  timeout?: number;
  /** 最大尝试次数（包含第一次，默认 3 次） */
  retries?: number;
  /** 指数退避基数（秒，默认 5 秒） */
  backoff?: number;
  /** 自定义请求目标 URL */
  baseUrl?: string;
  /** 自定义公共表单参数 */
  commonForm?: Record<string, string>;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient;
  /** 自定义 ky 配置选项 */
  kyOptions?: KyOptions;
}
interface BalanceCheckOptions {
  /** 是否查询电费，默认 true；也可以传入自定义覆盖配置 */
  electricity?: boolean | Partial<FetchBalanceOptions>;
  /** 是否查询水费，默认 true；也可以传入自定义覆盖配置 */
  water?: boolean | Partial<FetchBalanceOptions>;
  /** 是否发送 Bark 推送通知，默认 false */
  notify?: boolean;
  /** 自定义 Bark 标题，默认 '水电费余额通知' */
  notifyTitle?: string;
}
interface BalanceCheckResult {
  /** 电费余额（如果未查询或失败可能为 null / undefined） */
  electricity?: string | null;
  /** 水费余额（如果未查询或失败可能为 null / undefined） */
  water?: string | null;
  /** 查询发生时间戳 */
  timestamp: number;
  /** 是否全部查询成功 */
  success: boolean;
  /** 错误信息记录 */
  errors?: {
    electricity?: unknown;
    water?: unknown;
    notify?: unknown;
  };
}
//#endregion
//#region src/tasks/balance/index.d.ts
/**
 * 执行余额查询任务（可同时查询电费和水费，并支持 Bark 通知与日志输出）
 *
 * @param options 运行配置选项
 * @returns 查询结果
 */
declare function runBalanceCheck(options?: BalanceCheckOptions): Promise<BalanceCheckResult>;
//#endregion
export { runBalanceCheck as t };