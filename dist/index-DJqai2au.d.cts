import { n as BaseTaskNotifyOptions, r as BaseTaskFetchOptions } from "./types-Dn_c82hm.cjs";
//#region src/tasks/balance/constants.d.ts
declare const TableName: {
  readonly electricity: 'electricity';
  readonly water: 'water';
};
type TableName = (typeof TableName)[keyof typeof TableName];
//#endregion
//#region src/tasks/balance/types.d.ts
interface BalanceResponseData {
  state?: number;
  msg?: string;
  code?: string;
  balance?: string;
  tableId?: string;
  bizType?: string;
  rebateAmount?: string;
  [key: string]: unknown;
}
interface BalanceResponseBody {
  data?: BalanceResponseData;
  [key: string]: unknown;
}
interface BalanceResponse {
  response?: {
    code?: string;
    msg?: string;
    [key: string]: unknown;
  };
  body?: BalanceResponseBody;
  [key: string]: unknown;
}
interface FetchBalanceOptions extends BaseTaskFetchOptions {
  /** 卡号 / 户号 */
  carno: string;
  /** 表 ID */
  tableId?: string;
  /** 表类型名称：electricity / water */
  tableName?: TableName | string;
  /** 自定义公共表单参数 */
  commonForm?: Record<string, string>;
}
interface BalanceCheckOptions extends BaseTaskNotifyOptions {
  /** 是否查询电费，默认 true；也可以传入自定义覆盖配置 */
  electricity?: boolean | Partial<FetchBalanceOptions>;
  /** 是否查询水费，默认 true；也可以传入自定义覆盖配置 */
  water?: boolean | Partial<FetchBalanceOptions>;
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
    notifyBark?: unknown;
    notifyGotify?: unknown;
    [key: string]: unknown;
  };
}
//#endregion
//#region src/tasks/balance/electricity.d.ts
/**
 * 查询电费余额
 *
 * @param options 可选覆盖配置
 * @returns 余额字符串或 null
 */
declare function getElectricityBalance(options?: Partial<FetchBalanceOptions>): Promise<string | null>;
//#endregion
//#region src/tasks/balance/water.d.ts
/**
 * 查询水费余额
 *
 * @param options 可选覆盖配置
 * @returns 余额字符串或 null
 */
declare function getWaterBalance(options?: Partial<FetchBalanceOptions>): Promise<string | null>;
//#endregion
//#region src/tasks/balance/index.d.ts
/**
 * 执行余额查询任务（可同时查询电费和水费，并支持 Bark / Gotify 等渠道通知与日志输出）
 *
 * @param options 运行配置选项
 * @returns 查询结果
 */
declare function runBalanceCheck(options?: BalanceCheckOptions): Promise<BalanceCheckResult>;
//#endregion
export { BalanceCheckResult as a, BalanceResponseData as c, BalanceCheckOptions as i, FetchBalanceOptions as l, getWaterBalance as n, BalanceResponse as o, getElectricityBalance as r, BalanceResponseBody as s, runBalanceCheck as t };