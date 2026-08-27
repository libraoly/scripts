# Scripts

> 现代化、极速构建且 **AI-Native** 的 Node.js 脚本与通用工具库仓库。

[![Node.js](https://img.shields.io/badge/Node.js-v24+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v11+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tsdown](https://img.shields.io/badge/Bundler-tsdown-FF5722)](https://tsdown.dev/)
[![Vitest](https://img.shields.io/badge/Test-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 🌟 核心特性 (Key Features)

- ⚡ **现代化技术底座**：基于 **Node.js 24+** 与 **pnpm 11+**，全面采用原生 ESM (`type: module`)，彻底告别 CommonJS 历史包袱。
- 🚀 **极速打包与类型提取**：基于 **`tsdown`**（由 Rolldown + Oxc 驱动），实现毫秒级打包与 `.d.ts` 自动化生成。
- 🤖 **AI-Native 开发规范**：严格贯彻 [`AGENTS.md`](./AGENTS.md) 所定义的 7 条核心工程哲学，作为所有 AI 智能体编码与协作的唯一事实来源。
- 🪵 **统一结构化日志**：集成成熟的 **`consola`**，提供具备作用域标签（Tag）与层级化展示的现代日志系统。
- 🧪 **轻量高效测试**：采用 **Vitest** 原生 ESM 单元测试与集成测试体系。
- 📐 **严格自解释类型**：TypeScript 开启 `verbatimModuleSyntax` 与极致空值安全，零 `any` 污染。

---

## 🛠️ 技术栈 (Technology Stack)

| 维度 | 选型 | 说明 |
| :--- | :--- | :--- |
| **运行时 (Runtime)** | Node.js (v24+) | 原生 ESM、`import.meta.dirname`、Node 24 特性 |
| **包管理器 (Package Manager)** | pnpm (v11+) | 严格依赖隔离与快速安装 |
| **模块规范 (Module System)** | 纯 ESM | 严格 `type: module`，统一使用 `node:` 内置模块协议 |
| **开发语言 (Language)** | TypeScript (Strict) | 全量开启静态检查与类型收窄，`noEmit: true` |
| **构建工具 (Bundler)** | `tsdown` | 基于 Rolldown + Oxc 的下一代极速打包器 |
| **测试框架 (Test Runner)** | Vitest | 极速原生 ESM 测试执行器 |
| **统一日志 (Logger)** | `consola` | 结构化、美观且支持标签化过滤的控制台工具 |
| **开发执行 (Runner)** | `tsx` | 零配置即时执行 TypeScript 脚本 |

---

## 📁 目录结构 (Directory Structure)

```text
scripts/
├── .gitignore           # Git 忽略配置 (忽略构建产物与缓存)
├── AGENTS.md            # AI 智能体开发规范与核心工程哲学 (Single Source of Truth)
├── README.md            # 项目使用与架构说明文档 (本文件)
├── package.json         # 项目依赖、exports 映射与 NPM Scripts
├── tsconfig.json        # TypeScript 严格模式配置 (纯类型检查)
├── tsdown.config.ts     # tsdown 打包配置文件
├── vitest.config.ts     # Vitest 测试套件配置文件
├── src/                 # 源码目录
│   ├── index.ts         # 统一公共 API 导出入口
│   ├── core/            # 核心领域逻辑、任务编排与执行引擎
│   │   └── task.ts      # 任务执行器与耗时度量
│   ├── utils/           # 通用纯函数工具集 (无副作用)
│   │   ├── format.ts    # 耗时与格式化工具
│   │   └── logger.ts    # 基于 consola 的统一日志器
│   ├── types/           # 跨模块共享 TypeScript 强类型定义
│   │   └── index.ts     # TaskResult, TaskOptions 等接口
│   └── scripts/         # 独立可执行的 CLI 脚本入口
│       └── example.ts   # 脚本示例
└── tests/               # 单元测试与端到端测试目录
    └── index.test.ts    # 核心能力验证用例
```

---

## 🚀 快速上手 (Quick Start)

### 常用 NPM Scripts

- **构建产物**：
  ```bash
  pnpm build
  ```
- **监听构建 (Dev Mode)**：
  ```bash
  pnpm dev
  ```
- **类型检查 (Typecheck)**：
  ```bash
  pnpm typecheck
  ```
- **运行测试 (Test)**：
  ```bash
  pnpm test
  ```
- **监听测试 (Watch Mode)**：
  ```bash
  pnpm test:watch
  ```
- **执行独立脚本**：
  ```bash
  pnpm tsx src/scripts/example.ts
  ```

---

## 💡 代码示例 (Usage Example)

### 1. 统一日志输出 (Unified Logging)

```ts
import { createLogger, logger } from './utils/logger.js'

// 使用全局默认日志器
logger.info('全局操作日志')

// 创建带有特定模块标签的日志器
const buildLogger = createLogger('builder')
buildLogger.success('模块编译完成！')
buildLogger.error('编译出现异常', new Error('Fail'))
```

### 2. 任务编排与执行 (Task Execution)

```ts
import { executeTask } from './core/task.js'
import { formatDuration } from './utils/format.js'
import { createLogger } from './utils/logger.js'

const log = createLogger('job')

const result = await executeTask({
  name: 'SyncData',
  run: async () => {
    // 异步数据操作...
    return { count: 42 }
  },
})

if (result.status === 'success') {
  log.success(`[${result.name}] 执行完成，耗时: ${formatDuration(result.durationMs)}`)
}
```

---

## 🧠 AI 智能体工程规范 (AI Agentic Guidelines)

本项目全面贯彻以下 **7 条核心工程哲学**，参与本项目的 AI 必须以 [`AGENTS.md`](./AGENTS.md) 作为唯一事实来源：

1. **拒绝向后兼容 (Do Not Preserve Backward Compatibility)**：不保留任何废弃语法、CJS 回退或过渡垫片。
2. **极简实现 (Simplest Implementation)**：拒绝过度抽象与推测性封装，满足需求的最少代码即最优解。
3. **分层演进 (Grow the System in Layers)**：从可端到端运行的最小骨架开始，稳步叠加能力。
4. **模块化与职责分离 (Modular & Separated)**：`core`、`utils`、`types` 与 `scripts` 单向解耦。
5. **善用成熟基建 (Prefer Established Libraries)**：优先采用工业级标准库，不重复造轮子。
6. **榨干现有依赖 (Lean on Existing Dependencies)**：深度挖掘 Node 24 原生能力与已引入依赖的潜能。
7. **长远架构决策 (Long-term Architectural Decisions)**：拒绝短期妥协性补丁，坚守清晰的契约与自解释类型。

---

## 📄 许可证 (License)

[ISC](LICENSE)
