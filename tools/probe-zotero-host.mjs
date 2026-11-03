// 探针：直接 import lib/host.js，mock ctx.webServer.register 捕获前缀路由，
// 用 mock req/res 调 /zotero 与 /zotero-op，验证与真实 Zotero 的互通。
// 只读 + 在**项目副本**上写 rdw-rib-meta.json，不碰示例项目本体。

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve('.')
const ROUTE = '/research-dag-workbench'
const EXAMPLE = path.join(ROOT, '..', 'examples', 'early-phosphate')

process.env.DSH_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'rdw-zotero-'))

const host = await import(pathToFileURL(path.join(ROOT, 'lib', 'host.js')).href)
let handler = null
const ctx = {
  webServer: {
    register(options) {
      handler = options.handler
      return () => {}
    },
  },
  effect(fn) {
    fn()
  },
}
host.apply(ctx, {})

function makeRes() {
  const state = { status: 0, body: '' }
  const res = {
    state,
    writeHead(status) {
      state.status = status
      return res
    },
    end(body) {
      state.body = body || ''
      state.ended = true
      return res
    },
  }
  Object.defineProperty(res, 'writableEnded', { get: () => Boolean(state.ended) })
  return res
}

function makeReq(method, url, body) {
  const handlers = {}
  const req = {
    method,
    url,
    on(event, cb) {
      ;(handlers[event] = handlers[event] || []).push(cb)
      return req
    },
    destroy() {},
  }
  process.nextTick(() => {
    if (body !== undefined) for (const cb of handlers.data || []) cb(Buffer.from(body, 'utf8'))
    for (const cb of handlers.end || []) cb()
  })
  return req
}

async function call(method, url, body) {
  const res = makeRes()
  await handler(makeReq(method, url, body), res)
  let payload = null
  try {
    payload = res.state.body ? JSON.parse(res.state.body) : null
  } catch {
    payload = res.state.body
  }
  return { status: res.state.status, payload }
}

const enc = encodeURIComponent
const out = { steps: [] }
const record = (name, detail) => {
  out.steps.push({ name, ...detail })
  console.log(`== ${name}`)
  console.log(JSON.stringify(detail, null, 2).slice(0, 1200))
}

// 1) /health 带 capabilities
const health = await call('GET', `${ROUTE}/health`)
record('/health', { status: health.status, capabilities: health.payload.capabilities })

// 2) 复制示例项目，避免污染
const tmpProject = path.join(process.env.DSH_HOME, 'proj')
fs.cpSync(EXAMPLE, tmpProject, { recursive: true })
const ribId = 'B10-01'

// 3) /zotero 无 rib、无 q
const basic = await call('GET', `${ROUTE}/zotero?project=${enc(tmpProject)}`)
record('/zotero 基础', {
  status: basic.status,
  available: basic.payload.available,
  base: basic.payload.base,
  collectionsCount: basic.payload.collections ? basic.payload.collections.length : null,
  sampleCollection: basic.payload.collections ? basic.payload.collections.slice(0, 3) : null,
})

// 4) 搜索
const searched = await call('GET', `${ROUTE}/zotero?project=${enc(tmpProject)}&q=aeroallergen`)
record('/zotero 搜索 aeroallergen', {
  status: searched.status,
  total: searched.payload.search && searched.payload.search.total,
  first: searched.payload.search && searched.payload.search.items.slice(0, 2),
})

// 5) 挂载两条
const key1 = '3QFYZA46'
const key2 = 'ZGID6PYV'.replace('ZGID6PYV', 'ZGID6PYV')
const attach = await call('POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: tmpProject, ribId, op: 'attach', keys: [key1] }))
record('attach', { status: attach.status, payload: attach.payload })

// 6) 再读 /zotero?rib=
const linked = await call('GET', `${ROUTE}/zotero?project=${enc(tmpProject)}&rib=${ribId}`)
record('/zotero?rib= 已挂文献', {
  status: linked.status,
  linked: linked.payload.linked,
  itemTitles: (linked.payload.items || []).map((item) => `${item.title.slice(0, 48)} (${item.year})`),
  missingCount: (linked.payload.missing || []).length,
})

// 7) 合集导入（YN6K74A2 = reference，124 条）
const imported = await call(
  'POST',
  `${ROUTE}/zotero-op`,
  JSON.stringify({ project: tmpProject, ribId, op: 'import-collection', collectionKey: 'YN6K74A2' }),
)
record('import-collection YN6K74A2', {
  status: imported.status,
  ok: imported.payload.ok,
  added: imported.payload.added,
  total: imported.payload.itemKeys ? imported.payload.itemKeys.length : null,
  collectionTotal: imported.payload.collectionTotal,
  truncated: imported.payload.truncated,
  error: imported.payload.message || imported.payload.message,
})

// 8) detach / clear
const cleared = await call('POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: tmpProject, ribId, op: 'clear' }))
record('clear', { status: cleared.status, cleared: cleared.payload.cleared, keysLen: (cleared.payload.itemKeys || []).length })

// 9) 非法 key 校验
const badAttach = await call('POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: tmpProject, ribId, op: 'attach', keys: ['nope'] }))
record('attach 非法 key', { status: badAttach.status, code: badAttach.payload.code })

// 10) 不存在的分支
const missingRib = await call('POST', `${ROUTE}/zotero-op`, JSON.stringify({ project: tmpProject, ribId: 'B99-99', op: 'attach', keys: [key1] }))
record('attach 未知分支', { status: missingRib.status, code: missingRib.payload.code })

// 11) fishbone 带 zotero 字段
const fish = await call('GET', `${ROUTE}/fishbone?project=${enc(tmpProject)}`)
record('/fishbone zotero 汇总', {
  status: fish.status,
  totals: fish.payload.zotero,
  ribSample: fish.payload.ribs.slice(0, 2).map((rib) => ({ id: rib.id, zotero: rib.zotero })),
})

fs.rmSync(tmpProject, { recursive: true, force: true })
console.log('\n---- 汇总 ----')
console.log(JSON.stringify(out.steps.map((s) => s.name), null, 0))
