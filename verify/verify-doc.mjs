/**
 * 核验 DESIGN-workbench.md 里的关键事实声明，防止文档自身说谎。
 * 用法: node tools/_verify-doc-claims.mjs
 */
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')
let fails = 0
const ok = (label, cond, detail = '') => {
  if (!cond) fails += 1
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? '  → ' + detail : ''}`)
}

/* ---- 1. 字号阶梯：不得有 8~10.5px ---- */
const fontFiles = [
  'src/core/constants.js',
  'src/core/theme.js',
  'src/views/FishboneView.js',
  'src/components/GoalCardView.js',
  'src/core/goal-skills.js',
  'src/WorkbenchPanel.js',
]
let tiny = 0
for (const f of fontFiles) {
  const s = read(f)
  tiny += (s.match(/font-size:\s*(8|8\.5|9|9\.5|10|10\.5)px/g) || []).length
  tiny += (s.match(/fontSize:\s*(8|8\.5|9|9\.5|10|10\.5)\b/g) || []).length
}
ok('字号阶梯：无 8~10.5px 残留', tiny === 0, `残留 ${tiny} 处`)

/* ---- 2. theme.js 令牌存在性 ---- */
const theme = read('src/core/theme.js')
const tokens = [
  '--rdw-sys-blue',
  '--rdw-sys-green',
  '--rdw-sys-orange',
  '--rdw-sys-red',
  '--rdw-sys-gray',
  '--rdw-glass',
  '--rdw-r-blob',
  '--rdw-r-pebble',
  '--rdw-shadow-organic-1',
  '--rdw-organic-grain',
]
for (const t of tokens) {
  ok(`令牌 ${t}`, theme.includes(t + ':'))
}

/* ---- 3. 状态六态色 ---- */
const stKeys = ['draft', 'provisional', 'accepted', 'rejected', 'superseded', 'blocked']
for (const k of stKeys) {
  ok(`状态色 --rdw-st-${k}`, theme.includes(`--rdw-st-${k}:`))
}

/* ---- 4. 字体为 Apple 系统栈 ---- */
ok('字体栈含 -apple-system', /-apple-system/.test(theme))
ok('无纸纹（grain 置空）', /--rdw-organic-grain:\s*none/.test(theme))

/* ---- 5. 三栏 grid 定义 ---- */
const consts = read('src/core/constants.js')
ok('三栏 grid 用 minmax 与 fr', /grid-template-columns:\s*minmax\(210px,\s*252px\)\s+minmax\(0,\s*1fr\)\s+minmax\(200px,\s*244px\)/.test(consts))
ok('.rdw-stage 有 min-height:0', /\.rdw-stage\{[^}]*min-height:0/.test(consts))
ok('.rdw-business 用 flex:1 1 0', /\.rdw-business\{[^}]*flex:1 1 0/.test(consts))
ok('.rdw-native-slot 存在', consts.includes('.rdw-native-slot{'))

/* ---- 6. VIEWS 六页签及顺序 ---- */
const views = ['hub', 'fishbone', 'leader', 'content', 'network', 'engineering']
for (const v of views) {
  ok(`VIEWS 含 ${v}`, new RegExp(`\\['${v}',`).test(consts))
}

/* ---- 7. host.js 接口与 markers 语义 ---- */
const host = read('lib/host.js')
for (const route of ['/health', '/fishbone', '/state', '/handoff', '/results', '/content', '/config', '/bridge', '/run', '/runs']) {
  ok(`路由 ${route}`, host.includes(`'${route}'`) || host.includes(`"${route}"`))
}
ok('markers 只收集 ACCEPTED', /acceptedStreams/.test(host) && /status === 'ACCEPTED'/.test(host))
ok('completion = accepted/total', /counts\.accepted \/ total/.test(host))
ok('attention 含 decision/stale', host.includes("kind: 'decision'") && host.includes("kind: 'stale'"))

/* ---- 8. 注册契约 ---- */
const index = read('src/index.js')
ok('customFrame: true', /customFrame:\s*true/.test(index))
ok("headerLayout: 'compact'", /headerLayout:\s*'compact'/.test(index))
ok('layout 兜底 businessSide left', /businessSide:\s*'left'/.test(index))

/* ---- 9. 唯一挂载点：conversationNode 只在 FishboneView 出现一次挂载 ---- */
const fish = read('src/views/FishboneView.js')
const mountCount = (fish.match(/\n\s+options\.conversationNode,/g) || []).length
ok('conversationNode 唯一挂载', mountCount === 1, `出现 ${mountCount} 次`)

/* ---- 10. 自制 composer 已移除 ---- */
ok('无自制 composer', !fish.includes('DSH Desktop 原生会话输入框'))
ok('无 rdw-composer CSS', !consts.includes('rdw-composer'))

/* ---- 10b. 完成率渲染必须有 pctOf 兜底（v3.7 回归守护） ----
 * 背景：真实 /fishbone 的字段是 completion，但历史 mock 写过 progress。
 * 字段一漂移，模板字符串就渲染 "undefined% · N 刺"——测试全绿、画面出错。
 * 这里锁死三件事：pctOf 存在、它兼容 progress、模板里不再裸用 node.completion。 */
ok('pctOf 兜底函数存在', /function pctOf\(node\)/.test(fish))
ok('pctOf 兼容 legacy progress 字段', /Number\(node\.progress\)/.test(fish))
ok('pctOf 可由 counts 现算', /accepted \/ total/.test(fish))
ok(
  'SVG 名牌不再裸用 node.completion',
  !/\$\{node\.completion\}%/.test(fish),
  '仍存在 `${node.completion}%` 直接插值',
)
ok(
  '真正答案里不再出现 undefined% 风险点',
  !/\$\{[a-zA-Z.]*\.completion \|\| 0\}%/.test(fish),
)

/* ---- 10c. 抽屉栏不得再出现 button 嵌套 button（v3.7 修复守护） ----
 * 旧代码把 .rdw-drawer-acts（含两个 button）嵌在另一个 button 里，
 * HTML 规范禁止，浏览器强制闭合外层 button，操作区掉到第二行。
 * 现在外层是 div[role=button]，这里断言外层标签不再以 'button' 开头。 */
const panelSrc = read('src/WorkbenchPanel.js')
const drawerBarMatch = panelSrc.match(/const drawerNode[\s\S]{0,900}?rdw-drawer-bar[\s\S]{0,80}/)
ok('抽屉栏存在', Boolean(drawerBarMatch))
ok(
  '抽屉栏外层不再是 <button>（避免 button 嵌套被浏览器自动闭合）',
  !/h\(\s*'button',\s*\{\s*type:\s*'button',\s*className:\s*'rdw-drawer-bar'/.test(panelSrc),
)
ok('抽屉栏改为 div[role=button] + tabIndex', /className:\s*'rdw-drawer-bar',\s*\n\s*role:\s*'button'/.test(panelSrc))

/* ---- 10d. 原生会话槽位禁止覆盖层（v3.7 坑 5 守护） ----
 * 坑 5：position:absolute; inset:0 的引导卡盖住了宿主原生会话，
 * 用户连看三轮白屏，而每一轮都在查高度链。
 * 这里断言：rdw-native-slot 附近不出现 inset:0 的绝对定位覆盖层。 */
const slotMatch = fish.match(/className:\s*'rdw-native-slot'[\s\S]{0,1400}/)
ok('rdw-native-slot 存在', Boolean(slotMatch))
ok(
  '原生槽位内无 inset:0 覆盖层',
  !slotMatch || !/inset:\s*0/.test(slotMatch[0]),
  'rdw-native-slot 附近出现 inset:0 —— 会盖住宿主会话节点（坑 5）',
)

/* ---- 10e. 自动绑定只执行一次，不得形成重渲染死循环（v3.7 坑 6 守护） ---- */
ok('自动绑定有 useRef 单次守卫', /hasAttemptedAttach\s*=\s*React\.useRef\(false\)/.test(panelSrc))
ok('守卫在 effect 里被检查', /hasAttemptedAttach\.current/.test(panelSrc))

/* ---- 11. 文档自身存在且含关键章节 ---- */
const doc = read('DESIGN-workbench.md')
const sections = ['设计公理', '核心矛盾', '信息架构', '数据模型', '三栏布局系统', '视觉系统', '交互状态机', '宿主集成契约', '演进史', '验收体系', '技术债']
for (const s of sections) {
  ok(`文档章节「${s}」`, doc.includes(s))
}

/* ---- 11b. 文档版本与 package.json 一致（防「文档说谎」） ---- */
const pkg = JSON.parse(read('package.json'))
const docVersionMatch = doc.match(/>\s*设计版本：`([^`]+)`/)
ok('文档声明了设计版本', Boolean(docVersionMatch), docVersionMatch ? docVersionMatch[1] : '未找到')
ok(
  `文档版本 = package.json 版本（${pkg.version}）`,
  docVersionMatch && docVersionMatch[1] === pkg.version,
  docVersionMatch ? `文档 ${docVersionMatch[1]} vs 包 ${pkg.version}` : '文档未声明版本',
)

/* ---- 11c. v3.7 新增章节必须存在 ---- */
for (const sec of ['## 7C.', '### 5.4', '### 7C.1', '### 7C.5', '### 7C.6', '### 7C.9', '### 12.6']) {
  ok(`文档含章节 ${sec}`, doc.includes(sec))
}

/* ---- 12. 参考项目引用一致性（文档 ↔ 代码注释） ---- */
console.log('')
console.log('--- 参考项目引用核验 ---')

/* 文档里引用的参考项目，必须在代码注释中真实存在 */
const refRepos = [
  { id: 'projectHub', pattern: /projectHub/ },
  { id: 'EvoResearch', pattern: /EvoResearch/ },
  { id: 'bianqu-workbench', pattern: /bianqu-workbench/ },
  { id: 'dsh-content-workbench', pattern: /dsh-content-workbench/ },
]

const codeFiles = [
  'src/core/theme.js',
  'src/core/constants.js',
  'src/views/ProjectsHubView.js',
  'src/views/FishboneView.js',
  'src/views/BranchSessionView.js',
  'src/components/Charts.js',
  'src/components/Toast.js',
]

for (const repo of refRepos) {
  const found = codeFiles.some((f) => repo.pattern.test(read(f)))
  ok(`参考项目 ${repo.id} 在代码注释中确有出处`, found)
  ok(`文档 §12 收录 ${repo.id}`, doc.includes(repo.id))
}

/* 官方规范源必须存在（本地副本 + 文档引用） */
ok('本地规范副本 .ref/development.md 存在', (() => {
  try { return read('.ref/development.md').length > 1000 } catch { return false }
})())
ok('文档引用官方规范地址', doc.includes('dshdesktop.com/workbench/docs/development'))

/* 文档引用的行号必须真实存在（抽查关键锚点） */
const anchorChecks = [
  { file: 'src/views/ProjectsHubView.js', needle: 'OliverLiy/projectHub' },
  { file: 'src/core/theme.js', needle: '三段式' },
  { file: 'src/core/constants.js', needle: 'bianqu-workbench' },
  { file: 'src/views/FishboneView.js', needle: 'EvoResearch' },
  { file: 'src/components/Toast.js', needle: 'projectHub' },
  { file: 'src/components/Charts.js', needle: 'projectHub' },
]
for (const a of anchorChecks) {
  ok(`锚点 ${a.file} 含「${a.needle}」`, read(a.file).includes(a.needle))
}

/* 借鉴/自研对照表必须存在 */
ok('文档含「借鉴 vs 自研」对照表', doc.includes('借鉴 vs 自研'))
ok('文档含宿主平台参考', doc.includes('宿主平台参考'))
ok('文档含取舍声明', doc.includes('设计语言的取舍声明'))

/* 文档声明的四个参考项目数量与代码一致 */
const docRepoCount = (doc.match(/\n#### [①②③④]/g) || []).length
ok('文档列出 4 个核心参考项目', docRepoCount === 4, `实际 ${docRepoCount} 个`)

console.log('')
console.log(fails === 0 ? '=== 全部声明核验通过 ===' : `=== ${fails} 项声明与代码不符 ===`)
process.exit(fails === 0 ? 0 : 1)
