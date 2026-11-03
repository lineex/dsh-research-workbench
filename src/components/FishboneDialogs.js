/**
 * 研究项目 DAG 工作台 — 项目流程操作弹窗（创建分支 / 回连 / 主支维护）。
 *
 * - renderSproutDialog：从主支任意节点长出一根新分支（dag sprout）
 * - renderGraftDialog：把一根满意的分支验收并回连主支（dag graft）
 * - renderModuleDialog：新增 / 重命名主支（v3.9，主支自身的维护入口）
 */
import { STYLES, FREE_ID_HINT, isValidNodeId } from '../core/constants.js'

/**
 * 主支维护弹窗：新增一个主支，或重命名已有主支。
 *
 * 「新增」要落盘（modules/<id> 目录 + BRIEF），走 module-add；
 * 「重命名」只改工作台偏好名，不动协议文件。
 */
export function renderModuleDialog(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { row, muted, button, primaryButton, input, errorBanner, dialog, overlay } = STYLES
  const dialogState = options.dialog
  if (!dialogState) return null
  const busy = Boolean(options.busy)
  const isAdd = dialogState.mode === 'add'
  const id = String(dialogState.id || '')
  const name = String(dialogState.name || '')
  // 新增时才校验 id；重命名沿用已有 id，只改名字。
  const idOk = !isAdd || isValidNodeId(id.trim())
  const canSubmit = idOk && (isAdd ? id.trim().length > 0 : true) && name.trim().length > 0 && !busy
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  return h(
    'div',
    { style: overlay, role: 'presentation' },
    h(
      'div',
      { style: { ...dialog, width: 'min(480px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': isAdd ? '新增主支' : '重命名主支' },
      h('strong', { style: { fontSize: 14 } }, isAdd ? '🌿 新增主支' : '✏️ 重命名主支'),
      h(
        'div',
        { style: { ...muted, margin: '4px 0 10px', lineHeight: 1.6 } },
        isAdd
          ? '主支是项目流程上的研究阶段。新增会在项目 modules/ 下建目录与阶段简介，并出现在左侧主支列表最末。'
          : '重命名只改工作台上的显示名，不改协议文件里的模块名与目录。',
      ),
      dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
      isAdd
        ? h(
            'div',
            { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '主支 id'),
            h('input', {
              style: { ...input, fontFamily: 'var(--rdw-font-mono)' },
              value: id,
              placeholder: '例如 M70 / stage-5',
              disabled: busy,
              onInput: (e) => call(options.onField, 'id', e.target.value),
            }),
            h('div', { style: { ...muted, fontSize: 11, marginTop: 3 } }, FREE_ID_HINT || '字母数字与 - _ .，首尾不能是 - 或 .'),
            id.trim() && !idOk
              ? h('div', { style: { ...muted, fontSize: 11, color: 'var(--rdw-danger)', marginTop: 3 } }, 'id 格式不合法')
              : null,
          )
        : null,
      h(
        'div',
        { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '显示名'),
        h('input', {
          style: input,
          value: name,
          placeholder: '例如 统计分析',
          disabled: busy,
          onInput: (e) => call(options.onField, 'name', e.target.value),
        }),
      ),
      h(
        'div',
        { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
        h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
        h(
          'button',
          {
            type: 'button',
            style: canSubmit ? primaryButton : { ...button, opacity: 0.5 },
            disabled: !canSubmit,
            onClick: () => {
              if (canSubmit) call(options.onConfirm)
            },
          },
          busy ? '处理中…' : isAdd ? '新增主支' : '保存',
        ),
      ),
    ),
  )
}

/** 创建分支弹窗：选择主支节点 + 分支 id / 显示名 / 任务意图 / 模式。 */
export function renderSproutDialog(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { row, muted, button, primaryButton, input, select, textarea, errorBanner, dialog, overlay } = STYLES
  const dialogState = options.dialog
  if (!dialogState) return null
  const busy = Boolean(options.busy)
  const spine = Array.isArray(options.spine) ? options.spine : []
  const moduleId = String(dialogState.module || '')
  const branchId = String(dialogState.id || '')
  const name = String(dialogState.name || '')
  const prompt = String(dialogState.prompt || '')
  const mode = String(dialogState.mode || 'standard')
  // v3.2：从哪根分支分出（空 = 从主支分）
  const parentRib = String(dialogState.from || '')
  // 可选父分支：同一主支下的分支
  const parentOptions = (Array.isArray(options.parents) ? options.parents : []).filter(
    (row) => row && row.module === moduleId,
  )
  const idOk = branchId.trim().length === 0 || isValidNodeId(branchId.trim())
  const canSubmit = Boolean(moduleId) && branchId.trim().length > 0 && idOk && !busy
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  return h(
    'div',
    { style: overlay, role: 'presentation' },
    h(
      'div',
      { style: { ...dialog, width: 'min(560px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': '新建一个分支' },
      h('strong', { style: { fontSize: 14 } }, '🌱 新建一个分支'),
      h(
        'div',
        { style: { ...muted, margin: '4px 0 10px', lineHeight: 1.6 } },
        '默认从**主支**分出，自动带上主支到此为止的完整上下文（决策 / 已接受输入 / 下一步）。',
        h('br'),
        '如果这个子问题是某根已有分支的延续，也可以选择从那个分支分出（子分支会继承父分支的简报与产出摘要）。',
      ),
      dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
      // v3.2：从主支分 / 从某根分支分
      h(
        'div',
        { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '从哪里分出来'),
        h(
          'select',
          {
            value: parentRib,
            style: { ...select, width: '100%' },
            disabled: busy,
            'aria-label': '选择父分支（留空 = 从主支分）',
            onChange: (event) => call(options.onField, 'from', event && event.target ? event.target.value : ''),
          },
          h('option', { value: '' }, '🌿 从主支分（默认，带主支完整上下文）'),
          ...parentOptions.map((row) =>
            h('option', { key: row.id, value: row.id }, `🧠 从分支 ${row.name || row.id} 分（继承父分支上下文）`),
          ),
        ),
        h(
          'div',
          { style: { ...muted, fontSize: 12, marginTop: 3, lineHeight: 1.6 } },
          parentRib ? '这根子分支的 CONTEXT.md 会包含父分支的简报与产出摘要。' : '这个分支的 CONTEXT.md 会打包主支的完整快照。',
        ),
      ),
      h(
        'div',
        { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '挂在主支哪一段'),
        h(
          'select',
          {
            value: moduleId,
            style: { ...select, width: '100%' },
            disabled: busy,
            onChange: (event) => call(options.onField, 'module', event && event.target ? event.target.value : ''),
          },
          h('option', { value: '' }, '请选择模块…'),
          ...spine.map((node) =>
            h('option', { key: node.id, value: node.id }, `${node.name}（${node.id} · 已有 ${(node.ribs || []).length} 根）`),
          ),
        ),
      ),
      h(
        'div',
        { style: { ...row, gap: 8, marginBottom: 10, flexWrap: 'nowrap' } },
        h(
          'div',
          { style: { flex: '1 1 0', minWidth: 0 } },
          h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '分支 id'),
          h('input', {
            value: branchId,
            placeholder: 'spline-opt',
            style: { ...input, width: '100%', flex: 'initial', minWidth: 0 },
            disabled: busy,
            onChange: (event) => call(options.onField, 'id', event && event.target ? event.target.value : ''),
          }),
          h(
            'div',
            { style: { ...muted, marginTop: 2, color: idOk ? undefined : 'var(--rdw-st-rejected)' } },
            idOk ? FREE_ID_HINT : '只能字母/数字/点/下划线/连字符，且不能以 . 或 - 结尾',
          ),
        ),
        h(
          'div',
          { style: { flex: '1 1 0', minWidth: 0 } },
          h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '显示名（可选）'),
          h('input', {
            value: name,
            placeholder: '乳酸样条拟合',
            style: { ...input, width: '100%', flex: 'initial', minWidth: 0 },
            disabled: busy,
            onChange: (event) => call(options.onField, 'name', event && event.target ? event.target.value : ''),
          }),
        ),
      ),
      h(
        'div',
        { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '这个分支要解决什么'),
        h('textarea', {
          value: prompt,
          placeholder: '例如：测试 3 节点限制性三次样条能否把入科乳酸 SMD 压到 0.05 以下',
          style: { ...textarea, minHeight: 70 },
          disabled: busy,
          onChange: (event) => call(options.onField, 'prompt', event && event.target ? event.target.value : ''),
        }),
        h('div', { style: { ...muted, marginTop: 2 } }, '会写入该分支的 BRIEF.md 顶部，作为智能体的任务意图。'),
      ),
      h(
        'div',
        { style: { marginBottom: 12 } },
        h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '工作模式'),
        h(
          'div',
          { style: { ...row, gap: 6 } },
          ...[
            ['standard', '标准', '完整 6 节简报，正式产出与文件交付'],
            ['spike', '探索', '轻量 2 节简报，允许空文件清单，适合先摸底'],
          ].map(([value, label, hint]) =>
            h(
              'button',
              {
                key: value,
                type: 'button',
                style: mode === value ? { ...primaryButton, flex: '1 1 0' } : { ...button, flex: '1 1 0', textAlign: 'left' },
                disabled: busy,
                title: hint,
                onClick: () => call(options.onField, 'mode', value),
              },
              `${mode === value ? '● ' : '○ '}${label}`,
            ),
          ),
        ),
        h('div', { style: { ...muted, marginTop: 3 } }, mode === 'spike' ? '探索模式：轻装上阵，先探明边界再决定是否正式立项。' : '标准模式：完整交付物与文件哈希清单。'),
      ),
      h(
        'div',
        { style: { marginBottom: 12 } },
        h(
          'button',
          {
            type: 'button',
            style: {
              ...row,
              gap: 6,
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11,
              padding: 0,
              textAlign: 'left',
            },
            disabled: busy,
            title: '勾选后：本次只建分支目录、BRIEF 与主支上下文档案，不创建交接骨架（handoff）——适合纯探索，有产出后再补',
            onClick: () => call(options.onField, 'noHandoff', !dialogState.noHandoff),
          },
          h('span', null, dialogState.noHandoff ? '☑' : '☐'),
          h('span', { style: { fontWeight: dialogState.noHandoff ? 600 : 400 } }, '暂不建交接（先探索，有产出再 handoff new）'),
        ),
        h(
          'div',
          { style: { ...muted, marginTop: 3 } },
          dialogState.noHandoff
            ? '已选：本次创建分支只长出分支不建交接；CONTEXT.md 仍会打包主支完整上下文。'
            : '默认：创建分支同时建好交接骨架（HANDOFF-v1），智能体可直接填报提交。',
        ),
      ),
      h(
        'div',
        { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
        h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
        h(
          'button',
          {
            type: 'button',
            style: canSubmit ? primaryButton : { ...button, opacity: 0.5 },
            disabled: !canSubmit,
            onClick: () => {
              if (canSubmit) call(options.onConfirm)
            },
          },
          busy ? '创建分支中…' : '长出这个分支',
        ),
      ),
    ),
  )
}

/** 回连弹窗：确认验收一根分支并把成果并入主支。 */
export function renderGraftDialog(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { row, muted, button, primaryButton, textarea, errorBanner, dialog, overlay, chip } = STYLES
  const dialogState = options.dialog
  if (!dialogState || !dialogState.rib) return null
  const busy = Boolean(options.busy)
  const rib = dialogState.rib
  const reason = String(dialogState.reason || '')
  const status = String(rib.status || 'EMPTY')
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  const hasStream = Boolean(rib.stream)
  return h(
    'div',
    { style: overlay, role: 'presentation' },
    h(
      'div',
      { style: { ...dialog, width: 'min(520px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': '回连主支' },
      h('strong', { style: { fontSize: 14 } }, '🔗 把这根分支回连主支'),
      h(
        'div',
        { style: { ...row, gap: 6, margin: '6px 0 10px' } },
        h('span', { style: { fontWeight: 600 } }, rib.name),
        h('span', { style: { ...chip, fontSize: 12 } }, rib.module),
        h('span', { style: { ...chip, fontSize: 12 } }, status === 'PROVISIONAL' ? '待回连' : status),
      ),
      h(
        'div',
        { style: { ...muted, marginBottom: 10, lineHeight: 1.65 } },
        hasStream
          ? '回连会校验正文与文件哈希、把状态提升为已接受、把产物投影到主支稳定路径，并记录一条决策日志。'
          : '这根分支还没有交接文件，无法回连。先让智能体产出成果并提交，再来验收。',
      ),
      dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
      hasStream
        ? h(
            'div',
            { style: { marginBottom: 12 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '满意理由（会写进决策日志）'),
            h('textarea', {
              value: reason,
              placeholder: '例如：样条拟合把乳酸 SMD 压到 0.041，模型稳健，主分析采用',
              style: { ...textarea, minHeight: 64 },
              disabled: busy,
              onChange: (event) => call(options.onField, 'reason', event && event.target ? event.target.value : ''),
            }),
          )
        : null,
      h(
        'div',
        { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
        h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
        h(
          'button',
          {
            type: 'button',
            style: hasStream && !busy ? primaryButton : { ...button, opacity: 0.5 },
            disabled: !hasStream || busy,
            onClick: () => {
              if (hasStream && !busy) call(options.onConfirm)
            },
          },
          busy ? '回连中…' : '确认回连主支',
        ),
      ),
    ),
  )
}
