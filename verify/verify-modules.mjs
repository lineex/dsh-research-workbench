/**
 * 验收 v3.9 主支维护能力（新增 / 重命名 / 上移下移 / 收起）与主题预设完整性。
 *
 * 做法：复制示例项目到临时目录 → 起真实 host handler → 打真实 HTTP 请求 →
 * 断言返回与磁盘上的 control/rdw-rib-meta.json 一致。全程不碰示例本体。
 *
 * 用法：node verify/verify-modules.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WORKBENCH = path.resolve(HERE, '..')
const EXAMPLE = path.resolve(WORKBENCH, '..', 'examples', 'early-phosphate')
const ROUTE = '/research-dag-workbench'

const failures = []
const ok = (msg) => console.log(`  OK   ${msg}`)
const bad = (msg) => {
  failures.push(msg)
  console.log(`  FAIL ${msg}`)
}
const check = (cond, goodMsg, badMsg) => (cond ? ok(goodMsg) : bad(badMsg || goodMsg))

/* 极简 HTTP 假件：只为把 handler 的 res 接出来。 */
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
  const req = {
    method,
    url,
    headers: { 'content-type': 'application/json' },
    on(event, cb) {
      if (event === 'data' && body) cb(Buffer.from(body))
      if (event === 'end') cb()
    },
  }
  const res = makeRes()
  await handler(req, res)
  await res.finish()
  let payload = null
  try {
    payload = JSON.parse(res.body)
  } catch {
    payload = null
  }
  return { status: res.statusCode, payload }
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rdw-mod-'))
  const proj = path.join(tmpRoot, 'proj')
  fs.cpSync(EXAMPLE, proj, { recursive: true })
  // 干净起点：不继承历史会话的挂载/顺序残留
  fs.rmSync(path.join(proj, 'control', 'rdw-rib-meta.json'), { force: true })

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
  const enc = encodeURIComponent
  const metaPath = path.join(proj, 'control', 'rdw-rib-meta.json')
  const readMeta = () => (fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null)

  const fishbone = async () => {
    const r = await call(handler, 'GET', `${ROUTE}/fishbone?project=${enc(proj)}`)
    return r.payload && Array.isArray(r.payload.spine) ? r.payload : null
  }

  console.log('')
  console.log('M) v3.9 主支维护（重命名 / 排序 / 收起 / 新增）')

  // M1) 基线的顺序
  const base = await fishbone()
  check(Boolean(base && base.spine.length >= 5), `基线主支数 = ${base && base.spine.length}（>=5）`, '基线主支缺失')
  const originalOrder = (base && base.spine || []).map((m) => m.id)

  // M2) 重命名：写偏好名，不动 PROJECT_STATE.json
  const renameTarget = originalOrder[0]
  let r = await call(
    handler,
    'POST',
    `${ROUTE}/rib-op`,
    JSON.stringify({ project: proj, op: 'module-rename', moduleId: renameTarget, name: '重命名验证' }),
  )
  check(Boolean(r.status === 200 && r.payload && r.payload.ok), 'POST rib-op module-rename 成功', `重命名失败：${JSON.stringify(r.payload)}`)
  {
    const after = await fishbone()
    const node = (after && after.spine || []).find((m) => m.id === renameTarget)
    check(Boolean(node && node.name === '重命名验证'), `GET /fishbone 反映新名称「重命名验证」`, `名称未生效：${node && node.name}`)
    const state = JSON.parse(fs.readFileSync(path.join(proj, 'control', 'PROJECT_STATE.json'), 'utf8'))
    const rawName = (state.modules || []).find((m) => m.id === renameTarget)
    check(
      Boolean(rawName && rawName.name !== '重命名验证'),
      'PROJECT_STATE.json 未被改写（协议文件保持原样）',
      '协议文件被污染：模块名被改写了',
    )
    check(Boolean(readMeta() && readMeta().moduleNames && readMeta().moduleNames[renameTarget]), '偏好名落在 rdw-rib-meta.json', 'meta 未记录偏好名')
  }

  // M3) 下移第一项：顺序应轮换（首项换到第二）
  r = await call(handler, 'POST', `${ROUTE}/rib-op`, JSON.stringify({ project: proj, op: 'module-move', moduleId: originalOrder[0], offset: 1 }))
  check(Boolean(r.status === 200 && r.payload && r.payload.ok), 'POST rib-op module-move(+1) 成功', `下移失败：${JSON.stringify(r.payload)}`)
  {
    const after = await fishbone()
    const order = (after && after.spine || []).map((m) => m.id)
    check(
      order[0] === originalOrder[1] && order[1] === originalOrder[0],
      `GET /fishbone 顺序已生效（${originalOrder[0]} 与 ${originalOrder[1]} 互换）`,
      `顺序未变：${order.join(',')}`,
    )
    // 越界应幂等：首项再上移不报错
    const up = await call(handler, 'POST', `${ROUTE}/rib-op`, JSON.stringify({ project: proj, op: 'module-move', moduleId: order[0], offset: -1 }))
    check(Boolean(up.status === 200 && up.payload && up.payload.ok), '首项上移越界：幂等返回成功（不报错）', `越界报错：${JSON.stringify(up.payload)}`)
  }

  // M4) 收起主支：有分支且未 cascade 时应 409 拒绝
  const withRibs = (base && base.spine || []).find((m) => (m.ribs || []).length > 0)
  if (withRibs) {
    r = await call(handler, 'POST', `${ROUTE}/rib-op`, JSON.stringify({ project: proj, op: 'module-remove', moduleId: withRibs.id }))
    check(r.status === 409 && r.payload && r.payload.code === 'E_NOT_EMPTY', '有分支的主支删除被拒绝（409 E_NOT_EMPTY）', `未拒绝：${r.status} ${JSON.stringify(r.payload)}`)
  }
  // cascade=true 则允许，且从 spine 消失
  const emptyTarget = (base && base.spine || []).find((m) => (m.ribs || []).length === 0) || withRibs
  if (emptyTarget) {
    r = await call(
      handler,
      'POST',
      `${ROUTE}/rib-op`,
      JSON.stringify({ project: proj, op: 'module-remove', moduleId: emptyTarget.id, cascade: true }),
    )
    check(Boolean(r.status === 200 && r.payload && r.payload.ok), 'module-remove（cascade）成功', `收起失败：${JSON.stringify(r.payload)}`)
    const after = await fishbone()
    const stillThere = (after && after.spine || []).some((m) => m.id === emptyTarget.id)
    check(!stillThere, `收起后 ${emptyTarget.id} 不再出现在 /fishbone.spine`, '收起后仍在列表里')
    // 协议文件里模块仍在（只是工作台收起）
    const state = JSON.parse(fs.readFileSync(path.join(proj, 'control', 'PROJECT_STATE.json'), 'utf8'))
    check(
      Boolean((state.modules || []).some((m) => m.id === emptyTarget.id)),
      'PROJECT_STATE.json 里模块仍在（收起仅影响视图）',
      '协议模块被物理移除了',
    )
  }

  // M5) 参数校验：缺 moduleId 应 400
  r = await call(handler, 'POST', `${ROUTE}/rib-op`, JSON.stringify({ project: proj, op: 'module-move' }))
  check(Boolean(r.status === 400 && r.payload && r.payload.code === 'E_PARAM'), 'module-move 缺 moduleId → 400 E_PARAM', `未校验：${r.status}`)
  r = await call(handler, 'POST', `${ROUTE}/rib-op`, JSON.stringify({ project: proj, op: 'module-rename', moduleId: 'NOT-EXIST', name: 'x' }))
  check(Boolean(r.status === 404 && r.payload && r.payload.code === 'E_NOT_FOUND'), 'module-rename 不存在 → 404 E_NOT_FOUND', `未校验：${r.status}`)

  // M6) 示例本体必须零污染
  const exampleMeta = path.join(EXAMPLE, 'control', 'rdw-rib-meta.json')
  const exampleStateRaw = fs.readFileSync(path.join(EXAMPLE, 'control', 'PROJECT_STATE.json'), 'utf8')
  check(
    !exampleStateRaw.includes('重命名验证'),
    '示例项目本体未被写入（验收只写临时副本）',
    '示例项目被污染',
  )

  fs.rmSync(tmpRoot, { recursive: true, force: true })

  /* ---------------- 主题预设静态核验 ---------------- */
  console.log('')
  console.log('T) v3.9 主题预设')
  const themeSrc = fs.readFileSync(path.join(WORKBENCH, 'src', 'core', 'theme.js'), 'utf8')
  const idMatches = themeSrc.match(/^\s{4}id: '([a-z]+)',$/gm) || []
  const ids = idMatches.map((line) => line.trim().replace(/^id: '/, '').replace(/',?$/, ''))
  check(ids.length >= 4, `预设主题数 = ${ids.length}（>=4）`, '主题太少')
  check(ids.includes('apple'), '包含默认主题 apple', '缺默认主题')
  const uniq = new Set(ids)
  check(uniq.size === ids.length, '主题 id 无重复', '存在重复 id')
  // 每个非默认主题都必须有浅色 + 深色两套覆盖
  for (const id of ids.filter((x) => x !== 'apple')) {
    const light = new RegExp(`\\.rdw-shell\\[data-rdw-theme="${id}"\\]`)
    const dark = new RegExp(`body\\[data-ds-dark-theme\\]\\s*\\.rdw-shell\\[data-rdw-theme="${id}"\\]`)
    check(light.test(themeSrc) && dark.test(themeSrc), `${id} 同时提供浅色与深色覆盖`, `${id} 缺深色覆盖`)
  }
  // 预设里不得出现裸 hex 之外的非法值；并确认关键语义令牌都被覆盖
  const required = ['--rdw-sage', '--rdw-organic-ink', '--rdw-panel', '--rdw-text', '--rdw-line-2']
  for (const token of required) {
    const count = (themeSrc.match(new RegExp(`${token}:`, 'g')) || []).length
    check(count >= ids.length, `${token} 在每个主题里都有定义（${count} 次）`, `${token} 覆盖不全（${count} 次）`)
  }

  // 构建产物里必须包含预设 CSS，且切主题的 data 属性已接线
  const bundle = fs.readFileSync(path.join(WORKBENCH, 'lib', 'client.js'), 'utf8')
  check(bundle.includes('RDW_THEME_PRESET_CSS'), 'lib/client.js 含主题预设 CSS', '构建产物缺预设 CSS')
  check(/data-rdw-theme/.test(bundle), 'shell 上已接线 data-rdw-theme', '未接线主题属性')
  check(bundle.includes('renderThemePicker'), 'lib/client.js 含主题选择器', '选择器未进构建产物')

  console.log('')
  if (failures.length === 0) {
    console.log('=== 主支维护与主题预设：全部通过 ===')
    process.exit(0)
  }
  console.log(`=== ${failures.length} 项失败 ===`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
