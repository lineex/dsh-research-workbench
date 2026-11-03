#!/usr/bin/env node
/**
 * 确定性视觉验收图（不依赖浏览器）。
 *
 * 目的：本机 headless 浏览器不可用时，仍能产出**真实的组件输出**作为视觉证据。
 * 做法：
 *   1) 用 verify-layout.mjs 同样的渲染桩加载 lib/client.js；
 *   2) 用 mock fetch 灌入真实形状的示例数据（早期补磷项目）；
 *   3) 把渲染出的 React 元素树**递归转成 SVG**（foreignObject 里放 HTML，
 *      保证文字/圆角/间距与浏览器一致）；
 *   4) 输出 .preview/rdw-visual-<view>.svg，可直接在浏览器/IDE 里打开。
 *
 * 关键：SVG 里的 CSS 与工作台注入的令牌完全一致（直接复用 theme.js 的
 * RDW_THEME_CSS + constants.js 的 SHELL_CSS），所以看到的就是真实配色。
 *
 * 用法：node tools/render-visual.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const OUT = join(ROOT, '.preview')
mkdirSync(OUT, { recursive: true })

/* ----------------------------------------------------------- 渲染桩 */
function createHarness() {
  const root = { component: null, props: null, tree: null, slots: [], hookIndex: 0, pendingEffects: [], dirty: false }
  const ensureSlot = (index) => {
    if (!root.slots[index]) root.slots[index] = {}
    return root.slots[index]
  }
  const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
  const React = {
    createElement(type, props) {
      const children = Array.prototype.slice.call(arguments, 2)
      const merged = Object.assign({}, props || {})
      if (children.length === 1) merged.children = children[0]
      else if (children.length > 1) merged.children = children
      return { type, props: merged }
    },
    useState(initial) {
      const index = root.hookIndex++
      const slot = ensureSlot(index)
      if (!Object.prototype.hasOwnProperty.call(slot, 'value')) slot.value = typeof initial === 'function' ? initial() : initial
      return [slot.value, (next) => {
        const value = typeof next === 'function' ? next(slot.value) : next
        if (!Object.is(value, slot.value)) { slot.value = value; root.dirty = true }
      }]
    },
    useRef(value) { const index = root.hookIndex++; const slot = ensureSlot(index); if (!slot.ref) slot.ref = { current: value }; return slot.ref },
    useEffect(fn, deps) {
      const index = root.hookIndex++
      const slot = ensureSlot(index)
      const changed = !slot.hasEffect || !sameDeps(slot.effectDeps, deps)
      slot.effectDeps = deps; slot.hasEffect = true
      if (changed) root.pendingEffects.push({ slot, fn })
    },
    useCallback(fn, deps) {
      const index = root.hookIndex++
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) { slot.memo = fn; slot.memoDeps = deps; slot.hasMemo = true }
      return slot.memo
    },
    useMemo(fn, deps) {
      const index = root.hookIndex++
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) { slot.memo = fn(); slot.memoDeps = deps; slot.hasMemo = true }
      return slot.memo
    },
  }
  const renderOnce = () => {
    root.hookIndex = 0; root.pendingEffects = []; root.dirty = false
    root.tree = root.component(root.props)
    const effects = root.pendingEffects
    root.pendingEffects = []
    for (const effect of effects) {
      if (typeof effect.slot.cleanup === 'function') effect.slot.cleanup()
      const cleanup = effect.fn()
      effect.slot.cleanup = typeof cleanup === 'function' ? cleanup : null
    }
    return root.tree
  }
  const settle = async () => {
    for (let round = 0; round < 200; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      if (!root.dirty) return root.tree
      renderOnce()
    }
    return root.tree
  }
  const mount = async (component, props) => {
    root.component = component; root.props = props; root.slots = []
    renderOnce()
    await settle()
    return root.tree
  }
  return { React, root, mount, settle, renderOnce }
}

/* ------------------------------------------------------------- 数据桩 */
const SAMPLE = 'D:\\ZhuanZ\\Documents\\research-dag\\examples\\early-phosphate'
const ROUTE = '/research-dag-workbench'
const PATH = {
  health: `${ROUTE}/health`,
  state: `${ROUTE}/state`,
  fishbone: `${ROUTE}/fishbone`,
  content: `${ROUTE}/content`,
  leaderLog: `${ROUTE}/leader-log`,
  results: `${ROUTE}/results`,
  runs: `${ROUTE}/runs`,
}

const health = {
  ok: true, name: 'dsh-research-dag-workbench', version: '3.3.0', route: ROUTE,
  actions: ['status', 'verify', 'list', 'check', 'submit', 'accept', 'reject', 'block', 'unblock', 'report', 'state-set', 'results', 'auto', 'init', 'module-add', 'branch-add', 'handoff-new', 'content'],
  bridgeActions: ['publish', 'idea', 'review', 'pull'], networkAvailable: true,
  example: SAMPLE, configPath: 'C:\\Users\\ZhuanZ\\.dsh\\research-dag-workbench\\config.json',
}

const modules = [
  ['M10', '研究问题与方案', 100, 1],
  ['M20', '文献检索', 60, 1],
  ['M30', '数据与队列', 33, 3],
  ['M40', '统计分析', 50, 3],
  ['M50', '论文写作', 100, 2],
  ['M60', '审稿修订', 0, 1],
].map(([id, name, completion, ribs]) => ({
  id, name, phase: 'analysis', dir: `modules/${id}`, completion, total: ribs,
  counts: { draft: 1, provisional: 0, accepted: 1, rejected: 0, superseded: 0, blocked: 0 },
}))

const state = {
  ok: true, configured: true, config: { version: 1, projectRoot: SAMPLE },
  project: {
    root: SAMPLE, exists: true, isDag: true, id: 'early-phosphate',
    title: '重症低磷血症患者早期补磷的 target trial emulation',
    goal: '估计早期补磷对 28 天全因死亡的影响', phase: 'analysis',
    next_steps: ['完成主分析 v1 并提交'], blockers: ['B30-03 缺失审计等待数据管理员澄清'],
    modules, branches: [], handoffs: [], pending_decisions: [], accepted: [],
    counts: { draft: 1, provisional: 2, accepted: 6, rejected: 1, superseded: 1, blocked: 1 },
  },
  verify: { ok: true, checked: { handoffs: 12, modules: 6, branches: 13, files: 26 }, issues: [] },
  statusRaw: {},
}

const fishbone = {
  ok: true, root: SAMPLE,
  head: {
    id: 'early-phosphate', title: '重症低磷血症患者早期补磷的 target trial emulation',
    goal: '估计早期补磷对 28 天全因死亡的影响', phase: 'analysis',
    nextSteps: ['完成主分析 v1 并提交'], blockers: ['B30-03 缺失审计等待数据管理员澄清'],
  },
  spine: [
    { id: 'M10', name: '研究问题与方案', dir: 'modules/M10', counts: { accepted: 1 }, total: 1, completion: 100, active: false, staleness: false },
    { id: 'M20', name: '文献检索', dir: 'modules/M20', counts: { provisional: 1 }, total: 1, completion: 60, active: false, staleness: false },
    { id: 'M30', name: '数据与队列', dir: 'modules/M30', counts: { draft: 1 }, total: 3, completion: 33, active: true, staleness: false },
    { id: 'M40', name: '统计分析', dir: 'modules/M40', counts: { draft: 1, accepted: 1 }, total: 3, completion: 50, active: false, staleness: false },
    { id: 'M50', name: '论文写作', dir: 'modules/M50', counts: { accepted: 1 }, total: 2, completion: 100, active: false, staleness: false },
    { id: 'M60', name: '审稿修订', dir: 'modules/M60', counts: {}, total: 1, completion: 0, active: false, staleness: false },
  ],
  ribs: [
    { id: 'B10-01', module: 'M10', name: '研究方案', dir: 'x', status: 'ACCEPTED', stream: 'protocol-charter', version: 1, is_stale: false, counts: { accepted: 1 }, weight: 100, brief: '把临床问题转成可执行的 TTE 方案。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-09-19T10:00:00+08:00' },
    { id: 'B20-01', module: 'M20', name: '协变量取舍', dir: 'x', status: 'PROVISIONAL', stream: 'covariate-set', version: 1, is_stale: true, counts: { provisional: 1 }, weight: 60, brief: '从文献中提炼候选协变量集合。', workFiles: [], outputFiles: [], hasSession: true, lastActivityAt: '2026-10-10T10:00:00+08:00' },
    { id: 'B30-01', module: 'M30', name: '队列定义', dir: 'x', status: 'DRAFT', stream: 'cohort-definition', version: 1, is_stale: false, counts: { draft: 1 }, weight: 25, brief: '定义纳入排除标准与索引日。', workFiles: [], outputFiles: [], hasSession: true, lastActivityAt: '2026-10-08T10:00:00+08:00' },
    { id: 'B30-02', module: 'M30', name: '缺失审计', dir: 'x', status: 'BLOCKED', stream: 'missingness', version: 1, is_stale: false, counts: { blocked: 1 }, weight: 25, brief: '等待数据管理员澄清缺失机制。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-12T10:00:00+08:00' },
    { id: 'B30-03', module: 'M30', name: '倾向评分', dir: 'x', status: 'DRAFT', stream: 'propensity', version: 1, is_stale: false, counts: { draft: 1 }, weight: 25, brief: '构建倾向评分模型。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-14T10:00:00+08:00' },
    { id: 'B40-03', module: 'M40', name: 'IPTW 诊断', dir: 'x', status: 'ACCEPTED', stream: 'iptw-diagnostics', version: 1, is_stale: false, counts: { accepted: 1 }, weight: 100, brief: '构建 IPTW 权重并完成诊断。', workFiles: [], outputFiles: [], hasSession: true, lastActivityAt: '2026-10-16T10:00:00+08:00' },
    { id: 'B40-02', module: 'M40', name: '主分析', dir: 'x', status: 'PROVISIONAL', stream: 'main-analysis', version: 1, is_stale: false, counts: { provisional: 1 }, weight: 60, brief: '加权 Cox 与 KM 主分析。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-15T10:00:00+08:00' },
    { id: 'B40-04', module: 'M40', name: '敏感性分析', dir: 'x', status: 'SUPERSEDED', stream: 'sensitivity', version: 1, is_stale: true, counts: { superseded: 1 }, weight: 40, brief: '截尾阈值敏感性（已被替代）。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-09T10:00:00+08:00' },
    { id: 'B50-01', module: 'M50', name: '结果表', dir: 'x', status: 'ACCEPTED', stream: 'tables', version: 1, is_stale: false, counts: { accepted: 1 }, weight: 100, brief: '主表与附录表。', workFiles: [], outputFiles: [], hasSession: true, lastActivityAt: '2026-10-18T10:00:00+08:00' },
    { id: 'B50-02', module: 'M50', name: '论文草稿', dir: 'x', status: 'DRAFT', stream: 'manuscript', version: 1, is_stale: false, counts: { draft: 1 }, weight: 25, brief: '正文初稿。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-19T10:00:00+08:00' },
    { id: 'B60-01', module: 'M60', name: '审稿意见', dir: 'x', status: 'DRAFT', stream: 'revision', version: 1, is_stale: false, counts: { draft: 1 }, weight: 25, brief: '逐条回复审稿人。', workFiles: [], outputFiles: [], hasSession: false, lastActivityAt: '2026-10-17T10:00:00+08:00' },
  ],
  attention: [
    { kind: 'stale', rib: 'B20-01', module: 'M20', message: '上游方案已变更，B20-01 协变量取舍需要重新评估', target: 'modules/M20' },
    { kind: 'blocked', module: 'M30', message: 'B30-03 缺失审计等待数据管理员澄清', target: 'modules/M30' },
  ],
  totals: { modules: 6, ribs: 11, activeRibs: 1, accepted: 4, stale: 2, blocked: 1, attention: 2 },
  cliErrors: [], generatedAt: '2026-10-19T08:00:00+08:00',
}

const content = {
  ok: true, root: SAMPLE,
  project: { root: SAMPLE, id: 'early-phosphate', title: '重症低磷血症患者早期补磷的 target trial emulation', phase: 'analysis' },
  results: {
    ok: true,
    modules: modules.map((m) => Object.assign({}, m, {
      question: `研究问题：${m.name}`,
      keyResults: ['关键结果一（示例）', '关键结果二（示例）'],
      limitations: ['局限一（示例）'],
      files: [], reviews: [], pending: [], attention: [],
    })),
    results: [
      { id: 'r1', module: 'M40', branch: 'B40-03', stream: 'iptw-diagnostics', version: 1, title: 'IPTW 权重诊断通过', question: '权重分布是否可接受？', keyResults: 'SMD 全部 < 0.1\n极端权重占比 0.3%', limitations: '截尾阈值敏感', files: [{ path: 'out/iptw.md' }], decidedAt: '2026-10-16T10:00:00+08:00' },
      { id: 'r2', module: 'M50', branch: 'B50-01', stream: 'tables', version: 1, title: '主表与附录表完成', question: '主表结构如何？', keyResults: 'Table 1–5 齐备', limitations: '尚未做标注', files: [], decidedAt: '2026-10-18T10:00:00+08:00' },
    ],
    pending: [], attention: [],
  },
  status: { ok: true, phase: 'analysis', pending_decisions: [] },
  errors: { results: null, status: null },
  network: null, networkError: 'TeamMCP 未运行或桥不可用：示例网络暂不可用',
  review: { byItem: { 'iptw-diagnostics@1': { satisfied: true, at: '2026-10-17T09:00:00+08:00' } }, pendingReview: [], summary: { accepted: 6, reviewed: 4, pending: 2, percent: 67 } },
}

const leaderLog = {
  ok: true, root: SAMPLE,
  state: { phase: 'analysis', nextSteps: ['完成主分析 v1 并提交'], blockers: [] },
  decisions: [], ideas: [], reviews: [], timeline: [],
  counts: { decisions: 0, ideas: 0, reviews: 0, accepted: 0, rejected: 0, blocked: 0 },
  generatedAt: '2026-10-19T09:00:00+08:00',
}

function makeFetch() {
  return async (url) => {
    const pathname = String(url).split('?')[0]
    const answer = (payload) => ({ ok: true, status: 200, json: async () => payload })
    if (pathname === PATH.health) return answer(health)
    if (pathname === PATH.state) return answer(state)
    if (pathname === PATH.fishbone) return answer(fishbone)
    if (pathname === PATH.content) return answer(content)
    if (pathname === PATH.leaderLog) return answer(leaderLog)
    if (pathname === PATH.results) return answer({ ok: true, results: [], pendingDecisions: [], accepted: [], limitations: [] })
    if (pathname === PATH.runs) return answer({ ok: true, runs: [] })
    return answer({ ok: false, code: 'E_UNKNOWN' })
  }
}

/* ------------------------------------------------- 元素树 → HTML 字符串 */
const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'line', 'rect', 'path', 'circle', 'polygon', 'polyline', 'ellipse', 'use', 'stop', 'area', 'col'])
const SVG_TAGS = new Set(['svg', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'text', 'tspan', 'polygon', 'line', 'rect', 'path', 'circle', 'ellipse', 'polyline'])

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function styleToString(style) {
  if (!style || typeof style !== 'object') return ''
  const parts = []
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === false) continue
    if (key.startsWith('--')) parts.push(`${key}:${value}`)
    else if (typeof value === 'number' && !/^(zIndex|opacity|flex|flexGrow|flexShrink|order|lineHeight|fontWeight)$/.test(key)) parts.push(`${key}:${value}px`)
    else parts.push(`${key}:${value}`)
  }
  return parts.join(';')
}

/** 把 React 元素树转成 HTML（供 foreignObject 承载）。 */
const SVG_ATTRS = new Set([
  'x', 'y', 'dx', 'dy', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'd', 'points', 'stroke', 'strokeWidth', 'strokeLinecap',
  'strokeLinejoin', 'fill', 'viewBox', 'preserveAspectRatio', 'textAnchor',
  'fontSize', 'fontWeight', 'offset', 'stopColor', 'stopOpacity', 'transform',
  'opacity', 'id', 'xmlns', 'fontFamily', 'letterSpacing'
])

function toHtml(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return escapeHtml(node)
  if (Array.isArray(node)) return node.map(toHtml).join('')
  if (typeof node === 'function') return ''
  if (typeof node !== 'object' || !node.type) return ''
  if (typeof node.type === 'function') return toHtml(node.type(node.props || {}))

  const tag = node.type
  const props = node.props || {}
  const attrs = []
  if (props.className) attrs.push(`class="${escapeHtml(props.className)}"`)
  const style = styleToString(props.style)
  if (style) attrs.push(`style="${escapeHtml(style)}"`)
  if (props.role) attrs.push(`role="${escapeHtml(props.role)}"`)
  if (props['aria-label']) attrs.push(`aria-label="${escapeHtml(props['aria-label'])}"`)
  if (props['data-show']) attrs.push(`data-show="${escapeHtml(props['data-show'])}"`)
  if (props['data-dsh-workbench-toolbar'] !== undefined) attrs.push('data-dsh-workbench-toolbar')
  if (props['data-dsh-no-drag'] !== undefined) attrs.push('data-dsh-no-drag')
  if (props['aria-selected']) attrs.push(`aria-selected="${escapeHtml(props['aria-selected'])}"`)
  if (props['aria-pressed']) attrs.push(`aria-pressed="${escapeHtml(props['aria-pressed'])}"`)
  if (props.placeholder) attrs.push(`placeholder="${escapeHtml(props.placeholder)}"`)
  if (props.value !== undefined && props.value !== null && tag !== 'svg') attrs.push(`value="${escapeHtml(props.value)}"`)
  if (props.type) attrs.push(`type="${escapeHtml(props.type)}"`)
  if (props.disabled) attrs.push('disabled')

  for (const [key, val] of Object.entries(props)) {
    if (SVG_ATTRS.has(key) && val !== undefined && val !== null) {
      // camelCase to kebab-case for svg attributes
      const kebab = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
      attrs.push(`${kebab}="${escapeHtml(val)}"`)
    }
  }

  const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
  if (VOID_TAGS.has(tag)) return open
  return `${open}${toHtml(props.children)}</${tag}>`
}

/** 抽出 style 标签里的 CSS（令牌 + 框架）。 */
function collectCss(node, out) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const child of node) collectCss(child, out); return }
  const props = node.props || {}
  if (node.type === 'style' && typeof props.children === 'string') out.push(props.children)
  collectCss(props.children, out)
}

/* --------------------------------------------------------- 组装 SVG */
function buildSvg(tree, title, width, height) {
  const css = []
  collectCss(tree, css)
  // 只取业务部分（去掉 <style> 自身），body 内嵌 root 的 HTML
  const html = toHtml(tree)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style type="text/css"><![CDATA[
      :root{color-scheme:light;}
      html,body{margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}
      *{box-sizing:border-box}
      ${css.join('\n')}
    ]]></style>
  </defs>
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    <xhtml:div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden">${html}</xhtml:div>
  </foreignObject>
</svg>`
}

/* ------------------------------------------------------------- main */
async function loadPlugin(fetchImpl) {
  const source = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
  let entry = null
  const windowMock = { __ModuleLoader__: { load(descriptor) { entry = descriptor } } }
  new Function('window', 'fetch', 'setTimeout', 'clearTimeout', 'console', source)(
    windowMock, fetchImpl, setTimeout, clearTimeout, console,
  )
  const harness = createHarness()
  const plugin = entry.factory((spec) => {
    if (spec === 'react') return harness.React
    throw new Error(`unexpected require: ${spec}`)
  })
  return { plugin, harness }
}

function registerComponent(plugin) {
  const registrations = []
  plugin.apply({
    effect(fn) { fn(); return () => {} },
    desktopWorkbenches: { register(options, component) { registrations.push({ options, component }); return () => {} } },
  })
  return registrations[0] || {}
}

const VIEWS = [
  { id: 'fishbone', label: '项目流程主线', width: 1440, height: 1180 },
  { id: 'content', label: '内容', width: 1440, height: 1180 },
  { id: 'network', label: '项目网络', width: 1440, height: 900 },
]

const loaded = await loadPlugin(makeFetch())
const registered = registerComponent(loaded.plugin)

for (const view of VIEWS) {
  const tree = await loaded.harness.mount(registered.component, {})
  // 切到目标页签
  const buttons = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (node.type === 'button') buttons.push(node)
    walk(node.props && node.props.children)
  }
  walk(tree)
  /** 把 children 拍平成纯文本（children 可能是字符串、数组或嵌套元素）。 */
  const flatText = (children) => {
    if (children === null || children === undefined) return ''
    if (typeof children === 'string' || typeof children === 'number') return String(children)
    if (Array.isArray(children)) return children.map(flatText).join('')
    if (typeof children === 'object' && children.props) return flatText(children.props.children)
    return ''
  }
  // 页签文案带图标前缀（如「📋 项目流程」），所以用 endsWith 而不是全等。
  const TARGETS = { fishbone: '项目流程', content: '内容', network: '网络' }
  const target = buttons.find((b) => {
    const text = flatText(b.props && b.props.children).trim()
    return text === TARGETS[view.id] || text.endsWith(TARGETS[view.id])
  })
  if (!target) console.warn(`未找到页签：${TARGETS[view.id]}（可用：${buttons.map((b) => flatText(b.props && b.props.children).trim()).join(' / ')}）`)
  if (target && typeof target.props.onClick === 'function') {
    target.props.onClick({ stopPropagation() {}, preventDefault() {} })
    await loaded.harness.settle()
  }
  const finalTree = loaded.harness.root.tree
  const svg = buildSvg(finalTree, view.label, view.width, view.height)
  const file = join(OUT, `rdw-visual-${view.id}.svg`)
  writeFileSync(file, svg, 'utf8')
  console.log(`已生成 ${file}（${view.width}x${view.height}）`)
}
