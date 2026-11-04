/**
 * 宿主侧继承链渲染实测：在真实示例项目上跑 renderInheritanceChain。
 * 关键断言：即使项目**没有 SPINE.json**（未建主支链），也必须按 PROJECT_STATE 的
 * 模块顺序列出**全部前序主支**，不能退化成「本主支已是第一个主支」。
 */
import { readFileSync, mkdtempSync, cpSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const hostSrc = readFileSync(join(ROOT, 'lib', 'host.js'), 'utf8')

let fails = 0
const ok = (m) => console.log(`  OK   ${m}`)
const bad = (m, d) => {
  fails += 1
  console.log(`  FAIL ${m}${d ? `  → ${d}` : ''}`)
}

// ① 静态：必须有「无 SPINE 时回退模块顺序」的分支
if (/stages\.length === 0/.test(hostSrc) && /stateData\.modules/.test(hostSrc)) {
  ok('无 SPINE.json 时回退到 PROJECT_STATE 模块顺序')
} else bad('无 SPINE 时没有回退（前序主支会算成 0 个）')
if (/renderInheritanceChain/.test(hostSrc)) ok('宿主侧有统一继承链渲染函数')
else bad('缺 renderInheritanceChain')
if (/① 前序主支结果（本主支之前的所有主支，共 \$\{preceding\.length\} 个）/.test(hostSrc)) {
  ok('宿主提示词列出全部前序主支并给出个数')
} else bad('宿主提示词没列全部前序主支')
if (/③ 祖先分支链（根分支 → 直接父分支，共 \$\{ancestors\.length\} 级）/.test(hostSrc)) {
  ok('宿主提示词列出祖先分支链')
} else bad('宿主提示词缺祖先分支链')
// 旧的一行笼统写法不得残留
if (!/上下文档案：modules\/\$\{moduleId\}\/branches\/\$\{branchId\}\/CONTEXT\.md（含继承链一节）/.test(hostSrc)) {
  ok('旧的「上下文档案…（含继承链一节）」笼统行已移除')
} else bad('旧笼统行仍在（用户截图里的那行）')

// ② 动态：把 host.js 的 renderInheritanceChain 抽出来，在临时项目上跑
const fnStart = hostSrc.indexOf('function renderInheritanceChain(')
const fnEnd = hostSrc.indexOf('\n/** 归一化一条 backups[] 记录', fnStart)
if (fnStart < 0 || fnEnd < 0) {
  bad('无法定位 renderInheritanceChain 源码')
} else {
  const fnSrc = hostSrc.slice(fnStart, fnEnd)
  const tmp = mkdtempSync(join(os.tmpdir(), 'inherit-'))
  try {
    mkdirSync(join(tmp, 'control'), { recursive: true })
    mkdirSync(join(tmp, 'modules'), { recursive: true })
    // 没有 SPINE.json，只有模块与分支
    writeFileSync(
      join(tmp, 'control', 'PROJECT_STATE.json'),
      JSON.stringify({
        schema: 1,
        project: { id: 'demo', title: '演示项目', goal: '', created_at: '2026-11-04' },
        phase: 'planning',
        next_steps: [],
        blockers: [],
        modules: [
          { id: 'M10', name: '文献检索' },
          { id: 'M20', name: '数据与队列' },
          { id: 'M30', name: '统计分析' },
        ],
        branches: [
          { id: 'B30-01', name: '队列定义 v1', module: 'M30' },
          { id: 'B30-02', name: '队列定义 v2', module: 'M30', parent: 'B30-01' },
        ],
      }),
      'utf8',
    )
    writeFileSync(
      join(tmp, 'control', 'rdw-rib-meta.json'),
      JSON.stringify({ version: 1, ribs: {}, recycleBin: [], moduleOrder: [], ribOrder: {}, sessionOf: {} }),
      'utf8',
    )

    // 提供 renderInheritanceChain 依赖的最小桩
    const stubs = `
      const readSpineFile = () => ({ stages: [] });
      const readProjectStateData = (root) => JSON.parse(require('node:fs').readFileSync(require('node:path').join(root,'control','PROJECT_STATE.json'),'utf8'));
      const readRibMeta = (root) => { const fs=require('node:fs'),p=require('node:path'); return { data: JSON.parse(fs.readFileSync(p.join(root,'control','rdw-rib-meta.json'),'utf8')) }; };
      const applyOrder = (ids, pref) => (Array.isArray(pref) && pref.length ? [...pref.filter((x)=>ids.includes(x)), ...ids.filter((x)=>!pref.includes(x))] : ids);
    `
    // eslint-disable-next-line no-new-func
    const run = new Function(
      'require',
      `${stubs}\n${fnSrc}\nreturn renderInheritanceChain;`,
    )(await import('node:module').then((m) => m.createRequire(pathToFileURL(join(ROOT, 'lib', 'x.js')))))
    const out = run(tmp, 'M30', 'B30-02', '队列定义 v2')
    const text = out.lines.join('\n')
    console.log('--- 生成文本（截取） ---')
    console.log(text.split('\n').slice(5, 16).join('\n'))
    console.log('-------------------------')

    if (out.preceding === 2) ok('无 SPINE 项目：前序主支 = 2（M10、M20）')
    else bad('无 SPINE 项目：前序主支数不对', String(out.preceding))
    if (/M10/.test(text) && /M20/.test(text)) ok('文本里列出 M10 与 M20')
    else bad('文本没列全前序主支')
    if (/队列定义 v1/.test(text) && out.ancestors === 1) ok('祖先分支链识别到 B30-01（1 级）')
    else bad('祖先分支链没识别出来', String(out.ancestors))
    const iRoot = text.indexOf('B30-01')
    const iSelf = text.lastIndexOf('B30-02')
    if (iRoot >= 0) ok('祖先链含直接父 B30-01')
    else bad('祖先链缺直接父')
    if (iSelf > iRoot) ok('本分支出现在祖先链之后（顺序正确）')
    else bad('顺序不对：本分支早于祖先链')
  } catch (err) {
    bad('动态渲染失败', String(err && err.message).slice(0, 200))
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

console.log('')
console.log(`RESULT: ${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} FAILURE(S)`}`)
process.exit(fails === 0 ? 0 : 1)
