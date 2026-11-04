/**
 * 研究项目 DAG 工作台 — 项目流程主线视图（v2.6，真正的分叉骨架）。
 *
 * 布局 = 经典项目流程图（Ishikawa）：
 *   - 左侧项目目标：研究目标（可点击清除筛选）；
 *   - 中间粗主支：一条渐变主轴；
 *   - 每个模块 = 一根从主支斜伸出的主支（上下交错，指向项目目标方向），
 *     末端挂模块名牌（名称 + 完成度 + 分支数）；
 *   - 每个分支 = 从主支身上横向长出的子分支（圆点 = 状态色，⚠ = 级联过期）；
 *   - 右侧整体进度：整体回连进度。
 *
 * 交互：点名牌筛选该模块；点子分支打开智能体工作区；点项目目标/清除按钮取消筛选。
 * 数据：GET /fishbone。
 */


import { PHASES, SHELL_CSS, STYLES, formatTimeText } from '../core/constants.js'
import { mi, sep, sub } from '../components/ContextMenu.js'

/** 触发对象右键：向面板层冒泡一个带定位的请求。 */
function emitContextMenu(options, event, target) {
  if (!event || typeof event.preventDefault !== 'function') return
  event.preventDefault()
  if (event.stopPropagation) event.stopPropagation()
  if (typeof options.onContextMenu === 'function') {
    options.onContextMenu({ x: event.clientX, y: event.clientY, target })
  }
}

/** 触发分支悬停速览卡（400ms 延迟由面板层控制；这里只报位置与目标）。 */
function emitHoverCard(options, event, rib) {
  if (typeof options.onHoverRib === 'function') {
    options.onHoverRib(rib, { x: event.clientX + 12, y: event.clientY + 10 })
  }
}
function emitHoverCardLeave(options) {
  if (typeof options.onHoverRibLeave === 'function') options.onHoverRibLeave()
}
/**
 * 分支状态 → 颜色主题。
 * v3.4：颜色改用 --rdw-* 令牌（SVG 内同样可用 CSS 变量），随宿主明暗主题自适应。
 */
const RIB_THEME = {
  EMPTY: { color: 'var(--rdw-st-draft)', mute: 'var(--rdw-st-draft-mute)', label: '未开工', dot: '○', tone: 'draft' },
  DRAFT: { color: 'var(--rdw-st-draft)', mute: 'var(--rdw-st-draft-mute)', label: '探路中', dot: '◍', tone: 'draft' },
  PROVISIONAL: { color: 'var(--rdw-st-provisional)', mute: 'var(--rdw-st-provisional-mute)', label: '待回连', dot: '◉', tone: 'provisional' },
  ACCEPTED: { color: 'var(--rdw-st-accepted)', mute: 'var(--rdw-st-accepted-mute)', label: '已回连', dot: '●', tone: 'accepted' },
  REJECTED: { color: 'var(--rdw-st-rejected)', mute: 'var(--rdw-st-rejected-mute)', label: '已修剪', dot: '×', tone: 'rejected' },
  SUPERSEDED: { color: 'var(--rdw-st-superseded)', mute: 'var(--rdw-st-superseded-mute)', label: '旧版本', dot: '◌', tone: 'superseded' },
  BLOCKED: { color: 'var(--rdw-st-blocked)', mute: 'var(--rdw-st-blocked-mute)', label: '受阻', dot: '⊘', tone: 'blocked' },
}

function ribTheme(status) {
  return RIB_THEME[status] || RIB_THEME.EMPTY
}

const RIB_RANK = { PROVISIONAL: 0, DRAFT: 1, BLOCKED: 2, ACCEPTED: 3, REJECTED: 4, SUPERSEDED: 5, EMPTY: 6 }

/* ------------------------------------------------ v2.1 主支成稿（spine stage）
 *
 * 主支（模块）除了「分支回连进度」，现在还有一层「成稿状态」：
 * 分支回连后，主支会留下可备份、可重生成、可续贯的一节成稿。
 *
 * 语义要点（契约 SPINE-PIPELINE §7 / §9）：
 *  - `empty` = 还没开工，**不是异常**，绝不能标红；
 *  - `stale` = 上游变了、本主支的成稿可能过期，这才是要提醒的；
 *  - `locked` = 人工锁定，graft 不会再自动重生成；
 *  - 旧项目没有 SPINE.json 时 `stageId === null`，此时整块徽标不渲染。
 */
const STAGE_STATUS = {
  empty: { label: '未成稿', color: 'var(--rdw-organic-ink-3)', tone: 'muted' },
  draft: { label: '起草中', color: 'var(--rdw-st-draft)', tone: 'draft' },
  current: { label: '已成稿', color: 'var(--rdw-st-accepted)', tone: 'current' },
  stale: { label: '待重生成', color: 'var(--rdw-tan-ink)', tone: 'stale' },
  locked: { label: '锁定', color: 'var(--rdw-sage)', tone: 'locked' },
}

/** 主支成稿徽标文案：`成稿 v3` / `待重生成` / `锁定` / `未成稿`。 */
function stageBadgeText(node) {
  const status = node && node.stageStatus ? node.stageStatus : 'empty'
  const revision = Number(node && node.stageRevision) || 0
  if (status === 'locked') return `锁定 · v${revision}`
  if (status === 'stale') return `待重生成 · v${revision}`
  if (status === 'current') return `成稿 v${revision}`
  if (status === 'draft') return `起草中 · v${revision}`
  return '未成稿'
}

function stageTheme(node) {
  const status = node && node.stageStatus ? node.stageStatus : 'empty'
  return STAGE_STATUS[status] || STAGE_STATUS.empty
}

/** 主支是否已经有成稿（决定「备份」「重新生成」按钮可用性）。 */
function stageHasDraft(node) {
  return Boolean(node && node.hasDraft)
}

/**
 * 主支成稿徽标（SVG 版，画在主支名牌下方）。
 * 旧项目 stageId 为 null 时返回 null —— 没有主支链就不画，不给旧项目添噪音。
 */
function renderStageBadge(h, node, x, y) {
  if (!node || node.stageId === null || node.stageId === undefined) return null
  const theme = stageTheme(node)
  const text = stageBadgeText(node)
  const backup = Number(node.backupCount) || 0
  const label = backup > 0 ? `${text} · ${backup} 备份` : text
  const w = Math.max(56, Math.min(120, 8 + label.length * 6.4))
  const warning = node.stageStatus === 'stale' || node.chainBroken === true
  return h(
    'g',
    { key: `stage-${node.id}`, style: { pointerEvents: 'none' } },
    h('rect', {
      x: x - w / 2,
      y,
      width: w,
      height: 15,
      rx: 7.5,
      fill: warning
        ? 'color-mix(in srgb,var(--rdw-tan) 20%,var(--rdw-organic-surface))'
        : 'color-mix(in srgb,var(--rdw-sage-tint) 12%,var(--rdw-organic-surface))',
      stroke: warning
        ? 'color-mix(in srgb,var(--rdw-tan-ink) 46%,transparent)'
        : 'color-mix(in srgb,var(--rdw-warm-line-2) 100%,transparent)',
      strokeWidth: 1,
    }),
    h(
      'text',
      {
        x,
        y: y + 10.5,
        textAnchor: 'middle',
        fontSize: 11,
        fontWeight: 700,
        fill: theme.color,
      },
      label,
    ),
  )
}

/**
 * 模块主支的配色（EvoResearch 自然有机语汇）。
 * 选中态用鼠尾草绿（交互色），名牌底色用纸面白，未选中时是中性暖土描边。
 */
const BONE = {
  stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)',
  selected: 'var(--rdw-sage)',
  labelFill: 'var(--rdw-organic-surface)',
  labelStroke: 'var(--rdw-warm-line)',
  labelFillSelected: 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))',
  labelStrokeSelected: 'color-mix(in srgb,var(--rdw-sage) 62%,transparent)',
}

/** SVG 画布几何。
 *  画布按模块数自适应加宽（computeViewBox），保证名牌与子分支互不重叠。 */
const GEO = {
  W: 1040,
  H: 480,
  SPINE_Y: 252,
  SPINE_X0: 104,
  SPINE_X1: 908,
  BONE_LEN: 118,
  BONE_DX: 52,
  /** 每根主支在主支上占用的横向宽度（名牌 + 子分支不重叠的关键）。 */
  SLOT_W: 150,
  /** 主支上子分支的分布区间（沿主体的比例），刻意避开末端名牌。 */
  RIB_FROM: 0.18,
  RIB_TO: 0.74,
}
/** 按字符截断。 */
function truncate(text, max) {
  const value = String(text === undefined || text === null ? '' : text).replace(/\s+/g, ' ').trim()
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}

/**
 * 取一个 spine 节点的「已回连比率」百分比，永不返回 undefined/NaN。
 *
 * 为什么需要这个函数（v3.7）：
 *   真实 `GET /fishbone` 的契约字段是 `completion`（= accepted/total，见 DESIGN §4.2），
 *   但历史上多个 mock / 旧预览脚本用的是 `progress`。字段一旦漂移，模板字符串会直接
 *   渲染出 "undefined% · 3 分支" —— 测试全绿、画面出错，正是公理五要防的那类缺陷。
 *   兜底顺序：completion → progress → 由 counts 现算 → 0。
 */
function pctOf(node) {
  if (!node || typeof node !== 'object') return 0
  const direct = Number(node.completion)
  if (Number.isFinite(direct)) return Math.round(direct)
  const legacy = Number(node.progress)
  if (Number.isFinite(legacy)) return Math.round(legacy)
  const counts = node.counts && typeof node.counts === 'object' ? node.counts : null
  if (counts) {
    let accepted = 0
    let total = 0
    for (const key of Object.keys(counts)) {
      const value = Number(counts[key]) || 0
      total += value
      if (key === 'accepted') accepted += value
    }
    if (total > 0) return Math.round((accepted / total) * 100)
  }
  return 0
}

/** 把 spine 按注册顺序排列并标记当前阶段。 */
function orderSpine(spine, phase) {
  const list = Array.isArray(spine) ? spine.slice() : []
  const currentIndex = Math.max(0, PHASES.findIndex(([key]) => key === String(phase || '')))
  return list.map((node, index) => ({ ...node, isCurrentPhase: index === currentIndex, index }))
}

/** 一根主支（含末端名牌与主体上的子分支）。
 *
 *  防重叠布局规则（v3.0）：
 *   - 每个模块在主支上独占一个 SLOT_W 宽的槽位，模块多时画布自动加宽；
 *   - 名牌固定挂在末端，向上/下外侧偏移，宽度不超过槽位；
 *   - 子分支只分布在主体中段（RIB_FROM..RIB_TO），绝不进入名牌区域；
 *   - 子分支名称按「同一主体上交替左右」摆放，避免彼此压字。
 */
function renderBone(h, node, index, count, ribs, options) {
  const { SPINE_Y, BONE_LEN, BONE_DX, SLOT_W, RIB_FROM, RIB_TO } = GEO
  const selected = options.selectedModule === node.id
  const dimmed = options.selectedModule && !selected
  const n = Math.max(count, 1)
  const slotStart = GEO.SPINE_X0 + GEO.SLOT_W / 2
  const slotSpan = n * SLOT_W
  const attachX = n === 1 ? slotStart + slotSpan / 2 : slotStart + index * SLOT_W + SLOT_W / 2
  const dir = index % 2 === 0 ? -1 : 1
  const tipX = attachX - BONE_DX
  const tipY = SPINE_Y + dir * BONE_LEN
  // 分支顺序：以宿主给出的显示顺序为准（/fishbone 已按 control/rdw-rib-meta.json 的 ribOrder 排好）。
  // 不能在这里再按状态重排——那会把用户手动的「上移/下移」覆盖掉，看起来像操作没生效。
  const moduleRibs = ribs.filter((rib) => rib.module === node.id)
  const boneColor = selected ? 'var(--rdw-sage)' : 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)'
  const accent = node.staleness ? 'var(--rdw-tan-ink)' : node.active ? 'var(--rdw-tan-ink)' : 'var(--rdw-sage)'

  const children = []
  children.push(
    h('title', { key: 'tt' }, `${node.name}：${pctOf(node)}% 已回连 · ${moduleRibs.length} 根分支${node.staleness ? ' · 有级联过期' : ''}`),
  )

  // ---- 主体骨线（加粗：这是「主支」的可视锚点）
  children.push(
    h('line', {
      key: 'bone',
      x1: attachX,
      y1: SPINE_Y,
      x2: tipX,
      y2: tipY,
      stroke: boneColor,
      strokeWidth: selected ? 3.2 : 2.2,
      strokeLinecap: 'round',
    }),
  )

  // ---- 末端名牌：宽度收敛到槽位内，文字不越界
  // 名牌是「有机卡片」：纸面底 + 暖土细描边 + 大圆角；选中时用鼠尾草淡底与强调描边。
  const badgeW = Math.min(SLOT_W - 12, 132)
  const badgeH = 40
  // 名牌放在末端「远离主支」的一侧
  const badgeY = dir < 0 ? tipY - badgeH - 8 : tipY + 8
  children.push(
    h('rect', {
      key: 'label',
      x: tipX - badgeW / 2,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      rx: 13,
      fill: selected
        ? 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))'
        : 'var(--rdw-organic-surface)',
      stroke: selected
        ? 'color-mix(in srgb,var(--rdw-sage) 62%,transparent)'
        : 'var(--rdw-warm-line)',
      strokeWidth: selected ? 1.6 : 1,
    }),
    h(
      'text',
      {
        key: 'name',
        x: tipX,
        y: badgeY + 15,
        textAnchor: 'middle',
        fontSize: 11.5,
        fontWeight: 600,
        fill: 'var(--rdw-organic-ink)',
        style: { fontFamily: 'var(--rdw-font-serif)' },
      },
      truncate(node.name, 9),
    ),
    h(
      'text',
      {
        key: 'sub',
        x: tipX,
        y: badgeY + 30,
        textAnchor: 'middle',
        fontSize: 11.5,
        fill: accent,
        fontWeight: 600,
      },
      `${pctOf(node)}% · ${moduleRibs.length} 分支${node.staleness ? ' · ⚠' : ''}`,
    ),
  )

  // ---- v2.1 主支成稿徽标：挂在名牌「背向主支」一侧，与分支区不重叠
  const stageBadge = renderStageBadge(h, node, tipX, dir < 0 ? badgeY - 19 : badgeY + badgeH + 4)
  if (stageBadge) children.push(stageBadge)

  // ---- 子分支：只落在主体中段，左右交替挂标签
  const ribCount = moduleRibs.length
  moduleRibs.forEach((rib, j) => {
    const f = ribCount === 1 ? (RIB_FROM + RIB_TO) / 2 : RIB_FROM + ((RIB_TO - RIB_FROM) * j) / (ribCount - 1)
    const px = attachX + (tipX - attachX) * f
    const py = SPINE_Y + (tipY - SPINE_Y) * f
    const theme = ribTheme(rib.status)
    const isRibSelected = options.selectedRib === rib.id
    const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
    // 交替：偶数根挂左侧，奇数根挂右侧，彻底避免同名压字
    const toLeft = j % 2 === 0
    const armLen = 26
    const labelX = toLeft ? px - armLen : px + armLen
    const labelAnchor = toLeft ? 'end' : 'start'

    children.push(
      h(
        'g',
        {
          key: `rib-${rib.id}`,
          role: 'button',
          tabIndex: 0,
          style: { cursor: 'pointer' },
          opacity: isRibSelected ? 1 : dimmed ? 0.4 : 0.94,
          onClick: (event) => {
            if (event && event.stopPropagation) event.stopPropagation()
            if (typeof options.onSelectRib === 'function') options.onSelectRib(rib)
          },
          onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: node }),
          onMouseEnter: (event) => emitHoverCard(options, event, rib),
          onMouseLeave: () => emitHoverCardLeave(options),
          onKeyDown: (event) => {
            if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectRib(rib)
          },
        },
        h('title', null, `${rib.name} · ${theme.label} · ${fileCount} 个文件${rib.is_stale ? ' · ⚠ 级联过期' : ''}`),
        // 横向短分支
        h('line', {
          x1: px,
          y1: py,
          x2: labelX,
          y2: py,
          stroke: theme.color,
          strokeWidth: isRibSelected ? 2.4 : 1.6,
          strokeLinecap: 'round',
        }),
        h('circle', {
          cx: px,
          cy: py,
          r: isRibSelected ? 4.4 : 3.2,
          fill: theme.color,
          stroke: 'var(--rdw-organic-surface)',
          strokeWidth: 1.2,
        }),
        // 名称：贴着短分支末端，字号略小并截断，保证不越出槽位
        h(
          'text',
          {
            x: labelX + (toLeft ? -4 : 4),
            y: py + 3.5,
            textAnchor: labelAnchor,
            fontSize: 12,
            fill: isRibSelected ? theme.color : 'var(--rdw-organic-ink-2)',
            opacity: isRibSelected ? 1 : 0.92,
            fontWeight: isRibSelected ? 600 : 400,
          },
          `${rib.is_stale ? '⚠' : ''}${truncate(rib.name, 7)}${rib.hasSession ? ' 🧠' : ''}`,
        ),
      ),
    )
  })

  // ---- 选中该主支时，名牌外侧出现「+ 创建分支」
  // v2.1：成稿徽标也占着这一侧，按钮要再往外让一格，避免压住徽标。
  if (selected && typeof options.onSproutHere === 'function') {
    const stageOffset = stageBadge ? 24 : 0
    const btnY = dir < 0 ? badgeY - 28 - stageOffset : badgeY + badgeH + 8 + stageOffset
    children.push(
      h(
        'g',
        {
          key: 'sprout-here',
          role: 'button',
          tabIndex: 0,
          style: { cursor: 'pointer' },
          onClick: (event) => {
            if (event && event.stopPropagation) event.stopPropagation()
            options.onSproutHere(node.id)
          },
          onKeyDown: (event) => {
            if (event && (event.key === 'Enter' || event.key === ' ')) options.onSproutHere(node.id)
          },
        },
        h('title', null, `从「${node.name}」分出一根新分支`),
        h('rect', {
          x: tipX - 31,
          y: btnY,
          width: 62,
          height: 21,
          rx: 10,
          fill: 'color-mix(in srgb,var(--rdw-sage-tint) 20%,var(--rdw-organic-surface))',
          stroke: 'color-mix(in srgb,var(--rdw-sage) 52%,transparent)',
          strokeWidth: 1.2,
        }),
        h(
          'text',
          { x: tipX, y: btnY + 14.5, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-sage)', fontWeight: 600 },
          '+ 创建分支',
        ),
      ),
    )
  }

  // ---- 悬停在主支身上（名牌区域之外）时，沿法线方向浮出一根幻影分支
  const showPhantom = selected && typeof options.onPhantomSprout === 'function' && !options.inlineSprout
  if (showPhantom) {
    // 幻影分支起止点：从主体中点沿「远离主支」方向伸出
    const f = (RIB_FROM + RIB_TO) / 2
    const px = attachX + (tipX - attachX) * f
    const py = SPINE_Y + (tipY - SPINE_Y) * f
    const nx = tipX - attachX
    const ny = tipY - SPINE_Y
    const len = Math.sqrt(nx * nx + ny * ny) || 1
    // 法线方向（垂直主体，指向名牌一侧）
    const nxu = (-ny / len) * 34
    const nyu = (nx / len) * 34
    const ex = px + nxu
    const ey = py + nyu
    children.push(
      h(
        'g',
        {
          key: 'phantom',
          className: 'rdw-phantom',
          style: { pointerEvents: 'none' },
        },
        h('line', {
          x1: px, y1: py, x2: ex, y2: ey,
          stroke: 'var(--rdw-sage)',
          strokeWidth: 2,
          strokeDasharray: '4 4',
          strokeLinecap: 'round',
        }),
        h('circle', { cx: ex, cy: ey, r: 7, fill: 'var(--rdw-organic-surface)', stroke: 'var(--rdw-sage)', strokeWidth: 1.4 }),
        h('text', { x: ex, y: ey + 3.4, textAnchor: 'middle', fontSize: 11, fill: 'var(--rdw-sage)', fontWeight: 700 }, '+'),
      ),
    )
    // 透明加宽热区：实际接收点击的命中区（SVG 里 pointer-events 不受 className 控制，单独画一条粗透明线）
    children.push(
      h('line', {
        key: 'phantom-hit',
        x1: px, y1: py, x2: ex, y2: ey,
        stroke: 'rgba(0,0,0,0)',
        strokeWidth: 18,
        strokeLinecap: 'round',
        style: { pointerEvents: 'all', cursor: 'copy' },
        onClick: (event) => {
          if (event && event.stopPropagation) event.stopPropagation()
          options.onPhantomSprout(node, { x: event.clientX, y: event.clientY })
        },
        onContextMenu: (event) => emitContextMenu(options, event, { kind: 'gap', module: node }),
      }),
    )
  }

  return h(
    'g',
    {
      key: `bone-${node.id}`,
      role: 'button',
      tabIndex: 0,
      opacity: dimmed ? 0.35 : 1,
      style: { cursor: 'pointer', transition: 'opacity .16s ease' },
      onClick: () => options.onSelectModule(selected ? null : node.id),
      onContextMenu: (event) => emitContextMenu(options, event, { kind: 'module', module: node, index }),
      onKeyDown: (event) => {
        if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectModule(selected ? null : node.id)
      },
    },
    ...children,
  )
}

/** 按模块数计算画布宽度：模块多时加宽，保证名牌与子分支各自有槽位。 */
function computeViewBoxWidth(count) {
  const need = GEO.SPINE_X0 + 40 + Math.max(1, count) * GEO.SLOT_W + 150
  return Math.max(GEO.W, need)
}

/**
 * 项目流程全景 SVG：项目目标 + 渐变主支 + 上下交错主支 + 子分支 + 整体进度。
 */
function renderFishSvg(h, spine, ribs, totals, options) {
  const { H, SPINE_Y, SPINE_X0 } = GEO
  const selected = options.selectedModule || null
  const elements = []
  // 自适应：画布宽度随模块数增长，主支右端与整体进度随之右移
  const W = computeViewBoxWidth(spine.length)
  const SPINE_X1 = W - 132

  // 主支渐变：鼠尾草绿 → 暖沙（EvoResearch 自然有机语汇，禁冷蓝与彩虹渐变）。
  elements.push(
    h(
      'defs',
      { key: 'defs' },
      h(
        'linearGradient',
        { id: 'fishSpineGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
        h('stop', { offset: '0%', stopColor: 'var(--rdw-sage)' }),
        h('stop', { offset: '100%', stopColor: 'var(--rdw-tan)' }),
      ),
    ),
  )

  // 顶部项目标题（衬线体，手写笔记气质）
  elements.push(
    h(
      'text',
      {
        key: 'title',
        x: 14,
        y: 24,
        fontSize: 12.5,
        fontWeight: 600,
        fill: 'var(--rdw-organic-ink)',
        style: { fontFamily: 'var(--rdw-font-serif)' },
      },
      `📋 ${truncate(options.projectTitle || '', 30)}`,
    ),
    h(
      'text',
      { key: 'goal', x: 14, y: 41, fontSize: 12, fill: 'var(--rdw-organic-ink-3)' },
      truncate(options.projectGoal || '', 52),
    ),
  )

  // 整体进度（整体回连进度）：暖雾底 + 鼠尾草描边
  elements.push(
    h(
      'g',
      { key: 'tail' },
      h('polygon', {
        points: `${SPINE_X1 + 2},${SPINE_Y} ${SPINE_X1 + 84},208 ${SPINE_X1 + 56},${SPINE_Y} ${SPINE_X1 + 84},296`,
        fill: 'color-mix(in srgb,var(--rdw-mist) 70%,transparent)',
        stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 58%,transparent)',
        strokeWidth: 1.5,
      }),
      h(
        'text',
        { x: SPINE_X1 + 46, y: 336, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-organic-ink-2)' },
        `${totals.accepted || 0}/${totals.ribs || 0} 已回连`,
      ),
    ),
  )

  // 主支：主支是整个视图的锚点，必须「一定看得见」。
  // 三层叠画，任何一层失效（渐变 id 冲突/主题覆盖）都还有下一层兜底：
  //   1) 外发光（低透明度，撑出体量）
  //   2) 实色核心（不依赖渐变，永远可见）
  //   3) 渐变高光（叠在核心上，提供单色相的阶段感）
  elements.push(
    h('line', {
      key: 'spine-glow',
      x1: SPINE_X0,
      y1: SPINE_Y,
      x2: SPINE_X1,
      y2: SPINE_Y,
      stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 26%,transparent)',
      strokeWidth: 14,
      strokeLinecap: 'round',
    }),
    h('line', {
      key: 'spine-core',
      x1: SPINE_X0,
      y1: SPINE_Y,
      x2: SPINE_X1,
      y2: SPINE_Y,
      stroke: 'var(--rdw-sage)',
      strokeWidth: 5,
      strokeLinecap: 'round',
    }),
    h('line', {
      key: 'spine',
      x1: SPINE_X0,
      y1: SPINE_Y,
      x2: SPINE_X1,
      y2: SPINE_Y,
      stroke: 'url(#fishSpineGrad)',
      strokeWidth: 4,
      strokeLinecap: 'round',
      opacity: 0.9,
    }),
  )

  // 项目目标（点击 = 清除筛选）：暖雾底 + 鼠尾草描边
  elements.push(
    h(
      'g',
      {
        key: 'head',
        role: 'button',
        tabIndex: 0,
        style: { cursor: 'pointer' },
        onClick: () => options.onSelectModule(null),
        onContextMenu: (event) => emitContextMenu(options, event, { kind: 'head', head: { title: options.projectTitle, goal: options.projectGoal } }),
        onKeyDown: (event) => {
          if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectModule(null)
        },
      },
      h('title', null, '项目目标 · 研究目标（点击清除筛选）'),
      h('polygon', {
        points: `${SPINE_X0},${SPINE_Y - 46} ${SPINE_X0},${SPINE_Y + 46} 24,${SPINE_Y}`,
        fill: 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))',
        stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 52%,transparent)',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      }),
      h('circle', { cx: 72, cy: SPINE_Y - 6, r: 5, fill: 'var(--rdw-organic-ink-3)' }),
      h('path', {
        d: `M86,${SPINE_Y - 28} Q74,${SPINE_Y} 86,${SPINE_Y + 28}`,
        stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 58%,transparent)',
        strokeWidth: 1.5,
        fill: 'none',
      }),
      h(
        'text',
        { x: 52, y: SPINE_Y + 74, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-organic-ink-3)' },
        '项目目标 · 目标',
      ),
    ),
  )

  // 主支 attachment 点（与 renderBone 的槽位排布一致）
  const n = spine.length
  const slotStart = SPINE_X0 + GEO.SLOT_W / 2
  spine.forEach((node, index) => {
    const attachX = n === 1 ? slotStart + GEO.SLOT_W / 2 : slotStart + index * GEO.SLOT_W + GEO.SLOT_W / 2
    elements.push(
      h('circle', {
        key: `dot-${node.id}`,
        cx: attachX,
        cy: SPINE_Y,
        r: 4.5,
        fill: 'var(--rdw-organic-surface)',
        stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)',
        strokeWidth: 1.4,
      }),
    )
  })

  // 主支
  spine.forEach((node, index) => {
    elements.push(renderBone(h, node, index, n, ribs, { ...options, selectedModule: selected }))
  })

  // 还没有模块时，在主支上标注「主任务沿这条主支推进」
  if (n === 0) {
    elements.push(
      h(
        'text',
        {
          key: 'spine-hint',
          x: (SPINE_X0 + SPINE_X1) / 2,
          y: SPINE_Y - 16,
          textAnchor: 'middle',
          fontSize: 11,
          fill: 'var(--rdw-sage)',
          fontWeight: 600,
          opacity: 0.9,
        },
        '主任务沿这条主支推进 —— 遇到复杂子问题时再创建分支',
      ),
    )
  }

  return h(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: 'xMidYMid meet',
      className: 'rdw-fish-svg',
      style: {
        // 窄栏里等比缩小会压成一条看不清的细带；
        // 给一个最小可读高度，多余部分交给外层横向滚动（滚动条比压扁更可读）。
        // 极窄容器的下限由 .rdw-fish-svg 的容器查询兜底（见 constants 的 SHELL_CSS）。
        width: '100%',
        maxWidth: `${W}px`,
        minWidth: 560,
        height: 'auto',
        minHeight: 260,
        display: 'block',
        color: 'inherit',
      },
      role: 'img',
      'aria-label': '研究项目项目流程图（右键任意对象打开操作菜单）',
      onContextMenu: (event) => emitContextMenu(options, event, { kind: 'canvas' }),
    },
    ...elements,
  )
}

/**
 * 三栏式 EvoResearch 科研工作台（对齐用户指定布局设计）：
 * - 左栏 · 竖向项目流程（研究规划与分支导航）：项目目标 + 竖向连续主支节点 + 各分支 + [🌱 创建分支]
 * - 中栏 · 当前工作区：主线/分支任务、绑定智能体身份、往来指令对白流、指令输入区
 * - 右栏 · 结果面板：本任务产物清单、合并状态、[审核与合并设计]
 */
function renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps = [], blockers = [], attention = [], markers = [] }) {
  const { card, row, chip, button, primaryButton, muted } = STYLES
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  // v3.5 快捷键：N 创建分支 / Del 删分支 / ⌘Z 撤销 / ⇧⌘Z 或 ⌘Y 重做 / ? 帮助
  const onStageKeyDown = (event) => {
    if (!event) return
    const tag = event.target && event.target.tagName ? String(event.target.tagName).toLowerCase() : ''
    if (tag === 'input' || tag === 'textarea' || (event.target && event.target.isContentEditable)) return
    const meta = event.metaKey || event.ctrlKey
    const key = String(event.key || '').toLowerCase()
    if (key === 'n' && !meta) {
      event.preventDefault()
      call(options.onSprout, options.selectedModule || (spine[0] && spine[0].id), options.selectedRib || null)
      return
    }
    if (key === 'delete' || key === 'backspace') {
      if (options.selectedRib && typeof options.onDeleteRib === 'function') {
        event.preventDefault()
        const rib = ribs.find((r) => r.id === options.selectedRib)
        if (rib) options.onDeleteRib(rib)
      }
      return
    }
    if (key === 'z' && meta && !event.shiftKey) {
      event.preventDefault()
      call(options.onUndo)
      return
    }
    if ((key === 'z' && meta && event.shiftKey) || (key === 'y' && meta)) {
      event.preventDefault()
      call(options.onRedo)
      return
    }
    if (key === '?') {
      event.preventDefault()
      call(options.onShowShortcuts)
    }
  }
  const session = options.session && typeof options.session === 'object' ? options.session : null
  const isGoalSelected = options.selectedModule === '__goal__'
  const ribList = Array.isArray(ribs) ? ribs : []
  const spineList = Array.isArray(spine) ? spine : []
  const candidateRibs = options.selectedModule && !isGoalSelected
    ? ribList.filter((r) => r && r.module === options.selectedModule)
    : ribList
  const defaultRib = isGoalSelected ? null : (candidateRibs[0] || ribList[0] || null)
  const selectedRibId = isGoalSelected ? null : (options.selectedRib || (session && session.branch) || (defaultRib && defaultRib.id) || null)
  const activeRib = isGoalSelected
    ? { id: '__goal__', name: (head && head.goal) || (head && head.title) || '研究目标', module: '__goal__', status: 'PROVISIONAL' }
    : ((selectedRibId && ribList.find((r) => r.id === selectedRibId)) || defaultRib || {
        id: selectedRibId || 'B01',
        name: '任务工作区',
        module: options.selectedModule || (spineList[0] && spineList[0].id) || 'M10',
        status: 'PROVISIONAL',
      })
  const selectedModId = isGoalSelected
    ? '__goal__'
    : ((activeRib && activeRib.module) || options.selectedModule || (session && session.module) || (spineList[0] && spineList[0].id) || null)
  const activeModule = isGoalSelected
    ? { id: '__goal__', name: '研究目标' }
    : ((selectedModId && spineList.find((m) => m.id === selectedModId)) || spineList[0] || {
        id: selectedModId || 'M10',
        name: '研究主线',
      })
  const draft = typeof options.directiveDraft === 'string' ? options.directiveDraft : ''
  const sending = Boolean(options.sending)

  // 1. 左栏 · 竖向项目流程（研究规划与分支导航）
  //    样式参照 Karbo123/DSH-EvoResearch 的会话导航栏（evo-threadlist）：
  //    纸纹底 + 衬线栏标题 + 分组小标题 + 行内有机圆点 + 选中左竖条 + 悬停暖洗。
  const leftPane = h(
    'div',
    {
      style: {
        margin: 0,
        padding: '12px 10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 0,
        /* 左栏 = 底板：灰面、无投影、几乎看不见的描边。
         * 之前与中栏同为「灰底 + 明显边框」，三栏互相争抢；
         * 现在它只负责托住中栏，眼睛不该在这里停留。 */
        background: 'var(--rdw-side-surface)',
        backgroundImage: 'var(--rdw-organic-grain)',
        border: '1px solid var(--rdw-side-line)',
        borderRadius: 'var(--rdw-r-blob)',
      },
    },
    // 栏标题（衬线体，承担「手写笔记」气质）
    h(
      'div',
      { style: { padding: '0 6px 2px', display: 'flex', alignItems: 'baseline', gap: 6 } },
      h(
        'div',
        {
          style: {
            fontFamily: 'var(--rdw-font-serif)',
            fontSize: 16.5,
            fontWeight: 600,
            letterSpacing: '-.01em',
            color: 'var(--rdw-organic-ink)',
          },
        },
        '竖向项目流程',
      ),
      h(
        'div',
        { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', letterSpacing: '.2px' } },
        '研究规划与分支导航',
      ),
    ),
    // 项目目标 · 研究总目标（有机 pebble 卡片 + 左侧重音竖条；右键打开项目目标菜单）
    // v3.10：整卡可点 → 打开「研究目标 · 好问题」编辑器（八层审计 + good-question）
    h(
      'div',
      {
        className: 'rdw-goal-card',
        role: 'button',
        tabIndex: 0,
        title: '点击切到研究目标专属对话（含八层假设审计技能）；右键更多操作',
        onClick: () => call(options.onSelectGoalSession || options.onOpenGoalCard),
        onKeyDown: (event) => {
          if (!event) return
          if (event.key === 'Enter' || event.key === ' ') {
            if (event.preventDefault) event.preventDefault()
            call(options.onSelectGoalSession || options.onOpenGoalCard)
          }
        },
        onContextMenu: (event) => emitContextMenu(options, event, { kind: 'head', head }),
        style: {
          padding: '9px 11px',
          borderRadius: 'var(--rdw-r-pebble)',
          background: 'color-mix(in srgb,var(--rdw-sage-tint) 13%,var(--rdw-organic-surface))',
          border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 34%,transparent)',
          borderLeft: '3px solid var(--rdw-sage)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          cursor: 'pointer',
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 5 } },
        h('span', { style: { fontSize: 11 } }, '📋'),
        h(
          'span',
          {
            style: {
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.04em',
              color: 'var(--rdw-tan-ink)',
            },
          },
          '项目目标 · 研究目标',
        ),
      ),
      h(
        'div',
        {
          style: {
            fontFamily: 'var(--rdw-font-serif)',
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--rdw-organic-ink)',
          },
        },
        head.title || '重症低磷血症患者早期补磷',
      ),
      h(
        'div',
        { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.45 } },
        head.goal ? truncate(head.goal, 56) : '目标试验模拟 · Target Trial Emulation',
      ),
    ),
    // 分组小标题（右侧带「新增主支」入口，v3.9）
    h(
      'div',
      {
        style: {
          padding: '6px 8px 2px',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '.3px',
          textTransform: 'uppercase',
          color: 'var(--rdw-organic-ink-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        },
      },
      h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, '主支 · 研究主线'),
      h(
        'button',
        {
          type: 'button',
          className: 'rdw-add-module',
          title: '新增主支（新的研究阶段）',
          'aria-label': '新增主支',
          onClick: (event) => {
            if (event && event.stopPropagation) event.stopPropagation()
            call(options.onAddModule)
          },
        },
        '＋ 主支',
      ),
    ),
    // 竖向连续主支节点（可滚动区）
    h(
      'div',
      {
        className: 'rdw-organic-scroll',
        style: {
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          paddingRight: 2,
        },
      },
      // v3.27：**研究目标作为「第 0 个主支」**出现在研究主线顶部。
      // 点它 = 切到「研究目标」自己的独立对话（技能脚手架不变：八层 + good-question）。
      // 这样「每个主支/分支都有专属对话」的规则对研究目标同样成立。
      h(
        'div',
        {
          key: 'v-spine-goal',
          className: 'rdw-vmod rdw-vmod-goal',
          role: 'button',
          tabIndex: 0,
          title: '研究目标（点开：该目标专属对话，含八层 + good-question 技能）',
          'aria-current': selectedModId === '__goal__' ? 'true' : undefined,
          onClick: () => call(options.onSelectGoalSession),
          onKeyDown: (event) => {
            if (!event) return
            if (event.key === 'Enter' || event.key === ' ') {
              if (event.preventDefault) event.preventDefault()
              call(options.onSelectGoalSession)
            }
          },
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 8px',
            margin: '2px 0 4px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 12.5,
            color: 'var(--rdw-organic-ink)',
            background:
              selectedModId === '__goal__'
                ? 'color-mix(in srgb,var(--rdw-sage-tint) 28%,var(--rdw-organic-surface))'
                : 'transparent',
            borderLeft:
              selectedModId === '__goal__'
                ? '3px solid var(--rdw-sage)'
                : '3px solid transparent',
            boxShadow:
              selectedModId === '__goal__'
                ? '0 1px 3px rgba(0,0,0,0.06)'
                : 'none',
          },
        },
        h('span', { 'aria-hidden': 'true' }, '🎯'),
        h(
          'span',
          { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          '研究目标',
        ),
        h(
          'span',
          { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', fontWeight: 400 } },
          '独立对话',
        ),
      ),
      ...spine.map((mod, idx) => {
        const isModSelected = selectedModId === mod.id
        const modRibs = ribs.filter((r) => r.module === mod.id)
        const isCompleted = pctOf(mod) === 100

        return h(
          'div',
          { key: `v-spine-${mod.id}`, style: { display: 'flex', flexDirection: 'column' } },
          // 纵向主支连线（暖土发丝线，非蓝管线）
          idx > 0
            ? h('div', {
                style: {
                  width: 1.5,
                  height: 9,
                  background: 'color-mix(in srgb,var(--rdw-sage-tint) 52%,transparent)',
                  margin: '0 0 0 15px',
                },
              })
            : null,
          // 主支节点行（会话列表行语言：选中左竖条 + 悬停暖洗 + pebble 圆角）
          h(
            'div',
            {
              className: 'rdw-organic-row',
              style: {
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                background: isModSelected ? 'var(--rdw-organic-hover)' : 'transparent',
                cursor: 'pointer',
                transition: 'background .2s cubic-bezier(.4,0,.2,1)',
              },
              onClick: () => call(options.onSelectModule, mod.id),
              onContextMenu: (event) => emitContextMenu(options, event, { kind: 'module', module: mod, index: idx }),
            },
            // 选中左竖条（3px 鼠尾草，上下留白 22%）
            isModSelected
              ? h('span', {
                  style: {
                    position: 'absolute',
                    left: 0,
                    top: '22%',
                    bottom: '22%',
                    width: 3,
                    borderRadius: '6px',
                    background: 'var(--rdw-sage)',
                  },
                })
              : null,
            // 状态圆点（有机非正圆）
            h('span', {
              style: {
                width: 7,
                height: 7,
                flex: '0 0 auto',
                borderRadius: 'var(--rdw-r-dot)',
                background: isCompleted ? 'var(--rdw-sage)' : 'var(--rdw-tan)',
              },
            }),
            h(
              'span',
              {
                style: {
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11.5,
                  fontWeight: isModSelected ? 600 : 500,
                  color: isModSelected ? 'var(--rdw-organic-ink)' : 'var(--rdw-organic-ink-2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              },
              mod.name,
            ),
            h(
              'span',
              {
                style: {
                  fontFamily: 'var(--rdw-font-mono)',
                  fontSize: 11,
                  color: 'var(--rdw-organic-ink-3)',
                  flex: '0 0 auto',
                },
              },
              mod.id,
            ),
            isCompleted
              ? h('span', { style: { fontSize: 12, color: 'var(--rdw-sage)', flex: '0 0 auto' } }, '✓')
              : null,
            // v3.9 主支行内联操作：↑ ↓ ×（悬停显现，不挤压文字）
            h(
              'div',
              {
                className: 'rdw-mod-actions',
                style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 auto' },
              },
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-mod-act',
                  title: `上移主支「${mod.name}」`,
                  'aria-label': '上移主支',
                  disabled: idx === 0,
                  style: { opacity: idx === 0 ? 0.25 : undefined, cursor: idx === 0 ? 'default' : 'pointer' },
                  onClick: (e) => {
                    if (e && e.stopPropagation) e.stopPropagation()
                    if (idx > 0) call(options.onMoveModule, mod.id, -1)
                  },
                },
                '↑',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-mod-act',
                  title: `下移主支「${mod.name}」`,
                  'aria-label': '下移主支',
                  disabled: idx >= spine.length - 1,
                  style: {
                    opacity: idx >= spine.length - 1 ? 0.25 : undefined,
                    cursor: idx >= spine.length - 1 ? 'default' : 'pointer',
                  },
                  onClick: (e) => {
                    if (e && e.stopPropagation) e.stopPropagation()
                    if (idx < spine.length - 1) call(options.onMoveModule, mod.id, 1)
                  },
                },
                '↓',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-mod-act rdw-mod-act-danger',
                  title: `收起主支「${mod.name}」`,
                  'aria-label': '收起主支',
                  onClick: (e) => {
                    if (e && e.stopPropagation) e.stopPropagation()
                    call(options.onRemoveModule, mod.id)
                  },
                },
                '×',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: {
                    padding: '1px 5px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--rdw-sage)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: 0.7,
                  },
                  title: `在「${mod.name}」阶段下新建分支`,
                  onClick: (e) => {
                    if (e && e.stopPropagation) e.stopPropagation()
                    call(options.onSprout, mod.id)
                  },
                },
                '+',
              ),
            ),
          ),
          // 分支（缩进 + 左侧细竖线，EvoResearch 的子项语言）
          modRibs.length > 0
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    margin: '1px 0 4px 12px',
                    paddingLeft: 8,
                    borderLeft: '1.5px solid var(--rdw-warm-line-2)',
                  },
                },
                ...modRibs.map((rib) => {
                  const isRibSelected = selectedRibId === rib.id
                  const theme = ribTheme(rib.status)

                  return h(
                    'div',
                    {
                      key: `v-rib-${rib.id}`,
                      className: 'rdw-organic-row',
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 7px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        background: isRibSelected ? 'var(--rdw-organic-hover)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background .2s cubic-bezier(.4,0,.2,1)',
                      },
                      title: rib.brief || rib.name,
                      onClick: () => call(options.onSelectRib, rib),
                      onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: mod }),
                      onMouseEnter: (event) => emitHoverCard(options, event, rib),
                      onMouseLeave: () => emitHoverCardLeave(options),
                    },
                    h('span', {
                      style: {
                        width: 5,
                        height: 5,
                        flex: '0 0 auto',
                        borderRadius: 'var(--rdw-r-dot)',
                        /* 侧栏小色点用降饱和版：仍能分辨状态，但不会在
                         * 白灰底上跳出来跟中栏抢注意力。 */
                        background: theme.mute || theme.color,
                      },
                    }),
                    h(
                      'span',
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          fontSize: 11,
                          color: isRibSelected ? 'var(--rdw-organic-ink)' : 'var(--rdw-organic-ink-2)',
                          fontWeight: isRibSelected ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      },
                      rib.name,
                    ),
                    theme.label
                      ? h(
                          'span',
                          {
                            style: {
                              flex: '0 0 auto',
                              padding: '1px 5px',
                              borderRadius: 'var(--rdw-r-pebble-sm)',
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: 'var(--rdw-font-mono)',
                              /* 侧栏降噪：不再给每个状态铺一层彩色底。
                               * 六个彩色胶囊同时出现时，侧栏比中栏还抢眼。
                               * 改为「小色点 + 中性字色」，颜色只做身份标记。 */
                              color: 'var(--rdw-organic-ink-3)',
                              background: 'transparent',
                            },
                          },
                          theme.label,
                        )
                      : null,
                    h(
                      'button',
                      {
                        type: 'button',
                        style: {
                          marginLeft: 2,
                          padding: '0 3px',
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--rdw-organic-ink-3)',
                          fontSize: 11,
                          cursor: 'pointer',
                          opacity: isRibSelected ? 0.9 : 0.4,
                        },
                        title: `以「${rib.name}」分出二级子分支`,
                        onClick: (e) => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          call(options.onSprout, rib.module, rib.id)
                        },
                      },
                      '+',
                    ),
                  )
                }),
              )
            : null,
        )
      }),
    ),
    // 底部分隔线 + 操作区（EvoResearch 底部工具区语言）
    h('div', { style: { height: 1, background: 'var(--rdw-warm-line-2)', margin: '2px 4px' } }),
    h(
      'div',
      { style: { display: 'flex', gap: 6, padding: '0 2px' } },
      h(
        'button',
        {
          type: 'button',
          style: {
            flex: 1,
            padding: '6px 0',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            border: '1px solid var(--rdw-warm-line)',
            background: 'var(--rdw-organic-input)',
            color: 'var(--rdw-organic-ink-2)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all .2s cubic-bezier(.4,0,.2,1)',
          },
          disabled: Boolean(options.busy),
          title: '自动回连全部已满意的分支',
          onClick: () => call(options.onAuto),
        },
        '自动回连',
      ),
      h(
        'button',
        {
          type: 'button',
          style: {
            flex: 1.3,
            padding: '6px 0',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            border: 'none',
            background: 'var(--rdw-soil)',
            color: '#faf6f1',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all .2s cubic-bezier(.4,0,.2,1)',
            boxShadow: 'var(--rdw-shadow-organic-1)',
          },
          disabled: Boolean(options.busy),
          title: '在此模块下新建一个分支',
          onClick: () => call(options.onSprout, selectedModId, selectedRibId),
        },
        '🌱 新建一个分支',
      ),
    ),
  )

  // 2. 中栏 · 当前工作区
  //    参照 EvoResearch 的对话主区：纸面留白、衬线大标题、气泡式消息、
  //    有机 pebble 卡片；会话区用 blob 大圆角承载。
  const sessionData = options.ribWork || (options.session && options.session.data) || null
  const entries = (sessionData && Array.isArray(sessionData.directivesParsed)) ? sessionData.directivesParsed : []
  const sessionSections = (sessionData && Array.isArray(sessionData.sessionParsed)) ? sessionData.sessionParsed : []
  const parentRibId = (sessionData && sessionData.parent) || activeRib.parent || null
  const messageAnchor = (activeRib && activeRib.origin && activeRib.origin.kind === 'message') ? activeRib.origin.anchor : null
  const contextText = (sessionData && sessionData.context) || ''
  const briefText = (sessionData && sessionData.brief) || activeRib.brief || ''
  const hasPriorContext = Boolean(parentRibId || messageAnchor || contextText || (activeRib.origin && activeRib.origin.kind))
  const hasDialogue = entries.length > 0

  const middleTab = options.middleTab || 'chat' // 'chat' | 'trace'
  const middleMode = options.middleMode || 'auto' // 'auto' | 'native'
  const showNativeLive = middleMode === 'native' || Boolean(options.conversationNode)

  const priorContextNode = hasPriorContext
    ? h(
        'div',
        { className: 'rdw-chat-context-card', style: { marginBottom: 6, flexShrink: 0 } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--rdw-sage)' } },
          h('span', null, '📌'),
          h('span', null, '前置上下文与派生原点'),
        ),
        messageAnchor
          ? h(
              'div',
              { style: { color: 'var(--rdw-organic-ink-2)' } },
              '📍 派生自会话消息：“',
              h('span', { style: { fontStyle: 'italic' } }, String(messageAnchor.messageExcerpt || '').slice(0, 120)),
              '”',
            )
          : null,
        parentRibId
          ? h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--rdw-organic-ink-2)' } },
              '🌿 派生自父分支：',
              h(
                'button',
                {
                  type: 'button',
                  style: {
                    padding: '1px 6px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid var(--rdw-warm-line)',
                    background: 'var(--rdw-organic-surface)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'var(--rdw-font-mono)',
                  },
                  onClick: () => {
                    const parentRib = ribs.find((r) => r.id === parentRibId)
                    if (parentRib) call(options.onSelectRib, parentRib)
                  },
                },
                parentRibId,
              ),
              h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontSize: 11 } }, '（承袭前序阶段研究产物）'),
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginTop: 3 } },
          h(
            'span',
            { style: { color: 'var(--rdw-organic-ink-2)', fontSize: 11 } },
            contextText ? '📄 已挂载主支上下文档案快照 (CONTEXT.md)' : '📄 分支任务上下文',
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h(
              'button',
              {
                type: 'button',
                className: 'rdw-organic-btn',
                style: {
                  padding: '2px 8px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#faf6f1',
                  background: 'var(--rdw-sage)',
                  border: 'none',
                  cursor: 'pointer',
                },
                title: '将当前分支的研究目标、所属阶段与上下文档案注入会话框，让 AI 智能体掌握当前上下文',
                onClick: () => call(options.onMountContext, { module: activeModule.id, branch: activeRib.id }),
              },
              '⚡ 注入上下文到对话',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'rdw-organic-btn',
                style: {
                  padding: '2px 8px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--rdw-teal-ink)',
                  background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                  border: '1px solid color-mix(in srgb,var(--rdw-teal) 32%,transparent)',
                  cursor: 'pointer',
                },
                title: '从当前对话自动分叉创建新分支',
                onClick: () => call(options.onAutoSprout, activeRib.brief || activeRib.name),
              },
              '🌱 自动分新分支',
            ),
          ),
        ),
      )
    : null

  const middlePane = h(
    'div',
    {
      className: 'rdw-pane-middle rdw-pane-focus',
      style: {
        margin: 0,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        /* 中栏是 grid 子项：min-height:0 让它可收缩，
         * align-self:stretch（默认）让它撑满整行高度。
         * 不要写 height:100%——grid 项用百分比高度在部分浏览器下
         * 会以内容高度为基准循环，导致内部 100% 子树塌陷。 */
        minHeight: 0,
        overflow: 'hidden',
        /* 中栏是唯一「抬起来」的面：纯白 + 投影，左右两栏退成底板。 */
        background: 'var(--rdw-focus-surface)',
        border: '1px solid var(--rdw-focus-line)',
        borderRadius: 'var(--rdw-r-blob)',
        boxShadow: 'var(--rdw-focus-shadow)',
      },
    },
    // 中栏顶部：紧凑优雅的工作区标题栏（Apple OS 规范：扁平微通透，主次分明）
    h(
      'div',
      {
        style: {
          padding: '2px 4px 6px',
          borderBottom: '1px solid var(--rdw-warm-line-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 } },
        h(
          'div',
          {
            style: {
              fontFamily: 'var(--rdw-font)',
              fontSize: 16.5,
              fontWeight: 600,
              letterSpacing: '-.015em',
              color: 'var(--rdw-organic-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          },
          isGoalSelected ? '🎯 研究目标 · 好问题讨论' : (activeRib.name || '当前任务工作区'),
        ),
        h(
          'span',
          {
            style: {
              padding: '1px 7px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--rdw-teal-ink)',
              background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
              border: '1px solid color-mix(in srgb,var(--rdw-teal) 26%,transparent)',
              flex: '0 0 auto',
            },
          },
          isGoalSelected ? '研究总目标' : (activeRib.id || '主线任务'),
        ),
      ),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' } },
        h(
          'span',
          {
            style: {
              padding: '2px 8px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--rdw-sage)',
              background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
              border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 32%,transparent)',
            },
          },
          activeModule.name || '统计分析',
        ),
        // v3.6 锚点提示：如果当前分支是从消息分叉来的，给一个「📍 源消息」提示
        activeRib && activeRib.origin && activeRib.origin.kind === 'message'
          ? h(
              'span',
              {
                className: 'rdw-msg-anchor',
                title: activeRib.origin.anchor && activeRib.origin.anchor.messageExcerpt
                  ? `源消息：${activeRib.origin.anchor.messageExcerpt}`
                  : '从会话消息分叉而来',
              },
              '📍 消息',
            )
          : null,
      ),
    ),
    // 任务情境综合条（Apple 拟态微卡片：整合智能体、Dock快照、下一步与阻塞，高度紧凑节省 ~250px 纵向空间）
    h(
      'div',
      {
        style: {
          padding: '7px 11px',
          borderRadius: 'var(--rdw-r-pebble)',
          background: 'var(--rdw-fill-quat)',
          border: '1px solid var(--rdw-warm-line-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        },
      },
      // 状态与身份行
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } },
          h('span', null, '🤖'),
          h('strong', { style: { fontWeight: 600, color: 'var(--rdw-organic-ink)' } }, `${activeModule.name || '统计分析'}智能体`),
          h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--rdw-sys-green)' } }),
          h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontSize: 11.5 } }, '· 🧬 科研记忆 Dock 已挂载'),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          blockers.length > 0
            ? h(
                'span',
                {
                  style: {
                    padding: '1px 6px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--rdw-sys-orange)',
                    background: 'color-mix(in srgb,var(--rdw-sys-orange) 14%,transparent)',
                  },
                  title: blockers.map((b) => (typeof b === 'object' ? b.reason || b.name : b)).join('；'),
                },
                `⊘ ${blockers.length} 阻塞信号`,
              )
            : null,
          nextSteps.length > 0
            ? h(
                'span',
                {
                  style: {
                    padding: '1px 6px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--rdw-sage)',
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 14%,transparent)',
                  },
                  title: nextSteps.map((st) => (typeof st === 'object' ? st.title || st.name : st)).join('；'),
                },
                '📋 主支下一步',
              )
            : null,
        ),
      ),
      // 任务简要目标与下一步提示
      h(
        'div',
        {
          style: {
            fontSize: 11.5,
            color: 'var(--rdw-organic-ink-2)',
            lineHeight: 1.45,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
          title: activeRib.brief || '',
        },
        activeRib.brief || (sessionData && sessionData.brief) || `${activeModule.name || '阶段'}探索任务：推进 ${activeRib.name || activeRib.id} 的分析与成果输出。`,
      ),
    ),
    // 中栏主体：交互式会话框（对标原生对话与轨迹设计）
    h(
      'div',
      {
        style: {
          flex: '1 1 auto',
          height: 0,
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--rdw-r-blob)',
          background: 'var(--rdw-organic-surface)',
          border: '1px solid var(--rdw-warm-line)',
          marginTop: 2,
          padding: '8px 12px 10px',
          boxShadow: 'var(--rdw-shadow-organic-1)',
        },
      },
      // 1. 原生风格选项卡头（对标第三图结构：对话 | 轨迹）
      h(
        'div',
        { className: 'rdw-chat-tabs-bar' },
        h(
          'div',
          { className: 'rdw-chat-tabs' },
          h(
            'button',
            {
              type: 'button',
              className: `rdw-chat-tab ${middleTab === 'chat' ? 'active' : ''}`,
              onClick: () => call(options.onSelectMiddleTab, 'chat'),
            },
            '对话',
            entries.length > 0
              ? h('span', { style: { marginLeft: 5, fontSize: 11, opacity: 0.7 } }, `(${entries.length})`)
              : null,
          ),
          h(
            'button',
            {
              type: 'button',
              className: `rdw-chat-tab ${middleTab === 'trace' ? 'active' : ''}`,
              onClick: () => call(options.onSelectMiddleTab, 'trace'),
            },
            '轨迹',
            sessionSections.length > 0
              ? h('span', { style: { marginLeft: 5, fontSize: 11, opacity: 0.7 } }, `(${sessionSections.length})`)
              : null,
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
          options.conversationNode
            ? h(
                'span',
                {
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--rdw-sage)',
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                    border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 32%,transparent)',
                  },
                },
                '⚡ 原生交互式会话',
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                padding: '2px 8px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--rdw-teal-ink)',
                background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                border: '1px solid color-mix(in srgb,var(--rdw-teal) 32%,transparent)',
                cursor: 'pointer',
              },
              title: '将当前分支的完整上下文同步挂载并注入至会话框',
              onClick: () => call(options.onMountContext, { module: activeModule.id, branch: activeRib.id }),
            },
            '⚡ 注入上下文',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                padding: '2px 8px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--rdw-soil)',
                background: 'color-mix(in srgb,var(--rdw-soil) 12%,transparent)',
                border: '1px solid color-mix(in srgb,var(--rdw-soil) 32%,transparent)',
                cursor: 'pointer',
              },
              title: '从当前对话自动分叉创建新分支',
              onClick: () => call(options.onAutoSprout, activeRib.brief || activeRib.name),
            },
            '🌱 对话自动建分支',
          ),
          h(
            'span',
            { style: { fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', whiteSpace: 'nowrap' } },
            '选中文字可分叉',
          ),
        ),
      ),
      // 2. 原生会话节点挂载槽位（卡片已按用户要求隐藏以节省纵向屏幕空间，保持节点常驻 DOM）
      options.conversationNode
        ? h(
            'div',
            {
              className: 'rdw-native-slot',
              style: {
                display: middleTab === 'chat' ? 'flex' : 'none',
                flex: '1 1 auto',
                height: 0,
                minHeight: 0,
                overflow: 'hidden',
                flexDirection: 'column',
                position: 'relative',
              },
              onMouseUp: (event) => {
                if (typeof options.onShowMessageSprout !== 'function') return
                if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return
                const sel = window.getSelection()
                const text = sel && typeof sel.toString === 'function' ? sel.toString().trim() : ''
                if (!text || text.length < 4) return
                let px = event.clientX
                let py = event.clientY
                try {
                  if (sel.rangeCount > 0) {
                    const rect = sel.getRangeAt(0).getBoundingClientRect()
                    if (rect) { px = rect.right; py = rect.bottom + 6 }
                  }
                } catch { /* ignore */ }
                options.onShowMessageSprout({ excerpt: text, x: px, y: py })
              },
              onContextMenu: (event) => {
                if (typeof options.onContextMenu !== 'function') return
                let excerpt = ''
                if (typeof window !== 'undefined' && window.getSelection) {
                  const sel = window.getSelection()
                  if (sel && sel.toString().trim()) excerpt = sel.toString().trim()
                }
                if (!excerpt && event.target) {
                  const p = event.target.closest('p, div, li, blockquote, [role="article"]')
                  if (p && p.innerText) excerpt = p.innerText.trim().slice(0, 300)
                }
                if (excerpt) {
                  event.preventDefault()
                  if (event.stopPropagation) event.stopPropagation()
                  options.onContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    target: { kind: 'conversation-message', excerpt },
                  })
                }
              },
            },
            options.conversationNode,
          )
        : null,
      // 4. 轨迹标签页（中栏主体：显示执行推理记录与尝试轨迹）
      middleTab === 'trace'
        ? h(
            'div',
            {
              className: 'rdw-trace-stream',
            },
            sessionSections.length > 0
              ? sessionSections.map((sec, idx) =>
                  h(
                    'div',
                    { key: `sec-${idx}`, className: 'rdw-trace-card' },
                    h(
                      'div',
                      { className: 'rdw-trace-card-title' },
                      h('span', null, idx === 0 ? '🎯' : idx === 1 ? '🧠' : idx === 2 ? '🔍' : '📦'),
                      h('span', null, sec.title || `第 ${idx + 1} 阶段执行记录`),
                    ),
                    h('div', { className: 'rdw-trace-card-body' }, sec.text || ''),
                  ),
                )
              : h(
                  'div',
                  { style: { padding: '24px 10px', textAlign: 'center', color: 'var(--rdw-organic-ink-3)', fontSize: 12 } },
                  '暂无执行推理记录。智能体在执行任务时将自动沉淀尝试轨迹与评估意见。',
                ),
          )
        : null,
      // 5. 兜底回退模式（当环境未提供原生 conversationNode 且在对话页时，展示纯自绘对话记录与输入区）
      !options.conversationNode && middleTab === 'chat'
        ? h(
            'div',
            {
              style: {
                flex: '1 1 auto',
                height: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              },
            },
            priorContextNode,
            // 会话消息或上下文流
            h(
              'div',
              {
                className: 'rdw-chat-stream',
                onMouseUp: (event) => {
                  if (typeof options.onShowMessageSprout !== 'function') return
                  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return
                  const sel = window.getSelection()
                  const text = sel && typeof sel.toString === 'function' ? sel.toString().trim() : ''
                  if (!text || text.length < 4) return
                  let px = event.clientX
                  let py = event.clientY
                  try {
                    if (sel.rangeCount > 0) {
                      const rect = sel.getRangeAt(0).getBoundingClientRect()
                      if (rect) { px = rect.right; py = rect.bottom + 6 }
                    }
                  } catch { /* ignore */ }
                  options.onShowMessageSprout({ excerpt: text, x: px, y: py })
                },
              },
              // 对话往来记录
              hasDialogue
                ? entries.map((entry, index) => {
                    const isUser = entry.side === 'human' || entry.role === 'human'
                    return h(
                      'div',
                      {
                        key: `msg-${index}`,
                        className: `rdw-chat-bubble ${isUser ? 'user' : 'agent'}`,
                      },
                      h(
                        'div',
                        {
                          className: 'rdw-chat-bubble-header',
                          style: { justifyContent: isUser ? 'flex-end' : 'flex-start' },
                        },
                        h('span', { style: { fontWeight: 600 } }, isUser ? '👤 你' : `🤖 ${activeModule.name || '统计'}智能体`),
                        entry.at ? h('span', null, String(entry.at).slice(11, 19) || entry.at) : null,
                      ),
                      h('div', { className: 'rdw-chat-bubble-body' }, entry.text || ''),
                    )
                  })
                : (!hasPriorContext
                    ? h(
                        'div',
                        { className: 'rdw-chat-empty' },
                        h(
                          'div',
                          { className: 'rdw-chat-empty-title' },
                          h('span', null, '📋'),
                          h('span', null, '探索未至之境'),
                          h(
                            'span',
                            {
                              style: {
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 10,
                                background: 'color-mix(in srgb,var(--rdw-teal) 16%,transparent)',
                                color: 'var(--rdw-teal-ink)',
                                fontWeight: 600,
                              },
                            },
                            '预览版',
                          ),
                        ),
                        h(
                          'div',
                          { className: 'rdw-chat-empty-meta' },
                          h('span', null, `📁 ${options.projectTitle || 'dakesoftware'}`),
                          h('span', null, '·'),
                          h('span', null, '⚙ PTC 模式'),
                        ),
                        h(
                          'div',
                          { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', maxWidth: '36ch', lineHeight: 1.6 } },
                          '向当前探索智能体下达指令，开启本分支的科学探索',
                        ),
                      )
                    : h(
                        'div',
                        { style: { padding: '20px 10px', textAlign: 'center', color: 'var(--rdw-organic-ink-3)', fontSize: 12 } },
                        '已成功承袭前序上下文。在下方输入框中写下你的第一条研究指令。',
                      )),
            ),
            // 底部原生输入栏
            h(
              'div',
              { className: 'rdw-chat-composer' },
              h('textarea', {
                placeholder: '发送消息或创建任务，/ 调用指令，@ 文件或对话',
                value: draft,
                onChange: (e) => call(options.onDraftChange, e && e.target ? e.target.value : ''),
                onKeyDown: (e) => {
                  if (e && e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (draft.trim()) call(options.onSendDirective, draft.trim())
                  }
                },
              }),
              h(
                'div',
                { className: 'rdw-chat-composer-bar' },
                h(
                  'div',
                  { className: 'rdw-chat-composer-pills' },
                  h('button', { type: 'button', className: 'rdw-chat-composer-pill', title: '添加附件/上下文' }, '+'),
                  h('button', { type: 'button', className: 'rdw-chat-composer-pill' }, '🛡 完全权限 ▾'),
                  h('button', { type: 'button', className: 'rdw-chat-composer-pill' }, `${options.composerModel || 'Gemini 3.8 Flash High'} ▾`),
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('button', { type: 'button', style: { border: 'none', background: 'none', fontSize: 14, cursor: 'pointer', opacity: 0.6 } }, '🎙'),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'rdw-chat-composer-send',
                      disabled: !draft.trim() || sending,
                      title: '发送指令 (Enter)',
                      onClick: () => draft.trim() && call(options.onSendDirective, draft.trim()),
                    },
                    sending ? '…' : '↑',
                  ),
                ),
              ),
            ),
          )
        : null,
    ),
  )
  // 3. 右栏 · 结果面板（产物预览与合并）
  //    参照 EvoResearch 的检查器面板（evo-inspector）：纸面留白、衬线小标题、
  //    有机 pebble 产物条目、底部主操作按钮用陶土/石褐实色。
  const rawFiles =
    Array.isArray(activeRib.outputFiles) && activeRib.outputFiles.length > 0
      ? activeRib.outputFiles
      : Array.isArray(activeRib.workFiles) && activeRib.workFiles.length > 0
        ? activeRib.workFiles
        : null

  const artifactList = rawFiles
    ? rawFiles.slice(0, 5).map((f) => {
        const fname = typeof f === 'string' ? f : f.name || f.path || '产物文件'
        const ext = fname.includes('.') ? fname.split('.').pop().toLowerCase() : ''
        const icon = ['r', 'py', 'js', 'sh', 'ts'].includes(ext)
          ? '</>'
          : ['csv', 'xlsx', 'xls', 'parquet'].includes(ext)
            ? '📊'
            : ['md', 'txt', 'doc', 'docx'].includes(ext)
              ? '📝'
              : ['png', 'jpg', 'svg', 'pdf'].includes(ext)
                ? '🖼️'
                : '📄'
        const desc = f.size ? `${(f.size / 1024).toFixed(1)} KB · 产物输出` : '产物文件'
        return { icon, title: fname, desc }
      })
    : [
        { icon: '</>', title: `${activeRib.id || 'analysis'}_main.R`, desc: '分析代码 · 版本 v2' },
        { icon: '📊', title: `${activeRib.name || '诊断报告'}`, desc: '表格 · 图形 · 指标' },
        { icon: '📝', title: '方法学审查结论', desc: '结论与可信证据' },
      ]

  // v3.8 · 本分支的文献（Zotero 接入）
  //   两块能力，都落在右栏，与「产物」并列：
  //     1) 搜索 Zotero 库 → 把条目挂到当前这根分支（点 ✚）
  //     2) 从合集导入 → 整个 Zotero 合集一键挂上来
  //   Zotero 没开机时只显示「未连接」+ 重试，已挂的 key 仍然列出来（不给假象）。
  const zotero = options.zotero && typeof options.zotero === 'object' ? options.zotero : null
  const zoteroAvailable = Boolean(zotero && zotero.available)
  const zoteroBusy = Boolean(options.zoteroBusy)
  const linkedItems = zotero && Array.isArray(zotero.items) ? zotero.items : []
  const linkedKeys = zotero && Array.isArray(zotero.linked) ? zotero.linked : []
  const missingKeys = zotero && Array.isArray(zotero.missing) ? zotero.missing : []
  const searchState = zotero && zotero.search && typeof zotero.search === 'object' ? zotero.search : null
  const searchHits = searchState && Array.isArray(searchState.items) ? searchState.items : []
  const collections = zotero && Array.isArray(zotero.collections) ? zotero.collections : []
  const searchDraft = typeof options.zoteroSearch === 'string' ? options.zoteroSearch : ''
  const collectionOpen = Boolean(options.zoteroCollectionOpen)

  /** 迷你图文按钮：右栏很窄，按钮只能放「一个图标 + 一个字」。 */
  const miniBtn = (label, handler, extra) =>
    h(
      'button',
      {
        type: 'button',
        title: label,
        disabled: zoteroBusy || !zoteroAvailable,
        onClick: (event) => {
          if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
          call(handler)
        },
        style: {
          flex: '0 0 auto',
          padding: '1px 6px',
          borderRadius: 'var(--rdw-r-pebble-sm)',
          border: '1px solid var(--rdw-warm-line)',
          background: 'var(--rdw-organic-input)',
          color: 'var(--rdw-organic-ink-2)',
          font: 'inherit',
          fontSize: 11,
          lineHeight: '16px',
          cursor: zoteroBusy || !zoteroAvailable ? 'default' : 'pointer',
          opacity: zoteroBusy || !zoteroAvailable ? 0.55 : 1,
          ...(extra || {}),
        },
      },
      label,
    )

  const zoteroPane = h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
    // 小标题 + 计数 + 刷新
    h(
      'div',
      { style: { ...row, gap: 6, padding: '2px 6px 0' } },
      h(
        'div',
        {
          style: {
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '.3px',
            textTransform: 'uppercase',
            color: 'var(--rdw-organic-ink-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
        '📚 本分支的文献',
      ),
      linkedKeys.length > 0
        ? h(
            'span',
            {
              style: {
                flex: '0 0 auto',
                fontFamily: 'var(--rdw-font-mono)',
                fontSize: 11,
                color: 'var(--rdw-organic-ink-3)',
              },
            },
            String(linkedKeys.length),
          )
        : null,
      miniBtn('↻', options.onZoteroRefresh, { background: 'transparent', border: 'none', color: 'var(--rdw-organic-ink-3)' }),
    ),

    // 未连接：说明 + 重试，绝不假装读到数据
    !zoteroAvailable
      ? h(
          'div',
          {
            style: {
              padding: '6px 9px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))',
              border: '1px solid color-mix(in srgb,var(--rdw-tan) 30%,transparent)',
              fontSize: 11.5,
              lineHeight: 1.5,
              color: 'var(--rdw-organic-ink-2)',
            },
          },
          h('div', { style: { fontWeight: 600, color: 'var(--rdw-tan-ink)' } }, '未连接 Zotero'),
          h(
            'div',
            { style: { marginTop: 2 } },
            (zotero && zotero.error) || '请先启动 Zotero 桌面版（本地 API 默认 127.0.0.1:23119）。',
          ),
        )
      : null,

    // 已挂文献
    linkedItems.length > 0
      ? h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          ...linkedItems.slice(0, 6).map((item) =>
            h(
              'div',
              {
                key: `zot-${item.key}`,
                style: {
                  padding: '6px 9px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'var(--rdw-organic-surface)',
                  border: '1px solid var(--rdw-warm-line-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  boxShadow: 'var(--rdw-shadow-organic-1)',
                },
              },
              h(
                'div',
                {
                  style: {
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--rdw-organic-ink)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  },
                  title: item.title,
                },
                item.title,
              ),
              h(
                'div',
                {
                  style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--rdw-organic-ink-3)' },
                },
                h(
                  'span',
                  { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                  [item.creators, item.year ? String(item.year) : ''].filter(Boolean).join(' · ') || item.itemType || '',
                ),
                miniBtn('定位', () => call(options.onZoteroLocate, item.key, 'item')),
                miniBtn('移出', () => call(options.onZoteroDetach, item.key)),
              ),
            ),
          ),
          linkedKeys.length > linkedItems.length
            ? h(
                'div',
                { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                `另有 ${linkedKeys.length - linkedItems.length} 条未取到摘要（Zotero 里可能已删除或归档）`,
              )
            : null,
        )
      : missingKeys.length > 0
        ? h(
            'div',
            { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
            `已挂 ${missingKeys.length} 条，但当前读不到摘要`,
          )
        : zoteroAvailable
          ? h(
              'div',
              { style: { padding: '0 6px', fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.5 } },
              '这个分支还没挂文献。在下面搜索，或从合集导入。',
            )
          : null,

    // 搜索 Zotero 库
    zoteroAvailable
      ? h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 } },
          h(
            'div',
            { style: { ...row, gap: 5, flexWrap: 'nowrap' } },
            h('input', {
              value: searchDraft,
              placeholder: '在 Zotero 库中搜索…',
              disabled: zoteroBusy,
              'aria-label': '在 Zotero 库中搜索文献',
              onChange: (event) =>
                call(options.onZoteroSearchChange, event && event.target ? event.target.value : ''),
              onKeyDown: (event) => {
                if (event && event.key === 'Enter') {
                  if (typeof event.preventDefault === 'function') event.preventDefault()
                  call(options.onZoteroSearchSubmit)
                }
              },
              style: {
                flex: '1 1 0',
                minWidth: 0,
                padding: '4px 8px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-input)',
                color: 'var(--rdw-organic-ink)',
                font: 'inherit',
                fontSize: 11.5,
                outline: 'none',
              },
            }),
            miniBtn('搜', options.onZoteroSearchSubmit),
          ),
          searchState
            ? searchHits.length > 0
              ? h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 190, overflowY: 'auto' } },
                  ...searchHits.slice(0, 10).map((hit) => {
                    const attached = linkedKeys.includes(hit.key)
                    return h(
                      'div',
                      {
                        key: `hit-${hit.key}`,
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 7px',
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          border: '1px solid var(--rdw-warm-line-2)',
                          background: 'var(--rdw-fill-quat)',
                        },
                      },
                      h(
                        'span',
                        {
                          style: {
                            flex: 1,
                            minWidth: 0,
                            fontSize: 11,
                            color: 'var(--rdw-organic-ink-2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                          title: `${hit.title}${hit.publication ? ` · ${hit.publication}` : ''}`,
                        },
                        `${hit.year ? `${hit.year} · ` : ''}${hit.title}`,
                      ),
                      attached
                        ? h(
                            'span',
                            { style: { flex: '0 0 auto', fontSize: 11, color: 'var(--rdw-sys-green)' } },
                            '已挂',
                          )
                        : miniBtn('✚', () => call(options.onZoteroAttach, hit.key)),
                    )
                  }),
                )
              : h(
                  'div',
                  { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                  searchState.error ? `检索失败：${searchState.error}` : '没有命中条目',
                )
            : null,
        )
      : null,

    // 从合集导入
    zoteroAvailable && collections.length > 0
      ? h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 } },
          h(
            'button',
            {
              type: 'button',
              disabled: zoteroBusy,
              onClick: () => call(options.onZoteroToggleCollections),
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--rdw-organic-ink-3)',
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
              },
            },
            h('span', { style: { flex: '0 0 auto' } }, collectionOpen ? '▾' : '▸'),
            h('span', { style: { flex: 1, minWidth: 0 } }, '从合集导入'),
            h(
              'span',
              { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontSize: 11 } },
              String(collections.length),
            ),
          ),
          collectionOpen
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxHeight: 200,
                    overflowY: 'auto',
                    padding: '4px 2px',
                    border: '1px solid var(--rdw-warm-line-2)',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    background: 'var(--rdw-fill-quat)',
                  },
                },
                ...collections
                  .filter((col) => col && col.items > 0)
                  .slice(0, 40)
                  .map((col) =>
                    h(
                      'div',
                      {
                        key: `col-${col.key}`,
                        title: `把「${col.name}」整个挂到这个分支（${col.items} 条）`,
                        onClick: () => {
                          if (!zoteroBusy) call(options.onZoteroImportCollection, col.key, col.name)
                        },
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 6px',
                          paddingLeft: 6 + Number(col.depth || 0) * 10,
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          cursor: zoteroBusy ? 'default' : 'pointer',
                          fontSize: 11,
                          color: 'var(--rdw-organic-ink-2)',
                          opacity: zoteroBusy ? 0.6 : 1,
                        },
                      },
                      h('span', { style: { flex: '0 0 auto', fontSize: 11 } }, col.depth > 0 ? '↳' : '📁'),
                      h(
                        'span',
                        { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        col.name,
                      ),
                      h(
                        'span',
                        { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                        String(col.items),
                      ),
                    ),
                  ),
              )
            : null,
        )
      : null,
  )

  /* ── v2.1 主支成稿面板（右栏第一块）─────────────────────────────
   *
   * 「这一节主支的成稿 / 备份 / 续贯」三段。旧项目（没有 SPINE.json）整块不渲染，
   * 只给一句「本模块还没有主支成稿」的引导，不制造噪音。 */
  const stageNode = activeModule && activeModule.stageId ? activeModule : null
  const spineInfo = options.spine && options.spine.ok !== false ? options.spine : null
  const stageDetail = spineInfo && spineInfo.detail && spineInfo.detail.ok !== false ? spineInfo.detail : null
  const stageBusy = Boolean(options.stageBusy)
  const stageFocusId = stageNode ? stageNode.stageId : null
  // 只有详情抽屉里正在看这一主支时，正文才显示（避免点开别的主支串内容）
  const showStageDraft =
    stageDetail && stageDetail.stage && stageFocusId && stageDetail.stage.id === stageFocusId
      ? stageDetail.draftRaw
      : null
  const chainIssuesForStage = spineInfo && Array.isArray(spineInfo.spine && spineInfo.spine.chainIssues)
    ? spineInfo.spine.chainIssues
    : []

  const stagePane = stageNode
    ? h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        // 小标题 + 状态徽标
        h(
          'div',
          { style: { ...row, gap: 6, padding: '2px 6px 0' } },
          h(
            'div',
            {
              style: {
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                color: 'var(--rdw-organic-ink-3)',
              },
            },
            '📜 主支成稿',
          ),
          h(
            'span',
            {
              style: {
                flex: '0 0 auto',
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 8px',
                borderRadius: 'var(--rdw-r-pill)',
                color: stageTheme(stageNode).color,
                background: 'color-mix(in srgb,var(--rdw-sage-tint) 12%,var(--rdw-organic-surface))',
                border: `1px solid ${stageNode.stageStatus === 'stale' ? 'color-mix(in srgb,var(--rdw-tan-ink) 40%,transparent)' : 'var(--rdw-warm-line-2)'}`,
              },
            },
            stageBadgeText(stageNode),
          ),
        ),

        // 三个动作：重新生成 / 备份 / 汇编终稿
        h(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 2px' } },
          h(
            'button',
            {
              type: 'button',
              disabled: stageBusy || stageNode.stageStatus === 'locked',
              title: stageNode.stageStatus === 'locked' ? '主支已锁定，先解锁再重生成' : '备份旧稿并确定性重生成 7 节成稿',
              onClick: () => call(options.onSpineOp, 'rebuild', stageFocusId),
              style: {
                ...button,
                height: 24,
                padding: '0 9px',
                fontSize: 11,
                opacity: stageBusy || stageNode.stageStatus === 'locked' ? 0.5 : 1,
                cursor: stageBusy || stageNode.stageStatus === 'locked' ? 'default' : 'pointer',
              },
            },
            '↻ 重新生成',
          ),
          h(
            'button',
            {
              type: 'button',
              disabled: stageBusy || !stageHasDraft(stageNode),
              title: stageHasDraft(stageNode) ? '只备份当前成稿，不重生成' : '尚无成稿可备份',
              onClick: () => call(options.onSpineOp, 'backup', stageFocusId),
              style: {
                ...button,
                height: 24,
                padding: '0 9px',
                fontSize: 11,
                opacity: stageBusy || !stageHasDraft(stageNode) ? 0.5 : 1,
                cursor: stageBusy || !stageHasDraft(stageNode) ? 'default' : 'pointer',
              },
            },
            '⧉ 备份',
          ),
          h(
            'button',
            {
              type: 'button',
              disabled: stageBusy || stageNode.stageStatus === 'locked',
              title: stageNode.stageStatus === 'locked' ? '已锁定（点击解锁）' : '锁定后 graft 不再自动重生成',
              onClick: () => call(options.onSpineOp, stageNode.stageStatus === 'locked' ? 'unlock' : 'lock', stageFocusId),
              style: {
                ...button,
                height: 24,
                padding: '0 9px',
                fontSize: 11,
                opacity: stageBusy ? 0.5 : 1,
              },
            },
            stageNode.stageStatus === 'locked' ? '🔓 解锁' : '🔒 锁定',
          ),
        ),

        // 段一：成稿正文（7 节预览 + 全文展开）
        h(
          'div',
          {
            style: {
              padding: '7px 10px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: 'var(--rdw-organic-surface)',
              border: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            },
          },
          h(
            'div',
            { style: { ...row, gap: 5 } },
            h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '成稿'),
            h(
              'span',
              { style: { fontFamily: 'var(--rdw-font-mono)', fontSize: 11, color: 'var(--rdw-organic-ink-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              stageNode.draft && stageNode.draft.path ? stageNode.draft.path : '（无成稿路径）',
            ),
            typeof showStageDraft === 'string' && showStageDraft.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: () => call(options.onOpenStageDraft, stageFocusId, showStageDraft),
                    style: { ...button, height: 20, padding: '0 7px', fontSize: 11 },
                    title: '查看 DRAFT.md 全文',
                  },
                  '全文',
                )
              : null,
          ),
          !stageHasDraft(stageNode)
            ? h(
                'div',
                { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.5 } },
                stageNode.stageStatus === 'empty'
                  ? '本主支还没开工。分支回连（graft）后会自动生成成稿。'
                  : '成稿文件缺失 —— 点「↻ 重新生成」重建。',
              )
            : (() => {
                const sections = (stageNode.draft && Array.isArray(stageNode.draft.sections)) ? stageNode.draft.sections : []
                if (sections.length === 0) {
                  return h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '（成稿小节未解析）')
                }
                return h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                  ...sections.slice(0, 7).map((sec) =>
                    h(
                      'div',
                      {
                        key: `sec-${sec.no}`,
                        style: { display: 'flex', gap: 5, fontSize: 11, lineHeight: 1.45, alignItems: 'baseline' },
                      },
                      h(
                        'span',
                        { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', color: 'var(--rdw-sage)', fontWeight: 700 } },
                        `§${sec.no}`,
                      ),
                      h(
                        'span',
                        {
                          style: {
                            flex: 1,
                            minWidth: 0,
                            color: 'var(--rdw-organic-ink-2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                          title: `${sec.title}：${sec.preview || ''}`,
                        },
                        sec.title || '（无标题）',
                        sec.preview ? h('span', { style: { color: 'var(--rdw-organic-ink-3)' } }, ` · ${truncate(sec.preview, 22)}`) : null,
                      ),
                    ),
                  ),
                  sections.length > 7
                    ? h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, `…共 ${sections.length} 节`)
                    : null,
                )
              })(),
        ),

        // 段二：备份列表
        h(
          'div',
          {
            style: {
              padding: '7px 10px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: 'var(--rdw-organic-surface)',
              border: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            },
          },
          h(
            'div',
            { style: { ...row, gap: 5 } },
            h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '备份'),
            h(
              'span',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', flex: 1 } },
              `${Number(stageNode.backupCount) || 0} 份`,
            ),
          ),
          (() => {
            const backups = Array.isArray(stageNode.backups) ? stageNode.backups : []
            if (backups.length === 0) {
              return h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '还没有备份（每次重生成前会自动备份上一版）')
            }
            return h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' } },
              ...backups
                .slice()
                .reverse()
                .map((bak) =>
                  h(
                    'div',
                    {
                      key: `bak-${bak.revision}-${bak.at}`,
                      role: 'button',
                      tabIndex: 0,
                      style: {
                        display: 'flex',
                        gap: 5,
                        alignItems: 'baseline',
                        fontSize: 11,
                        padding: '2px 4px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        cursor: bak.path ? 'pointer' : 'default',
                      },
                      title: `${bak.path || ''}\n${bak.sha256 || ''}\n${bak.reason || ''}`,
                      onClick: () => { if (bak.path) call(options.onOpenFile, bak.path) },
                      onKeyDown: (event) => {
                        if (bak.path && event && (event.key === 'Enter' || event.key === ' ')) call(options.onOpenFile, bak.path)
                      },
                    },
                    h(
                      'span',
                      { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', color: 'var(--rdw-tan-ink)', fontWeight: 700 } },
                      `v${bak.revision}`,
                    ),
                    h(
                      'span',
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          color: 'var(--rdw-organic-ink-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      bak.reason || '手动备份',
                    ),
                  ),
                ),
            )
          })(),
        ),

        // 段三：续贯
        h(
          'div',
          {
            style: {
              padding: '7px 10px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: chainIssuesForStage.length
                ? 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))'
                : 'var(--rdw-organic-surface)',
              border: chainIssuesForStage.length
                ? '1px solid color-mix(in srgb,var(--rdw-tan) 34%,transparent)'
                : '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            },
          },
          h(
            'div',
            { style: { ...row, gap: 5 } },
            h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '续贯'),
            h(
              'span',
              { style: { fontSize: 11, color: chainIssuesForStage.length ? 'var(--rdw-tan-ink)' : 'var(--rdw-organic-ink-3)', flex: 1 } },
              chainIssuesForStage.length === 0
                ? `第 ${stageNode.order} 顺位 · 链通`
                : `${chainIssuesForStage.length} 条问题`,
            ),
          ),
          chainIssuesForStage.length === 0
            ? h(
                'div',
                { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.45 } },
                `下游可直接引用 ${stageNode.draft && stageNode.draft.path ? stageNode.draft.path : '本主支成稿'}。`,
              )
            : h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 110, overflowY: 'auto' } },
                ...chainIssuesForStage.slice(0, 8).map((issue, issueIdx) =>
                  h(
                    'div',
                    {
                      key: `issue-${issueIdx}`,
                      style: { display: 'flex', gap: 5, fontSize: 11, lineHeight: 1.45, alignItems: 'baseline' },
                      title: `${issue.code || ''} ${issue.path || ''}\n${issue.message || ''}`,
                    },
                    h(
                      'span',
                      { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontWeight: 700, color: 'var(--rdw-tan-ink)' } },
                      issue.code || '?',
                    ),
                    h(
                      'span',
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          color: 'var(--rdw-organic-ink-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      issue.message || '',
                    ),
                  ),
                ),
              ),
        ),

        // 终稿论文状态 + 汇编入口
        spineInfo && spineInfo.paper
          ? h(
              'div',
              { style: { ...row, gap: 5, padding: '0 2px' } },
              h(
                'span',
                { style: { flex: 1, minWidth: 0, fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                spineInfo.paper.exists
                  ? `终稿已汇编 · ${truncate(formatTimeText(spineInfo.paper.generatedAt), 16)}`
                  : '尚未汇编终稿论文',
              ),
              h(
                'button',
                {
                  type: 'button',
                  disabled: stageBusy || Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0,
                  title:
                    Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0
                      ? '一个成稿都还没有，汇编会被拒绝（SPINE-E106）'
                      : '汇编全部主支成稿为 manuscript/PAPER.md',
                  onClick: () => call(options.onSpineOp, 'paper', null),
                  style: {
                    ...button,
                    height: 22,
                    padding: '0 8px',
                    fontSize: 11,
                    opacity: stageBusy || Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0 ? 0.5 : 1,
                  },
                },
                '📄 汇编终稿',
              ),
            )
          : null,
      )
    : null

  const rightPane = h(
    'div',
    {
      style: {
        margin: 0,
        padding: '12px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        minHeight: 0,
        /* 右栏同样是底板。唯一保留强色的是里面「需要你拍板」
         * 那张卡——那才是真要你看的东西。 */
        background: 'var(--rdw-side-surface)',
        backgroundImage: 'var(--rdw-organic-grain)',
        border: '1px solid var(--rdw-side-line)',
        borderRadius: 'var(--rdw-r-blob)',
      },
    },
    // 右栏标题（衬线）
    h(
      'div',
      { style: { padding: '0 4px' } },
      h(
        'div',
        {
          style: {
            fontFamily: 'var(--rdw-font-serif)',
            fontSize: 16.5,
            fontWeight: 600,
            letterSpacing: '-.01em',
            color: 'var(--rdw-organic-ink)',
          },
        },
        '结果面板',
      ),
      h(
        'div',
        { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', marginTop: 1 } },
        '产物预览与合并',
      ),
    ),
    // 产物列表小标题
    h(
      'div',
      {
        style: {
          padding: '2px 6px 0',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '.3px',
          textTransform: 'uppercase',
          color: 'var(--rdw-organic-ink-3)',
        },
      },
      '📁 本任务产物',
    ),
    // v2.1 主支成稿（成稿 / 备份 / 续贯三段）—— 旧项目 stageId 为 null 时整块不渲染
    stagePane,
    // 产物条目
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
      ...artifactList.map((file, fIdx) =>
        h(
          'div',
          {
            key: `art-${fIdx}`,
            className: 'rdw-organic-card',
            style: {
              padding: '7px 10px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: 'var(--rdw-organic-surface)',
              border: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              cursor: 'pointer',
              boxShadow: 'var(--rdw-shadow-organic-1)',
            },
            onClick: () => call(options.onOpenFile, file.title),
            onContextMenu: (event) => emitContextMenu(options, event, { kind: 'artifact', file, rib: activeRib }),
          },
          h(
            'div',
            { style: { ...row, gap: 6 } },
            h(
              'span',
              {
                style: {
                  fontFamily: 'var(--rdw-font-mono)',
                  fontSize: 12,
                  color: 'var(--rdw-tan-ink)',
                  fontWeight: 700,
                  flex: '0 0 auto',
                },
              },
              file.icon,
            ),
            h(
              'span',
              {
                style: {
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--rdw-organic-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              },
              file.title,
            ),
          ),
          h(
            'div',
            { style: { fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', paddingLeft: 22 } },
            file.desc,
          ),
        ),
      ),
    ),
    // v3.8 · 本分支的文献（Zotero 接入：搜索挂载 + 合集导入）
    zoteroPane,    // 整合：需要你拍板或处理
    attention.length > 0
      ? h(
          'div',
          {
            style: {
              padding: '7px 10px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))',
              border: '1px solid color-mix(in srgb,var(--rdw-tan) 32%,transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            },
          },
          h(
            'div',
            { style: { ...row, gap: 5 } },
            h('span', { style: { fontSize: 12.5 } }, '⚡'),
            h(
              'strong',
              { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--rdw-tan-ink)', letterSpacing: '.2px' } },
              '需要你拍板或处理',
            ),
          ),
          ...attention.slice(0, 4).map((item, aIdx) => {
            const msg =
              item.message ||
              item.text ||
              item.reason ||
              item.title ||
              (item.kind === 'decision'
                ? item.stream ? `${item.stream} 等待拍板` : '有一项交接等待拍板'
                : '上游版本变更，下游结果可能已过期')
            return h(
              'div',
              {
                key: `att-${aIdx}`,
                style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, lineHeight: 1.5 },
              },
              h(
                'span',
                {
                  style: {
                    flex: '0 0 auto',
                    padding: '1px 6px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: item.kind === 'stale' ? 'var(--rdw-st-rejected)' : 'var(--rdw-tan-ink)',
                    background:
                      item.kind === 'stale'
                        ? 'color-mix(in srgb,var(--rdw-st-rejected) 13%,transparent)'
                        : 'color-mix(in srgb,var(--rdw-tan) 22%,transparent)',
                  },
                },
                item.kind === 'stale' ? '过期' : '待定',
              ),
              h(
                'span',
                {
                  style: {
                    color: 'var(--rdw-organic-ink-2)',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  title: msg,
                },
                msg,
              ),
            )
          }),
        )
      : null,
    // 阶段里程碑 / 交付物沉淀（展示主支已锁定的科学证据资产）
    (() => {
      const milestoneList =
        Array.isArray(markers) && markers.length > 0
          ? markers
          : spine
              .filter((m) => pctOf(m) === 100 || m.status === 'ACCEPTED')
              .map((m) => ({ stream: `${m.name} · 已验收`, version: 1 }))
      if (milestoneList.length === 0) return null
      return h(
        'div',
        {
          style: {
            padding: '7px 10px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            background: 'var(--rdw-fill-quat)',
            border: '1px solid var(--rdw-warm-line-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          },
        },
        h(
          'div',
          { style: { ...row, gap: 5 } },
          h('span', { style: { fontSize: 12 } }, '🏁'),
          h(
            'strong',
            { style: { fontSize: 12, fontWeight: 700, color: 'var(--rdw-organic-ink)', letterSpacing: '.2px' } },
            '主支里程碑沉淀',
          ),
        ),
        ...milestoneList.slice(0, 3).map((ms, mIdx) =>
          h(
            'div',
            {
              key: `ms-${mIdx}`,
              onContextMenu: (event) => emitContextMenu(options, event, { kind: 'marker', marker: ms }),
              style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--rdw-organic-ink-2)', cursor: 'context-menu' },
            },
            h('span', { style: { color: 'var(--rdw-sys-green)', fontWeight: 700 } }, '✓'),
            h(
              'span',
              {
                style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                title: ms.stream || ms.name || '阶段成果',
              },
              ms.stream || ms.name || '阶段成果',
            ),
            ms.version
              ? h(
                  'span',
                  {
                    style: {
                      fontFamily: 'var(--rdw-font-mono)',
                      fontSize: 11,
                      color: 'var(--rdw-organic-ink-3)',
                      flex: '0 0 auto',
                    },
                  },
                  `v${ms.version}`,
                )
              : null,
          ),
        ),
      )
    })(),
    // 合并状态（底部固定区）
    h(
      'div',
      {
        style: {
          marginTop: 'auto',
          paddingTop: 9,
          borderTop: '1px solid var(--rdw-warm-line-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '.3px',
            textTransform: 'uppercase',
            color: 'var(--rdw-organic-ink-3)',
          },
        },
        '合并状态',
      ),
      h(
        'div',
        { style: { ...row, gap: 6 } },
        h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 9px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--rdw-tan-ink)',
              background: 'color-mix(in srgb,var(--rdw-tan) 20%,transparent)',
              border: '1px solid color-mix(in srgb,var(--rdw-tan) 40%,transparent)',
            },
          },
          h('span', {
            style: {
              width: 5,
              height: 5,
              borderRadius: 'var(--rdw-r-dot)',
              background: 'var(--rdw-tan-ink)',
            },
          }),
          '等待人工确认',
        ),
      ),
      h(
        'div',
        { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.55 } },
        '确认后选择需要回连主线的成果。',
      ),
      // 底部主操作按钮（石褐色实底 + 有机圆角 + 土色阴影）
      h(
        'button',
        {
          type: 'button',
          className: 'rdw-organic-btn',
          style: {
            width: '100%',
            marginTop: 5,
            padding: '9px 0',
            borderRadius: 'var(--rdw-r-pebble)',
            border: 'none',
            background: 'var(--rdw-soil)',
            color: '#faf6f1',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: 'var(--rdw-shadow-organic-2)',
            letterSpacing: '.01em',
          },
          disabled: Boolean(options.busy),
          title: '审阅并确认成果，回连合并至主线',
          onClick: () => call(options.onGraft, activeRib.id),
        },
        '审核与合并设计',
      ),
    ),
  )

  /* 三栏舞台内容：外壳 .rdw-stage 已是 CSS Grid 容器（左/中/右三列），
   * 这里直接返回三个 pane，不再自建网格——避免嵌套两层网格导致栏宽失配。 */
  const stageChildren = [leftPane, middlePane, rightPane]
  // v3.5 快捷键与焦点：舞台本身可聚焦（tabIndex=0），键盘事件在这里统一捕获
  const stageWrapperProps = {
    className: 'rdw-fishbone-stage',
    tabIndex: 0,
    role: 'application',
    'aria-label': '项目流程工作台（按 ? 查看快捷键）',
    onKeyDown: onStageKeyDown,
    onContextMenu: (event) => {
      // 空白处右键 = 画布菜单（仅当事件没被子元素消费时才走到这里）
      emitContextMenu(options, event, { kind: 'canvas' })
    },
    style: { display: 'contents' },
  }
  if (options.standalone !== true) {
    return h('div', stageWrapperProps, ...stageChildren)
  }

  const gridNode = h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(228px, 258px) minmax(0, 1fr) minmax(218px, 246px)',
        gap: 10,
        alignItems: 'stretch',
        minHeight: 540,
      },
    },
    leftPane,
    middlePane,
    rightPane,
  )
  // standalone 场景也补快捷键包装
  return h(
    'div',
    {
      className: 'rdw-fishbone-stage',
      tabIndex: 0,
      onKeyDown: onStageKeyDown,
      onContextMenu: (event) => emitContextMenu(options, event, { kind: 'canvas' }),
      style: { display: 'contents' },
    },
    gridNode,
  )
}

/**
 * 递归分支树视图（对齐 EvoResearch 递归分支规范）。
 * 支持从主支任务节点到多级子分支的无限深度树形展现与分叉操作。
 */
function renderRecursiveTree(h, spine, ribs, options) {
  const { row, chip, button, primaryButton, muted } = STYLES
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }

  const renderRibNode = (rib, depth = 0) => {
    const theme = ribTheme(rib.status)
    const childRibs = ribs.filter((r) => r.parent === rib.id)
    const indent = depth * 22

    return h(
      'div',
      { key: `rt-node-${rib.id}`, style: { display: 'flex', flexDirection: 'column', gap: 4, marginLeft: indent } },
      h(
        'div',
        {
          className: 'rdw-organic-card',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 10px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            background: 'var(--rdw-organic-surface)',
            border: '1px solid var(--rdw-warm-line-2)',
            borderLeft: `3px solid ${theme.color}`,
            boxShadow: 'var(--rdw-shadow-organic-1)',
          },
        },
        h('span', { style: { fontSize: depth > 0 ? 11 : 13 } }, depth === 0 ? '🌿' : '↳ 🌱'),
        h(
          'span',
          {
            style: {
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--rdw-organic-ink)',
              whiteSpace: 'nowrap',
            },
          },
          rib.name || rib.id,
        ),
        h(
          'span',
          {
            style: {
              padding: '0 6px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              fontSize: 11,
              fontFamily: 'var(--rdw-font-mono)',
              color: 'var(--rdw-organic-ink-3)',
              background: 'color-mix(in srgb,var(--rdw-mist) 42%,transparent)',
              flex: '0 0 auto',
            },
          },
          rib.id,
        ),
        rib.parent
          ? h(
              'span',
              {
                style: {
                  padding: '0 6px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11,
                  color: 'var(--rdw-sage)',
                  background: 'color-mix(in srgb,var(--rdw-sage-tint) 15%,transparent)',
                  flex: '0 0 auto',
                },
              },
              `↳ 父分支: ${rib.parent}`,
            )
          : null,
        h(
          'span',
          {
            style: {
              padding: '1px 7px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              fontSize: 11.5,
              fontWeight: 600,
              color: theme.color,
              background: 'color-mix(in srgb,' + theme.color + ' 12%,transparent)',
              flex: '0 0 auto',
            },
          },
          theme.label,
        ),
        rib.hasSession ? h('span', { style: { fontSize: 12 }, title: '有会话记录' }, '🧠') : null,
        rib.is_stale ? h('span', { style: { fontSize: 12, color: 'var(--rdw-st-rejected)' }, title: '过期' }, '⚠') : null,
        h(
          'div',
          { style: { ...row, gap: 5, marginLeft: 'auto' } },
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                padding: '2px 8px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-input)',
                color: 'var(--rdw-organic-ink-2)',
                fontSize: 12.5,
                cursor: 'pointer',
              },
              title: `以「${rib.name}」为父节点派生新的子分支`,
              onClick: (e) => {
                e.stopPropagation()
                call(options.onSprout, rib.module, rib.id)
              },
            },
            '🌱 分支',
          ),
          rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
            ? h(
                'button',
                {
                  type: 'button',
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid color-mix(in srgb,var(--rdw-sage) 42%,transparent)',
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                    color: 'var(--rdw-sage)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  },
                  title: '审阅满意后把交接结果接回直接父节点',
                  onClick: (e) => {
                    e.stopPropagation()
                    call(options.onGraft, rib.id)
                  },
                },
                '🔗 逐级回连',
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              style: {
                padding: '2px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: 'none',
                background: 'var(--rdw-soil)',
                color: '#faf6f1',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              },
              onClick: () => call(options.onSelectRib, rib),
            },
            '工作区 →',
          ),
        ),
      ),
      ...childRibs.map((child) => renderRibNode(child, depth + 1)),
    )
  }

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' } },
    ...spine.map((mod) => {
      const modRibs = ribs.filter((r) => r.module === mod.id && (!r.parent || !ribs.some((other) => other.id === r.parent)))
      return h(
        'div',
        {
          key: `tree-mod-${mod.id}`,
          style: {
            padding: '10px 12px',
            borderRadius: 'var(--rdw-r-pebble)',
            border: '1px solid var(--rdw-warm-line-2)',
            background: 'var(--rdw-organic-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          },
        },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', gap: 8 } },
          h(
            'div',
            { style: { ...row, gap: 6, minWidth: 0 } },
            h('span', { style: { fontSize: 13 } }, '🌿'),
            h(
              'strong',
              {
                style: {
                  fontFamily: 'var(--rdw-font-serif)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--rdw-organic-ink)',
                  whiteSpace: 'nowrap',
                },
              },
              `${mod.name} (${mod.id})`,
            ),
            h(
              'span',
              {
                style: {
                  padding: '1px 7px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11.5,
                  color: 'var(--rdw-organic-ink-3)',
                  background: 'color-mix(in srgb,var(--rdw-mist) 46%,transparent)',
                  flex: '0 0 auto',
                },
              },
              `${mod.ribs ? mod.ribs.length : modRibs.length} 根分支`,
            ),
            h(
              'span',
              {
                style: {
                  padding: '1px 7px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--rdw-sage)',
                  background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                  flex: '0 0 auto',
                },
              },
              `${pctOf(mod)}% 完成`,
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                padding: '2px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-input)',
                color: 'var(--rdw-organic-ink-2)',
                fontSize: 12.5,
                cursor: 'pointer',
                flex: '0 0 auto',
              },
              title: `在此主支阶段（${mod.name}）下创建新分支`,
              onClick: () => call(options.onSprout, mod.id),
            },
            '➕ 从此阶段新建分支',
          ),
        ),
        modRibs.length > 0
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 6 } }, ...modRibs.map((rib) => renderRibNode(rib, 0)))
          : h(
              'div',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', paddingLeft: 6 } },
              '该主支阶段尚未分出分支。点击右侧「➕ 从此阶段新建分支」开始探索。',
            ),
      )
    }),
  )
}

/**
 * 分支清单表格渲染函数。
 */
function renderRibsTable(h, visibleRibs, spine, options) {
  const { chip, button } = STYLES
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  const busy = typeof options.busy === 'string' ? options.busy : ''

  return h(
    'div',
    { style: { ...STYLES.tableWrap } },
    h(
      'table',
      { style: STYLES.table },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', { style: STYLES.th }, '分支'),
          h('th', { style: STYLES.th }, '所属主支'),
          h('th', { style: STYLES.th }, '状态'),
          h('th', { style: STYLES.th }, '产出'),
          h('th', { style: STYLES.th }, '最近活动'),
          h('th', { style: STYLES.th }, ''),
        ),
      ),
      h(
        'tbody',
        null,
        ...visibleRibs
          .slice()
          .sort((left, right) => {
            const leftRank = RIB_RANK[left.status] ?? 9
            const rightRank = RIB_RANK[right.status] ?? 9
            if (leftRank !== rightRank) return leftRank - rightRank
            return String(left.name) < String(right.name) ? -1 : 1
          })
          .map((rib) => {
            const theme = ribTheme(rib.status)
            const node = spine.find((item) => item.id === rib.module)
            const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
            return h(
              'tr',
              {
                key: `row-${rib.id}`,
                onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: node }),
                style: { cursor: 'context-menu' },
              },
              h(
                'td',
                { style: STYLES.td },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { color: theme.color, fontSize: 12 } }, theme.dot),
                  h('span', { style: { fontWeight: 600, color: 'var(--rdw-text)' } }, rib.name),
                  rib.parent ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-sage)' } }, `↳ 父分支: `) : null,
                  rib.hasSession ? h('span', { style: { fontSize: 12 }, title: '有会话记录' }, '🧠') : null,
                  rib.is_stale ? h('span', { style: { fontSize: 12, color: 'var(--rdw-st-rejected)' }, title: '过期' }, '⚠') : null,
                ),
                rib.brief ? h('div', { style: { ...STYLES.muted, marginTop: 2 } }, truncate(rib.brief, 72)) : null,
              ),
              h('td', { style: STYLES.td }, node ? node.name : rib.module),
              h(
                'td',
                { style: STYLES.td },
                h(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: theme.color,
                      background: 'color-mix(in srgb,' + theme.color + ' 12%,transparent)',
                      border: '1px solid color-mix(in srgb,' + theme.color + ' 26%,transparent)',
                      whiteSpace: 'nowrap',
                    },
                  },
                  theme.label,
                ),
              ),
              h('td', { style: { ...STYLES.td, fontVariantNumeric: 'tabular-nums' } }, `${fileCount} 个文件`),
              h('td', { style: { ...STYLES.td, fontVariantNumeric: 'tabular-nums' } }, rib.lastActivityAt ? formatTimeText(rib.lastActivityAt) : '—'),
              h(
                'td',
                { style: { ...STYLES.td, textAlign: 'right', whiteSpace: 'nowrap' } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'rdw-organic-btn',
                    style: {
                      padding: '3px 9px',
                      marginRight: 5,
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      border: '1px solid var(--rdw-warm-line)',
                      background: 'var(--rdw-organic-input)',
                      color: 'var(--rdw-organic-ink-2)',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    },
                    title: `以「${rib.name}」为父节点派生新的子探索分支`,
                    onClick: () => call(options.onSprout, rib.module, rib.id),
                  },
                  '🌱 分支',
                ),
                rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
                  ? h('button', {
                      type: 'button',
                      style: {
                        padding: '3px 9px',
                        marginRight: 5,
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        border: '1px solid color-mix(in srgb,var(--rdw-sage) 44%,transparent)',
                        background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                        color: 'var(--rdw-sage)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      },
                      disabled: Boolean(busy),
                      title: '审阅后把该分支的交接结果接回主支',
                      onClick: () => call(options.onGraft, rib.id),
                    }, '回连')
                  : null,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'rdw-organic-btn',
                    style: {
                      padding: '3px 9px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      border: '1px solid var(--rdw-warm-line)',
                      background: 'var(--rdw-organic-input)',
                      color: 'var(--rdw-organic-ink-2)',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    },
                    onClick: () => call(options.onSelectRib, rib),
                  },
                  '打开分支',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'rdw-organic-btn',
                    style: {
                      padding: '3px 7px',
                      marginLeft: 5,
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      border: '1px solid color-mix(in srgb,var(--rdw-st-rejected) 24%,transparent)',
                      background: 'transparent',
                      color: 'var(--rdw-st-rejected)',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      opacity: 0.8,
                    },
                    title: `删除分支「${rib.name}」到回收站`,
                    onClick: (e) => {
                      if (e && e.stopPropagation) e.stopPropagation()
                      call(options.onDeleteRib, rib)
                    },
                  },
                  '🗑',
                ),
              ),
            )
          }),
      ),
    ),
  )
}

/**
 * 渲染项目流程主线视图。
 * @param {object} h React.createElement
 * @param {{fishbone?: object|null, loading?: boolean, error?: string,
 *          selectedModule?: string|null, selectedRib?: string|null,
 *          onSelectModule?: Function, onSelectRib?: Function,
 *          onRefresh?: Function, onSprout?: Function, onAuto?: Function,
 *          onGraft?: Function, busy?: string}} props
 */
export function renderFishboneView(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { card, row, chip, muted, button, primaryButton, sectionTitle, mutedBox } = STYLES
  const fishbone = options.fishbone && options.fishbone.ok !== false ? options.fishbone : null
  const loading = Boolean(options.loading)
  const error = typeof options.error === 'string' ? options.error : ''
  const busy = typeof options.busy === 'string' ? options.busy : ''
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }

  if (!fishbone) {
    if (error) {
      return h(
        'div',
        { style: card },
        h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, '项目流程主线读取失败'),
        h('div', { style: { ...muted, marginBottom: 8 } }, error),
        h('button', { type: 'button', style: primaryButton, disabled: loading, onClick: () => call(options.onRefresh) }, '重试'),
      )
    }
    return h('div', { style: { ...muted, padding: '16px 0' } }, loading ? '正在读取项目主线…' : '还没有项目数据')
  }

  const head = fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
  const spine = orderSpine(fishbone.spine, head.phase)
  const ribs = Array.isArray(fishbone.ribs) ? fishbone.ribs : []
  const attention = Array.isArray(fishbone.attention) ? fishbone.attention : []
  const markers = Array.isArray(fishbone.markers) ? fishbone.markers : []
  const totals = fishbone.totals && typeof fishbone.totals === 'object' ? fishbone.totals : {}
  const nextSteps = Array.isArray(head.nextSteps) ? head.nextSteps : []
  const blockers = Array.isArray(head.blockers) ? head.blockers : []
  const cliErrors = Array.isArray(fishbone.cliErrors) ? fishbone.cliErrors : []

  const selModule = options.selectedModule || null
  const selRib = options.selectedRib || null
  const displayMode = options.displayMode || 'canvas'
  const visibleRibs = selModule ? ribs.filter((rib) => rib.module === selModule) : ribs

  const ctx = { head, spine, ribs, totals, nextSteps, blockers, attention, markers, visibleRibs, selModule, selRib, displayMode, options, busy, cliErrors, muted, row }

  /* v4 三栏舞台模式：只输出三栏（由外壳的 .rdw-stage 网格承载），
   * 全景与分支表通过 renderFishboneDrawer 单独渲染到底部抽屉里。 */
  if (options.mode === 'stage') {
    return renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps, blockers, attention, markers })
  }

  /* v4 抽屉模式：只输出全景骨架 + 分支清单表。 */
  if (options.mode === 'drawer') {
    return h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
      h(
        'div',
        {
          className: 'rdw-panorama',
          style: { cursor: 'grab' },
        },
        renderFishSvg(h, spine, ribs, totals, {
          ...options,
          projectTitle: head.title,
          projectGoal: head.goal,
          selectedModule: selModule,
          selectedRib: selRib,
          compact: true,
        }),
      ),
      visibleRibs.length > 0 ? renderRibsTable(h, visibleRibs, spine, options) : null,
      cliErrors.length > 0
        ? h('div', { style: { ...muted, fontSize: 12.5, padding: '4px 0' } }, `部分数据读取失败：${cliErrors.join('；')}`)
        : null,
    )
  }

  /* 兼容模式（单页纵向堆叠）：旧宿主或非 stage 场景下的完整项目流程页。 */
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
    /* --------------------------------------------- EvoResearch 三栏科研工作台（用户指定布局） */
    renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps, blockers, attention, markers }),

    /* --------------------------------------------- 分支清单与全景骨架（紧凑整合面板） */
    h(
      'div',
      {
        style: {
          margin: 0,
          padding: '12px 14px',
          background: 'var(--rdw-organic-bg)',
          backgroundImage: 'var(--rdw-organic-grain)',
          border: '1px solid var(--rdw-warm-line-2)',
          borderRadius: 'var(--rdw-r-blob)',
        },
      },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 10, gap: 8 } },
        h(
          'div',
          { style: { ...row, gap: 7, minWidth: 0 } },
          h('span', { style: { fontSize: 12 } }, '📋'),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--rdw-font-serif)',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-.01em',
                color: 'var(--rdw-organic-ink)',
                whiteSpace: 'nowrap',
              },
            },
            '分支清单与全景骨架',
          ),
          h(
            'span',
            {
              style: {
                padding: '2px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--rdw-sage)',
                background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 34%,transparent)',
                flex: '0 0 auto',
              },
            },
            `${ribs.length} 根 · Ishikawa 全景`,
          ),
        ),
        h(
          'div',
          { style: { ...row, gap: 6, flex: '0 0 auto' } },
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                padding: '5px 12px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-input)',
                color: 'var(--rdw-organic-ink-2)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
              },
              disabled: Boolean(busy),
              onClick: () => call(options.onAuto),
            },
            '自动回连',
          ),
          h(
            'button',
            {
              type: 'button',
              style: {
                padding: '5px 13px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: 'none',
                background: 'var(--rdw-soil)',
                color: '#faf6f1',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--rdw-shadow-organic-1)',
              },
              disabled: Boolean(busy),
              onClick: () => call(options.onSprout),
            },
            '🌱 新建一个分支',
          ),
        ),
      ),
      h(
        'div',
        {
          className: 'rdw-organic-scroll',
          style: {
            overflowX: 'auto',
            paddingBottom: 6,
            marginBottom: 10,
            borderRadius: 'var(--rdw-r-pebble)',
            background: 'color-mix(in srgb,var(--rdw-mist) 22%,var(--rdw-organic-surface))',
            border: '1px solid var(--rdw-warm-line-2)',
          },
        },
        renderFishSvg(h, spine, ribs, totals, {
          ...options,
          projectTitle: head.title,
          projectGoal: head.goal,
          selectedModule: selModule,
          selectedRib: selRib,
        }),
      ),
      visibleRibs.length > 0 ? renderRibsTable(h, visibleRibs, spine, options) : null,
    ),

    cliErrors.length > 0
      ? h('div', { style: { ...muted, fontSize: 12.5, padding: '4px 0' } }, `部分数据读取失败：${cliErrors.join('；')}`)
      : null,
  )
}
