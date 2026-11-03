# 研究项目 DAG 工作台 — 实现契约 v1.2

> **v2.1 起内容优先重构**：新信息架构（内容 / 网络 / 工程）、`/content`、`/bridge` 接口见 [`DESIGN-v3.md`](DESIGN-v3.md)；宿主侧实现说明见 [`README.md`](README.md)。本文件继续作为工程页旧动作（submit/accept/reject/创建/verify 等）的接口契约。
> v1.2（2026-10-18）：**结果优先**。新增 `/results` 端点与 `auto` 动作；工作台默认视图改为「结果」，门控/状态降到「工程」页；对应 PROTOCOL v1.3。
> v1.1（2026-10-18）：新增创建类动作 `init / module-add / branch-add / handoff-new` 与「自由节点命名」支持（对应 PROTOCOL v1.2）；面板可直接新建项目、模块、分支、交接文件。

本文件是 `research-dag/workbench` 这个 DSH 插件包（bundle 名 `dsh-research-dag-workbench`）的**实现契约**。
宿主半侧与浏览器半侧并行开发，双方只按本契约对接；契约未覆盖处先问 Lead，不自行扩展。

参考实现（务必先读，照其模式写，不要自创插件机制）：

- `D:\ZhuanZ\Documents\sci-nma-mode\sci-nma-workbench\lib\host.js`（宿主半侧：webServer 前缀路由 + 子进程白名单 + run 注册表）
- `D:\ZhuanZ\Documents\sci-nma-mode\sci-nma-workbench\src\index.js`（客户端槽位注册）
- `D:\ZhuanZ\Documents\sci-nma-mode\sci-nma-workbench\src\WorkbenchPanel.js`（面板状态协调）
- `D:\ZhuanZ\Documents\sci-nma-mode\sci-nma-workbench\tools\build-client.mjs`（src → lib/client.js 装配）
- `D:\ZhuanZ\Documents\sci-nma-mode\verify\verify-workbench.cjs`（React shim + 宿主半侧独立验收测试）

被操作对象是 `research-dag` 协议项目，权威格式见 `D:\ZhuanZ\Documents\research-dag\docs\PROTOCOL.md`（CLI 契约见第 6 节，`--json` 输出见第 6 节末）。

---

## 1. 包结构与文件归属

```text
research-dag/workbench/
├── package.json            # Lead 已写：bundle 元数据 / main=lib/host.js / dsh.client
├── cordis.patch.yml        # Lead 已写：插入插件行
├── icon.svg                # Lead 已写
├── CONTRACT.md             # 本文件
├── lib/
│   ├── host.js             # 【宿主】wb-host 负责
│   └── client.js           # 【浏览器】wb-ui 生成（tools/build-client.mjs 产物，可提交）
├── src/                    # 【浏览器】wb-ui 负责（模块化源码）
├── tools/build-client.mjs  # 【浏览器】wb-ui 负责（照 sci-nma 改写）
├── verify/
│   ├── verify-host.mjs     # 【宿主】wb-host 负责
│   └── verify-client.mjs   # 【浏览器】wb-ui 负责
└── README.md               # Lead 负责（最后写）
```

- 宿主半侧**不得**引用 `src/`（客户端源码不进宿主作用域）；常量在 host.js 内自持。
- 浏览器半侧**不得**引用 `lib/host.js`；常量在 `src/core/constants.js` 自持。
- 构建产物 `lib/client.js` 由 `node tools/build-client.mjs` 生成；`src/` 是唯一源码处。

## 2. 宿主半侧 `lib/host.js`

### 2.1 模块外形（Cordis 插件）

```js
export const name = 'dsh-research-dag-workbench'
export const inject = ['webServer']
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/research-dag-workbench',
    handler: async (req, res) => { /* 见 2.3 */ },
  }))
}
```

**不要导出 `Config`**（Cordis 会对有 `Config` 的插件走 Standard Schema 校验；不导出即不校验，与 sci-nma 验证器口径一致）。

### 2.2 常量与路径

| 名称 | 值/规则 |
|---|---|
| `ROUTE_PREFIX` | `/research-dag-workbench` |
| 配置文件 | `$DSH_HOME/research-dag-workbench/config.json`，`{version:1, projectRoot:"<绝对路径>"}`；`DSH_HOME` 未设时用 `~/.dsh` |
| `kitRoot` | 由 `import.meta.url` 推：`lib/host.js` → 包根 → 上两级 = `research-dag/`（用 `fileURLToPath`） |
| 示例项目 | `<kitRoot>/examples/early-phosphate`（存在才在 health 返回） |
| 工具解析 | 优先 `<project>/control/dag.mjs`；不存在则 `<kitRoot>/tools/dag.mjs`。两种都调用 `process.execPath`，`cwd=project`，argv 末尾追加 `--root <project>` |
| 输出上限 | stdout/stderr 各截断到 200_000 字符，超出追加 `\n…[truncated]` |
| 子进程超时 | 120_000 ms，超时 kill 并记 `timedOut:true` |
| run 注册表 | 内存 Map，自增 id `r1,r2,…`；最多保留 100 条（超出淘汰最老的已完成记录）；**只序列化 run record**，绝不把 child 句柄放进 JSON |

### 2.3 HTTP 路由（全部挂在 ROUTE_PREFIX 下）

统一响应：`writeHead(status, {'content-type':'application/json; charset=utf-8'})` + `end(JSON.stringify(payload))`。
请求体 JSON 解析失败 → 400 `{ok:false, code:'E_BODY', message:'请求体不是合法 JSON'}`。

#### GET `/health`

```json
{
  "ok": true,
  "name": "dsh-research-dag-workbench",
  "version": "1.0.0",
  "route": "/research-dag-workbench",
  "actions": ["status","verify","list","check","submit","accept","reject","block","unblock","report","state-set",
              "results","auto","init","module-add","branch-add","handoff-new"],
  "kitRoot": "D:\\ZhuanZ\\Documents\\research-dag",
  "example": "D:\\ZhuanZ\\Documents\\research-dag\\examples\\early-phosphate",
  "configPath": "C:\\Users\\...\\.dsh\\research-dag-workbench\\config.json"
}
```

#### GET `/state?project=<绝对路径>`

- 无 `project` 参数时使用配置里的 `projectRoot`；都没有 → `{ok:true, configured:false, project:null}`。
- `project` 必须绝对路径；目录不存在 → `{ok:true, project:{root, exists:false, isDag:false}}`。
- 目录存在但不是 DAG 项目（无 `control/ledger.json`）→ `{ok:true, project:{root, exists:true, isDag:false}}`。
- 是 DAG 项目时，宿主**同步执行**两条 CLI（等子进程完成，串行，避免竞态）：
  `node <tool> status --json --root <project>`、`node <tool> verify --json --root <project>`，并读 `<project>/control/PROJECT_STATE.json`。返回：

```json
{
  "ok": true,
  "configured": true,
  "config": { "version": 1, "projectRoot": "D:\\..." },
  "project": {
    "root": "D:\\...",
    "exists": true,
    "isDag": true,
    "id": "early-phosphate",
    "title": "早期补磷的 target trial emulation",
    "goal": "研究总目标",
    "phase": "analysis",
    "next_steps": ["..."],
    "blockers": [],
    "modules": [ { "id":"M40", "name":"统计分析", "branches": 3,
                   "counts": {"draft":1,"provisional":1,"accepted":1,"rejected":0,"superseded":0,"blocked":0} } ],
    "branches": [ { "id":"B40-03", "module":"M40", "name":"IPTW 诊断", "dir":"modules/M40-statistics/branches/B40-03-iptw" } ],
    "handoffs": [ { "path":"modules/.../HANDOFF-....md", "module":"M40", "branch":"B40-03",
                    "stream":"iptw-diagnostics", "version":1, "status":"PROVISIONAL",
                    "created_at":"2026-10-18", "submitted_at":"2026-10-18" } ],
    "pending_decisions": [ { "path":"...", "stream":"...", "version":1, "questions":["..."] } ],
    "accepted": [ { "stream":"...", "path":"...", "version":1 } ],
    "counts": {"draft":1,"provisional":1,"accepted":4,"rejected":1,"superseded":1,"blocked":1}
  },
  "verify": { "ok": true, "checked": {"handoffs":12,"modules":6,"branches":13,"files":26}, "issues": [] },
  "statusRaw": { /* status --json 的原始对象，便于前端兜底 */ }
}
```

- CLI 失败（非 0）时：`ok` 仍为 `true`，`project` 用可读文件兜底填充，`verify` 放 CLI 的 JSON（`ok:false`+`issues`），并加 `"cliError":"<stderr 前 2000 字>"`。前端必须能展示该状态。
- `modules[].counts` / `project.counts` 的键固定为 `draft|provisional|accepted|rejected|superseded|blocked`，缺省补 0。
- `project.branches` 从 `control/PROJECT_STATE.json` 的 `branches[]` 透出（`id/module/name/dir`），供 DAG 视图显示「分支 id · 显示名」；缺失时前端可回退用 handoff 推导。自由命名下同样必须正确。

#### GET `/handoff?project=<abs>&path=<相对路径>`

读单个交接文件全文。`path` 必须：相对路径、规范化后仍在 project 内、匹配 `^modules/[^/]+/handoffs/HANDOFF-.+\.md$`、文件存在。返回：

```json
{ "ok": true, "path": "modules/.../HANDOFF-....md", "frontmatter": { /* 解析后的扁平对象 */ },
  "body": "## 1. ...", "content": "---\n...", "size": 3120 }
```

不允许 → 400 `{ok:false, code:'E_PATH', message:'...'}`。

#### GET `/results?project=<abs>`

**结果视图的数据源**：宿主执行 `node <tool> results --json --root <project>`，把 CLI 的 JSON **原样透传**（字段见 PROTOCOL v1.3 §8：`project/modules/results/pending/attention/counts`）。CLI 非 0 或 JSON 解析失败 → 500 `{ok:false, code:'E_INTERNAL', message, stdoutTail}`。该端点不得改变任何状态。

#### GET `/run?id=<runId>` → `{ok:true, run:{...}}`；不存在 → 404 `{ok:false, code:'E_NOT_FOUND'}`
#### GET `/runs` → `{ok:true, runs:[run,...]}`（按启动时间倒序）

run record：

```json
{ "id":"r3", "action":"accept", "argv":["accept", "...md", "--reason", "…", "--by", "main", "--root", "…"],
  "status":"running|succeeded|failed", "exitCode":0, "timedOut":false,
  "startedAt":"2026-10-18T12:00:00+08:00", "endedAt":null,
  "stdout":"...", "stderr":"...", "json": { /* 命令带 --json 时的解析结果，否则 null */ } }
```

`status` 判定：进程退出码 0 → `succeeded`，否则 `failed`（含超时/信号）。

#### POST `/config`

请求 `{ "projectRoot": "<绝对路径>" }`。必须绝对路径且存在目录，否则 400 `{ok:false, code:'E_PATH'}`。写配置文件（原子写：tmp + rename），返回 `{ok:true, config:{version:1, projectRoot}}`。

#### POST `/run`

请求：

```json
{ "action":"accept", "project":"<abs，可省略=取配置>", "handoff":"modules/...md",
  "reason":"接受 99% 截尾", "by":"main", "phase":"analysis", "next":"亚组分析", "blocker":"等待数据",
  "root":"D:\\papers\\new-project", "id":"literature", "name":"文献检索", "slug":"lit",
  "module":"literature", "branch":"pilot-a", "stream":"pilot-a", "title":"新论文项目", "goal":"研究总目标" }
```

字段按 action 取用（多余字段忽略）：

| 字段 | 用于 | 规则 |
|---|---|---|
| `project` | 除 init 外的全部 | 绝对路径且是 DAG 项目；缺省取配置 |
| `root` | init | 要创建的项目绝对路径（可不存在）；父目录必须存在且可写 |
| `id` / `name` / `slug` | init / module-add / branch-add | id 见下方「自由命名」；name 任意语言 ≤80 字；slug ≤40 字、`[A-Za-z0-9._-]*` |
| `label` | handoff-new | 可选，`[A-Za-z0-9._-]{0,40}`（宿主上限；CLI 本身允许 80） |
| `title` / `goal` | init | title 必填 ≤120 字；goal ≤500 字 |
| `module` | branch-add / handoff-new | 已注册模块 id |
| `branch` | handoff-new | 已注册分支 id |
| `stream` | handoff-new | 可选，`[a-z0-9][a-z0-9-]*`，缺省用分支 id 小写化 |
| `handoff` / `reason` / `by` / `phase` / `next` / `blocker` | 同 v1.0 | 同 v1.0 规则 |

**自由命名**（PROTOCOL v1.2）：模块/分支 id 不再要求 `M40`/`B40-03` 式编号，任何 `[A-Za-z0-9][A-Za-z0-9._-]{0,63}` 且项目内唯一即可；目录名由 CLI 按 `id[-slug]` 生成，`PROJECT_STATE.json.dir` 记录映射。宿主不得对 id 施加额外编号模式限制。

校验顺序：`action` 在白名单 → `project` 有效且是 DAG 项目 → action 需要的 `handoff`/`reason` 合法。任何不合法：400，`{ok:false, code:'E_ACTION'|'E_PROJECT'|'E_PATH'|'E_REASON', message}`。合法则同步 spawn（不等待？——**异步启动 + 立即返回 run 记录（status=running），由 GET /run 轮询**，与 sci-nma 一致）。返回 `{ok:true, run:{...}}`。

**action → argv 固定模板**（浏览器永远不能传 argv；只有下表插值，且每个值先校验/归一化）：

| action | argv（`--root` 与 project 由宿主追加） | 前置 |
|---|---|---|
| `status` | `status --json` | — |
| `verify` | `verify --json` | — |
| `list` | `list --json` | — |
| `check` | `check <handoff> --strict` | handoff |
| `submit` | `submit <handoff> --by <by>` | handoff；by 默认 `ui` |
| `accept` | `accept <handoff> --reason <reason> --by <by>` | handoff + reason；by 默认 `main` |
| `reject` | `reject <handoff> --reason <reason> --by <by>` | handoff + reason；by 默认 `main` |
| `block` | `block <handoff> --reason <reason> --by <by>` | handoff + reason；by 默认 `ui` |
| `unblock` | `unblock <handoff>` | handoff |
| `report` | `report` | — |
| `state-set` | `state set [--phase <phase>] [--next <next>] [--blocker <blocker>]` | 至少一个可选字段；phase 必须在枚举内 |
| `results` | `results --json` | —（结果视图刷新也可直接 GET `/results`） |
| `auto` | `auto --json` | **自动门控**：接受所有校验全绿的 PROVISIONAL，跳过失败项并返回问题；无额外参数 |
| `init` | `init <root> --id <id> --title <title> [--goal <goal>]` | root、id、title；root 绝对路径（可不存在） |
| `module-add` | `module add --id <id> --name <name> [--slug <slug>]` | id、name |
| `branch-add` | `branch new --module <module> --id <id> --name <name> [--slug <slug>]` | module 已注册；id、name |
| `handoff-new` | `handoff new --branch <branch> [--stream <stream>] [--slug <label>]` | branch 已注册；label 可选 |

归一化规则：`by` 仅 `[A-Za-z0-9._:@-]{1,64}`，否则默认值；`reason` 去空白后 1–2000 字符；`next`/`blocker` ≤500 字符；`phase` ∈ `planning|literature|design|data|analysis|manuscript|review|concluded`；路径规则同 `/handoff`（存在性：`check/submit/accept/reject/block/unblock` 要求存在；DRAFT 被 accept 由 CLI 报错也可）。
`state-set` 的 `--next`/`--blocker` 语义：追加（与 CLI 一致）。

### 2.4 安全与健壮性

- 子进程只用 `spawn(process.execPath, argv, {cwd, windowsHide:true, env:process.env})`，**绝不 shell:true**，绝不把浏览器字符串拼进一条命令。
- 不信任 `project` 或 `path` 的原始字符串：`resolve` 后做 `path.relative` 前缀检查，拒绝 `..`/盘符/UNC。
- 未捕获异常：捕获后 500 `{ok:false, code:'E_INTERNAL', message}`；宿主激活不得抛异常。
- 日志只写 stderr 少量诊断；不写项目目录。

## 3. 浏览器半侧 `src/`

### 3.1 模块清单与构建顺序（`tools/build-client.mjs` 的 SOURCES 必须与此一致）

```text
src/core/constants.js
src/core/api.js
src/components/StatusBadge.js
src/components/Header.js
src/components/ProjectBar.js
src/components/StatCards.js
src/components/ReasonDialog.js
src/components/HandoffTable.js
src/components/IssueList.js
src/components/RunConsole.js
src/views/ResultsView.js
src/views/OverviewView.js
src/views/DagView.js
src/views/HandoffsView.js
src/views/ControlView.js
src/WorkbenchPanel.js
src/index.js
```

- 组件全部是**普通渲染函数**（接收 `h` 与 props，返回 React 元素），例如 `export function renderHeader(h, props) {...}`；不用 JSX（构建器只做字符串拼装）。
- 只有 `WorkbenchPanel.js` 的 `createWorkbenchPanel(React)` 与 `index.js` 的 `createClientPlugin(React)` / `WorkbenchIcon(React)` 使用 `React.*`；两者在 factory 作用域内可用 `React`。
- 样式：内联 style 对象 + 常量 `STYLES`；不引入外部 CSS/图片；用 `color-mix(in srgb, currentColor X%, transparent)` 适配明暗主题（与 sci-nma 一致）。
- 中文 UI 文案。

### 3.2 常量 `src/core/constants.js`

```js
export const PANEL_ID = 'research-dag-workbench'
export const ROUTE = '/research-dag-workbench'
export const PHASES = [['planning','规划'],['literature','文献'],['design','设计'],['data','数据'],
                       ['analysis','分析'],['manuscript','写作'],['review','审稿'],['concluded','收束']]
export const STATUS_INFO = {
  DRAFT:      { label:'草稿',   color:'#9ca3af', bg:'rgba(156,163,175,.12)', border:'rgba(156,163,175,.3)' },
  PROVISIONAL:{ label:'待决定', color:'#f59e0b', bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.35)' },
  ACCEPTED:   { label:'已接受', color:'#10b981', bg:'rgba(16,185,129,.12)',  border:'rgba(16,185,129,.35)' },
  REJECTED:   { label:'已拒绝', color:'#ef4444', bg:'rgba(239,68,68,.12)',   border:'rgba(239,68,68,.35)' },
  SUPERSEDED: { label:'已被取代',color:'#8b5cf6', bg:'rgba(139,92,246,.12)', border:'rgba(139,92,246,.35)' },
  BLOCKED:    { label:'被阻塞', color:'#f97316', bg:'rgba(249,115,22,.12)',  border:'rgba(249,115,22,.35)' },
}
export const STYLES = { card, row, chip, muted, button, input, tab, tabActive, ... }
```

### 3.3 API 层 `src/core/api.js`

`fetchHealth()`、`fetchState(project)`、`fetchResults(project)`、`saveConfig(projectRoot)`、`postAction(body)`、`fetchHandoff(project, path)`、`settleRun(id, onTick)`（轮询 600ms，直到非 running 或预算耗尽）。全部 `fetch(`${ROUTE}/...`)`。

### 3.4 面板结构与交互（`WorkbenchPanel.js`）

Props：`{ project?: string, server?: any, config?: any }`（宿主可注入空对象）。

挂载流程：`fetchHealth()` → `fetchState(injected.project || '')`；若返回 `configured:true` 且有 `project.root` 自动加载；无项目则显示项目路径输入 + “加载示例项目”按钮（用 health.example）+ 保存配置。

顶部固定区：标题「研究项目 DAG 工作台」+ 项目 chip（phase）+ 项目路径输入 + 加载/保存 + 刷新 + 视图切换（4 个 tab，**默认 `结果`**）：`结果` / `交接` / `DAG` / `工程`。

视图：

1. **结果 ResultsView（默认）**：给人看的页面，不出现状态机术语，不要求用户操作门控。
   - 「需要你关注」区（顶部）：从 `/results.attention` 取校验问题（每项 `code` + 一句自然语言说明，如「有 1 项文件哈希不一致：<path>」）、`pending`（待确认结果，显示 question 摘要）、`blocked`；一条都没有时显示「没有需要你处理的事，继续专注研究」。
   - 操作条：「让系统处理可自动通过的结果」按钮 → `postAction({action:'auto'})` → 完成后刷新 `/results` 与 `/state`；health.actions 不含 `auto` 时隐藏按钮并显示「宿主为旧版本，重启 DSH 后可用」。
   - 已接受结果：按模块分组卡片。每张卡显示 `stream · v<版本>`、日期、`title`、`question`、`keyResults`（截断约 200 字，点击展开）、`limitations`（小字可折叠）、文件数 + 文件路径列表；点击卡片打开详情（`fetchHandoff`，等宽纯文本）。模块无结果时显示「这个模块还没有已接受结果」。
   - 数据源 `fetchResults(project)`；`/results` 失败时显示错误条，不影响其他 tab。
2. **交接 HandoffsView**：同 v1.1（筛选/表格/按状态操作/详情）。状态词显示平实中文：进行中 / 待确认 / 已出结果 / 已放弃 / 旧版本 / 卡住。
3. **DAG DagView**：同 v1.1（模块分列、分支 id+name、handoff 徽标、创建入口、详情）。
4. **工程 EngineeringView**：面向执行的合并页 = 原「概览」+「校验与运行」：统计卡；下一步/阻塞；待决定 handoff 表（模块/分支/版本/问题 + 接受/拒绝按钮 + ReasonDialog）；`verify` 问题清单；`report`；`state set` 表单；运行记录 RunConsole。日常不需要访问。

底部状态条：`busy` 时显示「执行中：<action>」；`error` 红色文本；加载中显示「加载中…」。

ReasonDialog：同 v1.1（受控弹层，理由必填）。

**创建入口**：同 v1.1（顶部新建项目、DAG 内新建模块/分支/交接）；`createEnabled` 门控保持（health.actions 含全部 4 个创建动作才显示）。

**能力门控（v1.2）**：`autoEnabled = health.actions.includes('auto')`；`resultsAvailable = health.actions.includes('results')`（缺失时结果页显示旧宿主提示，并回退到 `/state.accepted` 的简表）。

执行任何 `postAction` 后：`settleRun` → 刷新 `fetchState` 与 `fetchResults` → 若 action 属于写操作（`state-set/accept/reject/submit/block/unblock/report/auto/init/module-add/branch-add/handoff-new`）则刷新 runs。

### 3.5 槽位注册 `src/index.js`

照 sci-nma：

```js
export function WorkbenchIcon(React) { ... svg ... }
export function createClientPlugin(React) {
  const WorkbenchPanel = createWorkbenchPanel(React)
  const Icon = WorkbenchIcon(React)
  return { name: 'dsh-research-dag-workbench', inject: ['slots'],
    apply(ctx) {
      ctx.slots.inject('main', () => ctx.slots.register(
        { name: 'main', key: PANEL_ID, inject: () => ({ project: '', server: null, config: null }) },
        WorkbenchPanel))
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
        { name: 'sidebar.panellist', id: PANEL_ID, order: 21, label: () => '研究项目 DAG 工作台' },
        Icon))
    } }
}
```

## 4. 构建 `tools/build-client.mjs`

照 sci-nma 的 `build-client.mjs` 改写：

- `SOURCES` = 3.1 的 16 个文件；
- 去掉 `import ... from '...'` 行、把 `export function/const/let/class` 的 `export` 去掉；
- 生成 `lib/client.js`：

```js
window.__ModuleLoader__.load({
  id: 'dsh-research-dag-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    /* 各模块源码按顺序拼入 */
    return createClientPlugin(React)
  },
})
```

- 运行方式：`node tools/build-client.mjs`；构建后打印字节数。构建必须是幂等的（同源码同字节）。

## 5. 独立验收脚本

### 5.1 `verify/verify-host.mjs`（wb-host 写）

不依赖 DSH 运行，直接 `import` `lib/host.js`：

1. 模块外形：`name`/`inject` 正确；不导出 `Config`；`apply(ctx)` 用 mock `ctx.effect`/`ctx.webServer.register` 捕获路由：`kind==='prefix'`、`path==='/research-dag-workbench'`、handler 是函数。
2. mock req/res 调 handler：`/health` 200 且字段齐全；`/state` 无配置 → `configured:false`；POST `/config` 相对路径 → 400；合法绝对路径 → 200 且配置文件写出；`/state?project=<示例项目>` → `project.isDag===true`、`project.phase` 非空、`verify.ok===true`、`handoffs.length>=10`。
3. 白名单：POST `/run` `{action:'rm -rf'}` → 400 `E_ACTION`；`{action:'status'}` → 200 run；轮询 `/run?id=` 到 `succeeded` 且 `json.ok===true`；run record 里**不含** child/pid/socket 句柄字段。
4. 路径校验：`/run` `{action:'accept', handoff:'../x.md'}` → 400；`/handoff` 越界路径 → 400。
5. 真实动作（在示例项目的**临时副本**上，避免污染仓库）：复制示例 → `submit` 一个已提交？不需要；直接 `accept` 示例里 PROVISIONAL 的 IPTW handoff → run `succeeded`，再 `/state` 该副本 → 对应 status 变 ACCEPTED、`verify.ok===true`。
6. 所有断言打印 `OK/FAIL`，失败 exit 1。

**v1.1 新增动作验收（追加）**：在临时目录上：`init` 创建新项目 → run `succeeded`；`module-add`（自由 id 如 `literature`）→ run `succeeded`、`/state` 出现该模块；`branch-add`（id `pilot-a`，无模块号前缀）→ 出现该分支；`handoff-new` → 出现 DRAFT handoff（文件名 `HANDOFF-pilot-a-v1.md`）；随后 `verify` run `succeeded`。非法输入：`module-add` 缺 name → `E_ACTION`；`branch-add` 不存在的 module → `E_PROJECT`/`E_ACTION`；`init` 相对 root → `E_PATH`；`handoff-new` 不存在的 branch → `E_ACTION`。所有临时产物清理。

**v1.2 结果优先验收（追加）**：`/health.actions` 顺序包含 `results,auto,init,module-add,branch-add,handoff-new`；`GET /results?project=<示例项目>` → 200，`results.length>=5`、`modules.length===6`、`pending` 与 `attention` 字段存在、`counts.results===results.length`；在示例项目**临时副本**上构造两个 PROVISIONAL（一个校验全绿、一个篡改清单文件使校验失败）→ `POST /run {action:'auto'}` run `succeeded`，随后 `/results` 显示 1 条新结果、另一条仍在 `pending`，`GET /verify` 的 ok 仍为 true（失败项保持 PROVISIONAL 不阻塞）；`auto` 不得在 `--dry-run` 之外跳过校验。临时副本清理，示例本体不变。

### 5.2 `verify/verify-client.mjs`（wb-ui 写）

照 sci-nma `verify/verify-workbench.cjs` 的 React shim 思路（hook 队列 + 元素树渲染 + textContent 汇总），在 `vm` 或 `new Function` 中加载 `lib/client.js`：

1. `window.__ModuleLoader__.load` 被调用，id 正确；factory 返回 plugin：`name==='dsh-research-dag-workbench'`、`inject` 含 `slots`。
2. mock `ctx.slots.inject/register`：断言注册了 `main`（key=research-dag-workbench，组件是函数）与 `sidebar.panellist`（id 同、label 文本「研究项目 DAG 工作台」）。
3. mock 全局 `fetch`：`/health` 返回 fixture、`/state` 返回 fixture（含 6 模块、12 handoff、2 待决定、5 已接受、verify ok），渲染 panel 后断言文本包含：`研究项目 DAG 工作台`、`概览`、`DAG`、`交接`、`校验与运行`、`待主项目决定`、`已接受结果`、`early-phosphate`、`ACCEPTED` 徽标文本`已接受`。
4. 断言渲染不抛异常、无 `undefined` 文本节点；断言组件层数出现在元素树中。
5. 失败 exit 1。**不证明视觉布局**，只做结构/文本检查。

**v1.1 新增：创建流验收（追加）**：渲染后断言存在「新建项目」「新建模块」「新建分支」「新建交接」按钮/入口；点击「新建模块」→ 出现 id/显示名输入 → 确认后发出 `POST /run {action:'module-add', id:'literature', name:'文献检索'}`（mock fetch 捕获）；「新建分支」发出 `branch-add`；「新建项目」发出 `init`（含 root/id/title）；`handoff-new` 发出对应 body。断言创建成功后触发 `/state` 刷新。失败 exit 1。

**v1.2 结果优先验收（追加）**：默认 tab 为「结果」；mock `/results` fixture（6 模块、≥3 条结果、1 条 pending、1 条 attention）→ 断言渲染「结果」「需要你关注」「已出结果」等文本、模块名、`keyResults` 摘要、文件路径；点击「让系统处理可自动通过的结果」→ 捕获 `POST /run {action:'auto'}` 且完成后重新 `GET /results`；mock 旧宿主（health.actions 无 `results/auto`）→ 显示旧宿主提示、结果页回退到 `/state` 简表、不崩溃；「交接 / DAG / 工程」三个 tab 仍可切换，工程包含 `verify` 与待决定接受/拒绝。失败 exit 1。

## 6. 集成（Lead 做）

1. 两侧完成后：`node workbench/tools/build-client.mjs`；`node workbench/verify/verify-host.mjs`；`node workbench/verify/verify-client.mjs`。
2. `plugin_manager install_bundle` 目标 `link:D:\ZhuanZ\Documents\research-dag\workbench`；检查 `list_plugins` 中 `dsh-research-dag-workbench` 行 `fiberPhase` 为 active。
3. 若宿主半侧需重启（新模块可能不会热加载）：刷新页面/重启后重试，并在最终报告注明。
