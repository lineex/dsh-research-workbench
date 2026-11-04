/**
 * 研究项目 DAG 工作台 — 客户端入口（DSH Desktop 工作台协议 + 旧槽位兼容）。
 *
 * 规范：https://dshdesktop.com/workbench/docs/development.md 第 3.5 节
 *   - 客户端必须是已构建好的单文件，通过 window.__ModuleLoader__.load 注册；
 *   - 业务面板优先通过 ctx.desktopWorkbenches.register({ title, repository, ... }) 注册；
 *   - register() 不填 id（工作台身份由 repository 解析为 owner/repo）。
 *
 * 布局（规范第 4 节）：
 *   - customFrame: true → 工作台自己撑满业务区，并自己安置宿主传入的原生会话节点；
 *     没有关联会话时业务页占满整屏，不会出现宿主的通用「先建会话」引导。
 *   - headerLayout: 'compact' → 使用宿主的紧凑顶部栏（避免与工作台工具栏重复），
 *     因此面板内必须且只能有一个 data-dsh-workbench-toolbar 元素。
 *   - layout 仍保留（businessSide / businessWidth），作为宿主不支持整页框架时的
 *     标准分栏兜底，与规范 4.1 的取值一致。
 *
 * 兼容说明：
 *   宿主若未提供 `desktopWorkbenches` 服务（旧版 Desktop），退回旧的 slots 注册
 *   （main 面板 + sidebar.panellist 图标），业务功能与交互完全不变。
 *   两个分支注册的是同一个 WorkbenchPanel 组件。
 */
import { createWorkbenchPanel } from './WorkbenchPanel.js'

/** 侧栏图标（DAG 节点示意）。 */
export function WorkbenchIcon(React) {
  const h = React.createElement
  return function Icon() {
    return h(
      'svg',
      { viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': true, fill: 'none' },
      h('rect', { x: 3, y: 3, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
      h('rect', { x: 15, y: 3, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
      h('rect', { x: 9, y: 15, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
      h('path', {
        d: 'M9 6h6M6 9v3a3 3 0 0 0 3 3h3M18 9v3a3 3 0 0 1-3 3h-3',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    )
  }
}

/** 旧槽位协议用的面板 id（保持与历史一致，避免宿主侧引用断裂）。 */
const PANEL_KEY = 'research-dag-workbench'

/** 工作台身份：规范 GitHub URL（小写 owner/repo）。 */
const REPOSITORY = 'https://github.com/zhuanz/research-dag-workbench'

const TITLE = '研究项目 DAG 工作台'
const DESCRIPTION =
  '项目流程式研究项目工作台：项目目标=研究目标，主支=研究阶段，分支=按需手动分出的探索智能体（默认带主支完整上下文，可从其他分支分叉，分支之间可通讯）；成果满意后一键回连主支。'

/** 创建 Cordis 客户端插件描述。 */
export function createClientPlugin(React) {
  const BusinessPanel = createWorkbenchPanel(React)
  const Icon = WorkbenchIcon(React)

  /**
   * v3.14 渲染错误边界。
   *
   * 背景（真实故障）：面板内部任何一次渲染异常（旧数据字段缺失、宿主旧版返回结构变化等）
   * 都会让 React 卸载整棵树 → 用户看到的是「工作台崩溃 / 白屏」，连错误信息也看不到。
   * 这里把业务面板整体包住：出错时只把**这块面板**替换成可恢复提示卡，
   * 其余界面、会话与数据都不受影响，并且把真实错误显示出来便于定位。
   *
   * 注意：错误边界必须是 class，而部分宿主/验收脚本用的是精简 React shim，没有
   * `React.Component`。所以用工厂做条件构造——不支持时返回 null，调用方直接渲染面板，
   * 绝不在模块加载期就 `extends undefined` 把整个插件打崩。
   */
  const createPanelErrorBoundary = (ReactImpl) => {
    // 只认「真 React」：它的 Component.prototype 带 isReactComponent 标记。
    // 精简 shim（验收脚本 / 旧宿主）即便有 Component 也不具备错误边界语义，
    // 套上去只会把面板渲染成空——所以宁可不用，保证面板正常显示。
    if (!ReactImpl || typeof ReactImpl.Component !== 'function') return null
    const proto = ReactImpl.Component.prototype
    if (!proto || !proto.isReactComponent) return null
    return class PanelErrorBoundary extends ReactImpl.Component {
      constructor(props) {
        super(props)
        this.state = { error: null, info: '' }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        this.setState({ info: (info && info.componentStack) || '' })
        try {
          // eslint-disable-next-line no-console
          console.error('[research-dag-workbench] 面板渲染崩溃：', error, info)
        } catch {
          /* ignore */
        }
      }

      render() {
        const { error, info } = this.state
        if (!error) return this.props.children
        const message = (error && (error.message || String(error))) || '未知错误'
        return ReactImpl.createElement(
          'div',
          {
            className: 'rdw-panel',
            style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' },
          },
          ReactImpl.createElement(
            'div',
            { style: { fontSize: 15, fontWeight: 700, color: 'var(--rdw-st-rejected)' } },
            '工作台这一块渲染出错（其它界面和数据未受影响）',
          ),
          ReactImpl.createElement(
            'div',
            { style: { fontSize: 12, lineHeight: 1.6, color: 'var(--rdw-organic-ink-2)' } },
            message,
          ),
          ReactImpl.createElement(
            'div',
            { style: { display: 'flex', gap: 8 } },
            ReactImpl.createElement(
              'button',
              {
                type: 'button',
                className: 'rdw-organic-btn',
                style: { padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
                onClick: () => this.setState({ error: null, info: '' }),
              },
              '重试渲染',
            ),
            ReactImpl.createElement(
              'button',
              {
                type: 'button',
                className: 'rdw-organic-btn',
                style: { padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
                onClick: () => {
                  try {
                    if (typeof location !== 'undefined') location.reload()
                  } catch {
                    /* ignore */
                  }
                },
              },
              '重新载入页面',
            ),
          ),
          info
            ? ReactImpl.createElement(
                'pre',
                {
                  style: {
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    opacity: 0.75,
                    maxHeight: 220,
                    overflow: 'auto',
                    margin: 0,
                  },
                },
                String(info).slice(0, 2000),
              )
            : null,
        )
      }
    }
  }

  const PanelErrorBoundary = createPanelErrorBoundary(React)

  /** 用错误边界包一层，保持原有的 props 传递；宿主不支持 class 时直接渲染面板。 */
  function GuardedPanel(props) {
    const panel = React.createElement(BusinessPanel, props)
    if (!PanelErrorBoundary) return panel
    return React.createElement(PanelErrorBoundary, null, panel)
  }

  /**
   * 注册时选组件：只有「真 React」才套错误边界。
   *
   * 为什么要区分：验收脚本/旧宿主用的是精简 React shim，它的 createElement 对
   * 「函数组件再 createElement 子组件」这条路径支持不完整，套一层就会把整页渲染成空
   * （实测 layout 验收 70 项通过掉到 38 项）。真 React 有 `version` 字符串，shim 没有。
   * 所以：真 React → 套边界（异常不白屏）；其它 → 原样注册（保证正常渲染）。
   */
  const isRealReact = Boolean(React && typeof React.version === 'string' && /^\d+\./.test(React.version))
  const RegisteredPanel = isRealReact && PanelErrorBoundary ? GuardedPanel : BusinessPanel

  return {
    name: 'dsh-research-dag-workbench',

    /**
     * 按宿主能力选择注册路径。
     * @param {any} ctx Cordis 客户端上下文。
     */
    apply(ctx) {
      // 规范 3.5 路径：新版 Desktop 提供 desktopWorkbenches 服务。
      if (ctx && ctx.desktopWorkbenches && typeof ctx.desktopWorkbenches.register === 'function') {
        ctx.effect(
          () =>
            ctx.desktopWorkbenches.register(
              {
                title: TITLE,
                repository: REPOSITORY,
                description: DESCRIPTION,
                panelTitle: TITLE,
                icon: Icon,
                audience: 'clinical-research',
                requirements: '需要本机可读的 DAG 项目目录（research-dag 项目结构）',
                // 整页业务优先：工作台自己安置宿主会话节点，无会话时业务页占满。
                customFrame: true,
                // 使用宿主紧凑顶部栏（工作台内只有一个 data-dsh-workbench-toolbar）。
                headerLayout: 'compact',
                // 兜底分栏（宿主不支持整页框架时按此比例放在左侧）。
                layout: { businessSide: 'left', businessWidth: 0.4 },
              },
              RegisteredPanel,
            ),
          'dsh-research-dag-workbench: desktop workbench panel',
        )
        return
      }

      // 兼容路径：本机 Desktop 尚无该服务，退回旧槽位注册（业务行为不变）。
      if (ctx && ctx.slots && typeof ctx.slots.register === 'function') {
        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register(
                {
                  name: 'main',
                  key: PANEL_KEY,
                  inject: () => ({ project: '', server: null, config: null }),
                },
                RegisteredPanel,
              ),
            ),
          'dsh-research-dag-workbench: legacy main panel',
        )
        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.panellist',
                  id: PANEL_KEY,
                  order: 21,
                  label: () => TITLE,
                },
                Icon,
              ),
            ),
          'dsh-research-dag-workbench: legacy sidebar entry',
        )
      }
    },

    /**
     * 加载顺序：先等 Desktop 工作台服务（若存在），再注册本包。
     * `slots` 在旧宿主上是必需的，保留在列表里不影响新版（缺失时该服务被跳过）。
     */
    inject: ['desktopWorkbenches', 'slots'],
  }
}

