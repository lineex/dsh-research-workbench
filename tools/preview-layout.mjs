/**
 * 真实浏览器渲染预览（仅本地视觉自检用，不进入发布包）。
 *
 * 目的：把 lib/client.js 按宿主协议装进一个真实页面，检查布局在真实 DOM/CSS 下的表现：
 *   - 业务整页占满；无会话时不出现宿主通用引导；
 *   - 打开/收起对话后，宿主传入的会话节点保持挂载（不丢状态）；
 *   - 窄容器（模拟侧栏展开 + 小窗）下按业务容器宽度重排，无单字竖排、无整页横向溢出。
 *
 * 依赖：宿主同版本 React 18 UMD（本地 profile 里的 react.production.min.js）。
 * 为免再引 react-dom 依赖，这里用一份最小 DOM 渲染器（支持函数组件、hooks、事件属性、
 * 内联样式、className、children），只覆盖本工作台实际用到的能力。
 *
 * 用法：node tools/preview-layout.mjs   → 生成 .preview/workbench-layout.html
 * 随后用 Chromium/Playwright 打开该页在多个宽度下截图。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const OUT = join(ROOT, '.preview')
mkdirSync(OUT, { recursive: true })

const bundle = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
const reactProd = process.env.DSH_REACT_UMD
  || join(process.env.USERPROFILE, '.dsh', 'profiles', 'desktop', 'node_modules', 'react', 'umd', 'react.production.min.js')
const reactSource = readFileSync(reactProd, 'utf8')

/** 最小 React-DOM 渲染器（只服务预览；不参与发布包）。 */
const MINI_DOM = `
(function () {
  const hooks = { list: [], index: 0, effects: [] };
  let scheduled = false;
  let rootEl = null;
  let rootComponent = null;
  let rootProps = null;

  window.React = window.React || {};
  // 用真实 React 的 createElement，只覆盖渲染
  const createElement = window.React.createElement;

  function applyProps(el, props) {
    for (const key of Object.keys(props || {})) {
      if (key === 'children' || key === 'key' || key === 'ref') continue;
      const value = props[key];
      if (value === null || value === undefined || value === false) continue;
      if (key === 'style' && value && typeof value === 'object') {
        for (const prop of Object.keys(value)) {
          const raw = value[prop];
          if (raw === null || raw === undefined) continue;
          if (prop.startsWith('--')) el.style.setProperty(prop, String(raw));
          else el.style[prop] = typeof raw === 'number' && !/^(zIndex|opacity|flex|flexGrow|flexShrink|order|lineHeight|fontWeight)$/.test(prop) ? raw + 'px' : String(raw);
        }
        continue;
      }
      if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
        continue;
      }
      if (key === 'className') { el.setAttribute('class', String(value)); continue; }
      if (key === 'htmlFor') { el.setAttribute('for', String(value)); continue; }
      if (key === 'value' || key === 'checked' || key === 'selected') { el[key] = value; continue; }
      if (typeof value === 'boolean') { if (value) el.setAttribute(key, ''); continue; }
      el.setAttribute(key, String(value));
    }
  }

  const VOID = new Set(['input','img','br','hr','line','rect','path','circle','polygon','polyline','ellipse','use','stop']);

  function renderNode(node, parent) {
    if (node === null || node === undefined || node === false || node === true) return;
    if (typeof node === 'string' || typeof node === 'number') {
      parent.appendChild(document.createTextNode(String(node)));
      return;
    }
    if (Array.isArray(node)) { for (const child of node) renderNode(child, parent); return; }
    if (typeof node === 'function') { renderNode(createElement(node), parent); return; }
    if (typeof node !== 'object' || !node.type) return;

    if (typeof node.type === 'function') {
      hooks.index = 0;
      renderNode(node.type(node.props || {}), parent);
      return;
    }
    const tag = node.type;
    const el = tag === 'svg' || tag === 'g' || tag === 'defs' || tag === 'linearGradient' || tag === 'stop' || tag === 'clipPath' || tag === 'text' || tag === 'tspan' || tag === 'polygon' || tag === 'line' || tag === 'rect' || tag === 'path' || tag === 'circle' || tag === 'ellipse'
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
    applyProps(el, node.props);
    parent.appendChild(el);
    if (!VOID.has(tag)) renderNode(node.props && node.props.children, el);
    return el;
  }

  function rerender() {
    scheduled = false;
    if (!rootEl || !rootComponent) return;
    rootEl.textContent = '';
    hooks.index = 0;
    const effects = [];
    hooks.effects = effects;
    const tree = rootComponent(rootProps);
    renderNode(tree, rootEl);
    for (const fn of effects) { try { fn(); } catch (problem) { console.error(problem); } }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(rerender);
  }

  const mounted = new Map();
  let slotIndex = 0;
  window.React.useState = function (initial) {
    const slot = slotIndex++;
    if (!mounted.has(slot)) mounted.set(slot, typeof initial === 'function' ? initial() : initial);
    const set = (next) => {
      const value = typeof next === 'function' ? next(mounted.get(slot)) : next;
      if (Object.is(value, mounted.get(slot))) return;
      mounted.set(slot, value);
      slotIndex = 0;
      schedule();
    };
    return [mounted.get(slot), set];
  };
  window.React.useRef = function (value) {
    const slot = 'ref' + (slotIndex++);
    if (!mounted.has(slot)) mounted.set(slot, { current: value });
    return mounted.get(slot);
  };
  window.React.useEffect = function (fn, deps) {
    const slot = 'effect' + (slotIndex++);
    const previous = mounted.get(slot);
    const changed = !previous || !deps || deps.length !== previous.length || deps.some((item, i) => !Object.is(item, previous[i]));
    if (changed) { mounted.set(slot, deps || null); hooks.effects.push(fn); }
  };
  window.React.useMemo = function (fn, deps) {
    const slot = 'memo' + (slotIndex++);
    const previous = mounted.get(slot);
    const changed = !previous || !deps || deps.length !== previous.length || deps.some((item, i) => !Object.is(item, previous[i]));
    if (changed) mounted.set(slot, { value: fn(), deps: deps || null });
    return mounted.get(slot).value;
  };
  window.React.useCallback = function (fn, deps) { return window.React.useMemo(() => fn, deps); };

  window.MiniDOM = {
    render(component, props, element) {
      rootComponent = component; rootProps = props; rootEl = element;
      rerender();
    },
    rerender: schedule,
  };
})();
`

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>研究项目 DAG 工作台 — 布局自检</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; }
  body {
    background: #14161a; color: #e6e8eb;
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  #host { position: fixed; inset: 0; display: flex; flex-direction: column; min-height: 0; }
  #frame { display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; overflow: hidden; }
  #frame-host { display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0; overflow: hidden; position: relative; }
  .fake-chat { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .fake-chat-head { flex: none; padding: 10px 14px; border-bottom: 1px solid #2a2f36; font-size: 12px; color: #9aa4b2; }
  .fake-chat-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .fake-bubble { max-width: 92%; padding: 8px 11px; border-radius: 10px; font-size: 12px; line-height: 1.6; }
  .fake-bubble.me { align-self: flex-end; background: #1f6feb; color: #fff; }
  .fake-bubble.ai { align-self: flex-start; background: #232830; color: #d5dae1; }
  .fake-chat-foot { flex: none; padding: 10px 14px; border-top: 1px solid #2a2f36; }
  .fake-chat-foot input { width: 100%; box-sizing: border-box; background: #1b1f25; border: 1px solid #2f353d; border-radius: 8px; color: inherit; padding: 8px 10px; font: inherit; font-size: 12px; }
</style>
</head>
<body>
<div id="host">
  <div id="frame">
    <div id="frame-host"></div>
  </div>
</div>

<script>${reactSource}</script>
<script>${MINI_DOM}</script>
<script>
  // ---- 假宿主服务 ----
  const state = { sessionBindings: {}, active: 'zhuanz/dsh-research-dag-workbench', added: ['zhuanz/dsh-research-dag-workbench'] }
  let current = null
  const listeners = new Set()
  const service = {
    state,
    blocked: false,
    pending: 0,
    currentSession() { return current },
    ownsSession(id) { return !!id && state.sessionBindings[id] === state.active },
    defaultWorkspace() { return { workspaceId: 'ws-1', title: 'research-dag' } },
    newSession() { return () => { current = 'sess-1'; state.sessionBindings['sess-1'] = state.active; for (const fn of listeners) fn() } },
    newWorkspaceSession() { return this.newSession() },
    run(fn) { if (typeof fn === 'function') fn() },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  }
  window.__service = service

  // ---- 假后端（结构同 examples/early-phosphate） ----
  const SAMPLE = 'D:/ZhuanZ/Documents/research-dag/examples/early-phosphate'
  const json = (payload) => Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(payload)) })
  const health = {
    ok: true, name: 'dsh-research-dag-workbench', version: '3.3.0', route: '/research-dag-workbench',
    actions: ['status','verify','list','check','submit','accept','reject','block','unblock','report','state-set','results','auto','init','module-add','branch-add','handoff-new','content'],
    bridgeActions: ['publish','idea','review','pull'],
    networkAvailable: true, example: SAMPLE, configPath: 'C:/Users/ZhuanZ/.dsh/research-dag-workbench/config.json',
  }
  const modules = [['M10','研究问题与方案','analysis'],['M20','文献检索','analysis'],['M30','数据与队列','analysis'],['M40','统计分析','analysis'],['M50','论文写作','design'],['M60','审稿修订','design']]
    .map(([id, name, phase]) => ({ id, name, phase, dir: 'modules/' + id, counts: { draft: 1, provisional: 0, accepted: 2, rejected: 0, superseded: 0, blocked: 0 }, completion: 66 }))
  const statePayload = {
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
    head: { id: 'early-phosphate', title: '重症低磷血症患者早期补磷的 target trial emulation', goal: '估计早期补磷对 28 天全因死亡的影响', phase: 'analysis', nextSteps: ['完成主分析 v1 并提交'], blockers: ['B30-03 缺失审计等待数据管理员澄清'] },
    spine: [
      { id: 'M10', name: '研究问题与方案', dir: 'modules/M10', ribs: ['B10-01'], counts: { accepted: 1 }, total: 1, completion: 100, active: false, staleness: false },
      { id: 'M20', name: '文献检索', dir: 'modules/M20', ribs: ['B20-01'], counts: { provisional: 1 }, total: 1, completion: 60, active: false, staleness: false },
      { id: 'M40', name: '统计分析', dir: 'modules/M40', ribs: ['B40-03','B40-02'], counts: { draft: 1, accepted: 1 }, total: 2, completion: 50, active: true, staleness: false },
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
    cliErrors: [], generatedAt: '2026-10-19T08:00:00+08:00',
  }
  const contentPayload = {
    ok: true, root: SAMPLE,
    modules: modules.map((m) => Object.assign({}, m, {
      question: '研究问题：' + m.name,
      keyResults: ['关键结果一（示例）', '关键结果二（示例）'],
      limitations: ['局限一（示例）'],
      files: [{ name: 'notes.md', rel: m.dir + '/work/notes.md', size: 120 }],
      reviews: [], pending: [], attention: [],
    })),
    attention: [{ kind: 'decision', module: 'M30', message: 'B30-03 缺失审计等待数据管理员澄清' }],
  }
  const leader = {
    ok: true, root: SAMPLE,
    state: { phase: 'analysis', nextSteps: ['完成主分析 v1 并提交'], blockers: ['B30-03 缺失审计等待数据管理员澄清'] },
    decisions: [
      { id: 'D-0001', title: '接受研究方案 v1', at: '2026-09-22', action: 'ACCEPT', status: 'ACCEPTED', reason: '方案覆盖 estimand 与随访窗口', kind: 'decision', targetLabel: 'M10 · PROTOCOL v1', sortAt: '2026-09-22T00:00:00' },
      { id: 'D-0003', title: '拒绝文献检索 v1', at: '2026-09-30', action: 'REJECT', status: 'REJECTED', reason: '去重流程不可复现', kind: 'decision', targetLabel: 'M20 · SEARCH v1', sortAt: '2026-09-30T00:00:00' },
    ],
    ideas: [{ kind: 'idea', at: '2026-10-19 01:01', tag: 'iptw', text: '建议把 IPTW 权重 99% 截尾作为主分析', sortAt: '2026-10-19T01:01:00' }],
    reviews: [{ kind: 'review', at: '2026-10-18T17:01:47Z', target: 'iptw-diagnostics v1', verdict: '满意', note: '权重截尾与平衡诊断可信', sortAt: '2026-10-18T17:01:47' }],
    timeline: [
      { kind: 'idea', at: '2026-10-19 01:01', sortAt: '2026-10-19T01:01:00', title: '想法 · iptw', text: '建议把 IPTW 权重 99% 截尾作为主分析' },
      { kind: 'review', at: '2026-10-18T17:01:47Z', sortAt: '2026-10-18T17:01:47', title: '复核 · iptw-diagnostics v1', status: '满意', text: '权重截尾与平衡诊断可信' },
      { kind: 'decision', at: '2026-09-30', sortAt: '2026-09-30T00:00:00', id: 'D-0003', action: 'REJECT', status: 'REJECTED', title: '拒绝文献检索 v1', target: 'M20 · SEARCH v1', text: '去重流程不可复现' },
    ],
    counts: { decisions: 2, ideas: 1, reviews: 1, accepted: 1, rejected: 1, blocked: 0 },
    generatedAt: '2026-10-19T09:00:00+08:00',
  }
  const routes = {
    '/research-dag-workbench/health': health,
    '/research-dag-workbench/state': statePayload,
    '/research-dag-workbench/fishbone': fishbone,
    '/research-dag-workbench/content': contentPayload,
    '/research-dag-workbench/leader-log': leader,
    '/research-dag-workbench/results': { ok: true, results: [], pendingDecisions: [], accepted: [], limitations: [] },
    '/research-dag-workbench/runs': { ok: true, runs: [] },
  }
  window.fetch = async (url) => {
    const path = String(url).split('?')[0]
    if (routes[path]) return json(routes[path])
    return json({ ok: false, code: 'E_UNKNOWN', error: 'preview mock: ' + path })
  }

  // ---- 装载工作台 bundle ----
  let descriptor = null
  window.__ModuleLoader__ = { load(d) { descriptor = d } }
  ${bundle}
  const plugin = descriptor.factory((spec) => {
    if (spec === 'react') return window.React
    throw new Error('unexpected require: ' + spec)
  })
  let options = null, Component = null
  plugin.apply({
    effect(fn) { fn(); return () => {} },
    desktopWorkbenches: { register(opts, comp) { options = opts; Component = comp; return () => {} } },
  })
  window.__workbenchOptions = options

  // ---- 宿主协议：conversation 节点由宿主创建，工作台负责安置 ----
  const conversationNode = window.React.createElement('div', { className: 'fake-chat' },
    window.React.createElement('div', { className: 'fake-chat-head' }, '原生会话 · 研究项目 DAG 工作台'),
    window.React.createElement('div', { className: 'fake-chat-body' },
      window.React.createElement('div', { className: 'fake-bubble ai' }, '主支已经推进到「统计分析」。需要我先核对 IPTW 诊断的平衡性结果吗？'),
      window.React.createElement('div', { className: 'fake-bubble me' }, '先看一下 B40-02 主分析的模型设定。'),
      window.React.createElement('div', { className: 'fake-bubble ai' }, 'B40-02 主分析用的是加权 Cox；权重截尾 99% 写在 B40-03 的 outputs 里。'),
    ),
    window.React.createElement('div', { className: 'fake-chat-foot' }, window.React.createElement('input', { placeholder: '给这个工作台发消息…' })),
  )

  function Root() {
    const [, force] = window.React.useState(0)
    // 用宿主同款语义：无绑定会话时宿主把节点 display:none
    window.React.useEffect(() => {
      let alive = true
      const tick = () => { if (alive) force((n) => n + 1) }
      window.__service.subscribe(tick)
      return () => { alive = false }
    }, [])
    const conversation = window.React.createElement(
      'div',
      { style: { display: current ? 'contents' : 'none' } },
      window.React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: 0, minWidth: 0, height: '100%' } }, conversationNode),
    )
    return window.React.createElement(Component, { service: window.__service, entry: options, active: true, conversation })
  }

  window.MiniDOM.render(Root, {}, document.getElementById('frame-host'))
</script>
</body>
</html>`

const target = join(OUT, 'workbench-layout.html')
writeFileSync(target, html, 'utf8')
console.log(`已生成预览页：${target}`)
