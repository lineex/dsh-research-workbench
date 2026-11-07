/**
 * 真实组件树 → 静态 HTML → 截图。
 *
 * 目的：此前一直用「手写 HTML 原型」代替真实渲染，导致视觉问题发现不了。
 * 这里搭一个最小 React 兼容层（createElement / useState / useEffect 等），
 * 直接 require 真实源码模块，把工作台渲染成 HTML 字符串，再交给无头浏览器截图。
 *
 * 用法: node tools/render-real.mjs [输出html]
 */
import { writeFileSync } from 'node:fs'
import { register } from 'node:module'

/* ── 1. 最小 React 兼容层 ─────────────────────────────────────────── */

function createElement(type, props, ...children) {
  /* React 语义：props.children 就是第三个及之后的参数。
   * 若调用方把 children 直接塞进 props，也要合并进来（否则会丢内容）。 */
  const merged = Object.assign({}, props || {})
  const fromArgs = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== true)
  if (fromArgs.length > 0) {
    merged.children = merged.children ? [].concat(merged.children, fromArgs) : fromArgs.length === 1 ? fromArgs[0] : fromArgs
  }
  return { type, props: merged }
}

const states = []
let stateIdx = 0
let effects = []
/* 预先播种的 state：按「第 N 次 useState」注入初始值，用于跳过 AI 拉取。
 * 结构: { 序号(0-based): 值 } */
let seedStates = {}

const React = {
  createElement,
  Fragment: 'FRAGMENT',
  useState(init) {
    const i = stateIdx++
    if (Object.prototype.hasOwnProperty.call(seedStates, i)) {
      if (!(i in states)) states[i] = seedStates[i]
      const setter = (v) => {
        states[i] = typeof v === 'function' ? v(states[i]) : v
      }
      return [states[i], setter]
    }
    if (!(i in states)) states[i] = typeof init === 'function' ? init() : init
    const setter = (v) => {
      states[i] = typeof v === 'function' ? v(states[i]) : v
    }
    return [states[i], setter]
  },
  useEffect(fn) { effects.push(fn) },
  useLayoutEffect(fn) { effects.push(fn) },
  useMemo(fn) { return fn() },
  useCallback(fn) { return fn },
  useRef(v) { return { current: v } },
  createContext(v) { return { _v: v, Provider: 'PROVIDER', Consumer: 'CONSUMER' } },
  useContext(ctx) { return ctx._v },
  memo(fn) { return fn },
  forwardRef(fn) { return fn },
}

/* ── 2. 渲染：组件树 → HTML 字符串 ────────────────────────────────── */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c])

/* 把 React 风格 style 对象转成 CSS 文本 */
function styleToCss(style) {
  if (!style || typeof style !== 'object') return ''
  const parts = []
  for (const [k, v] of Object.entries(style)) {
    if (v === null || v === undefined || v === '') continue
    let prop
    if (k.startsWith('--')) prop = k
    else if (k === 'cssFloat') prop = 'float'
    else prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
    const val = typeof v === 'number' && !/^(zIndex|opacity|flex|flexGrow|flexShrink|order|lineHeight|fontWeight|columnCount|gridColumn|gridRow)$/.test(k)
      ? `${v}px`
      : v
    parts.push(`${prop}:${val}`)
  }
  return parts.join(';')
}

/* 不输出到 HTML 的属性：ref / key 是 React 内部用法 */
const SKIP_PROPS = new Set(['children', 'key', 'ref', 'dangerouslySetInnerHTML'])

function render(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') return esc(node)
  if (Array.isArray(node)) return node.map(render).join('')

  const { type, props } = node
  const p = props || {}

  /* 函数组件：调用它。
   * 注意：**不要**在这里重置 stateIdx——hooks 的顺序索引必须在
   * 「同一次组件渲染过程中」连续递增。WorkbenchPanel 内部调用 useState
   * 共 40+ 次，只有整棵树的顶层 render 之前才该归零。 */
  if (typeof type === 'function') {
    return render(type(p))
  }

  /* 取子节点：统一从 props.children 拿 */
  const rawKids = p.children
  const kids = rawKids === undefined || rawKids === null ? [] : Array.isArray(rawKids) ? rawKids : [rawKids]
  const inner = kids.map(render).join('')

  /* Fragment */
  if (type === 'FRAGMENT') return inner

  if (typeof type !== 'string') return inner

  const attrs = []
  for (const [k, v] of Object.entries(p)) {
    if (SKIP_PROPS.has(k) || v === null || v === undefined || v === false) continue
    if (k === 'style') {
      const css = styleToCss(v)
      if (css) attrs.push(`style="${esc(css)}"`)
      continue
    }
    if (k === 'className') { attrs.push(`class="${esc(v)}"`); continue }
    if (k.startsWith('on') && typeof v === 'function') continue
    if (typeof v === 'function') continue
    if (typeof v === 'object') continue
    if (typeof v === 'boolean') { if (v) attrs.push(k); continue }
    attrs.push(`${k}="${esc(v)}"`)
  }

  /* style 标签的内容不能转义 */
  if (type === 'style') {
    return `<style${attrs.length ? ' ' + attrs.join(' ') : ''}>${kids.map((c) => (typeof c === 'string' ? c : render(c))).join('')}</style>`
  }

  return `<${type}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${type}>`
}

/* ── 3. 组装页面 ──────────────────────────────────────────────────── */

const themeMod = await import('../src/core/theme.js')
const constMod = await import('../src/core/constants.js')

const css = [themeMod.RDW_THEME_CSS, constMod.SHELL_CSS].filter(Boolean).join('\n')

/* 构造一个典型的项目快照。结构必须匹配 extractProjectState 的期望：
 *   server.project.root —— 有 root 才被认为"已选中项目"
 *   server.statusRaw    —— 兜底数据源
 *   project.modules / branches / pending_decisions / accepted / handoffs 等数组
 */
const mods = [
  { id: 'M00', name: '研究问题与方案', phase: '规划', status: 'accepted', progress: 100, rib_count: 1 },
  { id: 'M10', name: '文献证据', phase: '文献', status: 'accepted', progress: 100, rib_count: 2 },
  { id: 'M20', name: '数据队列', phase: '数据', status: 'provisional', progress: 65, rib_count: 2 },
  { id: 'M30', name: '统计分析', phase: '分析', status: 'provisional', progress: 40, rib_count: 3 },
  { id: 'M40', name: '论文写作', phase: '写作', status: 'accepted', progress: 100, rib_count: 0 },
  { id: 'M50', name: '审稿修订', phase: '审稿', status: 'draft', progress: 10, rib_count: 1 },
]

const branches = [
  { id: 'B10-01', name: '方案方法学审查', module: 'M00', status: 'accepted', progress: 100, parent: null },
  { id: 'B20-01', name: '文献检索 v1', module: 'M10', status: 'rejected', progress: 100, parent: null },
  { id: 'B20-02', name: '文献检索 v2', module: 'M10', status: 'accepted', progress: 100, parent: null },
  { id: 'B30-01', name: '时间零点核查', module: 'M20', status: 'draft', progress: 30, parent: null },
  { id: 'B30-03', name: '缺失审计', module: 'M20', status: 'blocked', progress: 0, parent: null },
  { id: 'B40-01', name: '基线表', module: 'M30', status: 'accepted', progress: 100, parent: null },
  { id: 'B40-02', name: '主分析', module: 'M30', status: 'draft', progress: 30, parent: null },
  { id: 'B40-03', name: 'IPTW 诊断', module: 'M30', status: 'provisional', progress: 60, parent: null },
  { id: 'B50-01', name: '审稿修订计划', module: 'M50', status: 'draft', progress: 30, parent: null },
]

const projectSnapshot = {
  root: 'D:/ZhuanZ/Documents/research-dag/projects/early-phosphate',
  id: 'early-phosphate',
  title: 'early-phosphate',
  goal: '重症低磷血症早期补磷对 28 天病死率的影响（目标试验模拟）',
  phase: '分析',
  modules: mods,
  branches,
  pending_decisions: [
    { id: 'D01', name: 'IPTW 截尾方案', text: '主项目决定 99% 截尾 vs 不截尾' },
    { id: 'D02', name: '主分析 v1 口径', text: '加权 Cox 的时间尺度选择' },
  ],
  accepted: [
    { id: 'A01', name: '基线表', module: 'M30' },
    { id: 'A02', name: '方案方法学审查', module: 'M00' },
    { id: 'A03', name: '文献检索 v2', module: 'M10' },
  ],
  handoffs: [
    { id: 'H01', title: '方案方法学审查', decision: 'accept', from: 'B10-01', to: 'M00' },
    { id: 'H02', title: '基线表', decision: 'accept', from: 'B40-01', to: 'M30' },
  ],
  next_steps: [
    '主项目决定 IPTW 权重截尾方案',
    '完成主分析 v1 并提交',
  ],
  blockers: [
    { id: 'K01', name: 'B30-03 缺失审计', reason: '待数据管理员澄清 2024-07 起补磷医嘱表结构变更' },
  ],
  counts: { blocked: 1, pending: 2, progress: 62, ribs: 9, modules: 6 },
}

/* 真实宿主注入的会话节点：内部 height:100% 全屏布局。
 * 用 h() 构造（不能手写字面量——那样 children 会挂在顶层而不是 props 上）。 */
const h = createElement
const fakeConversation = h(
  'div',
  { style: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff' } },
  h(
    'div',
    {
      style: {
        flex: '0 0 auto',
        padding: '8px 13px',
        borderBottom: '1px solid rgba(60,60,67,.10)',
        fontSize: '12.5px',
        fontWeight: 600,
        color: 'rgba(60,60,67,.80)',
      },
    },
    'DeepSeek Harness 会话（宿主原生节点）',
  ),
  h(
    'div',
    {
      style: {
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '13px',
      },
    },
    h(
      'div',
      null,
      h(
        'div',
        { style: { fontSize: '12px', fontWeight: 600, color: 'rgba(60,60,67,.50)', marginBottom: '3px' } },
        '你',
      ),
      h(
        'div',
        { style: { fontSize: '13px', lineHeight: 1.62, color: 'var(--rdw-organic-ink)' } },
        '为什么乳酸 SMD 偏高？请评估 99% 截尾方案。',
      ),
    ),
    h(
      'div',
      null,
      h(
        'div',
        { style: { fontSize: '12px', fontWeight: 600, color: 'rgba(60,60,67,.50)', marginBottom: '3px' } },
        '统计分析智能体',
      ),
      h(
        'div',
        { style: { fontSize: '13px', lineHeight: 1.62, color: 'var(--rdw-organic-ink)' } },
        '已排查极值：加权后 SMD = 0.31，主因 top 1% 权重（最大 18.4）。建议双侧 1%–99% 截尾，截尾后 SMD 降至 0.08，有效样本量 412 → 486。',
      ),
    ),
  ),
  h(
    'div',
    { style: { flex: '0 0 auto', padding: '10px 13px 12px', borderTop: '1px solid rgba(60,60,67,.10)' } },
    h(
      'div',
      {
        style: {
          border: '1px solid rgba(60,60,67,.14)',
          borderRadius: '13px',
          padding: '9px 12px',
          color: 'rgba(60,60,67,.45)',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      '描述你想要构建的内容，/ 调用指令，@ 文件或对话',
      h(
        'span',
        {
          style: {
            background: '#007aff',
            color: '#fff',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
          },
        },
        '↑',
      ),
    ),
  ),
)

const props = {
  project: projectSnapshot.root,
  server: { project: projectSnapshot, statusRaw: projectSnapshot, config: {} },
  conversation: fakeConversation,
  sessionBound: true,
  canStartChat: true,
  ribWork: {
    module: { id: 'M40', name: '统计分析' },
    branch: { id: 'B40-03', name: 'IPTW 诊断', parent: 'B20-01' },
    parent: 'B20-01',
    brief: '为队列 v2 构建 IPTW 权重并完成诊断：加权后协变量平衡、权重极端值、有效样本量，提出截尾方案供主项目决定。',
    context: '# 分支上下文档案 — B40-03（IPTW 诊断）\n- 所属主支：M40（统计分析）\n- 任务意图：构建倾向评分加权模型...',
    directivesParsed: [
      {
        at: '2026-10-18T14:20:00Z',
        author: '主项目大脑',
        side: 'human',
        text: '请以队列 v2 为基础完成加权诊断，重点输出平衡表与截尾对有效样本量的影响。',
      },
      {
        at: '2026-10-18T16:45:00Z',
        author: 'human',
        side: 'human',
        text: '为什么入科乳酸的加权 SMD 相对偏高？请评估 99% 截尾方案。',
      },
      {
        at: '2026-10-18T17:05:00Z',
        author: 'stats-builder-agent',
        side: 'agent',
        text: '已排查极值：加权后 SMD = 0.31，主因 top 1% 权重（最大 18.4）。建议双侧 1%–99% 截尾，截尾后 SMD 降至 0.08，有效样本量 412 → 486。',
      },
    ],
    sessionParsed: [
      {
        title: '1. 任务接入与初始意图（来自主项目大脑）',
        text: '为队列 v2 构建倾向评分加权（IPTW）模型。基线包括 22 个协变量。',
      },
      {
        title: '2. 智能体内部推理与推翻的假设',
        text: '尝试 1：未稳定化倾向评分权重（最高达到 84.3，方差膨胀被打回）\n尝试 2：边际稳定化系数 sw，第 99 百分位数 7.82\n尝试 3：1%-99% 双侧截尾，加权 Cox HR 0.82 (95% CI 0.71-0.95)',
      },
      {
        title: '3. 评估者智能体审核意见',
        text: '靶向试验原则审查通过；work/iptw.R 可复现性质检吻合；决策点已提交主项目。',
      },
      {
        title: '4. 关键产物清单',
        text: 'work/iptw.R, outputs/balance_smd.csv, outputs/iptw_diagnostics_report.md',
      },
    ],
  },
  /* FishboneView 真正消费的是 options.fishbone —— 结构为
   * { ok, head, spine, ribs, totals, attention, cliErrors }。
   * 这个对象在真实环境里来自 GET /fishbone。 */
  fishbone: {
    ok: true,
    head: {
      title: '重症低磷血症早期补磷对 28 天病死率的影响',
      goal: '目标试验模拟（Target Trial Emulation）；项目目标=研究目标，主支=研究阶段，分支=按需分出的探索智能体。',
      phase: '分析',
      nextSteps: ['主项目决定 IPTW 权重截尾方案', '完成主分析 v1 并提交'],
      blockers: [{ id: 'K01', name: 'B30-03 缺失审计', reason: '待数据管理员澄清 2024-07 起补磷医嘱表结构变更' }],
    },
    spine: [
      /* 字段必须与真实 GET /fishbone 契约一致（DESIGN §4.2）：
       * completion（accepted/total 比率），**不是** progress。
       * 早前这里写 progress，渲染出 "undefined% · N 分支"，是 mock 与真 API 的字段漂移。 */
      { id: 'M00', name: '研究问题与方案', phase: '规划', status: 'ACCEPTED', completion: 100, active: false, staleness: false, ribs: ['B10-01'], total: 1 },
      { id: 'M10', name: '文献证据', phase: '文献', status: 'ACCEPTED', completion: 50, active: false, staleness: false, ribs: ['B20-01', 'B20-02'], total: 2 },
      { id: 'M20', name: '数据队列', phase: '数据', status: 'PROVISIONAL', completion: 0, active: true, staleness: false, ribs: ['B30-01', 'B30-03'], total: 2 },
      { id: 'M30', name: '统计分析', phase: '分析', status: 'PROVISIONAL', completion: 33, active: true, staleness: false, ribs: ['B40-01', 'B40-02', 'B40-03'], total: 3 },
      { id: 'M40', name: '论文写作', phase: '写作', status: 'ACCEPTED', completion: 0, active: false, staleness: false, ribs: [], total: 0 },
      { id: 'M50', name: '审稿修订', phase: '审稿', status: 'DRAFT', completion: 0, active: true, staleness: false, ribs: ['B50-01'], total: 1 },
    ],
    ribs: [
      { id: 'B10-01', name: '方案方法学审查', module: 'M00', status: 'ACCEPTED', progress: 100, stage: '返修' },
      { id: 'B20-01', name: '文献检索 v1', module: 'M10', status: 'REJECTED', progress: 100, stage: '作废' },
      { id: 'B20-02', name: '文献检索 v2', module: 'M10', status: 'ACCEPTED', progress: 100, stage: '回连' },
      { id: 'B30-01', name: '时间零点核查', module: 'M20', status: 'DRAFT', progress: 30, stage: '探路' },
      { id: 'B30-03', name: '缺失审计', module: 'M20', status: 'BLOCKED', progress: 0, stage: '卡点' },
      { id: 'B40-01', name: '基线表', module: 'M30', status: 'ACCEPTED', progress: 100, stage: '回连' },
      { id: 'B40-02', name: '主分析', module: 'M30', status: 'DRAFT', progress: 30, stage: '探路' },
      { id: 'B40-03', name: 'IPTW 诊断', module: 'M30', status: 'PROVISIONAL', progress: 60, stage: '待回连' },
      { id: 'B50-01', name: '审稿修订计划', module: 'M50', status: 'DRAFT', progress: 30, stage: '探路' },
    ],
    totals: { modules: 6, ribs: 9, accepted: 4, provisional: 2, blocked: 1, progress: 62 },
    attention: [
      { id: 'A1', branch: 'B20-01', kind: 'stale', message: '文献检索 v1 因方案调整而过期，建议重新检索', text: '文献检索 v1 因方案调整而过期' },
      { id: 'A2', branch: 'B40-03', kind: 'decision', message: 'IPTW 截尾方案待主项目拍板', text: 'IPTW 截尾方案待拍板' },
    ],
    markers: [
      { stream: '方案方法学审查', version: 1 },
      { stream: '文献检索与PRISMA证据', version: 2 },
      { stream: '基线协变量平衡表', version: 1 },
    ],
    cliErrors: [],
  },
  selectedModule: 'M30',
  selectedRib: 'B40-03',
}

const Panel = (await import('../src/WorkbenchPanel.js')).createWorkbenchPanel(React)

/* 播种关键 state：跳过真实网络拉取，直接给出"已加载完成"的画面。
 * 索引严格对照 WorkbenchPanel.js 里 React.useState 的出现顺序：
 *   #0  width             ← 1680
 *   #1  projectInput      ← 项目路径
 *   #31 fishbone          ← 鱼骨主干与分支数据
 *   #32 fishboneLoading   ← false
 *   #33 fishboneError     ← ''
 *   #38 selectedModule    ← 选中「统计分析」
 *   #39 selectedRib       ← 选中「IPTW 诊断」
 *   #73 drawerOpen        ← 展开底部抽屉，便于一屏看清全景 */
seedStates = {
  0: projectSnapshot.root,
  4: 'fishbone',
  30: props.fishbone,
  31: false,
  32: '',
  37: 'M30',
  38: 'B40-03',
  39: null,
  72: false,
}

/* 关键：Panel 内部有 40+ 个 useState，它们**都在这一次调用里**按顺序执行。
 * 因此在调用前归零索引，并确认 seedStates 已就绪。 */
stateIdx = 0
states.length = 0
if (process.env.RDW_DEBUG_STATE === '1') {
  console.log('调用 Panel 前 seedStates keys:', Object.keys(seedStates).join(','))
  console.log('调用 Panel 前 stateIdx:', stateIdx)
}
const out = Panel(props)
if (process.env.RDW_DEBUG_STATE === '1') {
  console.log('调用 Panel 后 stateIdx:', stateIdx, ' states.length:', states.length)
  console.log('states[2] 是否有 spine:', Boolean(states[2] && states[2].spine))
}

/* Panel 返回的已是元素树（hooks 已在上面执行完），直接序列化即可。 */
const bodyHtml = render(out)

if (process.env.RDW_DEBUG_STATE === '1') {
  console.log('=== 调试：states 前 20 ===')
  for (let i = 0; i < 20; i += 1) {
    const v = states[i]
    const brief = v === undefined ? 'undefined' : v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v).slice(0, 70) : String(v).slice(0, 70)
    console.log(`  [${i}] ${brief}`)
  }
  console.log('seedStates keys:', Object.keys(seedStates).join(','))
}

const page = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>真实渲染</title>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f2f2f7}
/* #root 必须让子项撑满宽度：#root 用 flex 但不指定方向时会退化成 row，
 * 子项按内容宽度排布，页面右侧因此多出空白（不是产品代码的问题）。 */
#root{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch}
#root > *{flex:1 1 auto;min-width:0;min-height:0}
${css}
</style></head><body><div id="root">${bodyHtml}</div></body></html>`

const outPath = process.argv[2] || '.preview/real-render.html'
writeFileSync(outPath, page, 'utf8')
console.log('已渲染:', outPath)
console.log('HTML 长度:', page.length, '字符')
console.log('含 rdw-shell:', page.includes('rdw-shell'))
console.log('含 rdw-native-slot:', page.includes('rdw-native-slot'))
console.log('含 会话未接入:', page.includes('会话未接入'))
