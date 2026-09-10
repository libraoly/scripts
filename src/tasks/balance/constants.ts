export const BASE_URL = 'http://system.es-it.cn/WebSolution/EasyLife/data.aspx'

export const ELECTRICITY_CARNO_ENV_NAME = 'ELECTRICITY_CARNO'
export const ELECTRICITY_TABLE_ID_ENV_NAME = 'ELECTRICITY_TABLE_ID'
export const WATER_CARNO_ENV_NAME = 'WATER_CARNO'
export const WATER_TABLE_ID_ENV_NAME = 'WATER_TABLE_ID'

export const COMMON_FORM = {
  method: 'BuildRequest',
  propertyKey: 'changye',
  redirect: 'QueyThreeTableBalance',
  areaId: '3287eecc-7fe5-468c-a2db-ec98aeaefb04',
} as const

export const HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'http://system.es-it.cn',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.62',
} as const

export const TableName = {
  electricity: 'electricity',
  water: 'water',
} as const

export type TableName = (typeof TableName)[keyof typeof TableName]
