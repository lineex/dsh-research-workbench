/**
 * 研究目标 · 好问题卡编辑器的**独立视觉预览**（仅本地自检，不进发布包）。
 *
 * 因为 GoalCardView 是纯渲染函数，这里直接按宿主协议给它喂一套 samples，
 * 不依赖完整工作台/假后端，方便在真实 Chromium 下截图核对：
 *   - 八层矩阵的空/满两种状态；
 *   - falsifier 缺失时整卡标红（可证伪性硬门槛）；
 *   - 窄视口下网格是否退化、有无横向溢出。
 *
 * 用法：node tools/preview-goal-card.mjs
 * 产物：.preview/goal-card.html
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const OUT = join(ROOT, '.preview')
mkdirSync(OUT, { recursive: true })

const { renderGoalCardView } = await import(
  pathToFileURL(join(ROOT, 'src', 'components', 'GoalCardView.js')).href
)
const { RDW_THEME_CSS } = await import(pathToFileURL(join(ROOT, 'src', 'core', 'theme.js')).href)

/** 最小 h：只支持元素/字符串/数组/null。 */
function h(tag, props, ...children) {
  if (typeof tag === 'function') return tag(props || {}, children)
  const flat = []
  const push = (value) => {
    if (value === null || value === undefined || value === false || value === true) return
    if (Array.isArray(value)) {
      for (const item of value) push(item)
      return
    }
    flat.push(value)
  }
  for (const child of children) push(child)
  const attrs = []
  const style =
    props && props.style && typeof props.style === 'object'
      ? Object.entries(props.style)
          .map(([key, value]) => {
            const cssKey = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
            return `${cssKey}:${String(value)}`
          })
          .join(';')
      : ''
  if (props && props.className) attrs.push(`class="${props.className}"`)
  if (style) attrs.push(`style="${style.replace(/"/g, '&quot;')}"`)
  if (props && props.placeholder) attrs.push(`placeholder="${String(props.placeholder).replace(/"/g, '&quot;')}"`)
  if (props && props.title) attrs.push(`title="${String(props.title).replace(/"/g, '&quot;')}"`)
  if (props && props.value !== undefined) attrs.push(`value="${String(props.value).replace(/"/g, '&quot;')}"`)
  if (tag === 'input' || tag === 'textarea') return `<${tag} ${attrs.join(' ')}></${tag}>`
  return `<${tag} ${attrs.join(' ')}>${flat.map((child) => (typeof child === 'string' ? child : renderNode(child))).join('')}</${tag}>`
}

/** 把 h() 产出的 DOM 树序列化成字符串（h 直接返回字符串时即用它）。 */
function renderNode(node) {
  return typeof node === 'string' ? node : ''
}

/**
 * 这里不用上面的 h 序列化器——太容易出错。改成直接构造真实 DOM 字符串：
 * 复用 GoalCardView 的调用签名，但 h 返回「已序列化的字符串片段」。
 */
function hStr(tag, props, ...children) {
  if (typeof tag === 'function') return tag(props || {}, children)
  const flat = []
  const push = (value) => {
    if (value === null || value === undefined || value === false || value === true) return
    if (Array.isArray(value)) {
      for (const item of value) push(item)
      return
    }
    flat.push(String(value))
  }
  for (const child of children) push(child)

  const p = props && typeof props === 'object' ? props : {}
  const attrs = []
  if (p.className) attrs.push(`class="${p.className}"`)
  if (p.style && typeof p.style === 'object') {
    const css = Object.entries(p.style)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}:${String(value)}`)
      .join(';')
    attrs.push(`style="${css.replace(/"/g, '&quot;')}"`)
  }
  for (const [key, value] of Object.entries(p)) {
    if (key === 'className' || key === 'style' || key === 'onInput' || key === 'onClick') continue
    if (typeof value === 'string' || typeof value === 'number') {
      attrs.push(`${key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}="${String(value).replace(/"/g, '&quot;')}"`)
    }
  }
  if (tag === 'input') return `<input ${attrs.join(' ')}>`
  if (tag === 'textarea') return `<textarea ${attrs.join(' ')}>${flat.join('')}</textarea>`
  return `<${tag} ${attrs.join(' ')}>${flat.join('')}</${tag}>`
}

const FILLED_CARD = {
  title: '早期补磷与 ICU 低磷患者 30 天死亡',
  question: '在成人 ICU 低磷血症患者中，入 ICU 24 小时内启动静脉补磷，能否降低 30 天全因死亡？',
  whyMatters: '低磷在 ICU 常见，但补磷时机与剂量长期缺乏高质量证据；若有效，可直接改变监护室常规。',
  assumptionChallenged: '默认「补磷越早越好」而不追问剂量-时机交互（对应层 1 默认态）。',
  hypotheses: 'H1 早补磷降低 30 天死亡；H2 只在重度低磷（<1.0 mg/dL）亚组有效；H3 无效但缩短机械通气时间。',
  discriminatingTest: '按基线血磷分层做 IPTW 加权 Cox，比较 30 天死亡与无机械通气天数。',
  falsifier: 'IPTW 后 30 天死亡 HR 的 95%CI 跨过 1，且方向与 H3 相反。',
  pilot: '用 MIMIC-IV 提取前 500 例，跑通提取→加权→KM 全流程。',
  resources: 'MIMIC-IV（已授权）、IPTW 脚本、一位临床药师复核用药记录。',
  reviewerRisk: '审稿人会质疑「补磷是适应证偏倚」——需要用阴性对照与 E-value 回应。',
  nextAction: '明天下班前：写 SQL 抽取首批 500 例，跑基线表。',
}

const FILLED_LAYERS = [
  { id: '-3', assumption: '结局是 0 维二值（死亡）', flip: '换成「无机械通气天数」这一 1 维轨迹' },
  { id: '-2', assumption: '默认自然病程稳定可比', flip: '加阴性对照结局做参照系漂移检验' },
  { id: '-1', assumption: '终点固定', flip: '把出院/转科视为开放端点，做 competing risk' },
  { id: '0', assumption: 'time zero = 入 ICU', flip: '改用「首次血磷检出」做 landmark' },
  { id: '1', assumption: '补磷有益无需解释', flip: '先问危害边界：过量补磷与低钙的关系' },
  { id: '2', assumption: '死亡是唯一度量', flip: '多度量敏感性：死亡 / 通气时长 / 住院日' },
  { id: '3', assumption: '作用在水平值上', flip: '改看补磷速度（变化率，二阶）' },
  { id: '4', assumption: '时间是均匀背景', flip: '把病程相位作为关系时间' },
  { id: '5', assumption: '随访完整', flip: '处理转院截尾与 transportability' },
]

function page(body, note) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${RDW_THEME_CSS}</style>
<style>
  html,body{margin:0;padding:0;background:var(--rdw-page-bg,#f3efe7);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .wrap{padding:10px 12px 28px;max-width:1240px;margin:0 auto}
  .case-label{font-size:11px;letter-spacing:.3px;text-transform:uppercase;color:#8a8272;margin:16px 0 6px;font-weight:700}
  .frame{border:1px solid #d9d2c4;border-radius:14px;background:var(--rdw-organic-surface,#fffdf9);height:${body.height || 900}px;overflow:hidden}
</style></head><body>
<div class="wrap">
  <h2 style="font-size:15px;margin:6px 0 2px">研究目标 · 好问题卡编辑器 — 视觉验收</h2>
  <div style="font-size:12px;color:#6f6858">${note}</div>
  ${body.html}
</div></body></html>`
}

const renderCase = (label, props, height) => {
  const node = renderGoalCardView(hStr, props)
  return `<div class="case-label">${label}</div><div class="frame" style="height:${height}px">${node}</div>`
}

const EMPTY = renderCase(
  '① 空卡（新项目）：八层全红框 = 全是盲区；falsifier 必填但空 → 状态条警告',
  {
    card: {},
    layers: [],
    goal: '',
    missing: [
      'title', 'question', 'whyMatters', 'assumptionChallenged', 'hypotheses',
      'discriminatingTest', 'falsifier', 'pilot', 'resources', 'reviewerRisk', 'nextAction',
    ],
    falsifiable: false,
    busy: false,
    onField() {},
    onLayer() {},
    onSyncGoal() {},
    onCopyPrompt() {},
    onClose() {},
  },
  720,
)

const FILLED = renderCase(
  '② 已填满 + 八层已审计：状态条转绿「这张卡可验证」，按钮转 sage',
  {
    card: FILLED_CARD,
    layers: FILLED_LAYERS,
    goal: '在成人 ICU 低磷血症患者中，入 ICU 24 小时内启动静脉补磷，能否降低 30 天全因死亡？；推翻条件：IPTW 后 30 天死亡 HR 的 95%CI 跨过 1，且方向与 H3 相反。',
    missing: [],
    falsifiable: true,
    busy: false,
    onField() {},
    onLayer() {},
    onSyncGoal() {},
    onCopyPrompt() {},
    onClose() {},
  },
  900,
)

const html = page(
  {
    html: EMPTY + FILLED,
    height: 900,
  },
  '左栏目标卡片点开 → 中栏编辑器。上方空卡、下方满卡；同一组件、不同输入。',
)
writeFileSync(join(OUT, 'goal-card.html'), html, 'utf8')
console.log(`已生成预览页：${join(OUT, 'goal-card.html')}`)
