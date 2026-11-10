/**
 * 验收 v3.10「研究目标 · 好问题卡」：
 *
 *   A. `state-set` 终于能改 goal —— 这是「研究目标改不动」的根因回归测试。
 *   B. GET /goal-card 空卡骨架 + 缺项自检正确。
 *   C. POST /goal-card 写卡、falsifier 空→不可证伪、同步 goal 摘要。
 *   D. 八层审计层的落盘与非法层 id 过滤。
 *   E. 与协议的一致性：写卡后 PROJECT_STATE.json 的 project.goal 真的变了。
 *
 * 做法与 verify-modules 一致：复制示例项目到临时目录 → 起真实 handler →
 * 打真实 HTTP 请求 → 断言返回与磁盘内容。全程不碰示例本体。
 *
 * 用法：node verify/verify-goal-card.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WORKBENCH = path.resolve(HERE, '..')
const EXAMPLE = path.resolve(WORKBENCH, '..', 'examples', 'early-phosphate')
const ROUTE = '/research-workbench'

const failures = []
const ok = (msg) => console.log(`  OK   ${msg}`)
const bad = (msg) => {
  failures.push(msg)
  console.log(`  FAIL ${msg}`)
}
const check = (cond, goodMsg, badMsg) => (cond ? ok(goodMsg) : bad(badMsg || goodMsg))

/** 极简 HTTP 假件：只为把 handler 的 res 接出来。 */
function makeRes() {
  return {
    statusCode: 0,
    body: '',
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    writeHead(code, headers) {
      this.statusCode = code
      if (headers) for (const [k, v] of Object.entries(headers)) this.setHeader(k, v)
      return this
    },
    end(chunk) {
      if (chunk) this.body += String(chunk)
      this.finished = true
      if (this.resolve) this.resolve()
    },
    finish() {
      if (this.finished) return Promise.resolve()
      return new Promise((resolve) => {
        this.resolve = resolve
      })
    },
  }
}

async function call(handler, method, url, body) {
  const res = makeRes()
  const req = {
    method,
    url,
    headers: { 'content-type': 'application/json' },
    on(event, cb) {
      if (event === 'data' && body !== undefined) cb(Buffer.from(JSON.stringify(body)))
      if (event === 'end') cb()
    },
  }
  await handler(req, res)
  await res.finish()
  let json = null
  try {
    json = JSON.parse(res.body)
  } catch {
    json = null
  }
  return { status: res.statusCode, json, raw: res.body }
}

async function main() {
  if (!fs.existsSync(EXAMPLE)) {
    console.log(`  SKIP 示例项目不存在：${EXAMPLE}`)
    return
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rdw-goalc-'))
  const project = path.join(tmp, 'early-phosphate')
  fs.cpSync(EXAMPLE, project, { recursive: true })

  console.log('=== v3.10 研究目标 · 好问题卡 ===')

  const mod = await import(pathToFileURL(path.join(WORKBENCH, 'lib', 'host.js')).href)
  let route = null
  const ctx = {
    effect(fn) {
      return fn()
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
  const handler = route && route.handler
  if (typeof handler !== 'function') {
    bad('无法从 lib/host.js 取得 handler（路由未注册）')
    return
  }

  const statePath = path.join(project, 'control', 'PROJECT_STATE.json')
  const cardPath = path.join(project, 'control', 'rdw-goal-card.json')
  const readState = () => JSON.parse(fs.readFileSync(statePath, 'utf8'))

  /* ---------- A. state-set 支持 goal（根因回归） ---------- */
  const before = readState()
  const originalGoal = (before.project && before.project.goal) || ''
  const r1 = await call(handler, 'POST', `${ROUTE}/run`, {
    project,
    action: 'state-set',
    goal: '在成人 ICU 低磷患者中，早期补磷能否降低 30 天死亡',
  })
  check(r1.json && r1.json.ok === true, 'state-set 接受仅 goal（不再报「至少需要 phase/next/blocker」）')
  // run 是异步的，等它 settles
  const runId = r1.json && r1.json.run && r1.json.run.id
  if (runId) {
    for (let i = 0; i < 60; i += 1) {
      const q = await call(handler, 'GET', `${ROUTE}/run?id=${encodeURIComponent(runId)}`)
      if (q.json && q.json.run && q.json.run.status !== 'running') break
      await new Promise((done) => setTimeout(done, 100))
    }
  }
  const afterGoalState = readState()
  check(
    (afterGoalState.project && afterGoalState.project.goal) === '在成人 ICU 低磷患者中，早期补磷能否降低 30 天死亡',
    'state-set 之后 project.goal 真的落盘了',
    `落盘值：${JSON.stringify(afterGoalState.project && afterGoalState.project.goal)}`,
  )

  /* ---------- B. GET 空卡骨架 ---------- */
  const g1 = await call(handler, 'GET', `${ROUTE}/goal-card?project=${encodeURIComponent(project)}`)
  check(g1.status === 200 && g1.json && g1.json.ok === true, 'GET /goal-card 返回 200')
  check(g1.json && g1.json.falsifiable === false, '新项目：falsifiable=false（还没有推翻条件）')
  check(
    g1.json && Array.isArray(g1.json.fields) && g1.json.fields.includes('falsifier'),
    'GET 返回 fields 列表且含 falsifier',
  )
  check(
    g1.json && Array.isArray(g1.json.layerSpec) && g1.json.layerSpec.length === 9,
    'GET 返回 9 层 layerSpec（-3..5）',
    `实际：${g1.json && g1.json.layerSpec && g1.json.layerSpec.length}`,
  )
  check(
    g1.json && Array.isArray(g1.json.missing) && g1.json.missing.includes('falsifier'),
    'missing 里含 falsifier（新项目还没填）',
  )

  /* ---------- C. POST 写卡 ---------- */
  const w1 = await call(handler, 'POST', `${ROUTE}/goal-card`, {
    project,
    card: {
      title: '早期补磷与 ICU 低磷患者 30 天死亡',
      question: '在成人 ICU 低磷血症患者中，入 ICU 24 小时内启动静脉补磷能否降低 30 天全因死亡？',
      whyMatters: '低磷在 ICU 常见，补磷时机缺乏高质量证据',
      assumptionChallenged: '默认「补磷越早越好」而不追问剂量与时机',
      hypotheses: 'H1 早补磷降低死亡；H2 只在重度低磷亚组有效；H3 无效但减少住院日',
      discriminatingTest: '按基线磷分层的 IPTW + 30 天死亡',
      falsifier: 'IPTW 后 30 天死亡 HR 的 95%CI 跨过 1 且方向相反',
      pilot: '用 MIMIC-IV 提取 500 例做过 pill 测试',
    },
  })
  check(w1.status === 200 && w1.json && w1.json.ok === true, 'POST /goal-card 写卡成功')
  check(w1.json && w1.json.falsifiable === true, '填了 falsifier → falsifiable=true')
  check(fs.existsSync(cardPath), 'control/rdw-goal-card.json 已落盘')
  const storedCard = JSON.parse(fs.readFileSync(cardPath, 'utf8'))
  check(
    storedCard.card && storedCard.card.falsifier === 'IPTW 后 30 天死亡 HR 的 95%CI 跨过 1 且方向相反',
    '卡里的 falsifier 原样落盘',
  )

  /* ---------- D. goal 摘要回写 ---------- */
  const syncedState = readState()
  const syncedGoal = (syncedState.project && syncedState.project.goal) || ''
  check(
    syncedGoal.includes('入 ICU 24 小时内启动静脉补磷'),
    'project.goal 已回写为「问题；推翻条件」摘要',
    `实际：${syncedGoal}`,
  )
  check(syncedGoal.includes('推翻条件'), '回写的 goal 里带「推翻条件：」前缀')

  /* ---------- E. 八层审计矩阵 ---------- */
  const w2 = await call(handler, 'POST', `${ROUTE}/goal-card`, {
    project,
    layers: [
      { id: '-1', assumption: '默认端点（死亡）是固定的', flip: '把死亡换成「无机械通气天数」会怎样' },
      { id: '1', assumption: '默认「补磷有益」', flip: '反过来先问「补磷的危害边界在哪」' },
      { id: 'bogus', assumption: '不存在的层', flip: '应被过滤' },
    ],
  })
  check(w2.status === 200 && w2.json && w2.json.ok === true, 'POST layers 成功')
  const stored2 = JSON.parse(fs.readFileSync(cardPath, 'utf8'))
  check(Array.isArray(stored2.layers) && stored2.layers.length === 2, '非法层 id 被过滤（3 传 2 存）')
  check(
    stored2.layers.some((entry) => entry.id === '-1') && stored2.layers.some((entry) => entry.id === '1'),
    '合法层 -1 与 1 都落盘',
  )
  check(
    !stored2.layers.some((entry) => entry.id === 'bogus'),
    'bogus 层没有落盘',
  )

  /* ---------- F. 非 falsifier 字段仍可增量补齐 ---------- */
  const w3 = await call(handler, 'POST', `${ROUTE}/goal-card`, {
    project,
    card: { reviewerRisk: '审稿人会说「MIMIC 里补磷是适应证偏倚」' },
  })
  const stored3 = JSON.parse(fs.readFileSync(cardPath, 'utf8'))
  check(
    stored3.card.falsifier === 'IPTW 后 30 天死亡 HR 的 95%CI 跨过 1 且方向相反',
    '增量写卡不清空已有字段（falsifier 仍在）',
  )
  check(
    stored3.card.reviewerRisk === '审稿人会说「MIMIC 里补磷是适应证偏倚」',
    '新字段增量写入成功',
  )

  /* ---------- G. 参数校验 ---------- */
  const e1 = await call(handler, 'POST', `${ROUTE}/goal-card`, {
    project,
    card: { falsifier: 123 },
  })
  check(e1.status === 400, 'falsifier 非字符串 → 400', `实际 ${e1.status}`)
  const e2 = await call(handler, 'GET', `${ROUTE}/goal-card`)
  check(e2.status >= 400 && e2.json && e2.json.ok === false, 'GET 缺 project → 报错而非静默', `实际 ${e2.status}`)

  fs.rmSync(tmp, { recursive: true, force: true })

  console.log('')
  if (failures.length > 0) {
    console.log(`RESULT: ${failures.length} 项失败`)
    for (const item of failures) console.log(`  - ${item}`)
    process.exitCode = 1
    return
  }
  console.log('=== 研究目标 · 好问题卡：全部通过 ===')
}

main().catch((problem) => {
  console.log(`RESULT: 崩溃 ${problem && problem.stack ? problem.stack : problem}`)
  process.exitCode = 1
})
