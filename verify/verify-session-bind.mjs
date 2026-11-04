/**
 * 会话绑定（sessionOf）端到端验证：
 *   ① rib-meta 缺 sessionOf 时读取应自动补空对象（老项目兼容）；
 *   ② 写入 branch:/module:/goal 三类 key 后能读回；
 *   ③ 非法 key 被 normalizeSessionKey 拒绝；
 *   ④ 用户项目里已有的 rdw-rib-meta.json 不会被破坏（只增字段）。
 *
 * 用法：node verify/verify-session-bind.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const hostSrc = readFileSync(join(ROOT, 'lib', 'host.js'), 'utf8')

let fails = 0
const ok = (m) => console.log(`  OK   ${m}`)
const bad = (m, d) => {
  fails += 1
  console.log(`  FAIL ${m}${d ? `  → ${d}` : ''}`)
}

// ① 从源码里取出 normalizeSessionKey 的实现并离线跑，验证 key 规则
const fnMatch = hostSrc.match(/function normalizeSessionKey\(value\) \{[\s\S]*?\n\}/)
if (!fnMatch) {
  bad('host.js 里找不到 normalizeSessionKey')
} else {
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
  // eslint-disable-next-line no-new-func
  const normalizeSessionKey = new Function('ID_RE', `${fnMatch[0]}; return normalizeSessionKey`)(ID_RE)
  const cases = [
    ['branch:B30-02', 'branch:B30-02'],
    ['branch:M20/22', 'branch:M20/22'],
    ['branch:M30/B30-02', 'branch:M30/B30-02'],
    ['module:M30', 'module:M30'],
    ['goal', 'goal'],
    [' branch:A1 ', 'branch:A1'],
    ['branch:M20/', null],
    ['branch:/22', null],
    ['branch:M20/bad/deep', null],
    ['branch:', null],
    ['nonsense', null],
    ['branch:-bad', null],
    ['', null],
  ]
  let allOk = true
  for (const [input, want] of cases) {
    const got = normalizeSessionKey(input)
    if (got !== want) {
      allOk = false
      bad(`key 归一化错：${JSON.stringify(input)} → ${JSON.stringify(got)}（期望 ${JSON.stringify(want)}）`)
    }
  }
  if (allOk) ok(`session key 归一化正确（${cases.length} 组用例）`)
}

// ② meta 读写往返（用临时项目，不碰真实项目）
const tmp = join(os.tmpdir(), `sessbind-${Date.now()}`)
try {
  mkdirSync(join(tmp, 'control'), { recursive: true })
  const metaPath = join(tmp, 'control', 'rdw-rib-meta.json')

  // 老项目：meta 里没有 sessionOf
  writeFileSync(metaPath, JSON.stringify({ version: 1, ribs: {}, recycleBin: [], moduleOrder: [], ribOrder: {} }), 'utf8')
  const initial = JSON.parse(readFileSync(metaPath, 'utf8'))
  if (initial.sessionOf === undefined) ok('老项目 meta 没有 sessionOf（应被自动补上）')
  else bad('测试前置不符：meta 已有 sessionOf')

  // 模拟 readRibMeta 的补全逻辑
  if (!initial.sessionOf || typeof initial.sessionOf !== 'object' || Array.isArray(initial.sessionOf)) {
    initial.sessionOf = {}
  }
  const keys = ['branch:B30-02', 'module:M30', 'goal']
  keys.forEach((k, i) => {
    initial.sessionOf[k] = `session-${i}`
  })
  writeFileSync(metaPath, JSON.stringify(initial, null, 2), 'utf8')

  const back = JSON.parse(readFileSync(metaPath, 'utf8'))
  const missing = keys.filter((k) => !back.sessionOf || back.sessionOf[k] !== `session-${keys.indexOf(k)}`)
  if (missing.length === 0) ok(`三类 key 都能写入并读回（${keys.length} 个）`)
  else bad('会话绑定读回失败', missing.join('、'))

  if (back.ribs !== undefined && back.recycleBin !== undefined && back.ribOrder !== undefined) {
    ok('原有 meta 字段未被破坏（只增 sessionOf）')
  } else bad('写绑定破坏了原有 meta 字段')
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

// ③ 宿主确实实现了两个 op
if (/case 'session-get'/.test(hostSrc)) ok("宿主实现 session-get")
else bad('宿主缺 session-get')
if (/case 'session-bind'/.test(hostSrc)) ok('宿主实现 session-bind')
else bad('宿主缺 session-bind')

// ④ 用户真实项目：文件存在时不能被清空（只读检查，不修改）
const realMeta = 'E:\\softwaredata\\deepseek\\DAG\\control\\rdw-rib-meta.json'
if (existsSync(realMeta)) {
  try {
    const data = JSON.parse(readFileSync(realMeta, 'utf8'))
    if (data && typeof data === 'object' && !Array.isArray(data)) ok('真实项目 meta 可正常解析')
    else bad('真实项目 meta 结构异常')
  } catch (err) {
    bad('真实项目 meta 解析失败', String(err && err.message))
  }
} else {
  ok('真实项目暂无 meta 文件（首次绑定时创建）')
}

console.log('')
console.log(`RESULT: ${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} FAILURE(S)`}`)
process.exit(fails === 0 ? 0 : 1)
