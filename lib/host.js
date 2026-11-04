/**
 * 研究项目 DAG 工作台 — 宿主半侧（Cordis 插件）。
 *
 * 在浏览器 carrier 上挂一条前缀路由 `/research-dag-workbench`，用白名单 action
 * 驱动项目内（或 kit 内）的 `dag.mjs` CLI：
 *  - 浏览器永远不能传 executable / argv；每个请求只声明一个白名单 `action`，
 *    宿主把它映射到固定 argv 模板，只对校验/归一化后的值做插值。
 *  - 项目路径必须是已存在的绝对目录；handoff 路径必须是项目内相对路径且匹配
 *    `modules/<模块>/handoffs/HANDOFF-*.md`，resolve + relative 前后缀双重检查。
 *  - 子进程一律 `spawn(process.execPath, argv, {cwd, windowsHide:true})`，绝不
 *    `shell:true`；`/state` 串行同步等待 status/verify 两条 CLI，`/run` 异步启动
 *    后由 GET /run 轮询。
 *  - run 注册表是内存 Map；对外只序列化 run record，绝不暴露 child 句柄。
 *
 * 本文件是自包含的（不 import `src/`）：协议常量在本文件内自持。
 *
 * @module dsh-research-dag-workbench
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// 规范 3.4：`Config` 必须是 Schemastery schema。宿主提供 schemastery 时用真实
// Schema API；否则回退到等价的标准 schema 形状，保证插件仍可被加载。
const Schema = await loadSchemastery()

/** 加载 @deepseek-ai/schemastery；不可用时返回最小的 Standard Schema 兼容实现。 */
async function loadSchemastery() {
  try {
    const mod = await import('@deepseek-ai/schemastery')
    const real = mod && (mod.default || mod)
    if (real && typeof real.object === 'function') return real
  } catch {
    /* 宿主未提供：走回退实现 */
  }
  return fallbackSchema()
}

/**
 * 构造本插件的行配置 schema（Standard Schema v1）。
 *
 * 为什么不直接用 `Schema.object({...})`：
 *   宿主实测（dsh 0.2.0-rc.2 自带 schemastery）的 Schema.object() 产物里
 *   `~standard` 是**只读 getter**（赋值会抛 TypeError），而 `validate`
 *   只挂在 `~standard.validate`、顶层没有。不同副本拼出的对象形状不一致，
 *   Cordis 校验时会抛 `Config.~standard.validate is not a function`。
 *   因此这里自己产出形状稳定的 Standard Schema：字段的**类型语义**仍借用
 *   宿主 Schema 的叶子节点，但顶层与 `~standard` 由本函数提供、不改写宿主对象。
 *
 * 字段：
 *   - `kitRoot`：research-dag 工具包根目录（含 tools/dag.mjs 与 examples/）；
 *     留空时按包自身位置解析。
 *   - `routePrefix`：本机接口前缀，默认 `/research-dag-workbench`。
 */
function defineConfig(Schema) {
  const fields = {
    kitRoot: Schema.string(),
    routePrefix: Schema.string(),
  }
  const validate = (value) => {
    const input = value && typeof value === 'object' ? value : {}
    for (const key of Object.keys(fields)) {
      const leaf = fields[key]
      const checker =
        typeof leaf.validate === 'function'
          ? leaf.validate
          : leaf['~standard'] && typeof leaf['~standard'].validate === 'function'
            ? (v) => leaf['~standard'].validate(v)
            : null
      if (!checker) continue
      const result = checker(input[key])
      if (result && Array.isArray(result.issues) && result.issues.length > 0) {
        return { issues: [{ path: [key], message: `${key} 配置无效` }, ...(result.issues || [])] }
      }
    }
    return { value: input }
  }
  const standard = { version: 1, vendor: 'research-dag-workbench', validate }
  return {
    '~standard': standard,
    version: 1,
    vendor: 'research-dag-workbench',
    validate,
    name: 'dsh-research-dag-workbench.Config',
    fields,
  }
}

/** 最小 Standard Schema v1 兼容实现（object/string/number/boolean + default/required）。
 *  形状遵循规范：对象暴露 `~standard`、`version`、`vendor`、`validate`。 */
function fallbackSchema() {
  const make = (kind) => {
    const self = {
      '~standard': { version: 1, vendor: 'research-dag-fallback' },
      version: 1,
      vendor: 'research-dag-fallback',
      _kind: kind,
      validate: (value) => ({ value }),
      default: (v) => ({ ...make(kind), _default: v }),
      required: () => make(kind),
      optional: () => make(kind),
    }
    return self
  }
  return {
    object: (shape) => make('object'),
    string: () => make('string'),
    number: () => make('number'),
    boolean: () => make('boolean'),
  }
}

export const name = 'dsh-research-dag-workbench'

/** 浏览器 carrier 是唯一硬依赖，它拥有 HTTP server。 */
export const inject = ['webServer']

/* ------------------------------------------------------------------ 常量 */

const ROUTE_PREFIX = '/research-dag-workbench'

/** v3.5 工作台元数据（回收站/受阻标记/重命名/锚点）的文件名，存于项目 control/ 下。 */
const RIB_META_FILE = 'rdw-rib-meta.json'

/* ---------------------------------------------------- v3.8 Zotero 文献接入
 *
 * 两件事，都对着本机 Zotero 的**只读**本地 API（v3，默认 127.0.0.1:23119）：
 *   1) 本分支的文献：把 Zotero 条目（8 位 key）挂到某根分支上；
 *   2) 从合集导入：把某个 Zotero 合集（collection）整体挂到某根分支上。
 *
 * 挂载关系写进 control/rdw-rib-meta.json 的 ribs[<ribId>].itemKeys / collectionKey，
 * 与 DAG 协议、handoff 正文完全解耦：不联网也能渲染，Zotero 关掉只是「读不到摘要」。
 *
 * 唯一会触碰外部状态的动作是「在 Zotero 中定位」（zotero://select 协议），
 * 它只切焦点，不改文库内容；其余全是 GET。
 */
const ZOTERO_DEFAULT_BASE = 'http://127.0.0.1:23119'
const ZOTERO_TIMEOUT_MS = 15_000
const ZOTERO_MAX_ITEMS = 200
/** Zotero 条目 / 合集 key：8 位大写字母数字（如 3QFYZA46）。 */
const ZOTERO_KEY_RE = /^[A-Z0-9]{8}$/

const ACTIONS = [
  'status',
  'verify',
  'list',
  'check',
  'submit',
  'accept',
  'reject',
  'block',
  'unblock',
  'report',
  'state-set',
  'results',
  'auto',
  'init',
  'module-add',
  'branch-add',
  'handoff-new',
  'unsubmit',
  'compare',
  'sync-accepted',
  'review-compile',
  'sprout',
  'graft',
  'context',
  'message',
]

const PHASES = [
  'planning',
  'literature',
  'design',
  'data',
  'analysis',
  'manuscript',
  'review',
  'concluded',
]

const COUNT_KEYS = ['draft', 'provisional', 'accepted', 'rejected', 'superseded', 'blocked']

/** v1.2 自由命名：handoff 路径只要求 modules/<目录>/handoffs/HANDOFF-*.md（目录/id 自由）。 */
const HANDOFF_PATH_RE = /^modules\/[^/]+\/handoffs\/HANDOFF-.+\.md$/
/** v1.2 统一节点 id：不得以 `.` 或 `-` 结尾（Windows 目录名安全）。 */
const ID_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_])?$/
const NAME_MAX_CHARS = 80
const DIR_SLUG_RE = /^[A-Za-z0-9._-]{0,40}$/
const HANDOFF_LABEL_RE = /^[A-Za-z0-9._-]{1,40}$/
const STREAM_RE = /^[a-z0-9][a-z0-9-]*$/
const TITLE_MAX_CHARS = 120
const GOAL_MAX_CHARS = 500
const SAFE_TOKEN_RE = /^[A-Za-z0-9._:@-]{1,64}$/

const MAX_OUTPUT_CHARS = 200_000
const CLI_TIMEOUT_MS = 120_000
const MAX_RUNS = 100
const MAX_BODY_BYTES = 1_000_000
const MAX_REASON_CHARS = 2_000
const MAX_TEXT_FIELD_CHARS = 500
const TRUNCATED_SUFFIX = '\n…[truncated]'

/** 带 `--json` 的动作：run record 的 json 字段从 stdout 解析。 */
const JSON_ACTIONS = new Set([
  'status',
  'verify',
  'list',
  'results',
  'auto',
  'compare',
  'review-compile',
])

const HOST_FILE = fileURLToPath(import.meta.url)
const LIB_DIR = dirname(HOST_FILE)
const PACKAGE_ROOT = resolve(LIB_DIR, '..')
/**
 * 工具包根目录（含 tools/dag.mjs 与 examples/）。行配置 kitRoot 可覆盖。
 *
 * v3.17 修复（真实故障）：原先固定取 `PACKAGE_ROOT/..`，插件被装进
 * `.../profiles/.generations/live/<pkg>/node_modules/dsh-research-dag-workbench` 时，
 * 上一级就是 `node_modules`，于是 CLI 路径成了 `node_modules/tools/dag.mjs` —— 不存在，
 * 界面报「status CLI 失败 / list CLI 失败 / Cannot find module」。
 *
 * 选择顺序（都要有 tools/dag.mjs 才算有效）：
 *   ① 显式 setKitRoot()
 *   ② `PACKAGE_ROOT/..`：开发目录结构（workbench/ 的上一级是 research-dag/），带 examples/
 *   ③ 包内自带 `kit/`：安装到 generations 后仍可用，不依赖开发机仓库
 */
function detectKitRoot() {
  const candidates = [
    resolve(PACKAGE_ROOT, '..'),
    PACKAGE_ROOT,
    resolve(PACKAGE_ROOT, 'kit'),
  ]
  for (const dir of candidates) {
    if (isExistingFile(join(dir, 'tools', 'dag.mjs'))) return dir
  }
  return candidates[0]
}

let KIT_ROOT = detectKitRoot()
const EXAMPLE_PROJECT = join(KIT_ROOT, 'examples', 'early-phosphate')

/** 由行配置覆盖工具包根目录；必须早于任何请求处理。 */
export function setKitRoot(dir) {
  if (typeof dir === 'string' && dir.length > 0) KIT_ROOT = resolve(dir)
}

/**
 * 只读：当前解析到的工具包根目录（验收脚本用）。
 * 安装后必须指向插件包内自带的 `kit/`，而不是 `node_modules/`。
 */
export function kitRootForTest() {
  return KIT_ROOT
}

/** health.actions：既有 DAG 动作 + v2.1 内容聚合 + v2.4 项目流程主线 + v2.5 主智能体记录。 */
const HEALTH_ACTIONS = [...ACTIONS, 'content', 'fishbone', 'leader-log']

/** v2.1 /bridge：白名单动作 → TeamMCP 项目路由桥（integrations/teammcp/teammcp.mjs）。 */
const BRIDGE_ACTIONS = ['publish', 'idea', 'review', 'pull']
const BRIDGE_PATH = join(KIT_ROOT, 'integrations', 'teammcp', 'teammcp.mjs')
const BRIDGE_TIMEOUT_MS = 60_000
const CONTENT_CLI_TIMEOUT_MS = 60_000
/** /bridge 的 stream / tag 白名单规则（浏览器不能拼 argv）。 */
const BRIDGE_STREAM_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const BRIDGE_TAG_RE = /^[A-Za-z0-9._-]{1,40}$/

/** 工作台包版本（v2.1.0；读 package.json，失败时回退）。 */
const VERSION = (() => {
  try {
    const meta = JSON.parse(fs.readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'))
    if (meta && typeof meta.version === 'string' && meta.version.length > 0) return meta.version
  } catch {
    /* ignore */
  }
  return '2.1.0'
})()

/* ------------------------------------------------------------ 基础工具 */

/* -------------------------------------------------- v3.5 分支元数据持久层
 *
 * 回收站（软删）、受阻标记、重命名、消息锚点都是**工作台级**状态，
 * 不属于 DAG 协议本身（协议只有六态生命周期，没有「删除」「重命名」）。
 * 因此不改动 ledger/handoff，而是单独存 control/rdw-rib-meta.json：
 *
 *   {
 *     version: 1,
 *     ribs: {
 *       "B40-03": {
 *         customName?: string,          // 重命名（覆盖显示名，不改目录）
 *         blocked?: { at, note },       // 受阻标记
 *         origin?: { kind, anchor },    // v3.6 会话锚定分叉的来源
 *       }
 *     },
 *     recycleBin: [                     // 软删（30 天）
 *       { rib: {…快照…}, deletedAt, reason }
 *     ],
 *   }
 *
 * /fishbone 返回前把这层合并进 ribs（deleted 的分支从 ribs 移除、进 recycleBin 字段）。
 */

/** 读取项目的分支元数据；缺文件/解析失败都退化为空。 */
function readRibMeta(root) {
  const path = join(root, 'control', RIB_META_FILE)
  const result = readJson(path)
  if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    return { path, data: { version: 1, ribs: {}, recycleBin: [], moduleOrder: [], ribOrder: {} } }
  }
  const data = result.data
  if (!data.ribs || typeof data.ribs !== 'object' || Array.isArray(data.ribs)) data.ribs = {}
  if (!Array.isArray(data.recycleBin)) data.recycleBin = []
  // v3.9 排序：moduleOrder 是主支显示顺序；ribOrder 是每个主支下分支的显示顺序。
  // 只用「偏好顺序」而不是改写 PROJECT_STATE.json：DAG 协议里模块/分支没有 order 字段，
  // 工作台不该为了排序去动协议文件。
  if (!Array.isArray(data.moduleOrder)) data.moduleOrder = []
  if (!data.ribOrder || typeof data.ribOrder !== 'object' || Array.isArray(data.ribOrder)) data.ribOrder = {}
  // v3.18 会话绑定：每个分支/主支记住自己关联的宿主会话，点开时恢复对应历史。
  //   key 形如 `branch:<ribId>` / `module:<moduleId>` / `goal`（研究目标讨论）。
  if (!data.sessionOf || typeof data.sessionOf !== 'object' || Array.isArray(data.sessionOf)) data.sessionOf = {}
  return { path, data }
}

/**
 * 按偏好顺序排列一组 id：偏好里有的按偏好排，其余按原始顺序追加在后。
 * 缺失的偏好项（已删除的对象）自动失效，不留下空洞。
 */
function applyOrder(ids, preferred) {
  const list = Array.isArray(preferred) ? preferred.filter((id) => typeof id === 'string' && ids.includes(id)) : []
  const seen = new Set(list)
  for (const id of ids) {
    if (!seen.has(id)) {
      list.push(id)
      seen.add(id)
    }
  }
  return list
}

/** 把 id 在偏好数组里挪到相对 offset 的位置（offset<0 上移，>0 下移），返回新的数组。 */
function moveInOrder(ids, preferred, id, offset) {
  const list = applyOrder(ids, preferred)
  const from = list.indexOf(id)
  if (from < 0) return list
  const to = from + offset
  if (to < 0 || to >= list.length) return list
  list.splice(to, 0, list.splice(from, 1)[0])
  return list
}

/** 原子写分支元数据（tmp + rename，Windows 下失败时先删后改名）。 */
function writeRibMetaAtomic(root, data) {
  const target = join(root, 'control', RIB_META_FILE)
  const dir = dirname(target)
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    /* 已存在 */
  }
  const tmp = join(dir, `.${RIB_META_FILE}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  try {
    fs.renameSync(tmp, target)
  } catch {
    try {
      fs.unlinkSync(target)
    } catch {
      /* 目标不存在 */
    }
    fs.renameSync(tmp, target)
  }
}

/** 清理回收站里超过 30 天的条目（每次写操作前调用一次）。 */
function pruneRecycleBin(meta) {
  if (!meta || !Array.isArray(meta.recycleBin)) return
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  meta.recycleBin = meta.recycleBin.filter((entry) => {
    const at = Date.parse(entry && entry.deletedAt)
    return Number.isFinite(at) && at > cutoff
  })
}

/* ------------------------------------- v3.10 研究目标 · 好问题卡（Goal Card）
 *
 * 研究目标不再是一条自由文本，而是一张**可验证的好问题卡**：
 * 由 /zhuanz-thinking-framework（八层假设审计）与 good-question（好问题卡）
 * 两项技能共同产出，落盘在 control/rdw-goal-card.json。
 *
 * 为什么不写进 PROJECT_STATE.json：DAG 协议里 project.goal 只是字符串，
 * 没有「竞争性解释 / 判别证据 / 推翻条件 / pilot」的位置。工作台把结构化部分
 * 存成自己的旁挂文件，再用 goal 的 500 字摘要回写协议——协议保持干净，
 * 工作台的元数据也完整。
 */
const GOAL_CARD_FILE = 'rdw-goal-card.json'

/** Good Question Card 的字段（顺序即 UI 顺序）。 */
const GOAL_CARD_FIELDS = [
  'title',
  'question',
  'whyMatters',
  'assumptionChallenged',
  'hypotheses',
  'discriminatingTest',
  'falsifier',
  'pilot',
  'resources',
  'reviewerRisk',
  'nextAction',
]

/** 八层框架的层 id（-3..5），用于假设审计矩阵。 */
const THINKING_LAYERS = [
  { id: '-3', name: '几何维度', ask: '研究对象是几维的？（0维单值 / 1维轨迹 / 2维分布 / 3维联合 / 关系维）' },
  { id: '-2', name: '参照系', ask: '假设了什么是静止的？（对照组 / 基线 / 自然病程）' },
  { id: '-1', name: '端点动力学', ask: '端点本身在做什么运动？（开放 / 闭合 / 混沌 / 异质）' },
  { id: '0', name: '端点结构', ask: '起终点怎么设定？time zero 在哪？' },
  { id: '1', name: '默认态', ask: '假设了什么不需要解释？' },
  { id: '2', name: '度量', ask: '在哪个「距离」下找最优？（哪个 endpoint 说了算）' },
  { id: '3', name: '导数阶', ask: '原因作用在哪一阶？（水平 / 变化率 / 加速度）' },
  { id: '4', name: '时间角色', ask: '时间是什么？（背景 / 优化对象 / 因果方向 / 关系相位）' },
  { id: '5', name: '观察窗口', ask: '时间的哪段看不见？（随访损失 / 截尾 / 泛化）' },
]

/** 读取目标卡；不存在返回空骨架。 */
function readGoalCard(root) {
  const filePath = join(root, 'control', GOAL_CARD_FILE)
  const result = readJson(filePath)
  const base = { version: 2, card: {}, layers: [], updatedAt: null, goal: null }
  if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    return { path: filePath, data: base }
  }
  const data = Object.assign({}, base, result.data)
  if (!data.card || typeof data.card !== 'object' || Array.isArray(data.card)) data.card = {}
  if (!Array.isArray(data.layers)) data.layers = []
  return { path: filePath, data }
}

/** 原子写目标卡（与 rib-meta 同一套 tmp+rename 策略）。 */
function writeGoalCardAtomic(root, data) {
  const target = join(root, 'control', GOAL_CARD_FILE)
  const dir = dirname(target)
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    /* 已存在 */
  }
  const tmp = join(dir, `.${GOAL_CARD_FILE}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  try {
    fs.renameSync(tmp, target)
  } catch {
    try {
      fs.unlinkSync(target)
    } catch {
      /* 目标不存在 */
    }
    fs.renameSync(tmp, target)
  }
}

/**
 * 把好问题卡压成可写进 project.goal 的一句话（≤500 字）。
 * 优先级：卡里的 question > title > 现有 goal。
 * 只取「问题 + 什么会推翻它」两段——这两段决定研究能不能被证伪，
 * 正是 DAG 里 goal 该承载的语义。
 */
function composeGoalFromCard(card, fallback) {
  const question = String((card && card.question) || '').trim()
  const falsifier = String((card && card.falsifier) || '').trim()
  const parts = []
  if (question) parts.push(question)
  if (falsifier) parts.push(`推翻条件：${falsifier}`)
  const composed = parts.join('；')
  if (composed) return composed.slice(0, GOAL_MAX_CHARS)
  const alt = String((card && card.title) || '').trim()
  if (alt) return alt.slice(0, GOAL_MAX_CHARS)
  return fallback ? String(fallback).slice(0, GOAL_MAX_CHARS) : null
}


/* ------------------------------------------------- v3.8 Zotero 只读客户端
 *
 * 只发 GET（除了「在 Zotero 中定位」会拉起 zotero:// 协议）。
 * 所有失败都退化成结构化错误，绝不抛异常到路由层：Zotero 没开机时
 * 项目流程/工作区照常可用，只是文献面板显示「未连接 Zotero」。
 */

/** Zotero 本地 API 根地址（允许用 RDW_ZOTERO_BASE 覆盖，便于换端口调试）。 */
function zoteroBase() {
  const override = process.env.RDW_ZOTERO_BASE
  if (typeof override === 'string' && /^https?:\/\/[^\s]+$/.test(override)) {
    return override.replace(/\/+$/, '')
  }
  return ZOTERO_DEFAULT_BASE
}

/** 一次 Zotero API GET；返回 { ok, status, json, total, error }。 */
async function zoteroGet(path, timeoutMs = ZOTERO_TIMEOUT_MS) {
  const url = `${zoteroBase()}${path}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Zotero-API-Version': '3', Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const total = response.headers.get('total-results')
    if (!response.ok) {
      return { ok: false, status: response.status, json: null, total, error: `HTTP ${response.status}` }
    }
    let json = null
    try {
      json = await response.json()
    } catch {
      return { ok: false, status: response.status, json: null, total, error: '响应不是合法 JSON' }
    }
    return { ok: true, status: response.status, json, total, error: '' }
  } catch (error) {
    const name = error && error.name ? String(error.name) : ''
    const message = name === 'TimeoutError' ? '连接超时' : String(error && error.message ? error.message : error)
    return { ok: false, status: 0, json: null, total: null, error: message }
  }
}

/** 探活：GET 一个 1 条的合集列表，够便宜也够准。 */
async function zoteroProbe(timeoutMs = 4_000) {
  const base = zoteroBase()
  // 本机 Zotero 的 connector ping 永远是 200 HTML，不依赖 API 权限，用它判「活着」。
  try {
    const response = await fetch(`${base}/connector/ping`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return { available: false, base, error: `HTTP ${response.status}` }
    const result = await zoteroGet('/api/users/0/collections?limit=1', timeoutMs)
    if (!result.ok) return { available: false, base, error: `本地 API 不可用：${result.error}` }
    return { available: true, base, error: '' }
  } catch (error) {
    const name = error && error.name ? String(error.name) : ''
    return {
      available: false,
      base,
      error: name === 'TimeoutError' ? 'Zotero 未响应（未启动？）' : 'Zotero 未运行',
    }
  }
}

/** 逐年取值：优先 meta.parsedDate 的前四位。 */
function zoteroYear(item) {
  const meta = (item && item.meta) || {}
  const data = (item && item.data) || {}
  const raw = String(meta.parsedDate || data.date || '')
  const hit = raw.match(/(1[6-9]\d{2}|20\d{2})/)
  return hit ? Number(hit[1]) : null
}

/** 把 Zotero 条目压成前端够用的一行（体积可控，不塞整段摘要）。 */
function zoteroSummary(item) {
  const data = (item && item.data) || {}
  const meta = (item && item.meta) || {}
  const creators = Array.isArray(data.creators) ? data.creators : []
  const names = creators
    .map((row) => (row && (row.name || [row.lastName, row.firstName].filter(Boolean).join(' '))) || '')
    .filter(Boolean)
  const tags = Array.isArray(data.tags) ? data.tags.map((row) => row && row.tag).filter(Boolean) : []
  const abstract = String(data.abstractNote || '').trim()
  return {
    key: data.key || (item && item.key) || '',
    itemType: data.itemType || '',
    title: String(data.title || '').trim() || '(无标题)',
    creators: meta.creatorSummary || names.slice(0, 3).join(', '),
    year: zoteroYear(item),
    publication: String(data.publicationTitle || data.bookTitle || data.university || '').trim(),
    doi: String(data.DOI || '').trim(),
    url: String(data.url || '').trim(),
    tags,
    collections: Array.isArray(data.collections) ? data.collections : [],
    hasAbstract: abstract.length > 0,
    abstractSnippet: abstract ? abstract.slice(0, 220) : '',
  }
}

/** 是不是「真文献」——Zotero 的 top 列表里也混着笔记/附件/批注，要剔掉。 */
function isZoteroRegularItem(item) {
  const type = String((item && item.data && item.data.itemType) || '')
  return type !== 'note' && type !== 'attachment' && type !== 'annotation'
}

/** 按 key 批量取条目详情（每批 50，Zotero 对 itemKey 参数有长度上限）。 */
async function zoteroItemsByKeys(keys) {
  const wanted = Array.from(new Set((Array.isArray(keys) ? keys : []).filter((key) => ZOTERO_KEY_RE.test(String(key)))))
  if (wanted.length === 0) return { ok: true, items: [], missing: [], error: '' }
  const found = new Map()
  let error = ''
  for (let offset = 0; offset < wanted.length; offset += 50) {
    const batch = wanted.slice(offset, offset + 50)
    const result = await zoteroGet(`/api/users/0/items?itemKey=${batch.join(',')}&limit=${batch.length}`)
    if (!result.ok) {
      error = result.error
      continue
    }
    for (const item of Array.isArray(result.json) ? result.json : []) {
      const summary = zoteroSummary(item)
      if (summary.key) found.set(summary.key, summary)
    }
  }
  const items = wanted.map((key) => found.get(key)).filter(Boolean)
  const missing = wanted.filter((key) => !found.has(key))
  return { ok: error === '', items, missing, error }
}

/** 关键词检索顶层条目（不含笔记/附件）。 */
async function zoteroSearch(query, limit = 20) {
  const q = String(query || '').trim()
  if (!q) return { ok: true, items: [], total: 0, error: '' }
  const capped = Math.max(1, Math.min(50, Number(limit) || 20))
  const result = await zoteroGet(
    `/api/users/0/items/top?q=${encodeURIComponent(q)}&qmode=everything&limit=${capped}`,
  )
  if (!result.ok) return { ok: false, items: [], total: 0, error: result.error }
  const items = (Array.isArray(result.json) ? result.json : []).filter(isZoteroRegularItem).map(zoteroSummary)
  return { ok: true, items, total: Number(result.total || items.length), error: '' }
}

/** 全部合集 → 带层级的扁平列表（前端自己按 depth 缩进渲染）。 */
async function zoteroCollectionTree() {
  const result = await zoteroGet(`/api/users/0/collections?limit=${ZOTERO_MAX_ITEMS}`)
  if (!result.ok) return { ok: false, tree: [], flat: [], total: 0, error: result.error }
  const rows = Array.isArray(result.json) ? result.json : []
  const nodes = rows.map((row) => {
    const data = (row && row.data) || {}
    const meta = (row && row.meta) || {}
    return {
      key: data.key || (row && row.key) || '',
      name: String(data.name || '').trim() || '(未命名合集)',
      parent: data.parentCollection || null,
      items: Number(meta.numItems || 0),
      children: [],
    }
  })
  const byKey = new Map(nodes.map((node) => [node.key, node]))
  const roots = []
  for (const node of nodes) {
    const parent = node.parent && byKey.get(node.parent)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const flat = []
  const walk = (list, depth) => {
    const sorted = list.slice().sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
    for (const node of sorted) {
      flat.push({ key: node.key, name: node.name, items: node.items, depth })
      walk(node.children, depth + 1)
    }
  }
  walk(roots, 0)
  return { ok: true, tree: roots, flat, total: nodes.length, error: '' }
}

/** 某合集的顶层条目。 */
async function zoteroCollectionItems(collectionKey, limit = 100, start = 0) {
  if (!ZOTERO_KEY_RE.test(String(collectionKey || ''))) {
    return { ok: false, items: [], total: 0, error: '合集 key 非法' }
  }
  const capped = Math.max(1, Math.min(100, Number(limit) || 100))
  const offset = Math.max(0, Number(start) || 0)
  const result = await zoteroGet(
    `/api/users/0/collections/${collectionKey}/items/top?limit=${capped}&start=${offset}`,
  )
  if (!result.ok) return { ok: false, items: [], total: 0, error: result.error }
  const items = (Array.isArray(result.json) ? result.json : []).filter(isZoteroRegularItem).map(zoteroSummary)
  return { ok: true, items, total: Number(result.total || items.length), error: '' }
}

/** 合集里最多 ZOTERO_MAX_ITEMS 条顶层条目（分页拉完，避免「124 条只进 100」）。 */
async function zoteroCollectionItemKeys(collectionKey, cap = ZOTERO_MAX_ITEMS) {
  const keys = []
  let total = 0
  let error = ''
  let truncated = false
  for (let start = 0; start < cap; start += 100) {
    const page = await zoteroCollectionItems(collectionKey, Math.min(100, cap - start), start)
    if (!page.ok) {
      error = page.error
      break
    }
    total = page.total
    for (const item of page.items) {
      if (item.key) keys.push(item.key)
    }
    if (page.items.length === 0 || keys.length >= total) break
    if (keys.length >= cap) {
      truncated = total > cap
      break
    }
  }
  return { keys: Array.from(new Set(keys)).slice(0, cap), total, error, truncated }
}

/** 分支上的 Zotero 挂载关系（itemKeys / collectionKey）。 */
function readRibZotero(meta, ribId) {
  const entry = meta && meta.ribs && typeof meta.ribs === 'object' ? meta.ribs[ribId] : null
  const keys = entry && Array.isArray(entry.itemKeys)
    ? entry.itemKeys.filter((key) => ZOTERO_KEY_RE.test(String(key))).slice(0, ZOTERO_MAX_ITEMS)
    : []
  const collectionKey = entry && typeof entry.collectionKey === 'string' && ZOTERO_KEY_RE.test(entry.collectionKey)
    ? entry.collectionKey
    : null
  return { itemKeys: keys, collectionKey }
}

/** 写回分支的 Zotero 挂载关系（空则删除字段，保持 meta 干净）。 */
function writeRibZotero(root, meta, ribId, next) {
  const entry = { ...(meta.ribs[ribId] || {}) }
  const keys = Array.isArray(next.itemKeys) ? next.itemKeys.filter((key) => ZOTERO_KEY_RE.test(String(key))) : []
  if (keys.length > 0) entry.itemKeys = Array.from(new Set(keys)).slice(0, ZOTERO_MAX_ITEMS)
  else delete entry.itemKeys
  if (next.collectionKey && ZOTERO_KEY_RE.test(next.collectionKey)) entry.collectionKey = next.collectionKey
  else if (next.collectionKey === null) delete entry.collectionKey
  if (Object.keys(entry).length > 0) meta.ribs[ribId] = entry
  else delete meta.ribs[ribId]
  writeRibMetaAtomic(root, meta)
}

/** 把条目/合集在 Zotero 客户端里定位并选中（zotero:// 协议，只切焦点不改数据）。 */
function openZoteroTarget(target) {
  const kind = target && target.kind === 'collection' ? 'collections' : 'items'
  const key = String((target && target.key) || '')
  if (!ZOTERO_KEY_RE.test(key)) return { ok: false, error: 'key 非法' }
  const uri = `zotero://select/library/${kind}/${key}`
  try {
    if (process.platform === 'win32') {
      spawn('rundll32.exe', ['url.dll,FileProtocolHandler', uri], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [uri], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [uri], { detached: true, stdio: 'ignore' }).unref()
    }
    return { ok: true, uri }
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) }
  }
}

/** DSH home（支持 DSH_HOME 覆盖）。 */
function dshHome() {
  const override = process.env.DSH_HOME
  if (typeof override === 'string' && override.length > 0) return resolve(override)
  return join(homedir(), '.dsh')
}

/** 工作台配置文件：`$DSH_HOME/research-dag-workbench/config.json`。 */
function configPath() {
  return join(dshHome(), 'research-dag-workbench', 'config.json')
}

/** 当前时间戳（本地时区带偏移，如 2026-10-18T12:00:00+08:00）。 */
function nowLocalIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** 目录是否为已存在的绝对目录。 */
function isExistingDir(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  if (!isAbsolute(value)) return false
  try {
    return fs.statSync(value).isDirectory()
  } catch {
    return false
  }
}

function isExistingFile(value) {
  try {
    return fs.statSync(value).isFile()
  } catch {
    return false
  }
}

/** 是否 research-dag 协议项目（存在 control/ledger.json）。 */
function isDagProject(root) {
  try {
    return fs.statSync(join(root, 'control', 'ledger.json')).isFile()
  } catch {
    return false
  }
}

/** 读取 JSON 文件；返回带标记的失败而不是抛异常。 */
function readJson(path) {
  if (!isExistingFile(path)) return { exists: false, error: null, data: null }
  try {
    return { exists: true, error: null, data: JSON.parse(fs.readFileSync(path, 'utf8')) }
  } catch (error) {
    return {
      exists: true,
      error: String(error && error.message ? error.message : error),
      data: null,
    }
  }
}

/** 读取工作台配置。 */
function readConfig() {
  const path = configPath()
  const result = readJson(path)
  return { ...result, path }
}

/** 原子写工作台配置（tmp + rename）。 */
function writeConfigAtomic(config) {
  const target = configPath()
  const dir = dirname(target)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = join(dir, `.config.json.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  try {
    fs.renameSync(tmp, target)
  } catch {
    try {
      fs.unlinkSync(target)
    } catch {
      /* 目标不存在 */
    }
    fs.renameSync(tmp, target)
  }
}

/**
 * 工具解析：优先 `<project>/control/dag.mjs`，否则 `<kitRoot>/tools/dag.mjs`。
 * 两者都用 process.execPath 调用，`cwd=project`，argv 末尾追加 `--root <project>`。
 */
function resolveTool(project) {
  const local = join(project, 'control', 'dag.mjs')
  if (isExistingFile(local)) {
    // 每次解析都先确认项目副本与插件自带实现一致（旧副本会导致新界面调不到新命令）
    const fresh = ensureProjectToolFresh(project)
    if (fresh.synced) lastToolSync.set(project, fresh)
    return local
  }
  return join(KIT_ROOT, 'tools', 'dag.mjs')
}

/** 记录最近一次 CLI 副本自愈动作，供 /health 与错误提示展示。 */
const lastToolSync = new Map()

/**
 * v3.14 —— 项目内 CLI 副本自愈。
 *
 * 背景（真实故障）：`dag init` 会把 CLI 复制到 `<project>/control/dag.mjs`，之后新版本插件
 * 仍优先调用这份**旧副本**。于是「界面是新的、命令行是旧的」：新界面调用新命令/新参数
 * （`branch chain`、`graft --chain`、`spine write` 等）时旧 CLI 直接报未知命令，
 * 表现为「创建分支未成功」之类的失败，且错误信息晦涩。
 *
 * 处理：项目副本与插件自带 `tools/dag.mjs` 内容不同 → 备份旧副本为
 * `dag.mjs.bak-<时间戳>`，再复制新版过去；同目录的 `dag-core.mjs` / `spur-context.mjs`
 * 一并同步（它们是同一份实现的三件套）。任何失败都静默降级，绝不阻断命令执行。
 *
 * 返回 { synced, backups[], reason }，便于在 /health 里显示。
 */
function ensureProjectToolFresh(project) {
  const result = { synced: false, backups: [], reason: '' }
  try {
    const freshTool = join(KIT_ROOT, 'tools', 'dag.mjs')
    const localTool = join(project, 'control', 'dag.mjs')
    if (!isExistingFile(freshTool) || !isExistingFile(localTool)) return result
    const freshText = fs.readFileSync(freshTool, 'utf8')
    const localText = fs.readFileSync(localTool, 'utf8')
    if (freshText === localText) return result
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const pairs = [
      ['dag.mjs', 'dag.mjs'],
      ['dag-core.mjs', 'dag-core.mjs'],
      ['spur-context.mjs', 'spur-context.mjs'],
    ]
    for (const [from, to] of pairs) {
      const src = join(KIT_ROOT, 'tools', from)
      const dst = join(project, 'control', to)
      if (!isExistingFile(src)) continue
      if (isExistingFile(dst)) {
        const bak = `${dst}.bak-${stamp}`
        try {
          fs.copyFileSync(dst, bak)
          result.backups.push(bak)
        } catch {
          /* 备份失败就不覆盖，避免丢数据 */
          if (from === 'dag.mjs') {
            result.reason = '备份旧 CLI 失败，保持原样'
            return result
          }
          continue
        }
      }
      fs.mkdirSync(dirname(dst), { recursive: true })
      fs.copyFileSync(src, dst)
    }
    result.synced = true
    result.reason = '项目内 CLI 副本已升级到插件自带版本'
  } catch (problem) {
    result.reason = `同步失败（已忽略）：${problem && problem.message ? problem.message : problem}`
  }
  return result
}

/** 从 CLI stdout 里解析 JSON（优先最后一行以 `{` 开头的 JSON）。 */
function parseJsonOutput(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return null
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith('{')) continue
    try {
      return JSON.parse(lines[i])
    } catch {
      /* 继续向前找 */
    }
  }
  try {
    return JSON.parse(text.trim())
  } catch {
    return null
  }
}

/** 发送一条 JSON 响应（每个请求只发一次）。 */
function sendJson(res, status, payload) {
  if (res.writableEnded) return
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(body)
}

/** 读取请求体（UTF-8，带大小上限）。 */
function readBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = []
    let total = 0
    let rejected = false
    req.on('data', (chunk) => {
      if (rejected) return
      total += chunk.length
      if (total > limit) {
        rejected = true
        rejectPromise(new Error('request body too large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (rejected) return
      resolvePromise(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (error) => {
      if (rejected) return
      rejected = true
      rejectPromise(error)
    })
  })
}

/** 归一化为安全 argv token；不合法时回退默认值。 */
function safeToken(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!SAFE_TOKEN_RE.test(trimmed)) return fallback
  return trimmed
}

/** 校验 reason：去空白后 1..2000 字符。 */
function validateReason(value) {
  if (typeof value !== 'string') {
    return { error: true, code: 'E_REASON', message: 'reason 必填（1–2000 字符）' }
  }
  const reason = value.trim()
  if (reason.length < 1 || reason.length > MAX_REASON_CHARS) {
    return { error: true, code: 'E_REASON', message: 'reason 必填（1–2000 字符）' }
  }
  return { reason }
}

/** 按 Unicode 码点计数（中文 1 字 = 1）。 */
function charLength(value) {
  return Array.from(String(value ?? '')).length
}

/** 会话绑定 key 归一化：允许 `branch:<module>/<id>`、`branch:<id>`、`module:<id>`、`goal`。 */
function normalizeSessionKey(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  if (raw === 'goal') return 'goal'
  const m = raw.match(/^(branch|module):(.+)$/)
  if (!m) return null
  const kind = m[1]
  const rest = m[2].trim()
  if (!rest) return null
  if (kind === 'module') {
    if (!ID_RE.test(rest)) return null
    return `module:${rest}`
  }
  if (kind === 'branch') {
    if (rest.includes('/')) {
      const parts = rest.split('/')
      if (parts.length !== 2) return null
      const [modPart, branchPart] = parts
      if (!ID_RE.test(modPart) || !ID_RE.test(branchPart)) return null
      return `branch:${modPart}/${branchPart}`
    }
    if (!ID_RE.test(rest)) return null
    return `branch:${rest}`
  }
  return null
}

/** 自由命名节点 id（PROTOCOL v1.2：不得以 `.` 或 `-` 结尾）。 */
function validateNodeIdField(value, label = 'id') {
  const id = typeof value === 'string' ? value.trim() : ''
  if (id.length === 0 || !ID_RE.test(id)) {
    return {
      error: true,
      code: 'E_ACTION',
      message: `${label} 非法（必须匹配 ^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_])?$）：${String(value)}`,
    }
  }
  return { id }
}

/** 显示名：任意语言，1..80 字。 */
function validateNameField(value, label = 'name') {
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: `${label} 必填（任意语言，1–${NAME_MAX_CHARS} 字）` }
  }
  const name = value.trim()
  const length = charLength(name)
  if (length < 1 || length > NAME_MAX_CHARS) {
    return {
      error: true,
      code: 'E_ACTION',
      message: `${label} 必填（任意语言，1–${NAME_MAX_CHARS} 字）：当前 ${length} 字`,
    }
  }
  return { name }
}

/** 可选目录 slug：空/缺省 = 不追加；否则 [A-Za-z0-9._-]{1,40}。 */
function validateOptionalSlug(value) {
  if (value === undefined || value === null) return { slug: null }
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: 'slug 必须是字符串' }
  }
  const slug = value.trim()
  if (slug.length === 0) return { slug: null }
  if (slug.length > 40 || !DIR_SLUG_RE.test(slug)) {
    return {
      error: true,
      code: 'E_ACTION',
      message: 'slug 非法（必须匹配 [A-Za-z0-9._-]{1,40}）',
    }
  }
  return { slug }
}

/** 可选 handoff 文件名 label（--slug）：空/缺省 = 用分支 id。 */
function validateOptionalLabel(value) {
  if (value === undefined || value === null) return { label: null }
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: 'label 必须是字符串' }
  }
  const label = value.trim()
  if (label.length === 0) return { label: null }
  if (!HANDOFF_LABEL_RE.test(label)) {
    return {
      error: true,
      code: 'E_ACTION',
      message: 'label 非法（必须匹配 [A-Za-z0-9._-]{1,40}）',
    }
  }
  return { label }
}

/** 可选 stream：空/缺省 = 用 CLI 缺省；否则 [a-z0-9][a-z0-9-]*。 */
function validateOptionalStream(value) {
  if (value === undefined || value === null) return { stream: null }
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: 'stream 必须是字符串' }
  }
  const stream = value.trim()
  if (stream.length === 0) return { stream: null }
  if (!STREAM_RE.test(stream)) {
    return {
      error: true,
      code: 'E_ACTION',
      message: 'stream 非法（必须匹配 [a-z0-9][a-z0-9-]*）',
    }
  }
  return { stream }
}

/** init 的 title：必填，≤120 字。 */
function validateInitTitle(value) {
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: `title 必填（≤${TITLE_MAX_CHARS} 字）` }
  }
  const title = value.trim()
  const length = charLength(title)
  if (length < 1 || length > TITLE_MAX_CHARS) {
    return {
      error: true,
      code: 'E_ACTION',
      message: `title 必填（1–${TITLE_MAX_CHARS} 字）：当前 ${length} 字`,
    }
  }
  return { title }
}

/** init 的 goal：可选，≤500 字。 */
function validateOptionalGoal(value) {
  if (value === undefined || value === null) return { goal: null }
  if (typeof value !== 'string') {
    return { error: true, code: 'E_ACTION', message: 'goal 必须是字符串' }
  }
  const goal = value.trim()
  if (goal.length === 0) return { goal: null }
  if (charLength(goal) > GOAL_MAX_CHARS) {
    return { error: true, code: 'E_ACTION', message: `goal 不能超过 ${GOAL_MAX_CHARS} 字` }
  }
  return { goal }
}

/** init 的 root：绝对路径；可不存在，但父目录必须存在且可写；不得指向已存在的文件。 */
function validateInitRoot(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { error: true, code: 'E_PATH', message: 'init 需要 root（项目绝对路径）' }
  }
  const raw = value.trim()
  if (!isAbsolute(raw)) {
    return { error: true, code: 'E_PATH', message: 'init 的 root 必须是绝对路径' }
  }
  const root = resolve(raw)
  try {
    if (fs.statSync(root).isFile()) {
      return { error: true, code: 'E_PATH', message: 'init 的 root 已存在且是文件' }
    }
  } catch {
    /* 不存在是正常情况 */
  }
  const parent = dirname(root)
  if (!isExistingDir(parent)) {
    return { error: true, code: 'E_PATH', message: `init 的 root 父目录不存在：${parent}` }
  }
  try {
    fs.accessSync(parent, fs.constants.W_OK)
  } catch {
    return { error: true, code: 'E_PATH', message: `init 的 root 父目录不可写：${parent}` }
  }
  return { root }
}

/** 读取项目 PROJECT_STATE.json（用于“模块/分支必须已注册”的宿主侧预校验）。 */
function readProjectStateData(project) {
  const result = readJson(join(project, 'control', 'PROJECT_STATE.json'))
  return result.data && typeof result.data === 'object' && !Array.isArray(result.data)
    ? result.data
    : null
}

/** 模块 id 是否已在 PROJECT_STATE.json 注册。 */
function isModuleRegistered(project, moduleId) {
  const state = readProjectStateData(project)
  return Boolean(
    state &&
      Array.isArray(state.modules) &&
      state.modules.some((module) => module && module.id === moduleId),
  )
}

/** 分支 id 是否已在 PROJECT_STATE.json 注册。 */
function isBranchRegistered(project, branchId) {
  const state = readProjectStateData(project)
  return Boolean(
    state &&
      Array.isArray(state.branches) &&
      state.branches.some((branch) => branch && branch.id === branchId),
  )
}

/**
 * 校验 handoff 相对路径：相对、匹配命名规则、resolve 后仍在项目内、文件存在。
 * @returns {{error:true, code:string, message:string}|{abs:string, rel:string}}
 */
function validateHandoffPath(project, value, { requireExists = true } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { error: true, code: 'E_PATH', message: '缺少 handoff 相对路径' }
  }
  const raw = value.trim()
  if (!HANDOFF_PATH_RE.test(raw)) {
    return {
      error: true,
      code: 'E_PATH',
      message: 'handoff 路径必须匹配 modules/<目录>/handoffs/HANDOFF-*.md（相对路径）',
    }
  }
  if (raw.includes('\\') || raw.startsWith('/') || /^[A-Za-z]:/.test(raw) || raw.split('/').includes('..')) {
    return { error: true, code: 'E_PATH', message: 'handoff 路径必须是项目内相对路径（禁止 ..、盘符、UNC）' }
  }
  const abs = resolve(project, ...raw.split('/'))
  const rel = relative(project, abs)
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) {
    return { error: true, code: 'E_PATH', message: 'handoff 路径逃逸到项目根之外' }
  }
  if (requireExists && !isExistingFile(abs)) {
    return { error: true, code: 'E_PATH', message: `handoff 文件不存在：${raw}` }
  }
  return { abs, rel: rel.split('\\').join('/') }
}

/**
 * 宿主侧解析 handoff frontmatter（PROTOCOL §3.2 的扁平子集，用于 /handoff 与 /state 列表）。
 * 解析失败不抛异常，退化为无 frontmatter。
 */
function parseFrontmatterLoose(text) {
  const source = String(text ?? '')
  const info = { frontmatter: {}, body: source, hasFrontmatter: false }
  if (!source.startsWith('---')) return info
  const firstNl = source.indexOf('\n')
  if (firstNl < 0) return info
  if (source.slice(0, firstNl).replace(/\r$/, '').trim() !== '---') return info
  const entries = {}
  let pos = firstNl + 1
  while (pos <= source.length) {
    const nl = source.indexOf('\n', pos)
    const end = nl < 0 ? source.length : nl
    let line = source.slice(pos, end)
    if (line.endsWith('\r')) line = line.slice(0, -1)
    if (line.trim() === '---') {
      const bodyStart = nl < 0 ? source.length : nl + 1
      let body = source.slice(bodyStart)
      if (body.startsWith('\r\n')) body = body.slice(2)
      else if (body.startsWith('\n')) body = body.slice(1)
      info.frontmatter = entries
      info.body = body
      info.hasFrontmatter = true
      return info
    }
    if (line.trim() !== '') {
      const colon = line.indexOf(':')
      if (colon > 0) {
        const key = line.slice(0, colon).trim()
        let value = line.slice(colon + 1).trim()
        if (
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.slice(1, -1)
        }
        entries[key] = value === '' ? null : value
      }
    }
    if (nl < 0) break
    pos = nl + 1
  }
  return info
}

/**
 * 扫描项目中的 handoff（磁盘优先，按 path 升序）；供 /state 的 handoffs 字段。
 * module 归属以 frontmatter.module 为准；缺失时用 PROJECT_STATE.json 的 dir 映射兜底，
 * 绝不从目录名正则猜 id（PROTOCOL v1.2）。
 */
function scanHandoffs(root, stateData) {
  const out = []
  const modulesDir = join(root, 'modules')
  let entries = []
  try {
    entries = fs.readdirSync(modulesDir, { withFileTypes: true })
  } catch {
    return out
  }
  const moduleByDir = new Map()
  if (stateData && Array.isArray(stateData.modules)) {
    for (const module of stateData.modules) {
      if (!module || typeof module.dir !== 'string') continue
      const dir = module.dir.replace(/\\/g, '/').replace(/\/+$/, '')
      if (dir.length > 0 && module.id !== undefined) moduleByDir.set(dir, module.id)
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const handoffsDir = join(modulesDir, entry.name, 'handoffs')
    let files = []
    try {
      files = fs.readdirSync(handoffsDir)
    } catch {
      continue
    }
    const dirRel = `modules/${entry.name}`
    const moduleFromState = moduleByDir.get(dirRel) ?? null
    for (const fileName of files.sort()) {
      if (!fileName.endsWith('.md')) continue
      const abs = join(handoffsDir, fileName)
      let content
      try {
        content = fs.readFileSync(abs, 'utf8')
      } catch {
        continue
      }
      const fm = parseFrontmatterLoose(content).frontmatter
      const frontmatterModule =
        typeof fm.module === 'string' && fm.module.length > 0 ? fm.module : null
      out.push({
        path: `modules/${entry.name}/handoffs/${fileName}`,
        module: frontmatterModule ?? moduleFromState,
        branch: fm.branch ?? null,
        stream: fm.stream ?? null,
        version: fm.version !== null && fm.version !== undefined && /^\d+$/.test(String(fm.version))
          ? Number(fm.version)
          : null,
        status: fm.status ?? null,
        created_at: fm.created_at ?? null,
        submitted_at: fm.submitted_at ?? null,
      })
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** 空 counts（六个固定键，缺省 0）。 */
function emptyCounts() {
  const counts = {}
  for (const key of COUNT_KEYS) counts[key] = 0
  return counts
}

/** 归一化任意 counts 对象为六个固定键。 */
function normalizeCounts(value) {
  const counts = emptyCounts()
  if (value && typeof value === 'object') {
    for (const key of COUNT_KEYS) {
      const n = Number(value[key])
      if (Number.isFinite(n)) counts[key] = n
    }
  }
  return counts
}

/** 按 status 聚合项目 counts。 */
function countsFromHandoffs(handoffs) {
  const counts = emptyCounts()
  for (const handoff of handoffs) {
    const key = String(handoff.status || '').toLowerCase()
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1
  }
  return counts
}

/** 按模块聚合 counts。 */
function countsByModule(handoffs, moduleId) {
  return countsFromHandoffs(handoffs.filter((handoff) => handoff.module === moduleId))
}

/** 归一化 status --json 的 modules[]（补全 counts 六键）。 */
function normalizeModules(modules, stateData, handoffs) {
  if (Array.isArray(modules) && modules.length > 0) {
    return modules.map((module) => ({
      id: module && module.id !== undefined ? module.id : null,
      name: module && module.name !== undefined ? module.name : null,
      branches: Number.isFinite(Number(module && module.branches)) ? Number(module.branches) : 0,
      counts: normalizeCounts(module && module.counts),
    }))
  }
  const stateModules = stateData && Array.isArray(stateData.modules) ? stateData.modules : []
  const stateBranches = stateData && Array.isArray(stateData.branches) ? stateData.branches : []
  return stateModules.map((module) => ({
    id: module && module.id !== undefined ? module.id : null,
    name: module && module.name !== undefined ? module.name : null,
    branches: stateBranches.filter((branch) => branch && branch.module === (module && module.id)).length,
    counts: countsByModule(handoffs, module && module.id),
  }))
}

/** 归一化 PROJECT_STATE.json 的 branches[]（DAG 视图显示「分支 id · 显示名」）。 */
function normalizeBranches(stateData) {
  const list = stateData && Array.isArray(stateData.branches) ? stateData.branches : []
  return list.map((branch) => ({
    id: branch && branch.id !== undefined ? branch.id : null,
    module: branch && branch.module !== undefined ? branch.module : null,
    name: branch && branch.name !== undefined ? branch.name : null,
    dir: branch && branch.dir !== undefined ? branch.dir : null,
  }))
}

/** questions 归一化为字符串数组（真实 CLI 目前返回字符串，契约要求数组）。 */
function normalizeQuestions(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value !== 'string') return []
  return value
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 归一化 pending_decisions。 */
function normalizePendingDecisions(list) {
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    path: item && item.path !== undefined ? item.path : null,
    stream: item && item.stream !== undefined ? item.stream : null,
    version: item && item.version !== undefined ? item.version : null,
    questions: normalizeQuestions(item && item.questions),
  }))
}

/** 归一化 accepted。 */
function normalizeAccepted(list, handoffs) {
  if (Array.isArray(list)) {
    return list.map((item) => ({
      stream: item && item.stream !== undefined ? item.stream : null,
      path: item && item.path !== undefined ? item.path : null,
      version: item && item.version !== undefined ? item.version : null,
    }))
  }
  return handoffs
    .filter((handoff) => handoff.status === 'ACCEPTED')
    .map((handoff) => ({ stream: handoff.stream, path: handoff.path, version: handoff.version }))
}

/** CLI 失败时的兜底 project（用 PROJECT_STATE.json + 磁盘 handoff 拼）。 */
function buildFallbackProject(root, handoffs, stateData) {
  const stateProject = stateData && stateData.project ? stateData.project : {}
  return {
    root,
    exists: true,
    isDag: true,
    id: stateProject.id ?? null,
    title: stateProject.title ?? null,
    goal: stateProject.goal ?? null,
    phase: stateData && stateData.phase !== undefined ? stateData.phase : null,
    next_steps: stateData && Array.isArray(stateData.next_steps) ? stateData.next_steps : [],
    blockers: stateData && Array.isArray(stateData.blockers) ? stateData.blockers : [],
    modules: normalizeModules(null, stateData, handoffs),
    branches: normalizeBranches(stateData),
    handoffs,
    pending_decisions: handoffs
      .filter((handoff) => handoff.status === 'PROVISIONAL')
      .map((handoff) => ({
        path: handoff.path,
        stream: handoff.stream,
        version: handoff.version,
        questions: [],
      })),
    accepted: normalizeAccepted(null, handoffs),
    counts: countsFromHandoffs(handoffs),
  }
}

/** 摘要化一次 CLI 失败（stderr 优先，截断 2000 字）。 */
function summarizeCliFailure(result) {
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : ''
  const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : ''
  const text = stderr || stdout || `exit=${result.exitCode}${result.timedOut ? ' (timeout)' : ''}`
  return text.slice(0, 2000)
}

/* ------------------------------------------------------------ 子进程执行 */

/** 把一段输出追加到有上限的缓冲区；超过上限后截断并停止追加。 */
function appendCapped(record, key, chunk, truncatedFlag) {
  if (truncatedFlag[key]) return
  const next = record[key] + chunk
  if (next.length > MAX_OUTPUT_CHARS) {
    record[key] = `${next.slice(0, MAX_OUTPUT_CHARS)}${TRUNCATED_SUFFIX}`
    truncatedFlag[key] = true
    return
  }
  record[key] = next
}

/**
 * /state 用的 CLI 采集：spawn 后等子进程结束，stdout/stderr 各截断 200k。
 * @returns {Promise<{exitCode:number|null, stdout:string, stderr:string, timedOut:boolean, error?:string}>}
 */
function execCliCapture(tool, cliArgs, cwd, timeoutMs = CLI_TIMEOUT_MS) {
  return new Promise((resolvePromise) => {
    const result = { exitCode: null, stdout: '', stderr: '', timedOut: false }
    const truncated = { stdout: false, stderr: false }
    let child
    try {
      child = spawn(process.execPath, [tool, ...cliArgs], {
        cwd,
        windowsHide: true,
        env: process.env,
      })
    } catch (error) {
      result.error = String(error && error.message ? error.message : error)
      resolvePromise(result)
      return
    }
    const timer = setTimeout(() => {
      result.timedOut = true
      try {
        child.kill()
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk) => appendCapped(result, 'stdout', String(chunk), truncated))
    child.stderr?.on('data', (chunk) => appendCapped(result, 'stderr', String(chunk), truncated))
    child.on('error', (error) => {
      clearTimeout(timer)
      result.error = String(error && error.message ? error.message : error)
      resolvePromise(result)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      result.exitCode = typeof code === 'number' ? code : null
      resolvePromise(result)
    })
  })
}

/**
 * run 注册表：管理异步启动的 CLI 子进程、有上限的输出与可序列化记录。
 * child 句柄只存在 `children` Map 里，绝不进入对外 JSON。
 */
class RunRegistry {
  constructor({ timeoutMs = CLI_TIMEOUT_MS, maxRuns = MAX_RUNS } = {}) {
    this.runs = new Map()
    this.children = new Map()
    this.counter = 0
    this.timeoutMs = timeoutMs
    this.maxRuns = maxRuns
  }

  /** 分配一条 run record（内部字段 `_truncated` 不序列化）。 */
  create(action, argv) {
    this.counter += 1
    const record = {
      id: `r${this.counter}`,
      action,
      argv: argv.slice(),
      status: 'running',
      exitCode: null,
      timedOut: false,
      startedAt: nowLocalIso(),
      endedAt: null,
      stdout: '',
      stderr: '',
      json: null,
      _truncated: { stdout: false, stderr: false },
    }
    this.runs.set(record.id, record)
    this.prune()
    return record
  }

  /** 超出上限时淘汰最老的已完成记录（不淘汰 running）。 */
  prune() {
    if (this.runs.size <= this.maxRuns) return
    for (const [id, record] of this.runs) {
      if (this.runs.size <= this.maxRuns) break
      if (record.status !== 'running') this.runs.delete(id)
    }
  }

  /** 对外公开、可 JSON 序列化的 run 视图（绝不含 child 句柄）。 */
  view(idOrRecord) {
    const record = typeof idOrRecord === 'string' ? this.runs.get(idOrRecord) : idOrRecord
    if (!record) return null
    return {
      id: record.id,
      action: record.action,
      argv: record.argv.slice(),
      status: record.status,
      exitCode: record.exitCode,
      timedOut: record.timedOut,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      stdout: record.stdout,
      stderr: record.stderr,
      json: record.json,
    }
  }

  /** 所有 run 记录（最新在前）。 */
  list() {
    return [...this.runs.values()].reverse().map((record) => this.view(record))
  }

  /** 解析 `--json` 动作的 stdout 并写入 record.json。 */
  settleJson(record) {
    if (record.json !== null) return
    if (!record.argv.includes('--json')) return
    record.json = parseJsonOutput(record.stdout)
  }

  /** 异步启动一个白名单 argv；立即返回可序列化的 run 记录。 */
  spawnRun(action, cliArgs, { tool, cwd, timeoutMs = this.timeoutMs }) {
    const record = this.create(action, cliArgs)
    let child
    try {
      child = spawn(process.execPath, [tool, ...cliArgs], {
        cwd,
        windowsHide: true,
        env: process.env,
      })
    } catch (error) {
      record.status = 'failed'
      record.endedAt = nowLocalIso()
      record.stderr = `[spawn error] ${String(error && error.message ? error.message : error)}`
      this.settleJson(record)
      return this.view(record)
    }
    this.children.set(record.id, child)
    const timer = setTimeout(() => {
      record.timedOut = true
      try {
        child.kill()
      } catch {
        /* ignore */
      }
    }, timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk) => appendCapped(record, 'stdout', String(chunk), record._truncated))
    child.stderr?.on('data', (chunk) => appendCapped(record, 'stderr', String(chunk), record._truncated))
    child.on('error', (error) => {
      record.status = 'failed'
      if (!record.endedAt) record.endedAt = nowLocalIso()
      appendCapped(record, 'stderr', `\n[spawn error] ${String(error && error.message ? error.message : error)}\n`, record._truncated)
      this.settleJson(record)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      this.children.delete(record.id)
      record.exitCode = typeof code === 'number' ? code : null
      if (record.status === 'running') {
        record.status = code === 0 && !record.timedOut ? 'succeeded' : 'failed'
      }
      if (!record.endedAt) record.endedAt = nowLocalIso()
      this.settleJson(record)
    })
    return this.view(record)
  }
}

/* ------------------------------------------------------------- 请求处理 */

/**
 * POST /rib-op —— v3.5 分支元操作（回收站/受阻/重命名/锚点）。
 *
 * 这些操作**不走 DAG CLI**——它们不是协议动作（协议没有「删除」「重命名」概念），
 * 而是工作台层的组织操作，只改 control/rdw-rib-meta.json，然后由下一次 /fishbone 合并。
 *
 * body: { project, op, ribId, ... }
 *   op = 'delete'      软删进回收站（{ reason?, cascade? } cascade=true 连带下级）
 *   op = 'restore'     从回收站还原（ribId）
 *   op = 'purge'       从回收站彻底删除（ribId；需 confirm=true）
 *   op = 'empty-bin'   清空回收站（需 confirm=项目 id）
 *   op = 'block'       标记受阻（{ note? }）
 *   op = 'unblock'     解除受阻
 *   op = 'rename'      重命名（{ name }，1..80 字）
 *   op = 'anchor'      v3.6 写入消息锚点（{ origin: { kind:'message', anchor:{...} } }）
 */
async function handleRibOp(req, res) {
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }
  const checked = validateProjectRoot(parsed.project)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const op = typeof parsed.op === 'string' ? parsed.op.trim() : ''
  const ribId = typeof parsed.ribId === 'string' ? parsed.ribId.trim() : ''

  const { data: meta } = readRibMeta(root)
  pruneRecycleBin(meta)
  if (!meta.ribs || typeof meta.ribs !== 'object') meta.ribs = {}
  if (!Array.isArray(meta.recycleBin)) meta.recycleBin = []

  const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data || {}
  const branches = Array.isArray(stateData.branches) ? stateData.branches : []
  const findBranch = (id) => branches.find((b) => b && b.id === id)

  switch (op) {
    case 'delete': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'delete 需要 ribId' })
        return
      }
      const target = findBranch(ribId)
      if (!target) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支不存在：${ribId}` })
        return
      }
      const cascade = parsed.cascade === true
      const ids = [ribId]
      if (cascade) {
        let changed = true
        while (changed) {
          changed = false
          for (const b of branches) {
            if (b && b.parent && ids.includes(b.parent) && !ids.includes(b.id)) {
              ids.push(b.id)
              changed = true
            }
          }
        }
      }
      const reason = typeof parsed.reason === 'string' ? parsed.reason.trim().slice(0, 500) : ''
      const now = new Date().toISOString()
      for (const id of ids) {
        const br = findBranch(id)
        if (!br) continue
        meta.recycleBin.push({
          rib: { id: br.id, module: br.module, name: br.name || br.id, dir: br.dir, parent: br.parent || null },
          meta: meta.ribs[id] || null,
          deletedAt: now,
          reason,
        })
        delete meta.ribs[id]
      }
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, deleted: ids, cascade: ids.length > 1 })
      return
    }
    case 'restore': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'restore 需要 ribId' })
        return
      }
      const idx = meta.recycleBin.findIndex((e) => e && e.rib && e.rib.id === ribId)
      if (idx < 0) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `回收站里没有这个分支：${ribId}` })
        return
      }
      const entry = meta.recycleBin[idx]
      const br = findBranch(ribId)
      if (!br) {
        sendJson(res, 410, { ok: false, code: 'E_GONE', message: `分支 ${ribId} 的目录已不在项目中，无法还原` })
        return
      }
      meta.recycleBin.splice(idx, 1)
      if (entry.meta && typeof entry.meta === 'object') meta.ribs[ribId] = entry.meta
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, restored: ribId })
      return
    }
    case 'purge': {
      if (!ribId || parsed.confirm !== true) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'purge 需要 ribId 且 confirm=true' })
        return
      }
      const before = meta.recycleBin.length
      meta.recycleBin = meta.recycleBin.filter((e) => !(e && e.rib && e.rib.id === ribId))
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, purged: before - meta.recycleBin.length })
      return
    }
    case 'empty-bin': {
      const projectId = (stateData.project && stateData.project.id) || ''
      if (typeof parsed.confirm !== 'string' || parsed.confirm.trim() !== projectId) {
        sendJson(res, 400, {
          ok: false,
          code: 'E_PARAM',
          message: `清空回收站需键入项目 id「${projectId}」确认`,
        })
        return
      }
      const count = meta.recycleBin.length
      meta.recycleBin = []
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, emptied: count })
      return
    }
    case 'block':
    case 'unblock': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `${op} 需要 ribId` })
        return
      }
      if (!findBranch(ribId)) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支不存在：${ribId}` })
        return
      }
      if (op === 'block') {
        const note = typeof parsed.note === 'string' ? parsed.note.trim().slice(0, 500) : ''
        meta.ribs[ribId] = { ...(meta.ribs[ribId] || {}), blocked: { at: new Date().toISOString(), note } }
      } else if (meta.ribs[ribId]) {
        delete meta.ribs[ribId].blocked
        if (Object.keys(meta.ribs[ribId]).length === 0) delete meta.ribs[ribId]
      }
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, op, ribId })
      return
    }
    case 'rename': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'rename 需要 ribId' })
        return
      }
      if (!findBranch(ribId)) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支不存在：${ribId}` })
        return
      }
      const nameCheck = validateNameField(parsed.name, '新名称')
      if (nameCheck.error) {
        sendJson(res, 400, { ok: false, code: nameCheck.code, message: nameCheck.message })
        return
      }
      meta.ribs[ribId] = { ...(meta.ribs[ribId] || {}), customName: nameCheck.name }
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, ribId, name: nameCheck.name })
      return
    }
    /* ------------------------------------------------ v3.18 会话绑定
     *
     * 每个分支/主支/研究目标记住自己关联的宿主会话，点开时恢复对应历史；
     * 没绑过就返回 null，由前端新建会话并注入继承链上下文。
     * key：`branch:<ribId>` / `module:<moduleId>` / `goal`。
     */
    case 'session-get': {
      const key = normalizeSessionKey(parsed.key)
      if (!key) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'session-get 需要 key（branch:<id> / module:<id> / goal）' })
        return
      }
      const sessionId = meta.sessionOf[key] || null
      sendJson(res, 200, { ok: true, key, sessionId })
      return
    }
    case 'session-bind': {
      const key = normalizeSessionKey(parsed.key)
      if (!key) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'session-bind 需要 key' })
        return
      }
      const sessionId =
        typeof parsed.sessionId === 'string' && parsed.sessionId.trim() ? parsed.sessionId.trim() : ''
      if (sessionId) meta.sessionOf[key] = sessionId
      else delete meta.sessionOf[key]
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, key, sessionId: sessionId || null })
      return
    }
    /* ------------------------------------------------ v3.28 已占用会话清单
     *
     * 用于「认领历史对话」：宿主会话本身没有“属于哪个分支”的信息，所以插件在
     * 点开无绑定节点时，先看有没有**尚未分配给任何节点**的旧会话——有就认领它
     * （历史立刻回来），没有才新建。这里返回 sessionOf 中已被占用的 sessionId。
     */
    case 'session-used': {
      const used = Object.keys(meta.sessionOf || {})
        .map((k) => (typeof meta.sessionOf[k] === 'string' ? meta.sessionOf[k] : ''))
        .filter(Boolean)
      sendJson(res, 200, { ok: true, used, count: used.length })
      return
    }
    /* ------------------------------------------------ v3.25 宿主会话能力诊断
     *
     * 宿主客户端 bundle 的方法名被压缩，无法静态确定「新建会话」的正确 API。
     * 前端把运行时探测到的 hostService / Cordis 服务清单 POST 过来，这里落盘到
     * `control/rdw-diag.json`，供实现时按真实名字对接（也便于用户回传）。
     */
    case 'diag-write': {
      const payload = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : null
      if (!payload) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'diag-write 需要 payload' })
        return
      }
      try {
        const diagPath = join(root, 'control', 'rdw-diag.json')
        fs.mkdirSync(dirname(diagPath), { recursive: true })
        fs.writeFileSync(diagPath, `${JSON.stringify({ at: nowLocalIso(), data: payload }, null, 2)}\n`, 'utf8')
        sendJson(res, 200, { ok: true, path: diagPath })
      } catch (error) {
        sendJson(res, 500, { ok: false, code: 'E_DIAG', message: String(error && error.message) })
      }
      return
    }
    case 'anchor': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'anchor 需要 ribId' })
        return
      }
      const origin = parsed.origin && typeof parsed.origin === 'object' ? parsed.origin : null
      if (!origin || typeof origin.kind !== 'string') {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'anchor 需要 origin.kind' })
        return
      }
      meta.ribs[ribId] = { ...(meta.ribs[ribId] || {}), origin }
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, ribId, origin })
      return
    }
    /* ------------------------------------------------ v3.9 排序（主支 / 分支）
     *
     * 排序只写 control/rdw-rib-meta.json 的偏好顺序，不动 PROJECT_STATE.json：
     * DAG 协议里模块/分支没有 order 字段，工作台没有资格为「看起来的顺序」改写协议文件。
     * 上移/下移用 offset（默认 ±1），越界时直接返回当前顺序（幂等，不报错）。
     */
    case 'move': {
      if (!ribId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'move 需要 ribId' })
        return
      }
      const branch = findBranch(ribId)
      if (!branch) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支不存在：${ribId}` })
        return
      }
      const offset = Number.isFinite(Number(parsed.offset)) ? Number(parsed.offset) : -1
      if (![-1, 1].includes(offset) && !parsed.to) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'move 的 offset 只能是 -1 或 1（或给 to）' })
        return
      }
      const moduleId = branch.module
      const currentIds = branches.filter((b) => b && b.module === moduleId).map((b) => b.id)
      let nextOrder
      if (typeof parsed.to === 'string' && parsed.to.trim()) {
        // 拖到指定分支前：把 to 前面的位置做成目标索引
        const targetId = parsed.to.trim()
        if (!currentIds.includes(targetId)) {
          sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `to 不在同一主支下：${targetId}` })
          return
        }
        nextOrder = applyOrder(currentIds, meta.ribOrder[moduleId]).filter((id) => id !== ribId)
        const at = nextOrder.indexOf(targetId)
        nextOrder.splice(at < 0 ? nextOrder.length : at, 0, ribId)
      } else {
        nextOrder = moveInOrder(currentIds, meta.ribOrder[moduleId], ribId, offset)
      }
      meta.ribOrder[moduleId] = nextOrder
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, module: moduleId, order: nextOrder })
      return
    }
    case 'module-move': {
      const moduleId = typeof parsed.moduleId === 'string' ? parsed.moduleId.trim() : ''
      if (!moduleId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'module-move 需要 moduleId' })
        return
      }
      if (!isModuleRegistered(root, moduleId)) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `主支不存在：${moduleId}` })
        return
      }
      const offset = Number.isFinite(Number(parsed.offset)) ? Number(parsed.offset) : -1
      const allModuleIds = (stateData.modules || []).filter((m) => m && m.id).map((m) => m.id)
      const nextOrder = moveInOrder(allModuleIds, meta.moduleOrder, moduleId, offset)
      meta.moduleOrder = nextOrder
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, order: nextOrder })
      return
    }
    case 'module-rename': {
      const moduleId = typeof parsed.moduleId === 'string' ? parsed.moduleId.trim() : ''
      if (!moduleId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'module-rename 需要 moduleId' })
        return
      }
      const target = (stateData.modules || []).find((m) => m && m.id === moduleId)
      if (!target) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `主支不存在：${moduleId}` })
        return
      }
      const nameCheck = validateNameField(parsed.name, '新名称')
      if (nameCheck.error) {
        sendJson(res, 400, { ok: false, code: nameCheck.code, message: nameCheck.message })
        return
      }
      // 与 rename 一致：自定义显示名落在 rib-meta 里，不改协议文件里的模块名。
      meta.moduleNames = { ...(meta.moduleNames || {}), [moduleId]: nameCheck.name }
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, module: moduleId, name: nameCheck.name })
      return
    }
    case 'module-remove': {
      const moduleId = typeof parsed.moduleId === 'string' ? parsed.moduleId.trim() : ''
      if (!moduleId) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'module-remove 需要 moduleId' })
        return
      }
      if (!isModuleRegistered(root, moduleId)) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `主支不存在：${moduleId}` })
        return
      }
      const underModule = branches.filter((b) => b && b.module === moduleId)
      if (underModule.length > 0 && parsed.cascade !== true) {
        sendJson(res, 409, {
          ok: false,
          code: 'E_NOT_EMPTY',
          message: `该主支下还有 ${underModule.length} 个分支，先删除或勾选级联删除`,
          branches: underModule.map((b) => b.id),
        })
        return
      }
      // 模块不在这里物理删除：协议里的模块由 dag CLI 管理（目录/BRIEF 都在磁盘上）。
      // 宿主只隐藏它，并把偏好顺序里对应的位置去掉。
      meta.hiddenModules = Array.isArray(meta.hiddenModules) ? meta.hiddenModules : []
      if (!meta.hiddenModules.includes(moduleId)) meta.hiddenModules.push(moduleId)
      meta.moduleOrder = (meta.moduleOrder || []).filter((id) => id !== moduleId)
      writeRibMetaAtomic(root, meta)
      sendJson(res, 200, { ok: true, module: moduleId, hidden: true, cascaded: parsed.cascade === true })
      return
    }
    default:
      sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `未知 rib-op：${op || '(空)'}` })
  }
}

/**
 * GET  /goal-card?project=...   —— v3.10 读取研究目标的好问题卡 + 八层假设审计。
 * POST /goal-card               —— v3.10 写入好问题卡，并把 500 字摘要回写到 project.goal。
 *
 * 为什么单开一个路由而不是塞进 /run：
 *   「研究目标」是工作台层的**组织操作**（和 rib-op 一样），不是 DAG 协议动作。
 *   卡里的「竞争性解释 / 判别证据 / 推翻条件 / pilot」在协议里没有位置，
 *   所以结构化的部分落 control/rdw-goal-card.json，只有摘要写回 PROJECT_STATE.json。
 *
 * POST body: { project, card?: {...}, layers?: [...], syncGoal?: boolean }
 *   - card 只合并传入的字段，未传的保持不变（便于分步填写）。
 *   - syncGoal !== false 时，把 composeGoalFromCard() 的结果写进 project.goal。
 */
async function handleGoalCard(req, res, url, method) {
  if (method === 'GET') {
    const checked = validateProjectRoot(url.searchParams.get('project'))
    if (checked.error) {
      sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
      return
    }
    const root = checked.root
    const { data } = readGoalCard(root)
    const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data || {}
    const projectGoal = (stateData.project && stateData.project.goal) || null
    sendJson(res, 200, {
      ok: true,
      card: data.card,
      layers: data.layers,
      updatedAt: data.updatedAt,
      goal: projectGoal,
      fields: GOAL_CARD_FIELDS,
      layerSpec: THINKING_LAYERS,
      // 一致性自检：哪些必填字段还空着 → 前端据此显示「还差几项才能算好问题」
      missing: GOAL_CARD_FIELDS.filter((field) => {
        const value = data.card[field]
        return typeof value !== 'string' || value.trim().length === 0
      }),
      // 可证伪性判定：没有 falsifier 的卡不是好问题
      falsifiable: typeof data.card.falsifier === 'string' && data.card.falsifier.trim().length > 0,
    })
    return
  }

  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }
  const checked = validateProjectRoot(parsed.project)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const { data } = readGoalCard(root)

  if (parsed.card && typeof parsed.card === 'object' && !Array.isArray(parsed.card)) {
    for (const [key, value] of Object.entries(parsed.card)) {
      if (!GOAL_CARD_FIELDS.includes(key)) continue
      if (value === null) {
        delete data.card[key]
        continue
      }
      if (typeof value !== 'string') {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `${key} 必须是字符串` })
        return
      }
      const trimmed = value.trim()
      if (trimmed.length === 0) delete data.card[key]
      else if (charLength(trimmed) > MAX_TEXT_FIELD_CHARS) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `${key} 超过 ${MAX_TEXT_FIELD_CHARS} 字符` })
        return
      } else data.card[key] = trimmed
    }
  }

  if (Array.isArray(parsed.layers)) {
    data.layers = parsed.layers
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: String(entry.id || '').slice(0, 8),
        assumption: String(entry.assumption || '').slice(0, MAX_TEXT_FIELD_CHARS),
        flip: String(entry.flip || '').slice(0, MAX_TEXT_FIELD_CHARS),
      }))
      .filter((entry) => THINKING_LAYERS.some((layer) => layer.id === entry.id))
  }

  data.updatedAt = new Date().toISOString()
  writeGoalCardAtomic(root, data)

  // 把摘要回写进协议（project.goal）。失败不致命：卡已经落盘了。
  let goalSynced = false
  let goalValue = null
  if (parsed.syncGoal !== false) {
    const composed = composeGoalFromCard(data.card, null)
    if (composed) {
      try {
        const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data
        if (stateData && stateData.project && typeof stateData.project === 'object') {
          stateData.project.goal = composed
          const statePath = join(root, 'control', 'PROJECT_STATE.json')
          fs.writeFileSync(statePath, `${JSON.stringify(stateData, null, 2)}\n`, 'utf8')
          goalSynced = true
          goalValue = composed
        }
      } catch {
        goalSynced = false
      }
    }
  }

  sendJson(res, 200, {
    ok: true,
    card: data.card,
    layers: data.layers,
    updatedAt: data.updatedAt,
    goalSynced,
    goal: goalValue,
    falsifiable: typeof data.card.falsifier === 'string' && data.card.falsifier.trim().length > 0,
    missing: GOAL_CARD_FIELDS.filter((field) => {
      const value = data.card[field]
      return typeof value !== 'string' || value.trim().length === 0
    }),
  })
}

/**
 * GET /zotero[?project=...&rib=...&q=...&collection=...]：Zotero 文献面板一次取全。
 *
 * 返回 { ok, available, error, base, items, missing, search, collections, linked }
 * - linked：该分支已挂的文献（按 itemKeys 顺序，缺条目进 missing）
 * - search：关键词命中（q 非空时才有意义）
 * - collections：合集树（扁平带 depth），供「从合集导入」用
 *
 * Zotero 没开机不算错误：available=false + 中文原因，面板据此显示「未连接」，
 * 但已挂的 key 仍然回传，前端能原样列出（只是没有标题摘要）。
 */
async function handleZotero(req, res, url) {
  const saved = readConfig()
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  const checked = validateProjectRoot(candidate)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const ribId = String(url.searchParams.get('rib') || '').trim()
  const query = String(url.searchParams.get('q') || '').trim()
  const collectionKey = String(url.searchParams.get('collection') || '').trim()

  const { data: meta } = readRibMeta(root)
  const linked = ribId ? readRibZotero(meta, ribId) : { itemKeys: [], collectionKey: null }

  const probe = await zoteroProbe()
  const payload = {
    ok: true,
    base: probe.base,
    available: probe.available,
    error: probe.error,
    ribId: ribId || null,
    linked: linked.itemKeys.slice(),
    linkedCollection: linked.collectionKey,
    items: [],
    missing: [],
    search: null,
    collections: null,
  }
  if (!probe.available) {
    // 未连接：仍然回传挂载关系，前端不至于「假装干净」。
    payload.missing = linked.itemKeys.slice()
    sendJson(res, 200, payload)
    return
  }

  const [itemsResult, treeResult, searchResult, collectionItems] = await Promise.all([
    linked.itemKeys.length > 0 ? zoteroItemsByKeys(linked.itemKeys) : Promise.resolve({ ok: true, items: [], missing: [] }),
    zoteroCollectionTree(),
    query ? zoteroSearch(query, 20) : Promise.resolve(null),
    collectionKey ? zoteroCollectionItems(collectionKey, 100) : Promise.resolve(null),
  ])

  payload.items = itemsResult.items
  payload.missing = itemsResult.missing
  if (!itemsResult.ok) payload.error = itemsResult.error
  if (treeResult.ok) payload.collections = treeResult.flat
  else payload.collectionsError = treeResult.error
  if (searchResult) payload.search = { query, items: searchResult.items, total: searchResult.total, error: searchResult.error }
  if (collectionItems) {
    payload.collectionPreview = {
      key: collectionKey,
      items: collectionItems.items,
      total: collectionItems.total,
      error: collectionItems.error,
    }
  }
  sendJson(res, 200, payload)
}

/**
 * POST /zotero-op：分支上的 Zotero 挂载动作（只改 control/rdw-rib-meta.json）。
 *
 * body: { project, ribId, op, ... }
 *   - attach            : keys: string[]      追加挂载（去重，最多 200 条）
 *   - detach            : keys: string[]      解挂
 *   - clear             : （无参数）           清空该分支全部挂载
 *   - import-collection : collectionKey        整库挂载一个合集条目（上限 100 条）
 *   - open              : kind: 'item'|'collection', key   → 在 Zotero 里定位（zotero://）
 *
 * 返回 { ok, ribId, itemKeys, collectionKey, added?, removed?, uri? }
 */
async function handleZoteroOp(req, res) {
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }
  const checked = validateProjectRoot(parsed.project)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const op = String(parsed.op || '').trim()
  const ribId = String(parsed.ribId || '').trim()

  // open 可以在没有 ribId 的情况下工作（例如从搜索结果里直接定位一条）
  if (op === 'open') {
    const key = String(parsed.key || '').trim()
    const kind = parsed.kind === 'collection' ? 'collection' : 'item'
    if (!ZOTERO_KEY_RE.test(key)) {
      sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'open 需要合法的 key（8 位 Zotero key）' })
      return
    }
    const opened = openZoteroTarget({ kind, key })
    sendJson(res, opened.ok ? 200 : 500, {
      ok: opened.ok,
      ...(opened.ok ? { uri: opened.uri } : { code: 'E_OPEN', message: `定位失败：${opened.error}` }),
    })
    return
  }

  if (!ribId) {
    sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `${op || 'zotero-op'} 需要 ribId` })
    return
  }
  const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data || {}
  const branches = Array.isArray(stateData.branches) ? stateData.branches : []
  if (!branches.some((branch) => branch && branch.id === ribId)) {
    sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支不存在：${ribId}` })
    return
  }

  const { data: meta } = readRibMeta(root)
  pruneRecycleBin(meta)
  const current = readRibZotero(meta, ribId)

  switch (op) {
    case 'attach': {
      const incoming = Array.isArray(parsed.keys) ? parsed.keys.map((key) => String(key).trim()) : []
      const valid = incoming.filter((key) => ZOTERO_KEY_RE.test(key))
      if (valid.length === 0) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'attach 需要 keys（8 位 Zotero key 数组）' })
        return
      }
      const before = current.itemKeys.length
      const next = Array.from(new Set([...current.itemKeys, ...valid])).slice(0, ZOTERO_MAX_ITEMS)
      writeRibZotero(root, meta, ribId, { itemKeys: next, collectionKey: current.collectionKey })
      sendJson(res, 200, {
        ok: true,
        ribId,
        itemKeys: next,
        collectionKey: current.collectionKey,
        added: next.length - before,
        skipped: valid.length - (next.length - before),
      })
      return
    }
    case 'detach': {
      const incoming = Array.isArray(parsed.keys) ? parsed.keys.map((key) => String(key).trim()) : []
      const drop = new Set(incoming.filter((key) => ZOTERO_KEY_RE.test(key)))
      const next = current.itemKeys.filter((key) => !drop.has(key))
      writeRibZotero(root, meta, ribId, { itemKeys: next, collectionKey: current.collectionKey })
      sendJson(res, 200, { ok: true, ribId, itemKeys: next, collectionKey: current.collectionKey, removed: current.itemKeys.length - next.length })
      return
    }
    case 'clear': {
      writeRibZotero(root, meta, ribId, { itemKeys: [], collectionKey: null })
      sendJson(res, 200, { ok: true, ribId, itemKeys: [], collectionKey: null, cleared: current.itemKeys.length })
      return
    }
    case 'import-collection': {
      const collectionKey = String(parsed.collectionKey || '').trim()
      if (!ZOTERO_KEY_RE.test(collectionKey)) {
        sendJson(res, 400, { ok: false, code: 'E_PARAM', message: 'import-collection 需要合法的 collectionKey' })
        return
      }
      const probe = await zoteroProbe()
      if (!probe.available) {
        sendJson(res, 503, { ok: false, code: 'E_ZOTERO', message: `Zotero 不可用：${probe.error}` })
        return
      }
      const collected = await zoteroCollectionItemKeys(collectionKey, ZOTERO_MAX_ITEMS)
      if (collected.error) {
        sendJson(res, 502, { ok: false, code: 'E_ZOTERO', message: `读取合集失败：${collected.error}` })
        return
      }
      const incoming = collected.keys.filter((key) => ZOTERO_KEY_RE.test(key))
      if (incoming.length === 0) {
        sendJson(res, 200, {
          ok: true,
          ribId,
          itemKeys: current.itemKeys,
          collectionKey: collectionKey,
          added: 0,
          message: '该合集里没有可挂的文献（顶层条目为空）',
        })
        return
      }
      const before = current.itemKeys.length
      const next = Array.from(new Set([...current.itemKeys, ...incoming])).slice(0, ZOTERO_MAX_ITEMS)
      writeRibZotero(root, meta, ribId, { itemKeys: next, collectionKey })
      sendJson(res, 200, {
        ok: true,
        ribId,
        itemKeys: next,
        collectionKey,
        added: next.length - before,
        collectionTotal: collected.total,
        truncated: collected.truncated,
      })
      return
    }
    default:
      sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `未知 zotero-op：${op || '(空)'}` })
  }
}

function handleHealth(res) {
  const payload = {
    ok: true,
    name,
    version: VERSION,
    route: ROUTE_PREFIX,
    actions: HEALTH_ACTIONS.slice(),
    bridgeActions: BRIDGE_ACTIONS.slice(),
    networkAvailable: isExistingFile(BRIDGE_PATH),
    kitRoot: KIT_ROOT,
    configPath: configPath(),
    // v3.8：声明本宿主支持 Zotero 文献面板（真实可用性由 GET /zotero 探活，
    // health 保持同步、不为外部依赖付超时代价）。
    capabilities: { zotero: true, spine: true, spineOps: Object.keys(SPINE_OPS) },
  }
  if (isExistingDir(EXAMPLE_PROJECT)) payload.example = EXAMPLE_PROJECT
  sendJson(res, 200, payload)
}

/**
 * GET /state：合并 status --json、verify --json 与 control/PROJECT_STATE.json。
 * 两条 CLI 串行同步执行（等子进程结束），避免并发竞态。
 */
async function handleState(req, res, url) {
  const saved = readConfig()
  const configured = Boolean(
    saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0,
  )
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : configured
        ? saved.data.projectRoot
        : null

  const base = {
    ok: true,
    configured,
    config: saved.data && typeof saved.data === 'object' && !Array.isArray(saved.data) ? saved.data : null,
  }

  if (!candidate) {
    sendJson(res, 200, { ...base, project: null })
    return
  }
  if (typeof candidate !== 'string' || !isAbsolute(candidate)) {
    sendJson(res, 200, { ...base, project: { root: String(candidate), exists: false, isDag: false } })
    return
  }
  const root = resolve(candidate)
  if (!isExistingDir(root)) {
    sendJson(res, 200, { ...base, project: { root, exists: false, isDag: false } })
    return
  }
  if (!isDagProject(root)) {
    sendJson(res, 200, { ...base, project: { root, exists: true, isDag: false } })
    return
  }

  const tool = resolveTool(root)
  const statusResult = await execCliCapture(tool, ['status', '--json', '--root', root], root)
  const verifyResult = await execCliCapture(tool, ['verify', '--json', '--root', root], root)
  const statusJson = parseJsonOutput(statusResult.stdout)
  const verifyJson = parseJsonOutput(verifyResult.stdout)
  const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data
  const handoffs = scanHandoffs(root, stateData)
  const fallback = buildFallbackProject(root, handoffs, stateData)

  const cliErrors = []
  if (statusResult.exitCode !== 0 || !statusJson) {
    cliErrors.push(`status: ${summarizeCliFailure(statusResult)}`)
  }
  if (verifyResult.exitCode !== 0 || !verifyJson) {
    cliErrors.push(`verify: ${summarizeCliFailure(verifyResult)}`)
  }

  let project
  if (statusJson && typeof statusJson === 'object') {
    const stateProject = stateData && stateData.project ? stateData.project : {}
    const statusProject = statusJson.project && typeof statusJson.project === 'object' ? statusJson.project : {}
    project = {
      root,
      exists: true,
      isDag: true,
      id: stateProject.id ?? statusProject.id ?? null,
      title: stateProject.title ?? statusProject.title ?? null,
      goal: stateProject.goal ?? null,
      phase: statusJson.phase ?? fallback.phase,
      next_steps: Array.isArray(statusJson.next_steps) ? statusJson.next_steps : fallback.next_steps,
      blockers: Array.isArray(statusJson.blockers) ? statusJson.blockers : fallback.blockers,
      modules: normalizeModules(statusJson.modules, stateData, handoffs),
      branches: normalizeBranches(stateData),
      handoffs,
      pending_decisions: normalizePendingDecisions(statusJson.pending_decisions),
      accepted: normalizeAccepted(statusJson.accepted, handoffs),
      counts: countsFromHandoffs(handoffs),
    }
  } else {
    project = fallback
    if (!project.pending_decisions || project.pending_decisions.length === 0) {
      project.pending_decisions = fallback.pending_decisions
    }
  }

  const verify =
    verifyJson && typeof verifyJson === 'object'
      ? verifyJson
      : {
          ok: false,
          checked: { handoffs: handoffs.length, modules: 0, branches: 0, files: 0 },
          issues: [
            {
              code: 'E_INTERNAL',
              path: root,
              message: 'verify --json 输出无法解析（CLI 未产出 JSON）',
            },
          ],
        }

  const payload = { ...base, project, verify, statusRaw: statusJson ?? null }
  if (cliErrors.length > 0) payload.cliError = cliErrors.join('\n').slice(0, 2000)
  sendJson(res, 200, payload)
}

/** GET /handoff：读取单个交接文件全文。 */
async function handleHandoff(req, res, url) {
  const saved = readConfig()
  const projectParam = url.searchParams.get('project')
  const candidate =
    typeof projectParam === 'string' && projectParam.length > 0
      ? projectParam
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  if (!candidate) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '缺少 project（且未配置项目）' })
    return
  }
  if (!isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  if (!isDagProject(project)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '不是研究项目（缺少 control/ledger.json）' })
    return
  }
  const checked = validateHandoffPath(project, url.searchParams.get('path') ?? '', { requireExists: true })
  if (checked.error) {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: checked.message })
    return
  }
  let content
  try {
    content = fs.readFileSync(checked.abs, 'utf8')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: `handoff 文件读取失败：${checked.rel}` })
    return
  }
  const parsed = parseFrontmatterLoose(content)
  sendJson(res, 200, {
    ok: true,
    path: checked.rel,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    content,
    size: Buffer.byteLength(content, 'utf8'),
  })
}

/**
 * GET /file?project=<abs>&path=<rel>：读取项目内任意文件的内容，供工作台预览。
 */
async function handleFile(req, res, url) {
  const saved = readConfig()
  const projectParam = url.searchParams.get('project')
  const candidate =
    typeof projectParam === 'string' && projectParam.length > 0
      ? projectParam
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  const relPath = url.searchParams.get('path') || ''
  if (!relPath || typeof relPath !== 'string') {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: '缺少 path 参数' })
    return
  }
  const normalized = relPath.replace(/\\/g, '/').trim()
  if (normalized.includes('..') || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: 'path 禁止包含 ..、绝对路径或盘符' })
    return
  }
  const absPath = resolve(project, ...normalized.split('/'))
  const checkRel = relative(project, absPath)
  if (checkRel.startsWith('..') || isAbsolute(checkRel)) {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: 'path 逃逸到项目根之外' })
    return
  }
  if (!isExistingFile(absPath)) {
    sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `文件不存在：${normalized}` })
    return
  }
  let stats
  try {
    stats = fs.statSync(absPath)
  } catch (err) {
    sendJson(res, 500, { ok: false, code: 'E_IO', message: `读取文件元数据失败：${err.message}` })
    return
  }
  if (stats.size > 2_000_000) {
    sendJson(res, 400, { ok: false, code: 'E_TOO_LARGE', message: '文件超过 2MB，建议在外部编辑器查看' })
    return
  }
  const ext = extname(absPath).toLowerCase()
  let isBinary = false
  let content = ''
  try {
    const buf = fs.readFileSync(absPath)
    for (let i = 0; i < Math.min(buf.length, 512); i++) {
      if (buf[i] === 0) {
        isBinary = true
        break
      }
    }
    if (!isBinary) {
      content = buf.toString('utf8')
    }
  } catch (err) {
    sendJson(res, 500, { ok: false, code: 'E_IO', message: `读取文件内容失败：${err.message}` })
    return
  }
  sendJson(res, 200, {
    ok: true,
    path: normalized,
    ext,
    size: stats.size,
    mtime: stats.mtime.toISOString(),
    isBinary,
    content: isBinary ? null : content,
    lines: isBinary ? 0 : content.split('\n').length,
  })
}

/**
 * GET /branch-work?project=<abs>&module=<moduleId>&branch=<branchId>：获取分支智能体的工作区详情。
 */
/** 解析 DIRECTIVES.md 为对话条目（按「### 时间 · 角色（来自 xx）」分块）。 */
function parseDirectivesEntries(text) {
  const out = []
  if (!text) return out
  const blocks = String(text).split(/^### /m).slice(1)
  for (const block of blocks) {
    const lines = block.split('\n')
    const heading = (lines[0] || '').trim()
    const m = heading.match(/^([0-9T:.\-Z+]+)\s*·\s*(.*)$/)
    const at = m ? m[1] : ''
    const rest = m ? m[2] : heading
    const authorMatch = rest.match(/（来自\s*([^）]+)\s*）/)
    const author = authorMatch ? authorMatch[1].trim() : rest.trim()
    const body = lines
      .slice(1)
      .join('\n')
      .trim()
    const isAgent = /智能|agent|builder|critic|explorer|assistant/i.test(author)
    out.push({ at, author, side: isAgent ? 'agent' : 'human', text: body })
  }
  return out
}

/** 解析 SESSION.md 为工作记录小节。 */
function parseSessionSections(text) {
  if (!text) return []
  const out = []
  const blocks = String(text).split(/^## /m).slice(1)
  for (const block of blocks) {
    const lines = block.split('\n')
    const title = (lines[0] || '').trim()
    const body = lines
      .slice(1)
      .join('\n')
      .trim()
    if (title || body) out.push({ title, text: body })
  }
  if (out.length === 0 && String(text).trim()) out.push({ title: '', text: String(text).trim() })
  return out
}

async function handleBranchWork(req, res, url) {
  const saved = readConfig()
  const projectParam = url.searchParams.get('project')
  const candidate =
    typeof projectParam === 'string' && projectParam.length > 0
      ? projectParam
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  const moduleId = url.searchParams.get('module') || ''
  const branchId = url.searchParams.get('branch') || ''
  if (!moduleId || !branchId) {
    sendJson(res, 400, { ok: false, code: 'E_PARAM', message: '缺少 module 或 branch 参数' })
    return
  }
  const state = readProjectStateData(project) || {}
  const mod = (state.modules || []).find((m) => m && m.id === moduleId)
  const br = (state.branches || []).find((b) => b && b.id === branchId)
  // state 里的 dir 已是「项目根内相对路径」（如 modules/M40-statistics），
  // 只有缺省时才回退成裸 id，绝不能再次拼上 'modules'。
  const modDir = (mod && mod.dir) || `modules/${moduleId}`
  const brDir = (br && br.dir) || `${modDir}/branches/${branchId}`
  const branchPath = resolve(project, ...String(brDir).split('/'))

  if (!isExistingDir(branchPath)) {
    sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `分支目录不存在：${brDir}` })
    return
  }

  let brief = ''
  const briefFile = join(branchPath, 'BRIEF.md')
  if (isExistingFile(briefFile)) {
    try {
      brief = fs.readFileSync(briefFile, 'utf8')
    } catch {
      /* ignore */
    }
  }

  let sessionNotes = ''
  for (const name of ['SESSION.md', 'LOG.md', 'agent_notes.md', 'revision_plan_notes.md']) {
    const p = join(branchPath, 'work', name)
    if (isExistingFile(p)) {
      try {
        sessionNotes = fs.readFileSync(p, 'utf8')
        break
      } catch {
        /* ignore */
      }
    }
  }

  let directives = ''
  const dirFile = join(branchPath, 'work', 'DIRECTIVES.md')
  if (isExistingFile(dirFile)) {
    try {
      directives = fs.readFileSync(dirFile, 'utf8')
    } catch {
      /* ignore */
    }
  }

  const workDir = join(branchPath, 'work')
  const workFiles = []
  if (isExistingDir(workDir)) {
    try {
      for (const item of fs.readdirSync(workDir)) {
        const itemPath = join(workDir, item)
        if (isExistingFile(itemPath)) {
          const s = fs.statSync(itemPath)
          workFiles.push({
            name: item,
            rel: `modules/${modDir}/branches/${brDir}/work/${item}`,
            size: s.size,
            mtime: s.mtime.toISOString(),
            ext: extname(item).toLowerCase(),
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  const outputsDir = join(branchPath, 'outputs')
  const outputFiles = []
  if (isExistingDir(outputsDir)) {
    try {
      for (const item of fs.readdirSync(outputsDir)) {
        const itemPath = join(outputsDir, item)
        if (isExistingFile(itemPath)) {
          const s = fs.statSync(itemPath)
          outputFiles.push({
            name: item,
            rel: `modules/${modDir}/branches/${brDir}/outputs/${item}`,
            size: s.size,
            mtime: s.mtime.toISOString(),
            ext: extname(item).toLowerCase(),
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  // v2.7：上下文档案 + 结构化对话
  let context = ''
  const contextFile = join(branchPath, 'CONTEXT.md')
  if (isExistingFile(contextFile)) {
    try {
      context = fs.readFileSync(contextFile, 'utf8')
    } catch {
      context = ''
    }
  }

  // v3.2：分支溯源与同伴通讯
  const stateBranches = state && Array.isArray(state.branches) ? state.branches : [];
  const parentRib = br && br.parent ? br.parent : '';
  const siblings = stateBranches
    .filter((b) => b && b.module === moduleId && b.id !== branchId)
    .map((b) => ({
      id: b.id,
      name: b.name || b.id,
      dir: b.dir,
      isParent: Boolean(parentRib) && b.id === parentRib,
    }));

  // 收件箱（其他分支投递的消息）
  let inbox = { messages: 0, content: '' };
  const inboxPath = join(brDir, 'work', 'INBOX.md');
  if (isExistingFile(inboxPath)) {
    try {
      const text = fs.readFileSync(inboxPath, 'utf8');
      inbox = {
        messages: (text.match(/^## /gm) || []).length,
        content: text.slice(0, 20000),
      };
    } catch {
      inbox = { messages: 0, content: '' };
    }
  }

  sendJson(res, 200, {
    ok: true,
    module: { id: moduleId, name: (mod && mod.name) || moduleId, dir: modDir },
    branch: {
      id: branchId,
      name: (br && br.name) || branchId,
      dir: brDir,
      mode: (br && br.mode) || 'standard',
      parent: parentRib || null,
    },
    parent: parentRib || null,
    siblings,
    inbox,
    brief,
    context,
    sessionNotes,
    directives,
    directivesParsed: parseDirectivesEntries(directives),
    sessionParsed: parseSessionSections(sessionNotes),
    workFiles,
    outputFiles,
  })
}

/**
 * POST /branch-directive：向分支智能体下达指令/提问。
 */
async function handleBranchDirective(req, res) {
  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch (err) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是合法 JSON' })
    return
  }
  const saved = readConfig()
  const candidate = typeof body.project === 'string' && body.project.length > 0
    ? body.project
    : saved.data && typeof saved.data.projectRoot === 'string'
      ? saved.data.projectRoot
      : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  const moduleId = typeof body.module === 'string' ? body.module.trim() : ''
  const branchId = typeof body.branch === 'string' ? body.branch.trim() : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const by = typeof body.by === 'string' && body.by.trim().length > 0 ? body.by.trim() : 'human'
  if (!moduleId || !branchId || !text) {
    sendJson(res, 400, { ok: false, code: 'E_PARAM', message: '缺少 module / branch / text' })
    return
  }
  const state = readProjectStateData(project) || {}
  const mod = (state.modules || []).find((m) => m && m.id === moduleId)
  const br = (state.branches || []).find((b) => b && b.id === branchId)
  // 与 handleBranchWork 一致：state.dir 已是项目内相对路径，不再重复拼 'modules'。
  const modDir = (mod && mod.dir) || `modules/${moduleId}`
  const brDir = (br && br.dir) || `${modDir}/branches/${branchId}`
  const workDir = resolve(project, ...String(brDir).split('/'), 'work')
  if (!isExistingDir(workDir)) {
    try {
      fs.mkdirSync(workDir, { recursive: true })
    } catch (err) {
      sendJson(res, 500, { ok: false, code: 'E_IO', message: `创建 work 目录失败：${err.message}` })
      return
    }
  }
  const dirFile = join(workDir, 'DIRECTIVES.md')
  const timestamp = new Date().toISOString()
  const entry = `\n### ${timestamp} · 指令（来自 ${by}）\n${text}\n`
  try {
    fs.appendFileSync(dirFile, entry, 'utf8')
  } catch (err) {
    sendJson(res, 500, { ok: false, code: 'E_IO', message: `写入指令失败：${err.message}` })
    return
  }
  sendJson(res, 200, { ok: true, timestamp, message: '指令已送达智能体工作区 DIRECTIVES.md' })
}

/**
 * POST /mount-context：将分支的上下文档案（CONTEXT.md、任务意图等）挂载并同步到工作区，
 * 并生成可直接喂给大模型会话的结构化提示词（promptDraft）与摘要（summary）。
 */
async function handleMountContext(req, res) {
  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是合法 JSON' })
    return
  }
  const saved = readConfig()
  const candidate = typeof body.project === 'string' && body.project.length > 0
    ? body.project
    : saved.data && typeof saved.data.projectRoot === 'string'
      ? saved.data.projectRoot
      : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  const moduleId = typeof body.module === 'string' ? body.module.trim() : ''
  const branchId = typeof body.branch === 'string' ? body.branch.trim() : ''
  if (!moduleId || !branchId) {
    sendJson(res, 400, { ok: false, code: 'E_PARAM', message: '缺少 module 或 branch 参数' })
    return
  }

  const state = readProjectStateData(project) || {}
  const mod = (state.modules || []).find((m) => m && m.id === moduleId)
  const br = (state.branches || []).find((b) => b && b.id === branchId)
  const modDir = (mod && mod.dir) || `modules/${moduleId}`
  const brDir = (br && br.dir) || `${modDir}/branches/${branchId}`
  const branchPath = resolve(project, ...String(brDir).split('/'))

  let contextText = ''
  const contextFile = join(branchPath, 'CONTEXT.md')
  if (isExistingFile(contextFile)) {
    try { contextText = fs.readFileSync(contextFile, 'utf8') } catch {}
  }

  let briefText = ''
  const briefFile = join(branchPath, 'BRIEF.md')
  if (isExistingFile(briefFile)) {
    try { briefText = fs.readFileSync(briefFile, 'utf8') } catch {}
  }

  const modName = (mod && mod.name) || moduleId
  const brName = (br && br.name) || branchId
  // 修真实 bug：PROJECT_STATE.json 的 `project` 是对象 {id,title,goal,...}，
  // 直接拼进模板会变成字面量「[object Object]」（用户截图里就能看到）。
  const projectTitle =
    (typeof state.title === 'string' && state.title.trim()) ||
    (state.project && typeof state.project === 'object'
      ? String(state.project.title || state.project.id || '').trim()
      : '') ||
    (typeof state.project === 'string' ? state.project.trim() : '') ||
    '科研项目'

  // 生成大模型会话挂载提示词
  //
  // v3.20：不再只写「本主支」+ 一行笼统的「上下文档案」。
  // 统一用 renderInheritanceChain 展开：① 全部前序主支（含成稿路径/状态）
  // → ② 本主支 → ③ 祖先分支链（根→直接父）→ ④ 本分支任务。
  const inheritance = renderInheritanceChain(project, moduleId, branchId, brName)
  const promptDraft = [
    `【科研分支上下文已挂载】`,
    `项目：${projectTitle}`,
    `当前阶段主支：${modName} [${moduleId}]`,
    `当前探索分支：${brName} [${branchId}]`,
    ``,
    ...inheritance.lines,
    briefText ? `\n任务目标简报：\n${briefText.slice(0, 300)}` : '',
    contextText ? `\n--- 上下文档案核心快照 (CONTEXT.md) ---\n${contextText.slice(0, 1500)}...` : '',
    `\n请依据上述已挂载的研究上下文与输入产物，开始推进该分支的分析任务。`,
  ].filter(Boolean).join('\n')

  const summary = {
    project: projectTitle,
    module: { id: moduleId, name: modName },
    branch: { id: branchId, name: brName },
    hasContextFile: Boolean(contextText),
    contextBytes: contextText.length,
    contextRel: `${brDir}/CONTEXT.md`,
    brief: briefText.slice(0, 200),
  }

  // 同步 ACTIVE_CONTEXT.md 到项目根与工作区
  const syncedFiles = []
  try {
    const activeContextPath = join(project, 'ACTIVE_CONTEXT.md')
    const fullActiveContent = [
      `# 当前激活分支：${brName} [${branchId}]`,
      ``,
      `所属主支：${modName} [${moduleId}]`,
      `项目：${projectTitle}`,
      ``,
      `## 继承顺序（唯一来源，逐级向下）`,
      '',
      ...inheritance.lines,
      '',
      briefText ? `## BRIEF\n${briefText}` : '',
      `## CONTEXT`,
      '',
      contextText || '暂无单独 CONTEXT.md 快照',
    ]
      .filter(Boolean)
      .join('\n')
    fs.writeFileSync(activeContextPath, fullActiveContent, 'utf8')
    syncedFiles.push(activeContextPath)

    // 如果指定了额外的 workspace 目录或环境变量工作区，也同步写入一份
    const targetWs = typeof body.workspace === 'string' && isAbsolute(body.workspace) && isExistingDir(body.workspace) ? resolve(body.workspace) : null
    if (targetWs && targetWs !== project) {
      const wsActiveContext = join(targetWs, 'ACTIVE_CONTEXT.md')
      const wsContext = join(targetWs, 'CONTEXT.md')
      fs.writeFileSync(wsActiveContext, fullActiveContent, 'utf8')
      fs.writeFileSync(wsContext, contextText || fullActiveContent, 'utf8')
      syncedFiles.push(wsActiveContext, wsContext)
    }
  } catch {}

  sendJson(res, 200, {
    ok: true,
    summary,
    promptDraft,
    contextText,
    syncedFiles,
    message: `已成功挂载分支 [${branchId} · ${brName}] 的上下文`,
  })
}

/**
 * POST /open-external：在系统文件资源管理器中定位文件。
 */
async function handleOpenExternal(req, res) {
  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是合法 JSON' })
    return
  }
  const saved = readConfig()
  const candidate = typeof body.project === 'string' && body.project.length > 0
    ? body.project
    : saved.data && typeof saved.data.projectRoot === 'string'
      ? saved.data.projectRoot
      : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  const rel = typeof body.path === 'string' ? body.path.replace(/\\/g, '/').trim() : ''
  if (!rel || rel.includes('..') || rel.startsWith('/')) {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: 'path 非法' })
    return
  }
  const absPath = resolve(project, ...rel.split('/'))
  if (!isExistingFile(absPath) && !isExistingDir(absPath)) {
    sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `路径不存在：${rel}` })
    return
  }
  try {
    if (process.platform === 'win32') {
      spawn('explorer.exe', ['/select,', absPath], { detached: true, stdio: 'ignore' })
    }
    sendJson(res, 200, { ok: true, path: rel })
  } catch (err) {
    sendJson(res, 500, { ok: false, code: 'E_IO', message: `打开失败：${err.message}` })
  }
}

/**
 * POST /open-sidebar：把项目内的文件/目录在 DSH 侧边栏里打开（而不是挤在面板小弹窗里）。
 *
 * 背景：DSH 的 `sidebar_open` 是「面向模型」的工具，要求发起方是 agent，
 * Web 面板调不到。dsh-better-sidebar 另有 `/sidebar/ws/agent-opens` 推送通道，
 * 但它按「会话 id」投递。面板拿不到会话 id，所以这里：
 *   1) 若宿主注入了 `ctx.agentOpen`（可选能力），直接转发；
 *   2) 否则返回 501，并把**已解析好的绝对路径**告诉前端 —— 用户点一下
 *      「在 DSH 里告诉我打开这个文件」即可由模型调用 sidebar_open 打开，
 *      避免面板假装成功、实际什么都没发生。
 *
 * 请求：{ project?, path, sessionId?, kind?: 'file'|'folder' }
 */
async function handleOpenSidebar(req, res, registry) {
  let body
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是合法 JSON' })
    return
  }

  const saved = readConfig()
  const candidate =
    typeof body.project === 'string' && body.project.length > 0
      ? body.project
      : saved.data && typeof saved.data.projectRoot === 'string'
        ? saved.data.projectRoot
        : ''
  if (!candidate || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }

  const project = resolve(candidate)
  const rel = typeof body.path === 'string' ? body.path.replace(/\\/g, '/').trim() : ''
  if (!rel || rel.includes('..') || rel.startsWith('/')) {
    sendJson(res, 400, { ok: false, code: 'E_PATH', message: 'path 非法' })
    return
  }
  const absPath = resolve(project, ...rel.split('/'))
  if (!isExistingFile(absPath) && !isExistingDir(absPath)) {
    sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `路径不存在：${rel}` })
    return
  }

  const kind = body.kind === 'folder' || isExistingDir(absPath) ? 'folder' : 'file'
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''

  // 能力 1：宿主注入了 agentOpen（实验性/未来版本）
  if (registry && typeof registry.agentOpen === 'function') {
    try {
      const result = await registry.agentOpen({ target: absPath, kind, sessionId })
      sendJson(res, 200, { ok: true, delivered: true, path: absPath, kind })
      return
    } catch (error) {
      sendJson(res, 502, {
        ok: false,
        code: 'E_SIDEBAR',
        message: String(error && error.message ? error.message : error),
        path: absPath,
      })
      return
    }
  }

  // 能力 2：当前宿主不支持面板直开 —— 如实回报，并给出绝对路径供模型侧 sidebar_open 使用
  sendJson(res, 501, {
    ok: false,
    code: 'E_SIDEBAR_UNAVAILABLE',
    message: '当前 DSH 宿主未开放「面板直开侧边栏」能力；请让模型用 sidebar_open 打开下面的路径。',
    path: absPath,
    kind,
    rel,
  })
}

/**
 * GET /results：结果视图数据源（PROTOCOL v1.3 §8）。
 * 执行 `node <tool> results --json --root <project>`，把 CLI JSON 原样透传（200）。
 * CLI 非 0 或 JSON 解析失败 → 500 E_INTERNAL + stdoutTail。该端点只读。
 */
async function handleResults(req, res, url) {
  const saved = readConfig()
  const projectParam = url.searchParams.get('project')
  const candidate =
    typeof projectParam === 'string' && projectParam.length > 0
      ? projectParam
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  if (!candidate) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '缺少 project（且未配置项目）' })
    return
  }
  if (!isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  if (!isDagProject(project)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '不是研究项目（缺少 control/ledger.json）' })
    return
  }
  const tool = resolveTool(project)
  const result = await execCliCapture(tool, ['results', '--json', '--root', project], project)
  const json = parseJsonOutput(result.stdout)
  if (result.exitCode !== 0 || !json) {
    const message =
      result.exitCode !== 0
        ? `results CLI 失败（exit=${result.exitCode}${result.timedOut ? '，超时' : ''}）`
        : 'results CLI 输出不是合法 JSON'
    sendJson(res, 500, {
      ok: false,
      code: 'E_INTERNAL',
      message,
      stdoutTail: String(result.stdout ?? '').slice(-2000),
    })
    return
  }
  // 原样透传 CLI 的 results --json（字段见 PROTOCOL v1.3 §8）
  sendJson(res, 200, json)
}

/* ------------------------------------------- v2.1 内容优先宿主接口（/content） */

/** 校验 /content、/bridge 的 project：绝对路径、存在、DAG 项目。 */
function validateProjectRoot(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return { error: true, status: 400, code: 'E_PROJECT', message: '缺少 project' }
  }
  if (!isAbsolute(candidate)) {
    return { error: true, status: 400, code: 'E_PROJECT', message: 'project 必须是绝对路径' }
  }
  const root = resolve(candidate)
  if (!isExistingDir(root)) {
    return { error: true, status: 400, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' }
  }
  if (!isDagProject(root)) {
    return { error: true, status: 400, code: 'E_PROJECT', message: '不是研究项目（缺少 control/ledger.json）' }
  }
  return { root }
}

/**
 * GET /leader-log：主智能体（控制层）对话/决策时间轴（v2.5）。
 *
 * 这不是分支智能体的工作日志，而是**主项目控制层**的往来记录：
 *   - decisions  —— control/DECISIONS.md：每条裁决（ACCEPT/REJECT/BLOCK/NOTE）+ 理由
 *   - ideas      —— control/IDEAS.md：主项目记下的想法
 *   - reviews    —— control/REVIEWS.md：内容复核（满意/待复核）
 *   - state      —— PROJECT_STATE.json：当前阶段、下一步、阻塞
 *   - timeline   —— 以上按时间合并后的对话流（新的在前）
 *
 * 全部只读；文件缺失时对应数组为空，不报错。
 */
async function handleLeaderLog(req, res, url) {
  const saved = readConfig()
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  const checked = validateProjectRoot(candidate)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const controlDir = join(root, 'control')

  const readText = (name) => {
    try {
      return fs.readFileSync(join(controlDir, name), 'utf8')
    } catch {
      return ''
    }
  }

  /** 把 handoff 路径换成更易读的 `模块/stream vN`。 */
  const describeTarget = (target) => {
    const raw = String(target || '').trim()
    if (!raw) return ''
    const match = raw.match(/modules\/([^/]+)\/handoffs\/HANDOFF-(.+)-v(\d+)\.md$/)
    if (match) return `${match[1]} · ${match[2]} v${match[3]}`
    return raw
  }

  // ---------------- DECISIONS.md：`## D-0001 · 标题` + `- 键: 值` 列表
  const decisionsText = readText('DECISIONS.md')
  const decisions = []
  if (decisionsText) {
    const blocks = decisionsText.split(/^## /m).slice(1)
    for (const block of blocks) {
      const lines = block.split('\n')
      const heading = (lines[0] || '').trim()
      const idMatch = heading.match(/^(D-\d+)\s*·\s*(.*)$/)
      const record = {
        id: idMatch ? idMatch[1] : '',
        title: idMatch ? idMatch[2].trim() : heading,
        at: '',
        action: '',
        target: '',
        status: '',
        reason: '',
        related: '',
      }
      for (const line of lines.slice(1)) {
        const field = line.match(/^\s*-\s*([^:：]+)[:：]\s*(.*)$/)
        if (!field) continue
        const key = field[1].trim()
        const value = field[2].trim()
        if (key === '时间') record.at = value
        else if (key === '动作') record.action = value
        else if (key === '对象') record.target = value
        else if (key === '状态') record.status = value
        else if (key === '理由') record.reason = value
        else if (key === '关联') record.related = value
      }
      decisions.push({
        ...record,
        targetLabel: describeTarget(record.target),
        kind: 'decision',
        // 统一成可排序的时间戳（日期字符串补零到 ISO 形态）
        sortAt: normalizeDayISO(record.at),
      })
    }
  }

  // ---------------- IDEAS.md：`## <时间> · [tag]` + 正文
  const ideasText = readText('IDEAS.md')
  const ideas = []
  if (ideasText) {
    const blocks = ideasText.split(/^## /m).slice(1)
    for (const block of blocks) {
      const lines = block.split('\n')
      const heading = (lines[0] || '').trim()
      const parts = heading.split('·').map((item) => item.trim())
      const at = parts[0] || ''
      const tagRaw = parts[1] || ''
      const tag = tagRaw.replace(/^\[|\]$/g, '').trim()
      const body = lines
        .slice(1)
        .join('\n')
        .trim()
      ideas.push({ kind: 'idea', at, tag, text: body, sortAt: normalizeDayISO(at) })
    }
  }

  // ---------------- REVIEWS.md：`## <ISO> · <stream> v<N> · 满意|待复核` + 正文
  const reviewsText = readText('REVIEWS.md')
  const reviews = []
  if (reviewsText) {
    const blocks = reviewsText.split(/^## /m).slice(1)
    for (const block of blocks) {
      const lines = block.split('\n')
      const heading = (lines[0] || '').trim()
      const parts = heading.split('·').map((item) => item.trim())
      const at = parts[0] || ''
      const target = parts[1] || ''
      const verdict = parts[2] || ''
      const body = lines
        .slice(1)
        .join('\n')
        .trim()
      reviews.push({ kind: 'review', at, target, verdict, note: body, sortAt: normalizeDayISO(at) })
    }
  }

  // ---------------- PROJECT_STATE.json：主项目的当前意图
  const stateData = readJson(join(controlDir, 'PROJECT_STATE.json')).data || {}
  const statusResult = await execCliCapture(resolveTool(root), ['status', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS)
  const statusJson = parseJsonOutput(statusResult.stdout)
  const state = {
    phase: (statusJson && statusJson.phase) || stateData.phase || null,
    nextSteps: Array.isArray(statusJson && statusJson.next_steps)
      ? statusJson.next_steps
      : Array.isArray(stateData.next_steps)
        ? stateData.next_steps
        : [],
    blockers: Array.isArray(statusJson && statusJson.blockers)
      ? statusJson.blockers
      : Array.isArray(stateData.blockers)
        ? stateData.blockers
        : [],
  }

  // ---------------- 合并为时间轴（新→旧）
  const timeline = []
  for (const item of decisions) {
    timeline.push({
      kind: 'decision',
      at: item.at,
      sortAt: item.sortAt,
      id: item.id,
      action: item.action,
      status: item.status,
      title: item.title,
      target: item.targetLabel,
      text: item.reason,
      related: item.related,
    })
  }
  for (const item of ideas) {
    timeline.push({
      kind: 'idea',
      at: item.at,
      sortAt: item.sortAt,
      title: item.tag ? `想法 · ${item.tag}` : '想法',
      text: item.text,
    })
  }
  for (const item of reviews) {
    timeline.push({
      kind: 'review',
      at: item.at,
      sortAt: item.sortAt,
      title: `复核 · ${item.target}`,
      status: item.verdict,
      text: item.note,
    })
  }
  timeline.sort((left, right) => (left.sortAt < right.sortAt ? 1 : left.sortAt > right.sortAt ? -1 : 0))

  sendJson(res, 200, {
    ok: true,
    root,
    state,
    decisions,
    ideas,
    reviews,
    timeline,
    counts: {
      decisions: decisions.length,
      ideas: ideas.length,
      reviews: reviews.length,
      accepted: decisions.filter((item) => item.action === 'ACCEPT').length,
      rejected: decisions.filter((item) => item.action === 'REJECT').length,
      blocked: decisions.filter((item) => item.action === 'BLOCK').length,
    },
    generatedAt: new Date().toISOString(),
  })
}

/** 把 `2026-10-19` / `2026-10-19 01:01` / ISO 统一成可比较字符串。 */
function normalizeDayISO(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const timeMatch = text.match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!dateMatch) return text
  const day = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  const clock = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] || '00'}` : '00:00:00'
  return `${day}T${clock}`
}

/**
 * GET /fishbone：项目流程视图一次性数据源（v2.4）。
 *
 * 输出结构：
 *   head      —— 项目目标：项目目标、核心研究问题、阶段、下一步
 *   spine     —— 主支：按阶段排列的模块链（每段带状态聚合计分与是否活跃）
 *   ribs      —— 分支：每个分支 = 一根侧分支（状态、最近活动、文件数、会话记录）
 *   blockers  —— 阻塞信号
 *   attention —— 需要人处理的事项（待决定 / STALE / 校验问题）
 *   markers   —— 阶段里程碑（已接受结果的 stream 列表）
 *
 * 数据来源：`status --json`（一次 CLI）+ PROJECT_STATE.json + 磁盘目录扫描（只读）。
 * CLI 失败不致命：退回 PROJECT_STATE.json + 磁盘 handoff 拼装。
 */
async function handleFishbone(req, res, url) {
  const saved = readConfig()
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  const checked = validateProjectRoot(candidate)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const tool = resolveTool(root)
  const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data || {}

  const [statusResult, listResult] = await Promise.all([
    execCliCapture(tool, ['status', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS),
    execCliCapture(tool, ['list', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS),
  ])
  const statusJson = parseJsonOutput(statusResult.stdout)
  const listJson = parseJsonOutput(listResult.stdout)
  const cliErrors = []
  if (statusResult.exitCode !== 0 || !statusJson) {
    cliErrors.push(`status CLI 失败：${summarizeCliFailure(statusResult)}`)
  }
  if (listResult.exitCode !== 0 || !listJson) {
    cliErrors.push(`list CLI 失败：${summarizeCliFailure(listResult)}`)
  }

  const handoffs = listJson && Array.isArray(listJson.handoffs)
    ? listJson.handoffs
    : statusJson && Array.isArray(statusJson.accepted)
      ? statusJson.accepted.map((item) => ({
          path: item.path,
          stream: item.stream,
          version: item.version,
          status: 'ACCEPTED',
          is_stale: Boolean(item.is_stale),
          stale_reasons: Array.isArray(item.stale_reasons) ? item.stale_reasons : [],
        }))
      : []
  const modules = Array.isArray(stateData.modules) ? stateData.modules : []
  const branches = Array.isArray(stateData.branches) ? stateData.branches : []
  const status = statusJson && statusJson.ok !== false ? statusJson : null

  // ---- 分支索引：branchId → handoffs[]
  const handoffsByBranch = new Map()
  for (const item of handoffs) {
    if (!item || !item.branch) continue
    if (!handoffsByBranch.has(item.branch)) handoffsByBranch.set(item.branch, [])
    handoffsByBranch.get(item.branch).push(item)
  }

  const STATUS_WEIGHT = {
    ACCEPTED: 100,
    PROVISIONAL: 60,
    DRAFT: 25,
    BLOCKED: 5,
    REJECTED: 0,
    SUPERSEDED: 0,
  }

  /** 读分支目录的活动信号：work/ 与 outputs/ 的文件数、会话/指令记录、最近修改时间。 */
  const readBranchActivity = (branchDirRel) => {
    const abs = join(root, ...String(branchDirRel || '').split('/'))
    const out = {
      workFiles: [],
      outputFiles: [],
      hasSession: false,
      hasDirectives: false,
      lastActivityAt: null,
      brief: '',
    }
    const statFile = (p) => {
      try {
        return fs.statSync(p)
      } catch {
        return null
      }
    }
    const listDir = (dirAbs, prefix) => {
      let names = []
      try {
        names = fs.readdirSync(dirAbs)
      } catch {
        return []
      }
      const rows = []
      for (const name of names) {
        const full = join(dirAbs, name)
        const st = statFile(full)
        if (!st || !st.isFile()) continue
        rows.push({
          name,
          rel: `${branchDirRel}/${prefix}/${name}`,
          size: st.size,
          mtime: st.mtime.toISOString(),
        })
      }
      return rows.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    }
    out.workFiles = listDir(join(abs, 'work'), 'work')
    out.outputFiles = listDir(join(abs, 'outputs'), 'outputs')
    out.hasSession = out.workFiles.some((file) => /^SESSION(\.md)?$/i.test(file.name))
    out.hasDirectives = out.workFiles.some((file) => /^DIRECTIVES(\.md)?$/i.test(file.name))
    const briefPath = join(abs, 'BRIEF.md')
    const briefStat = statFile(briefPath)
    if (briefStat) {
      try {
        const text = fs.readFileSync(briefPath, 'utf8')
        const line = text
          .split('\n')
          .map((row) => row.trim())
          .find((row) => row.length > 0 && !row.startsWith('#') && !row.startsWith('---'))
        out.brief = line ? line.slice(0, 160) : ''
      } catch {
        out.brief = ''
      }
    }
    const times = [
      ...out.workFiles.map((file) => file.mtime),
      ...out.outputFiles.map((file) => file.mtime),
      briefStat ? briefStat.mtime.toISOString() : null,
    ].filter(Boolean)
    if (times.length > 0) {
      times.sort()
      out.lastActivityAt = times[times.length - 1]
    }
    return out
  }

  /** 单根分支。 */
  const buildRib = (branch) => {
    const items = handoffsByBranch.get(branch.id) || []
    const sorted = items
      .slice()
      .sort((left, right) => Number(right.version || 0) - Number(left.version || 0))
    const latest = sorted[0] || null
    const counts = { draft: 0, provisional: 0, accepted: 0, rejected: 0, superseded: 0, blocked: 0 }
    for (const item of items) {
      const key = String(item.status || '').toLowerCase()
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1
    }
    const stale = items.some((item) => item.is_stale)
    const activity = readBranchActivity(branch.dir)
    // 状态权重取该分支最好的一条（已接受 > 待确认 > 草稿 > 阻塞）
    let best = 0
    for (const item of items) best = Math.max(best, STATUS_WEIGHT[item.status] ?? 0)
    return {
      id: branch.id,
      module: branch.module,
      name: branch.name || branch.id,
      dir: branch.dir,
      status: latest ? latest.status : 'EMPTY',
      stream: latest ? latest.stream : null,
      version: latest ? latest.version : null,
      is_stale: stale,
      counts,
      weight: best,
      brief: activity.brief,
      workFiles: activity.workFiles,
      outputFiles: activity.outputFiles,
      hasSession: activity.hasSession,
      hasDirectives: activity.hasDirectives,
      lastActivityAt: activity.lastActivityAt,
    }
  }

  const ribs = branches.map(buildRib)

  // ---- v3.5 合并工作台元数据：回收站（软删）/ 受阻 / 重命名 / 锚点
  const { data: ribMeta } = readRibMeta(root)
  pruneRecycleBin(ribMeta)
  const metaRibs = ribMeta.ribs && typeof ribMeta.ribs === 'object' ? ribMeta.ribs : {}
  const recycledIds = new Set(
    (Array.isArray(ribMeta.recycleBin) ? ribMeta.recycleBin : [])
      .map((entry) => entry && entry.rib && entry.rib.id)
      .filter(Boolean),
  )
  const visibleRibs = ribs
    .filter((rib) => !recycledIds.has(rib.id))
    .map((rib) => {
      const meta = metaRibs[rib.id]
      // v3.8：Zotero 挂载关系一并下发，左栏分支行/右栏文献卡片都靠它渲染。
      const zotero = readRibZotero(ribMeta, rib.id)
      if (!meta || typeof meta !== 'object') return { ...rib, zotero }
      const next = { ...rib, zotero }
      if (typeof meta.customName === 'string' && meta.customName.trim()) next.name = meta.customName.trim()
      if (meta.blocked && typeof meta.blocked === 'object') {
        next.status = 'BLOCKED'
        next.blockedNote = typeof meta.blocked.note === 'string' ? meta.blocked.note : ''
      }
      if (meta.origin && typeof meta.origin === 'object') next.origin = meta.origin
      return next
    })
  // 回收站里那些已经被 DAG 彻底移除的分支（目录被手工删了）也从回收站清掉，保持一致
  const liveIds = new Set(ribs.map((rib) => rib.id))
  ribMeta.recycleBin = ribMeta.recycleBin.filter((entry) => {
    const id = entry && entry.rib && entry.rib.id
    return id && liveIds.has(id)
  })

  const ribsByModule = new Map()
  for (const rib of visibleRibs) {
    if (!ribsByModule.has(rib.module)) ribsByModule.set(rib.module, [])
    ribsByModule.get(rib.module).push(rib)
  }

  const modulesById = new Map(modules.map((mod) => [mod.id, mod]))
  // 模块若出现在 status.modules 但 state.modules 缺失，也补上，保证主支完整
  const spineOrder = []
  const seenModules = new Set()
  for (const mod of modules) {
    if (mod && mod.id) {
      spineOrder.push(mod.id)
      seenModules.add(mod.id)
    }
  }
  for (const rib of ribs) {
    if (rib.module && !seenModules.has(rib.module)) {
      seenModules.add(rib.module)
      spineOrder.push(rib.module)
    }
  }
  if (status && Array.isArray(status.modules)) {
    for (const mod of status.modules) {
      if (mod && mod.id && !seenModules.has(mod.id)) {
        seenModules.add(mod.id)
        spineOrder.push(mod.id)
      }
    }
  }

  // v3.9：按用户偏好顺序排列主支；每个主支下的分支同理。
  // hiddenModules 是「从工作台视图里收起的主支」——协议文件不动，只影响显示。
  const hiddenModules = new Set(Array.isArray(ribMeta.hiddenModules) ? ribMeta.hiddenModules : [])
  const customModuleNames = ribMeta.moduleNames && typeof ribMeta.moduleNames === 'object' ? ribMeta.moduleNames : {}
  const orderedSpine = applyOrder(spineOrder, ribMeta.moduleOrder).filter((id) => !hiddenModules.has(id))

  // v2.1：把主支成稿状态并进 spine[] 节点（SPINE-PIPELINE §7）。
  // 旧项目没有 SPINE.json → 六个字段全部 null/false，绝不让 /fishbone 失败。
  const spineFile = readSpineFile(root)
  const stageByModule = new Map()
  if (spineFile.exists) {
    for (const stage of spineFile.stages) {
      if (!stage || typeof stage !== 'object') continue
      if (typeof stage.module === 'string' && stage.module && !stageByModule.has(stage.module)) {
        stageByModule.set(stage.module, stage)
      }
    }
  }
  // chainBroken：任一 SPINE-E1xx（不含 W201 警告）即视为链断。
  const chainIssues = []
  if (spineFile.exists) {
    const chainResult = await execCliCapture(tool, ['spine', 'chain', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS)
    const chainJson = parseJsonOutput(chainResult.stdout)
    if (chainJson && Array.isArray(chainJson.issues)) chainIssues.push(...chainJson.issues)
    else if (chainResult.exitCode !== 0) {
      cliErrors.push(`spine chain CLI 失败：${summarizeCliFailure(chainResult)}`)
    }
  }
  const chainBroken = chainIssues.some((issue) => String(issue && issue.code).startsWith('SPINE-E'))

  const spine = orderedSpine.map((moduleId) => {
    // 自定义显示名优先（用户重命名主支时不改协议文件）
    const raw = modulesById.get(moduleId) || { id: moduleId, name: moduleId }
    const mod = customModuleNames[moduleId] ? { ...raw, name: customModuleNames[moduleId] } : raw
    const modRibs = applyOrder(
      (ribsByModule.get(moduleId) || []).map((rib) => rib.id),
      ribMeta.ribOrder[moduleId],
    ).map((id) => visibleRibs.find((rib) => rib.id === id))
      .filter(Boolean)
    const counts = { draft: 0, provisional: 0, accepted: 0, rejected: 0, superseded: 0, blocked: 0 }
    for (const rib of modRibs) {
      for (const key of Object.keys(counts)) counts[key] += rib.counts[key] || 0
    }
    const total = counts.draft + counts.provisional + counts.accepted + counts.rejected + counts.superseded + counts.blocked
    // 完成度：已接受数 / 总交接数（至少 1 条时才有意义）
    const completion = total > 0 ? Math.round((counts.accepted / total) * 100) : 0
    const active = modRibs.some((rib) => rib.status === 'PROVISIONAL' || rib.status === 'DRAFT' || rib.status === 'BLOCKED')
    // v2.1 主支成稿字段（既有字段语义不变，只追加）
    const stage = stageByModule.get(moduleId) || null
    const stageBackups = stage && Array.isArray(stage.backups) ? stage.backups.length : 0
    return {
      id: moduleId,
      name: mod.name || moduleId,
      dir: mod.dir || null,
      ribs: modRibs.map((rib) => rib.id),
      counts,
      total,
      completion,
      active,
      staleness: modRibs.some((rib) => rib.is_stale),
      // —— v2.1 追加（无 SPINE.json 时 stage 为 null → 全部 null/false）——
      stageId: stage ? String(stage.id) : null,
      stageStatus: stage ? String(stage.status || 'empty') : null,
      stageRevision: stage ? Number(stage.revision) || 0 : null,
      backupCount: stage ? stageBackups : null,
      hasDraft: stage ? Boolean(stage.has_draft) : false,
      chainBroken,
    }
  })

  // ---- 关注项
  const attention = []
  const pendingDecisions = status && Array.isArray(status.pending_decisions) ? status.pending_decisions : []
  for (const item of pendingDecisions) {
    attention.push({
      kind: 'decision',
      path: item.path || null,
      stream: item.stream || null,
      version: item.version || null,
      message: '有一项交接等待拍板',
    })
  }
  const staleItems = status && Array.isArray(status.stale) ? status.stale : []
  for (const item of staleItems) {
    attention.push({
      kind: 'stale',
      path: item.path || null,
      message: (item.reasons && item.reasons[0]) || '上游版本变更，下游结果可能已过期',
    })
  }

  // ---- 阶段里程碑
  const acceptedStreams = handoffs
    .filter((item) => item && item.status === 'ACCEPTED')
    .map((item) => ({ stream: item.stream, version: item.version, is_stale: Boolean(item.is_stale) }))
    .sort((left, right) => (String(left.stream) < String(right.stream) ? -1 : 1))

  const project = stateData.project || {}
  const head = {
    id: project.id || null,
    title: project.title || null,
    goal: project.goal || null,
    phase: (status && status.phase) || stateData.phase || null,
    nextSteps: Array.isArray(status && status.next_steps)
      ? status.next_steps
      : Array.isArray(stateData.next_steps)
        ? stateData.next_steps
        : [],
    blockers: Array.isArray(status && status.blockers)
      ? status.blockers
      : Array.isArray(stateData.blockers)
        ? stateData.blockers
        : [],
  }

  const allRibs = spine.flatMap((node) =>
    (node.ribs || []).map((id) => visibleRibs.find((rib) => rib.id === id)).filter(Boolean),
  )
  const activeRibs = allRibs.filter((rib) => rib.status === 'PROVISIONAL' || rib.status === 'DRAFT')
  const totals = {
    modules: spine.length,
    ribs: allRibs.length,
    activeRibs: activeRibs.length,
    accepted: acceptedStreams.length,
    stale: allRibs.filter((rib) => rib.is_stale).length,
    blocked: allRibs.filter((rib) => rib.status === 'BLOCKED').length,
    attention: attention.length,
  }

  sendJson(res, 200, {
    ok: true,
    root,
    head,
    spine,
    ribs: visibleRibs,
    recycleBin: ribMeta.recycleBin,
    attention,
    markers: acceptedStreams,
    totals,
    cliErrors,
    zotero: {
      available: null, // 单独用 GET /zotero 探活，项目流程首屏不为它付等待代价
      linkedRibs: visibleRibs.filter((rib) => rib.zotero && rib.zotero.itemKeys.length > 0).length,
      linkedItems: visibleRibs.reduce((sum, rib) => sum + ((rib.zotero && rib.zotero.itemKeys.length) || 0), 0),
    },
    generatedAt: new Date().toISOString(),
  })
}

/* --------------------------------- v2.1 主支成稿接口（GET /spine · POST /spine-op）
 *
 * 契约唯一事实源：docs/SPINE-PIPELINE.md §7。两侧语义要点：
 *   - `SPINE.json` 是新增文件，旧项目可能压根没有 —— 那不是错误，是「未建主支链」；
 *     `/spine` 必须返回 ok:true + exists:false，让 UI 显示引导而不是报错。
 *   - `dag spine chain` 失败时**退出码非 0 但 stdout 仍是完整 JSON**（issues[] 照常下发）。
 *     所以这里按「有 JSON 就以 JSON 为准」解析，绝不把校验失败误判成命令崩溃。
 *   - `paper compile` 拒编时同样 exit 1 + 合法 JSON（code=SPINE-E106、stages_with_draft:0）。
 *   - 问题码分两类：`SPINE-E1xx` / `SPINE-W201` 是主支链语义问题，
 *     `DAG-E0xx` 是通用用法/IO 问题。宿主原样透传 `code`，分组提示交给 UI。
 */

/** 主支元数据文件名（与 dag.mjs 的 SPINE_FILE 保持一致）。 */
const SPINE_FILE = 'SPINE.json'

/** `/spine-op` 允许的 op → CLI argv 模板（浏览器永远不能拼 argv）。 */
const SPINE_OPS = {
  rebuild: { command: ['spine', 'rebuild'], needsStage: true, label: '重新生成主支' },
  backup: { command: ['spine', 'backup'], needsStage: true, label: '备份当前成稿' },
  lock: { command: ['spine', 'lock'], needsStage: true, label: '锁定主支' },
  unlock: { command: ['spine', 'unlock'], needsStage: true, label: '解锁主支' },
  write: { command: ['spine', 'write'], needsStage: true, label: '写入成稿' },
  dispatch: { command: ['spine', 'dispatch'], needsStage: false, label: '下发主支口径' },
  paper: { command: ['paper', 'compile'], needsStage: false, label: '汇编终稿论文' },
  chain: { command: ['spine', 'chain'], needsStage: false, label: '续贯校验' },
}

/** 读 control/SPINE.json；不存在 → {exists:false}，不是错误。 */
function readSpineFile(root) {
  const path = join(root, 'control', SPINE_FILE)
  const result = readJson(path)
  const data = result.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { exists: false, path, data: null, error: result.error }
  }
  return {
    exists: true,
    path,
    data,
    error: null,
    stages: Array.isArray(data.stages) ? data.stages : [],
  }
}

/**
 * v3.20：渲染「继承链」清单（宿主侧统一口径）。
 *
 * 顺序是硬契约，任何入口（挂载上下文 / 前端新会话 / CONTEXT.md）都必须一致：
 *   ① 前序主支结果（本主支之前的所有主支，按主支链顺序全列）
 *   ② 本主支结果
 *   ③ 祖先分支链（根分支 → 直接父分支）
 *   ④ 本分支任务
 *
 * @returns {{ lines: string[], preceding: number, ancestors: number }}
 */
function renderInheritanceChain(root, moduleId, branchId, branchName) {
  const stageDoc = (stage, note) => {
    if (!stage) return `${moduleId} → （尚无主支链信息）`
    const title = typeof stage.title === 'string' && stage.title ? `（${stage.title}）` : ''
    // 没有真实阶段 id（未建主支链，用模块 id 兜底）时不编造 DRAFT 路径
    const isRealStage = Boolean(stage.id) && stage.id !== stage.module
    const doc = isRealStage
      ? `spine/stages/${stage.id}/DRAFT.md${stage.has_draft ? '' : '（尚未成稿）'}`
      : '（尚未建主支链，无成稿文件）'
    return `${stage.module || moduleId}${title} → ${doc} · 状态 ${stage.status || 'empty'}${note || ''}`
  }

  let stages = []
  try {
    stages = readSpineFile(root).stages || []
  } catch {
    stages = []
  }
  // 没有 SPINE.json（未建主支链）时，用 PROJECT_STATE 的模块顺序充当主支顺序。
  // 否则「前序主支」会被误判成 0 个 —— 用户明确要求必须列全。
  if (stages.length === 0) {
    try {
      const stateData = readProjectStateData(root) || {}
      const mods = Array.isArray(stateData.modules) ? stateData.modules : []
      const order = (readRibMeta(root).data.moduleOrder || []).slice()
      const ordered = order.length ? applyOrder(mods.map((m) => m && m.id).filter(Boolean), order) : mods
      stages = (Array.isArray(ordered) ? ordered : [])
        .map((m) => (typeof m === 'string' ? mods.find((x) => x && x.id === m) : m))
        .filter(Boolean)
        .map((m) => ({
          id: m.id,
          module: m.id,
          title: m.name && m.name !== m.id ? m.name : '',
          status: 'empty',
          has_draft: false,
        }))
    } catch {
      stages = []
    }
  }
  const idx = stages.findIndex((s) => s && (s.module === moduleId || s.id === moduleId))
  const preceding = idx > 0 ? stages.slice(0, idx) : []
  const own = idx >= 0 ? stages[idx] : null

  // 祖先分支链：顺着 parent 上溯到根，再反转
  let branches = []
  try {
    const stateData = readProjectStateData(root) || {}
    branches = Array.isArray(stateData.branches) ? stateData.branches : []
  } catch {
    branches = []
  }
  const ancestors = []
  const seen = new Set()
  let cursor = (branches.find((b) => b && b.id === branchId) || {}).parent || ''
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const parent = branches.find((b) => b && b.id === cursor)
    if (!parent) break
    ancestors.push(`${parent.id}${parent.name && parent.name !== parent.id ? `（${parent.name}）` : ''}`)
    cursor = parent.parent || ''
  }
  ancestors.reverse()

  const lines = [
    `【科研分支上下文】`,
    `项目：${root}（本对话与项目同目录，无需另设会话文件夹）`,
    `本分支：${branchId}${branchName && branchName !== branchId ? `（${branchName}）` : ''}`,
    ``,
    `继承顺序（唯一来源，逐级向下）：`,
    `① 前序主支结果（本主支之前的所有主支，共 ${preceding.length} 个）`,
    ...(preceding.length
      ? preceding.map((s, i) => `   ${i + 1}. ${stageDoc(s)}`)
      : ['   （本主支已是第一个主支，无前序主支）']),
    `② 本主支结果`,
    `   ${own ? stageDoc(own) : `${moduleId} → （尚未建阶段，先建链再成稿）`}`,
    `③ 祖先分支链（根分支 → 直接父分支，共 ${ancestors.length} 级）`,
    ...(ancestors.length
      ? ancestors.map((a, i) => `   ${i + 1}. ${a}`)
      : ['   （本分支直接从主支分出，无祖先分支）']),
    `④ 本分支任务：modules/${moduleId}/branches/${branchId}/CONTEXT.md（含同一份继承链）`,
    ``,
    `本分支与本对话一对一独立；请**按 ①→②→③ 顺序**读取全部上下文再开始推进，不要读取其它主支或旁系分支。`,
  ]
  return { lines, preceding: preceding.length, ancestors: ancestors.length }
}

/** 归一化一条 backups[] 记录（只保留 UI 需要的字段）。 */
function normalizeSpineBackups(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      at: typeof item.at === 'string' ? item.at : null,
      revision: Number.isFinite(Number(item.revision)) ? Number(item.revision) : null,
      path: typeof item.path === 'string' ? item.path : null,
      sha256: typeof item.sha256 === 'string' ? item.sha256 : null,
      reason: typeof item.reason === 'string' ? item.reason : '',
    }))
}

/** 归一化成稿小节（{n,title,preview} → {no,title,preview}，与 §7 契约字段名对齐）。 */
function normalizeSpineSections(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      no: Number.isFinite(Number(item.n)) ? Number(item.n) : Number(item.no) || 0,
      title: typeof item.title === 'string' ? item.title : '',
      preview: typeof item.preview === 'string' ? item.preview : '',
    }))
}

/**
 * 把一个 stage 归一化成契约 §7 的形状。
 *
 * 字段名刻意用 camelCase（lastSource / generatedAt / referenceCount），
 * 与契约表一致；CLI 侧是 snake_case（last_source / generated_at / references），
 * 映射只在这一层做一次，UI 不必记两套命名。
 */
function normalizeSpineStage(stage, detail) {
  const source = stage && typeof stage === 'object' ? stage : {}
  const draft = detail && detail.draft && typeof detail.draft === 'object' ? detail.draft : null
  const hasDraft = draft ? Boolean(draft.exists) : Boolean(source.has_draft)
  return {
    id: String(source.id ?? ''),
    order: Number(source.order) || 0,
    title: String(source.title ?? source.id ?? ''),
    module: source.module === null || source.module === undefined ? null : String(source.module),
    stream: typeof source.stream === 'string' ? source.stream : null,
    status: typeof source.status === 'string' ? source.status : 'empty',
    revision: Number(source.revision) || 0,
    locked: Boolean(source.locked),
    updatedAt: typeof source.updated_at === 'string' ? source.updated_at : null,
    lastSource: typeof source.last_source === 'string' ? source.last_source : null,
    dependsOn: Array.isArray(source.depends_on) ? source.depends_on.map(String) : [],
    // `backups` 在 CLI list 里是「份数」，在 SPINE.json 里是「记录数组」——两种都接受。
    backupCount: Array.isArray(source.backups) ? source.backups.length : Number(source.backups) || 0,
    backups: normalizeSpineBackups(Array.isArray(source.backups) ? source.backups : []),
    hasDraft,
    draft: draft
      ? {
          path: typeof draft.path === 'string' ? draft.path : null,
          exists: Boolean(draft.exists),
          revision: Number.isFinite(Number(draft.revision)) ? Number(draft.revision) : null,
          sha256: typeof draft.sha256 === 'string' ? draft.sha256 : null,
          generatedAt: typeof draft.generated_at === 'string' ? draft.generated_at : null,
          generatedBy: typeof draft.generated_by === 'string' ? draft.generated_by : null,
          upstream: Array.isArray(draft.upstream) ? draft.upstream.map(String) : [],
          sources: Array.isArray(draft.sources) ? draft.sources.map(String) : [],
          referenceCount: Number(draft.references) || 0,
          sections: normalizeSpineSections(draft.sections),
          sectionIssues: Array.isArray(draft.section_issues) ? draft.section_issues : [],
        }
      : { path: null, exists: false, revision: null, sha256: null, sections: [] },
  }
}

/** 从 `spine list` 的 chain 段归一化续贯结论。 */
function normalizeSpineChain(chain) {
  const source = chain && typeof chain === 'object' ? chain : {}
  const issues = Array.isArray(source.issues)
    ? source.issues
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          code: typeof item.code === 'string' ? item.code : '',
          path: typeof item.path === 'string' ? item.path : '',
          message: typeof item.message === 'string' ? item.message : '',
        }))
    : []
  return { ok: source.ok !== false, issues }
}

/** 读 control/PROFILE.json（统计语言）；缺失用默认值，不报错。 */
function readProfileLoose(root) {
  const result = readJson(join(root, 'control', 'PROFILE.json'))
  const data = result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? result.data : {}
  return {
    statsLanguage: typeof data.stats_language === 'string' && data.stats_language ? data.stats_language : 'R',
    reporting: Array.isArray(data.reporting_guidelines) ? data.reporting_guidelines.map(String) : [],
    writingLanguage: typeof data.writing_language === 'string' ? data.writing_language : null,
    exists: Boolean(result.exists),
  }
}

/**
 * GET /spine?project=<abs>[&stage=<id>]
 *
 * 顶层：`{ok, root, exists, spine:{schema, stages[], chainIssues}, chain, profile, paper}`
 * 传了 stage 时额外带 `detail`（该主支的成稿正文与备份，供详情抽屉）。
 *
 * 实现策略：一次 `spine list --json`（含 chain）打底；只有指定 stage 时才跑
 * 第二条 `spine show <id> --raw --json`。列表页不该为「正文」付第二条 CLI 的代价。
 */
async function handleSpine(req, res, url) {
  const saved = readConfig()
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  const checked = validateProjectRoot(candidate)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const tool = resolveTool(root)
  const local = readSpineFile(root)
  const profile = readProfileLoose(root)

  const errors = []
  let stages = []
  let chain = { ok: true, issues: [] }
  let spineSchema = null

  if (!local.exists) {
    // 旧项目：没有主支链不是错误。chain 用空结论，UI 显示「建链引导」。
    // 只有明确想看的 stage 才会在下面走 CLI（此时 CLI 会给出 SPINE-E101）。
    chain = { ok: true, issues: [] }
  } else {
    const listResult = await execCliCapture(tool, ['spine', 'list', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS)
    const listJson = parseJsonOutput(listResult.stdout)
    if (!listJson || listJson.ok === false) {
      // `spine list` 正常情况恒 ok:true；这里失败多半是 CLI 本身不可用，如实上报。
      errors.push(`spine list CLI 失败：${summarizeCliFailure(listResult)}`)
    } else {
      stages = (Array.isArray(listJson.stages) ? listJson.stages : []).map((item) => normalizeSpineStage(item, null))
      chain = normalizeSpineChain(listJson.chain)
      spineSchema = Number.isFinite(Number(local.data && local.data.schema)) ? Number(local.data.schema) : 1
    }
  }

  // 详情：只对指定 stage 跑 show（--raw 带上 DRAFT.md 全文，详情抽屉直接展示）
  const stageQuery = typeof url.searchParams.get('stage') === 'string' ? url.searchParams.get('stage').trim() : ''
  let detail = null
  if (stageQuery && local.exists) {
    const showResult = await execCliCapture(
      tool,
      ['spine', 'show', stageQuery, '--raw', '--json', '--root', root],
      root,
      CONTENT_CLI_TIMEOUT_MS,
    )
    const showJson = parseJsonOutput(showResult.stdout)
    if (!showJson || showJson.ok === false) {
      detail = { ok: false, error: summarizeCliFailure(showResult), code: null, stage: null, draftRaw: null }
      const failure = showJson && typeof showJson.code === 'string' ? showJson.code : null
      detail.code = failure
    } else {
      const shown = normalizeSpineStage(showJson.stage, showJson.stage)
      detail = {
        ok: true,
        error: null,
        code: null,
        stage: shown,
        // 全文只在这里下发：列表接口不带正文，避免首屏被超长 payload 拖慢。
        draftRaw: typeof showJson.draft_raw === 'string' ? showJson.draft_raw : null,
        chainIssues: Array.isArray(showJson.chain && showJson.chain.issues) ? showJson.chain.issues : [],
      }
      const index = stages.findIndex((item) => item.id === shown.id)
      if (index >= 0) stages[index] = Object.assign({}, stages[index], shown)
    }
  }

  // 终稿论文：只读检查磁盘，不做编译
  const paperRel = 'manuscript/PAPER.md'
  const paperAbs = join(root, 'manuscript', 'PAPER.md')
  let paperStat = null
  try {
    paperStat = fs.statSync(paperAbs)
  } catch {
    paperStat = null
  }
  const stagesWithDraft = stages.filter((item) => item.hasDraft).length

  sendJson(res, 200, {
    ok: true,
    root,
    exists: local.exists,
    spine: {
      schema: spineSchema,
      stages,
      // 同一份 issues 两处都给：契约 §7 说 chain:{ok,issues}，
      // 但 UI 里「链断了」要贴着 stages 显示，这里别名一次省得来回取。
      chainIssues: chain.issues,
      stagesWithDraft,
    },
    chain,
    profile,
    paper: {
      path: paperRel,
      exists: Boolean(paperStat),
      generatedAt: paperStat ? paperStat.mtime.toISOString() : null,
      bytes: paperStat ? paperStat.size : 0,
    },
    detail,
    errors,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * POST /spine-op —— 主支成稿动作（rebuild / backup / lock / unlock / write / dispatch / paper / chain）。
 *
 * 走与 `/run` 同一套 run 注册表：立刻返回 `{ok, run}`，由面板轮询 `GET /run?id=`。
 * 浏览器只能给 op 与 stage —— argv 由 SPINE_OPS 模板生成，绝不拼接任意参数。
 */
async function handleSpineOp(req, res, registry) {
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }
  const checked = validateProjectRoot(parsed.project)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root

  const op = typeof parsed.op === 'string' ? parsed.op.trim() : ''
  if (!Object.prototype.hasOwnProperty.call(SPINE_OPS, op)) {
    sendJson(res, 400, {
      ok: false,
      code: 'E_OP',
      message: `未知主支操作：${op || '(空)'}（可选：${Object.keys(SPINE_OPS).join(' / ')}）`,
    })
    return
  }
  const spec = SPINE_OPS[op]
  const cliArgs = [...spec.command]

  if (spec.needsStage) {
    const stage = typeof parsed.stage === 'string' ? parsed.stage.trim() : ''
    if (!stage) {
      sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `${op} 需要 stage（主支 id）` })
      return
    }
    // 主支 id 与模块 id 同规则：不得以 . 或 - 结尾，不允许任何路径分隔符。
    if (!ID_RE.test(stage)) {
      sendJson(res, 400, { ok: false, code: 'E_PARAM', message: `stage 非法：${stage}` })
      return
    }
    cliArgs.push(stage)
  } else if (typeof parsed.stage === 'string' && parsed.stage.trim() && ID_RE.test(parsed.stage.trim())) {
    // dispatch 支持可选 stage；paper / chain 忽略该字段（不传即全链）
    if (op === 'dispatch') cliArgs.push(parsed.stage.trim())
  }

  // 只有允许的理由类操作才接受自由文本（写进备份记录 / 决策日志）。
  if (op === 'rebuild' || op === 'backup' || op === 'write') {
    const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : ''
    if (reason) {
      if (reason.length > MAX_REASON_CHARS) {
        sendJson(res, 400, { ok: false, code: 'E_REASON', message: `reason 过长（上限 ${MAX_REASON_CHARS} 字）` })
        return
      }
      cliArgs.push('--reason', reason.replace(/\r?\n/g, ' '))
    }
  }

  cliArgs.push('--json', '--root', root)

  const tool = resolveTool(root)
  let run
  try {
    run = registry.spawnRun(`spine:${op}`, cliArgs, { tool, cwd: root })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      code: 'E_INTERNAL',
      message: String(error && error.message ? error.message : error),
    })
    return
  }
  sendJson(res, 200, { ok: true, op, run })
}

/**
 * GET /content：一次拿全内容页数据（results/status + TeamMCP digest + 复核汇总）。
 * results/status 失败不致命（对应字段 null + errors）；digest 失败不致命
 * （network=null + networkError 中文说明）。项目非法 → 400。
 */
async function handleContent(req, res, url) {
  const saved = readConfig()
  const queryProject = url.searchParams.get('project')
  const candidate =
    typeof queryProject === 'string' && queryProject.length > 0
      ? queryProject
      : saved.data && typeof saved.data.projectRoot === 'string' && saved.data.projectRoot.length > 0
        ? saved.data.projectRoot
        : ''
  const checked = validateProjectRoot(candidate)
  if (checked.error) {
    sendJson(res, checked.status, { ok: false, code: checked.code, message: checked.message })
    return
  }
  const root = checked.root
  const tool = resolveTool(root)
  const stateData = readJson(join(root, 'control', 'PROJECT_STATE.json')).data

  // results / status 并行执行（各自独立失败，不互相阻塞）
  const [resultsResult, statusResult] = await Promise.all([
    execCliCapture(tool, ['results', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS),
    execCliCapture(tool, ['status', '--json', '--root', root], root, CONTENT_CLI_TIMEOUT_MS),
  ])
  const resultsJson = parseJsonOutput(resultsResult.stdout)
  const statusJson = parseJsonOutput(statusResult.stdout)
  const errors = { results: null, status: null }
  let results = null
  let status = null
  if (resultsResult.exitCode !== 0 || !resultsJson) {
    errors.results =
      resultsResult.exitCode !== 0
        ? `results CLI 失败：${summarizeCliFailure(resultsResult)}`
        : 'results CLI 输出不是合法 JSON'
  } else {
    results = resultsJson
  }
  if (statusResult.exitCode !== 0 || !statusJson) {
    errors.status =
      statusResult.exitCode !== 0
        ? `status CLI 失败：${summarizeCliFailure(statusResult)}`
        : 'status CLI 输出不是合法 JSON'
  } else {
    status = statusJson
  }

  // TeamMCP 网络摘要（桥 / server 失败都不致命）
  let network = null
  let networkError = null
  if (!isExistingFile(BRIDGE_PATH)) {
    networkError = `TeamMCP 桥不可用：缺少 ${BRIDGE_PATH}`
  } else {
    const digestResult = await execCliCapture(
      BRIDGE_PATH,
      ['digest', '--project', root, '--json'],
      KIT_ROOT,
      BRIDGE_TIMEOUT_MS,
    )
    const digestJson = parseJsonOutput(digestResult.stdout)
    if (digestResult.exitCode !== 0 || !digestJson) {
      networkError = `TeamMCP 未运行或桥不可用：${summarizeCliFailure(digestResult)}`
    } else {
      network = digestJson
    }
  }

  const project = {
    root,
    id: (stateData && stateData.project && stateData.project.id) ?? (statusJson && statusJson.project && statusJson.project.id) ?? null,
    title:
      (stateData && stateData.project && stateData.project.title) ??
      (statusJson && statusJson.project && statusJson.project.title) ??
      null,
    phase: (statusJson && statusJson.phase) ?? (stateData && stateData.phase) ?? null,
  }

  // 复核汇总：byItem（stream@version 最新记录）、pendingReview（本项目）、summary
  let review = null
  if (network && typeof network === 'object') {
    const projects = Array.isArray(network.projects) ? network.projects : []
    const selfProjectId =
      typeof network.selfProjectId === 'string' && network.selfProjectId.length > 0
        ? network.selfProjectId
        : project.id
    const self = projects.find((item) => item && item.projectId === selfProjectId) || null
    if (self) {
      const byItem = {}
      const reviewedRecords = [...(Array.isArray(self.reviewed) ? self.reviewed : [])].sort((a, b) =>
        String(b && b.at ? b.at : '').localeCompare(String(a && a.at ? a.at : '')),
      )
      for (const record of reviewedRecords) {
        if (!record || typeof record.stream !== 'string' || record.stream.length === 0) continue
        const version = Number.isFinite(Number(record.version)) ? Number(record.version) : 1
        const key = `${record.stream}@${version}`
        if (Object.prototype.hasOwnProperty.call(byItem, key)) continue
        byItem[key] = {
          satisfied: record.satisfied === true,
          at: String(record.at || ''),
          note: String(record.note || ''),
        }
      }
      const pendingReview = (Array.isArray(network.pendingReview) ? network.pendingReview : [])
        .filter((item) => item && item.projectId === selfProjectId)
        .map((item) => ({
          stream: item.stream,
          version: item.version,
          module: item.module,
          path: item.path,
        }))
      let summary
      if (self.review && Number.isFinite(Number(self.review.accepted))) {
        summary = {
          accepted: Number(self.review.accepted),
          reviewed: Number(self.review.reviewed) || 0,
          pending: Number(self.review.pending) || 0,
          percent: Number(self.review.percent) || 0,
        }
      } else {
        const accepted = Array.isArray(self.results) ? self.results.length : 0
        const reviewed = Object.values(byItem).filter((item) => item.satisfied).length
        summary = {
          accepted,
          reviewed,
          pending: Math.max(0, accepted - reviewed),
          percent: accepted > 0 ? Math.round((reviewed / accepted) * 100) : 0,
        }
      }
      review = { byItem, pendingReview, summary }
    }
  }

  sendJson(res, 200, {
    ok: true,
    project,
    results,
    status,
    errors,
    network,
    networkError,
    review,
  })
}

/**
 * 把 POST /bridge 请求映射为桥 CLI 的固定 argv（不含 executable）。
 * 只做白名单动作 + 严格参数校验；浏览器永远不能把任意字符串拼成命令。
 */
function buildBridgeInvocation(action, body, project) {
  const base = [action, '--project', project, '--json']
  switch (action) {
    case 'publish':
      return { argv: base }
    case 'pull':
      // 工作台需要看到消息内容：pull 固定追加 --write（bridge pull 的核心写盘开关）
      return { argv: [...base, '--write'] }
    case 'idea': {
      if (typeof body.text !== 'string') {
        return { error: true, code: 'E_ACTION', message: 'idea 需要 text（1–2000 字符）' }
      }
      const rawText = body.text
      const text = rawText.trim()
      if (text.length === 0 || charLength(rawText) > 2000) {
        return { error: true, code: 'E_ACTION', message: 'text 必须 1–2000 字符' }
      }
      const argv = [...base, '--text', text]
      if (body.tag !== undefined && body.tag !== null) {
        if (typeof body.tag !== 'string' || !BRIDGE_TAG_RE.test(body.tag.trim())) {
          return { error: true, code: 'E_ACTION', message: 'tag 非法（[A-Za-z0-9._-]{1,40}）' }
        }
        argv.push('--tag', body.tag.trim())
      }
      return { argv }
    }
    case 'review': {
      const streamRaw = body.stream
      const moduleRaw = body.module
      const hasStream =
        streamRaw !== undefined && streamRaw !== null && String(streamRaw).trim().length > 0
      const hasModule =
        moduleRaw !== undefined && moduleRaw !== null && String(moduleRaw).trim().length > 0
      if (!hasStream && !hasModule) {
        return { error: true, code: 'E_ACTION', message: 'review 需要 stream 或 module 至少一个' }
      }
      const argv = [...base]
      if (hasStream) {
        if (typeof streamRaw !== 'string' || !BRIDGE_STREAM_RE.test(streamRaw.trim())) {
          return { error: true, code: 'E_ACTION', message: 'stream 非法（[A-Za-z0-9][A-Za-z0-9._-]{0,99}）' }
        }
        argv.push('--stream', streamRaw.trim())
      }
      if (hasModule) {
        const moduleCheck = validateNodeIdField(moduleRaw, '模块 id')
        if (moduleCheck.error) return moduleCheck
        argv.push('--module', moduleCheck.id)
      }
      if (body.version !== undefined && body.version !== null) {
        const version = Number(body.version)
        if (!Number.isInteger(version) || version < 1) {
          return { error: true, code: 'E_ACTION', message: 'version 必须是正整数' }
        }
        argv.push('--version', String(version))
      }
      if (body.satisfied !== undefined) {
        if (typeof body.satisfied !== 'boolean') {
          return { error: true, code: 'E_ACTION', message: 'satisfied 必须是布尔值' }
        }
        if (body.satisfied === false) argv.push('--not-satisfied')
      }
      if (body.note !== undefined && body.note !== null) {
        if (typeof body.note !== 'string') {
          return { error: true, code: 'E_ACTION', message: 'note 必须是字符串' }
        }
        const note = body.note.trim()
        if (charLength(note) > 500) {
          return { error: true, code: 'E_ACTION', message: 'note 超过 500 字符' }
        }
        if (note.length > 0) argv.push('--note', note)
      }
      return { argv }
    }
    default:
      return { error: true, code: 'E_ACTION', message: `未知 bridge action: ${action}` }
  }
}

/** POST /bridge：参数校验后异步运行 TeamMCP 路由桥（60s 超时）。 */
async function handleBridgePost(req, res, registry) {
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }

  const action = typeof parsed.action === 'string' ? parsed.action.trim() : ''
  if (!BRIDGE_ACTIONS.includes(action)) {
    sendJson(res, 400, { ok: false, code: 'E_ACTION', message: `未知 bridge action: ${action || '(空)'}` })
    return
  }

  const projectCheck = validateProjectRoot(parsed.project)
  if (projectCheck.error) {
    sendJson(res, projectCheck.status, {
      ok: false,
      code: projectCheck.code,
      message: projectCheck.message,
    })
    return
  }
  const project = projectCheck.root
  if (!isExistingFile(BRIDGE_PATH)) {
    sendJson(res, 500, {
      ok: false,
      code: 'E_BRIDGE',
      message: `TeamMCP 路由桥不存在：${BRIDGE_PATH}`,
    })
    return
  }

  const invocation = buildBridgeInvocation(action, parsed, project)
  if (invocation.error) {
    sendJson(res, 400, { ok: false, code: invocation.code, message: invocation.message })
    return
  }

  let run
  try {
    run = registry.spawnRun(`bridge:${action}`, invocation.argv, {
      tool: BRIDGE_PATH,
      cwd: KIT_ROOT,
      timeoutMs: BRIDGE_TIMEOUT_MS,
    })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      code: 'E_BRIDGE',
      message: `TeamMCP 路由桥启动失败：${String(error && error.message ? error.message : error)}`,
    })
    return
  }
  sendJson(res, 200, { ok: true, run })
}

/** POST /config：保存工作台配置（原子写）。 */
async function handleConfigPost(req, res) {
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }
  const projectRoot = parsed.projectRoot
  if (typeof projectRoot !== 'string' || !isAbsolute(projectRoot) || !isExistingDir(projectRoot)) {
    sendJson(res, 400, {
      ok: false,
      code: 'E_PATH',
      message: 'projectRoot 必须是已存在的绝对目录',
    })
    return
  }
  const config = { version: 1, projectRoot: resolve(projectRoot) }
  try {
    writeConfigAtomic(config)
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      code: 'E_INTERNAL',
      message: String(error && error.message ? error.message : error),
    })
    return
  }
  sendJson(res, 200, { ok: true, config })
}

/**
 * 把一次 POST /run 请求映射为固定 argv 模板（不含宿主追加的 --root）。
 * @returns {{error:true, code:string, message:string}|{argv:string[]}}
 */
function buildRunInvocation(action, body, project) {
  const handoffFor = (key = 'handoff') => validateHandoffPath(project, body[key], { requireExists: true })

  switch (action) {
    case 'status':
      return { argv: ['status', '--json'] }
    case 'verify':
      return { argv: ['verify', '--json'] }
    case 'list':
      return { argv: ['list', '--json'] }
    case 'report':
      return { argv: ['report'] }
    case 'check': {
      const handoff = handoffFor()
      if (handoff.error) return handoff
      return { argv: ['check', handoff.rel, '--strict'] }
    }
    case 'submit': {
      const handoff = handoffFor()
      if (handoff.error) return handoff
      const by = safeToken(body.by, 'ui')
      return { argv: ['submit', handoff.rel, '--by', by] }
    }
    case 'accept':
    case 'reject':
    case 'block': {
      const handoff = handoffFor()
      if (handoff.error) return handoff
      const reason = validateReason(body.reason)
      if (reason.error) return reason
      const by = safeToken(body.by, action === 'block' ? 'ui' : 'main')
      return { argv: [action, handoff.rel, '--reason', reason.reason, '--by', by] }
    }
    case 'unblock': {
      const handoff = handoffFor()
      if (handoff.error) return handoff
      return { argv: ['unblock', handoff.rel] }
    }
    case 'state-set': {
      const argv = ['state', 'set']
      let used = false
      if (body.phase !== undefined) {
        if (typeof body.phase !== 'string' || !PHASES.includes(body.phase)) {
          return { error: true, code: 'E_ACTION', message: `phase 非法：${String(body.phase)}` }
        }
        argv.push('--phase', body.phase)
        used = true
      }
      for (const [field, flag] of [
        ['next', '--next'],
        ['blocker', '--blocker'],
      ]) {
        const value = body[field]
        if (value === undefined || value === null) continue
        if (typeof value !== 'string') {
          return { error: true, code: 'E_ACTION', message: `${field} 必须是字符串` }
        }
        const trimmed = value.trim()
        if (trimmed.length === 0) continue
        if (trimmed.length > MAX_TEXT_FIELD_CHARS) {
          return { error: true, code: 'E_ACTION', message: `${field} 超过 ${MAX_TEXT_FIELD_CHARS} 字符` }
        }
        argv.push(flag, trimmed)
        used = true
      }
      // v3.10：研究目标也能从「研究目标 · 智能体会话」里写回。
      // DAG CLI 本来就支持 `state set --goal`（cmdStateSet），此前宿主层没透传，
      // 导致目标只能在 init 时设定、之后无法更新——这是「研究目标改不动」的根因。
      if (body.goal !== undefined && body.goal !== null) {
        if (typeof body.goal !== 'string') {
          return { error: true, code: 'E_ACTION', message: 'goal 必须是字符串' }
        }
        const goalText = body.goal.trim()
        if (goalText.length > 0) {
          if (charLength(goalText) > GOAL_MAX_CHARS) {
            return { error: true, code: 'E_ACTION', message: `goal 不能超过 ${GOAL_MAX_CHARS} 字` }
          }
          argv.push('--goal', goalText)
          used = true
        }
      }
      if (!used) {
        return {
          error: true,
          code: 'E_ACTION',
          message: 'state-set 至少需要 phase/goal/next/blocker 之一',
        }
      }
      return { argv }
    }
    case 'results':
      return { argv: ['results', '--json'] }
    case 'auto': {
      const argv = ['auto', '--json']
      // CONTRACT v1.2：body.dryRun === true → argv auto --json --dry-run（顺序固定）
      if (body.dryRun === true) argv.push('--dry-run')
      return { argv }
    }
    case 'init': {
      const rootCheck = validateInitRoot(body.root)
      if (rootCheck.error) return rootCheck
      const idCheck = validateNodeIdField(body.id, '项目 id')
      if (idCheck.error) return idCheck
      const titleCheck = validateInitTitle(body.title)
      if (titleCheck.error) return titleCheck
      const goalCheck = validateOptionalGoal(body.goal)
      if (goalCheck.error) return goalCheck
      const argv = ['init', rootCheck.root, '--id', idCheck.id, '--title', titleCheck.title]
      if (goalCheck.goal !== null) argv.push('--goal', goalCheck.goal)
      return { argv, root: rootCheck.root }
    }
    case 'module-add': {
      const idCheck = validateNodeIdField(body.id, '模块 id')
      if (idCheck.error) return idCheck
      const nameCheck = validateNameField(body.name)
      if (nameCheck.error) return nameCheck
      const slugCheck = validateOptionalSlug(body.slug)
      if (slugCheck.error) return slugCheck
      const argv = ['module', 'add', '--id', idCheck.id, '--name', nameCheck.name]
      if (slugCheck.slug !== null) argv.push('--slug', slugCheck.slug)
      return { argv }
    }
    case 'branch-add': {
      const moduleCheck = validateNodeIdField(body.module, '模块 id')
      if (moduleCheck.error) return moduleCheck
      if (!isModuleRegistered(project, moduleCheck.id)) {
        return {
          error: true,
          code: 'E_ACTION',
          message: `模块未注册：${moduleCheck.id}（先运行 module-add）`,
        }
      }
      const idCheck = validateNodeIdField(body.id, '分支 id')
      if (idCheck.error) return idCheck
      const nameCheck = validateNameField(body.name, 'name')
      if (nameCheck.error) return nameCheck
      const slugCheck = validateOptionalSlug(body.slug)
      if (slugCheck.error) return slugCheck
      const argv = [
        'branch',
        'new',
        '--module',
        moduleCheck.id,
        '--id',
        idCheck.id,
        '--name',
        nameCheck.name,
      ]
      if (slugCheck.slug !== null) argv.push('--slug', slugCheck.slug)
      if (body.mode === 'spike') argv.push('--mode', 'spike')
      return { argv }
    }
    case 'handoff-new': {
      if (typeof body.branch !== 'string' || body.branch.trim().length === 0) {
        return { error: true, code: 'E_ACTION', message: 'handoff-new 需要 branch（已注册分支 id）' }
      }
      const branchId = body.branch.trim()
      if (!isBranchRegistered(project, branchId)) {
        return {
          error: true,
          code: 'E_ACTION',
          message: `分支未注册：${branchId}（先运行 branch-add）`,
        }
      }
      const streamCheck = validateOptionalStream(body.stream)
      if (streamCheck.error) return streamCheck
      // CONTRACT v1.2 字段名为 label；同时兼容 v1.1 客户端使用的 slug。
      const rawLabel = body.label !== undefined ? body.label : body.slug
      const labelCheck = validateOptionalLabel(rawLabel)
      if (labelCheck.error) return labelCheck
      const argv = ['handoff', 'new', '--branch', branchId]
      if (streamCheck.stream !== null) argv.push('--stream', streamCheck.stream)
      if (labelCheck.label !== null) argv.push('--slug', labelCheck.label)
      return { argv }
    }
    case 'unsubmit': {
      const handoff = handoffFor('handoff')
      if (handoff.error) return handoff
      const argv = ['unsubmit', handoff.rel]
      if (body.reason) {
        const reason = validateReason(body.reason)
        if (reason.error) return reason
        argv.push('--reason', reason.reason)
      }
      if (body.by) {
        argv.push('--by', safeToken(body.by, 'ui'))
      }
      return { argv }
    }
    case 'compare': {
      const left = handoffFor('left')
      if (left.error) return left
      const right = handoffFor('right')
      if (right.error) return right
      return { argv: ['compare', left.rel, right.rel, '--json'] }
    }
    case 'sync-accepted': {
      return { argv: ['sync-accepted'] }
    }
    case 'review-compile': {
      const argv = ['review-compile', '--json']
      if (body.branch) {
        const b = validateNodeIdField(body.branch, '分支 id')
        if (b.error) return b
        argv.push('--branch', b.id)
      }
      if (body.out) {
        const rawOut = String(body.out).trim()
        if (rawOut.length === 0 || rawOut.includes('..') || rawOut.startsWith('/') || /^[A-Za-z]:/.test(rawOut)) {
          return { error: true, code: 'E_PATH', message: 'out 路径必须是项目内相对路径' }
        }
        argv.push('--out', rawOut)
      }
      return { argv }
    }
    case 'sprout': {
      const moduleCheck = validateNodeIdField(body.module, '模块 id')
      if (moduleCheck.error) return moduleCheck
      const idCheck = validateNodeIdField(body.id, '分支 id')
      if (idCheck.error) return idCheck
      const argv = ['sprout', '--module', moduleCheck.id, '--id', idCheck.id]
      if (body.name) argv.push('--name', String(body.name).trim())
      if (body.prompt) argv.push('--prompt', String(body.prompt).trim())
      if (body.mode === 'spike') argv.push('--mode', 'spike')
      if (body.noHandoff === true) argv.push('--no-handoff')
      // v3.2：从已有分支分叉（不传则从主支创建分支）
      if (body.from !== undefined && body.from !== null && String(body.from).trim()) {
        const fromCheck = validateNodeIdField(body.from, '父分支 id')
        if (fromCheck.error) return fromCheck
        argv.push('--from', fromCheck.id)
      }
      return { argv }
    }
    case 'graft': {
      const handoff = handoffFor('handoff')
      if (handoff.error) return handoff
      const argv = ['graft', handoff.rel]
      if (body.reason) {
        const r = validateReason(body.reason)
        if (r.error) return r
        argv.push('--reason', r.reason)
      }
      // v3.13：chain=true 表示「逐级回连」——本分支→父分支→…→主支成稿，每级先备份
      if (body.chain === true) argv.push('--chain')
      return { argv }
    }
    case 'message': {
      // v3.2：分支之间通讯。投递（--to/--from/--text）或读收件箱（--branch）。
      if (body.branch !== undefined && body.branch !== null && String(body.branch).trim() && !body.to) {
        const branchCheck = validateNodeIdField(body.branch, '分支 id')
        if (branchCheck.error) return branchCheck
        return { argv: ['message', '--branch', branchCheck.id, '--json'] }
      }
      const toCheck = validateNodeIdField(body.to, '收信分支 id')
      if (toCheck.error) return toCheck
      const fromCheck = validateNodeIdField(body.from, '发信分支 id')
      if (fromCheck.error) return fromCheck
      const text = body.text
      if (typeof text !== 'string' || text.trim().length === 0) {
        return { error: true, code: 'E_ACTION', message: 'message 需要 text 内容' }
      }
      if (text.length > MAX_TEXT_FIELD_CHARS) {
        return { error: true, code: 'E_ACTION', message: `text 超过 ${MAX_TEXT_FIELD_CHARS} 字符` }
      }
      const argv = ['message', '--to', toCheck.id, '--from', fromCheck.id, '--text', text.trim(), '--json']
      if (typeof body.subject === 'string' && body.subject.trim()) {
        argv.push('--subject', body.subject.trim().slice(0, MAX_TEXT_FIELD_CHARS))
      }
      return { argv }
    }
    case 'context': {
      // v3.1：补建分支 CONTEXT.md。默认只补缺失；--force 重建全部。
      // v3.2：--clear 清除上下文档案（默认留 .bak 备份）。
      const argv = ['context', '--json']
      if (body.force === true) argv.push('--force')
      if (body.dryRun === true) argv.push('--dry-run')
      if (body.clear === true) argv.push('--clear')
      if (body.clearBackup === false) argv.push('--clear-backup=false')
      if (body.branch !== undefined && body.branch !== null && String(body.branch).trim()) {
        const branchCheck = validateNodeIdField(body.branch, '分支 id')
        if (branchCheck.error) return branchCheck
        argv.push('--branch', branchCheck.id)
      }
      return { argv }
    }
    default:
      return { error: true, code: 'E_ACTION', message: `未知 action: ${action}` }
  }
}

/** POST /run：校验后异步启动 CLI，立即返回 running 状态的 run 记录。 */
async function handleRunPost(req, res, registry) {
  const saved = readConfig()
  let raw
  try {
    raw = await readBody(req)
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体过大或读取失败' })
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体不是合法 JSON' })
    return
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, code: 'E_BODY', message: '请求体必须是 JSON 对象' })
    return
  }

  // 1) action 白名单
  const action = typeof parsed.action === 'string' ? parsed.action.trim() : ''
  if (!ACTIONS.includes(action)) {
    sendJson(res, 400, { ok: false, code: 'E_ACTION', message: `未知 action: ${action || '(空)'}` })
    return
  }

  // 2) init 特殊路径：目标是尚不存在的新项目，没有「已有 project」可校验；
  //    用 kit 自带工具、cwd = root 的父目录，argv 里已含绝对 root（不再追加 --root）。
  if (action === 'init') {
    const invocation = buildRunInvocation(action, parsed, null)
    if (invocation.error) {
      sendJson(res, 400, { ok: false, code: invocation.code, message: invocation.message })
      return
    }
    const tool = join(KIT_ROOT, 'tools', 'dag.mjs')
    const cwd = dirname(invocation.root)
    let run
    try {
      run = registry.spawnRun(action, invocation.argv, { tool, cwd })
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        code: 'E_INTERNAL',
        message: String(error && error.message ? error.message : error),
      })
      return
    }
    sendJson(res, 200, { ok: true, run })
    return
  }

  // 3) project 有效且是 DAG 项目（缺省取配置）
  const candidate =
    typeof parsed.project === 'string' && parsed.project.length > 0
      ? parsed.project
      : saved.data && typeof saved.data.projectRoot === 'string'
        ? saved.data.projectRoot
        : ''
  if (!candidate) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '缺少 project（且未配置项目）' })
    return
  }
  if (typeof candidate !== 'string' || !isAbsolute(candidate) || !isExistingDir(candidate)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: 'project 必须是已存在的绝对目录' })
    return
  }
  const project = resolve(candidate)
  if (!isDagProject(project)) {
    sendJson(res, 400, { ok: false, code: 'E_PROJECT', message: '不是研究项目（缺少 control/ledger.json）' })
    return
  }

  // 4) action 需要的 handoff / reason / phase / 创建字段等参数
  const invocation = buildRunInvocation(action, parsed, project)
  if (invocation.error) {
    sendJson(res, 400, { ok: false, code: invocation.code, message: invocation.message })
    return
  }
  const cliArgs = [...invocation.argv, '--root', project]
  const tool = resolveTool(project)
  let run
  try {
    run = registry.spawnRun(action, cliArgs, { tool, cwd: project })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      code: 'E_INTERNAL',
      message: String(error && error.message ? error.message : error),
    })
    return
  }
  sendJson(res, 200, { ok: true, run })
}

/** 构造前缀路由 handler（每个插件实例一个 run 注册表）。 */
function makeHandler(registry) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const pathname = url.pathname
      let route = null
      if (pathname === ROUTE_PREFIX) route = '/'
      else if (pathname.startsWith(`${ROUTE_PREFIX}/`)) route = pathname.slice(ROUTE_PREFIX.length)
      if (route === null) {
        sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `未知路由：${req.method ?? 'GET'} ${pathname}` })
        return
      }
      const method = String(req.method ?? 'GET').toUpperCase()

      if (method === 'GET' && route === '/health') return handleHealth(res)
      if (method === 'GET' && route === '/content') return handleContent(req, res, url)
      if (method === 'GET' && route === '/fishbone') return handleFishbone(req, res, url)
      // v2.1 主支成稿（SPINE-PIPELINE §7）
      if (method === 'GET' && route === '/spine') return handleSpine(req, res, url)
      if (method === 'POST' && route === '/spine-op') return handleSpineOp(req, res, registry)
      if (method === 'GET' && route === '/zotero') return handleZotero(req, res, url)
      if (method === 'POST' && route === '/zotero-op') return handleZoteroOp(req, res)
      if (method === 'POST' && route === '/rib-op') return handleRibOp(req, res)
      // v3.10 研究目标 · 好问题卡（八层框架 + good-question 的技能产物）
      if (method === 'GET' && route === '/goal-card') return handleGoalCard(req, res, url, 'GET')
      if (method === 'POST' && route === '/goal-card') return handleGoalCard(req, res, url, 'POST')
      if (method === 'GET' && route === '/leader-log') return handleLeaderLog(req, res, url)
      if (method === 'GET' && route === '/state') return handleState(req, res, url)
      if (method === 'GET' && route === '/handoff') return handleHandoff(req, res, url)
      if (method === 'GET' && route === '/file') return handleFile(req, res, url)
      if (method === 'GET' && route === '/branch-work') return handleBranchWork(req, res, url)
      if (method === 'POST' && route === '/branch-directive') return handleBranchDirective(req, res)
      if (method === 'POST' && route === '/mount-context') return handleMountContext(req, res)
      if (method === 'POST' && route === '/open-external') return handleOpenExternal(req, res)
      if (method === 'POST' && route === '/open-sidebar') return handleOpenSidebar(req, res, registry)
      if (method === 'GET' && route === '/results') return handleResults(req, res, url)
      if (method === 'POST' && route === '/config') return handleConfigPost(req, res)
      if (method === 'POST' && route === '/bridge') return handleBridgePost(req, res, registry)
      if (method === 'POST' && route === '/run') return handleRunPost(req, res, registry)
      if (method === 'GET' && route === '/run') {
        const id = url.searchParams.get('id') ?? ''
        const run = registry.view(id)
        if (!run) {
          sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `未知 run：${id}` })
          return
        }
        sendJson(res, 200, { ok: true, run })
        return
      }
      if (method === 'GET' && route === '/runs') {
        sendJson(res, 200, { ok: true, runs: registry.list() })
        return
      }
      sendJson(res, 404, { ok: false, code: 'E_NOT_FOUND', message: `未知路由：${method} ${route}` })
    } catch (error) {
      try {
        console.error('[research-dag-workbench]', error && error.stack ? error.stack : error)
      } catch {
        /* ignore */
      }
      if (!res.writableEnded) {
        sendJson(res, 500, {
          ok: false,
          code: 'E_INTERNAL',
          message: String(error && error.message ? error.message : error),
        })
      }
    }
  }
}

/* ------------------------------------------------------------- 插件入口 */

/**
 * 行配置（规范第 3.4 节：必须是 Schemastery schema，不能直接导出普通对象）。
 *
 * - `kitRoot`：research-dag 工具包根目录（含 tools/dag.mjs 与 examples/）。
 *   留空时按包自身位置解析，即本插件与工具包同仓库的场景。
 * - `routePrefix`：本机接口前缀，默认 `/research-dag-workbench`；
 *   仅在与其他插件冲突时需要改，不应占用 Desktop 的路径。
 */
export const Config = defineConfig(Schema)

/**
 * 应用宿主半侧。
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - 携带 `webServer` 的宿主上下文。
 * @param {{ kitRoot?: string, routePrefix?: string }} [config] - 行配置（见 `Config`）。
 */
export function apply(ctx, config = {}) {
  const options = config && typeof config === 'object' ? config : {}
  // 行配置可覆盖工具包根目录（cordis.patch.yml 的 config.row.root 走 !!js 表达式，
  // 与本字段二选一即可；默认按包自身位置解析）。
  if (typeof options.kitRoot === 'string' && options.kitRoot.length > 0) {
    setKitRoot(options.kitRoot)
  }

  const registry = new RunRegistry()
  const handler = makeHandler(registry)
  const prefix = typeof options.routePrefix === 'string' && options.routePrefix ? options.routePrefix : ROUTE_PREFIX
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: prefix,
        handler,
      }),
    `${name}: 本机接口 ${prefix}`,
  )
}
