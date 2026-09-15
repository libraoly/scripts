/**
 * E2E 测试辅助工具与环境检测
 */

/**
 * 判断是否具备查询水电费余额所需的完整环境变量
 */
export function hasBalanceEnv(): boolean {
  return Boolean(
    process.env.ELECTRICITY_CARNO &&
    process.env.ELECTRICITY_TABLE_ID &&
    process.env.WATER_CARNO &&
    process.env.WATER_TABLE_ID,
  )
}

/**
 * 判断是否具备 Bark 推送通知所需的设备凭据
 */
export function hasBarkEnv(): boolean {
  return Boolean(process.env.BARK_DEVICE_KEYS)
}

/**
 * 校验余额是否为合法金额格式（正数或负数浮点数/整数，如 "182.60"、"72.49"、"0.00"、"0"）
 */
export const BALANCE_REGEX = /^-?\d+(\.\d+)?$/

/**
 * 延时辅助函数（用于避免在多个真实请求间高频触发目标接口限流）
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
