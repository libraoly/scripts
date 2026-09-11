# 🤖 AGENTS.md — AI Agent 协作与开发指南

> 本文档专为协助本项目开发与维护的 AI Agent（如 Antigravity、Claude Code、Cursor、Copilot 等）和自动化协作工具编写，系统性说明代码库架构设计、工具链规范、测试要求及编码准则。

---

## 📌 项目定位与核心理念

- **项目定位**：基于现代工具链（`tsdown` + `oxc`）构建的高性能、可 Tree-shaking 的 TypeScript 自动化任务脚本库。
- **主要用途**：满足个人生活/运维任务的自动化执行（如物业水电费余额自动巡检、Bark 消息推送等），同时面向社区保持高质量的开源库级代码标准。
- **架构哲学**：
  1. **极速轻量**：坚持使用 Rust 驱动的 Oxc 工具链（`oxlint` / `oxfmt`）与 Rolldown / Vite 驱动的 `tsdown`，不引入传统庞大的 ESLint / Prettier。
  2. **高容错与健壮性**：网络请求和外部任务必须具备重试（Retry）、退避（Backoff）与局部错误降级（Graceful Degradation）机制。
  3. **模块化与按需加载**：基础设施（`src/core`）与具体业务任务（`src/tasks/*`）严格解耦；业务任务独立打包，支持 Node Subpath Exports。
  4. **类型安全先行**：强制严格模式（`strict: true`、`noUncheckedIndexedAccess: true`、`verbatimModuleSyntax: true`）。

---

## 🛠️ 技术栈与工具链规范

| 类别           | 选用技术 / 规范               | 核心规则与注意事项                                                                             |
| :------------- | :---------------------------- | :--------------------------------------------------------------------------------------------- |
| **Node.js**    | `>= 24.0.0`                   | 利用现代 Node 原生特性（原生 `URLSearchParams`、Subpath Imports `#*`）。                       |
| **包管理器**   | `pnpm >= 12.3.4`              | 锁定文件为 `pnpm-lock.yaml`，请勿使用 npm 或 yarn。                                            |
| **构建打包**   | `tsdown`                      | 配置文件为 `tsdown.config.ts`。打包目标输出至 `dist/`，必须支持 ESM (`.mjs`) 与 CJS (`.cjs`)。 |
| **静态检查**   | `oxlint` (`.oxlintrc.json`)   | **禁止使用 ESLint**。检查命令为 `pnpm run lint`，修复命令为 `pnpm run lint:fix`。              |
| **代码格式化** | `oxfmt` (`.oxfmtrc.json`)     | **禁止使用 Prettier**。单引号、无分号、最大行宽 120 字符。命令：`pnpm run fmt`。               |
| **测试框架**   | `vitest` (`vitest.config.ts`) | 支持针对定时器使用 `vi.useFakeTimers()`，网络 Mock 使用 `vi.spyOn` 或参数注入。                |

---

## 📂 代码结构与职责划分

```text
src/
├── core/                        # [核心基础设施层]：严禁耦合任何特定业务逻辑
│   ├── env.ts                   # 环境变量读取器（基于 std-env + destr，严格类型推断）
│   ├── utils.ts                 # 通用非业务工具（如异步 sleep）
│   ├── client.ts                # 基于 ky 封装的高级 HTTP 客户端
│   └── bark.ts                  # iOS Bark 消息推送客户端
├── tasks/                       # [自动化任务业务层]：每个业务为独立子目录
│   └── balance/                 # 水电费余额查询业务
│       ├── constants.ts         # 业务常量、URL、默认 Form 参数
│       ├── types.ts             # 接口响应体、入参配置、执行结果类型
│       ├── api.ts               # 底层数据拉取与重试退避实现
│       ├── electricity.ts       # 电费查询高阶函数
│       ├── water.ts             # 水费查询高阶函数
│       └── index.ts             # 业务任务调度入口（日志输出 + Bark 推送集成）
└── index.ts                     # 全局顶层对外导出入口
```

---

## 📐 编码与架构设计准则

### 1. 环境变量使用规范

- **禁止** 在业务代码中直接读取未封装的 `process.env.XXX`。
- **必须** 统一通过 `src/core/env.ts` 的 `useEnv<T>(key, fallback?)` 获取：
  ```typescript
  import { useEnv } from '#core/env'
  // 必填项：不传 fallback，缺失时会自动抛出清晰可读的异常
  const carno = useEnv<string>('WATER_CARNO')
  // 可选项：传入默认回退值
  const baseUrl = useEnv<string>('CUSTOM_URL', 'https://default.com')
  ```
- **同步模版**：新增环境变量时，必须在根目录 `.env.example` 中补充相应说明与注释。

### 2. HTTP 请求与网络容错

- 所有 HTTP 请求必须使用 `src/core/client.ts` 中的 `httpClient` 或 `createHttpClient`。
- POST 表单请求使用 `client.postForm(url, data)`，会自动过滤值为 `null` 或 `undefined` 的键，避免向服务端提交非法空值。
- 网络重试应搭配退避机制（如 `src/tasks/balance/api.ts` 中的 `delayMs = backoff ** attempt * 1000`）。
- 批量任务（如同时查询水费与电费）必须具备**局部容错能力**，某一单项失败应记录至 `result.errors`，不能直接导致整个脚本崩溃未捕获。

### 3. Subpath Imports 与路径别名

- 内部模块相互引用优先使用 Node Subpath Imports `#core/*` 与 `#tasks/*`（在 `package.json` 的 `imports` 中已定义 `#* -> ./src/*`）。
- 避免书写跨层级的长相对路径（如 `../../core/utils`）。

### 4. 新增业务任务规范

若要在 `src/tasks/` 下新增任务（例如 `src/tasks/weather/`）：

1. 目录结构保持规范：`constants.ts`、`types.ts`、`api.ts`、`index.ts`。
2. 在 `package.json` 的 `exports` 中增加子路径声明，如 `"./weather": { "import": "./dist/weather.mjs", "require": "./dist/weather.cjs" }`。
3. 在 `tsdown.config.ts` 的 `entry` 中加入新入口：`weather: 'src/tasks/weather/index.ts'`。
4. 在 `test/unit/` 下建立对应的单元测试文件 `test/unit/weather.test.ts`，并在 `test/e2e/` 下补充端到端测试。

---

## 🧪 测试与质量保证准则

在提交或声称任务完成前，必须确保以下命令全部通过：

1. **类型检查**：
   ```bash
   pnpm run typecheck
   ```
2. **代码风格与静态检查**：
   ```bash
   pnpm run lint
   pnpm run fmt:check
   ```
3. **测试验证**：
   ```bash
   pnpm run test:unit   # 快速单元测试（Mock隔离、零外部网络依赖）
   pnpm run test:e2e    # 真实运行端到端测试（依赖 .env 配置）
   pnpm run test        # 运行全部测试套件（Unit + E2E）
   ```
4. **编译构建打包**：
   ```bash
   pnpm run build
   ```

---

## 📝 Git 提交与工作流规范

- **提交信息风格**：采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，并且**统一使用中文描述**。
- **常见类型（Type）**：
  - `feat`: 新增功能特性（如新任务、新工具函数）
  - `fix`: 修复问题
  - `chore`: 配置变更、构建与工具链维护
  - `docs`: 文档修改与补充
  - `test`: 测试用例增补或调整
  - `refactor`: 代码重构（未改变外部行为）
- **范例**：
  - `feat(tasks/balance): 增加水费阶梯用量解析支持`
  - `test(core/client): 补充网络超时重试单元测试`
  - `docs: 更新 README 中的使用说明与环境变量配置项`
