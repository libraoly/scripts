export const BASE_URL = 'https://api-dmall.lynkco.com/portal/api/item/render/dynamic'

export const DEFAULT_ITEM_ID = '5310000100239002'

export const DEFAULT_APP_CODE = '3fa3314998bd4195a9fe2df3e85e6a12'

export const DEFAULT_PROVINCE_ID = '110000'
export const DEFAULT_CITY_ID = '110100'
export const DEFAULT_REGION_ID = '110101'

export const DEFAULT_JUMP_URL =
  'lynkco://h5/?routeUrl=https://app.lynkco.com/app-h5/dist/web/pages/attachment-mall/detail/page-web.html?id=5310000100239002'

export const DEFAULT_BARK_GROUP = '领克商城'

export const DEFAULT_BARK_LEVEL = 'timeSensitive'

export const DEFAULT_BARK_TITLE = '领克商城 Eva 库存提醒'

export const TITLE_IN_STOCK = '🎉 发现 Eva 机器人现货！'
export const TITLE_NO_STOCK = 'ℹ️ Eva 机器人当前暂无库存'
export const TITLE_OUT_OF_STOCK = '⚠️ Eva 机器人已售罄！'
export const TITLE_RAPID_DECREASE = '⚡ Eva 机器人库存快速变化！'
export const TITLE_STOCK_INCREASED = '📦 Eva 机器人补货增加！'

export const EVA_STORAGE_PREFIX = 'eva:stock'
export const DEFAULT_RAPID_CHANGE_THRESHOLD = 5

export const EVA_SKU_MAP = {
  '5310000100278003': 'Eva 高亮黑',
  '5310000100278002': 'Eva 极地白',
} as const

export type EvaSkuMap = typeof EVA_SKU_MAP
export type EvaSkuId = keyof EvaSkuMap

export const DEFAULT_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  Host: 'api-dmall.lynkco.com',
  Origin: 'https://app.lynkco.com',
  Referer: 'https://app.lynkco.com/',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 x-cordova-platform/ios cordova-6 appVersionCode/4.2.7 appVersionName/40207132',
  'acl-app': 'BUYER',
  Authentication: 'AppId=59701c08ed454a43a9b',
  appVersionCode: '4.2.7',
  appVersionName: '40207132',
} as const

export const EVA_ITEM_ID_ENV_NAME = 'EVA_ITEM_ID'
export const EVA_USER_ID_ENV_NAME = 'EVA_USER_ID'
export const EVA_APP_CODE_ENV_NAME = 'EVA_APP_CODE'
export const EVA_TOKEN_ENV_NAME = 'EVA_TOKEN'
