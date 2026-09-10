# 🛠️ Scripts

> **基于现代工具链（tsdown）构建的高性能、支持按需加载的 TypeScript 自动化任务库。**

[![Node Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%5E11.22.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue.svg)](https://www.typescriptlang.org/)
[![Built with tsdown](https://img.shields.io/badge/built%20with-tsdown-purple.svg)](https://github.com/sxzz/tsdown)
[![Lint & Format](https://img.shields.io/badge/oxc-oxlint%20%26%20oxfmt-red.svg)](https://oxc.rs/)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-vitest-yellow.svg)](https://vitest.dev/)

---

## 📖 项目简介 (Introduction)

本项目是一个由作者个人维护并日常使用的自动化脚本与任务工具库（Personal Scripts & Automation Toolkit）。

主要用于解决日常生活中的自动化任务（如**物业水电费余额定时巡检**、**Bark 手机推送通知**等）。虽然主要用途为个人脚本，但全套代码均按照**生产级开源类库**的工程规范进行设计与实现：
- 采用现代 ESM-first 规范并向下兼容 CommonJS；
- 提供极致的按需加载与 Tree-shaking 支持；
- 具备强健的错误重试、退避机制与高覆盖率单元测试。

十分欢迎社区开发者参考、复用或提出改进建议！

---

## ✨ 核心特性 (Features)

- ⚡️ **极速现代化构建**：基于 [tsdown](https://github.com/sxzz/tsdown)（Rolldown / Vite 驱动），秒级构建，默认输出双格式产物（`esm` / `cjs`），内置 `.d.ts` 类型生成与 `publint` / `attw` 导出可用性检查。
- 🌳 **严格按需加载 (Tree-shaking)**：配置 Node.js 原生 Subpath Exports（支持 `import { ... } from 'scripts'` 或直接引入子路径 `import { ... } from 'scripts/balance'`），零未用冗余代码。
- 🦀 **极速 Oxc 工具链**：采用纯 Rust 实现的 [oxlint](https://oxc.rs/) 进行静态代码检查、[oxfmt](https://oxc.rs/) 进行代码格式化，告别庞大缓慢的传统 ESLint / Prettier。
- 🛡️ **健壮的基础设施**：
  - **HTTP 客户端**：基于 [ky](https://github.com/sindresorhus/ky) 封装，集成自动表单序列化（过滤空值）、指数重试退避与双端模块解析。
  - **环境变量管理**：基于 `std-env` 与 `destr` 封装的类型安全 `useEnv`，缺失必填配置时提供精准错误提示。
  - **Bark iOS 消息推送**：全功能 Bark 客户端，支持各种通知等级、自定义图标/声音及多设备批量推送。
- 🧪 **可靠的自动化测试**：基于 [Vitest](https://vitest.dev) 编写，针对重试退避、网络容错、边界情况实现完整覆盖。

---

## 📂 项目结构 (Project Structure)

```text
scripts/
├── src/
│   ├── core/                    # 通用基础设施核心层（无具体业务依赖）
│   │   ├── env.ts               # 类型安全的环境变量加载与解析
│   │   ├── utils.ts             # 异步 sleep 等通用工具函数
│   │   ├── client.ts            # 基于 ky 封装的高级 HTTP 客户端
│   │   └── bark.ts              # iOS Bark 消息推送服务客户端
│   ├── tasks/                   # 自动化业务任务模块
│   │   └── balance/             # 水电费余额查询与巡检任务
│   │       ├── constants.ts     # 物业接口端点、表单常数、枚举
│   │       ├── types.ts         # 数据模型与入参类型声明
│   │       ├── api.ts           # 核心通用查询 API（支持重试与退避）
│   │       ├── electricity.ts   # 电费余额便捷查询
│   │       ├── water.ts         # 水费余额便捷查询
│   │       └── index.ts         # 批量巡检任务编排与通知推送
│   └── index.ts                 # 统一顶层导出入口
├── tests/                       # 单元测试用例
│   ├── utils.test.ts
│   ├── client.test.ts
│   ├── bark.test.ts
│   └── balance.test.ts
├── tsdown.config.ts             # 打包构建配置
├── vitest.config.ts             # 单元测试配置
├── .oxlintrc.json               # Oxc Lint 代码检查配置
├── .oxfmtrc.json                # Oxc Format 代码格式化配置
├── .env.example                 # 环境变量模版
└── package.json
```

---

## 🚀 快速上手 (Quick Start)

### 1. 环境要求
- **Node.js**: `>= 24.0.0`
- **Package Manager**: [pnpm](https://pnpm.io/) `>= 11.22.0`

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
复制根目录的 `.env.example` 为 `.env` 并填入实际参数：
```bash
cp .env.example .env
```

配置字段示例：
```ini
# 电费账号配置
ELECTRICITY_CARNO=你的电费卡号或户号
ELECTRICITY_TABLE_ID=你的电表表号ID

# 水费账号配置
WATER_CARNO=你的水费卡号或户号
WATER_TABLE_ID=你的水表表号ID

# Bark 推送通知配置（可选）
BARK_API_BASE=https://api.day.app
BARK_DEVICE_KEY=你的Bark设备Key
```

---

## 💡 代码使用示例 (Usage Examples)

### 1. 运行水电费余额批量巡检与通知
```typescript
import { runBalanceCheck } from 'scripts/balance'

// 执行巡检：自动查询水费与电费，并通过 Bark 推送通知
const result = await runBalanceCheck({
  electricity: true,
  water: true,
  notify: true,
  notifyTitle: '🏠 每日水电费余额提醒',
})

console.log('巡检结果:', result)
// 输出: { timestamp: 1710000000000, success: true, electricity: '188.30', water: '72.50' }
```

### 2. 独立查询电费或水费
```typescript
import { getElectricityBalance, getWaterBalance } from 'scripts/balance'

// 从环境变量自动读取卡号与表号
const electricity = await getElectricityBalance()
console.log(`当前电费余额: ${electricity} 元`)

// 或者手动传入参数覆盖默认配置
const water = await getWaterBalance({
  carno: 'custom_carno',
  tableId: 'custom_table_id',
})
console.log(`当前水费余额: ${water} 元`)
```

### 3. 发送 Bark 手机推送通知
```typescript
import { sendToBark, createBarkClient } from 'scripts'

// 简单文本推送
await sendToBark('这是一条来自服务器自动化任务的通知！')

// 发送高级富文本推送
await sendToBark({
  title: '⚠️ 余额预警',
  body: '电费余额已不足 20 元，请及时充值！',
  level: 'timeSensitive',
  badge: 1,
  sound: 'minuet',
  group: '生活缴费',
})

// 创建具有固定预设的 Bark 客户端实例
const bark = createBarkClient({
  apiBase: 'https://api.day.app',
  deviceKey: 'YOUR_DEVICE_KEY',
})
await bark.send('自定义实例消息')
```

### 4. 使用通用 HTTP 客户端
```typescript
import { httpClient, createHttpClient } from 'scripts'

// 发起标准 GET 请求并自动解析 JSON
const data = await httpClient.get<{ status: string }>('https://api.example.com/status')

// 发起 application/x-www-form-urlencoded POST 请求并自动过滤空字段
const postRes = await httpClient.postForm('https://api.example.com/form', {
  username: 'admin',
  optionalField: undefined, // 自动忽略
})
```

---

## 🔨 开发与维护命令 (Scripts)

| 命令 | 说明 |
| :--- | :--- |
| `pnpm run build` | 使用 `tsdown` 进行双格式编译打包 |
| `pnpm run typecheck` | 运行 TypeScript 严格类型检查 (`tsc --noEmit`) |
| `pnpm run test` | 运行 Vitest 单元测试套件 |
| `pnpm run lint` | 使用 `oxlint` 进行极速代码静态分析 |
| `pnpm run lint:fix` | 自动修复可自动解决的 lint 警告/错误 |
| `pnpm run fmt:check` | 使用 `oxfmt` 校验代码格式 |
| `pnpm run fmt` | 使用 `oxfmt` 格式化所有代码文件 |

---

## 🤝 参与与贡献 (Contributing)

虽然本项目是以作者个人日常生活自动化为出发点构建的，但也非常欢迎任何形式的交流与共建！
- **遇到 Bug 或建议**：欢迎提交 [Issue](https://github.com/libraoly/scripts/issues)。
- **贡献代码**：欢迎提出 [Pull Request](https://github.com/libraoly/scripts/pulls)。提交前请确保运行并通过 `pnpm run typecheck && pnpm run lint && pnpm run fmt:check && pnpm test`。
- **添加新任务**：可参考 `src/tasks/balance` 的设计，在 `src/tasks/` 下新增任务模块，并在 `package.json` 与 `tsdown.config.ts` 中配置相应的子路径导出。

---

## 📄 开源许可证 (License)

[UNLICENSED](LICENSE) © [libraoly](mailto:uylor.liao@gmail.com)
