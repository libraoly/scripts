import { describe, it, expect } from 'vitest'
import { getEnv, getRequiredEnv, normalizeEnvKey } from '../src/utils/env'

describe('normalizeEnvKey', () => {
  it('应当转换为小写并移除下划线与中划线', () => {
    expect(normalizeEnvKey('ELECTRICITY_TABLE_ID')).toBe('electricitytableid')
    expect(normalizeEnvKey('electricity-table-id')).toBe('electricitytableid')
    expect(normalizeEnvKey('ElectricityTableId')).toBe('electricitytableid')
  })
})

describe('getEnv', () => {
  it('精确匹配环境变量', () => {
    const mockEnv = {
      ELECTRICITY_TABLE_ID: 'exact-id-123',
    }
    const val = getEnv('ELECTRICITY_TABLE_ID', undefined, mockEnv)
    expect(val).toBe('exact-id-123')
  })

  it('按候选列表优先级匹配', () => {
    const mockEnv = {
      SECONDARY_KEY: 'second-val',
      THIRD_KEY: 'third-val',
    }
    const val = getEnv(['FIRST_KEY', 'SECONDARY_KEY', 'THIRD_KEY'], undefined, mockEnv)
    expect(val).toBe('second-val')
  })

  it('支持常见前缀扩展匹配 (如 BALANCE_, EASY_LIFE_)', () => {
    const mockEnv1 = {
      BALANCE_WATER_TABLE_ID: 'balance-prefix-id',
    }
    expect(getEnv('WATER_TABLE_ID', undefined, mockEnv1)).toBe('balance-prefix-id')

    const mockEnv2 = {
      EASY_LIFE_AREA_ID: 'easy-life-area',
    }
    expect(getEnv('AREA_ID', undefined, mockEnv2)).toBe('easy-life-area')
  })

  it('支持宽泛的模糊与大小写容错匹配', () => {
    const mockEnv = {
      electricity_table_id: 'lower-case-id',
    }
    expect(getEnv('ELECTRICITY_TABLE_ID', undefined, mockEnv)).toBe('lower-case-id')

    const mockEnvKebab = {
      'balance-water-table-id': 'kebab-id',
    }
    expect(getEnv('WATER_TABLE_ID', undefined, mockEnvKebab)).toBe('kebab-id')
  })

  it('未匹配到时返回 fallback 默认值', () => {
    const mockEnv = {}
    expect(getEnv('NON_EXISTENT_KEY', 'default-val', mockEnv)).toBe('default-val')
    expect(getEnv('NON_EXISTENT_KEY', undefined, mockEnv)).toBeUndefined()
  })

  it('忽略空字符串值并继续寻找有效值或 fallback', () => {
    const mockEnv = {
      FIRST_KEY: '',
      SECOND_KEY: 'valid-val',
    }
    expect(getEnv(['FIRST_KEY', 'SECOND_KEY'], 'fallback', mockEnv)).toBe('valid-val')
  })
})

describe('getRequiredEnv', () => {
  it('存在值时正常返回', () => {
    const mockEnv = { APP_SECRET: 'my-secret' }
    expect(getRequiredEnv('APP_SECRET', undefined, mockEnv)).toBe('my-secret')
  })

  it('缺失时抛出明确异常', () => {
    const mockEnv = {}
    expect(() => getRequiredEnv('MISSING_KEY', undefined, mockEnv)).toThrow(
      'Missing required environment variable: [MISSING_KEY]'
    )
  })
})
