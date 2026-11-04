#!/usr/bin/env node
/**
 * 打包完整性验收：src/ 下每个被 import 的模块都必须出现在 tools/build-client.mjs 的装配清单里。
 *
 * 背景（真实缺陷）：GoalCardView.js 与 core/goal-skills.js 写好并接入 WorkbenchPanel，
 * 但漏加进 build-client.mjs 的 SOURCES 清单 → bundle 缺实现，运行时点开「研究目标编辑器」
 * 直接报错；而 verify-client 的既有断言全部照旧通过（它只检查旧页面）。
 * 本脚本专治这类「源码有、bundle 无」的静默漂移。
 *
 * 用法：node verify/verify-bundle-coverage.mjs
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const BUILD = resolve(ROOT, 'tools', 'build-client.mjs')
const BUNDLE = resolve(ROOT, 'lib', 'client.js')

let fails = 0
const ok = (message) => console.log(`  OK   ${message}`)
const bad = (message, detail) => {
  fails += 1
  console.log(`  FAIL ${message}${detail ? `  → ${detail}` : ''}`)
}

/** 递归列出目录下所有 .js 文件（绝对路径）。 */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.name.endsWith('.js')) out.push(p)
  }
  return out
}

const toRel = (abs) => abs.slice(ROOT.length + 1).split('\\').join('/')

const buildText = readFileSync(BUILD, 'utf8')
const listed = new Set([...buildText.matchAll(/'((?:src|lib)\/[^']+\.js)'/g)].map((m) => m[1]))
ok(`装配清单解析出 ${listed.size} 个模块`)

const unlisted = new Set()
for (const file of walk(resolve(ROOT, 'src'))) {
  const rel = toRel(file)
  const text = readFileSync(file, 'utf8')
  if (/^\s*export\s/m.test(text) && !listed.has(rel)) unlisted.add(rel)
  for (const m of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), m[1].endsWith('.js') ? m[1] : `${m[1]}.js`)
    const trel = toRel(target)
    if (!listed.has(trel)) unlisted.add(trel)
  }
}
const missing = [...unlisted].sort()
if (missing.length === 0) ok('src 下所有被 import 的模块都已进装配清单')
else bad('存在未装配模块（bundle 会缺实现）', missing.join('、'))

// bundle 内必须真实含目标卡编辑器（两端特征字符串）
const bundle = readFileSync(BUNDLE, 'utf8')
if (bundle.includes('renderGoalCardView')) ok('bundle 含目标卡编辑器渲染函数')
else bad('bundle 缺 renderGoalCardView（GoalCardView.js 未装配）')
if (bundle.includes('我假设了')) ok('bundle 含八层审计输入框')
else bad('bundle 缺「我假设了」占位文案（GoalCardView 未真正装配）')
if (bundle.includes('翻过来会变成什么')) ok('bundle 含翻转问题输入框')
else bad('bundle 缺「翻过来会变成什么」占位文案')

/* ---- v3.11 分支可排序/增删（UI 侧回归）----
 * 背景：分支顺序由宿主 /fishbone 按 rdw-rib-meta.json 的 ribOrder 排好，
 * 若视图层再按状态 sort 一次，用户点「上移/下移」就看不到任何变化（静默失效）。
 */
for (const label of ['上移分支', '下移分支', '在同一主支下新建分支', '删除到回收站…']) {
  if (bundle.includes(label)) ok(`分支菜单含「${label}」`)
  else bad(`分支菜单缺「${label}」`)
}
const fishboneSrc = readFileSync(resolve(ROOT, 'src', 'views', 'FishboneView.js'), 'utf8')
const modulesRibsLine = fishboneSrc.match(/const moduleRibs = [^\n]*/)
if (modulesRibsLine && /RIB_RANK/.test(modulesRibsLine[0])) {
  bad('FishboneView 仍按 RIB_RANK 重排分支顺序（会覆盖用户的上移/下移）', modulesRibsLine[0].trim())
} else {
  ok('FishboneView 以宿主顺序渲染分支（不再按状态重排）')
}
if (/const moveRib = async/.test(readFileSync(resolve(ROOT, 'src', 'WorkbenchPanel.js'), 'utf8'))) {
  ok('WorkbenchPanel 实现 moveRib（接 /rib-op move）')
} else {
  bad('WorkbenchPanel 缺 moveRib')
}

/* ---- v3.12 研究目标「开始讨论」入口（不再只是复制到剪贴板）---- */
{
  const panel = readFileSync(resolve(ROOT, 'src', 'WorkbenchPanel.js'), 'utf8')
  const card = readFileSync(resolve(ROOT, 'src', 'components', 'GoalCardView.js'), 'utf8')
  const skills = readFileSync(resolve(ROOT, 'src', 'core', 'goal-skills.js'), 'utf8')
  if (/const startGoalDiscussion = async/.test(panel)) ok('面板实现 startGoalDiscussion')
  else bad('面板缺 startGoalDiscussion（讨论入口未接会话）')
  if (/const injectTextToComposer = React\.useCallback/.test(panel)) ok('注入逻辑提到组件级 injectTextToComposer')
  else bad('缺组件级 injectTextToComposer')
  if (/onCopyPrompt: startGoalDiscussion/.test(panel)) ok('目标卡按钮接「开始讨论」')
  else bad('目标卡按钮仍只复制剪贴板')
  if (card.includes('开始讨论')) ok('目标卡按钮文案为「开始讨论」')
  else bad('目标卡按钮文案未更新')
  for (const key of ['zhuanz-thinking-framework', 'good-question', 'falsifier']) {
    if (skills.includes(key)) ok(`脚手架含 ${key}`)
    else bad(`脚手架缺 ${key}`)
  }
  if (bundle.includes('开始研究目标讨论')) ok('bundle 含右键「开始研究目标讨论」')
  else bad('bundle 缺「开始研究目标讨论」菜单项')

  /* ---- v3.18 点哪看哪：每个分支/主支/研究目标各有**独立**会话 ---- */
  {
    if (/const openSessionForNode = React\.useCallback/.test(panel)) ok('存在统一的节点会话切换入口 openSessionForNode')
    else bad('缺少 openSessionForNode（点了分支还是看同一个会话）')
    const body = (panel.match(/const openSessionForNode = React\.useCallback\([\s\S]*?\n      \[/) || [''])[0]
    if (/op: 'session-get'/.test(body)) ok('切换前先查已绑定会话（能恢复历史）')
    else bad('切换前没有查询已绑定会话（历史恢复不了）')
    if (/op: 'session-bind'/.test(body)) ok('新建会话后写回绑定（下次还记得）')
    else bad('新建会话后没有写回绑定（每次都要重建）')

    /* ---- v3.29 上下文必须写进「本节点那个会话」，不能落进上一个会话的草稿 ---- */
    {
      if (/const injectTextToComposer = React\.useCallback\(\s*\(text, sessionIdHint\)/.test(panel)) {
        ok('注入支持显式指定目标会话（不再只认「当前会话」）')
      } else bad('注入仍只认当前会话（切换未完成时会写错会话）')
      if (/const curSession =[\s\S]{0,260}sessionIdHint/.test(panel)) ok('目标会话优先于当前会话')
      else bad('没有优先使用目标会话')
      if (/const writeContextTo = async \(target, text\)/.test(panel)) ok('统一走 writeContextTo(target, text)')
      else bad('缺统一的上下文写入函数')
      const wc = (panel.match(/const writeContextTo = async[\s\S]*?\n          \}/) || [''])[0]
      if (/currentId\(\) === target/.test(wc)) ok('写入前等待会话切换完成')
      else bad('没有等待切换（会写进旧会话）')
      if (/injectTextToComposer\(body, target/.test(wc)) ok('写入时带目标会话 id')
      else bad('写入没带目标 id')
      if (/await writeContextTo\(created \|\| ''/.test(panel)) ok('主流程统一调用 writeContextTo')
      else bad('主流程没走统一写入')
    }

    /* ---- v3.30 严格按节点独立会话：有历史恢复，无历史新建，绝不跨节点偷盗会话 ---- */
    {
      if (/if \(bound\) \{[\s\S]*?stillExists[\s\S]*?reveal\(bound\)[\s\S]*?return bound/.test(panel)) {
        ok('有历史的节点直接 reveal(bound) 恢复历史且立刻 return，不覆写上下文')
      } else bad('有历史的节点未正确恢复或被后续覆盖')
      if (!/claimOrphanSession/.test(panel)) {
        ok('已彻底移除 claimOrphanSession（防止点击新分支时把其他分支的会话强行认领过来）')
      } else bad('仍存在 claimOrphanSession，会导致分支间串会话')
      if (/created = await tryCreateSession\(\)/.test(panel)) {
        ok('无历史记录的节点直接创建属于自己的独立新会话')
      } else bad('无历史记录节点未调用 tryCreateSession')
      const hostSrcClaim = readFileSync(resolve(ROOT, 'lib', 'host.js'), 'utf8')
      if (/normalizeSessionKey/.test(hostSrcClaim) && /branch:\$\{modPart\}\/\$\{branchPart\}/.test(hostSrcClaim)) {
        ok('宿主 normalizeSessionKey 完整支持 branch:<module>/<id> 复合 key')
      } else bad('宿主未支持 branch:<module>/<id>')
    }

    /* ---- v3.27 研究目标是「第 0 个主支」：点它也能开独立对话，技能不变 ---- */
    {
      const fish = readFileSync(resolve(ROOT, 'src', 'views', 'FishboneView.js'), 'utf8')
      if (/v-spine-goal/.test(fish)) ok('研究主线顶部有「研究目标」行（第 0 个主支）')
      else bad('研究主线顶部没有研究目标项')
      if (/onSelectGoalSession/.test(fish) && /onSelectGoalSession/.test(panel)) {
        ok('点研究目标 → 绑定到 onSelectGoalSession')
      } else bad('研究目标点击没有接到面板')
      if (/openSessionForNode\('goal', \{[^}]*contextText: prompt/.test(panel)) {
        ok('研究目标用它自己的独立对话（goal key），并注入技能脚手架')
      } else bad('研究目标没有走独立对话')
      if (/buildGoalDiscussionPrompt\(/.test(panel)) ok('技能脚手架复用 buildGoalDiscussionPrompt（八层 + good-question 不变）')
      else bad('技能脚手架缺失')
      if (/setSelectedModule\('__goal__'\)/.test(panel)) ok('选中态标记为 __goal__（与真实主支区分）')
      else bad('没有把研究目标设为可选中项')
    }

    /* ---- v3.25 自适应新建会话：不许写死不存在的宿主 API，也不许碰工作区服务 ---- */
    if (/const discoverSessionCreator = React\.useCallback/.test(panel)) {
      ok('存在会话 API 自适应探测（discoverSessionCreator）')
    } else bad('缺少会话 API 自适应探测（新建会话无法落地）')
    {
      const probe = (panel.match(/const discoverSessionCreator = React\.useCallback\([\s\S]*?\n    \}, \[hostService\]\)/) || [''])[0]
      if (/const id = pickId\(created\)[\s\S]*?id !== currentNow/.test(panel)) {
        ok('只有拿到「新会话 id（≠当前）」才算新建成功')
      } else bad('没有校验新会话 id（会误判复用为成功）')
      if (/ctx\.get\('sessions'\)|for \(const name of \['sessions'/.test(panel)) ok('探测拿 Cordis 的会话服务')
      else bad('探测没覆盖会话服务')
      if (!/uiWorkspace/.test(probe)) ok('探测源不含 uiWorkspace（避免触发目录选择框）')
      else bad('探测源含 uiWorkspace（可能弹 Select Workspace Directory）')
      if (/该节点还没有独立对话|已新建该节点的独立对话/.test(panel)) ok('未绑定结果有明确提示（不把别人的历史冒充本节点）')
      else bad('未绑定结果没有提示')
      if (/op: 'diag-write'/.test(panel)) ok('宿主诊断落盘（control/rdw-diag.json）')
      else bad('缺宿主诊断落盘（拿不到真实 API 清单）')
    }

    /* ---- v3.23 右侧空壳「AI 对话」侧栏默认不显示，只有主动点击才出现 ---- */
    if (/setChatOpen\(true\)/.test(body)) {
      bad('点分支时会自动弹出右侧侧栏（应只在用户点「打开对话」时打开）')
    } else ok('点分支/主支不再自动弹出右侧侧栏')
    {
      // 允许的 setChatOpen(true) 只能出现在按钮的 onToggleChat / chatStart 里
      const lines = panel.split('\n')
      const autoIdx = []
      lines.forEach((line, i) => {
        if (!line.includes('setChatOpen(true)')) return
        const near = lines.slice(Math.max(0, i - 8), i + 1).join('\n')
        if (!/onToggleChat|onClick: startChat|startChat\b/.test(near)) autoIdx.push(i + 1)
      })
      if (autoIdx.length === 0) ok('setChatOpen(true) 只出现在「打开对话」按钮路径')
      else bad('仍存在非按钮触发的自动打开', autoIdx.join('、'))
    }
    // v3.24：整个 aside 不再渲染（`--rdw-chat-width` 这类 CSS 变量残留不影响）
    if (!/className: chatOpen \? 'rdw-chat'/.test(panel) && !/rdw-chat-slot/.test(panel)) {
      ok('不再渲染 rdw-chat aside / slot（模块已删除）')
    } else bad('仍在渲染对话侧栏容器')

    /* ---- v3.26 零弹框（按官方 API 校准）：建会话路径只允许不会弹目录框的路径 ---- */
    // DSH 官方参考实现（workbench/.ref/dwb-client.js）：
    //   ensureSession({folder})    = workspaces.create({path}) + sessions.create({workspaceId})  ← 不弹框
    //   newWorkspaceSession()      = uiWorkspace.pickDirectory() + …                              ← 弹框
    // 所以：openSessionForNode 切换/新建会话时，禁止调用 pickDirectory 与 newWorkspaceSession。
    const nodeSessionCode = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const forbiddenInSession = [
      ['pickDirectory(', /\.pickDirectory\(/],
      ['newWorkspaceSession(', /newWorkspaceSession\s*\(/],
    ]
    const foundInSession = forbiddenInSession.filter(([, re]) => re.test(nodeSessionCode)).map(([name]) => name)
    if (foundInSession.length === 0) ok('切换/新建会话时绝不调用会弹目录框的接口（pickDirectory / newWorkspaceSession）')
    else bad('会话切换中存在弹工作区目录的调用', foundInSession.join('、'))

    const callSite = panel.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    if (/hostService\.ensureSession\(\{ folder: rootPath \}\)/.test(callSite)) {
      ok('用官方 ensureSession({folder:项目}) 建会话（不弹目录框）')
    } else bad('没有用官方 ensureSession 建会话')
    if (/ctx\.sessions\.create\(\{\s*workspaceId/.test(callSite) || /sessions\.create\(\{ workspaceId \}\)/.test(callSite)) {
      ok('细粒度路径走 ctx.sessions.create({workspaceId})')
    } else bad('缺少 sessions.create 细粒度路径')
    if (/ctx\.workspaces\.create\(\{\s*path: rootPath\s*\}\)/.test(callSite)) ok('按项目目录建/取工作区（workspaces.create({path})）')
    else bad('没有按项目目录取工作区')

    /* ---- v3.31 新建项目弹窗提供文件夹按钮（供主动选择路径文件夹） ---- */
    {
      const dialogSrc = readFileSync(resolve(ROOT, 'src', 'components', 'ReasonDialog.js'), 'utf8')
      if (/rdw-browse-folder-btn/.test(dialogSrc) && /选择文件夹/.test(dialogSrc)) {
        ok('新建项目弹窗在路径框右侧提供「📁 选择文件夹」按钮')
      } else bad('新建项目弹窗缺少选择文件夹按钮')
      if (/onPickFolder/.test(dialogSrc)) ok('新建项目弹窗支持 onPickFolder 属性')
      else bad('缺少 onPickFolder 属性')
      if (/pickProjectFolder/.test(panel) && /onPickFolder:\s*pickProjectFolder/.test(panel)) {
        ok('面板向新建项目弹窗传入 pickProjectFolder')
      } else bad('面板未接入 pickProjectFolder')
    }

    if (/typeof hostService\.showSession === 'function'/.test(body)) ok('切换对话只用 showSession（纯切换，不索要目录）')
    else bad('缺少安全切换路径')
    if (/bindCurrentSessionTo/.test(panel)) ok('提供「把当前对话绑定到此节点」入口（独立对话靠绑定建立）')
    else bad('缺绑定入口（无法建立独立对话）')
    if (/op: 'session-bind'/.test(panel)) ok('绑定写入 sessionOf（下次点该节点可切回）')
    else bad('绑定没有落盘')

    // 切回老会话不得覆盖历史
    const boundBranch = (body.match(/if \(bound\) \{[\s\S]*?\n          \}/) || [''])[0]
    if (boundBranch && !/injectTextToComposer/.test(boundBranch)) ok('切回已绑定会话时不注入上下文（不覆盖历史）')
    else bad('切回老会话仍注入上下文（会污染该对话历史）')

    if (/writeContextTo\(created \|\| ''/.test(body)) ok('未绑定时把继承链上下文写入本节点会话')
    else bad('未绑定时没有注入上下文')

    // key 必须带主支前缀，避免不同主支下的同名分支互相串
    if (/openSessionForNode\(`branch:\$\{rib\.module\}\/\$\{rib\.id\}`/.test(panel)) ok('分支 key 含主支前缀（同名分支不串会话）')
    else bad('分支 key 未含主支前缀（同名分支会串）')
    if (/const legacy = `branch:\$\{normalized\.split\('\/'\)\.pop\(\)\}`/.test(panel)) ok('兼容旧的 branch:<id> 绑定并迁移')
    else bad('旧绑定不兼容（升级后历史会丢）')
    if (/openSessionForNode\(`module:\$\{id\}`/.test(panel)) ok('点主支 → 切到该主支自己的会话')
    else bad('点主支没有切到主支会话')
    if (/openSessionForNode\('goal'/.test(panel)) ok('研究目标讨论 → 用目标专属会话')
    else bad('研究目标讨论没有用专属会话')

    /* ---- v3.19 上下文必须含「所有前序主支」，且对话固定落在项目目录 ---- */
    if (/const buildBranchContextText = /.test(panel) && /const buildModuleContextText = /.test(panel)) {
      ok('分支/主支上下文文案集中到 buildBranchContextText / buildModuleContextText')
    } else bad('缺上下文文案构造函数')
    if (/spineAll\.slice\(0, idx\)/.test(panel)) ok('前序主支用 slice(0, idx) 取全部（不是只取上一个）')
    else bad('前序主支没有取全部（只列本主支就错了）')
    if (/前序主支结果（本主支之前的所有主支，共 \$\{preceding\.length\} 个）/.test(panel)) {
      ok('文案明确「所有主支」并给出个数')
    } else bad('文案没说明是全部前序主支')
    if (/\$\{dir\}DRAFT\.md/.test(panel) && /状态 \$\{status\}/.test(panel)) ok('每个前序主支带成稿路径与状态')
    else bad('前序主支缺成稿路径/状态')
    if (/祖先分支链（根分支 → 直接父分支，共 \$\{ancestors\.length\} 级）/.test(panel)) ok('祖先分支链列出全部层级')
    else bad('祖先分支链没列全')
    if (/ancestors\.reverse\(\)/.test(panel)) ok('祖先链反转为「根 → 直接父」')
    else bad('祖先链顺序不是根→父')
    if (/本对话与项目同目录，无需另设会话文件夹/.test(panel)) ok('对话固定落在项目目录（不再反复设置会话文件夹）')
    else bad('没有说明对话落在项目目录')
    // v3.22：不再由插件锁定/创建 workspace（那会弹目录框）；文件夹由项目目录决定，
    // 会话由宿主创建、插件只做绑定。这里断言项目目录措辞仍存在即可。
    if (/项目：\$\{rootPath\}/.test(panel)) ok('上下文里标明项目目录即对话文件夹')
    else bad('上下文没标明项目目录')

    // 新建分支后必须进入它自己的会话，而不是往当前会话灌上下文
    const mounted = (panel.match(/mountContextToSession\(\{ module[\s\S]*?\}\)/g) || []).length
    if (!/mountContextToSession\(\{ module: (moduleId|form\.moduleId), branch:/.test(panel)) ok('新建分支后不再往「当前会话」灌上下文')
    else bad('新建分支后仍写进当前会话（分支内容会混进别的对话）')
    if (mounted === 0) ok('创建分支路径已全部改为独立会话（0 处旧调用）')
    else bad('仍有创建分支路径调用 mountContextToSession')

    const hostSrc2 = readFileSync(resolve(ROOT, 'lib', 'host.js'), 'utf8')
    if (/case 'session-get'/.test(hostSrc2) && /case 'session-bind'/.test(hostSrc2)) ok('宿主提供 session-get / session-bind')
    else bad('宿主缺 session-get / session-bind')
    if (/sessionOf/.test(hostSrc2)) ok('绑定持久化在 control/rdw-rib-meta.json 的 sessionOf')
    else bad('绑定没有持久化位置')
    // 继承顺序必须写死在注入文本里（否则「逐级继承」只是口号）
    if (/前序主支结果 → 本主支结果/.test(panel)) ok('注入文本写明继承顺序契约')
    else bad('注入文本没有写明继承顺序')
    if (/祖先分支链/.test(panel)) ok('注入文本含祖先分支链')
    else bad('注入文本缺祖先分支链')
    // [object Object] 回归
    if (!/state\.project \|\| '科研项目'/.test(hostSrc2)) ok('不再把 project 对象直接拼进提示词（[object Object] 已修）')
    else bad('仍会把 project 对象拼成 [object Object]')
  }

  /* ---- v3.16 讨论必须发生在右侧原生对话框里，而不是只在剪贴板 ---- */
  {
    const idx = panel.indexOf('const startGoalDiscussion = async () => {')
    const startFn = idx >= 0 ? panel.slice(idx, idx + 2000) : ''
    // v3.23：讨论不再自动弹出右侧空壳侧栏（宿主会话已在中栏），只要求把提示词写进输入框
    if (/attachCurrentSession\(\)/.test(startFn)) ok('「开始讨论」挂载/激活宿主会话')
    else bad('「开始讨论」未挂载宿主会话')
    if (/writeWithRetry/.test(startFn)) ok('「开始讨论」对输入框未就绪做重试')
    else bad('「开始讨论」没有重试（原生节点刚挂上会写不进去）')
    if (/onSyncGoal: syncGoalFromCard/.test(panel)) ok('「生成研究目标」已接 syncGoalFromCard')
    else bad('「生成研究目标」未接线')
  }

  /* ---- v3.13 递归分支与逐级回连 ---- */
  if (bundle.includes('逐级回连到主支')) ok('bundle 含「逐级回连到主支」菜单项')
  else bad('bundle 缺「逐级回连到主支」（递归分支无法一次回连完）')
  if (/openGraftDialog\(rib\.id, \{ chain: true \}\)/.test(panel)) ok('逐级回连菜单真的传 chain:true')
  else bad('逐级回连菜单没有传 chain:true（会退化成普通回连）')
  const hostSrc = readFileSync(resolve(ROOT, 'lib', 'host.js'), 'utf8')
  if (/body\.chain === true.*--chain/s.test(hostSrc)) ok('宿主把 chain 透传为 CLI --chain')
  else bad('宿主没有透传 --chain')
}

/* ---- v3.15 bundle 模块化装配的正确性 ----
 * 所有模块拼进同一作用域，import 会被删掉。因此：
 *   ① 不允许残留 import 行（残留 = 语法错误）；
 *   ② `import { A as B }` 必须落成 `const B = A`（否则 B is not defined；
 *      真实故障：SKILL_LAYERS is not defined → 打开目标卡整页白屏）；
 *   ③ 别名声明不得早于其依赖符号的定义（否则 const TDZ 报错）。
 */
{
  const srcDir = resolve(ROOT, 'src')
  const walkAll = (dir) => {
    const out = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, entry.name)
      if (entry.isDirectory()) out.push(...walkAll(p))
      else if (entry.name.endsWith('.js')) out.push(p)
    }
    return out
  }
  const aliasPairs = []
  for (const file of walkAll(srcDir)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/import\s+\{([\s\S]*?)\}\s+from\s+['"]/g)) {
      for (const part of m[1].split(',')) {
        const pair = part.trim().match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
        if (pair) aliasPairs.push({ from: pair[1], to: pair[2] })
      }
    }
  }
  const lines = bundle.split('\n')
  const missingAlias = aliasPairs.filter((p) => !bundle.includes(`const ${p.to} = ${p.from}`))
  if (missingAlias.length === 0) ok(`import 别名全部落成 const（${aliasPairs.length} 个）`)
  else bad('存在未落地的 import 别名（运行时 is not defined）', missingAlias.map((p) => `${p.to}=${p.from}`).join('、'))

  const residual = lines.map((line, i) => ({ line: line.trim(), i: i + 1 })).filter((x) => /^import\s/.test(x.line))
  if (residual.length === 0) ok('bundle 无残留 import 语句')
  else bad('bundle 残留 import 语句（语法错误）', residual.slice(0, 3).map((x) => `L${x.i}`).join('、'))

  const orderProblems = []
  for (const p of aliasPairs) {
    const defRe = new RegExp(`(?:const|let|var|function)\\s+${p.from}\\b`)
    const defIdx = lines.findIndex((line) => defRe.test(line))
    const aliasIdx = lines.findIndex((line) => line.includes(`const ${p.to} = ${p.from}`))
    if (defIdx >= 0 && aliasIdx >= 0 && defIdx > aliasIdx) {
      orderProblems.push(`${p.to}（依赖定义 L${defIdx + 1} 晚于别名 L${aliasIdx + 1}）`)
    }
  }
  if (orderProblems.length === 0) ok('别名声明都在其依赖符号定义之后（无 TDZ 风险）')
  else bad('存在 TDZ 风险：别名早于依赖定义', orderProblems.join('、'))
}

console.log('')
console.log(`RESULT: ${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} FAILURE(S)`}`)
process.exit(fails === 0 ? 0 : 1)
