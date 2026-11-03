/**
 * 研究项目 DAG 工作台 — 主题选择器（v3.9）。
 *
 * 形态：工具栏里的一个胶囊按钮，点开是 6 个主题的预览列表。
 * 每个选项显示「名称 + 一句说明 + 三色预览点」，当前主题打勾。
 *
 * 设计约束：
 *   - 只用 var(--rdw-*)，保证在任何主题下自身也好看；
 *   - 当前主题的三色点取自**该主题自己的**预设色，而不是当前生效令牌，
 *     这样用户在 A 主题下也能看清 B 主题长什么样；
 *   - 点击外部 / Esc 关闭（用遮罩实现，和右键菜单同一套交互语言）。
 */
import { RDW_THEME_PRESETS } from '../core/theme.js'

/** 三色预览点。 */
function swatch(h, colors, active) {
  return h(
    'span',
    {
      style: {
        display: 'inline-flex',
        flex: '0 0 auto',
        borderRadius: 999,
        overflow: 'hidden',
        border: active ? '1.5px solid var(--rdw-sage)' : '1px solid var(--rdw-line-2)',
      },
    },
    ...colors.map((color) =>
      h('span', { style: { width: 9, height: 14, background: color } }),
    ),
  )
}

/**
 * 渲染主题选择器。
 * props: { open, theme, onToggle, onPick }
 */
export function renderThemePicker(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const open = Boolean(options.open)
  const current = String(options.theme || 'apple')
  const call = (handler, ...args) => {
    if (typeof handler === 'function') handler(...args)
  }
  const activePreset = RDW_THEME_PRESETS.find((item) => item.id === current) || RDW_THEME_PRESETS[0]

  return h(
    'div',
    { style: { position: 'relative', flex: '0 0 auto' } },
    h(
      'button',
      {
        type: 'button',
        className: 'rdw-theme-btn',
        title: `主题：${activePreset.name}（点击切换）`,
        'aria-haspopup': 'menu',
        'aria-expanded': open ? 'true' : 'false',
        onClick: (event) => {
          if (event && event.stopPropagation) event.stopPropagation()
          call(options.onToggle)
        },
      },
      h('span', { style: { fontSize: 11 } }, '🎨'),
      swatch(h, activePreset.swatch, false),
    ),
    open
      ? h(
          'div',
          {
            className: 'rdw-theme-mask',
            role: 'presentation',
            onClick: (event) => {
              if (event && event.stopPropagation) event.stopPropagation()
              call(options.onToggle)
            },
          },
          h(
            'div',
            {
              className: 'rdw-theme-pop',
              role: 'menu',
              'aria-label': '选择主题',
              onClick: (event) => event.stopPropagation(),
            },
            h('div', { className: 'rdw-theme-pop-title' }, '主题'),
            ...RDW_THEME_PRESETS.map((preset) => {
              const isActive = preset.id === current
              return h(
                'button',
                {
                  key: preset.id,
                  type: 'button',
                  role: 'menuitemradio',
                  'aria-checked': isActive ? 'true' : 'false',
                  className: isActive ? 'rdw-theme-item is-active' : 'rdw-theme-item',
                  onClick: () => call(options.onPick, preset.id),
                },
                swatch(h, preset.swatch, isActive),
                h(
                  'span',
                  { style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: '1 1 auto' } },
                  h('span', { className: 'rdw-theme-item-name' }, preset.name),
                  h('span', { className: 'rdw-theme-item-hint' }, preset.hint),
                ),
                isActive ? h('span', { className: 'rdw-theme-check', 'aria-hidden': 'true' }, '✓') : null,
              )
            }),
          ),
        )
      : null,
  )
}
