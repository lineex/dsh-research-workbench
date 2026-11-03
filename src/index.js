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
              BusinessPanel,
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
                BusinessPanel,
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
