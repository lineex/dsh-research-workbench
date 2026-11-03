/**
 * 术语迁移：鱼骨 → 项目流程，脊骨 → 主支，鱼刺 → 分支，鱼头 → 项目目标，主骨 → 主支。
 *
 * 关键：**单遍替换**（一次正则交替匹配，最长优先），避免级联污染
 * （例如先替「分刺」再替「新刺」会造出「分创建分支」这种垃圾）。
 *
 * 用法：node tools/rename-terms.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const DRY = process.argv.includes('--dry')

const SKIP_DIRS = new Set(['node_modules', '.git', '.preview', 'dist'])
const SKIP_FILES = new Set([
  path.join(ROOT, 'lib', 'client.js'), // 构建产物，由 src 生成
  path.join(ROOT, 'tools', 'rename-terms.mjs'),
])
const EXT = new Set(['.js', '.mjs', '.md', '.json'])

/**
 * 映射表：键按长度降序参与单遍交替匹配，保证「鱼骨图」先于「鱼骨」命中。
 * 值写成函数是为了在同一条规则里区分语境。
 */
const MAP = new Map([
  ['鱼骨图', '项目流程图'],
  ['主脊骨', '主支'],
  ['脊骨', '主支'],
  ['鱼骨', '项目流程'],
  ['鱼刺', '分支'],
  ['鱼头', '项目目标'],
  ['鱼尾', '整体进度'],
  ['主骨', '主支'],

  // ---- 与「分支」相关的固定搭配（必须先于单字命中）----
  ['分一根新刺', '新建一个分支'],
  ['从此阶段分刺', '从此阶段新建分支'],
  ['自动分刺', '自动建分支'],
  ['分刺', '创建分支'],
  ['新刺', '新分支'],
  ['长刺', '长出分支'],
  ['摘刺', '删除分支'],
  ['删刺', '删分支'],
  ['刺数', '分支数'],
  ['一根刺', '一个分支'],
  ['这根刺', '这个分支'],
  ['那根刺', '那个分支'],
  ['该刺', '该分支'],
  ['此刺', '此分支'],
  ['本刺', '本分支'],
  ['这刺', '这个分支'],
  ['父刺', '父分支'],
  ['子刺', '子分支'],
  ['主刺', '主支'],
  ['细刺', '子分支'],
  ['刺尖', '末端'],
  ['刺身', '主体'],
  ['幻影刺', '幻影分支'],
  ['刺', '分支'],
])

const KEYS = Array.from(MAP.keys()).sort((a, b) => b.length - a.length)
const PATTERN = new RegExp(KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')

/** 叠字收敛：替换后可能出现的重复词。 */
const COLLAPSE = [
  [/分支分支/g, '分支'],
  [/主支主支/g, '主支'],
  [/主支\u3000?分支/g, '主支'],
]

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

const files = walk(ROOT)
const TRIGGER = /鱼骨|脊骨|鱼刺|鱼头|主骨|主刺|细刺|刺身|刺尖|父刺|子刺|这根刺|分刺/
let touched = 0
let changedLines = 0
const samples = []
const leftovers = []

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8')
  if (!TRIGGER.test(before)) continue

  let text = before.replace(PATTERN, (m) => (MAP.has(m) ? MAP.get(m) : m))
  for (const [pattern, replacement] of COLLAPSE) text = text.replace(pattern, replacement)

  if (text === before) continue
  touched += 1

  const beforeLines = before.split('\n')
  const afterLines = text.split('\n')
  for (let i = 0; i < beforeLines.length; i += 1) {
    if (beforeLines[i] !== afterLines[i]) {
      changedLines += 1
      if (samples.length < 12) {
        samples.push(`  ${path.relative(ROOT, file)}:${i + 1}\n    - ${beforeLines[i].trim().slice(0, 110)}\n    + ${afterLines[i].trim().slice(0, 110)}`)
      }
    }
  }

  // 遗留检查：改完后仍出现孤立「刺」的行（多为专有名词或漏网搭配）
  for (let i = 0; i < afterLines.length; i += 1) {
    if (/刺/.test(afterLines[i])) leftovers.push(`${path.relative(ROOT, file)}:${i + 1}  ${afterLines[i].trim().slice(0, 110)}`)
  }

  if (!DRY) fs.writeFileSync(file, text, 'utf8')
}

console.log(`${DRY ? '[dry-run] ' : ''}扫描 ${files.length} 文件 → 命中 ${touched} 文件，改动 ${changedLines} 行\n`)
if (samples.length > 0) {
  console.log('样本（替换前 → 替换后）：')
  console.log(samples.join('\n'))
}

if (leftovers.length > 0) {
  console.log(`\n仍含「刺」的行 ${leftovers.length} 处，需要人工确认：`)
  console.log(leftovers.slice(0, 60).join('\n'))
  if (leftovers.length > 60) console.log(`… 还有 ${leftovers.length - 60} 行`)
} else {
  console.log('\n没有遗留「刺」字。')
}
