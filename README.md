# 研究项目 DAG 工作台（workbench v3.10）

DSH 侧栏工作台插件：把一个 research-dag 协议项目变成**业务整页优先**的项目流程工作台。
默认整页展示研究主线（项目目标/主支/分支）；中栏按分支的生命阶段切换三种形态
（空白探索 / 上下文承袭 / 已有记录），需要 AI 协助时切到宿主原生会话窗口。

- 版本：`3.10.0`（`package.json`）
- 插件包名：`dsh-research-dag-workbench`
- 路由前缀：`/research-dag-workbench`
- 宿主入口：`lib/host.js`（Cordis 插件，`inject: ['webServer']`，不导出 `Config`）
- 浏览器产物：`lib/client.js`（由 `src/**` 经 `node tools/build-client.mjs` 生成；`src/` 是唯一源码处）

> 布局按官方开发规范第 4 节实现：`customFrame: true`（业务整页）+ `headerLayout: 'compact'`
> （宿主紧凑顶部栏）+ 业务容器宽度断点（container query）+ 宿主会话节点自安置。
> 设计契约见 `DESIGN-v3.md`，历史实现契约见 `CONTRACT.md`。

📘 **想知道「为什么这样设计」而不是「有哪些功能」，请读 [`DESIGN-workbench.md`](DESIGN-workbench.md)** ——
设计公理、核心矛盾取舍、三栏尺寸链、状态机、演进史与踩过的坑都在那里。

## 1. 目录

```text
workbench/
├── package.json            # bundle 元数据 / main=lib/host.js / dsh.client
├── cordis.patch.yml        # 把插件行插入 Harness 插件树
├── icon.svg
├── CONTRACT.md             # v1.2 实现契约
├── DESIGN-v3.md            # v2.1 内容优先重构设计
├── lib/
│   ├── host.js             # 宿主半侧：HTTP 路由 + 白名单子进程 + run 注册表
│   └── client.js           # 浏览器构建产物（build-client.mjs 生成）
├── src/                    # 浏览器源码（项目流程/主智能体/内容/网络/工程 页签）
├── tools/
│   ├── build-client.mjs    # src → lib/client.js
│   └── preview-layout.mjs  # 生成真实浏览器布局自检页（人工视觉验收用）
├── verify/
│   ├── verify-host.mjs     # 宿主半侧独立验收（无需 DSH）
│   ├── verify-client.mjs   # 浏览器半侧独立验收（React shim）
│   └── verify-layout.mjs   # 整页布局/对话安置/首用引导验收（62 项）
└── README.md
```

## 2. 快速开始

### 2.1 构建与自测

```bash
cd research-dag/workbench
node tools/build-client.mjs        # 生成 lib/client.js（幂等）
node verify/verify-host.mjs        # 宿主半侧验收（应 ALL CHECKS PASSED，exit 0）
node verify/verify-client.mjs      # 浏览器半侧验收（React shim，无需 DSH）
node verify/verify-layout.mjs      # 整页布局验收（容器查询/对话安置/首用引导）
```

`npm run verify` 会依次跑上面三套客户端/宿主验收。

`verify-host.mjs` 不需要 DSH：它直接 import `lib/host.js`，mock `ctx.webServer.register`
捕获前缀路由，再用 mock `req/res` 调 handler。TeamMCP 相关的 `/content`、`/bridge pull`
用例会临时使用真实 `DSH_HOME`（`~/.dsh`）的桥令牌库；桥/TeamMCP 不可用时自动走
`networkError` 分支（不致命），其余用例仍全部执行。

### 2.2 安装到 DSH Desktop

1. 用 `pnpm pack`（或 `npm pack`）生成 tarball；
2. 在 DSH Desktop 插件管理中安装该 tarball（或 `dsh plugin --profile web add <tgz>`）；
3. **手动完整退出并重开 DSH Desktop**（插件行只在启动时加载）；
4. 左侧工作台切换器出现「研究项目 DAG 工作台」；打开即整页项目流程主线。


## 3. 宿主 HTTP 接口

所有接口挂在 `/research-dag-workbench` 前缀下，返回 JSON
（`Content-Type: application/json; charset=utf-8`）。请求体 JSON 非法 →
400 `{ok:false, code:'E_BODY', message:'请求体不是合法 JSON'}`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 包名/版本/路由/动作白名单/桥可用性/kitRoot/配置路径/示例项目 |
| GET | `/fishbone?project=<abs>` | **v3.x 主接口**：项目流程全量数据（head/spine/ribs/recycleBin/attention/markers/totals），已合并工作台元数据 |
| POST | `/rib-op` | **v3.5**：分支元数据操作。`op` ∈ `delete` / `restore` / `purge` / `empty-bin` / `block` / `unblock` / `rename` / `anchor` |
| GET/POST | `/goal-card` | **v3.10**：研究目标 · 好问题卡。GET 返回 `card` / `layers` / `goal` / `missing` / `falsifiable` / `layerSpec`；POST `{ project, card, layers, syncGoal }` 合并写卡，并把「问题 + 推翻条件」摘要回写 `project.goal` |
| GET | `/branch-work?project=&module=&branch=` | **v2.7/v3.7**：单分支工作区。返回 `brief` / `context` / `sessionNotes` / `directives` + 解析好的 `directivesParsed` / `sessionParsed` / `workFiles` / `outputFiles` / `parent` / `siblings` / `inbox` |
| POST | `/branch-directive` | **v2.7**：向分支工作区下达指令，追加写入 `work/DIRECTIVES.md` |
| GET | `/detail?project=<abs>&branch=<id>` | 单分支详情 |
| POST | `/auto` | 批量接受全部 `PROVISIONAL` 分支（自动回连） |
| POST | `/graft` | 回连主支（写 handoff） |
| POST | `/open-sidebar` | 请求宿主在侧边栏打开文件（无该能力时 501 + 绝对路径） |
| GET | `/state?project=<abs>` | 合并 `status --json`、`verify --json` 与 `PROJECT_STATE.json`（旧工程视图） |
| GET | `/handoff?project=<abs>&path=<rel>` | 读取单个交接文件全文（frontmatter/body/content/size） |
| GET | `/results?project=<abs>` | 透传 `dag results --json`（PROTOCOL v1.3 结果视图） |
| GET | `/content?project=<abs>` | **v2.1**：一次拿全内容页（results/status/digest/复核汇总） |
| POST | `/config` | 保存工作台配置 `{projectRoot}`（原子写 `$DSH_HOME/research-dag-workbench/config.json`） |
| POST | `/run` | 白名单 DAG 动作异步启动，返回 `{ok,run}`（run 记录可轮询） |
| GET | `/run?id=<runId>` | 轮询单条 run；`GET /runs` 列出全部（最新在前） |
| POST | `/bridge` | **v2.1**：白名单 TeamMCP 桥动作（publish/idea/review/pull） |

> 完整的「为什么这样设计」见 [`DESIGN-workbench.md`](DESIGN-workbench.md)：
> §7A 交互系统 2.0、§7B 会话锚定分叉、**§7C 中栏三态**、§5.4 会话嵌入三失败模式。

### 3.1 `GET /health`（v2.1 字段）

```json
{
  "ok": true,
  "name": "dsh-research-dag-workbench",
  "version": "3.7.0",
  "route": "/research-dag-workbench",
  "actions": ["status","verify","list","check","submit","accept","reject","block","unblock",
              "report","state-set","results","auto","init","module-add","branch-add",
              "handoff-new","content"],
  "bridgeActions": ["publish","idea","review","pull"],
  "networkAvailable": true,
  "kitRoot": "D:\\ZhuanZ\\Documents\\research-dag",
  "configPath": "C:\\Users\\<user>\\.dsh\\research-dag-workbench\\config.json",
  "example": "D:\\ZhuanZ\\Documents\\research-dag\\examples\\early-phosphate"
}
```

- `actions` 是 `/run` 的 DAG 动作白名单；v2.1 末尾追加只读 `content`（`/run` 不接受它）。
- `bridgeActions` 是 `/bridge` 白名单；`networkAvailable` = kit 内
  `integrations/teammcp/teammcp.mjs` 是否存在。
- `version` 直接读 `package.json`（当前 `3.7.0`）。

### 3.2 `GET /content?project=<abs>`

校验：`project` 为绝对路径、存在、是 DAG 项目（`control/ledger.json`）；
非法 → 400 `{ok:false, code:'E_PROJECT'}`。

处理：并行执行 `dag results --json`、`dag status --json`；随后执行
`node <kitRoot>/integrations/teammcp/teammcp.mjs digest --project <project> --json`
（TeamMCP 网络摘要）。三者相互独立：

- `results`/`status` 任一失败：对应字段 `null`、`errors.<name>` 给说明，`ok` 仍 `true`；
- digest 失败：`network:null` + `networkError` 中文说明（如 `TeamMCP 未运行或桥不可用：…`）；
- `review` 来自 digest：`byItem`（`stream@version` 最新复核记录）、
  `pendingReview`（本项目待复核 accepted 结果）、`summary`（accepted/reviewed/pending/percent）；
  digest 不可用时 `review:null`。

```json
{
  "ok": true,
  "project": { "root": "D:\\…\\early-phosphate", "id": "early-phosphate", "title": "…", "phase": "analysis" },
  "results": { "ok": true, "modules": [], "results": [], "pending": [], "attention": [] },
  "status": { "ok": true, "phase": "analysis", "pending_decisions": [] },
  "errors": { "results": null, "status": null },
  "network": { "projects": [], "attention": [], "stale": [], "pendingReview": [] },
  "networkError": null,
  "review": {
    "byItem": { "cohort-definition@2": { "satisfied": true, "at": "…", "note": "…" } },
    "pendingReview": [ { "stream": "descriptive-tables", "version": 1, "module": "M40", "path": "…" } ],
    "summary": { "accepted": 6, "reviewed": 4, "pending": 2, "percent": 67 }
  }
}
```

### 3.4 `GET /zotero` / `POST /zotero-op`（v3.8 文献接入）

把本机 Zotero 的两块能力接进右栏「本分支的文献」：**按条目挂载**与**按合集导入**。
数据源是本机 Zotero 的只读本地 API（默认 `http://127.0.0.1:23119`，可用
`RDW_ZOTERO_BASE` 覆盖端口，便于调试）。**除「在 Zotero 中定位」外全部是 GET**，
不写 Zotero 文库。

`GET /zotero?project=<abs>&rib=<B…>&q=<关键词>&collection=<key>`

- `project` 校验同 `/content`（绝对路径 + `control/ledger.json`），非法 → 400 `E_PROJECT`。
- 返回 `{ ok, base, available, error, ribId, linked, items, missing, search, collections }`。
- **Zotero 没开机不算错误**：`ok:true` + `available:false` + `error` 中文原因，
  已挂的 key 仍在 `linked` 里回传（面板显示「未连接」，不伪造数据）。
- `items`：`linked` 里各条目的摘要（标题/作者/年份/DOI/标签/摘要片段）。
- `search`：`q` 非空时才有，`{ query, items, total, error }`。
- `collections`：合集树扁平化为 `[{ key, name, items, depth }]`，前端按 `depth` 缩进。

`POST /zotero-op`　body `{ project, ribId, op, … }`：

| `op` | 参数 | 行为 |
| --- | --- | --- |
| `attach` | `keys: string[]` | 追加挂载到该分支（去重，上限 200） |
| `detach` | `keys: string[]` | 解挂指定条目 |
| `clear` | — | 清空该分支全部挂载 |
| `import-collection` | `collectionKey` | 把整个合集的顶层条目挂上来（分页取完，上限 200） |
| `open` | `kind: item\|collection`, `key` | 用 `zotero://select/library/…` 在客户端中定位（不需要 `ribId`） |

落盘位置是项目 `control/rdw-rib-meta.json` 的 `ribs[<ribId>].itemKeys / collectionKey`，
与 DAG 协议、handoff 正文完全解耦：不联网也能渲染，Zotero 关掉只是读不到摘要。
写操作走 tmp + rename 原子替换（Windows 下先删后改名）。
参数非法 → 400 `E_PARAM`；分支不存在 → 404 `E_NOT_FOUND`；
Zotero 不可用时 `import-collection` → 503 `E_ZOTERO`（明确失败，不静默成功）；
读取合集失败 → 502 `E_ZOTERO`。

`/fishbone` 里每根分支都会带 `zotero`（`{ itemKeys, collectionKey }`），
另有顶层 `zotero.linkedRibs / linkedItems` 汇总。`/health.capabilities.zotero = true`
表示宿主支持该面板；**真实可用性只由 `/zotero` 探活**（health 保持同步，
不为外部依赖付超时代价）。

### 3.5 `POST /bridge`（v2.1）

请求：`{ action, project, stream?, version?, module?, satisfied?, note?, text?, tag? }`

- `action` ∈ `publish` | `idea` | `review` | `pull`（大小写敏感）。
- `project`：绝对路径且为 DAG 项目。
- `idea`：`text` 1–2000 字符必填；`tag` 可选 `[A-Za-z0-9._-]{1,40}`。
- `review`：`stream` 与 `module` 至少一个；`version` 正整数可选；`satisfied` 缺省 true；
  `note` ≤500 字符；`--stream` 优先（`--module` 仅用于校验/展示）。
- `publish` / `pull`：无额外参数；`pull` 固定追加 `--write` 以生成本地 `control/INBOX.md`。

执行：`spawn(process.execPath, [bridgePath, action, '--project', project, '--json', ...extra])`，
`cwd = kitRoot`，60s 超时；使用与 `/run` 相同的 run 注册表/记录结构
（`action` 为 `bridge:<动作>`），返回 `{ok:true, run}`。
桥文件不存在 → 500 `{ok:false, code:'E_BRIDGE'}`；参数非法 → 400
（`E_ACTION` / `E_PROJECT` / `E_PATH` / `E_BODY`）。

浏览器永远不会传 executable/argv；宿主只把校验后的值插入固定模板。

## 4. DAG 动作（`/run`）

`/run` 保留 v1.x 全部动作（`ACTIONS`，v2.1 未删除）：

| 动作 | 参数 | 说明 |
|---|---|---|
| `status` / `verify` / `list` / `results` | — | 只读查询（`--json`） |
| `report` | — | 项目报告 |
| `check` | `handoff` | 交接检查（`--strict`） |
| `submit` / `accept` / `reject` / `block` | `handoff`、`reason?`、`by?` | 门控动作 |
| `unblock` | `handoff` | 解除阻塞 |
| `state-set` | `phase?`、`next?`、`blocker?`（至少一个） | 项目状态 |
| `auto` | `dryRun?` | 自动接受全绿 PROVISIONAL |
| `init` | `root`、`id`、`title`、`goal?` | 新建项目（目标可尚不存在） |
| `module-add` | `id`、`name`、`slug?` | 新建模块（子项目） |
| `branch-add` | `module`、`id`、`name`、`slug?` | 新建分支 |
| `handoff-new` | `branch`、`stream?`、`label?` | 新建交接 |

安全约束不变：项目内 `control/dag.mjs` 优先、否则 kit 的 `tools/dag.mjs`；
`process.execPath`、绝不 `shell:true`、argv 末尾追加 `--root <project>`、输出各截断 200k、
`/state` 同步等待 `/run` 异步 + 轮询；run 记录不含 child 句柄。

## 5. 与本机 Zotero 的关系（v3.8）

- 右栏「本分支的文献」直接对本机 Zotero 的**只读**本地 API（`127.0.0.1:23119`），
  不经过 TeamMCP、不读 Zotero 的 SQLite。只发 GET；唯一的外部动作是
  `zotero://select/library/…`（只切客户端焦点，不改文库）。
- 挂载关系（条目 key / 合集 key）落在项目 `control/rdw-rib-meta.json`，
  与 DAG 协议、handoff 正文、ledger 完全无关：协议侧看不到文献，文献侧也不改协议。
- Zotero 不可用是**非致命**的：面板显示「未连接 Zotero」+ 原因 + 手动重试，
  项目流程主线、产物、合并状态全部照常。
- 为什么不做「写回 Zotero」：本地 API 对写入有额外的版本/权限约束，
  且写文库属于用户的文献管理决定；工作台只负责「这个分支用了哪些文献」这一层。

## 6. 与 TeamMCP 项目网络层的关系

- `/content` 的 `network` 字段来自 `integrations/teammcp/teammcp.mjs digest --json`
  （见 `integrations/teammcp/NETWORK.md`）：项目进度/完成度/结果/想法/复核/待你复核。
- `/bridge` 把内容页/网络页的「发布、记想法、满意/复核、拉取消息」映射为桥 CLI 动作。
- TeamMCP 不可用是**非致命**的：内容页仍显示本地 results/status，只提示一行 networkError；
  网络页显示连接失败卡片与启动提示。
- 宿主不直接写 TeamMCP 数据库；令牌/网络状态由桥 CLI 管理（令牌库 `~/.dsh/teammcp/agents.json`）。

## 7. 布局（v3.3）

对照官方开发规范第 4 节，工作台采用**业务整页优先**：

| 关注点 | 做法 | 规范依据 |
|---|---|---|
| 整页业务优先 | `customFrame: true`，业务区撑满主区 | §4.3 |
| 顶部栏 | `headerLayout: 'compact'` + 页面内**恰好一个** `data-dsh-workbench-toolbar` | §4.3 |
| 对话 | 默认收起；点「💬 打开对话」才展开右侧对话区，宿主原生会话节点由工作台自安置 | §4.2 / §4.3 |
| 不自动建会话 | 首屏不调用 `newSession` / `newWorkspaceSession`；用户点「开始对话」才建 | §4.2 |
| 首用状态 | 无项目时展示工作台自己的项目流程引导 + 加载示例/新建项目入口 | §4.2 |
| 宽度重排 | 断点绑在业务容器（`@container rdw`：1080/860/620/420px），不只看窗口 | §4.1 |
| macOS 拖拽 | 交互控件标 `data-dsh-no-drag`，不占用宿主拖拽区 | §4.3 |

要点：
- 会话节点**常驻挂载**，收起仅 `display:none`；反复展开不会重建宿主输入树。
- 对话区宽度跟随业务容器宽度（CSS 变量 `--rdw-chat-width`），窄容器下改为上下排布。
- 旧槽位回退路径（宿主无 `desktopWorkbenches`）仍保留，此时不显示对话入口。

## 8. 验收

- `node verify/verify-host.mjs` 全 OK、exit 0；覆盖：
  - 模块外形 / `/health`（版本 2.1.0、actions 含 content、bridgeActions、networkAvailable）；
  - `/state`、`/handoff`、`/config`、`/run`+轮询、`/runs`；
  - 创建类动作（init/module-add/branch-add/handoff-new）与真实 accept（临时副本）；
  - `/results` 与 `auto` 门控（临时副本，示例本体不变）；
  - **v2.1**：`/content` 正常 + networkError 分支 + results 失败兜底 + 非法项目；
    `/bridge` 白名单/参数/项目校验；free-form 临时副本 `pull` succeeded 且生成
    `control/INBOX.md`；健康字段齐全。
  - **v3.8 文献接入**（`Q)` 段，21 项）：`/health.capabilities.zotero`；`/zotero`
    返回 `available` 布尔（Zotero 关着也必须 200 + 中文原因）；合集树字段；
    非法项目/非法 key/未知分支/未知 op 四类拒绝；attach → `/fishbone.zotero` →
    detach → clear 全链路（**只写临时副本**，并用字节比对断言示例本体未被改动）；
    Zotero 在线时真导一次合集、真读一次条目摘要；离线时 `import-collection`
    必须 503 `E_ZOTERO` 而不是静默成功；`open` 非法 key 不触发协议。
    Zotero 未运行时相关分支自动降级断言（保持 CI 可跑）。
- `node verify/verify-client.mjs` 覆盖浏览器半侧（内容/网络/工程页签、满意/记想法、旧宿主回退），
  以及 **v3.8 文献面板**：挂载即请求 `/zotero`、渲染条目与年份、搜索框回车带 `q=`、
  「✚」发 `attach`、「从合集导入」抽屉展开与 `import-collection`、掉线显示「未连接」。
- `node verify/verify-layout.mjs` 覆盖整页布局（70 项）：注册字段、紧凑工具栏唯一性、
  首屏业务优先、不自动建会话、会话节点安置与收起不卸载、首用引导、容器查询断点、产物同步。
- `node tools/build-client.mjs` 幂等；`node --check lib/client.js`。
- 人工视觉验收：`node tools/preview-layout.mjs` 生成 `.preview/workbench-layout.html`
  （内置假宿主 + 真实 React 18 + 真实 DOM），用浏览器在宽/中/窄三档宽度下目视检查。

> 说明：`/content` 的 `results/status` 依赖示例项目当前状态；若示例被主项目推进会
> （如 pending 已全部 accepted），验收按当前 ledger 动态断言字段结构，而不是写死旧数量。

## 9. 故障排查

| 现象 | 处理 |
|---|---|
| health 无 `content` / `bridgeActions` | 旧插件进程未重启：完整退出并重开 DSH Desktop |
| `/content` networkError | 启动 TeamMCP（`teammcp start`）并确认 `~/.dsh/teammcp/agents.json` 已有项目 agent；桥文件存在 |
| `/bridge` 500 `E_BRIDGE` | kit 内 `integrations/teammcp/teammcp.mjs` 不存在或不可执行 |
| `/bridge` 400 `E_PROJECT` | project 必须是绝对路径且为 DAG 项目（有 `control/ledger.json`） |
| 旧 `/state` 正常但新页空白 | 浏览器客户端未更新：先 `node tools/build-client.mjs`，再重启 DSH |
| `/run` 超时 | 单条 CLI 默认 120s；`/bridge` 60s；长任务拆分或避开 |
| 文献面板显示「未连接 Zotero」 | 先启动 Zotero 桌面版；本机本地 API 默认 `127.0.0.1:23119`。端口被改过则设 `RDW_ZOTERO_BASE` |
| 文献面板「未连接」但 Zotero 明明开着 | Zotero 7 需在 设置 → 高级 里允许本机 API（默认开启）；用 `curl http://127.0.0.1:23119/connector/ping` 快速自检 |
| 合集导入数量少于合集显示数 | 只取**顶层条目**（子合集不展开），且上限 200 条；`truncated:true` 时按需分次挂 |
