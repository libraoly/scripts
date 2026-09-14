# 🤖 AGENTS.md — AI Agent 协作与开发指南

> 本文档专为协助本项目开发、维护与扩展的 AI Agent（如 Antigravity、Claude Code、Cursor、Copilot 等）编写，系统性规范代码库架构设计、工具链准则、避坑要点、质量门禁及编码守则。

---

## 📌 项目定位与核心哲学

- **项目定位**：作者自用的**个人生活与日常运维自动化任务脚本库（Private Automation Toolkit）**。
- **主要用途**：满足个人生活与日常运维场景中各类定期巡检、信息查询、状态监控与告警推送任务的高效自动化执行。
- **设计哲学**：
  1. **私有自用，但保持开源库级工程标准**：项目标记为 `"private": true`，无需多余的开源社区号召或客套，但全套代码坚持生产级健壮性、零冗余 Tree-shaking、极速构建与严格类型安全。
  2. **极速轻量**：坚决选用 Rust 驱动的 Oxc 工具链（`oxlint` / `oxfmt`）与 Rolldown / Vite 驱动的 `tsdown`，**严禁引入任何 ESLint / Prettier 等厚重传统工具**。
  3. **高容错与健壮性**：外部第三方服务接口往往不稳定甚至偶发超时，网络请求必须具备重试（Retry）、退避（Backoff）与单项错误隔离降级机制。
  4. **严格解耦与模块化**：通用基础设施（`src/core`）与具体业务任务（`src/tasks/*`）严格解耦；每个业务任务独立打包，支持 Node.js 原生 Subpath Exports。
  5. **原生与类型安全先行**：强制严格 TypeScript 模式（`strict: true`、`noUncheckedIndexedAccess: true`、`verbatimModuleSyntax: true`），优先使用 Node.js 24 原生能力。

---

## 🛠️ 技术栈与工具链规范

| 类别           | 选用技术 / 规范               | 核心规则与注意事项                                                                                                                        |
| :------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**    | `>= 24.0.0`                   | 优先利用现代 Node 原生特性（原生 `--env-file`、原生 `URLSearchParams`、Subpath Imports `#*`）。严禁引入 `dotenv`、`node-fetch` 等冗余包。 |
| **包管理器**   | `pnpm >= 12.3.4`              | 锁定文件为 `pnpm-lock.yaml`，严禁使用 npm 或 yarn。                                                                                       |
| **构建打包**   | `tsdown`                      | 配置文件为 `tsdown.config.ts`。构建目标输出至 `dist/`，必须支持 ESM (`.mjs`) 与 CJS (`.cjs`) 双格式，内置 `publint` 与 `attw` 校验。      |
| **静态检查**   | `oxlint` (`.oxlintrc.json`)   | **严禁使用 ESLint**。检查命令为 `pnpm run lint`，自动修复为 `pnpm run lint:fix`。                                                         |
| **代码格式化** | `oxfmt` (`.oxfmtrc.json`)     | **严禁使用 Prettier**。规则：单引号、无分号、最大行宽 120 字符。校验：`pnpm run fmt:check`，格式化：`pnpm run fmt`。                      |
| **测试框架**   | `vitest` (`vitest.config.ts`) | 基于 Vitest Projects 分离 `unit`（单元测试，零外部网络依赖）与 `e2e`（真实运行与产物集成测试）。                                          |

---

## 📂 代码架构与分层导出规范

```text
src/
├── core/                        # [内部基础设施层]：严禁对外导出！仅供内部任务通过 #core/* 按需调用
│   ├── env.ts                   # 环境变量读取器（基于 std-env + destr，严格类型推断）
│   ├── utils.ts                 # 通用非业务工具（如异步 sleep）
│   ├── client.ts                # 基于 ky 封装的高级 HTTP 客户端
│   ├── bark.ts                  # iOS Bark 消息推送客户端
│   ├── gotify.ts                # Gotify 自建消息推送服务客户端
│   └── storage.ts               # 基于 unstorage 的统一本地持久化存储
├── tasks/                       # [自动化任务业务层]：每个业务为独立子目录，对外暴露业务能力
│   └── balance/                 # 水电费余额查询与巡检任务
│       ├── constants.ts         # 业务常量、URL、默认 Form 参数、请求头
│       ├── types.ts             # 接口响应体、入参配置、执行结果类型
│       ├── api.ts               # 底层数据拉取与重试退避实现 (fetchBalance)
│       ├── electricity.ts       # 电费查询高阶函数 (getElectricityBalance)
│       ├── water.ts             # 水费查询高阶函数 (getWaterBalance)
│       └── index.ts             # 业务任务调度与对外统一入口 (runBalanceCheck)
└── index.ts                     # 顶层任务聚合导出入口（仅汇聚导出 tasks，严禁导出 core）
```

### 导出规范与铁律（极其重要）

1. **🚫 核心铁律：`core` 层严禁对外导出**：
   - **本项目是私人自动化任务脚本库，绝不是通用的基础公共 SDK**。
   - `src/core/` 下的所有模块（`client.ts`, `bark.ts`, `env.ts`, `utils.ts`）属于**内部私有基础设施**，仅用于各任务模块内部通过 Node Subpath Imports（`#core/*`）按需消费。
   - **严禁** 在 `src/index.ts` 中导出任何 `core` 内容！
   - **严禁** 在 `package.json` 的 `exports` 中暴露 `./core` 或相关导出！外部调用者只需要关注具体的自动化任务（如水电费余额巡检）。
2. **业务任务模块导出**：
   - 每个任务目录下的 `index.ts` 作为该任务的高阶编排调度与对外入口（如 `runBalanceCheck`），集中暴露该任务的核心能力与必要参数类型。
   - 内部子模块（如原子查询、内部常量、底层模型等）按需在模块内拆分组织，**不强制**在 `index.ts` 中全量重导出，避免增加不必要的接口暴露。
3. **顶层入口与 Subpath 映射**：
   - `src/index.ts` 只聚合导出业务任务模块（例如 `export * from './tasks/balance'`）。
   - `package.json` 的 `exports` 由 `tsdown`（配置了 `exports: true`）在构建时基于 `tsdown.config.ts` 的 `entry` 自动增删维护，无需手动修改。

---

## 📐 编码准则与避坑指南 (Pitfalls & Best Practices)

### 1. 环境变量读取与 `destr` 类型陷阱

- **禁止** 在业务代码中直接读取 `process.env.XXX`，必须统一通过 `src/core/env.ts` 的 `useEnv<T>(key, fallback?)`。
- **⚠️ `destr` 自动转换陷阱**：
  `destr` 会自动将纯数字字符串转换为 JavaScript `number`（例如纯数字卡号 `'101001763'` 会变成 `101001763`）。
  若业务字段要求为 `string`（如卡号、表号、带前导 0 的编号），在获取或构造参数时务必防御性地使用 `String(...)`，避免类型不匹配或丢失精度：
  ```typescript
  const carno = String(useEnv<string>('WATER_CARNO'))
  ```
- **配置同步**：任何新增的环境变量，**必须**同步更新到根目录 `.env.example`，并附带清晰的注释说明。

### 2. HTTP 请求与网络容错

- 所有 HTTP 请求必须使用 `src/core/client.ts` 中的 `httpClient` 或通过 `createHttpClient` 派生。
- **POST 表单空值过滤**：`client.postForm(url, data)` 会自动过滤值为 `null` 或 `undefined` 的键，避免向服务端提交非法空键值。
- **模拟合法请求头**：生活服务类第三方接口（如物业系统）往往对客户端来源有校验，必须严格使用微信专属 User-Agent（`MicroMessenger`）以及对应的 Origin、Accept 等请求头。
- **退避重试（Backoff Retry）**：外部接口可能偶发 500、网关超时或网络抖动。必须在底层封装带有指数退避的重试机制（如 `delayMs = backoff ** attempt * 1000`）。
- **局部容错与降级**：
  - 批量巡检任务中，某一项查询失败（如水费接口超时）**绝不能**抛出未捕获异常导致脚本非预期 crash；
  - 必须记录局部错误至 `result.errors.water`，将 `result.success` 标记为 `false`，并继续执行其他有效查询与统计。
- **旁路通知隔离**：
  - 发送 Bark 手机推送属于辅助通知能力，若 Bark 接口失败，应使用 `logger.warn` 记录并写入 `errors.notify`，严禁干扰核心查询结果。

### 3. 数据解析的防御性编码

- 第三方非标准接口的响应可能为 HTML 错误页、空响应体或缺少预期字段。
- 解析响应数据时必须全程采用可选链（Optional Chaining）与空值合并运算符（Nullish Coalescing）：
  ```typescript
  return raw?.body?.data?.balance ?? null
  ```
  严禁未做存在性校验直接访问嵌套深层属性。

### 4. 路径引用规范

- 内部模块相互引用**统一使用 Node 原生 Subpath Imports `#*`**（在 `package.json` 的 `imports: { "#*": "./src/*" }` 与 `tsconfig.json` 的 `paths` 中通配映射）：
  - 引用任意 `src/` 下模块直接通过 `#<dir>/...` 访问（如 `#core/...`、`#tasks/...` 或未来新增的任意子目录）；
  - **严禁** 书写跨层级深层相对路径（如 `../../core/client`），保持模块间引用的扁平、清晰与规范。

---

## ➕ 新增业务任务标准流程 (Task Expansion SOP)

若要在 `src/tasks/` 下新增任务模块（例如新增天气巡检 `src/tasks/weather/`）：

1. **建立模块目录结构**：
   ```text
   src/tasks/weather/
   ├── constants.ts     # 常量、端点、默认配置
   ├── types.ts         # 请求入参、响应实体、返回结果类型
   ├── api.ts           # 核心 API 请求与重试退避逻辑
    └── index.ts         # 任务高阶调度函数与业务导出
   ```
2. **注册构建入口 (自动同步 exports)**：
   - 仅需在 `tsdown.config.ts` 的 `entry` 中加入新任务入口：
     ```typescript
     weather: 'src/tasks/weather/index.ts',
     ```
   - 项目已在 `tsdown.config.ts` 中开启 `exports: true`，构建时 `tsdown` 会基于 `entry` 自动更新并维护 `package.json` 的 `exports` 映射，**无需手动修改 `package.json`**。
3. **顶层入口同步**：在 `src/index.ts` 中增加 `export * from './tasks/weather'`。
4. **补充测试套件**：
   - 在 `test/unit/weather.test.ts` 编写单元测试（严格 mock 网络请求与依赖）；
   - 在 `test/e2e/weather.test.ts` 补充端到端测试；
   - 在 `test/e2e/bundle.test.ts` 中增加对该模块打包产物导出的断言。
5. **更新文档**：在 `README.md` 中的“现有任务概览”与代码示例中补充该任务的说明。

---

## 🧪 质量验证与门禁标准

在提交代码、声称任务完成或创建 Commit 前，**必须严格按顺序运行并通过以下所有命令**：

```bash
# 1. 严格 TypeScript 类型检查
pnpm run typecheck

# 2. Oxc 代码质量检查
pnpm run lint

# 3. Oxc 格式校验
pnpm run fmt:check

# 4. 双格式编译构建打包
pnpm run build

# 5. Vitest 全量测试套件（Unit + E2E）
pnpm run test
```

> **注意**：在沙箱受限环境中执行命令若遇到权限阻断，应在 bypass sandbox 下仅运行对应的最小化工具命令。

---

## 📝 Git 提交规范

- **提交信息风格**：采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，并且**统一使用中文描述**。
- **常见类型（Type）**：
  - `feat`: 新增功能特性（如新任务模块、新基础设施）
  - `fix`: 修复缺陷（如异常处理、类型修复、导出补齐）
  - `chore`: 配置变更、依赖升级与构建工具维护
  - `docs`: 文档编写、修改与优化
  - `test`: 测试用例增补或重构
  - `refactor`: 代码重构（不改变外部行为）
- **范例**：
  - `feat(tasks/balance): 优化水电费巡检错误隔离与退避机制`
  - `docs: 优化 README 与 AGENTS 指南，明确自用定位与内部架构边界`
  - `test(e2e): 增强对构建产物双格式导出的断言覆盖`
