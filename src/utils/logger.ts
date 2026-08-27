import { consola, type ConsolaInstance } from 'consola'

/**
 * 全局统一日志输出实例
 */
export const logger: ConsolaInstance = consola.create({
  defaults: {
    tag: 'scripts',
  },
})

/**
 * 创建带有特定 Tag 的子 Logger 实例
 * @param tag 模块或任务标识
 */
export function createLogger(tag: string): ConsolaInstance {
  return logger.withTag(tag)
}

export { consola, type ConsolaInstance }
