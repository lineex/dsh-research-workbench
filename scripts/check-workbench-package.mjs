#!/usr/bin/env node
/**
 * 工作台包校验（规范第 3 节 / 第 5 步「包校验」）。
 *
 * 只读检查，不修改任何文件。校验项全部来自 development.md 的「必须」级要求：
 *   - package.json：name/version/type/main/exports["."]/exports["./client"]
 *                   /dsh.bundle.patch/dsh.client.platform/dsh.client.inject
 *   - cordis.patch.yml：YAML 数组、含 insert、id、name=包名
 *   - 入口文件真实存在且非空
 *   - 客户端产物里确实用了 Desktop 工作台注册（desktopWorkbenches）
 *   - 没有把宿主代码打进 dependencies
 *
 * 用法：node scripts/check-workbench-package.mjs [--json]
 * 退出码：0 通过；1 不通过；2 用法错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const jsonMode = process.argv.includes('--json')

const problems = []
const notes = []
function need(condition, message) {
  if (condition) notes.push(message)
  else problems.push(message)
}

const pkgPath = path.join(ROOT, 'package.json')
if (!fs.existsSync(pkgPath)) {
  console.error('缺少 package.json')
  process.exit(1)
}
const raw = fs.readFileSync(pkgPath, 'utf8')
let pkg = null
try {
  pkg = JSON.parse(raw)
} catch (problem) {
  console.error(`package.json 不是合法 JSON：${problem.message}`)
  process.exit(1)
}

need(typeof pkg.name === 'string' && pkg.name.length > 0, 'package.json 有 name')
need(/^\d+\.\d+\.\d+/.test(String(pkg.version || '')), `version 是完整 SemVer（${pkg.version}）`)
need(pkg.type === 'module', 'type = module')

// main / exports["."]
need(typeof pkg.main === 'string' && pkg.main.length > 0, '有 main')
need(Boolean(pkg.exports && pkg.exports['.']), '有 exports["."]')
need(Boolean(pkg.exports && pkg.exports['./client']), '有 exports["./client"]')
need(Boolean(pkg.exports && pkg.exports['./cordis.patch.yml']), '有 exports["./cordis.patch.yml"]')
need(Boolean(pkg.exports && pkg.exports['./package.json']), '有 exports["./package.json"]')

// dsh 字段
const dsh = pkg.dsh && typeof pkg.dsh === 'object' ? pkg.dsh : null
need(Boolean(dsh), '有 dsh 字段')
need(Boolean(dsh && dsh.bundle && dsh.bundle.patch), 'dsh.bundle.patch 指向 cordis.patch.yml')
need(Boolean(dsh && dsh.client && dsh.client.platform === 'web'), 'dsh.client.platform = web')
need(
  Boolean(dsh && dsh.client && Array.isArray(dsh.client.inject) && dsh.client.inject.includes('dsh-desktop-workbenches')),
  'dsh.client.inject 含 dsh-desktop-workbenches（必须）',
)

// 依赖分类
const deps = pkg.dependencies && typeof pkg.dependencies === 'object' ? pkg.dependencies : {}
const peers = pkg.peerDependencies && typeof pkg.peerDependencies === 'object' ? pkg.peerDependencies : {}
for (const name of Object.keys(deps)) {
  if (name.startsWith('@deepseek-ai/')) {
    problems.push(`宿主包 ${name} 不应放在 dependencies，应放 peerDependencies（规范 3.2）`)
  }
}
if (Object.keys(peers).length === 0) notes.push('peerDependencies 为空（本包无宿主 peer 依赖）')

// 入口文件存在且非空
function statFile(rel, label) {
  if (typeof rel !== 'string' || rel.length === 0) {
    problems.push(`${label} 未配置路径`)
    return 0
  }
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) {
    problems.push(`${label} 指向的文件不存在：${rel}`)
    return 0
  }
  const bytes = fs.statSync(abs).size
  if (bytes === 0) problems.push(`${label} 是空文件：${rel}`)
  return bytes
}
statFile(pkg.main, 'main')
statFile(pkg.exports && pkg.exports['.'], 'exports["."]')
statFile(pkg.exports && pkg.exports['./client'], 'exports["./client"]')

// cordis.patch.yml
const patchRel = dsh && dsh.bundle && dsh.bundle.patch ? dsh.bundle.patch : './cordis.patch.yml'
const patchAbs = path.join(ROOT, patchRel)
if (!fs.existsSync(patchAbs)) {
  problems.push(`cordis.patch.yml 不存在：${patchRel}`)
} else {
  const patch = fs.readFileSync(patchAbs, 'utf8')
  need(patch.trim().length > 0, 'cordis.patch.yml 非空')
  const insertIdx = patch.indexOf('- insert:')
  need(insertIdx >= 0, 'cordis.patch.yml 含 - insert:')
  need(/- id:\s*\S+/.test(patch), 'insert 行有 id')
  const nameMatch = patch.match(/^\s*name:\s*['"]?([^'"\n]+)['"]?\s*$/m)
  if (nameMatch) {
    const declared = nameMatch[1].trim()
    need(
      declared === pkg.name,
      `insert 的 name 等于 npm 包名（${declared}）`,
    )
  } else {
    problems.push('insert 行缺少 name')
  }
}

// 客户端产物是否真的用了 Desktop 工作台协议
const clientRel = pkg.exports && pkg.exports['./client']
if (typeof clientRel === 'string') {
  const clientAbs = path.join(ROOT, clientRel)
  if (fs.existsSync(clientAbs)) {
    const client = fs.readFileSync(clientAbs, 'utf8')
    need(client.includes('window.__ModuleLoader__.load'), '客户端是单文件 bundle（__ModuleLoader__.load）')
    need(client.includes('desktopWorkbenches'), '客户端含 desktopWorkbenches.register 路径（规范 3.5）')
    need(client.includes('repository:'), 'register() 提供 repository（工作台身份）')
    need(client.includes('title:'), 'register() 提供 title')
    need(client.includes('createClientPlugin'), '客户端入口导出插件描述')
    // 本机 Desktop 尚无 desktopWorkbenches 服务，必须保留旧槽位回退路径。
    const hasFallback = client.includes('sidebar.panellist') && client.includes("slots.inject('main'")
    need(hasFallback, '保留旧 slots 回退路径（本机 Desktop 无 desktopWorkbenches 服务时仍可用）')
  }
}

// files 是否覆盖必须产物
if (Array.isArray(pkg.files)) {
  const files = pkg.files.map((item) => String(item).replace(/\/$/, ''))
  for (const needed of ['cordis.patch.yml', 'lib']) {
    if (!files.some((item) => item === needed || item.startsWith(needed))) {
      problems.push(`files 未包含 ${needed}`)
    }
  }
  notes.push(`files 覆盖 ${files.length} 项`)
}

// 输出
if (jsonMode) {
  console.log(JSON.stringify({ ok: problems.length === 0, name: pkg.name, version: pkg.version, notes, problems }, null, 2))
} else {
  console.log(`包校验：${pkg.name}@${pkg.version}`)
  for (const note of notes) console.log(`  OK   ${note}`)
  for (const problem of problems) console.log(`  FAIL ${problem}`)
  console.log(problems.length === 0 ? 'RESULT: 包校验通过' : `RESULT: ${problems.length} 项不通过`)
}

process.exit(problems.length === 0 ? 0 : 1)
