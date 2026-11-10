#!/usr/bin/env node
/**
 * 安装布局验收：模拟插件被装进 `.../node_modules/dsh-research-dag-workbench/` 后的 CLI 解析。
 *
 * 背景（真实故障）：宿主曾把工具包根固定取 `PACKAGE_ROOT/..`，安装到 generations 后
 * 上一级就是 `node_modules`，于是 CLI 路径变成 `node_modules/tools/dag.mjs` —— 不存在，
 * 界面直接报「status CLI 失败 / list CLI 失败 / Cannot find module」。
 *
 * 本脚本复制 lib/ + kit/ 到临时 `node_modules/<pkg>/` 结构，然后真的加载 host.js
 * 读取 kitRootForTest()，断言：
 *   ① kitRoot 指向包内 `kit/`，不是 node_modules；
 *   ② `<kitRoot>/tools/dag.mjs` 真的存在且能跑 `--help`。
 *
 * 用法：node verify/verify-kit-root.mjs
 */
import { existsSync, mkdirSync, cpSync, copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

let fails = 0
const ok = (m) => console.log(`  OK   ${m}`)
const bad = (m, d) => {
  fails += 1
  console.log(`  FAIL ${m}${d ? `  → ${d}` : ''}`)
}

// 包内必须自带 CLI（否则安装后无从解析）
for (const f of ['dag.mjs', 'dag-core.mjs', 'spur-context.mjs']) {
  if (existsSync(join(ROOT, 'kit', 'tools', f))) ok(`包内自带 kit/tools/${f}`)
  else bad(`包内缺 kit/tools/${f}（安装后 CLI 找不到，界面会报 Cannot find module）`)
}
const pkg = readFileSyncSafe(join(ROOT, 'package.json'))
if (Array.isArray(pkg.files) && pkg.files.includes('kit/')) ok('package.json files 含 kit/（打包会带上）')
else bad('package.json files 未包含 kit/（npm pack 会漏掉自带 CLI）')

// 构造安装后的真实布局
const sim = mkdtempSync(join(os.tmpdir(), 'kitroot-'))
const pkgDir = join(sim, 'node_modules', 'dsh-research-workbench')
try {
  mkdirSync(join(pkgDir, 'lib'), { recursive: true })
  copyFileSync(join(ROOT, 'lib', 'host.js'), join(pkgDir, 'lib', 'host.js'))
  cpSync(join(ROOT, 'kit'), join(pkgDir, 'kit'), { recursive: true })

  // 旧逻辑会找 `node_modules/tools/dag.mjs`，这里必须不存在（否则测不出问题）
  if (!existsSync(join(sim, 'node_modules', 'tools', 'dag.mjs'))) ok('模拟环境里上级 node_modules 没有 tools/（等同真实安装）')
  else bad('模拟环境不干净：上级存在 tools/')

  const script = `
    import { kitRootForTest } from ${JSON.stringify(pathToFileURL(join(pkgDir, 'lib', 'host.js')).href)}
    import { existsSync } from 'node:fs'
    import { join } from 'node:path'
    const kit = kitRootForTest()
    const dag = join(kit, 'tools', 'dag.mjs')
    console.log(JSON.stringify({ kit, hasDag: existsSync(dag), dag }))
  `
  const probe = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  let parsed = null
  try {
    parsed = JSON.parse((probe.stdout || '').trim().split('\n').pop())
  } catch {
    parsed = null
  }
  if (!parsed) {
    bad('无法加载安装位置下的 host.js', (probe.stderr || probe.stdout || '').slice(0, 200))
  } else {
    if (parsed.kit === join(pkgDir, 'kit')) ok('kitRoot 指向包内 kit/')
    else bad('kitRoot 未指向包内 kit/', parsed.kit)
    if (parsed.hasDag) ok('kit/tools/dag.mjs 在安装位置存在')
    else bad('kit/tools/dag.mjs 在安装位置不存在')

    const help = spawnSync(process.execPath, [parsed.dag, '--help'], { encoding: 'utf8' })
    const text = `${help.stdout || ''}${help.stderr || ''}`
    if (/PROTOCOL v\d|用法/.test(text)) ok('包内 CLI 在安装位置可执行（--help 正常）')
    else bad('包内 CLI 在安装位置执行失败', text.slice(0, 200))
  }
} finally {
  try {
    rmSync(sim, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

console.log('')
console.log(`RESULT: ${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} FAILURE(S)`}`)
process.exit(fails === 0 ? 0 : 1)

function readFileSyncSafe(p) {
  return JSON.parse(readFileSync(p, 'utf8'))
}
