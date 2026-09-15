import type { BarkOptions } from './bark'
import type { GotifyOptions } from './gotify'

export interface BaseTaskChannelOptions {
  /** Bark 通知渠道配置：true 使用环境变量默认读取，或传入 BarkOptions 自定义配置 */
  bark?: boolean | BarkOptions
  /** Gotify 通知渠道配置：true 使用环境变量默认读取，或传入 GotifyOptions 自定义配置 */
  gotify?: boolean | GotifyOptions
}

export interface BaseTaskNotifyOptions extends BaseTaskChannelOptions {
  /** 自定义通知标题 */
  notifyTitle?: string
  /** 自定义通知正文 */
  notifyMessage?: string
}
