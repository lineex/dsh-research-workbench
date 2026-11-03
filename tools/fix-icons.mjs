/**
 * 把继承了「鱼形」语义的图标换成与「项目流程 / 主支 / 分支」相符的图标，
 * 并修掉替换后出现的少数语病短语。
 *
 * 用法：node tools/fix-icons.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const DRY = process.argv.includes('--dry')

const SKIP_DIRS = new Set(['node_modules', '.git', '.preview', 'dist'])
const SKIP_FILES = new Set([path.join(ROOT, 'lib', 'client.js'), path.join(ROOT, 'tools', 'fix-icons.mjs')])
const EXT = new Set(['.js', '.mjs', '.md', '.json'])

/** 图标与措辞修正表。 */
const MAP = new Map([
  ['🐟', '📋'], // 项目目标（原鱼头）
  ['🦴', '🌿'], // 主支（原脊骨）
  ['🪡', '🔗'], // 回连（原鱼刺线）
  ['模块（主支节点）', '模块（主支阶段）'],
  ['已挂载主支上下文快照', '已挂载主支上下文快照'],
])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.ref') continue
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    if (!EXT.has(path.extname(entry.name))) continue
    if (SKIP_FILES.has(full)) continue
    if (/\.bak|\.orig/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

const keys = Array.from(MAP.keys())
const files = walk(ROOT)
let touched = 0
const hits = []

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  let text = before
  for (const key of keys) {
    if (text.includes(key)) {
      const n = text.split(key).length - 1
      hits.push(`${path.relative(ROOT, file)}  ×${n}  ${key} → ${MAP.get(key)}`)
      text = text.split(key).join(MAP.get(key))
    }
  }
  if (text === before) continue
  touched += 1
  if (!DRY) fs.writeFileSync(file, text, 'utf8')
}

console.log(`${DRY ? '[dry] ' : ''}改动 ${touched} 个文件`)
console.log(hits.join('\n') || '(无命中)')
