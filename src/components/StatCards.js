/**
 * 研究项目 DAG 工作台 — 概览统计卡。
 */
import { STYLES, STATUS_INFO, countOf, sumBranchCount } from '../core/constants.js'

/**
 * @param {object} h React.createElement
 * @param {{project?: object}} props
 */
export function renderStatCards(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const project = options.project && typeof options.project === 'object' ? options.project : null
  const modules = project && Array.isArray(project.modules) ? project.modules : []
  const handoffs = project && Array.isArray(project.handoffs) ? project.handoffs : []
  const counts = project && project.counts && typeof project.counts === 'object' ? project.counts : {}
  const branchTotal = sumBranchCount(modules)

  const cards = [
    { label: '模块', value: modules.length, icon: '📦', color: 'var(--rdw-accent)', sub: '研究阶段' },
    { label: '分支', value: branchTotal, icon: '🌱', color: 'var(--rdw-accent-dark)', sub: '探索分支' },
    { label: '交接', value: handoffs.length, icon: '📄', color: 'var(--rdw-text-2)', sub: '产物账本' },
    { label: '草稿', value: countOf(counts, 'draft'), icon: '◍', color: STATUS_INFO.DRAFT.color, sub: '探路推进' },
    { label: '待决定', value: countOf(counts, 'provisional'), icon: '◉', color: STATUS_INFO.PROVISIONAL.color, sub: '需你拍板' },
    { label: '已接受', value: countOf(counts, 'accepted'), icon: '●', color: STATUS_INFO.ACCEPTED.color, sub: '汇入主线' },
    { label: '阻塞', value: countOf(counts, 'blocked'), icon: '⊘', color: STATUS_INFO.BLOCKED.color, sub: '待排障' },
  ]

  return h(
    'div',
    { style: { ...STYLES.grid, marginTop: 4, marginBottom: 14 } },
    ...cards.map((card) =>
      h(
        'div',
        {
          key: card.label,
          className: 'rdw-card-hover',
          style: {
            ...STYLES.statCard,
            position: 'relative',
            overflow: 'hidden',
            padding: '12px 14px',
            gap: 4,
          },
        },
        h('div', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            background: card.color || 'var(--rdw-line-3)',
            opacity: 0.85,
          },
        }),
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--rdw-text-3)',
            },
          },
          h('span', { style: STYLES.statLabel }, card.label),
          h('span', { style: { fontSize: 12, opacity: 0.8 } }, card.icon),
        ),
        h('div', { style: { ...STYLES.statValue, color: card.color || 'inherit' } }, String(card.value)),
        h('div', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, card.sub),
      ),
    ),
  )
}
