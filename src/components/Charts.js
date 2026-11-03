/**
 * 研究项目 DAG 工作台 — 可视化图表组件（v3.5）。
 *
 * 参考 OliverLiy/projectHub 的手绘 SVG 图表设计：
 *   - 环形分布图（Donut Chart）：分支状态/交接状态分布，中置总数与高亮切片；
 *   - 模块进度条（Module Progress）：展示各主支阶段的推进完成度；
 *   - 阶段阶梯条（Phase Pipeline）：研究主线阶段进度导航。
 *
 * 零第三方图表库依赖，纯 SVG + CSS 变量实现，支持宿主明暗主题自动适应。
 */

/**
 * 状态环形分布图（Donut Chart）。
 * @param {object} h React.createElement
 * @param {{
 *   total: number,
 *   title: string,
 *   sub?: string,
 *   segments: Array<{ label: string, value: number, color: string, tone?: string }>
 * }} props
 */
export function renderDonutChart(h, props) {
  const { total = 0, title = '总览', sub = '成果数', segments = [] } = props || {}
  const r = 44
  const c = 2 * Math.PI * r
  let accumulated = 0

  const safeTotal = total > 0 ? total : segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
  const validTotal = safeTotal > 0 ? safeTotal : 1

  const slices = segments.map((seg, index) => {
    const val = Math.max(0, Number(seg.value) || 0)
    const ratio = val / validTotal
    const strokeDash = `${(ratio * c).toFixed(2)} ${c.toFixed(2)}`
    const strokeOffset = (-accumulated * c).toFixed(2)
    accumulated += ratio

    return h('circle', {
      key: `slice-${index}`,
      cx: 64,
      cy: 64,
      r,
      fill: 'none',
      stroke: seg.color || 'var(--rdw-accent)',
      strokeWidth: 14,
      strokeDasharray: strokeDash,
      strokeDashoffset: strokeOffset,
      strokeLinecap: 'butt',
      style: { transition: 'stroke-dasharray .4s ease, stroke-dashoffset .4s ease' },
    })
  })

  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      },
    },
    h(
      'div',
      {
        style: {
          position: 'relative',
          width: 128,
          height: 128,
          flex: '0 0 auto',
        },
      },
      h(
        'svg',
        {
          viewBox: '0 0 128 128',
          width: 128,
          height: 128,
          style: { transform: 'rotate(-90deg)', display: 'block' },
        },
        h('circle', {
          cx: 64,
          cy: 64,
          r,
          fill: 'none',
          stroke: 'var(--rdw-sunken-2)',
          strokeWidth: 14,
        }),
        ...slices,
      ),
      h(
        'div',
        {
          style: {
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          },
        },
        h(
          'span',
          {
            style: {
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--rdw-text)',
            },
          },
          String(total),
        ),
        h(
          'span',
          {
            style: {
              fontSize: 12,
              color: 'var(--rdw-text-3)',
              marginTop: 2,
            },
          },
          sub,
        ),
      ),
    ),
    h(
      'ul',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          flex: '1 1 140px',
          minWidth: 120,
        },
      },
      ...segments.map((seg, idx) =>
        h(
          'li',
          {
            key: `leg-${idx}`,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11.5,
              color: 'var(--rdw-text-2)',
            },
          },
          h('span', {
            style: {
              width: 8,
              height: 8,
              borderRadius: 2.5,
              background: seg.color || 'var(--rdw-accent)',
              flex: '0 0 auto',
            },
          }),
          h('span', { style: { flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, seg.label),
          h(
            'b',
            {
              style: {
                marginLeft: 'auto',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--rdw-text)',
                fontSize: 12,
              },
            },
            String(seg.value || 0),
          ),
        ),
      ),
    ),
  )
}

/**
 * 模块推进完成度列表。
 * @param {object} h React.createElement
 * @param {{ modules: Array<{ id: string, name: string, completion: number, ribs?: Array<any> }> }} props
 */
export function renderModuleProgressBars(h, props) {
  const { modules = [] } = props || {}

  if (modules.length === 0) {
    return h('div', { style: { fontSize: 11.5, color: 'var(--rdw-text-3)' } }, '暂无模块进度')
  }

  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      },
    },
    ...modules.map((m) => {
      const pct = Math.min(100, Math.max(0, Number(m.completion) || 0))
      const isComplete = pct === 100
      const barColor = isComplete ? 'var(--rdw-ok)' : pct > 0 ? 'var(--rdw-accent)' : 'var(--rdw-line-3)'

      return h(
        'div',
        {
          key: m.id,
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11.5,
            },
          },
          h(
            'span',
            {
              style: {
                fontWeight: 600,
                color: 'var(--rdw-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            `${m.id} ${m.name}`,
          ),
          h(
            'span',
            {
              style: {
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                fontWeight: 600,
                color: isComplete ? 'var(--rdw-ok)' : 'var(--rdw-text-3)',
              },
            },
            `${pct}%`,
          ),
        ),
        h(
          'div',
          {
            style: {
              height: 6,
              borderRadius: 'var(--rdw-r-pill)',
              background: 'var(--rdw-sunken-2)',
              overflow: 'hidden',
            },
          },
          h('div', {
            style: {
              width: `${pct}%`,
              height: '100%',
              borderRadius: 'var(--rdw-r-pill)',
              background: barColor,
              transition: 'width .35s ease',
            },
          }),
        ),
      )
    }),
  )
}

/**
 * 阶段管道流阶梯（Phase Pipeline Stepper）。
 * @param {object} h React.createElement
 * @param {{ phases: Array<[string, string]>, currentPhase: string }} props
 */
export function renderPhaseStepper(h, props) {
  const { phases = [], currentPhase = '' } = props || {}
  const currentIdx = phases.findIndex(([k]) => k === currentPhase)

  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        overflowX: 'auto',
        padding: '6px 0',
      },
    },
    ...phases.map(([key, label], idx) => {
      const isPast = currentIdx >= 0 && idx < currentIdx
      const isCurrent = idx === currentIdx
      const dotColor = isCurrent ? 'var(--rdw-accent)' : isPast ? 'var(--rdw-ok)' : 'var(--rdw-line-3)'
      const textColor = isCurrent ? 'var(--rdw-accent)' : isPast ? 'var(--rdw-text)' : 'var(--rdw-text-4)'
      const bg = isCurrent ? 'var(--rdw-accent-soft)' : isPast ? 'var(--rdw-sunken)' : 'transparent'

      return h(
        'div',
        {
          key,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--rdw-r-pill)',
            background: bg,
            fontSize: 11,
            fontWeight: isCurrent ? 600 : 500,
            color: textColor,
            whiteSpace: 'nowrap',
            border: isCurrent ? '1px solid color-mix(in srgb,var(--rdw-accent) 30%,transparent)' : '1px solid transparent',
          },
        },
        h('span', {
          style: {
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flex: '0 0 auto',
          },
        }),
        label,
        idx < phases.length - 1
          ? h('span', { style: { color: 'var(--rdw-line-3)', marginLeft: 3, fontWeight: 300 } }, '›')
          : null,
      )
    }),
  )
}
