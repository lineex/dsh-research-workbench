/**
 * 研究项目 DAG 工作台 — 接受/拒绝理由弹层与 v1.1 创建表单弹层（受控，非原生 prompt）。
 *
 * 理由去空白后必须非空才能确认；确认动作由面板传入的 onConfirm 执行。
 * 创建表单按 CREATE_FIELD_SPECS 渲染字段，校验错误由面板以行内文本回传（create.error）。
 */
import { CREATE_ACTIONS, CREATE_FIELD_SPECS, STYLES } from '../core/constants.js'

/**
 * @param {object} h React.createElement
 * @param {{dialog?: object|null, reason?: string, setReason?: Function,
 *          onConfirm?: Function, onCancel?: Function, busy?: string}} props
 */
export function renderReasonDialog(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  if (!options.dialog) return null

  const { row, muted, mono } = STYLES
  const dialog = options.dialog
  const isAccept = dialog.action === 'accept'
  const reason = typeof options.reason === 'string' ? options.reason : ''
  const busy = options.busy || ''
  const fileName = dialog.fileName || dialog.handoff || ''
  const title = `${isAccept ? '接受' : '拒绝'} ${fileName}`
  const canConfirm = reason.trim().length > 0 && reason.trim().length <= 2000 && !busy
  const call = (handler) => {
    if (typeof handler === 'function') handler()
  }

  return h(
    'div',
    { style: STYLES.overlay },
    h(
      'div',
      { style: STYLES.dialog },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
        h('strong', { style: { fontSize: 13 } }, title),
        h(
          'span',
          { style: { ...muted, textAlign: 'right' } },
          isAccept ? '接受后该交接进入 ACCEPTED，成为下游可用结果' : '拒绝后该交接标记 REJECTED，可新建版本',
        ),
      ),
      h('div', { style: { ...mono, opacity: 0.72, marginBottom: 8 } }, dialog.path || dialog.handoff || ''),
      h('textarea', {
        value: reason,
        maxLength: 2000,
        placeholder: isAccept ? '填写接受理由（必填，会写入 DECISIONS.md）' : '填写拒绝理由（必填，会写入 DECISIONS.md）',
        'aria-label': '决定理由',
        onChange: (event) => {
          const value = event && event.target ? event.target.value : ''
          if (typeof options.setReason === 'function') options.setReason(value)
        },
        style: STYLES.textarea,
      }),
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginTop: 10 } },
        h('span', { style: muted }, `${reason.trim().length} / 2000 字`),
        h(
          'div',
          { style: { ...row, gap: 8 } },
          h(
            'button',
            { type: 'button', style: STYLES.button, onClick: () => call(options.onCancel) },
            '取消',
          ),
          h(
            'button',
            {
              type: 'button',
              style: canConfirm ? STYLES.primaryButton : { ...STYLES.button, opacity: 0.5, cursor: 'not-allowed' },
              disabled: !canConfirm,
              onClick: () => {
                if (canConfirm) call(options.onConfirm)
              },
            },
            busy ? '执行中…' : '确认',
          ),
        ),
      ),
    ),
  )
}

/**
 * 创建类动作的受控表单弹层（新建项目 / 新建模块 / 新建分支 / 新建交接）。
 * @param {object} h React.createElement
 * @param {{create?: object|null, busy?: string, onField?: Function,
 *          onConfirm?: Function, onCancel?: Function}} props
 */
export function renderCreateDialog(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const create = options.create
  if (!create) return null

  const { row, muted } = STYLES
  const kind = create.kind
  const specs = Array.isArray(CREATE_FIELD_SPECS[kind]) ? CREATE_FIELD_SPECS[kind] : []
  const values = create.values && typeof create.values === 'object' ? create.values : {}
  const busy = options.busy || ''
  const title = CREATE_ACTIONS[kind] || '新建'
  const canSubmit = !busy
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  const setField = (name, value) => call(options.onField, name, value)

  const fields = specs.map((spec) => {
    const value = values[spec.name] === undefined || values[spec.name] === null ? '' : String(values[spec.name])
    const inputProps = {
      'data-field': spec.name,
      'aria-label': spec.label,
      value,
      placeholder: spec.placeholder || '',
      disabled: Boolean(busy) || Boolean(spec.readonly),
      readOnly: Boolean(spec.readonly),
      onChange: (event) => setField(spec.name, event && event.target ? event.target.value : ''),
      style: spec.multiline
        ? { ...STYLES.textarea, minHeight: 64, width: '100%', boxSizing: 'border-box' }
        : { ...STYLES.input, flex: '1 1 auto', minWidth: 0, width: '100%', boxSizing: 'border-box' },
    }
    const isRootField = spec.name === 'root'
    return h(
      'label',
      { key: spec.name, style: { display: 'block', marginBottom: 8 } },
      h(
        'div',
        { style: { ...muted, opacity: 0.9, marginBottom: 3, fontWeight: 600 } },
        `${spec.label}${spec.required ? ' *' : ''}${spec.readonly ? '（自动带入）' : ''}`,
      ),
      spec.multiline
        ? h('textarea', inputProps)
        : isRootField
          ? h(
              'div',
              { style: { display: 'flex', gap: 6, alignItems: 'center', width: '100%' } },
              h('input', inputProps),
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-browse-folder-btn',
                  title: '点击选择路径文件夹',
                  'aria-label': '选择路径文件夹',
                  disabled: Boolean(busy) || Boolean(spec.readonly),
                  style: {
                    ...STYLES.button,
                    height: 32,
                    padding: '0 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    flex: '0 0 auto',
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: 'var(--rdw-organic-surface, #f7fafc)',
                    border: '1px solid var(--rdw-border, #cbd5e0)',
                    borderRadius: 'var(--rdw-r-pebble-sm, 6px)',
                    color: 'var(--rdw-organic-ink, #2d3748)',
                  },
                  onClick: async (event) => {
                    if (event && event.preventDefault) event.preventDefault()
                    if (event && event.stopPropagation) event.stopPropagation()
                    if (typeof options.onPickFolder === 'function') {
                      const picked = await options.onPickFolder()
                      if (picked && typeof picked === 'string' && picked.trim()) {
                        setField(spec.name, picked.trim())
                      }
                    }
                  },
                },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 13 } }, '📁'),
                '选择文件夹',
              ),
            )
          : h('input', inputProps),
      spec.hint ? h('div', { style: { ...muted, marginTop: 2, opacity: 0.66 } }, spec.hint) : null,
    )
  })

  return h(
    'div',
    { style: STYLES.overlay },
    h(
      'div',
      { style: { ...STYLES.dialog, width: 'min(560px, 94vw)' } },
      h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
        h('strong', { style: { fontSize: 13 } }, title),
        h(
          'span',
          { style: { ...muted, textAlign: 'right' } },
          kind === 'init' ? '初始化新 DAG 项目；成功后保存配置并加载它' : '经宿主白名单调用 research-dag CLI',
        ),
      ),
      create.error ? h('div', { style: { ...STYLES.errorBanner, marginBottom: 8 } }, create.error) : null,
      ...fields,
      h(
        'div',
        { style: { ...row, justifyContent: 'flex-end', marginTop: 10, gap: 8 } },
        h(
          'button',
          { type: 'button', style: STYLES.button, disabled: Boolean(busy), onClick: () => call(options.onCancel) },
          '取消',
        ),
        h(
          'button',
          {
            type: 'button',
            style: canSubmit ? STYLES.primaryButton : { ...STYLES.button, opacity: 0.5, cursor: 'not-allowed' },
            disabled: !canSubmit,
            onClick: () => {
              if (canSubmit) call(options.onConfirm)
            },
          },
          busy ? '创建中…' : '创建',
        ),
      ),
    ),
  )
}
