#!/usr/bin/env node
/**
 * `dsh-research-dag-workbench` 宿主半侧独立验收（PROTOCOL workbench CONTRACT §5.1）与 *
 * 不依与DSH 运行：直与import `lib/host.js`，用 mock `ctx.effect` / `ctx.webServer.register`
 * 捕获前缀路由，再与mock req/res 与handler，覆盖：
 *   A. 模块外形（name/inject/不导与Config/prefix 路由注册与 *   B. /health 字段
 *   C. /state 无配与 *   D. /config 校验与原子落盘（临时 DSH_HOME与 *   E. /state?project=<示例项目>：isDag、phase、verify.ok、handoff 数量与字与 *   F. /handoff 正例 + 路径越界 400
 *   G. 白名单：未知 action 400、status run 轮询 succeeded 与json.ok、无句柄字段
 *   H. 路径/reason/state-set 参数校验
 *   I. 真实动作：示例项与*临时副本**与accept 一与PROVISIONAL handoff与 *      /state 与ACCEPTED 与verify.ok；同时确认示例本体未被修与 *
 * 每次断言打印 OK/FAIL；有失败与exit 1与 *
 * 用法：node workbench/verify/verify-host.mjs
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BUNDLE = path.resolve(HERE, '..')
const KIT_ROOT = path.resolve(BUNDLE, '..')
const EXAMPLE = path.join(KIT_ROOT, 'examples', 'early-phosphate')
const ROUTE = '/research-dag-workbench'

/** 隔离 DSH_HOME，避免读写真与~/.dsh与*/
const ORIGINAL_DSH_HOME = process.env.DSH_HOME
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rdw-verify-'))
process.env.DSH_HOME = TMP
/** /content 与TeamMCP digest与bridge 的桥调用需要真实令牌库（~/.dsh 或原 DSH_HOME）与*/
const REAL_DSH_HOME = typeof ORIGINAL_DSH_HOME === 'string' ? ORIGINAL_DSH_HOME : ''
const CONFIG_FILE = path.join(TMP, 'research-dag-workbench', 'config.json')

const EXPECTED_ACTIONS = [
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
  'content',
  'fishbone',
  'leader-log',
]

/** 期望版本：直接读 package.json，发版时不必改测试。 */
const EXPECTED_VERSION = JSON.parse(fs.readFileSync(path.join(BUNDLE, 'package.json'), 'utf8')).version

const EXPECTED_BRIDGE_ACTIONS = ['publish', 'idea', 'review', 'pull']

const failures = []
let okCount = 0
const ok = (message) => {
  okCount += 1
  console.log(`  OK   ${message}`)
}
const bad = (message) => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const check = (condition, okMessage, badMessage) => {
  if (condition) ok(okMessage)
  else bad(badMessage)
}
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
const enc = (value) => encodeURIComponent(String(value))

/* --------------------------------------------------------------- http mock */

function makeRes() {
  const state = { status: 0, headers: null, body: '', ended: false }
  const res = {
    state,
    writeHead(status, headers) {
      state.status = status
      state.headers = headers
      return res
    },
    end(body) {
      state.body = body || ''
      state.ended = true
      return res
    },
  }
  Object.defineProperty(res, 'writableEnded', {
    get: () => state.ended,
  })
  return res
}

function makeReq(method, url, body) {
  const handlers = {}
  const req = {
    method,
    url,
    on(event, callback) {
      ;(handlers[event] = handlers[event] || []).push(callback)
      return req
    },
    destroy() {},
  }
  process.nextTick(() => {
    if (body !== undefined) {
      for (const callback of handlers.data || []) callback(Buffer.from(body, 'utf8'))
    }
    for (const callback of handlers.end || []) callback()
  })
  return req
}

async function call(handler, method, url, body) {
  const res = makeRes()
  await handler(makeReq(method, url, body), res)
  let payload = null
  try {
    payload = res.state.body ? JSON.parse(res.state.body) : null
  } catch {
    payload = null
  }
  return { status: res.state.status, payload, raw: res.state.body }
}

async function waitRun(handler, runId, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const response = await call(handler, 'GET', `${ROUTE}/run?id=${enc(runId)}`)
    const run = response.payload && response.payload.run
    if (response.status === 200 && run && run.status !== 'running') return run
    await sleep(200)
  }
  return null
}

const runFieldSet = [
  'id',
  'action',
  'argv',
  'status',
  'exitCode',
  'timedOut',
  'startedAt',
  'endedAt',
  'stdout',
  'stderr',
  'json',
]

const HANDLE_FIELDS = ['child', 'pid', 'socket', 'handles', '_handle', 'process']

function noHandleFields(record) {
  return HANDLE_FIELDS.every((field) => !Object.prototype.hasOwnProperty.call(record, field))
}

/* -------------------------------------------------------------------- main */

/* -------------------------------------------------------------------- main */

async function main() {
  console.log('研究项目 DAG 工作台宿主半侧独立验收（verify-host）')
  console.log(`  bundle   = ${BUNDLE}`)
  console.log(`  kitRoot  = ${KIT_ROOT}`)
  console.log(`  临时     = ${TMP}`)

  if (!fs.existsSync(EXAMPLE)) {
    bad(`示例项目不存在：${EXAMPLE}`)
    return
  }

  const mod = await import(pathToFileURL(path.join(BUNDLE, 'lib', 'host.js')).href)

  /* ------------------------------------------------------ A 模块外形与路由 */
  console.log('')
  console.log('A) 模块外形与路由注册')
  check(mod.name === 'dsh-research-dag-workbench', `export name = ${mod.name}`, `name 错误：${mod.name}`)
  check(Array.isArray(mod.inject) && mod.inject.includes('webServer'), `export inject = ${JSON.stringify(mod.inject)}`, 'inject 未声明 webServer')
  // 规范 3.4：Config 必须是 Schemastery schema（Standard Schema），不能是普通对象。
  check(mod.Config !== undefined, '导出 Config（规范 3.4 要求 Schemastery schema）', '缺少 Config 导出')
  check(
    Boolean(mod.Config && mod.Config['~standard'] && mod.Config['~standard'].version === 1),
    'Config 是 Standard Schema v1（~standard.version=1）',
    'Config 不是 Standard Schema v1',
  )
  check(
    typeof mod.Config.validate === 'function' && typeof mod.Config.vendor === 'string',
    'Config 提供 validate 与 vendor',
    'Config 缺少 validate/vendor',
  )
  check(
    typeof mod.apply === 'function' && mod.apply.length >= 1,
    'apply(ctx, config) 接受行配置',
    'apply 未接收 config',
  )

  let route = null
  let disposers = 0
  const ctx = {
    effect(fn) {
      const dispose = fn()
      if (typeof dispose === 'function') disposers += 1
      return dispose
    },
    webServer: {
      register(spec) {
        route = spec
        return () => {}
      },
    },
    on() {},
    get() {
      return undefined
    },
    inject(_names, callback) {
      callback(ctx)
    },
  }
  mod.apply(ctx)
  check(Boolean(route), '/research-dag-workbench 前缀路由已注册', '未注册前缀路由')
  check(route && route.kind === 'prefix', `route.kind = ${route && route.kind}`, 'route.kind 不是 prefix')
  check(route && route.path === ROUTE, `route.path = ${route && route.path}`, `route.path 错误：${route && route.path}`)
  check(typeof (route && route.handler) === 'function', 'handler 是函数', 'handler 不是函数')
  check(disposers > 0, 'ctx.effect 收到 disposer', 'ctx.effect 未收到 disposer')
  const handler = route.handler

  /* ------------------------------------------------------------- B /health */
  console.log('')
  console.log('B) GET /health')
  let response = await call(handler, 'GET', `${ROUTE}/health`)
  let payload = response.payload || {}
  check(response.status === 200 && payload.ok === true, '/health -> 200 ok', `/health 失败：${JSON.stringify(response).slice(0, 300)}`)
  check(payload.name === 'dsh-research-dag-workbench', 'health.name 正确', `health.name 错误：${payload.name}`)
  check(payload.version === EXPECTED_VERSION, `health.version = ${EXPECTED_VERSION}（读 package.json）`, `health.version 错误：${payload.version}`)
  check(payload.route === ROUTE, 'health.route 正确', `health.route 错误：${payload.route}`)
  check(
    JSON.stringify(payload.actions) === JSON.stringify(EXPECTED_ACTIONS),
    `health.actions = ${EXPECTED_ACTIONS.length} 个动作（含 content/fishbone）`,
    `health.actions 错误：${JSON.stringify(payload.actions)}`,
  )
  check(
    JSON.stringify(payload.bridgeActions) === JSON.stringify(EXPECTED_BRIDGE_ACTIONS),
    `health.bridgeActions = ${JSON.stringify(EXPECTED_BRIDGE_ACTIONS)}`,
    `health.bridgeActions 错误：${JSON.stringify(payload.bridgeActions)}`,
  )
  check(payload.networkAvailable === true, 'health.networkAvailable = true（桥文件存在）', `health.networkAvailable 错误：${payload.networkAvailable}`)
  check(
    typeof payload.kitRoot === 'string' && path.resolve(payload.kitRoot) === path.resolve(KIT_ROOT),
    'health.kitRoot 指向工具包根',
    `health.kitRoot 错误：${payload.kitRoot}`,
  )
  check(
    typeof payload.configPath === 'string' && path.resolve(payload.configPath) === path.resolve(CONFIG_FILE),
    'health.configPath 指向 DSH_HOME 下的配置',
    `health.configPath 错误：${payload.configPath}`,
  )
  check(
    typeof payload.example === 'string' && path.resolve(payload.example) === path.resolve(EXAMPLE),
    'health.example 指向示例项目',
    `health.example 错误：${payload.example}`,
  )

  /* -------------------------------------------------------- C /state 无配置 */
  console.log('')
  console.log('C) GET /state（无配置）')
  response = await call(handler, 'GET', `${ROUTE}/state`)
  payload = response.payload || {}
  check(
    response.status === 200 && payload.configured === false && payload.project === null,
    '/state 无配置 -> {configured:false, project:null}',
    `/state 无配置响应不符：${JSON.stringify(payload).slice(0, 300)}`,
  )

  /* ---------------------------------------------------- D /config 校验与落盘 */
  console.log('')
  console.log('D) POST /config 校验与落盘')
  response = await call(handler, 'POST', `${ROUTE}/config`, JSON.stringify({ projectRoot: 'relative/path' }))
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PATH',
    '相对 projectRoot -> 400 E_PATH',
    `相对 projectRoot 未被拒绝：${JSON.stringify(response).slice(0, 200)}`,
  )
  response = await call(handler, 'POST', `${ROUTE}/config`, '{not json')
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_BODY',
    '非法 JSON 请求体 -> 400 E_BODY',
    `非法 JSON 未被拒绝：${JSON.stringify(response).slice(0, 200)}`,
  )
  response = await call(handler, 'POST', `${ROUTE}/config`, JSON.stringify({ projectRoot: EXAMPLE }))
  check(
    response.status === 200 && response.payload && response.payload.ok === true,
    '合法 projectRoot 保存 -> 200 ok',
    `合法 projectRoot 保存失败：${JSON.stringify(response).slice(0, 300)}`,
  )
  let configWritten = false
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    configWritten = saved && path.resolve(saved.projectRoot) === path.resolve(EXAMPLE)
  } catch {
    configWritten = false
  }
  check(configWritten, `配置文件已写入 ${CONFIG_FILE}`, '配置文件未正确写入')
  response = await call(handler, 'GET', `${ROUTE}/state`)
  payload = response.payload || {}
  check(
    response.status === 200 && payload.configured === true,
    '/state 无 query 时使用已保存配置',
    `/state 未使用已保存配置：${JSON.stringify(payload).slice(0, 300)}`,
  )

  /* ------------------------------------------- E /state?project=示例项目 */
  console.log('')
  console.log('E) GET /state?project=示例项目')
  response = await call(handler, 'GET', `${ROUTE}/state?project=${enc(EXAMPLE)}`)
  payload = response.payload || {}
  const project = payload.project || {}
  check(response.status === 200 && payload.ok === true, '/state -> 200 ok', `/state 失败：${JSON.stringify(payload).slice(0, 300)}`)
  check(project.isDag === true, 'project.isDag = true', 'project.isDag 不为 true')
  check(project.id === 'early-phosphate', `project.id = ${project.id}`, `project.id 错误：${project.id}`)
  check(project.phase === 'analysis', `project.phase = ${project.phase}`, `project.phase 错误：${project.phase}`)
  check(Array.isArray(project.next_steps), 'project.next_steps 是数组', 'project.next_steps 不是数组')
  check(Array.isArray(project.blockers), 'project.blockers 是数组', 'project.blockers 不是数组')
  check(Array.isArray(project.modules) && project.modules.length === 6, `project.modules = ${(project.modules || []).length} 个`, 'project.modules 不是 6 个')
  check(Array.isArray(project.branches) && project.branches.length >= 13, `project.branches = ${(project.branches || []).length} 个（>=13）`, 'project.branches 少于 13 个')
  const branchShapeOk = (project.branches || []).every(
    (item) => item && typeof item.id === 'string' && typeof item.module === 'string' && typeof item.name === 'string' && typeof item.dir === 'string',
  )
  check(branchShapeOk, 'project.branches 字段（id/module/name/dir）齐全', 'project.branches 字段不齐全')
  check(Array.isArray(project.handoffs) && project.handoffs.length >= 10, `project.handoffs = ${(project.handoffs || []).length} 个（>=10）`, 'project.handoffs 少于 10 个')
  const handoffShapeOk = (project.handoffs || []).every(
    (item) => item && typeof item.path === 'string' && typeof item.module === 'string' && typeof item.status === 'string',
  )
  check(handoffShapeOk, 'handoff 字段（path/module/status）齐全', 'handoff 字段不齐全')
  const nonTerminal = ['DRAFT', 'PROVISIONAL', 'BLOCKED', 'REJECTED', 'SUPERSEDED']
  check(
    (project.handoffs || []).some((item) => nonTerminal.includes(item.status)),
    '示例中存在非终态 handoff 状态',
    '示例中没有非终态 handoff',
  )
  const counts = project.counts || {}
  const countsSum =
    Number(counts.draft || 0) +
    Number(counts.provisional || 0) +
    Number(counts.accepted || 0) +
    Number(counts.rejected || 0) +
    Number(counts.superseded || 0) +
    Number(counts.blocked || 0)
  check(countsSum === (project.handoffs || []).length, `counts 合计(${countsSum}) = handoff 数`, `counts 合计与 handoff 数不符：${countsSum} / ${(project.handoffs || []).length}`)
  check(Array.isArray(project.accepted) && project.accepted.length >= 5, `project.accepted = ${(project.accepted || []).length} 个（>=5）`, 'project.accepted 少于 5 个')
  check(Boolean(payload.verify && payload.verify.ok === true), 'verify.ok = true', `verify 未通过：${JSON.stringify(payload.verify).slice(0, 400)}`)
  check(
    payload.statusRaw && payload.statusRaw.phase === project.phase,
    'statusRaw.phase 与 project.phase 一致',
    'statusRaw 与 project.phase 不一致',
  )
  check(!payload.cliError, 'CLI 正常时无 cliError', `出现 cliError：${String(payload.cliError).slice(0, 300)}`)
  response = await call(handler, 'GET', `${ROUTE}/state?project=relative-dir`)
  payload = response.payload || {}
  check(
    response.status === 200 && payload.project && payload.project.exists === false,
    '/state 相对 project -> exists:false（不崩溃）',
    `/state 相对 project 响应不符：${JSON.stringify(payload).slice(0, 200)}`,
  )

  /* ----------------------------------------------- F /handoff 与路径越界 */
  console.log('')
  console.log('F) GET /handoff 与路径越界')
  const sampleHandoff = 'modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md'
  response = await call(handler, 'GET', `${ROUTE}/handoff?project=${enc(EXAMPLE)}&path=${enc(sampleHandoff)}`)
  payload = response.payload || {}
  check(response.status === 200 && payload.ok === true, '/handoff -> 200 ok', `/handoff 失败：${JSON.stringify(payload).slice(0, 300)}`)
  check(
    payload.frontmatter && typeof payload.frontmatter === 'object' && payload.frontmatter.status,
    'frontmatter 为扁平对象且含 status',
    `frontmatter 不符：${JSON.stringify(payload.frontmatter).slice(0, 200)}`,
  )
  check(String(payload.body || '').length > 50, 'body 含第 1 节正文', 'body 过短或为空')
  check(typeof payload.content === 'string' && payload.content.includes('---'), 'content 为完整文件全文', 'content 不完整')
  response = await call(handler, 'GET', `${ROUTE}/handoff?project=${enc(EXAMPLE)}&path=${enc('../../etc/passwd')}`)
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PATH',
    '越界路径 -> 400 E_PATH',
    `越界路径未被拒绝：${JSON.stringify(response).slice(0, 200)}`,
  )

  /* ----------------------------------- G /run 白名单与真实 status 运行 */
  console.log('')
  console.log('G) POST /run 白名单与真实 status 运行')
  const postRun = (body) => call(handler, 'POST', `${ROUTE}/run`, JSON.stringify(body))
  response = await postRun({ action: 'not-an-action', project: EXAMPLE })
  check(response.status === 400 && response.payload && response.payload.code === 'E_ACTION', '未知 action -> 400 E_ACTION', '未知 action 未被拒绝')
  try {
    fs.rmSync(CONFIG_FILE, { force: true })
  } catch {
    /* ignore */
  }
  response = await postRun({ action: 'status' })
  check(response.status === 400 && response.payload && response.payload.code === 'E_PROJECT', '无 project 且无配置 -> 400 E_PROJECT', '无 project 未被拒绝')
  // 复原配置，供后续段落使用
  await call(handler, 'POST', `${ROUTE}/config`, JSON.stringify({ projectRoot: EXAMPLE }))
  response = await postRun({ action: 'status', project: path.join(TMP, 'not-a-project') })
  check(response.status === 400 && response.payload && response.payload.code === 'E_PROJECT', '不存在 project -> 400 E_PROJECT', '不存在 project 未被拒绝')

  response = await postRun({ action: 'status', project: EXAMPLE })
  const statusRun = response.payload && response.payload.run
  check(response.status === 200 && statusRun && statusRun.status === 'running', 'POST /run status -> 200 且立即返回 run', `status run 失败：${JSON.stringify(response).slice(0, 300)}`)
  check(statusRun && statusRun.json === null, '未结束前 run.json = null', '未结束前 run.json 不为 null')
  const finishedStatus = statusRun ? await waitRun(handler, statusRun.id) : null
  check(
    Boolean(finishedStatus && finishedStatus.status === 'succeeded'),
    `run 轮询到 succeeded（${finishedStatus && finishedStatus.status}）`,
    `run 未成功：${JSON.stringify(finishedStatus && { status: finishedStatus.status, exitCode: finishedStatus.exitCode, stderr: String(finishedStatus.stderr || '').slice(-300) })}`,
  )
  check(Boolean(finishedStatus && finishedStatus.json && finishedStatus.json.ok === true), 'run.json.ok = true', `run.json 不符：${JSON.stringify(finishedStatus && finishedStatus.json).slice(0, 300)}`)
  check(
    Boolean(finishedStatus && String(finishedStatus.stdout || '').includes('"ok"')),
    'run.stdout 含真实 CLI 的 --json 输出',
    'run.stdout 不含 JSON',
  )
  check(
    Boolean(finishedStatus && noHandleFields(finishedStatus)),
    `run record 无句柄字段（${finishedStatus && Object.keys(finishedStatus).join(',')}）`,
    `run record 泄漏句柄字段：${finishedStatus && Object.keys(finishedStatus).join(',')}`,
  )
  const runKeys = finishedStatus ? Object.keys(finishedStatus).sort() : []
  check(
    JSON.stringify(runKeys) === JSON.stringify(runFieldSet.slice().sort()),
    `run record 字段与契约一致（${runKeys.length} 个）`,
    `run record 字段不符：${JSON.stringify(runKeys)}`,
  )

  /* ------------------------------------------- H 参数校验（路径/reason） */
  console.log('')
  console.log('H) 路径 / reason / state-set 参数校验')
  response = await postRun({ action: 'accept', project: EXAMPLE, handoff: '../../x.md', reason: 'ok' })
  check(response.status === 400 && response.payload && response.payload.code === 'E_PATH', 'handoff 路径逃逸 -> 400 E_PATH', 'handoff 越界未被拒绝')
  response = await postRun({ action: 'accept', project: EXAMPLE, handoff: sampleHandoff })
  check(response.status === 400 && response.payload && response.payload.code === 'E_REASON', 'accept 缺 reason -> 400 E_REASON', '缺 reason 未被拒绝')
  response = await postRun({ action: 'state-set', project: EXAMPLE })
  check(response.status === 400 && response.payload && response.payload.code === 'E_ACTION', 'state-set 无字段 -> 400 E_ACTION', 'state-set 空请求未被拒绝')

  /* --------------------------------- N v2.4 项目流程主线 GET /fishbone */
  console.log('')
  console.log('N) v2.4 项目流程主线 GET /fishbone（项目目标 / 主支 / 分支 / 关注项）')
  response = await call(handler, 'GET', `${ROUTE}/fishbone?project=${enc(EXAMPLE)}`)
  const fish = response.payload || {}
  check(response.status === 200 && fish.ok === true, 'GET /fishbone -> 200 ok', `fishbone 失败：${JSON.stringify(response).slice(0, 300)}`)
  check(Boolean(fish.head && fish.head.title), 'fishbone.head 含研究标题', `head = ${JSON.stringify(fish.head)}`)
  check(Boolean(fish.head && fish.head.phase), 'fishbone.head 含当前阶段', `head.phase 缺失`)
  check(Array.isArray(fish.spine) && fish.spine.length >= 5, `/fishbone.spine = ${(fish.spine || []).length} 段主支（>=5）`, 'spine 段数不足')
  check(Array.isArray(fish.ribs) && fish.ribs.length >= 10, `/fishbone.ribs = ${(fish.ribs || []).length} 根分支（>=10）`, 'ribs 数量不足')
  const firstSpine = (fish.spine || [])[0] || {}
  check(
    typeof firstSpine.id === 'string' && typeof firstSpine.name === 'string' && Array.isArray(firstSpine.ribs),
    'spine 节点字段齐全（id/name/ribs）',
    `spine[0] = ${JSON.stringify(firstSpine).slice(0, 200)}`,
  )
  const firstRib = (fish.ribs || []).find((rib) => rib && rib.id) || {}
  check(
    typeof firstRib.status === 'string' && Array.isArray(firstRib.workFiles) && Array.isArray(firstRib.outputFiles),
    'rib 字段齐全（status/workFiles/outputFiles）',
    `rib[0] = ${JSON.stringify(firstRib).slice(0, 220)}`,
  )
  check(
    Boolean(fish.ribs && fish.ribs.some((rib) => rib.hasSession)),
    'rib 反映智能体会话记录（hasSession）',
    '没有检测到 SESSION.md',
  )
  check(Array.isArray(fish.attention), '/fishbone.attention 是数组', 'attention 不是数组')
  check(
    Boolean(fish.totals && typeof fish.totals.modules === 'number' && typeof fish.totals.ribs === 'number'),
    'fishbone.totals 含 modules/ribs 计数',
    `totals = ${JSON.stringify(fish.totals)}`,
  )
  check(
    Boolean(fish.ribs && fish.ribs.some((rib) => rib.is_stale === true)),
    'rib 标出级联过期（is_stale）',
    '示例应有 1 根过期分支（cohort v2）',
  )
  response = await call(handler, 'GET', `${ROUTE}/fishbone`)
  const fishDefault = response.payload || {}
  check(
    (response.status === 200 && Boolean(fishDefault.head && fishDefault.head.id)) ||
      (response.status === 400 && fishDefault.ok === false),
    'GET /fishbone 不带 project -> 用配置项目（或明确报缺项目）',
    `默认项目响应不符：status=${response.status} body=${JSON.stringify(fishDefault).slice(0, 200)}`,
  )
  response = await call(handler, 'GET', `${ROUTE}/fishbone?project=${enc(path.join(TMP, 'not-a-project'))}`)
  check(
    response.status >= 400 && response.payload && response.payload.ok === false,
    'GET /fishbone 非项目目录 -> 4xx',
    `非项目未被拒绝：${response.status}`,
  )

  /* ------------------------------------------------ O /file 与 /branch-work */
  console.log('')
  console.log('O) v2.4 文件预览与智能体工作区（/file、/branch-work）')
  const csvPath = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_smd.csv'
  response = await call(handler, 'GET', `${ROUTE}/file?project=${enc(EXAMPLE)}&path=${enc(csvPath)}`)
  const filePayload = response.payload || {}
  check(response.status === 200 && filePayload.ok === true, 'GET /file -> 200 ok', `/file 失败：${JSON.stringify(filePayload).slice(0, 200)}`)
  check(
    typeof filePayload.content === 'string' && filePayload.content.includes('covariate'),
    '/file 返回文本内容',
    '/file 未返回文本内容',
  )
  check(filePayload.lines > 0 && filePayload.size > 0, `/file 元数据（lines=${filePayload.lines}, size=${filePayload.size}）`, '/file 元数据缺失')
  response = await call(handler, 'GET', `${ROUTE}/file?project=${enc(EXAMPLE)}&path=${enc('../../etc/passwd')}`)
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PATH',
    '/file 越界路径 -> 400 E_PATH',
    `越界路径未被拒绝：${response.status}`,
  )
  response = await call(handler, 'GET', `${ROUTE}/branch-work?project=${enc(EXAMPLE)}&module=M40&branch=B40-03`)
  const branchPayload = response.payload || {}
  check(response.status === 200 && branchPayload.ok === true, 'GET /branch-work -> 200 ok', `/branch-work 失败：${JSON.stringify(branchPayload).slice(0, 200)}`)
  check(
    Boolean(branchPayload.sessionNotes && branchPayload.sessionNotes.length > 0),
    '/branch-work 返回智能体会话记录',
    '会话记录为空',
  )
  check(
    Array.isArray(branchPayload.workFiles) && branchPayload.workFiles.length > 0,
    `/branch-work 返回工作文件（${(branchPayload.workFiles || []).length} 个）`,
    '工作文件为空',
  )
  check(
    typeof branchPayload.context === 'string' && branchPayload.context.length > 200,
    `/branch-work 返回 CONTEXT 上下文档案（${(branchPayload.context || '').length} 字符）`,
    'CONTEXT.md 缺失或过短：分支智能体将看不到主支上下文',
  )

  /* ------------------------------- O2 v3.1 侧边栏打开（/open-sidebar） */
  console.log('')
  console.log('O2) v3.1 在 DSH 侧边栏打开文件（POST /open-sidebar）')
  response = await call(
    handler,
    'POST',
    `${ROUTE}/open-sidebar`,
    JSON.stringify({ project: EXAMPLE, path: 'modules/M40-statistics/branches/B40-03-iptw/work/SESSION.md' }),
  )
  const sidebarPayload = response.payload || {}
  check(
    // 501 = 宿主未开放面板直开（当前版本），此时必须如实回报并给出绝对路径
    response.status === 200 || response.status === 501,
    `/open-sidebar -> 200 或 501（实际 ${response.status}）`,
    `unexpected status: ${response.status} ${JSON.stringify(sidebarPayload).slice(0, 200)}`,
  )
  check(
    typeof sidebarPayload.path === 'string' && sidebarPayload.path.length > 0,
    '/open-sidebar 回报绝对路径（供模型 sidebar_open 使用）',
    '未回报绝对路径',
  )
  if (response.status === 501) {
    check(
      sidebarPayload.code === 'E_SIDEBAR_UNAVAILABLE',
      '/open-sidebar 不支持时使用 E_SIDEBAR_UNAVAILABLE（如实告知，不假装成功）',
      `code 异常：${sidebarPayload.code}`,
    )
  }
  response = await call(
    handler,
    'POST',
    `${ROUTE}/open-sidebar`,
    JSON.stringify({ project: EXAMPLE, path: '../../etc/passwd' }),
  )
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PATH',
    '/open-sidebar 越界路径 -> 400 E_PATH',
    `越界路径未被拒绝：${response.status}`,
  )
  response = await call(
    handler,
    'POST',
    `${ROUTE}/open-sidebar`,
    JSON.stringify({ project: EXAMPLE, path: 'no/such/file.md' }),
  )
  check(
    response.status === 404 && response.payload && response.payload.code === 'E_NOT_FOUND',
    '/open-sidebar 不存在路径 -> 404',
    `不存在路径未被拒绝：${response.status}`,
  )

  /* ------------------------------- P v2.5 主智能体对话（/leader-log） */
  console.log('')
  console.log('P) v2.5 主智能体决策与想法时间轴（GET /leader-log）')
  /* ------------------------------- O3 v3.2 分支溯源 / 同伴 / 收件箱 */
  console.log('')
  console.log('O3) v3.2 分支分叉溯源、同伴名单与收件箱（GET /branch-work）')
  response = await call(handler, 'GET', `${ROUTE}/branch-work?project=${enc(EXAMPLE)}&module=M40&branch=B40-03`)
  const rib2 = response.payload || {}
  check(Array.isArray(rib2.siblings), `/branch-work 返回同伴分支（${(rib2.siblings || []).length} 根）`, 'siblings 缺失')
  check(
    Array.isArray(rib2.inbox) || (rib2.inbox && typeof rib2.inbox.messages === 'number'),
    '/branch-work 返回收件箱结构',
    'inbox 缺失',
  )
  check(
    Object.prototype.hasOwnProperty.call(rib2.branch || {}, 'parent'),
    '/branch-work 分支信息含 parent 字段（可为 null）',
    'branch.parent 缺失',
  )

  response = await call(handler, 'GET', `${ROUTE}/leader-log?project=${enc(EXAMPLE)}`)
  const leader = response.payload || {}
  check(response.status === 200 && leader.ok === true, 'GET /leader-log -> 200 ok', `/leader-log 失败：${JSON.stringify(leader).slice(0, 300)}`)
  check(
    Array.isArray(leader.decisions) && leader.decisions.length >= 10,
    `/leader-log.decisions = ${(leader.decisions || []).length} 条（>=10）`,
    'decisions 数量不足',
  )
  const firstDecision = (leader.decisions || [])[0] || {}
  check(
    typeof firstDecision.id === 'string' && firstDecision.id.startsWith('D-'),
    `decision.id 形如 D-0001（${firstDecision.id}）`,
    `decision.id 异常：${firstDecision.id}`,
  )
  check(
    typeof firstDecision.action === 'string' && firstDecision.action.length > 0,
    `decision.action 非空（${firstDecision.action}）`,
    'decision.action 为空',
  )
  check(
    typeof firstDecision.reason === 'string' && firstDecision.reason.length > 0,
    'decision.reason（裁决理由）非空',
    'decision.reason 为空',
  )
  check(
    Array.isArray(leader.ideas) && leader.ideas.length >= 2,
    `/leader-log.ideas = ${(leader.ideas || []).length} 条（>=2）`,
    'ideas 数量不足',
  )
  check(
    Array.isArray(leader.reviews) && leader.reviews.length >= 3,
    `/leader-log.reviews = ${(leader.reviews || []).length} 条（>=3）`,
    'reviews 数量不足',
  )
  check(
    Boolean(leader.state && leader.state.phase),
    `leader.state.phase = ${leader.state && leader.state.phase}`,
    'state.phase 缺失',
  )
  check(
    Array.isArray(leader.state && leader.state.nextSteps) && leader.state.nextSteps.length > 0,
    `主智能体下一步 ${(leader.state && leader.state.nextSteps) || []} 条`,
    '下一步为空',
  )
  check(
    Array.isArray(leader.timeline) && leader.timeline.length >= 15,
    `/leader-log.timeline = ${(leader.timeline || []).length} 条（>=15，合并裁决/想法/复核）`,
    'timeline 数量不足',
  )
  check(
    Boolean(leader.timeline && leader.timeline.some((item) => item.kind === 'decision')) &&
      Boolean(leader.timeline && leader.timeline.some((item) => item.kind === 'idea')) &&
      Boolean(leader.timeline && leader.timeline.some((item) => item.kind === 'review')),
    'timeline 三类记录齐全（decision / idea / review）',
    'timeline 缺少某些类别',
  )
  const leaderTimes = (leader.timeline || []).map((item) => item.sortAt || '')
  const sortedDesc = leaderTimes.every((value, index) => index === 0 || leaderTimes[index - 1] >= value)
  check(sortedDesc, 'timeline 按时间倒序', 'timeline 未按时间倒序')
  check(
    Boolean(leader.counts && leader.counts.decisions === (leader.decisions || []).length),
    'leader.counts.decisions 与数组长度一致',
    `counts 不一致：${JSON.stringify(leader.counts)}`,
  )
  response = await call(handler, 'GET', `${ROUTE}/leader-log`)
  check(
    response.status === 200 && response.payload && response.payload.ok === true,
    'GET /leader-log 不带 project -> 用配置项目',
    `/leader-log 默认项目失败：${response.status}`,
  )
  response = await call(handler, 'GET', `${ROUTE}/leader-log?project=${enc(path.join(TMP, 'not-a-project'))}`)
  check(
    response.status >= 400 && response.payload && response.payload.ok === false,
    'GET /leader-log 非项目目录 -> 4xx',
    `非项目未被拒绝：${response.status}`,
  )

  /* ------------------------------- Q v3.8 Zotero 文献接入（挂载 / 合集 / 定位） */
  console.log('')
  console.log('Q) v3.8 Zotero 文献接入（挂载 / 合集导入 / 定位协议）')
  // 在临时目录里复制示例项目：绝对不往示例项目本体写 rdw-rib-meta.json。
  const zotProj = path.join(TMP, 'zotero-proj')
  const exampleMetaPath = path.join(EXAMPLE, 'control', 'rdw-rib-meta.json')
  // 示例项目本身可能早已有 meta（历史会话留下的），所以判据是「字节不变」而不是「文件不存在」。
  const exampleMetaBefore = fs.existsSync(exampleMetaPath) ? fs.readFileSync(exampleMetaPath) : null
  try {
    fs.rmSync(zotProj, { recursive: true, force: true })
    fs.cpSync(EXAMPLE, zotProj, { recursive: true })
  } catch (error) {
    bad(`复制示例项目失败：${error && error.message}`)
    return
  }
  // 测试副本必须从「零挂载」开始：示例项目可能残留历史会话挂在 B10-01 上的文献，
  // 但本用例要断言「挂载 → 解挂后为空」，若继承残留就永远不成立（挂载的是不同 key）。
  // 只清副本，不碰示例本体。
  try {
    fs.rmSync(path.join(zotProj, 'control', 'rdw-rib-meta.json'), { force: true })
  } catch {
    /* 文件不存在即已干净 */
  }
  const ZOT_RIB = 'B10-01'
  const ZOT_KEY = '3QFYZA46'

  // Q1) /health 声明 Zotero 能力（与真实可用性解耦：探活走 /zotero）
  response = await call(handler, 'GET', `${ROUTE}/health`)
  check(
    Boolean(response.payload && response.payload.capabilities && response.payload.capabilities.zotero === true),
    '/health.capabilities.zotero = true',
    `capabilities 未声明 zotero：${JSON.stringify(response.payload && response.payload.capabilities)}`,
  )

  // Q2) GET /zotero 基本形状（Zotero 关着也必须 200，降级为 available:false）
  response = await call(handler, 'GET', `${ROUTE}/zotero?project=${enc(zotProj)}&rib=${ZOT_RIB}`)
  const zotBase = response.payload || {}
  check(response.status === 200 && zotBase.ok === true, 'GET /zotero -> 200 ok', `/zotero 失败：${JSON.stringify(zotBase).slice(0, 300)}`)
  check(typeof zotBase.available === 'boolean', '/zotero.available 是布尔（未开机也不报错）', 'available 缺失')
  check(Array.isArray(zotBase.linked), '/zotero.linked 是数组', 'linked 缺失')
  const zoteroLive = zotBase.available === true
  if (!zoteroLive) {
    // 没开机时也不该假装有数据：必须给出中文原因。
    check(
      typeof zotBase.error === 'string' && zotBase.error.length > 0,
      `Zotero 未连接时给出原因（${zotBase.error}）`,
      '未连接却未给 error',
    )
  } else {
    check(
      Array.isArray(zotBase.collections) && zotBase.collections.length > 0,
      `/zotero.collections = ${(zotBase.collections || []).length} 个合集`,
      '未返回合集树',
    )
    const firstCol = (zotBase.collections || [])[0] || {}
    check(
      typeof firstCol.key === 'string' && typeof firstCol.name === 'string' && Number.isFinite(firstCol.depth),
      `合集条目形如 { key, name, depth }（${firstCol.name}）`,
      `合集条目字段不全：${JSON.stringify(firstCol).slice(0, 200)}`,
    )
  }

  // Q3) 参数校验（与 Zotero 是否在跑无关）
  response = await call(handler, 'GET', `${ROUTE}/zotero?project=${enc(path.join(TMP, 'not-a-project'))}`)
  check(
    response.status >= 400 && response.payload && response.payload.ok === false,
    '/zotero 非项目目录 -> 4xx',
    `非项目未被拒绝：${response.status}`,
  )
  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'attach', keys: ['bad-key'] }))
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PARAM',
    '/zotero-op 非法 key -> 400 E_PARAM',
    `非法 key 未被拒绝：${response.status} ${JSON.stringify(response.payload).slice(0, 200)}`,
  )
  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: 'B99-99', op: 'attach', keys: [ZOT_KEY] }))
  check(
    response.status === 404 && response.payload && response.payload.code === 'E_NOT_FOUND',
    '/zotero-op 未知分支 -> 404 E_NOT_FOUND',
    `未知分支未被拒绝：${response.status}`,
  )
  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'nope' }))
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PARAM',
    '/zotero-op 未知 op -> 400 E_PARAM',
    `未知 op 未被拒绝：${response.status}`,
  )

  // Q4) 挂载 → 读回 → 项目流程下发 → 解挂 → 清空（写的是**副本**，不是示例本体）
  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'attach', keys: [ZOT_KEY] }))
  const attached = response.payload || {}
  check(
    response.status === 200 && attached.ok === true && Array.isArray(attached.itemKeys) && attached.itemKeys.includes(ZOT_KEY),
    `/zotero-op attach 写入 ${ZOT_KEY}`,
    `attach 失败：${JSON.stringify(attached).slice(0, 300)}`,
  )

  response = await call(handler, 'GET', `${ROUTE}/fishbone?project=${enc(zotProj)}`)
  const zotFish = (response.payload && Array.isArray(response.payload.ribs) ? response.payload.ribs : []).find((rib) => rib.id === ZOT_RIB)
  check(
    Boolean(zotFish && zotFish.zotero && Array.isArray(zotFish.zotero.itemKeys) && zotFish.zotero.itemKeys.includes(ZOT_KEY)),
    '/fishbone 每根分支下发 zotero 挂载关系',
    `/fishbone 未下发 zotero：${JSON.stringify(zotFish && zotFish.zotero)}`,
  )
  check(
    Boolean(response.payload && response.payload.zotero && response.payload.zotero.linkedItems >= 1),
    `/fishbone.zotero.linkedItems = ${response.payload && response.payload.zotero && response.payload.zotero.linkedItems}（>=1）`,
    'fishbone.zotero 汇总未计数',
  )

  // meta 落在副本自己的 control/ 下，示例本体必须没有这个文件。
  check(
    fs.existsSync(path.join(zotProj, 'control', 'rdw-rib-meta.json')),
    '挂载关系写入项目 control/rdw-rib-meta.json',
    'meta 文件未生成',
  )
  const exampleMetaAfter = fs.existsSync(exampleMetaPath) ? fs.readFileSync(exampleMetaPath) : null
  const exampleMetaUnchanged =
    (exampleMetaBefore === null && exampleMetaAfter === null) ||
    (exampleMetaBefore !== null && exampleMetaAfter !== null && exampleMetaBefore.equals(exampleMetaAfter))
  check(
    exampleMetaUnchanged,
    '示例项目本体未被写入（验收全程只写临时副本）',
    '示例项目被污染：control/rdw-rib-meta.json 被改写',
  )

  if (zoteroLive) {
    response = await call(handler, 'GET', `${ROUTE}/zotero?project=${enc(zotProj)}&rib=${ZOT_RIB}`)
    const linked = response.payload || {}
    check(
      Array.isArray(linked.items) && linked.items.length === 1 && linked.items[0].key === ZOT_KEY,
      `/zotero?rib= 取回已挂条目摘要（${linked.items && linked.items[0] && linked.items[0].title}）`,
      `未取回条目：${JSON.stringify(linked.items).slice(0, 200)}`,
    )
    check(
      typeof linked.items[0].title === 'string' && linked.items[0].title.length > 0,
      '条目含标题/作者/年份字段',
      '条目字段不全',
    )
  }

  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'detach', keys: [ZOT_KEY] }))
  check(
    response.status === 200 && response.payload && response.payload.ok === true && (response.payload.itemKeys || []).length === 0,
    '/zotero-op detach 解挂后为空',
    `detach 失败：${JSON.stringify(response.payload).slice(0, 200)}`,
  )

  // Q5) 从合集导入：Zotero 在跑时真导一次；没在跑必须明确 503（而不是静默成功）
  if (zoteroLive) {
    const cols = (zoteroLive && zotBase.collections) || []
    const candidate = cols.find((col) => Number(col.items) > 0)
    if (candidate) {
      response = await call(
        handler,
        'POST',
        `${ROUTE}/zotero-op`,
        JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'import-collection', collectionKey: candidate.key }),
      )
      const imported = response.payload || {}
      check(
        response.status === 200 && imported.ok === true && Number(imported.added) > 0,
        `/zotero-op import-collection 导入 ${imported.added} 条（合集「${candidate.name}」共 ${candidate.items}）`,
        `合集导入失败：${JSON.stringify(imported).slice(0, 300)}`,
      )
      check(
        imported.collectionKey === candidate.key && Array.isArray(imported.itemKeys) && imported.itemKeys.length > 0,
        '合集 key 与条目一并落盘',
        '合集导入未落盘',
      )
      response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'clear' }))
      check(
        response.status === 200 && response.payload && (response.payload.itemKeys || []).length === 0,
        '/zotero-op clear 清空该分支全部挂载',
        `clear 失败：${JSON.stringify(response.payload).slice(0, 200)}`,
      )
    } else {
      ok('Zotero 中无可导入的合集，跳过合并导入用例')
    }
  } else {
    response = await call(
      handler,
      'POST',
      `${ROUTE}/zotero-op`,
      JSON.stringify({ project: zotProj, ribId: ZOT_RIB, op: 'import-collection', collectionKey: ZOT_KEY }),
    )
    check(
      response.status === 503 && response.payload && response.payload.code === 'E_ZOTERO',
      'Zotero 不可用时 import-collection -> 503 E_ZOTERO（明确失败）',
      `未连接却报成功：${response.status} ${JSON.stringify(response.payload).slice(0, 200)}`,
    )
  }

  // Q6) 定位协议：只校验 key，不真的拉起 Zotero（验收环境不该弹窗）
  response = await call(handler, 'POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: zotProj, op: 'open', key: 'bad-key' }))
  check(
    response.status === 400 && response.payload && response.payload.code === 'E_PARAM',
    '/zotero-op open 非法 key -> 400（不触发协议）',
    `非法 key 未被拦截：${response.status}`,
  )
}

/* -------------------------------------------------------------------- 收尾 */

main()
  .then(() => {
    try {
      fs.rmSync(TMP, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    console.log('')
    if (failures.length === 0) {
      console.log(`RESULT: ALL CHECKS PASSED（${okCount} 项 OK）`)
      process.exit(0)
    }
    console.log(`RESULT: ${failures.length} FAILURE(S) / ${okCount} OK`)
    for (const failure of failures) console.log(`  - ${failure}`)
    process.exit(1)
  })
  .catch((error) => {
    try {
      fs.rmSync(TMP, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    console.log('')
    console.log(`FATAL ${error && error.stack ? error.stack : error}`)
    process.exit(1)
  })
