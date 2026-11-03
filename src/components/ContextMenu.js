/**
 * 研究项目 DAG 工作台 — v3.5 全局右键菜单 + 悬停速览卡。
 *
 * 设计契约（DESIGN-workbench.md §7A）：
 *   - 万物皆可右键：六类对象各有菜单；不可用项置灰并给原因，不隐藏；
 *   - 菜单 = 该对象此刻合法操作的全集；
 *   - Esc / 点遮罩关闭；↑↓ 导航、Enter 执行；
 *   - 贴视口边自动翻转。
 */

/** 构建一个菜单项。kind: 'item'|'sep'|'sub'。 */
export function mi(icon, label, kbd, run, opts = {}) {
  return { kind: 'item', icon, label, kbd, run, disabled: opts.disabled || false, reason: opts.reason || '', danger: opts.danger === true }
}
export function sep() {
  return { kind: 'sep' }
}
export function sub(text) {
  return { kind: 'sub', text }
}

/**
 * 渲染右键菜单。
 * state: null | { x, y, items: [], title? }
 */
export function renderContextMenu(h, state, onClose) {
  if (!state || !Array.isArray(state.items) || state.items.length === 0) return null

  const MENU_W = 240
  const ITEM_H = 30
  const estH = state.items.length * ITEM_H + (state.title ? 30 : 12)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  let x = state.x
  let y = state.y
  if (x + MENU_W > vw - 8) x = Math.max(8, vw - MENU_W - 8)
  if (y + estH > vh - 8) y = Math.max(8, vh - estH - 8)

  return h(
    'div',
    {
      className: 'rdw-ctxmask',
      role: 'presentation',
      'data-dsh-no-drag': '',
      onClick: onClose,
      onContextMenu: (e) => {
        e.preventDefault()
        onClose()
      },
    },
    h(
      'div',
      {
        className: 'rdw-ctxmenu',
        role: 'menu',
        'aria-label': state.title || '上下文菜单',
        style: { left: x, top: y },
        onClick: (e) => e.stopPropagation(),
      },
      state.title ? h('div', { className: 'rdw-ctx-sub', style: { paddingTop: 6, fontWeight: 600 } }, state.title) : null,
      ...state.items.map((item, idx) => {
        if (!item) return null
        if (item.kind === 'sep') return h('div', { key: `s${idx}`, className: 'rdw-ctx-sep' })
        if (item.kind === 'sub') return h('div', { key: `sub${idx}`, className: 'rdw-ctx-sub' }, item.text)
        return h(
          'button',
          {
            key: `i${idx}`,
            type: 'button',
            className: 'rdw-ctx-item',
            role: 'menuitem',
            disabled: Boolean(item.disabled),
            title: item.disabled && item.reason ? item.reason : item.label,
            onClick: () => {
              onClose()
              if (typeof item.run === 'function') item.run()
            },
          },
          h('span', { className: 'rdw-ctx-ico', 'aria-hidden': 'true' }, item.icon || ''),
          h('span', { className: 'rdw-ctx-label', style: item.danger ? { color: 'var(--rdw-st-rejected)' } : null }, item.label),
          item.kbd ? h('span', { className: 'rdw-ctx-kbd' }, item.kbd) : null,
        )
      }),
    ),
  )
}

/**
 * 渲染分支悬停速览卡。
 * card: null | { x, y, rib, module, onOpen, onGraft, onDelete, onBlock }
 */
export function renderHoverCard(h, card, onClose) {
  if (!card || !card.rib) return null
  const rib = card.rib
  const W = 264
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  let x = card.x
  if (x + W > vw - 10) x = Math.max(10, vw - W - 10)
  const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
  const STATUS_LABEL = {
    EMPTY: '未开工', DRAFT: '探路中', PROVISIONAL: '待回连',
    ACCEPTED: '已回连', REJECTED: '已修剪', SUPERSEDED: '旧版本', BLOCKED: '受阻',
  }
  return h(
    'div',
    {
      className: 'rdw-hovercard',
      style: { left: x, top: card.y },
      role: 'tooltip',
      'data-dsh-no-drag': '',
      onMouseLeave: onClose,
    },
    h(
      'div',
      { className: 'rdw-hovercard-title' },
      h('span', null, rib.id),
      h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontWeight: 400 } }, '·'),
      h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, rib.name),
      h(
        'span',
        { style: { flex: '0 0 auto', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
        STATUS_LABEL[rib.status] || rib.status,
      ),
    ),
    h(
      'div',
      { className: 'rdw-hovercard-meta' },
      `${card.module ? `${card.module.name || card.module.id} · ` : ''}${fileCount} 个产物${rib.is_stale ? ' · ⚠ 级联过期' : ''}${rib.blockedNote ? ` · ⊘ ${rib.blockedNote}` : ''}`,
    ),
    rib.brief ? h('div', { className: 'rdw-hovercard-brief' }, rib.brief) : null,
    h(
      'div',
      { className: 'rdw-hovercard-acts' },
      h('button', { type: 'button', onClick: () => card.onOpen && card.onOpen(rib) }, '打开'),
      rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
        ? h('button', { type: 'button', className: 'primary', onClick: () => card.onGraft && card.onGraft(rib) }, '回连')
        : null,
      h('button', { type: 'button', onClick: () => card.onDelete && card.onDelete(rib) }, '删除'),
    ),
  )
}

/**
 * 内联闪电分叉气泡（幻影分支单击后弹出，只填名称）。
 * form: null | { x, y, moduleId, moduleName, fromRib?, name, error }
 */
export function renderInlineSprout(h, form, onChange, onSubmit, onCancel) {
  if (!form) return null
  return h(
    'div',
    {
      className: 'rdw-inline-sprout',
      style: { left: form.x, top: form.y },
      role: 'dialog',
      'aria-label': '在此分叉新分支',
      'data-dsh-no-drag': '',
      onClick: (e) => e.stopPropagation(),
    },
    h(
      'div',
      { style: { fontSize: 12, fontWeight: 600, color: 'var(--rdw-organic-ink)', marginBottom: 5 } },
      `🌱 在「${form.moduleName || form.moduleId}」${form.fromRib ? `的分支 ${form.fromRib} ` : ''}分叉`,
    ),
    form.messageExcerpt
      ? h(
          'div',
          {
            style: {
              fontSize: 11,
              color: 'var(--rdw-organic-ink-3)',
              padding: '3px 6px',
              background: 'var(--rdw-fill-quat)',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              marginBottom: 6,
              maxHeight: 48,
              overflow: 'hidden',
              lineHeight: 1.35,
              fontStyle: 'italic',
            },
          },
          `源对话：“${form.messageExcerpt.slice(0, 60)}${form.messageExcerpt.length > 60 ? '…' : ''}”`,
        )
      : null,
    h('input', {
      autoFocus: true,
      value: form.name || '',
      placeholder: '新分支名称，回车即建…',
      'aria-label': '分支名称',
      onChange: (e) => onChange(e && e.target ? e.target.value : ''),
      onKeyDown: (e) => {
        if (!e) return
        if (e.key === 'Enter') onSubmit()
        else if (e.key === 'Escape') onCancel()
      },
    }),
    form.error ? h('div', { style: { fontSize: 11, color: 'var(--rdw-st-rejected)', marginTop: 4 } }, form.error) : null,
    h('div', { className: 'hint' }, '回车创建 · Esc 取消 · 详细选项走顶栏「+分支」'),
    h(
      'div',
      { className: 'row' },
      h('button', { type: 'button', className: 'solid', onClick: onSubmit }, '创建'),
      h('button', { type: 'button', onClick: onCancel }, '取消'),
    ),
  )
}
