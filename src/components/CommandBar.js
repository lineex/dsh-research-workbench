/**
 * 研究项目 DAG 工作台 — 命令栏（v4 单页信息架构）。
 *
 * 取代 v3 的「标题行 + 6 个平级页签」。设计动因：
 *   - 6 个平级页签把「高频导航（项目流程）」与「低频管理（工程/网络）」放在同一层，
 *     用户每切一次都要重建心理地图；
 *   - 页签一旦切换，当前上下文（我看的是哪根分支？）就丢失了。
 *
 * 新结构（从左到右）：
 *   1. 品牌标（不占页签位）；
 *   2. **面包屑**：项目 › 当前主支 › 当前分支——始终显示"我在哪"，
 *      而且每个层级都可点击回跳（比页签更省一次操作）；
 *   3. **全局搜索 / 命令入口**（⌘K）：跳转项目、分支、文件，或执行命令；
 *   4. **状态指示器**：阻塞 / 待拍板 / 进度——点击直达对应区域，
 *      把「需要我处理的事」从隐性变成常驻可点；
 *   5. **面板入口**：低频管理（主智能体/内容/网络/工程/概览）收进侧滑面板。
 */
/**
 * @param {object} h React.createElement
 * @param {{project?: object, fishbone?: object, selectedModule?: string|null,
 *          selectedRib?: string|null, attention?: any[], totals?: object,
 *          busy?: string, onOpenPalette?: Function, onOpenSlide?: Function,
 *          onFocusAttn?: Function, onSelectModule?: Function,
 *          onSelectRib?: Function, onBackToHub?: Function}} props
 */
export function renderCommandBar(h, props) {
  const o = props && typeof props === 'object' ? props : {}
  const call = (fn, ...args) => {
    if (typeof fn === 'function') fn(...args)
  }

  const project = o.project && typeof o.project === 'object' ? o.project : null
  const fishbone = o.fishbone && o.fishbone.ok !== false ? o.fishbone : null
  const head = fishbone && fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
  const spine = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
  const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
  const attention = Array.isArray(o.attention) ? o.attention : Array.isArray(fishbone && fishbone.attention) ? fishbone.attention : []
  const totals = fishbone && fishbone.totals && typeof fishbone.totals === 'object' ? fishbone.totals : {}

  const selectedModule = o.selectedModule || null
  const selectedRib = o.selectedRib || null
  const modNode = selectedModule ? spine.find((m) => m.id === selectedModule) : null
  const ribNode = selectedRib ? ribs.find((r) => r.id === selectedRib) : null

  // 阻塞数：主支节点 staleness / rib BLOCKED 状态都算
  const blockedCount = ribs.filter((r) => r.status === 'BLOCKED').length + spine.filter((m) => m.staleness).length
  const staleCount = ribs.filter((r) => r.is_stale).length
  const attnCount = attention.length + staleCount

  // 整体进度：主支完成度均值
  const pct = spine.length > 0
    ? Math.round(spine.reduce((sum, m) => sum + (Number(m.completion) || 0), 0) / spine.length)
    : 0

  const crumb = (icon, label, opts) => {
    const options = opts && typeof opts === 'object' ? opts : {}
    return h(
      'button',
      {
        type: 'button',
        className: options.cur ? 'rdw-crumb cur' : 'rdw-crumb',
        title: options.title || label,
        onClick: () => call(options.onClick),
      },
      icon ? h('span', { 'aria-hidden': 'true' }, icon) : null,
      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, label),
    )
  }

  const sep = (k) => h('span', { key: k, className: 'rdw-crumb-sep', 'aria-hidden': 'true' }, '›')

  const crumbs = []
  if (project && project.id) {
    crumbs.push(crumb('🗂️', project.id, { title: `返回总控看板（当前项目 ${project.id}）`, onClick: () => call(o.onBackToHub) }))
  }
  if (modNode) {
    crumbs.push(sep('s1'))
    crumbs.push(
      crumb('🌿', modNode.name, {
        cur: !ribNode,
        title: `${modNode.id} ${modNode.name} · ${modNode.completion || 0}% 已回连`,
        onClick: () => call(o.onSelectModule, modNode.id),
      }),
    )
  }
  if (ribNode) {
    crumbs.push(sep('s2'))
    crumbs.push(
      crumb('🌱', ribNode.name, {
        cur: true,
        title: `${ribNode.id} ${ribNode.name}`,
        onClick: () => call(o.onSelectRib, ribNode),
      }),
    )
  }

  return h(
    'div',
    { className: 'rdw-cmdbar', 'data-dsh-no-drag': '' },
    // 品牌（标题恒为「研究项目工作台」，项目名由面包屑承担，避免两处重复）
    h(
      'div',
      { className: 'rdw-cmd-brand' },
      h('span', { className: 'rdw-cmd-mark', 'aria-hidden': 'true' }, '📋'),
      h(
        'span',
        { className: 'rdw-cmd-name', title: head.title ? `当前研究：${head.title}` : '研究项目工作台' },
        '研究项目工作台',
      ),
    ),
    // 面包屑
    crumbs.length > 0 ? h('div', { className: 'rdw-crumbs' }, ...crumbs) : null,
    // 全局搜索 / 命令
    h(
      'button',
      {
        type: 'button',
        className: 'rdw-search',
        title: '跳转到项目、分支、文件，或执行命令（Ctrl/⌘ + K）',
        onClick: () => call(o.onOpenPalette),
      },
      h('span', { style: { fontSize: 11 }, 'aria-hidden': 'true' }, '🔍'),
      h('span', { style: { flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '跳转项目 / 分支 / 文件…'),
      h('span', { className: 'rdw-kbd' }, '⌘K'),
    ),
    // 状态指示器
    h(
      'div',
      { className: 'rdw-status' },
      blockedCount > 0
        ? h(
            'button',
            {
              type: 'button',
              className: 'rdw-pill blk',
              title: `${blockedCount} 项阻塞：点击查看主智能体与阻塞明细`,
              onClick: () => call(o.onOpenSlide, 'agent'),
            },
            h('span', { 'aria-hidden': 'true' }, '⊘'),
            h('span', null, '阻塞'),
            h('span', { className: 'num' }, String(blockedCount)),
          )
        : null,
      attnCount > 0
        ? h(
            'button',
            {
              type: 'button',
              className: 'rdw-pill warn',
              title: `${attnCount} 项需要你拍板或处理：点击定位`,
              onClick: () => call(o.onFocusAttn),
            },
            h('span', { 'aria-hidden': 'true' }, '⚡'),
            h('span', null, '待拍板'),
            h('span', { className: 'num' }, String(attnCount)),
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          className: 'rdw-pill ok',
          title: `整体进度 ${pct}%（主支完成度均值）：点击查看概览`,
          onClick: () => call(o.onOpenSlide, 'overview'),
        },
        h('span', { 'aria-hidden': 'true' }, '✓'),
        h('span', { className: 'num' }, `${pct}%`),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'rdw-pill ghost',
          title: '打开管理面板（主智能体 / 内容 / 网络 / 工程 / 概览）',
          onClick: () => call(o.onOpenSlide, 'agent'),
        },
        '🧠 主智能体',
      ),
      h('span', { className: 'rdw-avatar-me', title: '你是这个项目的主研究者（PI）' }, 'PI'),
    ),
  )
}

/** 标题过长时截断，避免挤掉面包屑与搜索框。 */
function truncateHead(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  if (value.length <= 14) return value
  return `${value.slice(0, 13)}…`
}
