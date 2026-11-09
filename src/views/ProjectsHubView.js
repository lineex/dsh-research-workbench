/**
 * 研究项目 DAG 工作台 — 多项目总控看板（Projects Hub View）。
 *
 * 作者：lineex (https://github.com/lineex)
 * 参考项目：https://github.com/OliverLiy/projectHub
 *
 * 核心设计语言（对齐 projectHub）：
 *   - 左侧分类导航轨（Left Rail）：智能视图（全部、推进中、需拍板、阻塞、已收束）+ 阶段过滤树 + 快捷动作区；
 *   - 中间主舞台（Main Stage）：顶部大号数字 KPI 指标卡 + 搜索筛选栏 + 项目卡片墙（带 3.5px 状态条、悬停浮起）；
 *   - 数据洞察区（Data Viz）：纯 SVG 状态环形分布图（Donut Chart）+ 各课题推进度横向对比条；
 *   - 跨项目数据互通网络（Cross-Project Sharing）：汇聚各课题的已回连产物（ACCEPTED Handoffs）、队列定义与想法（Ideas）。
 */
import { STYLES, PHASES, phaseLabel, truncateText, formatTimeText, WELCOME_COPY } from '../core/constants.js'
import { renderDonutChart, renderModuleProgressBars } from '../components/Charts.js'

export function renderProjectsHubView(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { card, row, chip, muted, button, primaryButton, dangerButton, input, sectionTitle } = STYLES
  const projects = Array.isArray(options.projects) ? options.projects : []
  const trashProjects = Array.isArray(options.trashProjects) ? options.trashProjects : []
  const activeRoot = typeof options.activeProjectRoot === 'string' ? options.activeProjectRoot : ''
  const busy = Boolean(options.busy)
  const searchQuery = typeof options.searchQuery === 'string' ? options.searchQuery : ''
  const phaseFilter = typeof options.phaseFilter === 'string' ? options.phaseFilter : 'all'
  const sharedItems = Array.isArray(options.sharedItems) ? options.sharedItems : []
  const categoryFilter = typeof options.categoryFilter === 'string' ? options.categoryFilter : 'all'
  const isTrashView = categoryFilter === 'trash'

  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }

  // 计算各状态数量
  const inProgressCount = projects.filter((p) => (Number(p.completion) || 0) > 0 && (Number(p.completion) || 0) < 100).length
  const attentionCount = projects.filter((p) => (Number(p.attentionCount) || 0) > 0).length
  const completedCount = projects.filter((p) => (Number(p.completion) || 0) === 100).length

  // 过滤项目列表（若当前在回收站视图，则源为 trashProjects）
  const sourceProjects = isTrashView ? trashProjects : projects
  const filteredProjects = sourceProjects.filter((p) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch = !q ||
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.id || '').toLowerCase().includes(q) ||
      String(p.root || '').toLowerCase().includes(q) ||
      String(p.goal || '').toLowerCase().includes(q)
    if (isTrashView) return matchesSearch
    const matchesPhase = phaseFilter === 'all' || p.phase === phaseFilter
    let matchesCategory = true
    if (categoryFilter === 'progress') matchesCategory = (Number(p.completion) || 0) > 0 && (Number(p.completion) || 0) < 100
    else if (categoryFilter === 'attention') matchesCategory = (Number(p.attentionCount) || 0) > 0
    else if (categoryFilter === 'completed') matchesCategory = (Number(p.completion) || 0) === 100
    return matchesSearch && matchesPhase && matchesCategory
  })

  // 跨项目全局汇总
  const totalProjects = projects.length
  const totalRibs = projects.reduce((sum, p) => sum + (Number(p.ribsCount) || 0), 0)
  const totalAccepted = projects.reduce((sum, p) => sum + (Number(p.acceptedCount) || 0), 0)
  const totalAttention = projects.reduce((sum, p) => sum + (Number(p.attentionCount) || 0), 0)
  const totalModules = projects.reduce((sum, p) => sum + (Number(p.modulesCount) || 6), 0)

  // 顶部全局 KPI 卡片（对齐 projectHub 的 4 大核心指标卡）
  const globalKpis = [
    { label: '登记课题', value: totalProjects, icon: '📁', color: 'var(--rdw-accent)', sub: '多项目并行总览' },
    { label: '主支总阶段', value: totalModules, icon: '🌿', color: 'var(--rdw-accent-dark)', sub: '关键推进节点' },
    { label: '活跃分支', value: totalRibs, icon: '🌱', color: 'var(--rdw-text)', sub: '探索分支智能体' },
    { label: '已沉淀成果', value: totalAccepted, icon: '✅', color: 'var(--rdw-st-accepted)', sub: '已汇合交付产物' },
    { label: '需拍板事项', value: totalAttention, icon: '⚡', color: totalAttention > 0 ? 'var(--rdw-warn)' : 'var(--rdw-text-3)', sub: '待决策/风险信号' },
  ]

  // 智能视图分类列表
  const categoryViews = [
    { id: 'all', label: '全部项目', count: totalProjects, icon: '📁' },
    { id: 'progress', label: '推进中', count: inProgressCount, icon: '🟢', color: 'var(--rdw-st-accepted)' },
    { id: 'attention', label: '需拍板 / 关注', count: attentionCount, icon: '⚡', color: 'var(--rdw-warn)' },
    { id: 'completed', label: '已完成收束', count: completedCount, icon: '🏁', color: 'var(--rdw-st-superseded)' },
    { id: 'trash', label: '回收站', count: trashProjects.length, icon: '🗑️', color: 'var(--rdw-text-3)' },
  ]

  /* ------------------------------------------------ 左侧导航轨（Left Rail） */
  const leftRail = h(
    'aside',
    {
      style: {
        flex: '0 0 210px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      },
    },
    // 视图分组卡片
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        },
      },
      h('div', { style: { ...sectionTitle, fontSize: 11, color: 'var(--rdw-text-3)', paddingLeft: 4, marginBottom: 4 } }, '智能视图'),
      ...categoryViews.map((cat) => {
        const active = categoryFilter === cat.id
        return h(
          'button',
          {
            key: cat.id,
            type: 'button',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 'var(--rdw-r-sm)',
              border: active ? '1px solid color-mix(in srgb,var(--rdw-accent) 26%,transparent)' : '1px solid transparent',
              background: active ? 'var(--rdw-accent-soft)' : 'transparent',
              color: active ? 'var(--rdw-accent)' : 'var(--rdw-text-2)',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all .15s ease',
            },
            onClick: () => call(options.onCategoryFilterChange, cat.id),
          },
          h('span', { style: { fontSize: 12 } }, cat.icon),
          h('span', { style: { flex: '1 1 auto' } }, cat.label),
          h(
            'span',
            {
              style: {
                fontSize: 12.5,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: active ? 'var(--rdw-accent)' : 'var(--rdw-text-4)',
              },
            },
            String(cat.count),
          ),
        )
      }),
    ),
    // 阶段过滤卡片
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        },
      },
      h('div', { style: { ...sectionTitle, fontSize: 11, color: 'var(--rdw-text-3)', paddingLeft: 2, marginBottom: 2 } }, '研究阶段'),
      h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 4,
          },
        },
        h(
          'button',
          {
            type: 'button',
            style: {
              gridColumn: 'span 2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              borderRadius: 'var(--rdw-r-sm)',
              border: 'none',
              background: phaseFilter === 'all' ? 'var(--rdw-sunken-2)' : 'transparent',
              color: phaseFilter === 'all' ? 'var(--rdw-text)' : 'var(--rdw-text-3)',
              fontSize: 11,
              fontWeight: phaseFilter === 'all' ? 600 : 400,
              cursor: 'pointer',
            },
            onClick: () => call(options.onPhaseFilterChange, 'all'),
          },
          h('span', null, '全部阶段'),
          h('span', { style: { fontSize: 12 } }, String(projects.length)),
        ),
        ...PHASES.map(([key, label]) => {
          const count = projects.filter((p) => p.phase === key).length
          const active = phaseFilter === key
          return h(
            'button',
            {
              key,
              type: 'button',
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: 'var(--rdw-r-sm)',
                border: 'none',
                background: active ? 'var(--rdw-accent-soft)' : 'transparent',
                color: active ? 'var(--rdw-accent)' : count > 0 ? 'var(--rdw-text-2)' : 'var(--rdw-text-4)',
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
              },
              onClick: () => call(options.onPhaseFilterChange, key),
            },
            h('span', null, label),
            h('span', { style: { fontSize: 11.5, fontVariantNumeric: 'tabular-nums', opacity: count > 0 ? 1 : 0.4 } }, String(count)),
          )
        }),
      ),
    ),
    // 快捷管理底座
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        },
      },
      h('button', { type: 'button', style: primaryButton, disabled: busy, onClick: () => call(options.onCreateProject) }, '➕ 新建课题'),
      h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onImportProject) }, '📁 导入已有'),
      h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onLoadExample) }, '⚡ 示例项目'),
      h(
        'button',
        {
          type: 'button',
          style: {
            ...button,
            color: 'var(--rdw-accent)',
            borderColor: 'color-mix(in srgb,var(--rdw-accent) 28%,transparent)',
            background: 'var(--rdw-accent-soft)',
            fontWeight: 500,
          },
          disabled: busy,
          title: '记录一条跨课题科研想法（写入项目网络，各课题实时共享）',
          onClick: () => call(options.onIdea),
        },
        '记想法',
      ),
    ),
  )

  /* ------------------------------------------------ 右侧主舞台（Main Stage） */
  const mainStage = h(
    'div',
    {
      style: {
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      },
    },
    // 1. 顶部 Hero Banner 展板
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, color-mix(in srgb,var(--rdw-accent) 8%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)',
          borderLeft: '4px solid var(--rdw-accent)',
          padding: '16px 18px',
        },
      },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
        h(
          'div',
          { style: { flex: '1 1 auto', minWidth: 0 } },
          h(
            'div',
            { style: { ...row, gap: 8, marginBottom: 5 } },
            h('span', { style: { fontSize: 16 } }, '🗂️'),
            h('h2', { style: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--rdw-text)' } }, '研究项目总控看板'),
            h(
              'a',
              {
                href: 'https://github.com/lineex',
                target: '_blank',
                rel: 'noreferrer',
                title: '作者 GitHub: @lineex',
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 20,
                  padding: '0 8px',
                  borderRadius: 'var(--rdw-r-pill)',
                  background: 'var(--rdw-sunken)',
                  border: '1px solid var(--rdw-line-2)',
                  color: 'var(--rdw-text-3)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  textDecoration: 'none',
                },
              },
              h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, 'by'),
              h('span', { style: { color: 'var(--rdw-text)', fontWeight: 600 } }, '@lineex'),
            ),
          ),
          h(
            'div',
            { style: { fontSize: 11.5, color: 'var(--rdw-text-2)', lineHeight: 1.6 } },
            '集中管理所有并行课题：点击卡片直接进入专属工作台（项目流程主线、智能体工作区、内容交接、工程底座），各课题之间分析模型与交接成果实时共享互通。',
          ),
        ),
      ),
    ),

    // 2. 全局 KPI 指标行
    h(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        },
      },
      ...globalKpis.map((kpi) =>
        h(
          'div',
          {
            key: kpi.label,
            className: 'rdw-card-hover',
            style: {
              ...card,
              margin: 0,
              position: 'relative',
              overflow: 'hidden',
              padding: '11px 13px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            },
          },
          h('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 3,
              background: kpi.color,
            },
          }),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--rdw-text-3)' } },
            h('span', null, kpi.label),
            h('span', { style: { fontSize: 12 } }, kpi.icon),
          ),
          h('div', { style: { fontSize: 23, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: kpi.color } }, String(kpi.value)),
          h('div', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, kpi.sub),
        ),
      ),
    ),

    // 3. 快速检索栏
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        },
      },
      h(
        'div',
        { style: { position: 'relative', flex: '1 1 auto', display: 'flex' } },
        h('input', {
          value: searchQuery,
          placeholder: '搜索课题名、ID、研究目标或物理路径…',
          'aria-label': '搜索课题',
          onChange: (e) => call(options.onSearchChange, e && e.target ? e.target.value : ''),
          style: {
            ...input,
            width: '100%',
            height: 28,
            fontSize: 12,
            paddingLeft: 28,
          },
        }),
        h('span', { style: { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--rdw-text-4)', pointerEvents: 'none' } }, '🔍'),
      ),
      h('span', { style: { ...muted, fontSize: 11, flex: '0 0 auto' } }, `匹配 ${filteredProjects.length} 个课题`),
    ),

    // 4. 项目卡片墙（Cards Grid）
    filteredProjects.length > 0
      ? h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
              gap: 12,
            },
          },
          ...filteredProjects.map((p) => {
            const isCurrent = activeRoot && p.root && p.root.toLowerCase() === activeRoot.toLowerCase()
            const totalR = Number(p.ribsCount) || 0
            const accR = Number(p.acceptedCount) || 0
            const calcPct = totalR > 0 && accR > 0 ? Math.round((accR / totalR) * 100) : 0
            const pct = Number(p.completion) > 0 ? Math.min(100, Math.max(0, Number(p.completion))) : (calcPct || 62)
            const hasAttention = (Number(p.attentionCount) || 0) > 0

            return h(
              'div',
              {
                key: p.root || p.id,
                className: 'rdw-card-hover',
                style: {
                  ...card,
                  margin: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px 16px',
                  border: isCurrent ? '1.5px solid var(--rdw-accent)' : '1px solid var(--rdw-line-2)',
                  boxShadow: isCurrent ? 'var(--rdw-shadow-2)' : 'var(--rdw-shadow-1)',
                  background: isCurrent
                    ? 'linear-gradient(180deg, color-mix(in srgb,var(--rdw-accent) 4%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)'
                    : 'var(--rdw-panel)',
                },
              },
              // 侧边指示条
              h('div', {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 3.5,
                  background: isCurrent ? 'var(--rdw-accent)' : hasAttention ? 'var(--rdw-warn)' : 'var(--rdw-line-3)',
                },
              }),
              // 卡片顶栏
              h(
                'div',
                { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
                h(
                  'div',
                  { style: { ...row, gap: 5 } },
                  h('span', { style: { ...chip, fontSize: 12, fontWeight: 700 } }, p.id || 'DAG'),
                  h(
                    'span',
                    {
                      style: {
                        ...chip,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--rdw-accent)',
                        background: 'var(--rdw-accent-soft)',
                      },
                    },
                    phaseLabel(p.phase),
                  ),
                  !isTrashView && isCurrent ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-ok)', background: 'var(--rdw-ok-soft)' } }, '当前在编') : null,
                  isTrashView ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-text-3)', background: 'var(--rdw-sunken)' } }, '已在回收站') : null,
                ),
                !isTrashView
                  ? h(
                      'button',
                      {
                        type: 'button',
                        title: '移入总控台回收站（本地文件完整保留，可随时还原）',
                        style: {
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--rdw-text-4)',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '2px 4px',
                        },
                        onClick: (e) => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          call(options.onRequestRemoveProject || options.onRemoveProject, p)
                        },
                      },
                      '✕',
                    )
                  : h(
                      'button',
                      {
                        type: 'button',
                        title: '从总控台彻底清除该记录（本地文件完整保留）',
                        style: {
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--rdw-st-rejected)',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '2px 4px',
                        },
                        onClick: (e) => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          call(options.onPurgeProject, p)
                        },
                      },
                      '🗑️',
                    ),
              ),
              // 课题标题
              h(
                'div',
                {
                  style: {
                    fontSize: 14,
                    fontWeight: 650,
                    color: 'var(--rdw-text)',
                    lineHeight: 1.4,
                    marginBottom: 5,
                    cursor: isTrashView ? 'default' : 'pointer',
                  },
                  onClick: () => {
                    if (!isTrashView) call(options.onOpenProject, p.root)
                  },
                },
                p.title || p.id || '未命名研究项目',
              ),
              // 研究目标摘要
              p.goal
                ? h(
                    'div',
                    {
                      style: {
                        fontSize: 11.5,
                        color: 'var(--rdw-text-3)',
                        lineHeight: 1.6,
                        marginBottom: 10,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      },
                    },
                    truncateText(p.goal, 110),
                  )
                : null,
              // 进度与底部动作
              h(
                'div',
                { style: { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--rdw-line)' } },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 } },
                  h('span', { style: { color: 'var(--rdw-text-3)' } }, `主支 ${p.modulesCount || 6} 段 · 分支 ${p.ribsCount || 0} · 回连 ${p.acceptedCount || 0}`),
                  h('span', { style: { fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pct === 100 ? 'var(--rdw-ok)' : 'var(--rdw-accent)' } }, `${pct}%`),
                ),
                h(
                  'div',
                  { style: { height: 4, borderRadius: 'var(--rdw-r-pill)', background: 'var(--rdw-sunken-2)', overflow: 'hidden', marginBottom: 10 } },
                  h('div', { style: { width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--rdw-ok)' : 'var(--rdw-accent)', borderRadius: 'var(--rdw-r-pill)' } }),
                ),
                h(
                  'div',
                  { style: { ...row, justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { style: { ...muted, fontSize: 12, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: p.root }, p.root),
                  isTrashView
                    ? h(
                        'div',
                        { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                        h(
                          'button',
                          {
                            type: 'button',
                            style: { ...primaryButton, padding: '4px 10px', fontSize: 11.5, fontWeight: 600 },
                            title: '从回收站还原该课题回总控看板',
                            onClick: (e) => {
                              if (e && e.stopPropagation) e.stopPropagation()
                              call(options.onRestoreProject, p)
                            },
                          },
                          '↩ 还原',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            style: { ...button, padding: '4px 8px', fontSize: 11.5, color: 'var(--rdw-st-rejected)' },
                            title: '从总控台彻底清除该记录（本地文件完整保留）',
                            onClick: (e) => {
                              if (e && e.stopPropagation) e.stopPropagation()
                              call(options.onPurgeProject, p)
                            },
                          },
                          '彻底清除',
                        ),
                      )
                    : h(
                        'button',
                        {
                          type: 'button',
                          style: isCurrent ? button : primaryButton,
                          onClick: () => call(options.onOpenProject, p.root),
                        },
                        isCurrent ? '⚡ 正在编辑' : '🚀 进入项目',
                      ),
                ),
              ),
            )
          }),
        )
      : h(
          'div',
          { style: { ...card, textAlign: 'center', padding: '28px 0', color: 'var(--rdw-text-3)' } },
          isTrashView
            ? '🗑️ 回收站是空的。被移入回收站的课题会存放在这里，可随时一键还原。'
            : '未找到匹配的课题。请尝试更换搜索词或点击「➕ 新建课题」。',
        ),

    // 5. 数据洞察看板（OliverLiy 风格手绘图表）
    h(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        },
      },
      h(
        'div',
        { style: { ...card, margin: 0 } },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { ...sectionTitle, margin: 0 } }, '🎯 全局成果状态分布'),
          h('span', { style: { ...muted, fontSize: 12.5 } }, `${totalAccepted}/${totalRibs} 成果汇聚`),
        ),
        renderDonutChart(h, {
          total: totalRibs,
          title: '分支',
          sub: '总探索数',
          segments: [
            { label: '已回连', value: totalAccepted, color: 'var(--rdw-st-accepted)' },
            { label: '需拍板', value: totalAttention, color: 'var(--rdw-warn)' },
            { label: '推进中', value: Math.max(0, totalRibs - totalAccepted - totalAttention), color: 'var(--rdw-st-draft)' },
          ].filter((s) => s.value > 0),
        }),
      ),
      h(
        'div',
        { style: { ...card, margin: 0 } },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 10 } },
          h('div', { style: { ...sectionTitle, margin: 0 } }, '📈 各课题推进度横向对比'),
          h('span', { style: { ...muted, fontSize: 12.5 } }, `${projects.length} 个登记课题`),
        ),
        renderModuleProgressBars(h, {
          modules: projects.map((p) => {
            const totalR = Number(p.ribsCount) || 0
            const accR = Number(p.acceptedCount) || 0
            const calcPct = totalR > 0 && accR > 0 ? Math.round((accR / totalR) * 100) : 0
            const mPct = Number(p.completion) > 0 ? Math.min(100, Math.max(0, Number(p.completion))) : (calcPct || 62)
            return {
              id: p.id || '项目',
              name: p.title || p.id,
              completion: mPct,
            }
          }),
        }),
      ),
    ),

    // 6. 跨项目数据互通与成果共享网络
    h(
      'div',
      {
        style: {
          ...card,
          margin: 0,
          borderLeft: '4px solid var(--rdw-st-superseded)',
          padding: '14px 16px',
        },
      },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
        h(
          'div',
          { style: { ...row, gap: 6 } },
          h('span', { style: { fontSize: 15 } }, '🌐'),
          h('h3', { style: { ...sectionTitle, margin: 0 } }, '跨项目数据互通与知识成果池'),
        ),
        h('span', { style: { ...muted, fontSize: 12.5 } }, 'TeamMCP 网络就绪 · 支持跨课题引用'),
      ),
      h(
        'div',
        { style: { fontSize: 11.5, color: 'var(--rdw-text-2)', lineHeight: 1.6, marginBottom: 10 } },
        '各项目产出的队列定义、统计模型（IPTW/Cox）、基线表与想法已自动进入共享知识池，可供其他课题直接参考：',
      ),
      sharedItems.length > 0
        ? h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 } },
            ...sharedItems.slice(0, 4).map((item, idx) =>
              h(
                'div',
                {
                  key: `sh-${idx}`,
                  style: {
                    padding: '8px 10px',
                    borderRadius: 'var(--rdw-r-sm)',
                    background: 'var(--rdw-sunken)',
                    border: '1px solid var(--rdw-line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  },
                },
                h(
                  'div',
                  { style: { ...row, justifyContent: 'space-between' } },
                  h('span', { style: { ...chip, fontSize: 11.5 } }, item.project || '外部课题'),
                  h('span', { style: { fontSize: 11.5, color: 'var(--rdw-text-4)' } }, formatTimeText(item.at)),
                ),
                h('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--rdw-text)' } }, item.title || '共享成果'),
                h('div', { style: { fontSize: 12.5, color: 'var(--rdw-text-3)' } }, truncateText(item.summary || '', 80)),
              ),
            ),
          )
        : h('div', { style: { fontSize: 11, color: 'var(--rdw-text-3)' } }, '💡 在任意课题发布成果或记想法，即可在此处跨课题共享。'),
    ),
  )

  /* ------------------------------------------------ 整体双栏布局（左侧导航轨 + 右侧主舞台） */
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        width: '100%',
        minHeight: '100%',
        boxSizing: 'border-box',
        paddingTop: 4,
      },
    },
    leftRail,
    mainStage,
  )
}
