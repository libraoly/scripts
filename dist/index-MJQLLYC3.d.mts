import { r as BaseTaskFetchOptions, t as BaseTaskChannelOptions } from "./types-Dn_c82hm.mjs";
import { Storage } from "unstorage";
import "unstorage/drivers/fs";
//#region src/tasks/eva/constants.d.ts
declare const BASE_URL = "https://api-dmall.lynkco.com/portal/api/item/render/dynamic";
declare const DEFAULT_ITEM_ID = "5310000100239002";
declare const DEFAULT_APP_CODE = "3fa3314998bd4195a9fe2df3e85e6a12";
declare const DEFAULT_PROVINCE_ID = "110000";
declare const DEFAULT_CITY_ID = "110100";
declare const DEFAULT_REGION_ID = "110101";
declare const DEFAULT_JUMP_URL = "lynkco://h5/?routeUrl=https://app.lynkco.com/app-h5/dist/web/pages/attachment-mall/detail/page-web.html?id=5310000100239002";
declare const DEFAULT_BARK_GROUP = "领克商城";
declare const DEFAULT_BARK_LEVEL = "timeSensitive";
declare const DEFAULT_BARK_TITLE = "领克商城 Eva 库存提醒";
declare const TITLE_IN_STOCK = "🎉 发现 Eva 机器人现货！";
declare const TITLE_NO_STOCK = "ℹ️ Eva 机器人当前暂无库存";
declare const TITLE_OUT_OF_STOCK = "⚠️ Eva 机器人已售罄！";
declare const TITLE_RAPID_DECREASE = "⚡ Eva 机器人库存快速变化！";
declare const TITLE_STOCK_INCREASED = "📦 Eva 机器人补货增加！";
declare const EVA_STORAGE_PREFIX = "eva:stock";
declare const DEFAULT_RAPID_CHANGE_THRESHOLD = 5;
declare const EVA_SKU_MAP: {
  readonly '5310000100278003': 'Eva 高亮黑';
  readonly '5310000100278002': 'Eva 极地白';
};
type EvaSkuMap = typeof EVA_SKU_MAP;
type EvaSkuId = keyof EvaSkuMap;
declare const DEFAULT_HEADERS: {
  readonly Accept: '*/*';
  readonly 'Accept-Language': 'en-US,en;q=0.9';
  readonly 'Content-Type': 'application/json';
  readonly Host: 'api-dmall.lynkco.com';
  readonly Origin: 'https://app.lynkco.com';
  readonly Referer: 'https://app.lynkco.com/';
  readonly 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 x-cordova-platform/ios cordova-6 appVersionCode/4.2.7 appVersionName/40207132';
  readonly 'acl-app': 'BUYER';
  readonly Authentication: 'AppId=59701c08ed454a43a9b';
  readonly appVersionCode: '4.2.7';
  readonly appVersionName: '40207132';
};
declare const EVA_ITEM_ID_ENV_NAME = "EVA_ITEM_ID";
declare const EVA_USER_ID_ENV_NAME = "EVA_USER_ID";
declare const EVA_APP_CODE_ENV_NAME = "EVA_APP_CODE";
declare const EVA_TOKEN_ENV_NAME = "EVA_TOKEN";
//#endregion
//#region src/tasks/eva/types.d.ts
interface EvaSkuCost {
  id?: number;
  costName?: string;
  costType?: string;
  unitPrice?: number;
  activityUnitPrice?: number | null;
  unitNum?: number;
  isActivity?: boolean;
  [key: string]: unknown;
}
interface EvaDynamicData {
  tenantId?: unknown;
  tenantIdLong?: unknown;
  extra?: unknown;
  currentTime?: number;
  selectedSkuStock?: number;
  selectedSkuId?: number | string;
  activeType?: unknown;
  activePrice?: number;
  price?: number;
  activityForSku?: unknown;
  activities?: unknown;
  purchaseLimit?: unknown;
  warnStatus?: number;
  originalPrice?: number;
  pointsDeduction?: number;
  existActive?: boolean;
  productForm?: string;
  skuRelevancyCosts?: EvaSkuCost[];
  authStatus?: unknown;
  canPurchase?: unknown;
  canNotBuyReason?: unknown;
  [key: string]: unknown;
}
interface EvaDynamicResponse {
  success?: boolean;
  code?: string | number;
  message?: string;
  data?: EvaDynamicData;
  [key: string]: unknown;
}
interface FetchEvaStockOptions extends BaseTaskFetchOptions {
  /** 商品 ID，默认 5310000100239002 */
  itemId?: string;
  /** SKU ID，例如 5310000100278003 (Eva 高亮黑) 或 5310000100278002 (Eva 极地白) */
  skuId: EvaSkuId | string;
  /** 省份编码，默认 110000 (北京) */
  provinceId?: string;
  /** 城市编码，默认 110100 */
  cityId?: string;
  /** 区域编码，默认 110101 */
  regionId?: string;
  /** 用户 ID (可选) */
  userId?: string;
  /** 领克 API Gateway APPCODE (可选，默认内置有效凭据) */
  appCode?: string;
  /** 用户登录 Token (可选) */
  token?: string;
}
interface SkuStockInfo {
  /** SKU ID */
  skuId: string;
  /** SKU 名称（如 Eva 高亮黑） */
  skuName: string;
  /** 当前库存数量 */
  stock: number;
  /** 是否有库存 (stock > 0) */
  inStock: boolean;
  /** 当前售价（单位：分） */
  price?: number;
  /** 原价（单位：分） */
  originalPrice?: number;
  /** 告警状态（1: 正常, -1: 缺货） */
  warnStatus?: number;
}
type EvaStockEventType = 'RESTOCKED' | 'OUT_OF_STOCK' | 'RAPID_DECREASE' | 'STOCK_INCREASED' | 'STILL_IN_STOCK' | 'STILL_OUT_OF_STOCK' | 'INITIAL';
interface SkuStockRecord {
  skuId: string;
  skuName: string;
  stock: number;
  inStock: boolean;
  price?: number;
  warnStatus?: number;
  timestamp: number;
  formattedTime: string;
}
interface SkuStockEvent {
  skuId: string;
  skuName: string;
  eventType: EvaStockEventType;
  previousStock?: number;
  currentStock: number;
  diff: number;
  timestamp: number;
  formattedTime: string;
  title: string;
  message: string;
}
type EvaNotifyPolicy = 'onChange' | 'inStock' | 'always';
interface EvaStockCheckOptions extends BaseTaskChannelOptions {
  /** 要监控的 SKU ID 列表或自定义 SKU 映射字典，默认监控黑白双色 */
  skus?: (EvaSkuId | string)[] | Record<string, string>;
  /** 商品 ID，默认 5310000100239002 */
  itemId?: string;
  /** 底层查询配置覆盖 */
  fetchOptions?: Partial<FetchEvaStockOptions>;
  /**
   * 通知触发策略：
   * - 'onChange': 仅在库存状态发生转移或快速变化时通知（如无转有、有转无、急剧减少、补货）（默认）
   * - 'inStock': 只要有库存就通知
   * - 'always': 每次检查均通知
   */
  notifyPolicy?: EvaNotifyPolicy;
  /** 是否仅在有库存时通知（若为 true 则抑制无货相关的通知） */
  onlyInStock?: boolean;
  /** 自定义通知标题或动态标题生成函数 */
  notifyTitle?: string | ((event: SkuStockEvent) => string);
  /** 自定义通知正文或动态正文生成函数 */
  notifyMessage?: string | ((event: SkuStockEvent) => string);
  /** 触发库存快速减少告警的最小差值阈值，默认 5 件 */
  rapidChangeThreshold?: number;
  /** 是否持久化保存本次记录，默认 true */
  saveRecord?: boolean;
  /** 自定义 storage 实例，默认使用 core 中的统一 storage */
  storage?: Storage;
}
interface EvaStockCheckResult {
  /** 是否有任何 SKU 存在库存 (stock > 0) */
  hasStock: boolean;
  /** 每个 SKU 的库存详情 */
  stocks: Record<string, SkuStockInfo>;
  /** 每个 SKU 触发的库存变动事件 */
  events: Record<string, SkuStockEvent>;
  /** 保存的最新记录详情 */
  records: Record<string, SkuStockRecord>;
  /** 查询发生时间戳 */
  timestamp: number;
  /** 是否全部 SKU 查询成功 */
  success: boolean;
  /** 错误信息记录 */
  errors?: Record<string, unknown> & {
    notify?: unknown;
  };
}
//#endregion
//#region src/tasks/eva/api.d.ts
/**
 * 查询领克商城指定 SKU 的 Eva 机器人库存（内置指数退避重试机制）
 *
 * @param options 查询配置参数
 * @returns SKU 库存信息实体
 */
declare function fetchEvaStock(options: FetchEvaStockOptions): Promise<SkuStockInfo>;
//#endregion
//#region src/tasks/eva/events.d.ts
interface DetermineEventOptions {
  rapidChangeThreshold?: number;
  date?: Date | number;
}
/**
 * 根据最新查询结果与上一次存储的历史记录，判定当前库存状态变动事件
 *
 * @param current 当前查询到的 SKU 库存信息
 * @param previous 上一次保存的记录（若首次查询则可能为 null 或 undefined）
 * @param options 配置选项
 */
declare function determineStockEvent(current: SkuStockInfo, previous?: SkuStockRecord | null, options?: DetermineEventOptions): SkuStockEvent;
/**
 * 判断指定 SKU 事件是否应当触发通知推送
 */
declare function shouldNotifySku(event: SkuStockEvent, options: EvaStockCheckOptions): boolean;
//#endregion
//#region src/tasks/eva/index.d.ts
/**
 * 执行领克商城 Eva 机器人库存监控巡检
 *
 * @param options 任务调度配置选项
 * @returns 巡检聚合结果（包含各 SKU 当前库存、状态转移事件、历史记录及通知错误）
 */
declare function runEvaStockCheck(options?: EvaStockCheckOptions): Promise<EvaStockCheckResult>;
//#endregion
export { EVA_ITEM_ID_ENV_NAME as A, TITLE_RAPID_DECREASE as B, DEFAULT_HEADERS as C, DEFAULT_RAPID_CHANGE_THRESHOLD as D, DEFAULT_PROVINCE_ID as E, EvaSkuId as F, EvaSkuMap as I, TITLE_IN_STOCK as L, EVA_STORAGE_PREFIX as M, EVA_TOKEN_ENV_NAME as N, DEFAULT_REGION_ID as O, EVA_USER_ID_ENV_NAME as P, TITLE_NO_STOCK as R, DEFAULT_CITY_ID as S, DEFAULT_JUMP_URL as T, TITLE_STOCK_INCREASED as V, BASE_URL as _, fetchEvaStock as a, DEFAULT_BARK_LEVEL as b, EvaNotifyPolicy as c, EvaStockCheckResult as d, EvaStockEventType as f, SkuStockRecord as g, SkuStockInfo as h, shouldNotifySku as i, EVA_SKU_MAP as j, EVA_APP_CODE_ENV_NAME as k, EvaSkuCost as l, SkuStockEvent as m, DetermineEventOptions as n, EvaDynamicData as o, FetchEvaStockOptions as p, determineStockEvent as r, EvaDynamicResponse as s, runEvaStockCheck as t, EvaStockCheckOptions as u, DEFAULT_APP_CODE as v, DEFAULT_ITEM_ID as w, DEFAULT_BARK_TITLE as x, DEFAULT_BARK_GROUP as y, TITLE_OUT_OF_STOCK as z };