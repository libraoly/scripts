# AGENTS.md

> **AI 智能体开发规范与项目唯一事实来源 (Single Source of Truth)**  
> 本文件为所有参与本项目设计、编码、测试与重构的 AI Agent 提供核心约束与工程指南。在进行任何代码编写或架构决策时，必须严格遵守以下原则与规范。

---

## 1. 核心工程哲学 (Core Engineering Philosophies)

本项目在架构演进与日常开发中严格贯彻以下 **7 条核心原则**：

### 1.1 拒绝向后兼容 (Do Not Preserve Backward Compatibility)
- **核心理念**：绝不为了兼容旧版本或历史用法而增加过渡层、垫片（shim）或回退逻辑。
- **行动准则**：当引入更好的设计或升级依赖时，直接移除旧的代码路径和已废弃的实现，保持代码库的纯净与轻量。

### 1.2 极简实现 (Simplest Implementation)
- **核心理念**：选择能完全满足当前需求的最简方案。
- **行动准则**：坚决避免推测性的抽象、过度配置和多层间接调用（YAGNI 原则）。满足功能需求且类型安全的最少代码即为最优代码。

### 1.3 分层演进 (Grow the System in Layers)
- **核心理念**：从能端到端运行的最简版本开始（Walking Skeleton / Tracer Bullet），在已跑通的产品之上稳步叠加新能力。
- **行动准则**：绝不用已有的可用系统去换取未完成的复杂性；每一次变更都必须保证主干处于可编译、可运行、可测试的稳定状态。

### 1.4 模块化与职责分离 (Modular & Separated)
- **核心理念**：保持组件的高度模块化，确保单一职责与关注点清晰分离。
- **行动准则**：
  - 核心逻辑（Core）与通用工具（Utils）、I/O 边界严格解耦。
  - 禁止模块间隐式耦合或循环引用。

### 1.5 善用成熟基建 (Prefer Established Libraries)
- **核心理念**：当能够显著降低整体复杂度或提升系统可靠性时，优先采用生态中维护良好、成熟的工业级库。
- **行动准则**：无充分且正当的理由，坚决不重复造轮子。

### 1.6 榨干现有依赖 (Lean on Existing Dependencies)
- **核心理念**：在引入新第三方包或自行编写复杂算法前，先彻底挖掘项目中现有依赖以及 Node.js 原生能力的潜力。
- **行动准则**：充分利用 Node.js 24+ 原生能力（如 `node:fs/promises`、`node:path`、原生 `fetch`、`node:crypto` 等）；未仔细查阅已有依赖的 API 和类型定义前，不要主观假设现有库缺乏某项能力。

### 1.7 长远架构决策 (Long-term Architectural Decisions)
- **核心理念**：架构决策必须着眼长远，绝不接受仅为当下凑合、注定未来会被推倒重写的权宜之计（stopgap）。
- **行动准则**：编写任何代码时都应遵循统一的范式、清晰的契约与自解释的类型体系，确保系统具备长期可维护性。

---

## 2. 技术栈基线 (Technology Stack Baseline)

| 领域 | 选型 | 说明 |
| :--- | :--- | :--- |
| **运行时 (Runtime)** | Node.js (v24+) | 全面使用现代 Node 原生特性（如 `import.meta.dirname`、原生 Glob、原生 fetch 等） |
| **包管理 (Package Manager)** | pnpm (v11+) | 严格依赖隔离与快速安装 |
| **模块规范 (Module System)** | 纯 ESM (`type: module`) | 彻底摒弃 CommonJS；全库所有源码与配置文件均为 ESM |
| **核心语言 (Language)** | TypeScript (Strict Mode) | 开启 `verbatimModuleSyntax`、严格空值检查，严禁滥用 `any` |
| **构建工具 (Bundler)** | `tsdown` | 基于 Rolldown + Oxc，负责极速打包与 `.d.ts` 类型生成 |
| **测试框架 (Test Runner)** | Vitest | 快速、原生的 ESM 单元与集成测试 |
| **开发与脚本执行 (Dev Execution)** | `tsx` | 零配置即时执行 TypeScript 脚本 |

---

## 3. 目录骨架与分层规范 (Directory Structure)

```text
scripts/
├── .gitignore           # Git 忽略配置
├── AGENTS.md            # AI 智能体核心规范与唯一事实来源 (本文件)
├── package.json         # 项目元数据、依赖与 NPM Scripts
├── tsconfig.json        # TypeScript 严格模式配置 (纯 ESM / noEmit)
├── tsdown.config.ts     # tsdown 打包配置 (Rolldown + Oxc)
├── vitest.config.ts     # Vitest 测试配置
├── src/                 # 源码目录
│   ├── index.ts         # 统一公共导出入口
│   ├── core/            # 核心业务逻辑、任务编排与领域模型
│   ├── utils/           # 通用纯函数工具集 (无副作用)
│   ├── types/           # 跨模块共享 TypeScript 类型定义
│   └── scripts/         # 独立可执行任务脚本 (由 tsx 或 CLI 触发)
├── tests/               # 测试文件目录
│   └── index.test.ts    # 单元与集成测试
└── dist/                # 构建输出目录 (只读，由 tsdown 自动生成)
```

---

## 4. 编码与类型规范 (Coding & Type Conventions)

1. **自解释类型优先**：
   - 优先使用清晰、精准命名的 `interface` 与 `type` 表达数据流与输入输出契约。
   - 避免无效冗长的代码注释；仅在描述复杂算法边界、公共 API 契约或特殊业务规则时编写精炼的 JSDoc。
2. **严格类型安全**：
   - 禁止使用 `any`，必须使用精确类型、泛型约束或 `unknown` + 类型守卫（Type Guard）。
   - 优先使用 Discriminated Union（可辨识联合类型）表达多态状态。
3. **现代 ESM 语法**：
   - 禁止使用 `require()`、`module.exports`、`__dirname`、`__filename`。
   - 文件路径处理使用 Node.js 原生 `import.meta.dirname` 或 `node:path`。
   - 导入内置模块必须统一带有 `node:` 前缀（如 `import fs from 'node:fs/promises'`）。

---

## 5. AI Agent 交付自检清单 (Self-Review Checklist)

在每次生成或修改代码后，AI Agent 必须按以下清单进行自我审查：

- [ ] **是否保持极简？** 是否存在任何未被实际调用的过渡抽象或未来假设？
- [ ] **是否纯粹 ESM？** 是否存在任何 CommonJS 残余语法？
- [ ] **是否善用现有基建？** 是否重复编写了 Node 24 原生或现有依赖已具备的能力？
- [ ] **是否类型完备？** 接口是否自解释？是否有潜在的 `any` 或未处理的 `undefined`/`null`？
- [ ] **是否具备测试覆盖？** 新增或调整的核心功能是否均有对应的 Vitest 用例验证？
