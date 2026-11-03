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

/** 去掉模块化语法：import 行与 export 关键字（拼进同一 factory 作用域）。 */
function stripImportsAndExports(code) {
  return code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(const|let|var|function|async function|class)\s+/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*;?/gm, '')
    .trim()
}

const moduleBodies = SOURCES.map((relPath) => {
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
  id: 'dsh-research-dag-workbench',

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
