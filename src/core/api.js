/**
 * 研究项目 DAG 工作台 — 宿主 HTTP API 客户端。
 *
 * 全部请求走宿主前缀路由 `/research-dag-workbench`（见 CONTRACT 第 2 节）。
 * 本模块只做 fetch + JSON 解析，不实现任何业务规则；错误统一转成 `{ok:false,...}`。
 */
import { ROUTE } from './constants.js'

/** 发一个请求并解析 JSON；网络/解析错误转成可展示的失败对象，不抛出。 */
async function requestJson(url, options) {
  let response = null
  try {
    response = await fetch(url, options)
  } catch (problem) {
    const message = problem && problem.message ? problem.message : String(problem)
    return { ok: false, code: 'E_NETWORK', message: `无法连接工作台宿主：${message}` }
  }
  let payload = null
  try {
    payload = await response.json()
  } catch (problem) {
    return { ok: false, code: 'E_CLIENT', message: '宿主响应不是合法 JSON' }
  }
  if (!payload || typeof payload !== 'object') {
    return { ok: false, code: 'E_CLIENT', message: '宿主响应为空' }
  }
  return payload
}

/** GET /health —— 插件元信息、可用 action、示例项目与配置路径。 */
export async function fetchHealth() {
  return requestJson(`${ROUTE}/health`)
}

/** GET /state[?project=...] —— 合并 status/verify/PROJECT_STATE 的项目快照。 */
export async function fetchState(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/state${query}`)
}

/** GET /results[?project=...] —— v1.2 结果视图数据（宿主透传 CLI results --json）。 */
export async function fetchResults(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/results${query}`)
}

/**
 * GET /content?project=... —— v2.1 内容页数据（results/status/network/review 合并）。
 * 旧宿主没有该路由时返回 {ok:false,...}，由面板做降级。
 */
export async function fetchContent(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/content${query}`)
}

/**
 * GET /leader-log?project=... —— v2.5 主智能体（控制层）对话与决策时间轴。
 */
export async function fetchLeaderLog(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/leader-log${query}`)
}

/**
 * GET /fishbone?project=... —— v2.4 项目流程视图数据（项目目标 + 主支 + 分支 + 关注项）。
 * 旧宿主没有该路由时返回 {ok:false,...}，由面板降级到内容页。
 */
export async function fetchFishbone(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/fishbone${query}`)
}

/**
 * POST /bridge —— TeamMCP 桥动作（publish / idea / review / pull）。
 * 返回 {ok:true, run}，与 /run 一样需要 settleRun 轮询。
 */
export async function postBridge(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/bridge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** POST /config —— 持久化项目根路径。 */
export async function saveConfig(projectRoot) {
  return requestJson(`${ROUTE}/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version: 1, projectRoot }),
  })
}

/** POST /run —— 提交一个白名单 action，返回 run 记录（status=running）。 */
export async function postAction(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/**
 * POST /rib-op —— v3.5 分支元操作（软删回收站/受阻/重命名/锚点）。
 * 不走 DAG CLI，只改 control/rdw-rib-meta.json，立即返回（无 run 轮询）。
 * body: { project, op: 'delete'|'restore'|'purge'|'empty-bin'|'block'|'unblock'|'rename'|'anchor', ribId?, ... }
 */
export async function postRibOp(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/rib-op`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** GET /file?project=...&path=... —— 读取项目内任意文件全文与元数据。 */
export async function fetchFile(project, path) {
  const target = typeof project === 'string' ? project.trim() : ''
  const relative = typeof path === 'string' ? path : ''
  const query = `?project=${encodeURIComponent(target)}&path=${encodeURIComponent(relative)}`
  return requestJson(`${ROUTE}/file${query}`)
}

/** GET /branch-work?project=...&module=...&branch=... —— 分支智能体工作区与对话详情。 */
export async function fetchBranchWork(project, moduleId, branchId) {
  const target = typeof project === 'string' ? project.trim() : ''
  const mod = typeof moduleId === 'string' ? moduleId : ''
  const br = typeof branchId === 'string' ? branchId : ''
  const query = `?project=${encodeURIComponent(target)}&module=${encodeURIComponent(mod)}&branch=${encodeURIComponent(br)}`
  return requestJson(`${ROUTE}/branch-work${query}`)
}

/** POST /branch-directive —— 向分支智能体下达指令或追问。 */
export async function postBranchDirective(project, moduleId, branchId, text, by) {
  return requestJson(`${ROUTE}/branch-directive`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project, module: moduleId, branch: branchId, text, by }),
  })
}

/** POST /mount-context —— 将分支的上下文档案（CONTEXT.md 等）挂载并同步到工作区，生成结构化对话提示词。 */
export async function postMountContext(project, moduleId, branchId, workspace) {
  return requestJson(`${ROUTE}/mount-context`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project, module: moduleId, branch: branchId, workspace }),
  })
}

/** POST /open-external —— 在系统文件资源管理器中定位文件。 */
export async function postOpenExternal(project, path) {
  return requestJson(`${ROUTE}/open-external`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project, path }),
  })
}

/** POST /open-sidebar —— 在 DSH 侧边栏编辑器里打开项目内文件/目录。
 *  宿主不支持面板直开时返回 { ok:false, code:'E_SIDEBAR_UNAVAILABLE', path:绝对路径 }，
 *  调用方据此提示用户让模型用 sidebar_open 打开，而不是假装成功。 */
export async function postOpenSidebar(project, path, sessionId) {
  const body = { project, path }
  if (typeof sessionId === 'string' && sessionId.trim()) body.sessionId = sessionId.trim()
  return requestJson(`${ROUTE}/open-sidebar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * GET /zotero?project=...&rib=...&q=...&collection=...
 * v3.8 Zotero 文献面板：一次取回「本分支已挂文献 + 关键词命中 + 合集树」。
 * Zotero 没开机时返回 { ok:true, available:false, error:'…' }，面板据此显示「未连接」。
 */
export async function fetchZotero(project, ribId, query, collectionKey) {
  const target = typeof project === 'string' ? project.trim() : ''
  const params = [`project=${encodeURIComponent(target)}`]
  if (typeof ribId === 'string' && ribId.trim()) params.push(`rib=${encodeURIComponent(ribId.trim())}`)
  if (typeof query === 'string' && query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`)
  if (typeof collectionKey === 'string' && collectionKey.trim()) {
    params.push(`collection=${encodeURIComponent(collectionKey.trim())}`)
  }
  return requestJson(`${ROUTE}/zotero?${params.join('&')}`)
}

/**
 * POST /zotero-op —— v3.8 分支文献挂载动作（只改 control/rdw-rib-meta.json）。
 * body: { project, ribId, op, keys?, collectionKey?, key?, kind? }
 *   op ∈ attach | detach | clear | import-collection | open
 */
export async function postZoteroOp(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/zotero-op`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** GET /handoff?project=...&path=... —— 单个交接全文与 frontmatter。 */
export async function fetchHandoff(project, path) {
  const target = typeof project === 'string' ? project.trim() : ''
  const relative = typeof path === 'string' ? path : ''
  const query = `?project=${encodeURIComponent(target)}&path=${encodeURIComponent(relative)}`
  return requestJson(`${ROUTE}/handoff${query}`)
}

/** GET /run?id=... —— 单条 run 记录。 */
export async function fetchRun(id) {
  return requestJson(`${ROUTE}/run?id=${encodeURIComponent(String(id || ''))}`)
}

/** GET /runs —— 最近运行记录（按启动时间倒序）。 */
export async function fetchRuns() {
  return requestJson(`${ROUTE}/runs`)
}

/**
 * 轮询一条 run 直到离开 running（或预算耗尽）。
 * 每拿到一次记录调用一次 onTick（用于实时刷新运行控制台）。
 */
export async function settleRun(id, onTick, budgetMs = 600000) {
  const deadline = Date.now() + (typeof budgetMs === 'number' ? budgetMs : 600000)
  for (;;) {
    const payload = await fetchRun(id)
    if (!payload || payload.ok === false || !payload.run) return payload && payload.run ? payload.run : null
    if (typeof onTick === 'function') onTick(payload.run)
    if (payload.run.status !== 'running') return payload.run
    if (Date.now() >= deadline) return payload.run
    await new Promise((done) => setTimeout(done, 600))
  }
}

/* ------------------------------------------------- v2.1 主支成稿（spine） */

/**
 * GET /spine?project=...[&stage=<id>] —— 主支成稿清单 + 续贯结论 + 统计语言 + 终稿状态。
 *
 * 传 stage 时额外带 `detail`（该主支成稿正文 draftRaw / 备份 / 小节预览）。
 * 旧项目没有 SPINE.json 时宿主返回 `{ok:true, exists:false, stages:[]}`，
 * 面板据此显示「建链引导」，而不是当成错误。
 */
export async function fetchSpine(project, stage) {
  const target = typeof project === 'string' ? project.trim() : ''
  const params = [`project=${encodeURIComponent(target)}`]
  if (typeof stage === 'string' && stage.trim()) params.push(`stage=${encodeURIComponent(stage.trim())}`)
  return requestJson(`${ROUTE}/spine?${params.join('&')}`)
}

/**
 * POST /spine-op —— 主支成稿动作，返回 {ok, run}，需用 settleRun 轮询。
 * body: { project, op: 'rebuild'|'backup'|'lock'|'unlock'|'write'|'dispatch'|'paper'|'chain', stage?, reason? }
 */
export async function postSpineOp(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/spine-op`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}



/**
 * GET /goal-card?project=... —— 读好问题卡 + 八层审计 + 缺项自检。
 * 旧宿主没有该路由 → 返回 {ok:false}，由面板降级（不显示目标卡编辑器）。
 */
export async function fetchGoalCard(project) {
  const target = typeof project === 'string' ? project.trim() : ''
  const query = target ? `?project=${encodeURIComponent(target)}` : ''
  return requestJson(`${ROUTE}/goal-card${query}`)
}

/**
 * POST /goal-card —— 写卡（只合并传入字段，未传的保持原值）。
 * body: { project, card, layers, syncGoal }
 */
export async function postGoalCard(body) {
  const payload = body && typeof body === 'object' ? body : {}
  return requestJson(`${ROUTE}/goal-card`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

