#!/usr/bin/env node
/**
 * 独立验收：`dsh-research-dag-workbench` 浏览器半侧（v2.1 内容优先）） *
 * 最）React shim（hook 槽位 + 效果队列 + 元素树）加载 lib/client.js） * mock 全局 fetch ）ctx.slots，渲染面板并断言文本/交互/请求体） *
 * 覆盖） *   A) loader / 槽位 / label 等原有过场断言） *   B) 新宿主（/health.actions ）content）默认「内容」页） *   C) 内容详情抽屉 / 满意 POST /bridge / 记想）POST /bridge） *   D) 网络页（digest：概）/ 待你复核 / attention / 停滞 / 发布与拉取）） *   E) 工程页（DAG / 交接 / 校验与运）/ 概览 + 旧回）verify）；
 *   F) 旧宿主（）content）降级：重启提示 + 旧结果页，网络页提示，工程页照常，不崩溃） *
 * 用法：node verify/verify-client.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')
const BUNDLE = resolve(PACKAGE_ROOT, 'lib', 'client.js')
const ROUTE = '/research-workbench'
const SAMPLE_ROOT = 'D:\\ZhuanZ\\Documents\\research-dag\\examples\\early-phosphate'

const failures = []
const ok = (message) => console.log(`  OK   ${message}`)
const bad = (message) => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const assert = (condition, message) => (condition ? ok(message) : bad(message))

/* ------------------------------------------------------------------ fixture */

const MODULE_DEFS = [
  { id: 'M10', name: '研究问题与方案' },
  { id: 'M20', name: '文献检索' },
  { id: 'M30', name: '数据与队列' },
  { id: 'M40', name: '统计分析' },
  { id: 'M50', name: '论文写作' },
  { id: 'M60', name: '审稿修订' },
]

function moduleCounts(accepted, provisional, blocked) {
  return {
    draft: 0,
    provisional: provisional || 0,
    accepted: accepted || 0,
    rejected: 0,
    superseded: 0,
    blocked: blocked || 0,
  }
}

const stateModules = [
  { id: 'M10', name: '研究问题与方案', branches: 2, counts: moduleCounts(2, 0, 0) },
  { id: 'M20', name: '文献检索', branches: 2, counts: moduleCounts(1, 0, 0) },
  { id: 'M30', name: '数据与队列', branches: 3, counts: moduleCounts(1, 0, 1) },
  { id: 'M40', name: '统计分析', branches: 3, counts: moduleCounts(1, 1, 0) },
  { id: 'M50', name: '论文写作', branches: 2, counts: moduleCounts(0, 1, 0) },
  { id: 'M60', name: '审稿修订', branches: 1, counts: moduleCounts(0, 0, 0) },
]

const handoffs = [
  ['modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md', 'M10', 'B10-01', 'protocol-charter', 1, 'ACCEPTED'],
  ['modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md', 'M10', 'B10-02', 'estimand-spec', 1, 'ACCEPTED'],
  ['modules/M20-literature-search/handoffs/HANDOFF-B20-01-SEARCH-v1.md', 'M20', 'B20-01', 'literature-search', 1, 'REJECTED'],
  ['modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md', 'M20', 'B20-02', 'literature-search', 2, 'ACCEPTED'],
  ['modules/M30-cohort/handoffs/HANDOFF-B30-01-COHORT-v1.md', 'M30', 'B30-01', 'cohort-definition', 1, 'SUPERSEDED'],
  ['modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md', 'M30', 'B30-02', 'cohort-definition', 2, 'ACCEPTED'],
  ['modules/M30-cohort/handoffs/HANDOFF-B30-03-MISSING-v1.md', 'M30', 'B30-03', 'missing-audit', 1, 'BLOCKED'],
  ['modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md', 'M40', 'B40-01', 'descriptive-tables', 1, 'ACCEPTED'],
  ['modules/M40-statistics/handoffs/HANDOFF-B40-02-MAIN-v1.md', 'M40', 'B40-02', 'main-analysis', 1, 'DRAFT'],
  ['modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md', 'M40', 'B40-03', 'iptw-diagnostics', 1, 'PROVISIONAL'],
  ['modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md', 'M50', 'B50-01', 'manuscript-outline', 1, 'ACCEPTED'],
  ['modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md', 'M50', 'B50-02', 'methods-section', 1, 'PROVISIONAL'],
].map(([path, moduleId, branch, stream, version, status]) => ({
  path,
  module: moduleId,
  branch,
  stream,
  version,
  status,
  created_at: '2026-10-18',
  submitted_at: status === 'DRAFT' ? null : '2026-10-18',
}))

const pendingDecisions = [
  {
    path: 'modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md',
    stream: 'iptw-diagnostics',
    version: 1,
    questions: ['是否接受「双侧 1%–99% 截尾」作为主分析权重方案（本次待决定）？', '若接受：主分析按 99% 截尾重跑。'],
  },
  {
    path: 'modules/M50-writing/handoffs/HANDOFF-B50-02-METHODS-v1.md',
    stream: 'methods-section',
    version: 1,
    questions: '是否接受当前方法学章节结构与 TARGET 对齐方式）,' },
]

const accepted = [
  { stream: 'protocol-charter', path: 'modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md', version: 1 },
  { stream: 'estimand-spec', path: 'modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md', version: 1 },
  { stream: 'literature-search', path: 'modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md', version: 2 },
  { stream: 'cohort-definition', path: 'modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md', version: 2 },
  { stream: 'descriptive-tables', path: 'modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md', version: 1 },
  { stream: 'manuscript-outline', path: 'modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md', version: 1 },
]

const projectStatus = {
  ok: true,
  project: { id: 'early-phosphate', title: '重症低磷血症患者早期补磷的 target trial emulation' },
  phase: 'analysis',
  next_steps: ['完成主分析 v1 并提交', '方法学章节按 TARGET 清单核对'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
  pending_decisions: pendingDecisions,
  accepted,
  modules: stateModules,
}

const resultsModules = MODULE_DEFS.map((module) => ({ id: module.id, name: module.name }))
const RESULT_DEFS = [
  {
    module: 'M10',
    moduleName: '研究问题与方案',
    branch: 'B10-01',
    stream: 'protocol-charter',
    version: 1,
    title: '研究方案与 PICO 范围',
    question: '早期补磷是否降低重症低磷血症患者的 28 天死亡？',
    keyResults:

      '主要终点为 28 天全因死亡。目标试验模拟定义入组窗口为 ICU 入住 24 小时内。\n采用克隆-删失-加权方法控制 immortal time bias。\n初步结果显示风险比约 0.82（95% CI 0.68–0.99）。\n尚未做敏感性分析。',
    limitations: '观察性数据存在未测量混杂；补磷剂量由临床决定。',
    files: ['modules/M10-research-question/outputs/protocol.pdf', 'modules/M10-research-question/outputs/pico.csv'],
    path: 'modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md',
    decidedAt: '2026-09-24',
  },
  {
    module: 'M10',
    moduleName: '研究问题与方案',
    branch: 'B10-02',
    stream: 'estimand-spec',
    version: 1,
    title: 'estimand 与时点定义',
    question: '主分析的 estimand 如何定义？',
    keyResults: '采用 ATE estimand，随访 28 天。',
    limitations: '依赖正确指定删失模型。',
    files: ['modules/M10-research-question/outputs/estimand.md'],
    path: 'modules/M10-research-question/handoffs/HANDOFF-B10-02-ESTIMAND-v1.md',
    decidedAt: '2026-09-19',
  },
  {
    module: 'M20',
    moduleName: '文献检索',
    branch: 'B20-02',
    stream: 'literature-search',
    version: 2,
    title: '文献检索与 PRISMA 流程',
    question: '早期补磷相关证据有多少？',
    keyResults: '检索纳入 12 篇观察性研究。',
    limitations: '存在发表偏倚可能。',
    files: ['modules/M20-literature-search/outputs/search_log.csv'],
    path: 'modules/M20-literature-search/handoffs/HANDOFF-B20-02-SEARCH-v2.md',
    decidedAt: '2026-10-03',
  },
  {
    module: 'M30',
    moduleName: '数据与队列',
    branch: 'B30-02',
    stream: 'cohort-definition',
    version: 2,
    title: '队列定义 v2',
    question: '如何定义 ICU 低磷血症队列？',
    keyResults: '队列共 12,483 例。',
    limitations: '磷酸盐检测不均衡。',
    files: ['modules/M30-cohort/outputs/cohort.csv'],
    path: 'modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md',
    decidedAt: '2026-10-10',
  },
  {
    module: 'M40',
    moduleName: '统计分析',
    branch: 'B40-01',
    stream: 'descriptive-tables',
    version: 1,
    title: '基线表 Table 1',
    question: '两组基线是否可比？',
    keyResults: '加权前多数变量 |SMD| < 0.1。',
    limitations: '部分变量缺失。',
    files: ['modules/M40-statistics/outputs/table1.csv'],
    path: 'modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md',
    decidedAt: '2026-10-14',
  },
  {
    module: 'M50',
    moduleName: '论文写作',
    branch: 'B50-01',
    stream: 'manuscript-outline',
    version: 1,
    title: '论文大纲与字数预算',
    question: '论文结构如何安排？',
    keyResults: '确定 IMRaD 结构与字数预算。',
    limitations: '待结果定稿后调整。',
    files: ['modules/M50-writing/outputs/outline.md'],
    path: 'modules/M50-writing/handoffs/HANDOFF-B50-01-OUTLINE-v1.md',
    decidedAt: '2026-10-16',
  },
]

const resultsPayload = {
  ok: true,
  project: { id: 'early-phosphate', title: '重症低磷血症患者早期补磷的 target trial emulation', phase: 'analysis' },
  modules: resultsModules,
  results: RESULT_DEFS,
  pending: pendingDecisions.map((item) => ({
    path: item.path,
    module: item.stream === 'methods-section' ? 'M50' : 'M40',
    branch: item.stream === 'methods-section' ? 'B50-02' : 'B40-03',
    stream: item.stream,
    version: item.version,
    question: Array.isArray(item.questions) ? item.questions.join('；') : item.questions,
  })),
  attention: [{ code: 'DAG-E005', path: 'modules/M40-statistics/outputs/table1.csv', message: '文件 SHA-256 与账本不一致' }],
  counts: { modules: 6, results: 6, pending: 2, draft: 1, blocked: 1 },
}

const selfProjectId = 'early-phosphate'
const otherProjectId = 'lipid-trial'

const networkFixture = {
  ok: true,
  generatedAt: '2026-10-19T01:00:00+08:00',
  networkUpdated: '2026-10-19T00:58:00+08:00',
  selfProjectId,
  since: null,
  projects: [
    {
      projectId: selfProjectId,
      title: '论文大纲与字数预算',
      phase: 'analysis',
      percent: 67,
      accepted: 6,
      pending: 2,
      draft: 1,
      blocked: 1,
      updated: '2026-10-19T00:30:00+08:00',
      progress: { phase: 'analysis', accepted: 6, pending: 2, draft: 1, blocked: 1, percent: 67 },
      completion: [
        { module: 'M10', name: '研究问题与方案', accepted: ['protocol-charter', 'estimand-spec'], pending: [], blocked: [], status: 'done', acceptedCount: 2, reviewedCount: 2 },
        { module: 'M20', name: '文献检索', accepted: ['literature-search'], pending: [], blocked: [], status: 'done', acceptedCount: 1, reviewedCount: 1 },
        { module: 'M30', name: '数据与队列', accepted: ['cohort-definition'], pending: [], blocked: ['missing-audit'], status: 'blocked', acceptedCount: 1, reviewedCount: 1 },
        { module: 'M40', name: '统计分析', accepted: ['descriptive-tables'], pending: ['iptw-diagnostics'], blocked: [], status: 'active', acceptedCount: 1, reviewedCount: 0 },
        { module: 'M50', name: '论文写作', accepted: ['manuscript-outline'], pending: ['methods-section'], blocked: [], status: 'active', acceptedCount: 1, reviewedCount: 0 },
        { module: 'M60', name: '审稿修订', accepted: [], pending: [], blocked: [], status: 'idle', acceptedCount: 0, reviewedCount: 0 },
      ],
      results: [
        { stream: 'descriptive-tables', version: 1, module: 'M40', path: 'modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md', summary: '加权后全部变）|SMD| < 0.05', acceptedAt: '2026-10-14', reviewed: false },
        { stream: 'protocol-charter', version: 1, module: 'M10', path: 'modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md', summary: '研究方案）PICO 范围', acceptedAt: '2026-09-24', reviewed: true },
      ],
      ideas: [{ at: '2026-10-18T20:00:00+08:00', text: '补充亚组分析', tag: 'stats' }],
      reviewed: [
        { stream: 'protocol-charter', version: 1, at: '2026-10-18T21:00:00+08:00', by: 'user', satisfied: true, note: '内容满意' },
        { stream: 'estimand-spec', version: 1, at: '2026-10-18T21:00:00+08:00', by: 'user', satisfied: true, note: '内容满意' },
      ],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
      summary: '',
      review: { accepted: 6, reviewed: 4, pending: 2, percent: 67 },
    },
    {
      projectId: otherProjectId,
      title: '论文大纲与字数预算',
      phase: 'analysis',
      percent: 42,
      accepted: 3,
      pending: 1,
      draft: 1,
      blocked: 1,
      updated: '2026-10-15T10:00:00+08:00',
      progress: { phase: 'analysis', accepted: 3, pending: 1, draft: 1, blocked: 1, percent: 42 },
      completion: [
        { module: 'M40', name: '统计分析', accepted: ['main-analysis'], pending: ['sensitivity-analysis'], blocked: [], status: 'active', acceptedCount: 1, reviewedCount: 0 },
      ],
      results: [
        { stream: 'main-analysis', version: 1, module: 'M40', path: 'modules/M40-statistics/handoffs/HANDOFF-B40-02-MAIN-v1.md', summary: '主分析完成', acceptedAt: '2026-10-14', reviewed: false },
      ],
      ideas: [{ at: '2026-10-14T09:00:00+08:00', text: '补充亚组分析', tag: 'stats' }],
      reviewed: [],
      blockers: ['等待数据管理）'],
      summary: '',
      review: { accepted: 3, reviewed: 1, pending: 2, percent: 33 },
    },
  ],
  attention: [
    { projectId: otherProjectId, kind: 'pending', text: '待决定：sensitivity-analysis', new: true },
    { projectId: otherProjectId, kind: 'blocked', text: '阻塞：等待数据管理员', new: true },
    { projectId: otherProjectId, kind: 'idea', text: '想法：补充亚组分析', at: '2026-10-14T09:00:00+08:00', new: true },
    { projectId: otherProjectId, kind: 'result', text: '结果：main-analysis v1（M40）— 主分析完成', at: '2026-10-14', new: true },
  ],
  stale: [{ projectId: otherProjectId, title: '血脂管理试验', updated: '2026-10-15T10:00:00+08:00', ageHours: 60 }],
  pendingReview: [
    {
      projectId: selfProjectId,
      title: '论文大纲与字数预算',
      module: 'M40',
      stream: 'descriptive-tables',
      version: 1,
      path: 'modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md',
      acceptedAt: '2026-10-14',
    },
    {
      projectId: otherProjectId,
      title: '基线表 Table 1',
      module: 'M40',
      stream: 'main-analysis',
      version: 1,
      path: 'modules/M40-statistics/handoffs/HANDOFF-B40-02-MAIN-v1.md',
      acceptedAt: '2026-10-14',
    },
  ],
  pendingReviewTotal: 2,
}

const contentFixture = {
  ok: true,
  project: {
    root: SAMPLE_ROOT,
    id: 'early-phosphate',
    title: '重症低磷血症患者早期补磷的 target trial emulation',
    phase: 'analysis',
  },
  results: resultsPayload,
  status: projectStatus,
  errors: { results: null, status: null },
  network: networkFixture,
  networkError: null,
  review: {
    byItem: {
      'protocol-charter@1': { satisfied: true, at: '2026-10-18T21:00:00+08:00', note: '内容满意' },
      'estimand-spec@1': { satisfied: true, at: '2026-10-18T21:00:00+08:00', note: '内容满意' },
      'literature-search@2': { satisfied: true, at: '2026-10-18T21:00:00+08:00', note: '内容满意' },
      'cohort-definition@2': { satisfied: true, at: '2026-10-18T21:00:00+08:00', note: '内容满意' },
    },
    pendingReview: [
      {
        stream: 'descriptive-tables',
        version: 1,
        module: 'M40',
        path: 'modules/M40-statistics/handoffs/HANDOFF-B40-01-TABLE1-v1.md',
      },
    ],
    summary: { accepted: 6, reviewed: 4, pending: 2, percent: 67 },
  },
}

const stateFixture = {
  ok: true,
  configured: true,
  config: { version: 1, projectRoot: SAMPLE_ROOT },
  project: {
    root: SAMPLE_ROOT,
    exists: true,
    isDag: true,
    id: 'early-phosphate',
    title: '基线表 Table 1',
    goal: '估计早期补磷）28 天死亡的影响',
    phase: 'analysis',
    next_steps: ['完成主分）v1 并提）'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
    modules: stateModules,
    branches: [
      { id: 'B10-01', module: 'M10', name: '研究方案', dir: 'modules/M10-research-question/branches/B10-01-protocol' },
      { id: 'B40-03', module: 'M40', name: 'IPTW 诊断', dir: 'modules/M40-statistics/branches/B40-03-iptw' },
    ],
    handoffs,
    pending_decisions: pendingDecisions,
    accepted,
    counts: { draft: 1, provisional: 2, accepted: 6, rejected: 1, superseded: 1, blocked: 1 },
  },
  verify: { ok: true, checked: { handoffs: 12, modules: 6, branches: 13, files: 26 }, issues: [] },
  statusRaw: projectStatus,
}

const handoffDetailFixture = {
  ok: true,
  path: 'modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md',
  frontmatter: {
    project: 'early-phosphate',
    module: 'M40',
    branch: 'B40-03',
    stream: 'iptw-diagnostics',
    version: 1,
    status: 'PROVISIONAL',
  },
  body: '## 1. 摘要\nIPTW 诊断正文。\n',
  content: '---\nmodule: M40\n---\n\n## 1. 摘要\n',
  size: 200,
}

const runsFixture = {
  ok: true,
  runs: [
    {
      id: 'r1',
      action: 'verify',
      status: 'succeeded',
      exitCode: 0,
      startedAt: '2026-10-19T00:00:00+08:00',
      endedAt: '2026-10-19T00:00:03+08:00',
      stdout: 'DAG-OK: 12 个交接全部通过校验',
      stderr: '',
      json: { ok: true },
    },
  ],
}

const healthNew = {
  ok: true,
  name: 'dsh-research-workbench',
  version: '2.4.0',
  route: ROUTE,
  actions: [
    'status',
    'verify',
    'list',
    'check',
    'submit',
    'accept',
    'reject',
    'block',
    'unblock',
    'report',
    'state-set',
    'results',
    'auto',
    'init',
    'module-add',
    'branch-add',
    'handoff-new',
    'content',
  ],
  bridgeActions: ['publish', 'idea', 'review', 'pull'],
  networkAvailable: true,
  example: SAMPLE_ROOT,
  configPath: 'C:\\Users\\ZhuanZ\\.dsh\\research-dag-workbench\\config.json',
}

const healthOld = {
  ok: true,
  name: 'dsh-research-workbench',
  version: '1.2.0',
  route: ROUTE,
  actions: [
    'status',
    'verify',
    'list',
    'check',
    'submit',
    'accept',
    'reject',
    'block',
    'unblock',
    'report',
    'state-set',
    'results',
    'auto',
    'init',
    'module-add',
    'branch-add',
    'handoff-new',
  ],
  example: SAMPLE_ROOT,
  configPath: 'C:\\Users\\ZhuanZ\\.dsh\\research-dag-workbench\\config.json',
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

/* ------------------------------------------------------------- fetch mock */

const ROUTE_PATHS = {
  health: `${ROUTE}/health`,
  state: `${ROUTE}/state`,
  results: `${ROUTE}/results`,
  content: `${ROUTE}/content`,
  fishbone: `${ROUTE}/fishbone`,
  leaderLog: `${ROUTE}/leader-log`,
  branchWork: `${ROUTE}/branch-work`,
  file: `${ROUTE}/file`,
  handoff: `${ROUTE}/handoff`,
  config: `${ROUTE}/config`,
  run: `${ROUTE}/run`,
  runs: `${ROUTE}/runs`,
  bridge: `${ROUTE}/bridge`,
  zotero: `${ROUTE}/zotero`,
  zoteroOp: `${ROUTE}/zotero-op`,
}

/** v3.8 Zotero 文献面板 fixture（/zotero 响应）。 */
const zoteroFixture = {
  ok: true,
  base: 'http://127.0.0.1:23119',
  available: true,
  error: '',
  ribId: 'B40-03',
  linked: ['3QFYZA46'],
  linkedCollection: null,
  items: [
    {
      key: '3QFYZA46',
      itemType: 'journalArticle',
      title: 'Aeroallergen hypersensitivity: Comparing patients with nasal polyps',
      creators: 'Janine A Van Lancker 等',
      year: 2005,
      publication: 'Allergy and asthma proceedings',
      doi: '',
      url: '',
      tags: ['/unread'],
      collections: ['ZKJZPKTF'],
      hasAbstract: true,
      abstractSnippet: 'Immunoglobulin E-mediated allergy',
    },
  ],
  missing: [],
  search: {
    query: 'iptw',
    items: [
      { key: 'WH669MPE', itemType: 'journalArticle', title: 'Local allergic rhinitis: concept and approach', creators: 'Rondón 等', year: 2010, publication: 'J Investig Allergol Clin Immunol', doi: '', url: '', tags: [], collections: [], hasAbstract: true, abstractSnippet: '' },
      { key: '3QFYZA46', itemType: 'journalArticle', title: 'Aeroallergen hypersensitivity', creators: 'Van Lancker 等', year: 2005, publication: 'Allergy', doi: '', url: '', tags: [], collections: [], hasAbstract: true, abstractSnippet: '' },
    ],
    total: 2,
    error: '',
  },
  collections: [
    { key: '3XTNE5IV', name: '病例书写', items: 4, depth: 0 },
    { key: '8DMF3B72', name: '顶刊论文', items: 13, depth: 0 },
    { key: 'GLFZACHZ', name: 'CCM/ICM', items: 27, depth: 1 },
  ],
}

/** Zotero 未连接 fixture：面板必须显示「未连接」而不是假数据。 */
const zoteroOfflineFixture = {
  ok: true,
  base: 'http://127.0.0.1:23119',
  available: false,
  error: 'Zotero 未运行',
  ribId: 'B40-03',
  linked: ['3QFYZA46'],
  linkedCollection: null,
  items: [],
  missing: ['3QFYZA46'],
  search: null,
  collections: null,
}

/** v2.4 项目流程视图 fixture）fishbone 响应））*/
/** v2.5 主智能体记录 fixture（/leader-log 响应）。 */
const leaderLogFixture = {
  ok: true,
  root: SAMPLE_ROOT,
  state: {
    phase: 'analysis',
    nextSteps: ['完成主分析 v1 并提交'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
  },
  decisions: [
    { id: 'D-0001', title: '接受研究方案 v1', at: '2026-09-22', action: 'ACCEPT', target: 'modules/M10-research-question/handoffs/HANDOFF-B10-01-PROTOCOL-v1.md', status: 'ACCEPTED', reason: '方案覆盖 estimand 与随访窗口', related: '', kind: 'decision', targetLabel: 'M10-research-question · PROTOCOL v1', sortAt: '2026-09-22T00:00:00' },
    { id: 'D-0003', title: '拒绝文献检索 v1', at: '2026-09-30', action: 'REJECT', target: 'modules/M20-literature-search/handoffs/HANDOFF-B20-01-SEARCH-v1.md', status: 'REJECTED', reason: '去重流程不可复现', related: '', kind: 'decision', targetLabel: 'M20-literature-search · SEARCH v1', sortAt: '2026-09-30T00:00:00' },
  ],
  ideas: [
    { kind: 'idea', at: '2026-10-19 01:01', tag: 'iptw', text: '建议把 IPTW 权重 99% 截尾作为主分析', sortAt: '2026-10-19T01:01:00' },
  ],
  reviews: [
    { kind: 'review', at: '2026-10-18T17:01:47.625Z', target: 'iptw-diagnostics v1', verdict: '满意', note: '权重截尾与平衡诊断可信', sortAt: '2026-10-18T17:01:47' },
  ],
  timeline: [
    { kind: 'idea', at: '2026-10-19 01:01', sortAt: '2026-10-19T01:01:00', title: '想法 · iptw', text: '建议把 IPTW 权重 99% 截尾作为主分析' },
    { kind: 'review', at: '2026-10-18T17:01:47.625Z', sortAt: '2026-10-18T17:01:47', title: '复核 · iptw-diagnostics v1', status: '满意', text: '权重截尾与平衡诊断可信' },
    { kind: 'decision', at: '2026-09-30', sortAt: '2026-09-30T00:00:00', id: 'D-0003', action: 'REJECT', status: 'REJECTED', title: '拒绝文献检索 v1', target: 'M20-literature-search · SEARCH v1', text: '去重流程不可复现' },
    { kind: 'decision', at: '2026-09-22', sortAt: '2026-09-22T00:00:00', id: 'D-0001', action: 'ACCEPT', status: 'ACCEPTED', title: '接受研究方案 v1', target: 'M10-research-question · PROTOCOL v1', text: '方案覆盖 estimand 与随访窗口' },
  ],
  counts: { decisions: 2, ideas: 1, reviews: 1, accepted: 1, rejected: 1, blocked: 0 },
  generatedAt: '2026-10-19T09:00:00+08:00',
}

const fishboneFixture = {
  ok: true,
  root: SAMPLE_ROOT,
  head: {
    id: 'early-phosphate',
    title: '重症低磷血症患者早期补磷的 target trial emulation',
    goal: '估计早期补磷对 28 天全因死亡的影响',
    phase: 'analysis',
    nextSteps: ['完成主分析 v1 并提交'],
    blockers: ['B30-03 缺失审计等待数据管理员澄清'],
  },
  spine: [
    { id: 'M10', name: '研究问题与方案', dir: 'modules/M10-research-question', ribs: ['B10-01'], counts: { draft: 0, provisional: 0, accepted: 1, rejected: 0, superseded: 0, blocked: 0 }, total: 1, completion: 100, active: false, staleness: false },
    { id: 'M40', name: '统计分析', dir: 'modules/M40-statistics', ribs: ['B40-03'], counts: { draft: 1, provisional: 0, accepted: 1, rejected: 0, superseded: 0, blocked: 0 }, total: 2, completion: 50, active: true, staleness: false },
    { id: 'M60', name: '审稿修订', dir: 'modules/M60-revision', ribs: [], counts: { draft: 0, provisional: 0, accepted: 0, rejected: 0, superseded: 0, blocked: 0 }, total: 0, completion: 0, active: false, staleness: false },
  ],
  ribs: [
    {
      id: 'B10-01',
      module: 'M10',
      name: '研究方案',
      dir: 'modules/M10-research-question/branches/B10-01-protocol',
      status: 'ACCEPTED',
      stream: 'protocol-charter',
      version: 1,
      is_stale: false,
      counts: { draft: 0, provisional: 0, accepted: 1, rejected: 0, superseded: 0, blocked: 0 },
      weight: 100,
      brief: '把临床问题转成可执行的 target trial emulation 方案。',
      workFiles: [{ name: 'tte_protocol_notes.md', rel: 'modules/M10-research-question/branches/B10-01-protocol/work/tte_protocol_notes.md', size: 100, mtime: '2026-09-18T10:00:00+08:00' }],
      outputFiles: [{ name: 'target_trial_protocol.md', rel: 'modules/M10-research-question/branches/B10-01-protocol/outputs/target_trial_protocol.md', size: 200, mtime: '2026-09-19T10:00:00+08:00' }],
      hasSession: false,
      hasDirectives: false,
      lastActivityAt: '2026-09-19T10:00:00+08:00',
    },
    {
      id: 'B40-03',
      module: 'M40',
      name: 'IPTW 诊断',
      dir: 'modules/M40-statistics/branches/B40-03-iptw',
      status: 'ACCEPTED',
      stream: 'iptw-diagnostics',
      version: 1,
      is_stale: false,
      counts: { draft: 0, provisional: 0, accepted: 1, rejected: 0, superseded: 0, blocked: 0 },
      weight: 100,
      brief: '构建 IPTW 权重并完成诊断。',
      workFiles: [
        { name: 'iptw.R', rel: 'modules/M40-statistics/branches/B40-03-iptw/work/iptw.R', size: 900, mtime: '2026-10-15T10:00:00+08:00' },
        { name: 'SESSION.md', rel: 'modules/M40-statistics/branches/B40-03-iptw/work/SESSION.md', size: 700, mtime: '2026-10-15T11:00:00+08:00' },
      ],
      outputFiles: [{ name: 'balance_smd.csv', rel: 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_smd.csv', size: 400, mtime: '2026-10-16T10:00:00+08:00' }],
      hasSession: true,
      hasDirectives: true,
      lastActivityAt: '2026-10-16T10:00:00+08:00',
    },
    {
      id: 'B20-01',
      module: 'M20',
      name: '协变量取舍',
      dir: 'modules/M20-literature-search/branches/B20-01-covariate',
      status: 'PROVISIONAL',
      stream: 'covariate-set',
      version: 1,
      is_stale: false,
      counts: { draft: 0, provisional: 1, accepted: 0, rejected: 0, superseded: 0, blocked: 0 },
      weight: 60,
      brief: '从文献中提炼候选协变量集合。',
      workFiles: [{ name: 'covariate_notes.md', rel: 'modules/M20-literature-search/branches/B20-01-covariate/work/covariate_notes.md', size: 80, mtime: '2026-10-10T10:00:00+08:00' }],
      outputFiles: [],
      hasSession: true,
      hasDirectives: false,
      lastActivityAt: '2026-10-10T10:00:00+08:00',
    },
    {
      id: 'B40-02',
      module: 'M40',
      name: '主分,',
      dir: 'modules/M40-statistics/branches/B40-02-main',
      status: 'DRAFT',
      stream: 'main-analysis',
      version: 1,
      is_stale: false,
      counts: { draft: 1, provisional: 0, accepted: 0, rejected: 0, superseded: 0, blocked: 0 },
      weight: 25,
      brief: '加权 Cox 与 KM 主分析。',
      workFiles: [],
      outputFiles: [],
      hasSession: false,
      hasDirectives: false,
      lastActivityAt: null,
    },
  ],
  attention: [
    { kind: 'stale', path: 'modules/M30-cohort/handoffs/HANDOFF-B30-02-COHORT-v2.md', message: '上游 cohort-definition@v1 ）SUPERSEDED' },
  ],
  markers: [{ stream: 'protocol-charter', version: 1, is_stale: false }],
  totals: { modules: 3, ribs: 3, activeRibs: 1, accepted: 2, stale: 1, blocked: 1, attention: 1 },
  cliErrors: [],
  generatedAt: '2026-10-19T08:00:00+08:00',
}

function makeFetchMock(healthFixture) {
  const log = []
  let healthPayload = healthFixture || healthNew
  let offlineZotero = false
  const setHealth = (next) => {
    healthPayload = next || healthNew
  }
  const setZoteroOffline = (next) => {
    offlineZotero = Boolean(next)
  }
  const fetch = async (url, options) => {
    const method = (options && options.method ? options.method : 'GET').toUpperCase()
    const rawUrl = String(url)
    const pathname = rawUrl.split('?')[0]
    const request = { method, url: rawUrl, pathname, body: null }
    if (options && typeof options.body === 'string') {
      try {
        request.body = JSON.parse(options.body)
      } catch (problem) {
        request.body = null
      }
    }
    log.push(request)

    let payload = null
    if (pathname === ROUTE_PATHS.health) {
      payload = clone(healthPayload)
    } else if (pathname === ROUTE_PATHS.state) {
      payload = clone(stateFixture)
    } else if (pathname === ROUTE_PATHS.results) {
      payload = clone(resultsPayload)
    } else if (pathname === ROUTE_PATHS.content) {
      payload = clone(contentFixture)
    } else if (pathname === ROUTE_PATHS.fishbone) {
      payload = fishboneFixture
    } else if (pathname === ROUTE_PATHS.leaderLog) {
      payload = clone(leaderLogFixture)
    } else if (pathname === ROUTE_PATHS.zotero) {
      payload = clone(offlineZotero ? zoteroOfflineFixture : zoteroFixture)
    } else if (pathname === ROUTE_PATHS.zoteroOp && method === 'POST') {
      payload = { ok: true, ribId: 'B40-03', itemKeys: ['3QFYZA46'], collectionKey: null, added: 1, removed: 0 }
    } else if (pathname === ROUTE_PATHS.branchWork) {
      payload = {
        ok: true,
        module: { id: 'M40', name: '统计分析', dir: 'modules/M40-statistics' },
        branch: { id: 'B40-03', name: 'IPTW 诊断', dir: 'modules/M40-statistics/branches/B40-03-iptw', mode: 'standard' },
        brief: '构建 IPTW 权重并完成诊断。',
        sessionNotes: '## 尝试 1\n未稳定化权重最大达 84.3，评估者要求加入稳定化。\n',
        directives: '### 2026-10-18T16:45:00Z · 主项目追问\n为什么乳）SMD 偏高？\n',
        context: '# 分支上下文档案\n\n主支当前意图：完成 IPTW 诊断。\n',
        parent: 'B20-01',
        siblings: [
          { id: 'B20-01', name: '协变量取舍', dir: 'modules/M40-statistics/branches/B20-01-covariate', isParent: true },
          { id: 'B40-01', name: '基线表', dir: 'modules/M40-statistics/branches/B40-01-table1', isParent: false },
        ],
        inbox: { messages: 1, content: '# INBOX — IPTW 诊断\n\n## 2026-10-18T18:00:00Z · 来自 协变量取舍（B20-01）\n\n截尾敏感性分析出结果了吗？\n' },
        directivesParsed: [
          { at: '2026-10-18T16:45:00Z', author: '主项目追问', side: 'human', text: '为什么乳）SMD 偏高？' },
          { at: '2026-10-18T17:05:00Z', author: 'stats-builder-agent', side: 'agent', text: '已检查高值区并提出稳定化建议。' },
        ],
        sessionParsed: [
          { title: '尝试 1', text: '未稳定化权重最大达 84.3。' },
        ],
        workFiles: [
          { name: 'iptw.R', rel: 'modules/M40-statistics/branches/B40-03-iptw/work/iptw.R', size: 900, mtime: '2026-10-15T10:00:00+08:00', ext: '.r' },
        ],
        outputFiles: [
          { name: 'balance_smd.csv', rel: 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_smd.csv', size: 400, mtime: '2026-10-16T10:00:00+08:00', ext: '.csv' },
        ],
      }
    } else if (pathname === ROUTE_PATHS.file) {
      payload = {
        ok: true,
        path: 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_smd.csv',
        ext: '.csv',
        size: 40,
        mtime: '2026-10-16T10:00:00+08:00',
        isBinary: false,
        content: 'covariate,smd_before,smd_after\nage,0.13,0.02\n',
        lines: 3,
      }
    } else if (pathname === ROUTE_PATHS.handoff) {
      payload = clone(handoffDetailFixture)
    } else if (pathname === ROUTE_PATHS.config && method === 'POST') {
      payload = { ok: true, config: { version: 1, projectRoot: request.body && request.body.projectRoot } }
    } else if (pathname === ROUTE_PATHS.run && method === 'POST') {
      const action = request.body && request.body.action ? request.body.action : 'verify'
      payload = {
        ok: true,
        run: { id: 'r1', action, argv: [action], status: 'running', exitCode: null, timedOut: false, startedAt: '2026-10-19T00:00:00+08:00', endedAt: null, stdout: '', stderr: '', json: null },
      }
    } else if (pathname === ROUTE_PATHS.run && method === 'GET') {
      const post = (log.filter((entry) => entry.pathname === ROUTE_PATHS.run && entry.method === 'POST').pop() || {}).body
      const action = post && post.action ? post.action : 'verify'
      payload = {
        ok: true,
        run: { id: 'r1', action, argv: [action], status: 'succeeded', exitCode: 0, timedOut: false, startedAt: '2026-10-19T00:00:00+08:00', endedAt: '2026-10-19T00:00:03+08:00', stdout: 'DAG-OK: 全部通过', stderr: '', json: { ok: true } },
      }
    } else if (pathname === ROUTE_PATHS.bridge && method === 'POST') {
      const body = request.body || {}
      payload = {
        ok: true,
        run: { id: 'b1', action: body.action || 'bridge', argv: [body.action || 'bridge'], status: 'running', exitCode: null, timedOut: false, startedAt: '2026-10-19T00:05:00+08:00', endedAt: null, stdout: '', stderr: '', json: null },
      }
    } else if (pathname === ROUTE_PATHS.runs) {
      payload = clone(runsFixture)
    } else {
      payload = { ok: false, code: 'E_UNKNOWN', error: `verify-client ）mock 的请求：${method} ${rawUrl}` }
    }
    return {
      ok: Boolean(payload && payload.ok !== false),
      status: payload && payload.ok === false ? 400 : 200,
      json: async () => clone(payload),
    }
  }
  return { fetch, log, setHealth, setZoteroOffline }
}

/* ------------------------------------------------------------- React shim */

function sameDeps(previous, next) {
  if (!Array.isArray(previous) || !Array.isArray(next)) return false
  if (previous.length !== next.length) return false
  for (let index = 0; index < previous.length; index += 1) {
    if (!Object.is(previous[index], next[index])) return false
  }
  return true
}

function createHarness() {
  const root = { component: null, props: null, tree: null, slots: [], hookIndex: 0, pendingEffects: [], dirty: false }
  const ensureSlot = (index) => {
    if (!root.slots[index]) root.slots[index] = {}
    return root.slots[index]
  }
  let renderOnce = null
  const React = {
    createElement(type, props) {
      const children = Array.prototype.slice.call(arguments, 2)
      const merged = Object.assign({}, props || {})
      if (children.length === 1) merged.children = children[0]
      else if (children.length > 1) merged.children = children
      return { type, props: merged }
    },
    useState(initial) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!Object.prototype.hasOwnProperty.call(slot, 'value')) {
        slot.value = typeof initial === 'function' ? initial() : initial
      }
      return [
        slot.value,
        (next) => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (!Object.is(value, slot.value)) {
            slot.value = value
            root.dirty = true
          }
        },
      ]
    },
    useRef(value) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.ref) slot.ref = { current: value }
      return slot.ref
    },
    useEffect(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      const changed = !slot.hasEffect || !sameDeps(slot.effectDeps, deps)
      slot.effectDeps = deps
      slot.hasEffect = true
      if (changed) root.pendingEffects.push({ slot, fn })
    },
    useCallback(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) {
        slot.memo = fn
        slot.memoDeps = deps
        slot.hasMemo = true
      }
      return slot.memo
    },
    useMemo(fn, deps) {
      const index = root.hookIndex
      root.hookIndex += 1
      const slot = ensureSlot(index)
      if (!slot.hasMemo || !sameDeps(slot.memoDeps, deps)) {
        slot.memo = fn()
        slot.memoDeps = deps
        slot.hasMemo = true
      }
      return slot.memo
    },
  }
  renderOnce = () => {
    root.hookIndex = 0
    root.pendingEffects = []
    root.dirty = false
    root.tree = root.component(root.props)
    const effects = root.pendingEffects
    root.pendingEffects = []
    for (const effect of effects) {
      if (typeof effect.slot.cleanup === 'function') effect.slot.cleanup()
      const cleanup = effect.fn()
      effect.slot.cleanup = typeof cleanup === 'function' ? cleanup : null
    }
    return root.tree
  }
  const settle = async (options) => {
    const rounds = options && options.rounds ? options.rounds : 200
    for (let round = 0; round < rounds; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      if (!root.dirty) return root.tree
      renderOnce()
    }
    return root.tree
  }
  const mount = async (component, props) => {
    root.component = component
    root.props = props
    root.slots = []
    renderOnce()
    await settle()
    return root.tree
  }
  return { React, root, mount, settle, renderOnce }
}

/* ---------------------------------------------------------- tree utilities */

function textOf(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join('')
  if (typeof node === 'function') return ''
  if (typeof node === 'object' && node.props) return textOf(node.props.children)
  return ''
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  visit(node)
  if (node.props) walk(node.props.children, visit)
}

function collectByType(node, type) {
  const found = []
  walk(node, (candidate) => {
    if (candidate.type === type) found.push(candidate)
  })
  return found
}

function collectButtons(tree) {
  return collectByType(tree, 'button').map((node) => ({ node, text: textOf(node.props.children) }))
}

function findButton(tree, label) {
  return collectButtons(tree).find((item) => item.text === label) || null
}

function findFirstNode(tree, predicate) {
  let found = null
  walk(tree, (candidate) => {
    if (!found && predicate(candidate)) found = candidate
  })
  return found
}

/**
 * 找某个节点的父节点（用于「文字节点 → 最近可点击祖先」的就近上溯）。
 * 树是普通对象树，深度优先带栈遍历即可。
 */
function parentOf(tree, target) {
  let found = null
  const visit = (node, parent) => {
    if (found || node === null || node === undefined || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const child of node) visit(child, parent)
      return
    }
    if (node === target) {
      found = parent
      return
    }
    if (node.props) visit(node.props.children, node)
  }
  visit(tree, null)
  return found
}

function countNodes(tree) {
  let total = 0
  walk(tree, () => {
    total += 1
  })
  return total
}

function lastRequest(log, method, pathname) {
  const matches = log.filter((entry) => entry.method === method && entry.pathname === pathname)
  return matches.length > 0 ? matches[matches.length - 1] : null
}

function countRequests(log, pathname) {
  return log.filter((entry) => entry.pathname === pathname).length
}

/* --------------------------------------------------------------------- main */

async function bootClient(fetchMock, options = {}) {
  let entry = null
  const windowMock = {
    __ModuleLoader__: {
      load(descriptor) {
        entry = descriptor
      },
    },
  }
  const source = readFileSync(BUNDLE, 'utf8')
  new Function('window', 'fetch', 'setTimeout', 'clearTimeout', 'console', source)(
    windowMock,
    fetchMock.fetch,
    setTimeout,
    clearTimeout,
    console,
  )
  assert(Boolean(entry), 'window.__ModuleLoader__.load 被调）)')
  assert(entry && entry.id === 'dsh-research-workbench', `module id = ${entry && entry.id}`)

  const harness = createHarness()
  const requested = []
  let plugin = null
  try {
    plugin = entry.factory((spec) => {
      requested.push(spec)
      if (spec === 'react') return harness.React
      throw new Error(`unexpected require: ${spec}`)
    })
  } catch (problem) {
    bad(`factory 抛异常：${problem.message}`)
    return null
  }
  assert(requested.length === 1 && requested[0] === 'react', `factory ）require react（实）${JSON.stringify(requested)}）`)
  assert(plugin && plugin.name === 'dsh-research-workbench', `plugin.name = ${plugin && plugin.name}`)
  assert(
    Boolean(plugin && Array.isArray(plugin.inject) && plugin.inject.includes('desktopWorkbenches')),
    `plugin.inject 含 desktopWorkbenches（规范 3.5）= ${JSON.stringify(plugin && plugin.inject)}`,
  )
  assert(Boolean(plugin && typeof plugin.apply === 'function'), 'plugin.apply 是函）)')

  const injections = []
  const registrations = []
  // 规范 3.5：客户端通过 ctx.desktopWorkbenches.register() 注册业务面板。
  const workbenchRegistrations = []
  const ctx = {
    effect(fn) {
      fn()
      return () => {}
    },
    // 旧宿主没有该服务：options.withWorkbenchService === false 时不提供。
    desktopWorkbenches: options.withWorkbenchService === false
      ? undefined
      : {
          register(registerOptions, component) {
            workbenchRegistrations.push({ options: registerOptions, component })
            return () => {}
          },
        },
    // 旧槽位服务仍留在假 ctx 里：若将来需要回归检查旧注册路径，不会因缺服务而崩。
    slots: {
      inject(name, callback) {
        injections.push(name)
        callback()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  const hasWorkbenchService = Boolean(ctx.desktopWorkbenches && typeof ctx.desktopWorkbenches.register === 'function')
  if (typeof options.beforeApply === 'function') options.beforeApply(ctx)
  let registrationMode = 'none'
  try {
    plugin.apply(ctx)
    if (workbenchRegistrations.length > 0) registrationMode = 'desktopWorkbenches'
    else if (registrations.length > 0) registrationMode = 'slots'
  } catch (problem) {
    bad(`apply 抛异常：${problem.message}`)
    return null
  }
  return {
    entry,
    source,
    harness,
    plugin,
    injections,
    registrations,
    workbenchRegistrations,
    hasWorkbenchService,
    registrationMode,
  }
}

async function main() {
  console.log('A) loader / 槽位 / label（原有过场断言保留）)')
  const newFetch = makeFetchMock(healthNew)
  const boot = await bootClient(newFetch)
  if (!boot) {
    report()
    return
  }
  const { source, harness, injections, registrations, workbenchRegistrations, hasWorkbenchService, registrationMode } = boot
  assert(source.includes("id: 'dsh-research-workbench'"), 'bundle 内声明 loader id')
  assert(source.includes('desktopWorkbenches'), 'bundle 含 Desktop 工作台注册路径（规范 3.5）')

  // 规范 3.5：register() 必须提供 title、业务组件与规范 GitHub repository URL；
  // 新包不填 id（工作台身份由 repository 解析为 owner/repo）。
  assert(
    hasWorkbenchService ? registrationMode === 'desktopWorkbenches' : registrationMode === 'slots',
    `按宿主能力选择注册路径（宿主提供服务=${hasWorkbenchService}，实际=${registrationMode}）`,
  )
  assert(workbenchRegistrations.length === 1, `desktopWorkbenches 路径 register() 参数完整（${workbenchRegistrations.length} 项）`)
  const wb = workbenchRegistrations[0] || {}
  const wbOptions = wb.options || {}
  assert(typeof wbOptions.title === 'string' && wbOptions.title.length > 0, `工作台 title 非空（${wbOptions.title}）`)
  assert(
    typeof wbOptions.repository === 'string' && /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(wbOptions.repository),
    `repository 是规范 GitHub URL（${wbOptions.repository}）`,
    'repository 缺失或不是 github.com/owner/repo',
  )
  assert(wbOptions.id === undefined, '新包不填 register({ id })（身份由 repository 解析）')
  assert(typeof wb.component === 'function', '业务组件是函数（WorkbenchPanel）')
  assert(
    wbOptions.layout && wbOptions.layout.businessSide === 'left' && wbOptions.layout.businessWidth >= 0.25 && wbOptions.layout.businessWidth <= 0.7,
    'layout.businessSide=left 且 businessWidth 在 0.25–0.7 之间（规范 4.1 标准分栏）',
    `layout 异常：${JSON.stringify(wbOptions.layout)}`,
  )
  assert(typeof wbOptions.icon === 'function', '提供侧栏图标组件')
  assert(
    typeof wbOptions.description === 'string' && wbOptions.description.length > 0,
    'register() 提供 description（说明它解决什么问题）',
  )

  // 本机 Desktop 尚无 desktopWorkbenches 服务时的回退路径：必须仍能出现在左侧入口。
  assert(
    hasWorkbenchService
      ? registrations.length === 0
      : injections.includes('main') && injections.includes('sidebar.panellist'),
    `回退路径正确（宿主提供服务=${hasWorkbenchService}）`,
    `injections=${JSON.stringify(injections)} registrations=${registrations.length}`,
  )
  const mainRegistration = registrations.find((item) => item.options && item.options.name === 'main')
  const paneRegistration = registrations.find((item) => item.options && item.options.name === 'sidebar.panellist')
  if (!hasWorkbenchService) {
    assert(Boolean(mainRegistration), '旧宿主：注册 main 槽位')
    assert(Boolean(paneRegistration), '旧宿主：注册 sidebar.panellist 槽位')
    assert(
      Boolean(paneRegistration && (paneRegistration.options.id === 'research-workbench' || paneRegistration.options.id === 'research-dag-workbench')),
      `旧宿主：panellist id = ${paneRegistration && paneRegistration.options.id}`,
    )
    const legacyLabel = paneRegistration && paneRegistration.options.label
    assert(
      typeof legacyLabel === 'function' && legacyLabel() === '研究项目 DAG 工作台',
      `旧宿主：panellist label = ${typeof legacyLabel === 'function' ? legacyLabel() : '(none)'}`,
    )
  }
  // 两条路径注册同一个业务组件；inject 只影响初始 props。
  const businessComponent = hasWorkbenchService ? wb.component : mainRegistration && mainRegistration.component
  const injectedProps =
    hasWorkbenchService || !mainRegistration || typeof mainRegistration.options.inject !== 'function'
      ? {}
      : mainRegistration.options.inject()

  console.log('')
  console.log('B) 默认「项目流程」页（新宿主 fixture）)')
  let tree = null
  try {
    tree = await harness.mount(businessComponent, injectedProps)
  } catch (problem) {
    bad(`面板挂载渲染抛异常：${problem.stack || problem.message}`)
    report()
    return
  }
  /** 展开渲染结果里的全部文本（含 props 上的 label/title 等））*/
  const click = async (label) => {
    const found = findButton(tree, label)
    if (!found) {
      bad(`找不到按钮「${label}」`)
      return false
    }
    found.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
    tree = await harness.settle()
    return true
  }

  /* v4：6 个平级页签已被「命令栏 + 侧滑管理面板」取代。
   * 导航辅助：先点命令栏的「🧠 主智能体」打开侧滑面板，再点面板内的页签。 */
  const openPanel = async () => {
    const entry = findButton(tree, '🧠 主智能体')
    if (!entry) {
      bad('找不到命令栏的「🧠 主智能体」面板入口')
      return false
    }
    entry.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
    tree = await harness.settle()
    return true
  }
  /* 打开面板并切到指定页签（页签文案形如「📄 内容」「🌐 网络」「⚙️ 工程」「📊 概览」）。 */
  const openPanelTab = async (label) => {
    if (!(await openPanel())) return false
    const tab = findButton(tree, label)
    if (!tab) {
      bad(`侧滑面板里找不到页签「${label}」`)
      return false
    }
    tab.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
    tree = await harness.settle()
    return true
  }
  const text = textOf(tree)
  assert(countRequests(newFetch.log, ROUTE_PATHS.content) >= 1, '挂载）GET /content 被调）)')
  assert(countRequests(newFetch.log, ROUTE_PATHS.fishbone) >= 1, '挂载）GET /fishbone 被调用（项目流程主线）)')
  assert(countRequests(newFetch.log, ROUTE_PATHS.state) >= 1, '挂载）GET /state 被调用（工程页数据）')
  assert(countRequests(newFetch.log, ROUTE_PATHS.results) >= 1, '挂载）GET /results 被调用（旧视）降级数据）)')
  assert(countRequests(newFetch.log, ROUTE_PATHS.runs) >= 1, '挂载）GET /runs 被调）)')

  // ---- 项目流程首屏：鱼）/ 主脊）/ 分支 / 关注）
  const fishWanted = [
    ['项目目标 · 研究目标', '项目目标标题'],
    ['重症低磷血症患者早期补磷', '研究标题'],
    ['主支 · 研究主线', '主支标题'],
    ['研究问题与方案', '主支节点 M10'],
    ['统计分析', '主支节点 M40'],
    ['审稿修订', '主支节点 M60'],
    ['研究方案', '分支 B10-01'],
    ['IPTW 诊断', '分支 B40-03'],
    ['主分析', '分支 B40-02'],
    ['已回连', '分支状态：已回连'],
    ['探路中', '分支状态：探路中'],
    ['需要你拍板或处理', '关注区'],
    ['过期', '过期标记'],
    ['新建一个分支', '创建分支按钮'],
    ['自动回连', '自动回连按钮'],
    ['分支清单', '分支清单表'],
    ['主支下一步', '下一步区'],
    ['阻塞信号', '阻塞区'],
  ]
  for (const [needle, label] of fishWanted) {
    assert(text.includes(needle), `项目流程首屏渲染 ${label}（${needle}）`)
  }
  assert(text.includes('📋'), '页签/标题带项目流程标）)')
  assert(!text.includes('undefined'), '项目流程页文本无 undefined')
  assert(!text.includes('[object Object]'), '项目流程页文本无 [object Object]')
  assert(countNodes(tree) > 80, `项目流程页元素树节点）= ${countNodes(tree)} > 80`)
  const fishTabs = collectButtons(tree)
  /* v4：平级页签已被单页三栏舞台取代。
   * 检查项从「页签存在」升级为「导航能力存在」：
   *   平级页签消失（不再打断上下文）+ 命令栏承载面包屑/面板入口/全局跳转。 */
  const barText = textOf(tree)
  assert(fishTabs.filter((item) => item.text === '📋 项目流程').length === 0, '平级「项目流程」页签已移除（三栏常驻）')
  assert(fishTabs.filter((item) => item.text === '🧠 主智能体').length === 1, '命令栏保留「主智能体」面板入口')
  assert(barText.includes('跳转项目 / 分支 / 文件'), '命令栏提供全局跳转入口（⌘K）')
  assert(barText.includes('early-phosphate'), '面包屑显示当前项目')
  assert(countRequests(newFetch.log, ROUTE_PATHS.leaderLog) >= 1, '挂载时 GET /leader-log 被调用')

  /* ---- v3.8 本分支的文献（Zotero 接入） ---- */
  tree = await harness.settle()
  const zotText = textOf(tree)
  if (process.env.RDW_DEBUG_ZOTERO) {
    const idx = zotText.indexOf('本分支的文献')
    console.log('---- zotero pane dump ----')
    console.log(zotText.slice(Math.max(0, idx - 40), idx + 500))
    console.log('---- end dump ----')
  }
  assert(
    countRequests(newFetch.log, ROUTE_PATHS.zotero) >= 1,
    '挂载时 GET /zotero 被调用（文献面板数据）',
  )
  assert(zotText.includes('本分支的文献'), '右栏显示「本分支的文献」面板')
  assert(
    zotText.includes('Aeroallergen hypersensitivity'),
    '文献面板列出口袋里的 Zotero 条目标题',
  )
  assert(zotText.includes('2005'), '文献卡片显示年份')
  assert(zotText.includes('从合集导入'), '文献面板提供「从合集导入」入口')
  {
    // 搜索框存在，且能触发检索（Enter → 重新请求 /zotero?q=）
    // 注意：harness 每次 settle 会重建整棵树，按钮/输入节点引用会失效，
    // 所以每次交互前都要按当前 tree 重新定位。
    const findSearchInput = () =>
      collectByType(tree, 'input').find(
        (node) => node.props && node.props['aria-label'] === '在 Zotero 库中搜索文献',
      ) || null
    assert(Boolean(findSearchInput()), '文献面板有 Zotero 搜索输入框')
    const before = countRequests(newFetch.log, ROUTE_PATHS.zotero)
    const typed = findSearchInput()
    if (typed) {
      typed.props.onChange({ target: { value: 'iptw' } })
      tree = await harness.settle()
    }
    const pressed = findSearchInput()
    if (pressed && typeof pressed.props.onKeyDown === 'function') {
      pressed.props.onKeyDown({ key: 'Enter', preventDefault() {} })
      tree = await harness.settle()
    }
    assert(
      countRequests(newFetch.log, ROUTE_PATHS.zotero) > before,
      '搜索提交后重新请求 /zotero（带 q=）',
    )
    const searched = newFetch.log.filter(
      (entry) => entry.pathname === ROUTE_PATHS.zotero && entry.url.includes('q=iptw'),
    )
    assert(searched.length >= 1, '搜索请求携带 q=iptw 参数')
  }
  {
    // 命中条目里有「✚」挂载动作 → POST /zotero-op attach
    const before = countRequests(newFetch.log, ROUTE_PATHS.zoteroOp)
    const attachBtn = findButton(tree, '✚')
    assert(Boolean(attachBtn), '搜索结果提供「✚」挂载按钮')
    if (attachBtn) {
      attachBtn.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
    }
    assert(
      countRequests(newFetch.log, ROUTE_PATHS.zoteroOp) > before,
      '点「✚」后向 POST /zotero-op 发起挂载',
    )
    const lastOp = newFetch.log.filter((entry) => entry.pathname === ROUTE_PATHS.zoteroOp).pop()
    assert(
      Boolean(lastOp && lastOp.body && lastOp.body.op === 'attach' && Array.isArray(lastOp.body.keys)),
      '挂载请求体形如 { op: "attach", keys: [...] }',
    )
  }
  {
    // 合集抽屉：默认收起，点开后列出合集；点合集 → import-collection
    const before = countRequests(newFetch.log, ROUTE_PATHS.zoteroOp)
    const toggle = collectButtons(tree).find(
      (item) => item.text && item.text.includes('从合集导入'),
    ) || null
    assert(Boolean(toggle), '文献面板有合集抽屉展开按钮')
    if (toggle) {
      toggle.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
    }
    const colText = textOf(tree)
    assert(colText.includes('顶刊论文'), '展开后列出 Zotero 合集')
    assert(colText.includes('病例书写'), '合集列表含多个合集')
    // 点「顶刊论文」这一行触发 import-collection
    const colRow = findFirstNode(
      tree,
      (node) =>
        node.props &&
        typeof node.props.title === 'string' &&
        node.props.title.includes('顶刊论文') &&
        typeof node.props.onClick === 'function',
    )
    if (colRow) {
      colRow.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
    }
    assert(
      countRequests(newFetch.log, ROUTE_PATHS.zoteroOp) > before,
      '点合集行后向 POST /zotero-op 发起导入',
    )
    const importOp = newFetch.log.filter((entry) => entry.pathname === ROUTE_PATHS.zoteroOp).pop()
    assert(
      Boolean(importOp && importOp.body && importOp.body.op === 'import-collection' && importOp.body.collectionKey),
      '合集导入请求体含 op=import-collection 与 collectionKey',
    )
  }
  {
    // Zotero 掉线：面板显示「未连接」且不渲染假条目
    newFetch.setZoteroOffline(true)
    const refreshBtn = collectButtons(tree).find((item) => item.text === '↻') || null
    assert(Boolean(refreshBtn), '文献面板有「↻」刷新按钮')
    if (refreshBtn) {
      refreshBtn.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
    }
    const offlineText = textOf(tree)
    assert(offlineText.includes('未连接 Zotero'), 'Zotero 掉线时显示「未连接 Zotero」')
    assert(offlineText.includes('Zotero 未运行'), '未连接时展示宿主给出的原因')
    newFetch.setZoteroOffline(false)
    tree = await harness.settle()
  }

  // 分支清单：待回连分支有「回连」按钮，已回连分支没有
  {
    const tableButtons = (collectButtons(tree) || []).map((item) => item.text || '')
    assert(tableButtons.includes('回连'), '待回连分支行有「回连」按钮')
    assert(tableButtons.filter((text) => text === '回连').length >= 1, '回连按钮至少出现一次')
  }

  // 切到「主智能体」页 → 决策时间轴
  if (await click('🧠 主智能体')) {
    const leaderText = textOf(tree)
    assert(leaderText.includes('主智能体 · 控制层记录'), '主智能体页显示身份卡')
    assert(leaderText.includes('对话时间轴'), '主智能体页显示时间轴')
    assert(leaderText.includes('接受研究方案 v1'), '时间轴含 ACCEPT 裁决')
    assert(leaderText.includes('拒绝文献检索 v1'), '时间轴含 REJECT 裁决')
    assert(leaderText.includes('方案覆盖 estimand'), '时间轴含裁决理由')
    assert(leaderText.includes('想法'), '时间轴含想法记录')
    assert(leaderText.includes('复核'), '时间轴含复核记录')
    assert(leaderText.includes('主智能体当前的下一步'), '主智能体页显示下一步')
    assert(!leaderText.includes('undefined'), '主智能体页无 undefined')
    assert(!leaderText.includes('[object Object]'), '主智能体页无 [object Object]')
    // 筛选：只看裁决
    if (await click('裁决')) {
      const filteredLeader = textOf(tree)
      assert(filteredLeader.includes('接受研究方案 v1'), '筛选「裁决」后仍含裁决')
      assert(!filteredLeader.includes('建议把 IPTW 权重 99% 截尾作为主分析'), '筛选「裁决」后过滤掉想法')
    }
    // 切回项目流程页
    // v4：项目流程三栏常驻，无需切换页签
  }

  // 点主支节点（统计分析）→ 打开主支档案工作区
  const spineGroups = collectByType(tree, 'g').filter(
    (node) => node.props && node.props.role === 'button' && typeof node.props.onClick === 'function',
  )
  const spineNode = spineGroups.find((node) => textOf(node).includes('统计分析')) || null
  if (spineNode) {
    spineNode.props.onClick({ stopPropagation() {}, preventDefault() {} })
    tree = await harness.settle()
    const moduleText = textOf(tree)
    assert(moduleText.includes('主支档案'), '点主支节点后打开主支档案')
    assert(moduleText.includes('本主支下的分支'), '主支档案展示所属分支')
    const moduleBack = findButton(tree, '← 项目流程')
    assert(Boolean(moduleBack), '主支档案有返回项目流程按钮')
    if (moduleBack) {
      moduleBack.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
      assert(textOf(tree).includes('分支清单'), '主支档案返回后恢复项目流程视图')
    }
  } else {
    bad('主支节点「统计分析」不可点击')
  }

  // 点分支（IPTW 诊断）→ 打开智能体工作区（SVG <g> 元素，role=button）
  const ribGroups = collectByType(tree, 'g').filter(
    (node) => node.props && node.props.role === 'button' && typeof node.props.onClick === 'function',
  )
  const ribNode = ribGroups.find((node) => node.props && String(node.props.key || '').startsWith('rib-') && textOf(node).includes('IPTW 诊断')) || null
  if (ribNode) {
    ribNode.props.onClick({ stopPropagation() {}, preventDefault() {} })
    tree = await harness.settle()
    tree = await harness.settle()
    const sessionText = textOf(tree)
    assert(sessionText.includes('IPTW 诊断'), '点分支后打开工作区标题')
    assert(sessionText.includes('主支上下文档案'), '工作区展示 CONTEXT 上下文入口')
    assert(sessionText.includes('与该工作区智能体的往来指令'), '工作区展示会话区')
    assert(sessionText.includes('为什么乳）SMD 偏高？'), '工作区展示人类指令')
    assert(sessionText.includes('已检查高值区并提出稳定化建议。'), '工作区展示智能体回复')
    assert(sessionText.includes('工作区文件'), '工作区展示文件区')
    // v3.2：分支溯源 / 同伴通讯 / 收件箱
    assert(sessionText.includes('这个分支从哪来'), '会话展示父分支溯源')
    assert(sessionText.includes('B20-01'), '会话展示父分支 id')
    assert(sessionText.includes('同一主支下的其他分支'), '会话展示同伴分支列表')
    assert(sessionText.includes('基线表'), '会话列出同伴分支名称')
    assert(sessionText.includes('收件箱'), '会话展示来自其他分支的收件箱')
    assert(
      (collectButtons(tree) || []).some((item) => (item.text || '').includes('通讯')),
      '同伴分支行有「通讯」按钮',
    )
    assert(
      (collectButtons(tree) || []).some((item) => (item.text || '').includes('清除上下文')),
      '会话顶栏有「清除上下文」按钮',
    )
    assert(
      (collectButtons(tree) || []).some((item) => (item.text || '').includes('从父分支再分一根子分支')),
      '有「从父分支再分一根子分支」入口',
    )
    const graftButtonText = (collectButtons(tree) || []).map((item) => item.text || '').filter((text) => text.includes('回连'))
    assert(!graftButtonText.some((text) => text.includes('回连主支')), '已回连分支的会话页没有回连按钮')
    const backButton = findButton(tree, '← 项目流程')
    assert(Boolean(backButton), '工作区有返回项目流程按钮')
    // v3.1：工作区文件行优先在 DSH 侧边栏打开（而不是挤在面板小弹窗）
    // 文件区默认折叠 → 先展开「工作区文件」再断言行内动作
    {
      // 折叠区标题是「图标 + 标题 + 徽标 + 箭头」拼接，按包含匹配
      const fileToggle =
        (collectButtons(tree) || []).find((item) => (item.text || '').includes('工作区文件')) || null
      if (fileToggle) {
        fileToggle.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
        tree = await harness.settle()
      }
      assert(Boolean(fileToggle), '工作区文件区有可展开的标题')
      const fileRowButtons = (collectButtons(tree) || []).map((item) => ({
        text: item.text || '',
        title: (item.node && item.node.props && item.node.props.title) || '',
      }))
      assert(
        fileRowButtons.some((row) => /在 DSH 侧边栏打开/.test(row.title)),
        '工作区文件行的主动作是在 DSH 侧边栏打开',
      )
      assert(
        fileRowButtons.some((row) => row.text === '预览'),
        '工作区文件行保留面板内快速预览',
      )
    }
    // 会话页回连按钮：B20-01（PROVISIONAL）应显示，B40-03（ACCEPTED）不显示
    const sessionGraftButtons = (collectButtons(tree) || []).filter((item) => (item.text || '').includes('回连主支'))
    assert(sessionGraftButtons.length === 0, '已回连分支（B40-03）会话页无回连按钮')
    if (backButton) {
      backButton.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
      assert(textOf(tree).includes('分支清单'), '返回后恢复项目流程视图')
    }
  } else {
    bad('分支节点「IPTW 诊断」不可点击')
  }

  // 点「新建一个分支」→ 弹窗
      if (await click('🌱 新建一个分支')) {
    const sproutText = textOf(tree)
        assert(sproutText.includes('新建一个分支'), '创建分支弹窗打开')
        assert(sproutText.includes('挂在主支哪一段'), '创建分支弹窗含模块选择')
    assert(sproutText.includes('探索'), '创建分支弹窗含模式选择')
    // v3.2：默认从主支分，也可从已有分支分
    assert(sproutText.includes('从哪里分出来'), '创建分支弹窗含「从哪里分出来」')
    assert(sproutText.includes('从主支分'), '创建分支弹窗默认从主支分（带主支完整上下文）')
    assert(sproutText.includes('继承父分支上下文'), '创建分支弹窗提供从分支分（继承父分支上下文）')
    const cancel = findButton(tree, '取消')
    if (cancel) {
      cancel.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
      tree = await harness.settle()
    }
  }

  console.log('')
  console.log('C) 切到「内容」页（旧内容视图仍可用）')
  /* v4：内容页现在收在侧滑管理面板里（低频管理按需展开）。 */
  await openPanelTab('📄 内容')
  const contentText = textOf(tree)
  const wanted = [
    ['已有结果', '项目内容概览：子项目结果覆盖'],
    ['已复核', '项目内容概览：复核比例'],
    ['待决定', '项目内容概览：待决定数'],
    ['阻塞', '项目内容概览：阻塞数'],
  ].filter(([, label]) => label !== '')
  for (const [needle, label] of wanted) {
    assert(contentText.includes(needle), `内容页渲染 ${label}（${needle}）`)
  }
  tree = tree || null
  const panelTabs = collectButtons(tree)
  assert(panelTabs.filter((item) => item.text === '📄 内容').length === 1, '侧滑面板有「内容」页签')
  assert(panelTabs.filter((item) => item.text === '🌐 网络').length === 0, '侧滑面板已按要求隐藏「网络」页签（先隐藏 teammcp 功能）')
  assert(panelTabs.filter((item) => item.text === '⚙️ 工程').length === 1, '侧滑面板有「工程」页签')

  console.log('')
  console.log('D) 内容详情抽屉 / 满意 / 记想法（POST /bridge）)')
  if (await click('查看内容')) {
    const detailMarkup = textOf(tree)
    assert(detailMarkup.includes('关键结果'), '详情抽屉展示关键结果标题')
    assert(detailMarkup.includes('局限与注意事项'), '详情抽屉展示 limitations')
        assert(detailMarkup.includes('文件（'), '详情抽屉展示文件列表')
    assert(/outputs\/[^\s]*\.(csv|pdf|md)/.test(detailMarkup), '详情抽屉展示文件路径')
        assert(detailMarkup.includes('在工程页查看交接'), '详情抽屉有「在工程页查看交接」')
        assert(Boolean(findButton(tree, '关闭')), '详情抽屉有关闭按钮')
    if (await click('关闭')) {
      assert(!textOf(tree).includes('局限与注意事项'), '关闭后详情抽屉消）)')
    }
  }

  const contentCallsBeforeReview = countRequests(newFetch.log, ROUTE_PATHS.content)
  if (await click('满意')) {
    const bridgeRequest = lastRequest(newFetch.log, 'POST', ROUTE_PATHS.bridge)
    assert(Boolean(bridgeRequest && bridgeRequest.body), '点「满意」发）POST /bridge')
    assert(bridgeRequest.body.action === 'review', `review 请求）action = ${bridgeRequest.body && bridgeRequest.body.action}`)
    assert(bridgeRequest.body.project === SAMPLE_ROOT, 'review 请求体带项目绝对路径')
    assert(bridgeRequest.body.satisfied === true, 'review 请求）satisfied = true')
    assert(Boolean(bridgeRequest.body.stream), `review 请求体带 stream）{bridgeRequest.body && bridgeRequest.body.stream}）`)
    assert(countRequests(newFetch.log, ROUTE_PATHS.bridge) >= 1, '共有 /bridge 请求')
        assert(countRequests(newFetch.log, ROUTE_PATHS.content) > contentCallsBeforeReview, '满意后重新 GET /content')
  }

  const contentCallsBeforeIdea = countRequests(newFetch.log, ROUTE_PATHS.content)
    if (await click('记想法')) {
        assert(textOf(tree).includes('记一条想法'), '弹出记想法对话框')
    const textarea = findFirstNode(tree, (node) => node.props && node.props['data-field'] === 'text')
    assert(Boolean(textarea), '记想法对话框有内容输入框')
    if (textarea) {
      textarea.props.onChange({ target: { value: '补充按基线 SOFA 分层的亚组分析' } })
      tree = await harness.settle()
      const tagInput = findFirstNode(tree, (node) => node.props && node.props['data-field'] === 'tag')
      if (tagInput) {
        tagInput.props.onChange({ target: { value: 'stats' } })
        tree = await harness.settle()
      }
      if (await click('保存想法')) {
        const ideaRequest = lastRequest(newFetch.log, 'POST', ROUTE_PATHS.bridge)
        assert(ideaRequest && ideaRequest.body && ideaRequest.body.action === 'idea', 'idea 请求）action = idea')
        assert(ideaRequest.body.text === '补充按基线 SOFA 分层的亚组分析', `idea 请求体 text = ${ideaRequest.body && ideaRequest.body.text}`)
        assert(ideaRequest.body.tag === 'stats', `idea 请求）tag = ${ideaRequest.body && ideaRequest.body.tag}`)
        assert(ideaRequest.body.project === SAMPLE_ROOT, 'idea 请求体带项目绝对路径')
        assert(countRequests(newFetch.log, ROUTE_PATHS.content) > contentCallsBeforeIdea, '记想法后重新 GET /content')
      }
    }
  }

  console.log('')
  console.log('D) 网络页（已按用户要求先隐藏 TeamMCP 功能，跳过渲染测试）')
  if (false && (await openPanelTab('🌐 网络'))) {
    const networkMarkup = textOf(tree)
  const networkWanted = [
    ['项目网络', '页面标题'],
    ['网络概览', '网络概览区'],
    ['lipid-trial', '其它项目'],
    ['42%', '其它项目进度'],
    ['待你复核', '待你复核区'],
    ['descriptive-tables', '本项目待复核条目'],
    ['待主项目关注', '待主项目关注区'],
  ]
  for (const [needle, label] of networkWanted) {
            assert(networkMarkup.includes(needle), `网络页渲染 ${label}（${needle}）`)
    }
    assert(!networkMarkup.includes('undefined'), '网络页文本无 undefined')
    const bridgeCallsBeforePublish = countRequests(newFetch.log, ROUTE_PATHS.bridge)
        if (await click('发布本项目')) {
      const publishRequest = lastRequest(newFetch.log, 'POST', ROUTE_PATHS.bridge)
            assert(publishRequest && publishRequest.body && publishRequest.body.action === 'publish', 'publish 请求体 action = publish')
      assert(publishRequest.body.project === SAMPLE_ROOT, 'publish 请求体带项目绝对路径')
            assert(countRequests(newFetch.log, ROUTE_PATHS.bridge) > bridgeCallsBeforePublish, '发布请求已发出')
    }
    if (await click('拉取消息')) {
      const pullRequest = lastRequest(newFetch.log, 'POST', ROUTE_PATHS.bridge)
      assert(pullRequest && pullRequest.body && pullRequest.body.action === 'pull', 'pull 请求）action = pull')
    }
    /* v4：网络页在侧滑面板里。「展开」是卡片头部的文字节点，
     * 点击处理挂在祖先容器上——所以先找「文案恰为展开」的节点，
     * 再向上找真正带 onClick 的祖先（最多 8 层），不假定它本身可点。 */
    const expandLeaf = findFirstNode(
      tree,
      (node) => String(textOf(node.props && node.props.children)).trim() === '展开',
    )
    assert(Boolean(expandLeaf), '网络页存在「展开」入口')
    if (expandLeaf) {
      let clickable = null
      let cur = expandLeaf
      for (let depth = 0; depth < 8 && cur; depth += 1) {
        if (cur.props && typeof cur.props.onClick === 'function') {
          clickable = cur
          break
        }
        cur = parentOf(tree, cur)
      }
      assert(Boolean(clickable), '「展开」找到可点击的祖先容器')
      if (clickable) {
        clickable.props.onClick({ stopPropagation() {}, preventDefault() {} })
        tree = await harness.settle()
        const expandedMarkup = textOf(tree)
        assert(expandedMarkup.includes('收起'), '展开后翻转为「收起」（状态已变）')
        assert(expandedMarkup.includes('完成度（子项目）'), '展开后显示完成度')
        assert(expandedMarkup.includes('最近结果'), '展开后显示最近结果')
        assert(
          expandedMarkup.includes('复核记录') || expandedMarkup.includes('最近想法') || expandedMarkup.includes('已复核'),
          '展开后显示想法/复核记录',
        )
      }
    }
  }

  console.log('')
  console.log('E) 工程页（子页）+ 旧视）旧回调）')
  if (await openPanelTab('⚙️ 工程')) {
    const engineeringMarkup = textOf(tree)
    for (const [needle, label] of [
      ['DAG', 'DAG 子页）'],
      ['交接', '交接子页）'],
      ['校验与运行', '校验与运行子页签'],
      ['概览', '概览子页）'],
      ['模块 DAG', '默认 DAG 视图'],
    ]) {
      assert(engineeringMarkup.includes(needle), `工程页渲染 ${label}（${needle}）`)
    }
    if (await click('交接')) {
      const handoffsMarkup = textOf(tree)
      assert(handoffsMarkup.includes('交接列表'), '工程 ）交接视图可切）)')
      assert(handoffsMarkup.includes('HANDOFF-B40-03-IPTW-v1.md'), '交接表格展示交接路径')
      const acceptButton = findButton(tree, '接受')
      assert(Boolean(acceptButton), '交接表格有接受按钮（旧回调仍可用）)')
      if (acceptButton) {
        acceptButton.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
        tree = await harness.settle()
        assert(textOf(tree).includes('接受 HANDOFF-B40-03-IPTW-v1.md'), '接受按钮打开 ReasonDialog')
        if (await click('取消')) {
          assert(!textOf(tree).includes('取消'), '取消关闭 ReasonDialog')
        }
      }
    }
        if (await click('校验与运行')) {
      const controlMarkup = textOf(tree)
            assert(controlMarkup.includes('全项目校验与报告'), '工程页校验与运行视图')
      assert(controlMarkup.includes('运行校验'), '校验运行按钮存在')
      assert(controlMarkup.includes('运行记录'), '运行记录存在')
      const runCallsBefore = countRequests(newFetch.log, ROUTE_PATHS.run)
      if (await click('运行校验')) {
        const runPost = lastRequest(newFetch.log, 'POST', ROUTE_PATHS.run)
        assert(runPost && runPost.body && runPost.body.action === 'verify', '旧回调：运行校验 POST /run {action:verify}')
                assert(countRequests(newFetch.log, ROUTE_PATHS.run) > runCallsBefore, '运行校验后轮询 GET /run?id=')
                assert(textOf(tree).includes('已成功'), '运行记录展示成功状态')
      }
    }
    if (await click('概览')) {
            assert(textOf(tree).includes('待主项目决定'), '工程页概览视图（待主项目决定）')
    }
  }

  console.log('')
  console.log('G) 兼容路径：本机 Desktop 无 desktopWorkbenches 服务时仍能出现在左侧入口')
  {
    const legacyFetch = makeFetchMock(healthNew)
    const legacyBoot = await bootClient(legacyFetch, { withWorkbenchService: false })
    if (legacyBoot) {
      assert(legacyBoot.hasWorkbenchService === false, '模拟旧宿主：未提供 desktopWorkbenches 服务')
      assert(legacyBoot.registrationMode === 'slots', `回退到 slots 注册（实际 ${legacyBoot.registrationMode}）`)
      assert(legacyBoot.injections.includes('main'), '回退：inject main')
      assert(legacyBoot.injections.includes('sidebar.panellist'), '回退：inject sidebar.panellist')
      const legacyMain = legacyBoot.registrations.find((item) => item.options && item.options.name === 'main')
      const legacyPane = legacyBoot.registrations.find((item) => item.options && item.options.name === 'sidebar.panellist')
      assert(Boolean(legacyMain), '回退：注册 main 面板')
      assert(Boolean(legacyPane), '回退：注册左侧入口图标')
      assert(legacyPane.options.id === 'research-workbench' || legacyPane.options.id === 'research-dag-workbench', `回退：入口 id = ${legacyPane.options.id}`)
      assert(typeof legacyPane.options.label === 'function' && legacyPane.options.label() === '研究项目 DAG 工作台', '回退：入口标签正确')
      assert(typeof legacyMain.component === 'function', '回退：业务组件是函数')
      let legacyTree = null
      try {
        legacyTree = await legacyBoot.harness.mount(legacyMain.component, legacyMain.options.inject())
      } catch (problem) {
        bad(`回退路径挂载抛异常：${problem.stack || problem.message}`)
      }
      if (legacyTree) {
        const legacyMarkup = textOf(legacyTree)
        assert(legacyMarkup.includes('项目流程'), '回退路径仍渲染项目流程主线')
        assert(countRequests(legacyFetch.log, ROUTE_PATHS.fishbone) >= 1, '回退路径仍请求 /fishbone')
        assert(!legacyMarkup.includes('undefined'), '回退路径无 undefined')
      }
    }
  }

  console.log('')
  console.log('F) 旧宿主降级（/health.actions ）content）)')
  const oldFetch = makeFetchMock(healthOld)
  const oldBoot = await bootClient(oldFetch)
  if (oldBoot) {
    const oldMain = (oldBoot.workbenchRegistrations || [])[0] || {}
    let oldTree = null
    try {
      oldTree = await oldBoot.harness.mount(oldMain.component, {})
    } catch (problem) {
      bad(`旧宿主挂载抛异常（不得崩溃）：${problem.stack || problem.message}`)
    }
    if (oldTree) {
      const oldMarkup = textOf(oldTree)
      // v2.4：项目流程是默认页；旧宿主没）/fishbone 也不崩，降级显示提示并自动引导到内容页
assert(oldMarkup.includes('项目流程') && oldMarkup.includes('内容'), '旧宿主仍渲染页签结构')
      assert(!oldMarkup.includes('undefined'), '旧宿主内容页）undefined')
      assert(countRequests(oldFetch.log, ROUTE_PATHS.content) === 0, '旧宿主不请求 /content（避）404 噪音）)')

      const oldClick = async (label) => {
        const found = findButton(oldTree, label)
        if (!found) {
          bad(`旧宿主找不到按钮）{label}」`)
          return false
        }
        found.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
        oldTree = await oldBoot.harness.settle()
        return true
      }
      /* v4：旧宿主用「命令栏 + 侧滑面板」导航（与新版一致）。
       * 旧宿主没有 desktopWorkbenches 服务 => 无会话入口，改由 panel 导航。 */
      const oldOpenPanel = async () => {
        const entry = findButton(oldTree, '🧠 主智能体')
        if (!entry) {
          bad('旧宿主找不到「🧠 主智能体」面板入口')
          return false
        }
        entry.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
        oldTree = await oldBoot.harness.settle()
        return true
      }
      const oldOpenPanelTab = async (label) => {
        if (!(await oldOpenPanel())) return false
        const tab = findButton(oldTree, label)
        if (!tab) {
          bad(`旧宿主侧滑面板找不到页签「${label}」`)
          return false
        }
        tab.node.props.onClick({ stopPropagation() {}, preventDefault() {} })
        oldTree = await oldBoot.harness.settle()
        return true
      }
      if (await oldOpenPanelTab('📄 内容')) {
        const oldContent = textOf(oldTree)
        assert(oldContent.includes('重启 DSH 后启用新版内容页'), '旧宿主内容页显示黄色重启提示')
        assert(oldContent.includes('研究结果') || oldContent.includes('结果'), '旧宿主内容页回退渲染旧 ResultsView')
        assert(oldContent.includes('需要你关注') || oldContent.includes('已接受结果') || oldContent.includes('结果'), '旧结果页内容渲染')
        assert(!oldContent.includes('undefined'), '旧宿主内容页回退后无 undefined')
      }
      if (false && (await oldOpenPanelTab('🌐 网络'))) {
        const oldNet = textOf(oldTree)
        assert(oldNet.includes('重启 DSH 后启用项目网络页') || oldNet.includes('网络'), '旧宿主网络页显示需重启提示')
        assert(!oldNet.includes('undefined'), '旧宿主网络页无 undefined')
      }
      if (await oldOpenPanelTab('⚙️ 工程')) {
        const oldEng = textOf(oldTree)
        assert(oldEng.includes('模块 DAG') || oldEng.includes('DAG'), '旧宿主工程页照常显示 DAG')
        assert(oldEng.includes('DAG') && oldEng.includes('交接'), '旧宿主工程页子页签可用')
      }
      if (await oldOpenPanelTab('📄 内容')) {
        assert(textOf(oldTree).includes('重启 DSH 后启用新版内容页'), '切回内容页仍显示重启提示')
      }
    }
  }

  report()
}

function report() {
  console.log('')
  console.log(`RESULT: ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILURE(S)`}`)
  if (failures.length > 0) {
    console.log('')
    for (const failure of failures) console.log(`  - ${failure}`)
  }
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((problem) => {
  console.log(`FATAL ${(problem && problem.stack) || problem}`)
  process.exit(1)
})
