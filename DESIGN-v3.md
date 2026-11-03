# 工作台 v2.1 — 内容优先重构（设计契约）

> 目标：把工作台从"工程操作台"改成**内容优先**：用户打开就看到每个主项目/子项目（模块）的内容完成情况与优质结果，能一键"满意/待复核"，能看项目网络（其它项目的进度/完成度/想法/结果），工程细节退到第二层。
> 原则：**用户只看内容与例外**；状态、哈希、提交、校验默认由系统处理，需要时在「工程」页可用。
> 本次只改 `workbench/`（v1.x 侧栏插件）；`workbench-desktop/`（v2.0.0 customFrame）不在本次范围。

## 1. 信息架构（4 个顶级页签）

| 页签 | 给谁看 | 内容 |
|---|---|---|
| **内容**（默认） | 用户 | 本项目各子项目（模块）的内容卡：状态、已接受结果（关键结果/限制/复核）、待决定、待复核；一键满意/记想法 |
| **网络** | 用户 | 其它项目的进度/完成度/最近结果/想法/阻塞；本项目待复核；发布/刷新/拉取 |
| **工程** | 用户需要深入时 | 子页签：DAG / 交接 / 校验与运行 / 概览（复用现有组件） |
| **运行** | 排障 | 运行记录 + stdout/stderr（可由「工程」里的运行记录承载；如时间不够，保留 RunConsole 在工程页） |

## 2. 宿主半侧新增接口（`lib/host.js`）

保持现有所有接口/动作不变；新增：

### 2.1 `GET /content?project=<abs>`

校验：项目绝对路径、存在、是 DAG 项目（有 `control/PROJECT_STATE.json`）；否则 400（同 /state 语义）。

处理（串行/并行均可，总预算 60s）：
1. `node <tool> results --json --root <project>`
2. `node <tool> status --json --root <project>`
3. `node <kitRoot>/integrations/teammcp/teammcp.mjs digest --project <project> --json`（TeamMCP 桥；缺失/失败不致命）

返回 200：

```json
{
  "ok": true,
  "project": { "root": "D:\\...", "id": "early-phosphate", "title": "…", "phase": "analysis" },
  "results": { /* results --json 原样 */ },
  "status": { /* status --json 原样 */ },
  "errors": { "results": null, "status": null },
  "network": { /* digest --json 原样，可为 null */ },
  "networkError": null,
  "review": {
    "byItem": { "cohort-definition@2": { "satisfied": true, "at": "…", "note": "…" } },
    "pendingReview": [ { "stream": "descriptive-tables", "version": 1, "module": "M40", "path": "…" } ],
    "summary": { "accepted": 6, "reviewed": 4, "pending": 2, "percent": 67 }
  }
}
```

- `network` 为 digest JSON（字段见 `integrations/teammcp/NETWORK.md` §3.4），失败时 `null` + `networkError` 中文说明（如「TeamMCP 未运行或桥不可用：…」）。
- `review.byItem` 来自 `network.projects[self].reviewed`（键 `stream@version`，取最新记录）；digest 不可用时 `review` 为 `null`。
- results/status 任一失败：对应字段 `null`，`errors.<name>` 给说明；`ok` 仍 true（前端展示错误卡片）。

### 2.2 `POST /bridge`

请求：`{ action, project, stream?, version?, module?, satisfied?, note?, text?, tag? }`

- `action` ∈ `publish` | `idea` | `review` | `pull`（大小写敏感，白名单）。
- `project`：绝对路径且为 DAG 项目。
- `idea`：`text` 1–2000 字符（必填）；`tag` 可选 `[A-Za-z0-9._-]{1,40}`。
- `review`：`stream` 与 `module` 至少一个；`satisfied` 缺省 true；`note` ≤500；`version` 可选正整数；`--stream` 优先。
- `publish`/`pull`：无额外参数。
- 执行：`spawn(process.execPath, [bridgePath, action, '--project', project, '--json', ...extra])`，cwd = kitRoot，60s 超时；使用与 `/run` 相同的 run 注册表/记录结构（action 前缀 `bridge:` 或原样均可，但 `action` 字段保留原值）。
- 返回 `{ok:true, run}`（run 记录同 `/run`）；桥不存在/启动失败 → 500 `{ok:false, code:'E_BRIDGE', message}`；参数非法 → 400 + 对应 code（E_ACTION/E_PATH/E_PARAM）。
- 安全：浏览器不能传任意 argv；只能经白名单模板插值；`text/note/tag/stream/module/version` 全部校验；`project` 必须是 DAG 项目。

### 2.3 `/health`

- `actions` 末尾追加 `"content"`（现有动作保留）。
- 新增 `bridgeActions: ["publish","idea","review","pull"]`、`networkAvailable: true`（桥文件存在时 true）。
- `version` 读 package.json（2.1.0）。

## 3. 浏览器半侧（`src/`）

### 3.1 页签与默认态

- `VIEWS = [['content','内容'],['network','网络'],['engineering','工程']]`；默认 `content`。
- 顶部项目条保持：项目路径输入/加载/保存/刷新；新增「记想法」按钮（内容页也可进入）。
- 旧宿主（`/health` actions 无 `content`）：内容页顶部黄色提示「重启 DSH 后启用新版内容页」并回退渲染旧 `renderResultsView`；网络页显示「需重启 DSH」，工程页照常。**新客户端不得在旧宿主上崩溃。**

### 3.2 内容页（ContentView，新增）

数据：`GET /content`。

**A. 项目内容概览**（顶部一行）：
- 项目标题 + phase + 「子项目 x/y 已有结果」+「已复核 r/a」+「待决定 n」+「阻塞 n」；
- 发布到网络按钮（`POST /bridge {action:'publish'}`），完成后 toast/状态条「已发布到项目网络」。

**B. 需要你关注**（有才显示，最多 6 条，紧凑卡片）：
1. 待决定：来自 `status.pending_decisions`，显示 `模块 · stream vN` + 问题首句（≤120 字）；按钮「查看交接」（打开 handoff 详情抽屉，底部提示「在工程页接受/拒绝」）。
2. 待复核：来自 `review.pendingReview`，显示 `模块 · stream vN · title（若有）`；按钮「满意」「查看内容」。
3. 阻塞：`status.blockers` 原文。

**C. 子项目（模块）卡片网格**（核心）：
- 数据：`results.modules` + `results.results` 分组 + `network.projects[self].completion` + `review`。
- 每卡：
  - 标题：模块名（moduleName）+ id + 状态徽标（done/active/blocked/idle；来自 completion.status；无 network 时按有无结果推断）。
  - 统计行：`已接受 a` · `已复核 r/a` · `待决定 p`。
  - 最新一条已接受结果：`title · stream vN`，正文展示 `keyResults` 前 3 行（每行截断 120 字）+ `limitations` 前 1 行（灰色）；复核徽标「已复核 / 待复核」；按钮「查看内容」。
  - 若无结果：显示「还没有可用的结果」+ 现有待决定/分支提示。
  - 卡片底部：「满意」按钮（对该模块最新未复核结果调用 review；若无未复核则禁用并显示「已全部满意」）、「记想法」。
- 网格 2–3 列自适应；卡片为内容主体，避免工程术语。

**D. 详情抽屉（ContentView 内部）**：
- 点「查看内容」→ 右侧/浮层：标题、stream vN、module、decidedAt、path、`question`、`keyResults`（完整，保留换行）、`limitations`、`files` 列表；底部「满意 / 待复核」按钮 + 「在工程页查看交接」。
- 数据来源 `results.results[]`（已含全部字段）；无需再取 handoff（如需逐字原文再用 `/handoff`）。

**E. 记想法对话框**：文本框 + tag（可选）→ `POST /bridge {action:'idea', project, text, tag}` → 成功后刷新 content。

**F. 状态条/错误**：content fetch 失败显示错误卡片与「重试」；`networkError` 在内容页只显示一行灰色提示（不影响内容展示）。

### 3.3 网络页（NetworkView，新增）

数据：`GET /content` 的 `network`（digest JSON）：
- **网络概览**：其它项目表：项目 | 阶段 | 进度% | 已接受 | 待决定 | 阻塞 | 最近更新；本项目单独标记（含复核比例）。
- **待你复核**：digest `pendingReview` 中本项目条目（项目 → 满意按钮，调 `/bridge review`）；其它项目的条目只读展示。
- **待主项目关注**：digest `attention[]`（按 kind 分组/着色：待决定/阻塞/想法/结果）+ `stale` 停滞项目提示。
- **项目详情**（每个项目一段折叠卡）：完成度表（模块/状态/已接受/已复核/已接受比例）、最近结果（已复核标记）、想法、阻塞、复核记录。
- 操作：「刷新网络」「发布本项目」（publish）、「拉取消息」（pull）——后两者显示 run 状态；失败显示错误。
- `networkError` 时整页显示连接失败卡片 + 「重试」+ 启动提示（`~/.teammcp/start-teammcp.cmd`）。

### 3.4 工程页（EngineeringView）

- 子页签：`DAG` / `交接` / `校验与运行` / `概览`；复用现有 `renderDagView`、`renderHandoffsView`、`renderControlView`、`renderOverviewView` 与既有回调（submit/accept/reject/创建/state-set/verify/report）。
- 保持旧功能全部可用；运行记录可用 RunConsole。

### 3.5 公共

- API 层新增 `fetchContent(project)`、`postBridge(body)`；沿用 `settleRun` 轮询 run。
- 所有 POST 后刷新 content（内容页）或对应数据；保持 busy 状态条与错误条。
- 中文文案；样式沿用内联 STYLES；不引入第三方依赖/JSX。
- `verify/verify-client.mjs` 更新：mock `/health`（新 actions）与 `/content`（fixture：6 模块、6 结果、2 待决定、1 阻塞、network digest 含 2 项目/1 待复核）；断言：
  - 默认内容页：出现「内容」「网络」「工程」、模块名、关键结果片段、「满意」按钮、「待复核」徽标、「需要你关注」；
  - 点「查看内容」→ 详情抽屉出现 question/keyResults/limitations；
  - 点「满意」→ 捕获 `POST /bridge {action:'review', stream, version, satisfied:true}`；
  - 点「记想法」→ 捕获 `POST /bridge {action:'idea', text}`；
  - 切「网络」→ 出现 other project 名、进度%、待你复核、attention 条目；
  - 切「工程」→ 出现 DAG/交接等旧视图文字；
  - 旧宿主 fixture（无 content action）→ 黄色重启提示 + 旧结果页文本，不崩溃；
  - 原有过场断言（槽位/loader/label 等）保留。

## 4. 验收

- `node workbench/tools/build-client.mjs` 幂等；`node --check lib/client.js`。
- `node workbench/verify/verify-client.mjs` 全 OK、exit 0。
- `node workbench/verify/verify-host.mjs` 全 OK、exit 0（原用例 + /content、/bridge 校验、临时副本 pull 成功）。
- 真机（重启 DSH 后）：侧栏工作台默认「内容」页；example 项目显示 6 个模块卡；点满意 → 网络复核状态变化；网络页显示另一项目；工程页旧功能可用。
- 版本：package.json `2.1.0`；README/CONTRACT 更新说明。

## 5. 分工与写作用域

- 宿主：`workbench/lib/host.js`、`workbench/verify/verify-host.mjs`、`workbench/package.json`（版本号）、`workbench/README.md`。
- 前端：`workbench/src/**`、`workbench/tools/build-client.mjs`（如需）、`workbench/verify/verify-client.mjs`、`workbench/lib/client.js`。
- Lead：本契约、集成、文档、安装/重启说明。
- 两侧严格按本契约字段；未覆盖处先问 Lead，不自行扩展。
