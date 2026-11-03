/**
 * 研究项目 DAG 工作台 — 分支/主支会话视图。
 * 全面板工作区：上下文、简报、工作记录、对话及文件访问均在同一页面。
 */
import { STYLES } from '../core/constants.js'

const BUBBLE = {
  human: { align: 'flex-end', bg: 'var(--rdw-accent-soft)', border: 'color-mix(in srgb,var(--rdw-accent) 32%,transparent)', label: '你' },
  agent: { align: 'flex-start', bg: 'var(--rdw-st-accepted-soft)', border: 'color-mix(in srgb,var(--rdw-st-accepted) 30%,transparent)', label: '智能体' },
}

/** 智能体角色档案（对齐 EvoResearch 六大科研专家体系）。 */
const AGENT_PERSONAS = {
  M10: { role: '规划专家 (Planner)', icon: '📋', mission: '制定研究假设、PICO 与 Target Trial 协议设计' },
  M20: { role: '调研专家 (Research)', icon: '📚', mission: 'PUBMED / 证据检索与既往基线文献比对' },
  M30: { role: '队列与数据专家 (Cohort & Data)', icon: '🧬', mission: 'MIMIC 提取、入排筛选与缺失值审计' },
  M40: { role: '统计推断专家 (Data Analysis / Stats)', icon: '📐', mission: '倾向评分加权 (IPTW)、Cox 模型与敏感性分析' },
  M50: { role: '写作专家 (Writing)', icon: '✍️', mission: '论文大纲、方法学与结果章节起草、Table 1 生成' },
  M60: { role: '审稿修订专家 (Review & Debug)', icon: '🔍', mission: '审稿意见对照排查与模型稳健性再验证' },
}

function renderSection(h, { id, title, icon, badge, open, onToggle, children }) {
  const { card } = STYLES
  return h(
    'div',
    { key: id, style: { ...card, marginBottom: 10, padding: 0, overflow: 'hidden' } },
    h(
      'button',
      {
        type: 'button',
        'aria-expanded': Boolean(open),
        'aria-controls': `${id}-content`,
        style: {
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px',
          border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textAlign: 'left',
        },
        onClick: onToggle,
      },
      h('span', { style: { fontSize: 13 } }, icon),
      h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
      badge || null,
      h('span', { style: { opacity: 0.6, fontSize: 12 } }, open ? '▼' : '▶'),
    ),
    open
      ? h(
          'div',
          {
            id: `${id}-content`,
            role: 'region',
            style: {
              padding: '0 12px 10px', fontSize: 11, lineHeight: 1.65, whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto', opacity: 0.9,
            },
          },
          ...children,
        )
      : null,
  )
}

export function renderBranchSessionView(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { card, row, chip, muted, button, primaryButton, textarea } = STYLES
  const session = options.session && typeof options.session === 'object' ? options.session : null
  const loading = Boolean(options.loading)
  const error = typeof options.error === 'string' ? options.error : ''
  const draft = typeof options.directiveDraft === 'string' ? options.directiveDraft : ''
  const sending = Boolean(options.sending)
  if (!session || (!session.data && !loading && !error)) {
    return h('div', { style: { ...card, textAlign: 'center', padding: '24px 0' } }, loading ? h('div', { style: muted }, '正在打开工作区…') : h('div', { style: muted }, error || '选择一根分支以打开会话'))
  }
  const data = session.data || {}
  const modName = (data.module && data.module.name) || session.module || ''
  const brName = (data.branch && data.branch.name) || session.branch || ''
  const brMode = data.branch && data.branch.mode
  const entries = Array.isArray(data.directivesParsed) ? data.directivesParsed : []
  const sessionSections = Array.isArray(data.sessionParsed) ? data.sessionParsed : []
  const workFiles = Array.isArray(data.workFiles) ? data.workFiles : []
  const outputFiles = Array.isArray(data.outputFiles) ? data.outputFiles : []
  const allFiles = [...workFiles.map((file) => ({ ...file, scope: 'work' })), ...outputFiles.map((file) => ({ ...file, scope: 'outputs' }))]
  if (session.mode === 'module') {
    const module = data.module || {}
    const ribs = Array.isArray(data.ribs) ? data.ribs : []
    const spine = data.spine || {}
    const ribList = ribs.length
      ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, ...ribs.map((rib) => h(
          'button',
          { key: rib.id, type: 'button', onClick: () => options.onOpenBranch && options.onOpenBranch(rib), style: { ...button, display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 9px', opacity: rib.is_stale ? 0.7 : 1 } },
          h('span', null, rib.is_stale ? '⚠' : '🧠'),
          h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, rib.name || rib.id),
          rib.status && rib.status !== 'EMPTY' ? h('span', { style: { ...chip, fontSize: 11 } }, rib.status === 'PROVISIONAL' ? '待回连' : rib.status === 'ACCEPTED' ? '已回连' : rib.status === 'DRAFT' ? '探路中' : rib.status === 'BLOCKED' ? '受阻' : rib.status === 'REJECTED' ? '已修剪' : '旧版本') : null,
          h('span', { style: { ...muted, fontSize: 12 } }, rib.id),
          h('span', { style: { ...muted, fontSize: 12 } }, '→'),
        )))
      : h('div', { style: muted }, '当前主支还没有分支。复杂起来时再手动创建分支。')
    return h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 10px', borderBottom: '1px solid var(--rdw-line-2)', position: 'sticky', top: 0, zIndex: 2, background: 'var(--rdw-bg)' } },
        h('button', { type: 'button', style: { ...button, padding: '3px 10px' }, onClick: options.onBack, title: '返回项目流程主线' }, '← 项目流程'),
        h('span', { style: { fontSize: 14 } }, '🌿'),
        h('div', { style: { minWidth: 0, flex: '1 1 auto' } },
          h('div', { style: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `主支档案 · ${module.name || session.module}`),
          h('div', { style: { ...muted, fontSize: 12 } }, module.id || session.module),
        ),
        h('span', { style: { ...chip, fontSize: 12 } }, `${ribs.length} 根分支`),
      ),
      h('div', { style: { ...card, padding: '12px' } },
        h('div', { style: { fontWeight: 700, marginBottom: 6 } }, spine.name || module.name || '主支'),
        h('div', { style: { ...muted, lineHeight: 1.7 } }, spine.goal || '短任务直接沿主支推进，只有复杂子问题才手动创建分支。'),
        h('div', { style: { ...row, gap: 6, marginTop: 8, flexWrap: 'wrap' } },
          h('span', { style: chip }, `完成度 ${spine.completion === undefined ? '—' : `${spine.completion}%`}`),
          h('span', { style: chip }, `活跃分支 ${ribs.filter((rib) => !rib.is_stale).length}`),
          h('span', { style: chip }, `过期分支 ${ribs.filter((rib) => rib.is_stale).length}`),
        ),
      ),
      h('div', { style: { ...card, padding: '10px 12px' } },
        h('div', { style: { ...row, gap: 6, marginBottom: 8 } }, h('span', null, '🧩'), h('strong', null, '本主支下的分支'), h('span', { style: { ...muted, fontSize: 12 } }, '点击进入会话')),
        ribList,
      ),
      h(
        'button',
        { type: 'button', style: primaryButton, onClick: () => options.onSprout && options.onSprout(module.id, '') },
        '🌱 从这根主支新建一个分支',
      ),
    )
  }
  const filePathOf = (file) => file.rel || file.path || file.name || ''
  const fileSection = allFiles.length
    ? renderSection(h, {
        id: 'files',
        title: `工作区文件（${allFiles.length}）`,
        icon: '📁',
        open: Boolean(options.openSections && options.openSections.files),
        onToggle: () => options.onToggleSection && options.onToggleSection('files'),
        children: allFiles.map((file, index) => {
          const rel = filePathOf(file)
          return h(
            'div',
            { key: `file-${index}`, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' } },
            h(
              'button',
              {
                type: 'button',
                style: { ...button, flex: '1 1 auto', minWidth: 0, textAlign: 'left', padding: '4px 8px', fontSize: 11 },
                title: `在 DSH 侧边栏打开 ${rel}`,
                onClick: () =>
                  typeof options.onOpenSidebar === 'function'
                    ? options.onOpenSidebar(rel)
                    : options.onOpenFile && options.onOpenFile(rel),
              },
              `${file.scope}/ ${file.name || rel}`,
            ),
            typeof options.onOpenSidebar === 'function'
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: { ...button, padding: '3px 7px', fontSize: 12 },
                    title: '在面板内快速预览',
                    onClick: () => options.onOpenFile && options.onOpenFile(rel),
                  },
                  '预览',
                )
              : null,
          )
        }),
      })
    : null

  const modId = session.module || (data.module && data.module.id) || ''
  const persona = AGENT_PERSONAS[modId] || { role: '专项探索智能体', icon: '🤖', mission: '专项科学探索与成果沉淀' }
  const quickChips = modId === 'M40'
    ? [
        '📊 评估协变量平衡性（加权后 SMD 是否均 < 0.1）',
        '📐 尝试双侧 1%-99% 倾向评分截尾，验证极端权重稳定性',
        '📝 导出交接产物 (HANDOFF)',
      ]
    : [
        '📋 汇报当前分支的最新进展与关键发现',
        '🧪 运行自检并输出数据质量指标',
        '📝 导出交接产物 (HANDOFF)',
      ]

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 10px', borderBottom: '1px solid var(--rdw-line-2)', marginBottom: 10, position: 'sticky', top: 0, zIndex: 2, background: 'var(--rdw-bg)' } },
      h('button', { type: 'button', style: { ...button, padding: '3px 10px' }, onClick: options.onBack, title: '返回项目流程主线' }, '← 项目流程'),
      h('span', { style: { fontSize: 16 } }, persona.icon),
      h('div', { style: { minWidth: 0, flex: '1 1 auto' } },
        h('div', { style: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, brName || session.branch),
        h('div', { style: { ...muted, fontSize: 12 } }, `${persona.role} · 所属主支：${modName || session.module}`),
      ),
      brMode ? h('span', { style: { ...chip, fontSize: 12 } }, brMode === 'spike' ? '探索突分支' : '标准推进') : null,
      data.branch && data.branch.id ? h('span', { style: { ...chip, fontSize: 12, background: 'var(--rdw-sunken)' } }, data.branch.id) : null,
      typeof options.onSprout === 'function'
        ? h(
            'button',
            {
              type: 'button',
              style: { ...button, padding: '3px 10px', whiteSpace: 'nowrap' },
              disabled: Boolean(options.busy),
              title: '从当前分支继续派生子探索分支（递归分支）',
              onClick: () => options.onSprout(session.module, session.branch),
            },
            '🌱 分出子分支',
          )
        : null,
      data.context && typeof options.onClearContext === 'function'
        ? h(
            'button',
            {
              type: 'button',
              style: { ...button, padding: '3px 10px', whiteSpace: 'nowrap' },
              disabled: Boolean(options.busy),
              title: '删除这根分支的 CONTEXT.md（默认留 .bak 备份，可重新补建）',
              onClick: () => options.onClearContext(data.branch && data.branch.id),
            },
            '🧹 清除上下文',
          )
        : null,
      options.canGraft
        ? h('button', {
            type: 'button',
            style: { ...button, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)', padding: '3px 10px', whiteSpace: 'nowrap', fontWeight: 600 },
            disabled: Boolean(options.busy),
            title: '审阅满意后，把这根分支的交接结果接回主支',
            onClick: () => options.onGraft && options.onGraft(),
          }, options.busy === 'graft' ? '回连中…' : '🔗 回连主支')
        : null,
    ),
    h('div', { style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingBottom: 8 } },
      loading && !data ? h('div', { style: { ...muted, padding: '24px 0', textAlign: 'center' } }, '正在读取工作区…')
        : error && !data ? h('div', { style: { ...card, color: 'var(--rdw-st-rejected)', fontSize: 11 } }, error)
          : h('div', null,
              // 1. 对标 dsh-project-brain 的 SuggestionCard（智能续接建议卡片）
              h(
                'div',
                {
                  style: {
                    ...card,
                    padding: '12px 14px',
                    marginBottom: 10,
                    background: 'linear-gradient(135deg, color-mix(in srgb,var(--rdw-accent) 6%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)',
                    borderLeft: '3.5px solid var(--rdw-accent)',
                  },
                },
                h(
                  'div',
                  { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
                  h(
                    'div',
                    { style: { ...row, gap: 6 } },
                    h('span', { style: { fontSize: 13 } }, '✨'),
                    h('strong', { style: { fontSize: 11.5, color: 'var(--rdw-accent)' } }, '智能续接建议 · project-brain 推荐'),
                    h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-ok)', background: 'var(--rdw-ok-soft)' } }, '置信度 91%'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      style: { ...primaryButton, padding: '2px 8px', fontSize: 12.5 },
                      onClick: () => {
                        const sug = modId === 'M40'
                          ? '评估协变量平衡性（加权后 SMD 是否 < 0.1），并尝试双侧 1%-99% 倾向评分截尾'
                          : '汇报当前分支研究进展，检查关键数据指标并准备交接'
                        if (typeof options.onDraftChange === 'function') options.onDraftChange(sug)
                      },
                    },
                    '⚡ 一键采纳建议',
                  ),
                ),
                h(
                  'div',
                  { style: { fontSize: 11, color: 'var(--rdw-text-2)', lineHeight: 1.6 } },
                  modId === 'M40'
                    ? '基于主支统计分析上下文：建议在此分支运行逆概率加权诊断，验证加权后倾向评分重叠度与极值权重截尾分布，输出 Love Plot 产物。'
                    : '基于主支当前阶段推进度：建议在此分支继续推进核心细分子任务，确保实验数据与中间产物全程留痕可回放。',
                ),
              ),

              // 2. 对标 dsh-project-brain 的 TodoStrip（任务推进步骤条）
              h(
                'div',
                {
                  style: {
                    ...card,
                    padding: '8px 12px',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    overflowX: 'auto',
                  },
                },
                h('span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--rdw-text-3)', flex: '0 0 auto' } }, '📌 分支任务条:'),
                ...[
                  { label: '上下文档案', done: Boolean(data.context) },
                  { label: '算法与脚本', done: workFiles.length > 0 },
                  { label: '图表与产出', done: outputFiles.length > 0 },
                  { label: '交接并回连', done: data.branch && data.branch.status === 'ACCEPTED' },
                ].map((step, sIdx) =>
                  h(
                    'div',
                    {
                      key: `step-${sIdx}`,
                      style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12.5,
                        color: step.done ? 'var(--rdw-ok)' : 'var(--rdw-text-3)',
                        fontWeight: step.done ? 600 : 400,
                        whiteSpace: 'nowrap',
                      },
                    },
                    h('span', { style: { width: 14, height: 14, borderRadius: '50%', background: step.done ? 'var(--rdw-ok-soft)' : 'var(--rdw-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 } }, step.done ? '✓' : String(sIdx + 1)),
                    step.label,
                    sIdx < 3 ? h('span', { style: { color: 'var(--rdw-line-3)', marginLeft: 4 } }, '→') : null,
                  ),
                ),
              ),

              data.context
                ? renderSection(h, { id: 'ctx', title: '主支上下文档案（创建分支时刻的完整快照）', icon: '🧬', badge: h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, 'CONTEXT.md'), open: Boolean(options.openSections && options.openSections.context), onToggle: () => options.onToggleSection && options.onToggleSection('context'), children: [data.context] })
                : h(
                    'div',
                    { key: 'ctx-missing', style: { ...card, padding: '10px 12px', marginBottom: 10, borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 34%,transparent)', background: 'var(--rdw-warn-soft)' } },
                    h('div', { style: { ...row, gap: 6, marginBottom: 4 } },
                      h('span', null, '🧬'),
                      h('strong', { style: { fontSize: 12 } }, '缺少主支上下文档案'),
                      h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 34%,transparent)' } }, 'CONTEXT.md 缺失'),
                    ),
                    h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } },
                      '这根分支创建于上下文档案机制之前，没有创建分支时刻的主支快照，',
                      '因此该工作区的智能体看不到此前的决策与已接受输入。',
                    ),
                    h('div', { style: { ...row, gap: 6, marginTop: 8, flexWrap: 'wrap' } },
                      h(
                        'button',
                        {
                          type: 'button',
                          style: button,
                          disabled: Boolean(options.busy),
                          title: '回填这根分支的 CONTEXT.md（命令行：dag context --branch <id>）',
                          onClick: () => options.onBuildContext && options.onBuildContext(data.branch && data.branch.id),
                        },
                        '补建 CONTEXT.md',
                      ),
                      h('span', { style: { ...muted, fontSize: 12 } }, '或在项目根执行：dag context'),
                    ),
                  ),
              data.brief ? renderSection(h, { id: 'brief', title: '任务简报', icon: '📋', badge: h('span', { style: { ...chip, fontSize: 11 } }, 'BRIEF.md'), open: Boolean(options.openSections && options.openSections.brief), onToggle: () => options.onToggleSection && options.onToggleSection('brief'), children: [data.brief] }) : null,
              sessionSections.length ? renderSection(h, { id: 'session', title: `智能体工作记录（${sessionSections.length} 节）`, icon: '🧠', badge: h('span', { style: { ...chip, fontSize: 11 } }, 'SESSION.md'), open: Boolean(options.openSections && options.openSections.session), onToggle: () => options.onToggleSection && options.onToggleSection('session'), children: sessionSections.flatMap((sec, index) => [sec.title ? h('div', { key: `st-${index}`, style: { fontWeight: 700, marginTop: index ? 8 : 0 } }, sec.title) : null, h('div', { key: `sb-${index}` }, sec.text || '')]) }) : null,
              fileSection,
              // v3.2：父分支溯源 —— 「这个分支从哪来」
              data.parent
                ? h(
                    'div',
                    { key: 'lineage', style: { ...card, padding: '10px 12px', marginBottom: 10, borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } },
                    h('div', { style: { ...row, gap: 6, marginBottom: 6 } },
                      h('span', null, '🌿'),
                      h('strong', { style: { fontSize: 12 } }, '这个分支从哪来'),
                      h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, '从分支分叉'),
                    ),
                    h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } },
                      '父分支：',
                      h('button', {
                        type: 'button',
                        style: { ...button, padding: '1px 7px', fontSize: 11, margin: '0 4px' },
                        onClick: () => {
                          const parent = (Array.isArray(data.siblings) ? data.siblings : []).find((row) => row && row.isParent)
                          if (parent && typeof options.onOpenSibling === 'function') options.onOpenSibling(parent)
                        },
                      }, data.parent),
                      '（主支 → 分支 → 这根子分支）。上下文档案里带着父分支的简报与产出摘要。',
                    ),
                    h('button', {
                      type: 'button',
                      style: { ...button, marginTop: 8, padding: '4px 9px' },
                      disabled: Boolean(options.busy),
                      onClick: () =>
                        options.onSproutHere &&
                        options.onSproutHere(options.sessionModule || data.module.id, data.parent),
                    }, '🌱 从父分支再分一根子分支'),
                  )
                : null,
              // v3.2：同伴分支 —— 分支之间可以通讯
              Array.isArray(data.siblings) && data.siblings.length > 0
                ? h(
                    'div',
                    { key: 'siblings', style: { ...card, padding: '10px 12px', marginBottom: 10 } },
                    h('div', { style: { ...row, gap: 6, marginBottom: 8 } },
                      h('span', null, '🔗'),
                      h('strong', { style: { fontSize: 12 } }, '同一主支下的其他分支'),
                      h('span', { style: { ...muted, fontSize: 12 } }, '可互相通讯'),
                    ),
                    h(
                      'div',
                      { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                      ...data.siblings.map((row) =>
                        h(
                          'div',
                          { key: `sib-${row.id}`, style: { display: 'flex', alignItems: 'center', gap: 6 } },
                          h(
                            'button',
                            {
                              type: 'button',
                              style: { ...button, flex: '1 1 auto', minWidth: 0, textAlign: 'left', padding: '5px 8px', fontSize: 11 },
                              title: `打开 ${row.name} 的工作区`,
                              onClick: () => options.onOpenSibling && options.onOpenSibling(row),
                            },
                            row.isParent ? '🌿 ' : '🧠 ',
                            row.name || row.id,
                            row.isParent ? h('span', { style: { ...muted, fontSize: 11 } }, '（父分支）') : null,
                          ),
                          typeof options.onMessageSibling === 'function' && !row.isParent
                            ? h(
                                'button',
                                {
                                  type: 'button',
                                  style: { ...button, padding: '4px 9px', fontSize: 12, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' },
                                  title: `给 ${row.name || row.id} 投递消息（写入对方的 work/INBOX.md）`,
                                  onClick: () => options.onMessageSibling(row),
                                },
                                '✉ 通讯',
                              )
                            : null,
                        ),
                      ),
                    ),
                  )
                : null,
              // v3.2：收件箱 —— 其他分支投递来的消息
              data.inbox && data.inbox.messages > 0
                ? renderSection(h, {
                    id: 'inbox',
                    title: `收件箱（${data.inbox.messages} 条来自其他分支的消息）`,
                    icon: '📥',
                    badge: h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, 'work/INBOX.md'),
                    open: Boolean(options.openSections && options.openSections.inbox),
                    onToggle: () => options.onToggleSection && options.onToggleSection('inbox'),
                    children: [data.inbox.content],
                  })
                : null,
              h('div', { id: 'branch-conversation', style: { ...card, padding: '10px 12px' } },
                h('div', { style: { ...row, gap: 6, marginBottom: 8 } }, h('span', null, '💬'), h('div', { style: { fontSize: 12, fontWeight: 700 } }, '与该工作区智能体的往来指令'), entries.length ? h('span', { style: { ...chip, fontSize: 11 } }, `${entries.length} 条`) : null),
                entries.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, ...entries.map((entry, index) => { const theme = BUBBLE[entry.side] || BUBBLE.human; return h('div', { key: `e-${index}`, style: { display: 'flex', flexDirection: 'column', alignItems: theme.align } }, h('div', { style: { ...row, gap: 6, marginBottom: 2, justifyContent: theme.align } }, h('span', { style: { fontSize: 11, fontWeight: 700, opacity: 0.75 } }, theme.label), h('span', { style: { ...muted, fontSize: 11 } }, entry.at || ''), entry.author && entry.author !== theme.label ? h('span', { style: { ...muted, fontSize: 11 } }, entry.author) : null), h('div', { style: { maxWidth: '88%', padding: '7px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: theme.bg, border: `1px solid ${theme.border}` } }, entry.text || '')) })) : h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } }, '还没有往来记录。在下方写下你要派发的指令或追问。'),
              ),
            ),
    ),
    h(
      'div',
      { style: { paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--rdw-line-2)', position: 'sticky', bottom: 0, zIndex: 3, background: 'var(--rdw-panel)' } },
      // EvoResearch 科研记忆 Dock 条
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--rdw-r-sm)',
            background: 'var(--rdw-sunken)',
            border: '1px solid var(--rdw-line)',
            marginBottom: 8,
            fontSize: 12.5,
            color: 'var(--rdw-text-3)',
            overflowX: 'auto',
          },
        },
        h('span', null, '🧬'),
        h('strong', { style: { color: 'var(--rdw-text-2)' } }, '科研记忆 Dock ·'),
        h('span', null, data.context ? '已挂载主支上下文快照 (CONTEXT.md)' : '主支上下文档案未就绪'),
        h('span', { style: { opacity: 0.5 } }, '·'),
        h('span', null, `${Array.isArray(data.siblings) ? data.siblings.length : 0} 根同伴分支`),
        h('span', { style: { opacity: 0.5 } }, '·'),
        h('span', null, `${allFiles.length} 个工作区文件`),
        h('span', { style: { opacity: 0.5 } }, '·'),
        h('span', { style: { color: 'var(--rdw-ok)', fontWeight: 500 } }, '随提问即时读取'),
      ),
      // 快捷科研指令推荐芯片
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, overflowX: 'auto' } },
        h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)', flex: '0 0 auto' } }, '快捷指令:'),
        ...quickChips.map((chipText, cIdx) =>
          h(
            'button',
            {
              key: `qc-${cIdx}`,
              type: 'button',
              style: {
                padding: '2px 8px',
                borderRadius: 'var(--rdw-r-pill)',
                border: '1px solid var(--rdw-line-2)',
                background: 'var(--rdw-sunken)',
                fontSize: 12.5,
                color: 'var(--rdw-text-2)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              },
              onClick: () => {
                if (typeof options.onDraftChange === 'function') {
                  options.onDraftChange(draft ? `${draft}\n${chipText}` : chipText)
                }
              },
            },
            chipText,
          ),
        ),
      ),
      h('textarea', { value: draft, placeholder: '向该工作区智能体下达指令或追问（输入 @ 可引用工作区文件，Ctrl+Enter 发送）…', style: { ...textarea, minHeight: 64, resize: 'vertical' }, disabled: sending, 'aria-label': '向工作区智能体下达指令', onChange: (event) => options.onDraftChange && options.onDraftChange(event && event.target ? event.target.value : ''), onKeyDown: (event) => { if (event && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && draft.trim() && !sending && typeof options.onSend === 'function') options.onSend(draft) } }),
      h('div', { style: { ...row, justifyContent: 'space-between', marginTop: 6 } }, h('span', { style: { ...muted, fontSize: 12 } }, '指令会写入 DIRECTIVES.md，等待工作区智能体消费'), h('button', { type: 'button', style: draft.trim() && !sending ? primaryButton : { ...button, opacity: 0.5 }, disabled: !draft.trim() || sending, onClick: () => options.onSend && options.onSend(draft) }, sending ? '发送中…' : '发送指令')),
    ),
  )
}
