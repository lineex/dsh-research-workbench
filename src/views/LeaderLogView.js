/**
 * 研究项目 DAG 工作台 — 主智能体对话视图（v2.5）。
 *
 * 这是**控制层（主智能体）自己的往来记录**，不是分支执行日志：
 *   - 每条裁决（ACCEPT / REJECT / BLOCK / NOTE）及其理由
 *   - 主项目记下的想法
 *   - 内容复核结论（满意 / 待复核）
 *   - 当前阶段、下一步、阻塞
 *
 * 数据：GET /leader-log（control/DECISIONS.md + IDEAS.md + REVIEWS.md + PROJECT_STATE）
 */
import { STYLES, formatTimeText, truncateText } from '../core/constants.js'

/** 动作 → 视觉主题。 */
const ACTION_THEME = {
  ACCEPT: { label: '接受', color: 'var(--rdw-st-accepted)', icon: '✓' },
  REJECT: { label: '拒绝', color: 'var(--rdw-st-rejected)', icon: '✕' },
  BLOCK: { label: '阻塞', color: 'var(--rdw-st-blocked)', icon: '⊘' },
  NOTE: { label: '记录', color: 'var(--rdw-st-superseded)', icon: '✎' },
  UNSUBMIT: { label: '撤回', color: 'var(--rdw-st-draft)', icon: '↩' },
}

const KIND_THEME = {
  decision: { label: '裁决', color: 'var(--rdw-accent)' },
  idea: { label: '想法', color: 'var(--rdw-st-superseded)' },
  review: { label: '复核', color: 'var(--rdw-st-accepted)' },
}

function actionTheme(action) {
  return ACTION_THEME[String(action || '').toUpperCase()] || { label: action || '记录', color: 'var(--rdw-st-draft)', icon: '•' }
}

function kindTheme(kind) {
  return KIND_THEME[String(kind || '')] || { label: '记录', color: 'var(--rdw-st-draft)' }
}

/** 时间线单条。 */
function renderTimelineItem(h, item, index) {
  const { row, chip, muted } = STYLES
  const kind = String(item.kind || '')
  const kTheme = kindTheme(kind)
  const aTheme = kind === 'decision' ? actionTheme(item.action) : kTheme
  const isLast = false
  return h(
    'div',
    {
      key: `tl-${index}`,
      style: {
        position: 'relative',
        paddingLeft: 22,
        paddingBottom: 12,
        borderLeft: `2px solid color-mix(in srgb, ${aTheme.color} 30%, transparent)`,
        marginLeft: 6,
      },
    },
    // 节点圆点
    h('span', {
      style: {
        position: 'absolute',
        left: -7,
        top: 2,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: aTheme.color,
        border: '2px solid var(--rdw-panel)',
        boxShadow: `0 0 0 2px color-mix(in srgb, ${aTheme.color} 25%, transparent)`,
      },
    }),
    h(
      'div',
      { style: { ...row, gap: 6, marginBottom: 2 } },
      h(
        'span',
        {
          style: {
            fontSize: 11,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 4,
            lineHeight: '15px',
            background: `color-mix(in srgb, ${aTheme.color} 18%, transparent)`,
            color: aTheme.color,
          },
        },
        kind === 'decision' ? `${aTheme.icon} ${aTheme.label}` : kTheme.label,
      ),
      item.id ? h('span', { style: { ...muted, fontSize: 12, fontFamily: 'monospace' } }, item.id) : null,
      h('span', { style: { ...muted, fontSize: 12 } }, formatTimeText(item.at) || item.at || ''),
      item.related ? h('span', { style: { ...muted, fontSize: 12 } }, `↳ ${item.related}`) : null,
    ),
    h('div', { style: { fontSize: 12, fontWeight: 600, lineHeight: 1.45, marginBottom: 2 } }, item.title || ''),
    item.target
      ? h('div', { style: { ...STYLES.mono, fontSize: 12, opacity: 0.7, marginBottom: 2 } }, item.target)
      : null,
    item.text
      ? h(
          'div',
          {
            style: {
              fontSize: 11,
              lineHeight: 1.65,
              opacity: 0.86,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '5px 8px',
              borderRadius: 6,
              background: 'color-mix(in srgb, currentColor 4%, transparent)',
            },
          },
          item.text,
        )
      : null,
  )
}

/**
 * 渲染主智能体对话视图。
 * @param {object} h React.createElement
 * @param {{leaderLog?: object|null, loading?: boolean, error?: string,
 *          filter?: string, onFilter?: Function, onRefresh?: Function, busy?: string}} props
 */
export function renderLeaderLogView(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { card, row, chip, muted, button, primaryButton, sectionTitle, mutedBox } = STYLES
  const log = options.leaderLog && options.leaderLog.ok !== false ? options.leaderLog : null
  const loading = Boolean(options.loading)
  const error = typeof options.error === 'string' ? options.error : ''
  const filter = typeof options.filter === 'string' ? options.filter : 'all'
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }

  if (!log) {
    if (error) {
      return h(
        'div',
        { style: card },
        h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, '主智能体记录读取失败'),
        h('div', { style: { ...muted, marginBottom: 8 } }, error),
        h('button', { type: 'button', style: primaryButton, disabled: loading, onClick: () => call(options.onRefresh) }, '重试'),
      )
    }
    return h('div', { style: { ...muted, padding: '16px 0' } }, loading ? '正在读取主智能体记录…' : '暂无记录')
  }

  const state = log.state && typeof log.state === 'object' ? log.state : {}
  const timeline = Array.isArray(log.timeline) ? log.timeline : []
  const counts = log.counts && typeof log.counts === 'object' ? log.counts : {}
  const nextSteps = Array.isArray(state.nextSteps) ? state.nextSteps : []
  const blockers = Array.isArray(state.blockers) ? state.blockers : []

  const FILTERS = [
    ['all', '全部'],
    ['decision', '裁决'],
    ['idea', '想法'],
    ['review', '复核'],
  ]
  const visible = filter === 'all' ? timeline : timeline.filter((item) => item.kind === filter)

  return h(
    'div',
    null,
    /* -------------------------------------------------- 主智能体身份卡 */
    h(
      'div',
      {
        style: {
          ...card,
          background:
            'linear-gradient(135deg, var(--rdw-st-superseded-soft), var(--rdw-accent-soft))',
          border: '1px solid color-mix(in srgb,var(--rdw-st-superseded) 28%,transparent)',
        },
      },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
        h(
          'div',
          { style: { minWidth: 0, flex: '1 1 300px' } },
          h(
            'div',
            { style: { ...row, gap: 6, marginBottom: 4 } },
            h('span', { style: { fontSize: 15 } }, '🧠'),
            h(
              'span',
              { style: { fontSize: 12, fontWeight: 700, letterSpacing: '.06em', opacity: 0.72, textTransform: 'uppercase' } },
              '主智能体 · 控制层记录',
            ),
            state.phase ? h('span', { style: { ...chip, fontSize: 12 } }, state.phase) : null,
          ),
          h(
            'div',
            { style: { fontSize: 11.5, opacity: 0.82, lineHeight: 1.6 } },
            '这里是主项目自己的判断与决定：每次接受/拒绝/阻塞的理由、记下的想法、内容复核结论。分支智能体的执行细节在各分支的工作区里。',
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            style: button,
            disabled: loading,
            onClick: () => call(options.onRefresh),
          },
          loading ? '刷新中…' : '刷新',
        ),
      ),
      h(
        'div',
        { style: { ...row, gap: 6, marginTop: 10 } },
        h('span', { style: { ...chip, fontSize: 12 } }, `裁决 ${counts.decisions || 0}`),
        h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } }, `接受 ${counts.accepted || 0}`),
        (counts.rejected || 0) > 0
          ? h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-rejected)', borderColor: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)' } }, `拒绝 ${counts.rejected}`)
          : null,
        (counts.blocked || 0) > 0
          ? h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, `阻塞 ${counts.blocked}`)
          : null,
        h('span', { style: { ...chip, fontSize: 12 } }, `想法 ${counts.ideas || 0}`),
        h('span', { style: { ...chip, fontSize: 12 } }, `复核 ${counts.reviews || 0}`),
      ),
    ),

    /* -------------------------------------------------- 当前意图 */
    nextSteps.length > 0 || blockers.length > 0
      ? h(
          'div',
          { style: card },
          nextSteps.length > 0
            ? h(
                'div',
                { style: { marginBottom: blockers.length > 0 ? 8 : 0 } },
                h('div', { style: sectionTitle }, '🎯 主智能体当前的下一步'),
                ...nextSteps.map((step, index) =>
                  h('div', { key: `ns-${index}`, style: { fontSize: 11, lineHeight: 1.75, opacity: 0.88 } }, `· ${step}`),
                ),
              )
            : null,
          blockers.length > 0
            ? h(
                'div',
                null,
                h('div', { style: sectionTitle }, '⊘ 正在等外部澄清'),
                ...blockers.map((item, index) =>
                  h('div', { key: `bl-${index}`, style: { fontSize: 11, lineHeight: 1.7, color: 'var(--rdw-st-blocked)', opacity: 0.9 } }, `· ${item}`),
                ),
              )
            : null,
        )
      : null,

    /* -------------------------------------------------- 对话时间轴 */
    h(
      'div',
      { style: card },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
        h('div', { style: { ...sectionTitle, margin: 0 } }, `对话时间轴 · ${visible.length} 条`),
        h(
          'div',
          { style: { ...row, gap: 4 } },
          ...FILTERS.map(([id, label]) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                style: filter === id ? { ...primaryButton, fontSize: 12, padding: '2px 8px' } : { ...button, fontSize: 12, padding: '2px 8px' },
                onClick: () => call(options.onFilter, id),
              },
              label,
            ),
          ),
        ),
      ),
      visible.length > 0
        ? h('div', { style: { marginTop: 4 } }, ...visible.map((item, index) => renderTimelineItem(h, item, index)))
        : h('div', { style: mutedBox }, filter === 'all' ? '还没有记录' : '这个分类下没有记录'),
    ),
  )
}
