#!/usr/bin/env node
/**
 * 研究项目 DAG 工作台 — 客户端模块装配脚本。
 *
 * 把 src/ 下的模块化源码按依赖顺序拼装成生产客户端 bundle lib/client.js，
 * 采用 DSH 客户端的惰性工厂格式：
 *   window.__ModuleLoader__.load({ id: 'dsh-research-dag-workbench', factory(require) { ... } })
 *
 * 构建是幂等的：同一份源码产生完全相同的字节。
 * 运行：node tools/build-client.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

/**
 * 模块清单与构建顺序（v2.4 项目流程主线优先）。
 * 在 v2.1 基础上新增 FishboneView（项目流程主线首屏）与 FishboneDialogs（创建分支/回连弹窗）；
 * 依赖顺序：对话框只依赖 constants，视图只依赖 constants，均可安全前置。
 */
const SOURCES = [
  'src/core/constants.js',
  'src/core/theme.js',
  'src/core/api.js',
  'src/components/StatusBadge.js',
  'src/components/ContextMenu.js',
  'src/components/ThemePicker.js',
  'src/components/Header.js',
  'src/components/CommandBar.js',
  'src/components/ProjectBar.js',
  'src/components/StatCards.js',
  'src/components/ReasonDialog.js',
  'src/components/FishboneDialogs.js',
  'src/components/HandoffTable.js',
  'src/components/IssueList.js',
  'src/components/RunConsole.js',
  'src/components/Toast.js',
  'src/components/Charts.js',
  // v3.10 研究目标编辑器（八层假设审计 + 好问题卡）。漏加这两条会让 bundle 缺少实现，
  // 运行时点开目标卡直接报错；verify-client 现已加「src 下所有被 import 的模块都必须在清单内」自测兜住。
  'src/core/goal-skills.js',
  'src/components/GoalCardView.js',
  'src/views/ResultsView.js',
  'src/views/OverviewView.js',
  'src/views/DagView.js',
  'src/views/HandoffsView.js',
  'src/views/ControlView.js',
  'src/views/ContentView.js',
  'src/views/FishboneView.js',
  'src/views/LeaderLogView.js',
  'src/views/BranchSessionView.js',
  'src/views/NetworkView.js',
  'src/views/EngineeringView.js',
  'src/views/ProjectsHubView.js',
  'src/WorkbenchPanel.js',
  'src/index.js',
]

/**
 * 去掉模块化语法：import 行与 export 关键字（拼进同一 factory 作用域）。
 *
 * ⚠ 关键：所有模块最终拼进**同一个作用域**，所以 `import { A } from 'x'` 直接删掉是对的
 * （A 由 x 模块提供）。但 `import { A as B }` 不能直接删——B 这个名字在拼接作用域里
 * 从未被定义。曾因此炸出真实故障：GoalCardView 写 `THINKING_LAYERS as SKILL_LAYERS`，
 * 打包后 `SKILL_LAYERS is not defined`，整个工作台白屏。
 * 这里把「带别名的具名导入」降级为 `const B = A;`，让别名在拼接作用域真正成立。
 */
function stripImportsAndExports(code) {
  return code
    .replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"];?\s*$/gm, (whole, clause) => {
      const aliases = []
      // 具名导入：{ A, B as C }
      const named = clause.match(/\{([\s\S]*?)\}/)
      if (named) {
        for (const part of named[1].split(',')) {
          const m = part.trim().match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
          if (m) aliases.push(`const ${m[2]} = ${m[1]};`)
        }
      }
      // 命名空间导入：* as NS（保留为别名声明，指向空对象交由调用方兜底）
      const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)
      if (ns) aliases.push(`const ${ns[1]} = undefined;`)
      return aliases.join(' ')
    })
    .replace(/^export\s+(const|let|var|function|async function|class)\s+/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*;?/gm, '')
    .trim()
}

/**
 * 依赖拓扑排序（v3.15）。
 *
 * 所有模块拼进**同一个作用域**，因此被依赖的模块必须先出现——否则 `const A = ...` 还在
 * 后面、前面就先读它会触发 TDZ / is not defined。此前靠手写清单顺序，一次顺序调整就可能
 * 炸掉整页（真实故障：SKILL_LAYERS is not defined）。
 * 这里按模块间的相对 import 关系做稳定拓扑排序：保持原清单的先后作为同层顺序。
 */
function topoSortSources(sources) {
  const set = new Set(sources)
  const deps = new Map()
  for (const rel of sources) {
    const abs = resolve(ROOT, rel)
    let text = ''
    try {
      text = readFileSync(abs, 'utf8')
    } catch {
      text = ''
    }
    const list = []
    for (const m of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const target = resolve(dirname(abs), m[1].endsWith('.js') ? m[1] : `${m[1]}.js`)
      const trel = target.slice(ROOT.length + 1).split('\\').join('/')
      if (set.has(trel) && trel !== rel) list.push(trel)
    }
    deps.set(rel, list)
  }
  const out = []
  const mark = new Map() // 0=未访问 1=访问中 2=完成
  const visit = (rel) => {
    const state = mark.get(rel) || 0
    if (state === 2) return
    // 循环依赖：直接按当前顺序收口，避免死循环（这类结构本身也不该出现在同作用域 bundle 里）
    if (state === 1) return
    mark.set(rel, 1)
    for (const dep of deps.get(rel) || []) visit(dep)
    mark.set(rel, 2)
    out.push(rel)
  }
  for (const rel of sources) visit(rel)
  return out
}

const ORDERED_SOURCES = topoSortSources(SOURCES)

const moduleBodies = ORDERED_SOURCES.map((relPath) => {
  const fullPath = resolve(ROOT, relPath)
  const raw = readFileSync(fullPath, 'utf8')
  const clean = stripImportsAndExports(raw)
  return `    // --- Module: ${relPath} ---\n${clean
    .split('\n')
    .map((line) => (line ? '    ' + line : line))
    .join('\n')}`
})

const bundle = `/**
 * 研究项目 DAG 工作台 — 生产客户端 bundle（模块化装配）。
 *
 * AUTO-GENERATED from src/ via tools/build-client.mjs.
 * 不要直接编辑本文件；修改 src/ 后重新运行 node tools/build-client.mjs。
 *
 * 结构：
 *   - src/core/: 常量、状态主题、样式与宿主 HTTP API
 *   - src/components/: StatusBadge, Header, ProjectBar, StatCards, ReasonDialog,
 *                      HandoffTable, IssueList, RunConsole
 *   - src/views/: OverviewView（概览）, DagView（DAG）, HandoffsView（交接）,
 *                 ControlView（校验与运行）
 *   - src/WorkbenchPanel.js: 状态协调与生命周期
 *   - src/index.js: Cordis 客户端槽位注册
 */
window.__ModuleLoader__.load({
  id: 'dsh-research-workbench',

  factory(require) {
    const React = require('react')
    const h = React.createElement

${moduleBodies.join('\n\n')}

    return createClientPlugin(React)
  },
})
`

const outDir = join(ROOT, 'lib')
mkdirSync(outDir, { recursive: true })
const dest = join(outDir, 'client.js')
writeFileSync(dest, bundle, 'utf8')
console.log(
  `研究项目 DAG 工作台: 已将 ${SOURCES.length} 个模块装配到 lib/client.js（${Buffer.byteLength(bundle, 'utf8')} 字节）`,
)
