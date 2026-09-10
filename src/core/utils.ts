/**
 * 辅助延时函数（毫秒）
 *
 * @param ms 延时毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
