/**
 * 工作台「整页业务优先」布局验收（只读、可复现）。
 *
 * 对照 https://dshdesktop.com/workbench/docs/development.md
 *   §3.5 客户端注册（title / repository / icon / description / 不填 id）
 *   §4.1 标准分栏与容器宽度重排
 *   §4.2 首次进入与无会话状态由工作台自己设计，不自动建会话
 *   §4.3 业务整页优先（customFrame）时自己安置宿主会话节点
 *
 * 验收方式：读 src 源码 + lib/client.js 构建产物 + 用渲染桩挂载真实组件，
 * 断言结构、文案与交互结果，不依赖窗口尺寸，也不启动浏览器。
 *
 * 用法：node verify/verify-layout.mjs [--json]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const AS_JSON = process.argv.includes('--json')

const failures = []
const passes = []
function ok(label) {
  passes.push(label)
  if (!AS_JSON) console.log(`  OK   ${label}`)
}
function bad(label, detail) {
  failures.push({ label, detail })
  if (!AS_JSON) console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}
function check(condition, label, detail) {
  if (condition) ok(label)
  else bad(label, detail)
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

/* ------------------------------------------------------------- 渲染桩 */
function sameDeps(previous, next) {
  if (!Array.isArray(previous) || !Array.isArray(next)) return false
  if (previous.length !== next.length) return false
  return previous.every((item, index) => Object.is(item, next[index]))
}

function createHarness() {
  const root = { component: null, props: null, tree: null, slots: [], hookIndex: 0, pendingEffects: [], dirty: false }
  const ensureSlot = (index) => {
    if (!root.slots[index]) root.slots[index] = {}
    return root.slots[index]
  }
  const React = {
    createElement(type, props) {
      const children = Array.prototype.slice.call(arguments, 2)
      const merged = Object.assign({}, props || {})
      if (children.length === 1) merged.children = children[0]
      else if (children.length > 1) merged.children = children
      return { type, props: merged }
    },
    useState(initial) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!Object.prototype.hasOwnProperty.call(slot, 'value')) slot.value = typeof initial === 'function' ? initial() : initial
      return [
        slot.value,
        (next) => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (!Object.is(value, slot.value)) {
            slot.value = value
            root.dirty = true
          }
        },
      ]
    },
    useRef(value) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.ref) slot.ref = { current: value }
      return slot.ref
    },
    useEffect(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      const changed = !slot.hasEffect || !sameDeps(slot.effectDeps, deps)
      slot.effectDeps = deps
      slot.hasEffect = true
      if (changed) root.pendingEffects.push({ slot, fn })
    },
    useCallback(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) {
        slot.memo = fn
        slot.memoDeps = deps
        slot.hasMemo = true
      }
      return slot.memo
    },
    useMemo(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) {
        slot.memo = fn()
        slot.memoDeps = deps
        slot.hasMemo = true
      }
      return slot.memo
    },
  }
  const renderOnce = () => {
    root.hookIndex = 0
    root.pendingEffects = []
    root.dirty = false
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
    root.component = component
    root.props = props
    root.slots = []
    renderOnce()
    await settle()
    return root.tree
  }
  return { React, root, mount, settle, renderOnce }
}

function textOf(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join('')
  if (typeof node === 'function') return ''
  if (typeof node === 'object' && node.props) return textOf(node.props.children)
  return ''
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  visit(node)
  if (node.props) walk(node.props.children, visit)
}

function collectByType(node, type) {
  const found = []
  walk(node, (candidate) => {
    if (candidate.type === type) found.push(candidate)
  })
  return found
}

function findButton(tree, label) {
  return collectByType(tree, 'button').find((node) => textOf(node.props.children) === label) || null
}

function countNodes(tree) {
  let total = 0
  walk(tree, () => {
    total += 1
  })
  return total
}

function hasAttr(node, name) {
  return Boolean(node && node.props && Object.prototype.hasOwnProperty.call(node.props, name))
}

function collectByAttr(tree, name) {
  const found = []
  walk(tree, (candidate) => {
    if (hasAttr(candidate, name)) found.push(candidate)
  })
  return found
}

/* -------------------------------------------------------------- 数据桩 */
const SAMPLE = 'D:\\ZhuanZ\\Documents\\research-dag\\examples\\early-phosphate'
const ROUTE = '/research-dag-workbench'
const PATHS = {
  health: `${ROUTE}/health`,
  state: `${ROUTE}/state`,
  fishbone: `${ROUTE}/fishbone`,
  content: `${ROUTE}/content`,
  leaderLog: `${ROUTE}/leader-log`,
  results: `${ROUTE}/results`,
  runs: `${ROUTE}/runs`,
}

const healthNew = {
  ok: true,
  name: 'dsh-research-dag-workbench',
  version: '3.3.0',
  route: ROUTE,
  actions: ['status', 'verify', 'list', 'check', 'submit', 'accept', 'reject', 'block', 'unblock', 'report', 'state-set', 'results', 'auto', 'init', 'module-add', 'branch-add', 'handoff-new', 'content'],
  bridgeActions: ['publish', 'idea', 'review', 'pull'],
  networkAvailable: true,
  example: SAMPLE,
  configPath: 'C:\\Users\\ZhuanZ\\.dsh\\research-dag-workbench\\config.json',
}

const moduleFixture = [
  ['M10', '研究问题与方案'],
  ['M20', '文献检索'],
  ['M30', '数据与队列'],
  ['M40', '统计分析'],
  ['M50', '论文写作'],
  ['M60', '审稿修订'],
].map(([id, name]) => ({
  id,
  name,
  phase: 'analysis',
  dir: `modules/${id}`,
  counts: { draft: 1, provisional: 0, accepted: 2, rejected: 0, superseded: 0, blocked: 0 },
  completion: 66,
}))

const stateWithProject = {
  ok: true,
  configured: true,
  config: { version: 1, projectRoot: SAMPLE },
  project: {
    root: SAMPLE,
    exists: true,
    isDag: true,
    id: 'early-phosphate',
    title: '重症低磷血症患者早期补磷的 target trial emulation',
    goal: '估计早期补磷对 28 天全因死亡的影响',
    phase: 'analysis',
    next_steps: ['完成主分析 v1 并提交'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
    modules: moduleFixture,
    branches: [],
    handoffs: [],
    pending_decisions: [],
    accepted: [],
    counts: { draft: 1, provisional: 2, accepted: 6, rejected: 1, superseded: 1, blocked: 1 },
  },
  verify: { ok: true, checked: { handoffs: 12, modules: 6, branches: 13, files: 26 }, issues: [] },
  statusRaw: {},
}

/** 首用场景：没有任何已保存项目（宿主也没配置项目根路径）。 */
const stateNoProject = {
  ok: true,
  configured: false,
  config: { version: 1, projectRoot: '' },
  project: null,
  verify: null,
  statusRaw: null,
}

const fishboneFixture = {
  ok: true,
  root: SAMPLE,
  head: {
    id: 'early-phosphate',
    title: '重症低磷血症患者早期补磷的 target trial emulation',
    goal: '估计早期补磷对 28 天全因死亡的影响',
    phase: 'analysis',
    nextSteps: ['完成主分析 v1 并提交'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
  },
  spine: [
    { id: 'M10', name: '研究问题与方案', dir: 'modules/M10', ribs: ['B10-01'], counts: { accepted: 1 }, total: 1, completion: 100, active: false, staleness: false },
    { id: 'M20', name: '文献检索', dir: 'modules/M20', ribs: ['B20-01'], counts: { provisional: 1 }, total: 1, completion: 60, active: false, staleness: false },
    { id: 'M40', name: '统计分析', dir: 'modules/M40', ribs: ['B40-03', 'B40-02'], counts: { draft: 1, accepted: 1 }, total: 2, completion: 50, active: true, staleness: false },
    { id: 'M60', name: '审稿修订', dir: 'modules/M60', ribs: [], counts: {}, total: 0, completion: 0, active: false, staleness: false },
  ],
  ribs: [
    { id: 'B10-01', module: 'M10', name: '研究方案', dir: 'modules/M10/branches/B10-01', status: 'ACCEPTED', stream: 'protocol-charter', version: 1, is_stale: false, counts: { accepted: 1 }, weight: 100, brief: '把临床问题转成可执行的 TTE 方案。', workFiles: [], outputFiles: [], hasSession: false, hasDirectives: false, lastActivityAt: '2026-09-19T10:00:00+08:00' },
    { id: 'B20-01', module: 'M20', name: '协变量取舍', dir: 'modules/M20/branches/B20-01', status: 'PROVISIONAL', stream: 'covariate-set', version: 1, is_stale: true, counts: { provisional: 1 }, weight: 60, brief: '从文献中提炼候选协变量集合。', workFiles: [], outputFiles: [], hasSession: true, hasDirectives: false, lastActivityAt: '2026-10-10T10:00:00+08:00' },
    { id: 'B40-03', module: 'M40', name: 'IPTW 诊断', dir: 'modules/M40/branches/B40-03', status: 'ACCEPTED', stream: 'iptw-diagnostics', version: 1, is_stale: false, counts: { accepted: 1 }, weight: 100, brief: '构建 IPTW 权重并完成诊断。', workFiles: [], outputFiles: [], hasSession: true, hasDirectives: true, lastActivityAt: '2026-10-16T10:00:00+08:00' },
    { id: 'B40-02', module: 'M40', name: '主分析', dir: 'modules/M40/branches/B40-02', status: 'DRAFT', stream: 'main-analysis', version: 1, is_stale: false, counts: { draft: 1 }, weight: 25, brief: '加权 Cox 与 KM 主分析。', workFiles: [], outputFiles: [], hasSession: false, hasDirectives: false, lastActivityAt: '2026-10-12T10:00:00+08:00' },
  ],
  attention: [
    { kind: 'stale', rib: 'B20-01', module: 'M20', message: '上游方案已变更，B20-01 协变量取舍需要重新评估', target: 'modules/M20/branches/B20-01' },
    { kind: 'blocked', module: 'M30', message: 'B30-03 缺失审计等待数据管理员澄清', target: 'modules/M30' },
  ],
  totals: { modules: 4, ribs: 4, activeRibs: 1, accepted: 2, stale: 1, blocked: 1, attention: 2 },
  cliErrors: [],
  generatedAt: '2026-10-19T08:00:00+08:00',
}

const contentFixture = {
  ok: true,
  root: SAMPLE,
  modules: moduleFixture.map((module) =>
    Object.assign({}, module, {
      question: `研究问题：${module.name}`,
      keyResults: ['关键结果一（示例）'],
      limitations: ['局限一（示例）'],
      files: [],
      reviews: [],
      pending: [],
      attention: [],
    }),
  ),
  attention: [{ kind: 'decision', module: 'M30', message: 'B30-03 缺失审计等待数据管理员澄清' }],
}

const leaderFixture = {
  ok: true,
  root: SAMPLE,
  state: { phase: 'analysis', nextSteps: ['完成主分析 v1 并提交'], blockers: [] },
  decisions: [],
  ideas: [],
  reviews: [],
  timeline: [],
  counts: { decisions: 0, ideas: 0, reviews: 0, accepted: 0, rejected: 0, blocked: 0 },
  generatedAt: '2026-10-19T09:00:00+08:00',
}

function makeFetchMock(statePayload) {
  const log = []
  return {
    log,
    fetch: async (url, options) => {
      const method = (options && options.method ? options.method : 'GET').toUpperCase()
      const pathname = String(url).split('?')[0]
      log.push({ method, pathname })
      const answer = (payload) => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(payload)) })
      if (pathname === PATHS.health) return answer(healthNew)
      if (pathname === PATHS.state) return answer(statePayload)
      if (pathname === PATHS.fishbone) return answer(fishboneFixture)
      if (pathname === PATHS.content) return answer(contentFixture)
      if (pathname === PATHS.leaderLog) return answer(leaderFixture)
      if (pathname === PATHS.results) return answer({ ok: true, results: [], pendingDecisions: [], accepted: [], limitations: [] })
      if (pathname === PATHS.runs) return answer({ ok: true, runs: [] })
      return answer({ ok: false, code: 'E_UNKNOWN', error: `未 mock：${pathname}` })
    },
  }
}

/** 假宿主服务：记录调用次数，用于断言「首屏不自动建会话」。 */
function makeService() {
  const calls = { newSession: 0, newWorkspaceSession: 0, run: 0 }
  let current = null
  const bindings = {}
  let id = 0
  const service = {
    state: { active: 'zhuanz/dsh-research-dag-workbench', added: ['zhuanz/dsh-research-dag-workbench'], sessionBindings: bindings },
    blocked: false,
    pending: 0,
    currentSession: () => current,
    ownsSession: (sessionId) => Boolean(sessionId) && bindings[sessionId] === service.state.active,
    defaultWorkspace: () => ({ workspaceId: 'ws-1', title: 'research-dag' }),
    newSession: () => {
      calls.newSession += 1
      return () => {
        id += 1
        current = `sess-${id}`
        bindings[current] = service.state.active
      }
    },
    newWorkspaceSession: () => {
      calls.newWorkspaceSession += 1
      return () => {
        id += 1
        current = `sess-${id}`
        bindings[current] = service.state.active
      }
    },
    run: (task) => {
      calls.run += 1
      if (typeof task === 'function') task()
    },
  }
  return { service, calls }
}

/* ---------------------------------------------------------------- main */
async function loadPlugin(fetchImpl) {
  const source = read('lib/client.js')
  let entry = null
  const windowMock = { __ModuleLoader__: { load(descriptor) { entry = descriptor } } }
  new Function('window', 'fetch', 'setTimeout', 'clearTimeout', 'console', source)(
    windowMock,
    fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ ok: false }) })),
    setTimeout,
    clearTimeout,
    console,
  )
  const harness = createHarness()
  const plugin = entry.factory((spec) => {
    if (spec === 'react') return harness.React
    throw new Error(`unexpected require: ${spec}`)
  })
  return { source, entry, plugin, harness }
}

function registerComponent(plugin) {
  const registrations = []
  plugin.apply({
    effect(fn) { fn(); return () => {} },
    desktopWorkbenches: {
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  })
  return registrations[0] || {}
}

/** 一次完整的「装了 mock 的客户端 + 渲染」准备。 */
async function bootWith(statePayload, props) {
  const mock = makeFetchMock(statePayload)
  const loaded = await loadPlugin(mock.fetch)
  const registered = registerComponent(loaded.plugin)
  const tree = await loaded.harness.mount(registered.component, props || {})
  return { mock, loaded, harness: loaded.harness, plugin: loaded.plugin, options: registered.options, tree }
}

/** 带宿主原生会话节点挂载（conversation 必须用同一 harness 的 createElement）。 */
async function bootWithConversation(statePayload, service) {
  const mock = makeFetchMock(statePayload)
  const loaded = await loadPlugin(mock.fetch)
  const registered = registerComponent(loaded.plugin)
  const conversation = loaded.harness.React.createElement('div', { id: 'host-native-conversation' }, '宿主原生会话节点')
  await loaded.harness.mount(registered.component, { service, conversation })
  const rerender = () => loaded.harness.settle()
  return { options: registered.options, harness: loaded.harness, mock, rerender }
}

async function main() {
  console.log('研究项目 DAG 工作台 · 整页业务优先布局验收')
  console.log('')

  /* -------- A. 注册协议（§3.5 + §4 布局字段） -------- */
  console.log('A) 注册协议与布局字段')
  const boot = await bootWith(stateWithProject)
  const { source, plugin } = boot.loaded
  const options = boot.options || {}
  check(Boolean(plugin), '客户端插件可加载')
  check(plugin.name === 'dsh-research-dag-workbench', `plugin.name = ${plugin.name}`)
  check(typeof options.title === 'string' && options.title.length > 0, `工作台标题非空（${options.title}）`)
  check(typeof options.description === 'string' && options.description.length > 0, '提供业务描述')
  check(typeof options.icon === 'function', '提供侧栏图标')
  check(/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(String(options.repository)), `repository 是规范 GitHub URL（${options.repository}）`)
  check(options.id === undefined, '不填 register({ id })（身份由 repository 解析）')
  check(options.customFrame === true, '启用整页业务优先（customFrame: true）')
  check(options.headerLayout === 'compact', `使用宿主紧凑顶部栏（headerLayout = ${options.headerLayout}）`)
  check(
    options.layout && options.layout.businessSide === 'left' && options.layout.businessWidth >= 0.25 && options.layout.businessWidth <= 0.7,
    `保留标准分栏兜底（${JSON.stringify(options.layout)}）`,
  )

  /* -------- B. 命令栏唯一性与单页信息架构 -------- */
  console.log('')
  console.log('B) 命令栏唯一性与单页信息架构（宿主硬要求）')
  const toolbars = collectByAttr(boot.tree, 'data-dsh-workbench-toolbar')
  check(toolbars.length === 1, `页面内 data-dsh-workbench-toolbar 恰好 1 个（实际 ${toolbars.length}）`)
  const toolbarNode = toolbars[0] || null
  const toolbarText = toolbarNode ? textOf(toolbarNode) : ''
  check(toolbarText.includes('研究项目工作台'), '命令栏含工作台标题')
  check(
    Boolean(toolbarNode && collectByType(toolbarNode, 'button').length >= 5),
    `命令栏内含导航与操作按钮（${toolbarNode ? collectByType(toolbarNode, 'button').length : 0} 个）`,
  )

  /* v4：6 个平级页签被「面包屑 + 状态指示器 + 侧滑面板」取代。
   * 检查强度不降反升——原来只验页签存在，现在验：
   *   1) 页签已消失（不再有平级切换，避免上下文丢失）；
   *   2) 面包屑承担「我在哪」；
   *   3) 状态指示器承担「要处理什么」；
   *   4) 全局搜索承担「怎么跳」。 */
  const tabButtons = collectByType(boot.tree, 'button').map((node) => textOf(node.props.children))
  check(tabButtons.filter((label) => label === '📋 项目流程').length === 0, '平级「项目流程」页签已移除（改为常驻三栏）')
  /* 「主智能体」不再是页签，而是命令栏上的面板入口（pill 样式）。
   * 判据：同名按钮存在，且它不带 role="tab"——即不再是平级页签。 */
  const roleTabLabels = collectByType(boot.tree, 'button')
    .filter((node) => String(node.props.role || '') === 'tab')
    .map((node) => textOf(node.props.children))
  check(roleTabLabels.length === 0, `页面内已无平级页签（role=tab 按钮数 = ${roleTabLabels.length}）`)
  check(toolbarText.includes('主智能体'), '命令栏保留「主智能体」面板入口')
  check(toolbarText.includes('跳转项目 / 分支 / 文件'), '命令栏提供全局跳转入口（⌘K）')
  check(toolbarText.includes('early-phosphate'), '面包屑显示当前项目（我在哪）')
  check(
    toolbarText.includes('待拍板') || toolbarText.includes('阻塞'),
    '命令栏常驻状态指示器（要处理什么）',
  )
  check(
    collectByType(boot.tree, 'button').some((node) => String(node.props.className || '').includes('rdw-crumb')),
    '面包屑层级可点击回跳',
  )
  // 旧槽位回退路径（没有 desktopWorkbenches 服务）没有原生会话，因此不显示对话入口。
  check(!tabButtons.includes('💬 打开对话'), '无宿主会话服务时不显示无效的对话入口')

  /* v4：三栏舞台 + 底部全景抽屉（单页结构，不靠页签切换） */
  const stageNodes = collectByAttr(boot.tree, 'data-dsh-no-drag').filter((node) => String(node.props.className || '').includes('rdw-stage'))
  check(stageNodes.length === 1, `三栏舞台恰好 1 个（实际 ${stageNodes.length}）`)
  // 抽屉在业务区（body 内），不在命令栏里
  const fullMarkup = textOf(boot.tree)
  check(fullMarkup.includes('分支清单'), '底部全景抽屉入口常驻（分支清单可随时展开）')
  check(fullMarkup.includes('Ishikawa 全景'), '抽屉标注全景骨架规模')

  /* -------- C. 业务整页：首屏不出现宿主通用引导 -------- */
  console.log('')
  console.log('C) 业务整页与首屏引导')
  const markup = textOf(boot.tree)
  check(markup.includes('项目目标 · 研究目标'), '首屏直接呈现研究目标（业务优先）')
  check(markup.includes('主支 · 研究主线'), '首屏呈现主支')
  check(markup.includes('分支清单'), '首屏呈现分支清单')
  check(!markup.includes('需要 AI 协助时，开始对话'), '不出现宿主通用「先建会话」引导')
  check(!markup.includes('undefined'), '页面文本无 undefined')
  check(countNodes(boot.tree) > 80, `首屏结构完整（${countNodes(boot.tree)} 节点 > 80）`)

  /* -------- D. 无会话首屏不自动建会话 -------- */
  console.log('')
  console.log('D) 首次进入不自动创建会话')
  const serviceBoot = makeService()
  const bootD = await bootWith(stateWithProject, { service: serviceBoot.service, conversation: null })
  check(Boolean(bootD.tree), '带宿主会话服务时可挂载')
  check(serviceBoot.calls.newSession === 0 && serviceBoot.calls.newWorkspaceSession === 0, '首屏未自动创建会话（newSession/newWorkspaceSession = 0）')
  check(serviceBoot.calls.run === 0, '首屏未触发任何会话动作（service.run = 0）')
  const idleMarkup = textOf(bootD.tree)
  check(!idleMarkup.includes('新建工作区并开始对话'), '不引导用户先去建工作区')
  check(!idleMarkup.includes('还没有关联的对话'), '对话区收起时不显示空会话提示（不干扰业务页）')
  check(idleMarkup.includes('💬 打开对话'), '工具栏提供「打开对话」入口（按需开启）')

  /* -------- E. 对话节点安置与收起不卸载 -------- */
  console.log('')
  console.log('E) 宿主会话节点的安置（§4.3）')
  const serviceBootE = makeService()
  const conversationBoot = await bootWithConversation(stateWithProject, serviceBootE.service)
  const chatAsides = (tree) =>
    collectByType(tree, 'aside').filter((node) => String(node.props.className || '').includes('rdw-chat'))
  let treeE = await conversationBoot.rerender()
  check(chatAsides(treeE).length === 1, '对话区容器始终存在（收起时也未卸载）')
  check(String(chatAsides(treeE)[0] && chatAsides(treeE)[0].props.className).includes('rdw-chat-collapsed'), '默认收起（不占用业务区宽度）')
  check(textOf(treeE).includes('宿主原生会话节点'), '收起状态下宿主会话节点仍在树内（展开后不丢状态）')

  const openButton = findButton(treeE, '💬 打开对话')
  check(Boolean(openButton), '存在「打开对话」按钮')
  if (openButton) {
    openButton.props.onClick({ stopPropagation() {}, preventDefault() {} })
    treeE = await conversationBoot.rerender()
    const openedAside = chatAsides(treeE)[0]
    check(Boolean(openedAside) && !String(openedAside.props.className).includes('rdw-chat-collapsed'), '点击后对话区展开（去除 collapsed）')
    check(serviceBootE.calls.newSession === 0 && serviceBootE.calls.newWorkspaceSession === 0, '只是打开对话，不自动建会话')
    check(textOf(treeE).includes('宿主原生会话节点'), '展开后宿主会话节点仍在树内（同一个节点未被重建）')
    const closeButton = findButton(treeE, '收起对话')
    check(Boolean(closeButton), '展开后提供「收起对话」')
    if (closeButton) {
      closeButton.props.onClick({ stopPropagation() {}, preventDefault() {} })
      treeE = await conversationBoot.rerender()
      check(String(chatAsides(treeE)[0] && chatAsides(treeE)[0].props.className).includes('rdw-chat-collapsed'), '再次收起后不占用宽度')
      check(textOf(treeE).includes('宿主原生会话节点'), '反复收起/展开不丢失宿主会话节点')
    }
  }

  /* -------- F. 无项目时的首用引导 -------- */
  console.log('')
  console.log('F) 无项目首用引导（§4.2）')
  const bootF = await bootWith(stateNoProject)
  const welcome = textOf(bootF.tree)
  check(welcome.includes('把研究项目画成一条项目流程'), '无项目时显示工作台自己的首用引导')
  check(welcome.includes('项目目标') && welcome.includes('主支') && welcome.includes('分支'), '首用引导解释项目流程模型')
  check(welcome.includes('加载示例项目'), '首用引导提供「加载示例项目」')
  check(welcome.includes('新建项目'), '首用引导提供「新建项目」')
  check(welcome.includes('打开对话'), '首用引导说明对话按需打开')
  check(!welcome.includes('尚未加载 DAG 项目'), '不再使用旧的裸提示行')
  check(!welcome.includes('undefined') && !welcome.includes('[object Object]'), '首用页文本无 undefined / [object Object]')
  check(collectByAttr(bootF.tree, 'data-dsh-workbench-toolbar').length === 1, '首用页同样只有 1 个紧凑工具栏')

  /* -------- G. 容器宽度重排（源码层） -------- */
  console.log('')
  console.log('G) 按业务容器宽度重排（§4.1）')
  const constantsSource = read('src/core/constants.js')
  check(constantsSource.includes('container-type:inline-size'), '容器查询：业务容器声明 inline-size 容器')
  check(constantsSource.includes('@container rdw'), '容器查询：断点绑在业务容器（@container rdw）')
  check(/@container rdw \(max-width: 860px\)/.test(constantsSource), '中等容器断点（860px）')
  check(/@container rdw \(max-width: 620px\)/.test(constantsSource), '窄容器断点（620px）')
  check(/@container rdw \(max-width: 420px\)/.test(constantsSource), '极窄容器断点（420px）')
  check(constantsSource.includes('.rdw-body{flex-direction:column}'), '中等容器以下对话区改为上下排布')
  check(constantsSource.includes('.rdw-chat.rdw-chat-collapsed{display:none!important}'), '收起只隐藏、不卸载（display 而非条件渲染）')
  check(constantsSource.includes('.rdw-fish-svg{min-width:480px!important'), '窄容器下降级项目流程图最小尺寸（避免压成细带/空白）')
  const panelSource = read('src/WorkbenchPanel.js')
  const headerSource = read('src/components/Header.js')
  const projectBarSource = read('src/components/ProjectBar.js')
  check(panelSource.includes('ResizeObserver'), '运行时测量业务容器宽度（ResizeObserver）')
  check(panelSource.includes("'--rdw-chat-width'"), '对话区宽度按容器宽度给出（CSS 变量）')
  check(
    panelSource.includes('data-dsh-no-drag') || headerSource.includes('data-dsh-no-drag') || projectBarSource.includes('data-dsh-no-drag'),
    '交互区声明 data-dsh-no-drag（macOS 拖拽区安全）',
  )

  /* -------- H. 构建产物同步 -------- */
  console.log('')
  console.log('H) 构建产物与源码同步')
  check(source.includes('data-dsh-workbench-toolbar'), 'bundle 内含紧凑工具栏标记')
  check(source.includes('customFrame: true') || source.includes('customFrame:!0'), 'bundle 内含整页业务优先标记')
  check(source.includes('rdw-shell'), 'bundle 内含整页框架样式')
  check(source.includes('@container rdw'), 'bundle 内含容器查询')
  check(source.includes('sidebar.panellist') && source.includes("slots.inject('main'"), '仍保留旧槽位回退（旧宿主可用）')

  /* ------------------------------------------------------------- 汇总 */
  const total = passes.length + failures.length
  if (AS_JSON) {
    console.log(JSON.stringify({ ok: failures.length === 0, total, passed: passes.length, failures, passes }, null, 2))
  } else {
    console.log('')
    console.log(`RESULT: ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILURE(S)`}`)
    console.log(`检查项：${total}（通过 ${passes.length}）`)
    if (failures.length > 0) {
      console.log('')
      for (const failure of failures) console.log(`  - ${failure.label}${failure.detail ? ` — ${failure.detail}` : ''}`)
    }
  }
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((problem) => {
  console.log(`FATAL ${(problem && problem.stack) || problem}`)
  process.exit(2)
})
