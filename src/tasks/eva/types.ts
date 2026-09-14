import type { BarkInterruptionLevel } from '#core/bark'
import type { HttpClient, KyOptions } from '#core/client'
import type { GotifyOptions } from '#core/gotify'
import type { Storage } from '#core/storage'

import type { EvaSkuId } from './constants'

export interface EvaSkuCost {
  id?: number
  costName?: string
  costType?: string
  unitPrice?: number
  activityUnitPrice?: number | null
  unitNum?: number
  isActivity?: boolean
  [key: string]: unknown
}

export interface EvaDynamicData {
  tenantId?: unknown
  tenantIdLong?: unknown
  extra?: unknown
  currentTime?: number
  selectedSkuStock?: number
  selectedSkuId?: number | string
  activeType?: unknown
  activePrice?: number
  price?: number
  activityForSku?: unknown
  activities?: unknown
  purchaseLimit?: unknown
  warnStatus?: number
  originalPrice?: number
  pointsDeduction?: number
  existActive?: boolean
  productForm?: string
  skuRelevancyCosts?: EvaSkuCost[]
  authStatus?: unknown
  canPurchase?: unknown
  canNotBuyReason?: unknown
  [key: string]: unknown
}

export interface EvaDynamicResponse {
  success?: boolean
  code?: string | number
  message?: string
  data?: EvaDynamicData
  [key: string]: unknown
}

export interface FetchEvaStockOptions {
  /** 商品 ID，默认 5310000100239002 */
  itemId?: string
  /** SKU ID，例如 5310000100278003 (Eva 高亮黑) 或 5310000100278002 (Eva 极地白) */
  skuId: EvaSkuId | string
  /** 省份编码，默认 110000 (北京) */
  provinceId?: string
  /** 城市编码，默认 110100 */
  cityId?: string
  /** 区域编码，默认 110101 */
  regionId?: string
  /** 用户 ID (可选) */
  userId?: string
  /** 领克 API Gateway APPCODE (可选，默认内置有效凭据) */
  appCode?: string
  /** 用户登录 Token (可选) */
  token?: string
  /** 接口基础 URL */
  baseUrl?: string
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 超时时间（秒或毫秒，默认 30 秒） */
  timeout?: number
  /** 最大尝试次数（包含第一次，默认 3 次） */
  retries?: number
  /** 指数退避基数（秒，默认 2 秒） */
  backoff?: number
  /** 自定义通用 HTTP 客户端 */
  client?: HttpClient
  /** 自定义 ky 配置选项 */
  kyOptions?: KyOptions
}

export interface SkuStockInfo {
  /** SKU ID */
  skuId: string
  /** SKU 名称（如 Eva 高亮黑） */
  skuName: string
  /** 当前库存数量 */
  stock: number
  /** 是否有库存 (stock > 0) */
  inStock: boolean
  /** 当前售价（单位：分） */
  price?: number
  /** 原价（单位：分） */
  originalPrice?: number
  /** 告警状态（1: 正常, -1: 缺货） */
  warnStatus?: number
}

export type EvaStockEventType =
  | 'RESTOCKED' // 无库存 -> 有库存
  | 'OUT_OF_STOCK' // 有库存 -> 无库存（售罄）
  | 'RAPID_DECREASE' // 库存快速减少
  | 'STOCK_INCREASED' // 补货增加
  | 'STILL_IN_STOCK' // 持续有库存
  | 'STILL_OUT_OF_STOCK' // 持续无库存
  | 'INITIAL' // 首次检测

export interface SkuStockRecord {
  skuId: string
  skuName: string
  stock: number
  inStock: boolean
  price?: number
  warnStatus?: number
  timestamp: number
  formattedTime: string
}

export interface SkuStockEvent {
  skuId: string
  skuName: string
  eventType: EvaStockEventType
  previousStock?: number
  currentStock: number
  diff: number
  timestamp: number
  formattedTime: string
  title: string
  message: string
}

export type EvaNotifyPolicy = 'onChange' | 'inStock' | 'always'

export interface EvaStockCheckOptions {
  /** 要监控的 SKU ID 列表或自定义 SKU 映射字典，默认监控黑白双色 */
  skus?: (EvaSkuId | string)[] | Record<string, string>
  /** 商品 ID，默认 5310000100239002 */
  itemId?: string
  /** 底层查询配置覆盖 */
  fetchOptions?: Partial<FetchEvaStockOptions>
  /** 是否发送 Bark 推送通知，默认 false */
  notify?: boolean
  /**
   * 通知触发策略：
   * - 'onChange': 仅在库存状态发生转移或快速变化时通知（如无转有、有转无、急剧减少、补货）（默认）
   * - 'inStock': 只要有库存就通知
   * - 'always': 每次检查均通知
   */
  notifyPolicy?: EvaNotifyPolicy
  /** 是否仅在有库存时通知（若为 true 则抑制无货相关的通知） */
  onlyInStock?: boolean
  /** 触发库存快速减少告警的最小差值阈值，默认 5 件 */
  rapidChangeThreshold?: number
  /** 是否持久化保存本次记录，默认 true */
  saveRecord?: boolean
  /** 自定义 storage 实例，默认使用 core 中的统一 storage */
  storage?: Storage
  /** 自定义 Bark 标题或动态标题生成函数 */
  notifyTitle?: string | ((event: SkuStockEvent) => string)
  /** 自定义 Bark 正文或动态正文生成函数 */
  notifyMessage?: string | ((event: SkuStockEvent) => string)
  /** 自定义 Bark 分组名，默认 '领克商城' */
  notifyGroup?: string
  /** 自定义 Bark 点击跳转 URL，默认领克商城 Eva 详情页 */
  notifyUrl?: string
  /** 自定义 Bark 通知中断级别，默认 'timeSensitive' */
  notifyLevel?: BarkInterruptionLevel
  /** 自定义 Bark 图标 URL */
  notifyIcon?: string
  /** 是否发送 Gotify 消息通知，默认 false；亦可传入特定 Gotify 配置 */
  notifyGotify?: boolean | GotifyOptions
  /** 自定义 Gotify 消息优先级 (0 - 10) */
  gotifyPriority?: number
}

export interface EvaStockCheckResult {
  /** 是否有任何 SKU 存在库存 (stock > 0) */
  hasStock: boolean
  /** 每个 SKU 的库存详情 */
  stocks: Record<string, SkuStockInfo>
  /** 每个 SKU 触发的库存变动事件 */
  events: Record<string, SkuStockEvent>
  /** 保存的最新记录详情 */
  records: Record<string, SkuStockRecord>
  /** 查询发生时间戳 */
  timestamp: number
  /** 是否全部 SKU 查询成功 */
  success: boolean
  /** 错误信息记录 */
  errors?: Record<string, unknown> & {
    notify?: unknown
  }
}
