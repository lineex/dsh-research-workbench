/**
 * 研究项目 DAG 工作台 — 紧凑工具栏（标题行 + 页签行）。
 *
 * 整页业务优先布局下，这一块是宿主的紧凑工具栏（headerLayout: 'compact'），
 * 因此第一行只放品牌标识、标题、状态与「打开/收起对话」，第二行放页签。
 * 交互控件统一带 data-dsh-no-drag，避免在 macOS 上被当成窗口拖拽区。
 *
 * v3.4：颜色全部走 --rdw-* 令牌；页签改用胶囊 + 语义色的「双通道」选中态
 * （淡色底 + 同色描边），色弱用户也能分辨当前页签。
 */
import { STYLES, VIEWS, WELCOME_COPY, phaseLabel } from '../core/constants.js'
import { renderThemePicker } from './ThemePicker.js'

/**
 * @param {object} h React.createElement
 * @param {{health?: object, project?: object, view?: string, setView?: Function,
 *          busy?: string, busyLabel?: string, contentAvailable?: boolean,
 *          fishboneAvailable?: boolean, chatOpen?: boolean, canStartChat?: boolean,
 *          onToggleChat?: Function, scope?: string,
 *          theme?: string, themeOpen?: boolean, onToggleTheme?: Function, onPickTheme?: Function}} props
 */
export function renderHeader(h, props) {
  const options = props && typeof props === 'object' ? props : {}
  const { row, chip, subtitle, tab, tabActive, button } = STYLES
  const health = options.health && typeof options.health === 'object' ? options.health : null
  const project = options.project && typeof options.project === 'object' ? options.project : null
  const view = options.view || 'fishbone'
  const busy = options.busy || ''
  const busyLabel = options.busyLabel || busy
  const chatOpen = options.chatOpen === true

  /** 状态胶囊：底色 + 描边同色（形状与颜色双编码）。 */
  const toneChip = (text, tone) =>
    h(
      'span',
      {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 21,
          padding: '0 9px',
          borderRadius: 'var(--rdw-r-pill)',
          fontSize: 11,
          fontWeight: 500,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
          border: '1px solid color-mix(in srgb,' + tone + ' 26%,transparent)',
          background: 'color-mix(in srgb,' + tone + ' 12%,transparent)',
          color: tone,
        },
      },
      text,
    )

  const projectChip = project && project.id ? h('span', { style: chip }, `项目 ${project.id}`) : null
  const phaseChip = project && project.id
    ? toneChip(`阶段 ${project && project.phase ? phaseLabel(project.phase) : '未设置'}`, 'var(--rdw-accent)')
    : null
  const versionChip =
    health && health.version ? h('span', { style: chip }, `宿主 v${health.version}`) : null
  const fishboneChip =
    options.fishboneAvailable
      ? toneChip('项目流程主线已启用', 'var(--rdw-ok)')
      : toneChip('旧宿主', 'var(--rdw-warn)')
  const busyChip = busy ? toneChip(`执行中：${busyLabel}`, 'var(--rdw-warn)') : null

  const chatButton = null

  const scopeText = typeof options.scope === 'string' ? options.scope : ''

  return h(
    'div',
    null,
    h(
      'div',
      { className: 'rdw-toolbar-row' },
      h(
        'h2',
        { className: 'rdw-toolbar-title' },
        h('span', { className: 'rdw-toolbar-brand', 'aria-hidden': 'true' }, '📋'),
        '研究项目工作台',
        h(
          'a',
          {
            href: 'https://github.com/lineex',
            target: '_blank',
            rel: 'noreferrer',
            title: '作者 GitHub 主页: @lineex',
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
              marginLeft: 6,
              cursor: 'pointer',
            },
          },
          h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, 'by'),
          h('span', { style: { color: 'var(--rdw-text)', fontWeight: 600 } }, '@lineex'),
        ),
      ),
      h(
        'div',
        { className: 'rdw-toolbar-actions' },
        busyChip,
        fishboneChip,
        versionChip,
        phaseChip,
        projectChip,
        chatButton,
        // v3.9 主题选择器（放在最右，避免打散状态胶囊的阅读顺序）
        renderThemePicker(h, {
          open: options.themeOpen === true,
          theme: options.theme || 'apple',
          onToggle: options.onToggleTheme,
          onPick: options.onPickTheme,
        }),
      ),
    ),
    h(
      'p',
      { className: 'rdw-subtitle' },
      view === 'hub'
        ? '多项目总览总控看板：集中管理你的全部科研项目，点击卡片直接进入，支持跨项目共享分析成果、队列定义与研究想法。'
        : '项目流程主线：项目目标是研究目标，主支是研究阶段，分支是手动分出的探索智能体，满意后回连主支。',
    ),
    h(
      'div',
      { className: 'rdw-tabs', role: 'tablist', 'data-dsh-no-drag': '' },
      ...VIEWS.map(([id, label]) =>
        h(
          'button',
          {
            key: id,
            type: 'button',
            role: 'tab',
            'aria-selected': view === id ? 'true' : 'false',
            style: view === id ? { ...tab, ...tabActive } : tab,
            onClick: () => {
              if (typeof options.setView === 'function') options.setView(id)
            },
          },
          id === 'fishbone' ? `📋 ${label}` : id === 'hub' ? `🗂️ ${label}` : id === 'leader' ? `🧠 ${label}` : label,
        ),
      ),
      scopeText ? h('span', { className: 'rdw-scope' }, scopeText) : null,
    ),
  )
}
