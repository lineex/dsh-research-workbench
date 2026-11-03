/**
 * 从 lib/client.js（上一次成功构建的 bundle）提取单个模块的原始源码。
 *
 * bundle 由 tools/build-client.mjs 生成，每个模块前有
 *   // --- Module: src/views/FishboneView.js ---
 * 分隔标记，模块之间以同样的标记分隔，因此可以无损还原。
 *
 * 还原时做两件事：
 *   1. 去掉 bundle 注入的统一缩进（模块体在 factory 内缩进 4 空格）；
 *   2. 去掉模块末尾的 `// --- /Module ---` 之类的收尾标记（若有）。
 *
 * 用法: node tools/extract-module.mjs <模块相对路径>
 *   例: node tools/extract-module.mjs src/views/FishboneView.js
 */
import { readFileSync, writeFileSync } from 'node:fs'

const target = process.argv[2]
if (!target) {
  console.error('用法: node tools/extract-module.mjs <src/...>')
  process.exit(1)
}

const bundle = readFileSync('lib/client.js', 'utf8')
const START = `// --- Module: ${target} ---`
const start = bundle.indexOf(START)
if (start < 0) {
  console.error('bundle 中找不到模块标记:', START)
  process.exit(1)
}

/* 模块体从标记之后开始；结束于下一个 `// --- Module: ` 或 `// --- /Module`
 * 或 factory 收尾 `__ModuleLoader__` 之前。 */
const bodyStart = start + START.length
const candidates = [
  bundle.indexOf('// --- Module: ', bodyStart),
  bundle.indexOf('// --- /Module', bodyStart),
  bundle.indexOf('// --- End of modules', bodyStart),
].filter((i) => i > bodyStart)
const bodyEnd = candidates.length > 0 ? Math.min(...candidates) : bundle.length

let body = bundle.slice(bodyStart, bodyEnd)

/* 去掉每个模块体的 4 空格统一缩进（factory 内缩进），保留相对缩进。
 * 注意：只剥掉「每行都有的那个公共前缀」，不是无脑 trim。 */
const lines = body.split('\n')
// 跳过开头空行
while (lines.length > 0 && lines[0].trim() === '') lines.shift()
// 跳过结尾空行
while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

const indents = lines
  .filter((l) => l.trim() !== '')
  .map((l) => {
    const m = l.match(/^( +)/)
    return m ? m[1].length : 0
  })
const minIndent = indents.length > 0 ? Math.min(...indents) : 0

const dedented = lines.map((l) => (l.trim() === '' ? '' : l.slice(minIndent)))

/* 有些模块末尾会带一个显式的 `// --- /Module ---` 已被切掉；
 * 这里再兜底去掉纯分隔注释行。 */
while (dedented.length > 0 && /^\/\/\s*-{3,}\s*\/?[A-Za-z]*\s*$/.test(dedented[dedented.length - 1].trim())) {
  dedented.pop()
}

const source = dedented.join('\n') + '\n'

writeFileSync(target, source, { encoding: 'utf8' })
console.log('已还原:', target)
console.log('  行数:', source.split('\n').length, ' 字符数:', source.length)
console.log('  含中文样例:', source.includes('项目流程') ? '是' : '否')
