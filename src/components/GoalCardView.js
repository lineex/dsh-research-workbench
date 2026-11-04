/**
 * 研究项目 DAG 工作台 — 研究目标 · 好问题卡编辑器（v3.10）。
 *
 * 形态：左栏「项目目标 · 研究目标」卡片点开 → 中栏切换成这个编辑器。
 * 三块内容，对应两项技能的两步：
 *
 *   ① 八层假设审计矩阵 —— 每层一行：层名 / 我的隐含假设 / 翻转后的问题。
 *      留空的层会被高亮：那是**还没被诊断**的盲区。
 *   ② 好问题卡 —— 11 个字段，对应 good-question 的卡面。
 *      「什么结果会推翻它」（falsifier）为空时整张卡标红：不是好问题。
 *   ③ 底部动作 —— 「生成研究目标」把问题+推翻条件压成一句话写回 project.goal；
 *      「复制讨论提示词」把两套技能的脚手架拷进宿主会话。
 *
 * 设计约束：
 *   - 只用 var(--rdw-*)，任何主题下都好看；
 *   - 不自己维护状态副本：所有编辑即时 onField 回调上抛，由面板层持有 draft；
 *   - 技能提示词不在这里拼，统一从 core/goal-skills.js 取，避免两处漂移。
 */
import { THINKING_LAYERS as SKILL_LAYERS, GOAL_CARD_FIELDS as CARD_FIELD_SPECS } from '../core/goal-skills.js'

const field = (extra) =>
  Object.assign(
    {
      width: '100%',
      boxSizing: 'border-box',
      padding: '6px 9px',
      borderRadius: 'var(--rdw-r-pebble-sm)',
      border: '1px solid var(--rdw-warm-line)',
      background: 'var(--rdw-organic-surface)',
      color: 'var(--rdw-organic-ink)',
      fontFamily: 'inherit',
      fontSize: 12,
      lineHeight: 1.5,
      outline: 'none',
    },
    extra || {},
  )

const label = (text, hint) =>
  text
    ? null
    : null

/** 小标题。 */
function sectionTitle(h, icon, text, note) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 7,
        margin: '0 0 7px',
        flexWrap: 'wrap',
      },
    },
    h('span', { style: { fontSize: 13 } }, icon),
    h(
      'span',
      { style: { fontSize: 13, fontWeight: 700, color: 'var(--rdw-organic-ink)' } },
      text,
    ),
    note
      ? h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, note)
      : null,
  )
}

/**
 * 渲染研究目标 · 好问题卡编辑器。
 *
 * props: {
 *   h, card, layers, goal, missing, falsifiable, busy,
 *   onField(key, value), onLayer(id, patch), onSyncGoal(), onCopyPrompt(), onClose()
 * }
 */
export function renderGoalCardView(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const card = options.card && typeof options.card === 'object' ? options.card : {}
  const layers = Array.isArray(options.layers) ? options.layers : []
  const missing = Array.isArray(options.missing) ? options.missing : []
  const falsifiable = Boolean(options.falsifiable)
  const busy = Boolean(options.busy)
  const goal = typeof options.goal === 'string' ? options.goal : ''
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }

  const layerById = {}
  for (const entry of layers) {
    if (entry && typeof entry === 'object' && typeof entry.id === 'string') layerById[entry.id] = entry
  }
  const undiagnosed = SKILL_LAYERS.filter((layer) => {
    const entry = layerById[layer.id]
    return !entry || !String(entry.assumption || '').trim()
  })

  const missingCount = CARD_FIELD_SPECS.filter((spec) => missing.includes(spec.key)).length
  const requiredMissing = missing.includes('falsifier')

  /* ① 八层审计矩阵
   * 布局说明：工作台侧栏可能只有 ~160px 宽，若用「42px 标签 + 两个 1fr 输入」三列网格，
   * 输入框会被压成 50px 而标签被 nowrap 裁切。改为上下两段：
   *   第 1 行：层标签（允许换行，不再 nowrap）
   *   第 2 行：两个输入并排（各 minmax(0,1fr)）
   * 这样窄栏与宽栏都不会挤压或裁字。 */
  const layerRows = SKILL_LAYERS.map((layer) => {
    const entry = layerById[layer.id] || {}
    const hasAssumption = String(entry.assumption || '').trim().length > 0
    return h(
      'div',
      {
        key: layer.id,
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '6px 8px',
          borderRadius: 'var(--rdw-r-pebble-sm)',
          background: hasAssumption
            ? 'transparent'
            : 'color-mix(in srgb,var(--rdw-st-blocked-soft) 42%,transparent)',
          border: hasAssumption
            ? '1px solid transparent'
            : '1px dashed color-mix(in srgb,var(--rdw-st-blocked) 34%,transparent)',
        },
      },
      h(
        'div',
        {
          title: layer.question,
          style: {
            fontFamily: 'var(--rdw-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: hasAssumption ? 'var(--rdw-organic-ink-3)' : 'var(--rdw-st-blocked)',
            lineHeight: 1.35,
            overflowWrap: 'anywhere',
          },
        },
        `${layer.id} ${layer.name}`,
      ),
      h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 6 } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
          h(
            'input',
            {
              type: 'text',
              value: String(entry.assumption || ''),
              placeholder: '我假设了…',
              title: `我假设了：${layer.hint}（${layer.question}）`,
              style: field({ padding: '5px 7px', fontSize: 11.5 }),
              onInput: (event) => call(options.onLayer, layer.id, { assumption: event.target.value }),
            },
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
          h(
            'input',
            {
              type: 'text',
              value: String(entry.flip || ''),
              placeholder: '翻过来会变成什么研究？',
              title: '翻过来会变成什么研究？',
              style: field({ padding: '5px 7px', fontSize: 11.5 }),
              onInput: (event) => call(options.onLayer, layer.id, { flip: event.target.value }),
            },
          ),
        ),
      ),
    )
  })

  /* ② 好问题卡字段 */
  const cardFields = CARD_FIELD_SPECS.map((spec) => {
    const value = String(card[spec.key] || '')
    const isMissing = missing.includes(spec.key)
    const isFalsifier = spec.key === 'falsifier'
    const multiline = ['question', 'whyMatters', 'hypotheses', 'discriminatingTest', 'falsifier', 'pilot', 'reviewerRisk'].includes(spec.key)
    const commonProps = {
      value,
      title: spec.hint,
      placeholder: spec.hint,
      style: field({
        minHeight: multiline ? 52 : undefined,
        resize: multiline ? 'vertical' : undefined,
        border: isMissing
          ? isFalsifier
            ? '1px solid var(--rdw-st-blocked)'
            : '1px dashed color-mix(in srgb,var(--rdw-st-blocked) 40%,transparent)'
          : '1px solid var(--rdw-warm-line)',
      }),
      onInput: (event) => call(options.onField, spec.key, event.target.value),
    }
    return h(
      'div',
      { key: spec.key, style: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 7 } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' } },
        h(
          'span',
          {
            style: {
              fontSize: 11.5,
              fontWeight: 600,
              color: isMissing ? 'var(--rdw-st-blocked)' : 'var(--rdw-organic-ink-2)',
            },
          },
          spec.label,
        ),
        isFalsifier
          ? h(
              'span',
              {
                style: {
                  fontSize: 11,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: isMissing ? 'var(--rdw-st-blocked)' : 'color-mix(in srgb,var(--rdw-sage) 22%,transparent)',
                  color: isMissing ? '#faf6f1' : 'var(--rdw-organic-ink-2)',
                },
              },
              '必填',
            )
          : null,
      ),
      multiline
        ? h('textarea', Object.assign({}, commonProps, { rows: isFalsifier ? 3 : 2 }))
        : h('input', Object.assign({}, commonProps, { type: 'text' })),
    )
  })

  /* 状态条 */
  const statusNode = h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '7px 10px',
        borderRadius: 'var(--rdw-r-pebble-sm)',
        background: falsifiable
          ? 'color-mix(in srgb,var(--rdw-sage) 13%,transparent)'
          : 'color-mix(in srgb,var(--rdw-st-blocked-soft) 52%,transparent)',
        border: falsifiable
          ? '1px solid color-mix(in srgb,var(--rdw-sage) 34%,transparent)'
          : '1px solid color-mix(in srgb,var(--rdw-st-blocked) 34%,transparent)',
      },
    },
    h('span', { style: { fontSize: 13 } }, falsifiable ? '✅' : '⚠️'),
    h(
      'span',
      {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: falsifiable ? 'var(--rdw-sage)' : 'var(--rdw-st-blocked)',
        },
      },
      falsifiable ? '这张卡可验证：已写下推翻条件' : '还不能算好问题：缺少「什么结果会推翻它」',
    ),
    missingCount > 0
      ? h(
          'span',
          { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
          `还空着 ${missingCount} / ${CARD_FIELD_SPECS.length} 个字段`,
        )
      : h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '字段已填齐'),
    undiagnosed.length > 0
      ? h(
          'span',
          { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
          `· ${undiagnosed.length} 层还没做假设审计`,
        )
      : h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '· 八层已全部审计'),
  )

  return h(
    'div',
    {
      className: 'rdw-goal-card-view',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '10px 12px',
        minHeight: 0,
        overflowY: 'auto',
      },
    },
    /* 标题栏
     * 侧栏可能只有 ~160px 宽：允许换行（按钮整体落到下一行），
     * 并给标题 nowrap，避免被挤成逐字竖排。 */
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          paddingBottom: 8,
          borderBottom: '1px solid var(--rdw-warm-line)',
          flexShrink: 0,
        },
      },
      h('span', { style: { fontSize: 15 } }, '🎯'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' } },
        h(
          'span',
          {
            style: {
              fontFamily: 'var(--rdw-font-serif)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--rdw-organic-ink)',
              whiteSpace: 'nowrap',
            },
          },
          '研究目标 · 好问题',
        ),
        h(
          'span',
          { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', whiteSpace: 'nowrap' } },
          '八层假设审计 → 好问题卡 → 生成研究目标',
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'rdw-organic-btn',
          title: '把两套技能（八层框架 + good-question）的讨论脚手架直接写进会话输入框，按回车即可与智能体讨论',
          disabled: busy,
          style: {
            padding: '4px 10px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            border: '1px solid var(--rdw-warm-line)',
            background: 'var(--rdw-organic-surface)',
            color: 'var(--rdw-organic-ink-2)',
            fontSize: 11.5,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          },
          onClick: () => call(options.onCopyPrompt),
        },
        '💬 开始讨论',
      ),
      h(
        'button',
        {
          type: 'button',
          title: '关闭编辑器，回到项目流程',
          style: {
            padding: '4px 9px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            border: '1px solid var(--rdw-warm-line)',
            background: 'var(--rdw-organic-surface)',
            color: 'var(--rdw-organic-ink-3)',
            fontSize: 11.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          },
          onClick: () => call(options.onClose),
        },
        '✕',
      ),
    ),

    statusNode,

    /* ① 八层 */
    h(
      'div',
      null,
      sectionTitle(h, '🧭', '第 1 步 · 八层假设审计', '留空的层就是盲区（红框）'),
      h(
        'div',
        {
          style: {
            padding: '0 8px 3px',
            fontSize: 11,
            color: 'var(--rdw-organic-ink-3)',
            fontFamily: 'var(--rdw-font-mono)',
            lineHeight: 1.5,
          },
        },
        '每层填两栏：我的隐含假设 / 翻转后的问题',
      ),
      ...layerRows,
    ),

    /* ② 好问题卡 */
    h(
      'div',
      null,
      sectionTitle(h, '🃏', '第 2 步 · 好问题卡', `${CARD_FIELD_SPECS.length} 个字段，falsifier 必填`),
      h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            gap: 8,
          },
        },
        ...cardFields,
      ),
    ),

    /* ③ 动作条 */
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--rdw-warm-line)',
          flexShrink: 0,
          flexWrap: 'wrap',
        },
      },
      h(
        'button',
        {
          type: 'button',
          title: falsifiable
            ? '把「核心问题；推翻条件」压成一句话，写回 PROJECT_STATE 的 project.goal'
            : '还没有推翻条件，生成的目标无法被验证——建议先补上',
          disabled: busy,
          style: {
            padding: '6px 14px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            border: 'none',
            background: falsifiable ? 'var(--rdw-sage)' : 'var(--rdw-st-blocked)',
            color: '#faf6f1',
            fontSize: 12,
            fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          },
          onClick: () => call(options.onSyncGoal),
        },
        busy ? '生成中…' : '生成研究目标',
      ),
      goal
        ? h(
            'div',
            {
              style: {
                flex: '1 1 260px',
                minWidth: 0,
                fontSize: 11,
                color: 'var(--rdw-organic-ink-2)',
                lineHeight: 1.5,
                padding: '5px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                background: 'color-mix(in srgb,var(--rdw-sage-tint) 10%,transparent)',
                borderLeft: '2px solid var(--rdw-sage)',
              },
            },
            h('span', { style: { color: 'var(--rdw-organic-ink-3)' } }, '当前 project.goal：'),
            goal,
          )
        : h(
            'span',
            { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
            '当前项目还没有研究目标',
          ),
    ),
  )
}
