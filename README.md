# 🛠️ Scripts

> **基于现代工具链（tsdown + oxc）构建的高性能、自用 TypeScript 自动化任务与生活脚本库。**

[![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%5E12.3.4-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7%2B-blue.svg)](https://www.typescriptlang.org/)
[![Built with tsdown](https://img.shields.io/badge/built%20with-tsdown-purple.svg)](https://github.com/sxzz/tsdown)
[![Lint & Format](https://img.shields.io/badge/oxc-oxlint%20%26%20oxfmt-red.svg)](https://oxc.rs/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-vitest-yellow.svg)](https://vitest.dev/)

---

## 📖 项目定位与简介 (Introduction)

本项目是作者自用的**个人生活与日常运维自动化任务脚本库（Personal Scripts & Automation Toolkit）**。

旨在将个人日常生活中分散、繁琐且高频的定期查询、巡检与即时告警推送等工作流全面工程化与自动化，实现稳定、高效、低开销的无人值守执行。

虽然定位为个人私有脚本，但全套工程均严格遵循现代化类库标准构建：

- **纯粹且现代的工具链**：放弃传统厚重的 ESLint / Prettier，全面拥抱 Rust 驱动的 Oxc（`oxlint` + `oxfmt`）与 Rolldown 驱动的 `tsdown`；
- **强韧的网络容错与退避**：针对外部第三方接口偶发超时或抖动，内置指数退避（Exponential Backoff）重试与单项错误隔离降级机制；
- **极致的模块化与按需加载**：基础设施与业务任务严格解耦，支持 Node.js 原生 Subpath Exports，零多余依赖与代码冗余；
- **生产级测试保障**：配置完整的单元测试（Mock 隔离）与真实网络 / 产物运行的端到端测试（E2E）。

---

## 🧩 现有任务模块 (Tasks)

| 任务 / 模块            | 模块路径          | 说明                                                                                          | 外部依赖 / 服务                     |
| :--------------------- | :---------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------- |
| **水电费余额巡检**     | `scripts/balance` | 自动抓取物业电表、水表当前余额，支持独立查询与综合巡检，内置失败重试与 Bark / Gotify 通知集成 | 物业系统接口 (EasyLife)             |
| **Eva 机器人库存监控** | `scripts/eva`     | 自动监控领克商城车载 Eva 机器人黑白双色实时库存，支持自动重试与 Bark / Gotify 时效性通知      | 领克商城接口 (api-dmall.lynkco.com) |

---

## ✨ 核心特性 (Features)

- ⚡️ **极速现代化构建**：基于 [tsdown](https://github.com/sxzz/tsdown)（Rolldown 驱动），毫秒级完成 ESM 与 CJS 双格式打包，内置类型定义生成及 `publint` / `attw` 导出规范性检验。
- 🌳 **原生 Subpath Exports**：完全遵循 Node.js 现代模块导出标准，直接引入子路径 `import { ... } from 'scripts/balance'`，实现任务级按需加载，零冗余代码。
- 🦀 **Rust 驱动代码检查与格式化**：全流程使用 [oxlint](https://oxc.rs/) 与 [oxfmt](https://oxc.rs/)，享受极致的代码校验与格式化速度。
- 🛡️ **容错与退避机制**：
  - 物业接口采用模拟微信环境请求头与参数结构；
  - 查询失败自动进入指数退避重试，避免被远端限流或瞬时故障击垮；
  - 巡检任务中若水费或电费某一项查询失败，不会中断整体执行流程，错误自动记录至 `errors` 字段。
- 🧪 **完备的自动化测试体系**：基于 Vitest Projects 架构，分为单元测试（零网络依赖）与端到端测试（校验产物与实际服务连通性）。

---

## 📂 项目结构与分层架构 (Project Structure)

```text
scripts/
├── src/
│   ├── core/                    # [内部基础设施]：严禁对外导出，仅供任务模块内部调用
│   │   ├── env.ts               # 类型安全的环境变量加载与解析 (useEnv)
│   │   ├── utils.ts             # 异步 sleep 等通用工具函数
│   │   ├── client.ts            # 基于 ky 封装的高级 HTTP 客户端 (httpClient)
│   │   ├── bark.ts              # iOS Bark 消息推送服务客户端 (sendToBark)
│   │   ├── gotify.ts            # Gotify 自建消息推送服务客户端 (sendToGotify)
│   │   └── storage.ts           # 基于 unstorage (fsDriver) 的本地持久化存储 (storage)
│   ├── tasks/                   # [业务任务模块]：每个任务为独立子目录
│   │   ├── balance/             # 水电费余额查询与巡检任务
│   │   │   ├── constants.ts     # 物业接口端点、表单常数、枚举
│   │   │   ├── types.ts         # 数据模型与入参类型声明
│   │   │   ├── api.ts           # 核心通用查询 API（支持重试与退避）
│   │   │   ├── electricity.ts   # 电费余额查询高阶函数
│   │   │   ├── water.ts         # 水费余额查询高阶函数
│   │   │   └── index.ts         # 批量巡检任务编排与统一导出
│   │   └── eva/                 # 领克商城 Eva 机器人库存监控任务
│   │       ├── constants.ts     # 商城端点、SKU 映射、Bark 与默认 Header 常量
│   │       ├── types.ts         # 商品动态响应实体、事件定义与入参类型
│   │       ├── api.ts           # 单 SKU 库存拉取与指数退避重试 (fetchEvaStock)
│   │       ├── events.ts        # 状态转移判定与 date-fns 动态标题文案生成
│   │       └── index.ts         # 多 SKU 分开发送通知、错误隔离与持久化巡检
│   └── index.ts                 # 顶层任务导出入口（仅汇聚导出 tasks，不导出 core）
├── test/                        # 测试套件（Vitest Projects 架构）
│   ├── unit/                    # 单元测试（Mock 隔离、零网络依赖）
│   └── e2e/                     # 端到端测试（真实服务连通性与打包产物执行）
├── tsdown.config.ts             # 双格式打包与导出配置
├── vitest.config.ts             # 测试配置（多 Project 管理）
├── .oxlintrc.json               # Oxc Lint 代码检查配置
├── .oxfmtrc.json                # Oxc Format 代码格式化配置
├── .env.example                 # 环境变量模版
└── package.json
```

> 📌 **分层架构说明**：
>
> - `src/core/`（HTTP 客户端、Bark 推送、环境变量管理等）为**内部私有基础设施**，仅供各个任务模块内部通过 Subpath Imports（`#core/*`）按需消费，严禁对外导出；
> - `src/tasks/` 为具体的**业务任务模块**，对外仅暴露各任务的能力（如 `scripts/balance`），确保职责明确、边界清晰。

---

## 🚀 快速上手 (Quick Start)

### 1. 环境准备

- **Node.js**: `>= 24.0.0`（充分利用原生 `--env-file` 与现代 ESM 特性）
- **包管理器**: [pnpm](https://pnpm.io/) `>= 12.3.4`

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制根目录的 `.env.example` 为 `.env` 并填入实际参数：

```bash
cp .env.example .env
```

环境变量说明：

```ini
# 电费账号配置
ELECTRICITY_CARNO=你的电费卡号或户号
ELECTRICITY_TABLE_ID=你的电表表号ID

# 水费账号配置
WATER_CARNO=你的水费卡号或户号
WATER_TABLE_ID=你的水表表号ID

# Bark 推送通知配置
BARK_DEVICE_KEYS=你的Bark设备Key列表（支持逗号分隔或 JSON 数组）
BARK_API_BASE=https://api.day.app
# 推送分组（默认值为 Scripts）
BARK_GROUP=Scripts
# 推送图标（默认使用项目定制图标）
BARK_ICON=https://s41.ax1x.com/2026/09/12/pneJPOK.png

# Gotify 推送通知配置（https://gotify.net/api-docs）
GOTIFY_API_BASE=https://gotify.example.com
GOTIFY_APP_TOKEN=你的Gotify应用Token
GOTIFY_DEFAULT_PRIORITY=5
```

---

## 🏃 任务运行与自动化调度 (Execution & Scheduling)

### 1. 编译构建

在首次运行或修改代码后，构建打包产物：

```bash
pnpm run build
```

### 2. 命令行直接执行

借助 Node.js 24 原生 `--env-file` 参数，可直接加载 `.env` 并在无额外依赖的情况下执行巡检任务：

```bash
# 执行水电费余额巡检
node --env-file=.env --input-type=module -e "import('./dist/balance.mjs').then(m => m.runBalanceCheck({ bark: true }))"

# 执行领克商城 Eva 机器人库存监控（有货时自动发送 Bark 通知）
node --env-file=.env --input-type=module -e "import('./dist/eva.mjs').then(m => m.runEvaStockCheck({ bark: true }))"
```

### 3. 系统定时任务配置

#### Linux Crontab 示例

每天早晨 08:30 自动执行一次水电费巡检并通过 Bark 发送通知：

```bash
30 8 * * * cd /path/to/scripts && /usr/local/bin/node --env-file=.env --input-type=module -e "import('./dist/balance.mjs').then(m => m.runBalanceCheck({ bark: true }))" >> /tmp/balance.log 2>&1
```

#### macOS launchd 配置示例

在 `~/Library/LaunchAgents/com.user.scripts.balance.plist` 中配置定时任务：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.scripts.balance</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>--env-file=/path/to/scripts/.env</string>
        <string>--input-type=module</string>
        <string>-e</string>
        <string>import('/path/to/scripts/dist/balance.mjs').then(m => m.runBalanceCheck({ bark: true }))</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>30</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/scripts_balance.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/scripts_balance_err.log</string>
</dict>
</plist>
```

---

## 💡 代码调用示例 (Code Examples)

### 1. 运行水电费余额批量巡检与通知

```typescript
import { runBalanceCheck } from 'scripts/balance'

// 执行巡检：自动查询水费与电费，并通过各渠道参数灵活启用与配置
// - true 快捷启用：使用环境变量默认读取对应渠道配置
// - 渠道配置对象：传入自定义配置覆盖（如 Bark 的 group/icon，Gotify 的 priority/appToken 等）
// - false 或缺省：不启用该渠道
const result = await runBalanceCheck({
  electricity: true,
  water: true,
  bark: true, // 启用 Bark，使用默认 env 读取
  gotify: {
    // 启用 Gotify，使用自定义配置覆盖
    priority: 8,
  },
  notifyTitle: '🏠 每日水电费余额巡检',
})

console.log('巡检结果:', result)
// 输出: { timestamp: 1710000000000, success: true, electricity: '188.30', water: '72.50' }
```

### 2. 按需单项查询与自定义配置

```typescript
import { runBalanceCheck } from 'scripts/balance'

// 仅查询电费，不发送通知
const elecResult = await runBalanceCheck({
  water: false,
})
console.log(`当前电费余额: ${elecResult.electricity} 元`)

// 仅查询水费，并手动传入参数覆盖默认配置
const waterResult = await runBalanceCheck({
  electricity: false,
  water: {
    carno: 'custom_carno',
    tableId: 'custom_table_id',
  },
})
console.log(`当前水费余额: ${waterResult.water} 元`)
```

### 3. 运行领克商城 Eva 机器人库存监控与通知

```typescript
import { runEvaStockCheck } from 'scripts/eva'

// 监控 Eva 车载机器人库存（默认同时监控极地白与高亮黑两款 SKU）
// - 自动基于 unstorage 本地文件持久化记录对比上一次库存状态；
// - 支持无货到有货（🎉 发现现货）、售罄（⚠️ 已售罄）、库存急剧变动（⚡ 快速变化）等多维度事件判定；
// - 每个 SKU 独立分发通知，支持各通知渠道独立配置（true 读取 env，obj 自定义配置）；
// - 默认 policy 为 'onChange'（仅在状态变动或首次有货时推送），避免定时轮询高频骚扰。
const result = await runEvaStockCheck({
  bark: true, // 启用 Bark（默认环境变量读取）
  gotify: true, // 启用 Gotify（默认环境变量读取）
  notifyPolicy: 'onChange',
})

console.log('库存监控结果:', result)
// 输出包含 hasStock、stocks、events（变动事件）与 records（持久化快照）
```

### 4. 单 SKU 原子查询与自定义参数

```typescript
import { fetchEvaStock } from 'scripts/eva'

// 查询指定 SKU 实时库存
const stockInfo = await fetchEvaStock({
  skuId: '5310000100278003', // Eva 高亮黑
})

console.log(`${stockInfo.skuName} 剩余库存: ${stockInfo.stock} 件`)
```

---

## 🔨 开发与维护命令 (Scripts)

| 命令                 | 说明                                                  |
| :------------------- | :---------------------------------------------------- |
| `pnpm run build`     | 使用 `tsdown` 构建 ESM & CJS 双格式产物及类型声明文件 |
| `pnpm run typecheck` | 运行 TypeScript 严格类型检查 (`tsc --noEmit`)         |
| `pnpm run test`      | 运行全部测试套件（Unit + E2E）                        |
| `pnpm run test:unit` | 运行快速单元测试（Mock 隔离、零网络请求）             |
| `pnpm run test:e2e`  | 运行端到端测试（依赖 `.env` 真实网络请求与产物验证）  |
| `pnpm run lint`      | 使用 `oxlint` 进行极速代码静态分析                    |
| `pnpm run lint:fix`  | 自动修复可自动解决的 lint 问题                        |
| `pnpm run fmt:check` | 使用 `oxfmt` 校验全项目代码格式                       |
| `pnpm run fmt`       | 使用 `oxfmt` 格式化所有代码文件                       |

---

## ➕ 扩展新任务指南 (Adding New Tasks)

当需要新增个人自动化任务时（例如天气巡检 `src/tasks/weather/`）：

1. **创建任务模块**：在 `src/tasks/` 下建立独立子目录，遵循标准分层：
   - `constants.ts`：常量、接口地址、默认配置；
   - `types.ts`：数据类型定义；
   - `api.ts`：底层数据获取与重试逻辑；
   - `index.ts`：高阶业务编排入口与对内对外导出。
2. **配置构建入口**：
   - 在 `tsdown.config.ts` 的 `entry` 中加入新入口（本项目已开启 `exports: true`，构建时 `tsdown` 会基于 `entry` 自动更新并维护 `package.json` 的 `exports` 映射，无需手动修改）：
     ```typescript
     weather: 'src/tasks/weather/index.ts',
     ```
   - 在 `src/index.ts` 中补充顶层任务聚合导出：`export * from './tasks/weather'`。
3. **补充测试用例**：
   - 在 `test/unit/` 编写单元测试（使用 mock 隔离外部网络）；
   - 在 `test/e2e/` 编写端到端真实调用测试；
4. **运行全量校验**：执行 `pnpm run typecheck && pnpm run lint && pnpm run fmt:check && pnpm test` 确保无差错。

---

## 📄 许可证 (License)

[UNLICENSED](LICENSE) © [libraoly](mailto:uylor.liao@gmail.com)（个人自用项目，保留所有权利）
