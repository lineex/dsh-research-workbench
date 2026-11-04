/**
 * 继承链文案验证：确认「所有前序主支」都被列出，而不只是本主支。
 *
 * 从 WorkbenchPanel.js 里抽出 buildBranchContextText / buildModuleContextText，
 * 用一份真实形状的 fishbone（3 个主支 + 3 级分支）离线跑，断言：
 *   ① 主支 M20 的上下文列出 M10、M15（前序全部）与本主支 M20；
 *   ② 分支 B20-02 的上文列出 M10、M15、M20 三段主支；
 *   ③ 祖先分支链按「根 → 直接父」顺序（A → A1 → A1a 中 A1a 的祖先应是 A、A1）；
 *   ④ 每段都带成稿路径 spine/stages/<id>/DRAFT.md 与状态；
 *   ⑤ 不再出现「本对话与项目同目录」以外的反复设置会话目录措辞。
 *
 * 用法：node verify/verify-inheritance-text.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const panel = readFileSync(join(ROOT, 'src', 'WorkbenchPanel.js'), 'utf8')

let fails = 0
const ok = (m) => console.log(`  OK   ${m}`)
const bad = (m, d) => {
  fails += 1
  console.log(`  FAIL ${m}${d ? `  → ${d}` : ''}`)
}

/** 从源码里抓出两个函数的源码体（到下一个顶层 const 之前）。 */
function extractFn(name) {
  const start = panel.indexOf(`const ${name} = (`)
  if (start < 0) return ''
  let depth = 0
  let i = panel.indexOf('{', start)
  const from = i
  for (; i < panel.length; i += 1) {
    if (panel[i] === '{') depth += 1
    else if (panel[i] === '}') {
      depth -= 1
      if (depth === 0) return panel.slice(start, i + 1)
    }
  }
  return panel.slice(from)
}

const branchFn = extractFn('buildBranchContextText')
const moduleFn = extractFn('buildModuleContextText')
const stageLineFn = extractFn('stageDocLine')
if (!branchFn) bad('找不到 buildBranchContextText')
if (!moduleFn) bad('找不到 buildModuleContextText')
if (!stageLineFn) bad('找不到 stageDocLine')

if (branchFn && moduleFn && stageLineFn) {
  // 用真实形状的 fishbone 构造沙箱
  const fishbone = {
    spine: [
      { id: 'M10', name: '文献检索', stageId: 's1-m10', stageStatus: 'current', hasDraft: true },
      { id: 'M15', name: '数据清洗', stageId: 's2-m15', stageStatus: 'current', hasDraft: true },
      { id: 'M20', name: '文献检索', stageId: 's3-m20', stageStatus: 'empty', hasDraft: false },
    ],
    ribs: [
      { id: 'B20-01', name: '文献检索 v1', module: 'M20', parent: null },
      { id: 'B20-02', name: '文献检索 v2', module: 'M20', parent: 'B20-01' },
      { id: 'B20-02a', name: '三级分支', module: 'M20', parent: 'B20-02' },
    ],
  }
  const rootPath = 'E:\\demo\\DAG'
  // eslint-disable-next-line no-new-func
  const moduleText = new Function(
    'fishbone',
    'rootPath',
    `${stageLineFn}\n${moduleFn}\nreturn buildModuleContextText('M20')`,
  )(fishbone, rootPath)
  // eslint-disable-next-line no-new-func
  const branchText = new Function(
    'fishbone',
    'rootPath',
    `${stageLineFn}\n${branchFn}\nreturn buildBranchContextText('M20','B20-02a','三级分支')`,
  )(fishbone, rootPath)

  const checkBoth = (text, label) => {
    const hasM10 = /M10（文献检索）/.test(text)
    const hasM15 = /M15（数据清洗）/.test(text)
    if (hasM10 && hasM15) ok(`${label}：列出全部前序主支（M10、M15）`)
    else bad(`${label}：前序主支没列全`, `M10=${hasM10} M15=${hasM15}`)
    if (/spine\/stages\/s1-m10\/DRAFT\.md/.test(text) && /spine\/stages\/s2-m15\/DRAFT\.md/.test(text)) {
      ok(`${label}：每段带成稿路径与状态`)
    } else bad(`${label}：缺成稿路径`)
    if (/M20/.test(text)) ok(`${label}：含本主支 M20`)
    else bad(`${label}：缺本主支`)
    if (!/反复|设置会话文件夹位置/.test(text) && /本对话与项目同目录/.test(text)) {
      ok(`${label}：明确对话落在项目目录，不再反复设置`)
    }
    else bad(`${label}：会话目录措辞不对`)
  }

  checkBoth(moduleText, '主支 M20')
  checkBoth(branchText, '分支 B20-02a')

  // 祖先分支链顺序：B20-02a 的祖先应为 B20-01（根）→ B20-02（直接父）
  const ancSection = (branchText.split('③')[1] || '').split('④')[0]
  const iRoot = ancSection.indexOf('B20-01')
  const iParent = ancSection.indexOf('B20-02')
  if (iRoot >= 0 && iParent >= 0 && iRoot < iParent) ok('祖先分支链按「根 → 直接父」排列（B20-01 → B20-02）')
  else bad('祖先分支链顺序不对', `root=${iRoot} parent=${iParent}`)
  if (!/B20-02a.*B20-02a/.test(ancSection)) ok('祖先链不含自身')
  else bad('祖先链把自己列进去了')

  if (/按 ①→②→③ 顺序/.test(branchText)) ok('明确要求按 ①→②→③ 读取')
  else bad('缺读取顺序提示')
  if (/不要读取其它主支或旁系分支/.test(branchText)) ok('明确禁止读其它主支/旁系分支')
  else bad('缺污染防护提示')
}

console.log('')
console.log(`RESULT: ${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} FAILURE(S)`}`)
process.exit(fails === 0 ? 0 : 1)
