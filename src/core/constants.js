/**
 * 研究项目 DAG 工作台 — 常量、状态主题与样式。
 *
 * 浏览器半侧自持全部常量（不得引用 lib/host.js）。
 * 本文件在构建产物中与其余模块处于同一作用域；共享的小工具函数集中放在这里。
 */

export const PANEL_ID = 'research-dag-workbench'
export const ROUTE = '/research-dag-workbench'

/** v3.6 顶级页签：总控看板放在最前面！ */
export const VIEWS = [
  ['hub', '总控看板'],
  ['fishbone', '项目流程'],
  ['leader', '主智能体'],
  ['content', '内容'],
  ['network', '网络'],
  ['engineering', '工程'],
]

/** 工程页子页签（复用旧视图）：DAG / 交接 / 校验与运行 / 概览。 */
export const ENGINEERING_TABS = [
  ['dag', 'DAG'],
  ['handoffs', '交接'],
  ['control', '校验与运行'],
  ['overview', '概览'],
]

/** 旧宿主（/health.actions 无 content）提示。 */
export const CONTENT_UPGRADE_NOTICE = '重启 DSH 后启用新版内容页'
export const NETWORK_UPGRADE_NOTICE = '重启 DSH 后启用项目网络页'

/** 项目阶段枚举（与 control/PROJECT_STATE.json 的 phase 一致）。 */
export const PHASES = [
  ['planning', '规划'],
  ['literature', '文献'],
  ['design', '设计'],
  ['data', '数据'],
  ['analysis', '分析'],
  ['manuscript', '写作'],
  ['review', '审稿'],
  ['concluded', '收束'],
]

/**
 * 交接状态主题色。
 * v3.4：颜色全部走 --rdw-* 令牌（随宿主明暗主题自适应），不再硬编码 hex。
 */
export const STATUS_INFO = {
  DRAFT: { label: '草稿', color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)', border: 'color-mix(in srgb,var(--rdw-st-draft) 30%,transparent)' },
  PROVISIONAL: { label: '待决定', color: 'var(--rdw-st-provisional)', bg: 'var(--rdw-st-provisional-soft)', border: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' },
  ACCEPTED: { label: '已接受', color: 'var(--rdw-st-accepted)', bg: 'var(--rdw-st-accepted-soft)', border: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' },
  REJECTED: { label: '已拒绝', color: 'var(--rdw-st-rejected)', bg: 'var(--rdw-st-rejected-soft)', border: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)' },
  SUPERSEDED: { label: '已被取代', color: 'var(--rdw-st-superseded)', bg: 'var(--rdw-st-superseded-soft)', border: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' },
  BLOCKED: { label: '被阻塞', color: 'var(--rdw-st-blocked)', bg: 'var(--rdw-st-blocked-soft)', border: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' },
}

/** v1.2 平实状态词（结果页 / 交接页给人看，不再用状态机术语）。 */
export const PLAIN_STATUS_INFO = {
  DRAFT: { label: '进行中' },
  PROVISIONAL: { label: '待确认' },
  ACCEPTED: { label: '已出结果' },
  REJECTED: { label: '已放弃' },
  SUPERSEDED: { label: '旧版本' },
  BLOCKED: { label: '卡住' },
}

/** verify 错误码 → 一句自然语言（结果页「需要你关注」用）。 */
export const ATTENTION_TEXT = {
  'DAG-E001': '这个目录还不是 DAG 项目',
  'DAG-E002': '有文件解析失败',
  'DAG-E003': '交接文件缺少必要章节',
  'DAG-E004': '有清单文件缺失',
  'DAG-E005': '有文件哈希不一致',
  'DAG-E006': '有非法的状态变化',
  'DAG-E007': '有重复的 id 或版本',
  'DAG-E008': '有已冻结的正文被改动',
  'DAG-E009': '同一个结果流出现多个已接受版本',
  'DAG-E010': '交接账本与磁盘不一致',
  'DAG-E011': '有决定缺少理由',
  'DAG-E012': '项目状态文件不合法',
  'DAG-E013': '决策日志缺少条目',
  'DAG-E014': '有文件路径越出项目目录',
  'DAG-E015': '项目 schema 版本不受支持',
}

/** counts 键的固定顺序（缺省补 0）。 */
export const STATUS_ORDER = ['draft', 'provisional', 'accepted', 'rejected', 'superseded', 'blocked']

/** action 的中文名，用于「执行中：…」状态条与运行记录。 */
export const ACTION_LABELS = {
  status: '刷新状态',
  verify: '全项目校验',
  list: '列出交接',
  check: '校验交接',
  submit: '提交交接',
  accept: '接受交接',
  reject: '拒绝交接',
  block: '阻塞交接',
  unblock: '恢复交接',
  report: '重写报告',
  'state-set': '更新项目状态',
  config: '保存配置',
  results: '刷新结果',
  auto: '自动回连',
  init: '新建项目',
  'module-add': '新建模块',
  'branch-add': '新建分支',
  'handoff-new': '新建交接',
  unsubmit: '撤回修改',
  compare: '方案对比',
  'sync-accepted': '重建投影',
  'review-compile': '编译审稿信',
  sprout: '创建分支',
  graft: '回连',
}

/** 创建类动作的中文标题。 */
export const CREATE_ACTIONS = {
  init: '新建项目',
  'module-add': '新建模块',
  'branch-add': '新建分支',
  'handoff-new': '新建交接',
}

/** 桥动作（POST /bridge）的中文名，用于状态条。 */
export const BRIDGE_LABELS = {
  publish: '发布到网络',
  pull: '拉取网络消息',
  review: '标记满意',
  idea: '记录想法',
}

/** 子项目（模块）完成度状态 → 平实文案与颜色（走令牌）。 */
export const MODULE_STATUS_INFO = {
  done: { label: '已完成', color: 'var(--rdw-st-accepted)' },
  active: { label: '进行中', color: 'var(--rdw-st-provisional)' },
  blocked: { label: '卡住', color: 'var(--rdw-st-blocked)' },
  idle: { label: '未开始', color: 'var(--rdw-st-draft)' },
}

/** 创建类动作对应的宿主 /health.actions（用于宿主能力门控）。 */
export const CREATE_HOST_ACTIONS = ['init', 'module-add', 'branch-add', 'handoff-new']

/** 旧版宿主的提示文案（/health.actions 缺少创建类动作时显示）。 */
export const HOST_UPGRADE_NOTICE =
  '当前宿主为旧版本，新建功能需重启 DSH 后启用；接受/拒绝/校验等现有功能不受影响'

/**
 * /health.actions 是否覆盖全部创建类动作。
 * 旧宿主（已加载的 v1.0 宿主）缺少 init/module-add/branch-add/handoff-new，
 * 客户端据此隐藏创建入口，避免点击后收到 E_ACTION。
 */
export function hostSupportsCreate(health) {
  const actions = health && Array.isArray(health.actions) ? health.actions : null
  if (!actions) return false
  return CREATE_HOST_ACTIONS.every((action) => actions.includes(action))
}

/** /health.actions 是否包含某个 v1.2 能力（results / auto）。 */
export function hostSupportsAction(health, action) {
  const actions = health && Array.isArray(health.actions) ? health.actions : null
  return Boolean(actions && actions.includes(action))
}

/** 自由命名提示（PROTOCOL v1.2：id 不再要求 Mxx/Bxx 编号）。 */
export const FREE_ID_HINT = '任意唯一名称即可（如 literature、pilot-a），不需要编号'

/**
 * 创建表单字段定义（按动作）。
 * root/id/name/title 必填；slug/stream/goal 可选；module/branch 只读带入。
 */
export const CREATE_FIELD_SPECS = {
  init: [
    {
      name: 'root',
      label: '项目根路径（绝对路径）',
      placeholder: 'D:\\papers\\my-project',
      required: true,
      hint: '父目录需存在且可写；项目控制文件会初始化到该目录',
    },
    { name: 'id', label: '项目 id', required: true, hint: FREE_ID_HINT },
    { name: 'title', label: '项目标题', required: true, placeholder: '例如：早期补磷的 target trial emulation' },
    { name: 'goal', label: '研究总目标（可选）', multiline: true, placeholder: '一句话描述研究总目标' },
  ],
  'module-add': [
    { name: 'id', label: '模块 id', required: true, hint: FREE_ID_HINT },
    { name: 'name', label: '显示名', required: true, placeholder: '例如：文献检索' },
    { name: 'slug', label: '目录 slug（可选）', hint: '可选，会追加到目录名，如 literature-search' },
  ],
  'branch-add': [
    { name: 'module', label: '所属模块', readonly: true },
    { name: 'id', label: '分支 id', required: true, hint: FREE_ID_HINT },
    { name: 'name', label: '显示名', required: true, placeholder: '例如：先导检索' },
    { name: 'slug', label: '目录 slug（可选）', hint: '可选，会追加到目录名' },
  ],
  'handoff-new': [
    { name: 'branch', label: '所属分支', readonly: true },
    { name: 'stream', label: 'stream（可选）', hint: '可选；小写字母/数字/连字符，缺省用分支 id 小写化' },
    { name: 'slug', label: '文件名标签（可选）', hint: '可选；会写入 HANDOFF-<标签>-vN.md 文件名' },
  ],
}

/** 节点 id 规则（模块/分支/项目）：字母数字开头，1–64 字，允许 . _ -。 */
export function isValidNodeId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(String(value === null || value === undefined ? '' : value).trim())
}

/** slug 规则：可选；字母数字点下划线连字符，≤40 字。 */
export function isValidSlug(value) {
  const text = String(value === null || value === undefined ? '' : value).trim()
  if (!text) return true
  return /^[A-Za-z0-9._-]{1,40}$/.test(text)
}

/** stream 规则：可选；小写字母/数字/连字符，字母数字开头。 */
export function isValidStream(value) {
  const text = String(value === null || value === undefined ? '' : value).trim()
  if (!text) return true
  return /^[a-z0-9][a-z0-9-]*$/.test(text)
}

/** 绝对路径判定（Windows 盘符 / UNC / POSIX 根）。 */
export function isAbsoluteProjectPath(value) {
  const text = String(value === null || value === undefined ? '' : value).trim()
  if (!text) return false
  if (/^[A-Za-z]:[\\/]/.test(text)) return true
  if (/^\\\\[^\\]+/.test(text)) return true
  return text.startsWith('/')
}

/** run 记录状态主题（走令牌）。 */
export const RUN_STATUS_INFO = {
  running: { label: '运行中', color: 'var(--rdw-warn)', bg: 'var(--rdw-warn-soft)' },
  succeeded: { label: '已成功', color: 'var(--rdw-ok)', bg: 'var(--rdw-ok-soft)' },
  failed: { label: '失败', color: 'var(--rdw-danger)', bg: 'var(--rdw-danger-soft)' },
}

/**
 * 内联样式常量（不引入外部 CSS；颜色全部走 --rdw-* 令牌，随宿主明暗主题自适应）。
 *
 * v3.4：颜色体系从「裸 hex / rgba」迁移到令牌层（见 core/theme.js）。
 * 本文件不再出现任何具体色值——所有状态色由 tone 体系提供。
 */
export const STYLES = {
  card: {
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    padding: '14px 16px',
    marginBottom: 14,
    background: 'var(--rdw-panel)',
    boxShadow: 'var(--rdw-shadow-1)',
    transition: 'border-color .15s var(--rdw-ease), box-shadow .15s var(--rdw-ease)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 22,
    padding: '0 10px',
    borderRadius: 'var(--rdw-r-pill)',
    border: '1px solid var(--rdw-line-2)',
    background: 'var(--rdw-sunken)',
    color: 'var(--rdw-text-2)',
    fontSize: 11,
    fontWeight: 500,
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  },
  muted: {
    color: 'var(--rdw-text-3)',
    fontSize: 11,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 30,
    padding: '0 12px',
    border: '1px solid var(--rdw-line-2)',
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    borderRadius: 'var(--rdw-r-sm)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'background .15s var(--rdw-ease),border-color .15s var(--rdw-ease),color .15s var(--rdw-ease),box-shadow .15s var(--rdw-ease)',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 30,
    padding: '0 13px',
    border: '1px solid var(--rdw-brand)',
    background: 'var(--rdw-brand)',
    color: 'var(--rdw-on-brand)',
    borderRadius: 'var(--rdw-r-sm)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    boxShadow: 'var(--rdw-shadow-1)',
    transition: 'background .15s var(--rdw-ease),border-color .15s var(--rdw-ease)',
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 30,
    padding: '0 12px',
    border: '1px solid color-mix(in srgb,var(--rdw-danger) 36%,transparent)',
    background: 'var(--rdw-danger-soft)',
    color: 'var(--rdw-danger)',
    borderRadius: 'var(--rdw-r-sm)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  input: {
    flex: '1 1 320px',
    minWidth: 220,
    height: 32,
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '0 10px',
    fontSize: 12,
    fontFamily: 'inherit',
    outline: 'none',
  },
  select: {
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '4px 8px',
    fontSize: 11,
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 88,
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 30,
    padding: '0 12px',
    borderRadius: 'var(--rdw-r-sm)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--rdw-text-2)',
    border: '1px solid transparent',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    transition: 'background .15s var(--rdw-ease),color .15s var(--rdw-ease)',
  },
  tabActive: {
    fontWeight: 600,
    background: 'var(--rdw-accent-soft)',
    border: '1px solid color-mix(in srgb,var(--rdw-accent) 26%,transparent)',
    color: 'var(--rdw-accent)',
  },
  mono: {
    fontFamily: 'var(--rdw-font-mono)',
    fontSize: 11,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  pre: {
    margin: 0,
    fontFamily: 'var(--rdw-font-mono)',
    fontSize: 11,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    padding: '9px 11px',
    borderRadius: 'var(--rdw-r-sm)',
    background: 'var(--rdw-sunken)',
    border: '1px solid var(--rdw-line)',
    overflowY: 'auto',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    background: 'var(--rdw-panel)',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 12,
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid var(--rdw-line-2)',
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text-3)',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '9px 10px',
    borderBottom: '1px solid var(--rdw-line)',
    verticalAlign: 'middle',
    color: 'var(--rdw-text)',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: '.01em',
    color: 'var(--rdw-text)',
  },
  link: {
    cursor: 'pointer',
    color: 'var(--rdw-accent)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  badgeBase: {
    borderRadius: 'var(--rdw-r-pill)',
    padding: '1px 9px',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap',
    lineHeight: '17px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--dsw-alias-bg-mask-2,rgba(0,0,0,.25))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  dialog: {
    width: 'min(560px, 94vw)',
    maxHeight: '86vh',
    overflowY: 'auto',
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-lg)',
    padding: '16px 18px',
    boxShadow: 'var(--rdw-shadow-3)',
  },
  statCard: {
    flex: '1 1 104px',
    minWidth: 96,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    padding: '11px 13px',
    background: 'var(--rdw-panel)',
    transition: 'border-color .15s var(--rdw-ease),box-shadow .15s var(--rdw-ease)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: '-.02em',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--rdw-text)',
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--rdw-text-3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(104px,1fr))',
    gap: 10,
    marginBottom: 12,
  },
  subtitle: {
    color: 'var(--rdw-text-2)',
    fontSize: 11.5,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--rdw-line)',
    margin: '12px 0',
  },
  listItem: {
    fontSize: 11.5,
    lineHeight: 1.75,
    color: 'var(--rdw-text-2)',
  },
  errorBanner: {
    border: '1px solid color-mix(in srgb,var(--rdw-danger) 40%,transparent)',
    borderLeft: '3px solid var(--rdw-danger)',
    color: 'var(--rdw-danger)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '9px 12px',
    marginBottom: 10,
    background: 'var(--rdw-danger-soft)',
    fontSize: 11.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  noticeBanner: {
    border: '1px solid color-mix(in srgb,var(--rdw-warn) 34%,transparent)',
    borderLeft: '3px solid var(--rdw-warn)',
    color: 'var(--rdw-warn)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '9px 12px',
    marginBottom: 10,
    background: 'var(--rdw-warn-soft)',
    fontSize: 11.5,
    lineHeight: 1.65,
    wordBreak: 'break-word',
  },
  footer: {
    marginTop: 4,
    paddingTop: 8,
    paddingBottom: 2,
    borderTop: '1px solid var(--rdw-line)',
    fontSize: 11,
    color: 'var(--rdw-text-3)',
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    position: 'sticky',
    bottom: 0,
    background: 'var(--rdw-panel)',
  },
  detailCard: {
    border: '1px solid var(--rdw-line)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '11px 13px',
    marginTop: 10,
    background: 'var(--rdw-sunken)',
    flex: '1 1 300px',
    minWidth: 280,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  attentionBox: {
    border: '1px solid color-mix(in srgb,var(--rdw-warn) 30%,transparent)',
    borderLeft: '3px solid var(--rdw-warn)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '10px 12px',
    marginBottom: 10,
    background: 'var(--rdw-warn-soft)',
  },
  attentionItem: {
    borderTop: '1px solid var(--rdw-line)',
    padding: '7px 0 2px',
    fontSize: 11.5,
    lineHeight: 1.65,
    color: 'var(--rdw-text-2)',
  },
  resultGroup: {
    marginBottom: 14,
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
    gap: 10,
  },
  resultCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    minWidth: 0,
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    padding: '12px 13px',
    background: 'var(--rdw-panel)',
    cursor: 'pointer',
    transition: 'border-color .15s var(--rdw-ease),box-shadow .18s var(--rdw-ease),transform .18s var(--rdw-ease)',
  },
  resultTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.5,
    color: 'var(--rdw-text)',
  },
  resultMeta: {
    fontSize: 12.5,
    color: 'var(--rdw-text-3)',
    marginBottom: 2,
  },
  resultBody: {
    fontSize: 11.5,
    lineHeight: 1.65,
    color: 'var(--rdw-text-2)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  smallLink: {
    fontSize: 12.5,
    cursor: 'pointer',
    color: 'var(--rdw-accent)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  codeChip: {
    fontFamily: 'var(--rdw-font-mono)',
    fontSize: 12,
    border: '1px solid color-mix(in srgb,var(--rdw-danger) 32%,transparent)',
    color: 'var(--rdw-danger)',
    background: 'var(--rdw-danger-soft)',
    borderRadius: 'var(--rdw-r-xs)',
    padding: '0 5px',
    marginRight: 6,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(272px,1fr))',
    gap: 12,
    marginBottom: 12,
    minWidth: 0,
  },
  contentCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    minWidth: 0,
    boxSizing: 'border-box',
    border: '1px solid var(--rdw-line-2)',
    borderRadius: 'var(--rdw-r-md)',
    padding: '13px 14px',
    background: 'var(--rdw-panel)',
    // 左侧 3px 强调条：形状参与分组语义（色弱友好）
    borderLeft: '3px solid var(--rdw-accent)',
    transition: 'border-color .15s var(--rdw-ease),box-shadow .18s var(--rdw-ease),transform .18s var(--rdw-ease)',
  },
  contentTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--rdw-text)',
    overflowWrap: 'anywhere',
  },
  contentMeta: {
    fontSize: 12.5,
    color: 'var(--rdw-text-3)',
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  },
  contentBody: {
    fontSize: 11.5,
    lineHeight: 1.65,
    color: 'var(--rdw-text-2)',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    minWidth: 0,
  },
  statBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(560px, 96vw)',
    background: 'var(--rdw-panel)',
    color: 'var(--rdw-text)',
    borderLeft: '1px solid var(--rdw-line-2)',
    boxShadow: 'var(--rdw-shadow-3)',
    padding: '16px 18px',
    overflowY: 'auto',
    zIndex: 120,
    boxSizing: 'border-box',
    overflowWrap: 'anywhere',
  },
  drawerBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'var(--dsw-alias-bg-mask-2,rgba(0,0,0,.25))',
    zIndex: 119,
  },
  mutedBox: {
    border: '1px solid var(--rdw-line)',
    borderRadius: 'var(--rdw-r-sm)',
    padding: '9px 11px',
    background: 'var(--rdw-sunken)',
    fontSize: 11.5,
    lineHeight: 1.65,
    color: 'var(--rdw-text-2)',
    overflowWrap: 'anywhere',
  },
}

/** 模块完成度状态 → 主题（未知兜底 idle）。 */
export function moduleStatusInfo(status) {
  const key = String(status === null || status === undefined ? '' : status)
  return MODULE_STATUS_INFO[key] || MODULE_STATUS_INFO.idle
}

/** 状态 → 主题（未知状态兜底）。 */
export function statusInfo(status) {
  const key = String(status === null || status === undefined ? '' : status).toUpperCase()
  return (
    STATUS_INFO[key] || {
      label: key || '未知',
      color: 'var(--rdw-st-draft)',
      bg: 'var(--rdw-st-draft-soft)',
      border: 'color-mix(in srgb,var(--rdw-st-draft) 30%,transparent)',
    }
  )
}

/** run 状态 → 主题（未知状态兜底）。 */
export function runStatusInfo(status) {
  return (
    RUN_STATUS_INFO[status] || {
      label: status ? String(status) : '未知',
      color: 'var(--rdw-st-draft)',
      bg: 'var(--rdw-st-draft-soft)',
    }
  )
}

/** 阶段 → 中文名。 */
export function phaseLabel(phase) {
  const found = PHASES.find((entry) => entry[0] === phase)
  return found ? found[1] : phase || '未设置'
}

/** 取路径最后一段（兼容 Windows 反斜杠）。 */
export function handoffName(pathValue) {
  const text = String(pathValue === null || pathValue === undefined ? '' : pathValue).replace(/\\/g, '/')
  const index = text.lastIndexOf('/')
  return index >= 0 ? text.slice(index + 1) : text
}

/** 从 handoff 路径推模块 id，例如 modules/M40-statistics/... → M40。 */
export function moduleFromHandoffPath(pathValue) {
  const match = String(pathValue === null || pathValue === undefined ? '' : pathValue)
    .replace(/\\/g, '/')
    .match(/^modules\/([^/]+)\//)
  if (!match) return '—'
  return match[1].split('-')[0] || match[1]
}

/** 从 handoff 文件名推分支 id，例如 HANDOFF-B40-03-IPTW-v1.md → B40-03。 */
export function branchFromHandoffPath(pathValue) {
  const match = handoffName(pathValue).match(/^HANDOFF-(B\d{2}-\d{2})-/)
  return match ? match[1] : '—'
}

/** 从 handoff 文件名推版本号，兜底 1。 */
export function versionFromHandoffPath(pathValue) {
  const match = handoffName(pathValue).match(/-v(\d+)\.md$/)
  return match ? Number(match[1]) : 1
}

/** 待决定问题可能是字符串或字符串数组，统一成多行文本。 */
export function normalizeQuestions(questions) {
  if (Array.isArray(questions)) {
    return questions
      .map((item) => String(item === null || item === undefined ? '' : item))
      .filter(Boolean)
      .join('\n')
  }
  if (questions === null || questions === undefined) return ''
  return String(questions)
}

/** 读取 counts 的某个键，缺省 0。 */
export function countOf(counts, key) {
  if (!counts || typeof counts !== 'object') return 0
  const value = counts[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** 汇总模块的分支数（modules[].branches 可能是数字或数组）。 */
export function sumBranchCount(modules) {
  let total = 0
  for (const module of Array.isArray(modules) ? modules : []) {
    const branches = module && module.branches
    if (typeof branches === 'number' && Number.isFinite(branches)) total += branches
    else if (Array.isArray(branches)) total += branches.length
  }
  return total
}

/** 时间字符串 → 只保留时分秒，便于紧凑展示。 */
export function formatTimeText(value) {
  if (!value) return '—'
  const text = String(value)
  const match = text.match(/T(\d{2}:\d{2}(?::\d{2})?)/)
  if (match) return match[1]
  if (text.length > 19) return text.slice(0, 19)
  return text
}

/** 状态 → 平实中文词（v1.2 给人看的界面）。 */
export function plainStatusLabel(status) {
  const key = String(status === null || status === undefined ? '' : status).toUpperCase()
  const info = PLAIN_STATUS_INFO[key]
  return info ? info.label : key || '未知'
}

/** verify issue → 一句自然语言说明（code 拿不到时兜底 message）。 */
export function attentionText(issue) {
  const code = issue && issue.code ? String(issue.code) : ''
  const base = ATTENTION_TEXT[code] || '有一项校验问题'
  const message = issue && issue.message ? String(issue.message) : ''
  return message ? `${base}：${message}` : base
}

/** 文本截断（结果卡片 keyResults 等），max 为字符数。 */
export function truncateText(value, max) {
  const text = value === null || value === undefined ? '' : String(value)
  const limit = typeof max === 'number' && max > 0 ? max : 200
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}…`
}

/** 取文本第一行（去空行），可按字符截断。 */
export function firstLineText(value, max) {
  const lines = String(value === null || value === undefined ? '' : value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const first = lines.length > 0 ? lines[0] : ''
  return typeof max === 'number' && max > 0 ? truncateText(first, max) : first
}

/**
 * 取文本前 N 行，每行截断到 lineMax 字（结果卡 keyResults 前 3 行用）。
 * 返回字符串数组，调用方用 pre-wrap 展示。
 */
export function takeLines(value, maxLines, lineMax) {
  const lines = String(value === null || value === undefined ? '' : value).split(/\r?\n/)
  const picked = []
  for (const line of lines) {
    const text = line.trim()
    if (!text) continue
    picked.push(truncateText(text, typeof lineMax === 'number' && lineMax > 0 ? lineMax : 120))
    if (picked.length >= (typeof maxLines === 'number' && maxLines > 0 ? maxLines : 3)) break
  }
  return picked
}

/** 复核数据键：`stream@version`（与 /content.review.byItem 一致）。 */
export function reviewKeyOf(stream, version) {
  return `${String(stream === null || stream === undefined ? '' : stream)}@${Number.isFinite(Number(version)) ? Number(version) : 1}`
}

/** 从已完成度行推断模块状态（无 network completion 时兜底）。 */
export function inferModuleStatus(countsByStatus) {
  const counts = countsByStatus && typeof countsByStatus === 'object' ? countsByStatus : {}
  const pending = Number(counts.pending) || 0
  const blocked = Number(counts.blocked) || 0
  const accepted = Number(counts.accepted) || 0
  const drafts = Number(counts.draft) || 0
  if (pending > 0) return 'active'
  if (blocked > 0) return 'blocked'
  if (accepted > 0 && drafts === 0) return 'done'
  return 'idle'
}

/* ==========================================================================
 * 整页框架（业务优先）样式与容器查询
 *
 * 规范 4.1/4.3：整页业务优先时，业务区必须按「自己的容器宽度」重排，
 * 不能只看窗口断点；窄容器下不允许单字竖排、控件裁切或整页横向溢出。
 * 因此这里用 container query（container-type: inline-size）把断点绑在
 * 业务容器上，而不是窗口上：会话区展开/收起、侧栏展开/收起都会改变
 * 业务区宽度，样式随之重排。
 * ========================================================================== */

/**
 * 框架级 CSS（容器查询 + 少量无法用内联样式表达的重排规则）。
 *
 * v3.4：颜色全部引用 --rdw-* 令牌（见 core/theme.js 的 RDW_THEME_CSS）。
 * 布局参考 projectHub / bianqu-workbench 的做法：工具栏两行制（标题行 + 页签行），
 * 业务区是唯一滚动容器，断点全部绑在业务容器宽度（container query）上。
 */
export const SHELL_CSS = `
.rdw-shell{flex:1 1 auto;display:flex;flex-direction:column;align-items:stretch;height:100%;min-height:0;min-width:0;width:100%;box-sizing:border-box;container-type:inline-size;container-name:rdw;font-family:var(--rdw-font);font-size:13px;line-height:1.5;color:var(--rdw-organic-ink);background:var(--rdw-organic-bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.rdw-shell *,.rdw-shell *::before,.rdw-shell *::after{box-sizing:border-box}
.rdw-shell :where(button,input,select,textarea){font-family:inherit}
.rdw-shell :focus-visible{outline:2px solid var(--rdw-sys-blue);outline-offset:2px;border-radius:var(--rdw-r-pebble-sm)}
/* Apple 滚动条：细、半透明、圆头（不用系统粗条） */
.rdw-shell ::-webkit-scrollbar{width:9px;height:9px}
.rdw-shell ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border:2px solid transparent;background-clip:content-box;border-radius:999px}
.rdw-shell ::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.30);background-clip:content-box}
.rdw-shell ::-webkit-scrollbar-track{background:transparent}

/* —— 工具栏：标题行 + 页签行 ——
   水平内边距挂在 <header>（.rdw-toolbar）上，行内只补顶部间距。
   原因：宿主在 macOS 收起侧栏时会给 [data-dsh-compact-toolbar] 覆盖
   padding-inline-start（--dsh-frame-leading-clearance，160/84px）给窗口按钮让位；
   若行内再带一层左内边距，内容会被推离目标位置。 */
.rdw-toolbar{flex:none;display:flex;flex-direction:column;background:var(--rdw-glass-strong);backdrop-filter:saturate(180%) blur(22px);-webkit-backdrop-filter:saturate(180%) blur(22px);border-bottom:1px solid var(--rdw-warm-line);box-sizing:border-box;min-width:0;padding:0 16px}
.rdw-toolbar-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;padding:9px 0 0}
.rdw-toolbar-title{margin:0;font-size:15px;font-weight:600;letter-spacing:-.012em;display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;color:var(--rdw-organic-ink)}
.rdw-toolbar-brand{display:grid;place-items:center;width:26px;height:26px;flex:0 0 auto;border-radius:7px;background:linear-gradient(180deg,#5ac8fa,#007aff);color:#fff;font-size:14px;line-height:1;box-shadow:0 1px 2px rgba(0,122,255,.28)}
.rdw-toolbar-actions{margin-left:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:none}
.rdw-tabs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;min-width:0;padding:7px 0 0;overflow-x:auto}
.rdw-subtitle{color:var(--rdw-organic-ink-3);font-size:12px;line-height:1.5;margin:0;padding:0 0 8px}
.rdw-scope{margin-left:auto;font-size:12px;color:var(--rdw-organic-ink-3);white-space:nowrap;font-variant-numeric:tabular-nums;padding-left:12px}

/* —— 主体：业务区 + 会话区 —— */
.rdw-body{flex:1 1 auto;display:flex;flex-direction:row;min-height:0;min-width:0;overflow:hidden}
/* 业务区必须吃满剩余宽度。
 * 陷阱：只写 flex:1 1 auto 时，flex 基准取内容 max-content；旁边若有
 * 固定宽度的兄弟（即使 display:none），剩余空间仍按该兄弟的 width 预留，
 * 表现为右侧凭空多出一大块空白。用 flex:1 1 0 + width:100% 锁死。 */
.rdw-business{flex:1 1 0;width:100%;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;background:var(--rdw-organic-bg)}
.rdw-business-scroll{flex:1 1 auto;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:16px 18px 28px;box-sizing:border-box}
.rdw-foot{flex:none;border-top:1px solid var(--rdw-warm-line-2);padding:8px 18px;background:var(--rdw-glass-strong);backdrop-filter:saturate(180%) blur(22px);-webkit-backdrop-filter:saturate(180%) blur(22px)}
/* 会话窗 = 全界面第一重心。
 * 原先是「玻璃底 + 一条竖分割线」贴在右侧，读起来像附属面板。
 * 现在抬成实体面：纯净底色 + 左侧一道柔和投影把它托起来，
 * 与左侧三栏的灰底形成明确的前后关系。 */
.rdw-chat{flex:none;display:flex;flex-direction:column;min-height:0;min-width:0;width:var(--rdw-chat-width,420px);max-width:46%;border-left:1px solid var(--rdw-focus-line);box-sizing:border-box;background:var(--rdw-focus-surface);box-shadow:-10px 0 30px -18px rgba(0,0,0,.18)}
/* 收起：只是视觉隐藏，宿主会话节点保持挂载（展开后不丢状态）。 */
.rdw-chat.rdw-chat-collapsed{display:none!important}
.rdw-chat-head{flex:none;display:flex;align-items:center;gap:8px;padding:9px 13px;border-bottom:1px solid var(--rdw-warm-line-2);font-size:12.5px;font-weight:600;color:var(--rdw-organic-ink);background:var(--rdw-focus-surface);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.rdw-chat-slot{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden}
.rdw-welcome{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px}

/* —— 卡片悬停反馈（大小分级：大卡抬 2px，小卡抬 1px）—— */
.rdw-card-hover{transition:border-color .15s var(--rdw-ease),box-shadow .18s var(--rdw-ease),transform .18s var(--rdw-ease)}
.rdw-card-hover:hover{border-color:var(--rdw-accent);box-shadow:var(--rdw-shadow-2);transform:translateY(-2px)}

/* ═══════════════════════════════════════════════════════════════════════════
 * EvoResearch「Natural Organic」有机组件层
 * 参照 Karbo123/DSH-EvoResearch：悬停是「半透明暖洗」（覆盖在任意父面上都成立，
 * 不会在小卡片里显得过亮），而不是换边框色 + 位移这种工业感反馈。
 * ═══════════════════════════════════════════════════════════════════════════ */

/* 有机行悬停：暖洗背景，无位移（列表行位移会抖） */
.rdw-organic-row{transition:background .2s cubic-bezier(.4,0,.2,1)}
.rdw-organic-row:hover{background:var(--rdw-organic-hover)}

/* 有机卡片悬停：仅暖洗阴影，不位移 */
.rdw-organic-card{transition:box-shadow .24s cubic-bezier(.4,0,.2,1),border-color .24s cubic-bezier(.4,0,.2,1)}
.rdw-organic-card:hover{box-shadow:var(--rdw-shadow-organic-2)}

/* 有机按钮悬停：描边转向鼠尾草，不改变底色亮度 */
.rdw-organic-btn{transition:border-color .18s cubic-bezier(.4,0,.2,1),color .18s cubic-bezier(.4,0,.2,1),background .18s cubic-bezier(.4,0,.2,1)}
.rdw-organic-btn:hover{border-color:color-mix(in srgb,var(--rdw-sage) 42%,var(--rdw-warm-line));color:var(--rdw-organic-ink)}
.rdw-organic-btn:disabled{opacity:.45;cursor:default}

/* 有机滚动条：土色半透明细条，禁纯黑/冷灰 */
.rdw-organic-scroll{scrollbar-width:thin;scrollbar-color:rgb(120 108 92 / 38%) transparent}
.rdw-organic-scroll::-webkit-scrollbar{width:7px;height:7px}
.rdw-organic-scroll::-webkit-scrollbar-track{background:transparent}
.rdw-organic-scroll::-webkit-scrollbar-thumb{background:rgb(120 108 92 / 34%);border-radius:999px;border:2px solid transparent;background-clip:content-box}
.rdw-organic-scroll::-webkit-scrollbar-thumb:hover{background-color:rgb(120 108 92 / 58%)}

/* ═══════════════════════════════════════════════════════════════════════
 * 宿主原生会话节点嵌入式约定（v5）
 *
 * 问题：直接注入的会话窗口内部是「height 100%」式全屏布局，
 * 而百分比高度只在父级有确定高度时才解析成功。工作台把节点放进
 * flex 列里时，父级只有 min-height（下限，不是确定值），
 * 于是宿主节点算出的可用高度为 0 → 头部渲染、正文一片空白。
 *
 * 修复分两层：
 *   1. 内联样式：每一层父级都写 height:0 + flex:1（flex 分配给出确定高度）；
 *   2. 这里再补 CSS 兜底：即使宿主节点自带内联 height:100%，
 *      也强制它在槽位内铺满并允许内部滚动，不会塌成 0。
 * ═══════════════════════════════════════════════════════════════════════ */
.rdw-native-slot{position:relative;contain:layout size}
/* 槽位的直接子元素（宿主会话根节点）必须铺满槽位 */
.rdw-native-slot > *{flex:1 1 auto;min-height:0;height:100%;width:100%;overflow:hidden}
/* 宿主节点内部常见结构：消息区可滚、输入区固定 */
.rdw-native-slot *{max-width:100%}
/* 兜底：若宿主节点内部使用了视口高度，限制为容器高度 */
.rdw-native-slot > * > *{max-height:100%}

/* —— 宽容器：默认分栏 —— */
@container rdw (max-width: 1080px){
  .rdw-chat{max-width:52%}
}
/* 中等容器：会话区改为上下排布，业务区仍在上方完整可用 */
@container rdw (max-width: 860px){
  .rdw-body{flex-direction:column}
  .rdw-chat{width:auto;max-width:none;height:min(52vh,420px);border-left:none;border-top:1px solid var(--rdw-line-2)}
  .rdw-subtitle{display:none}
}
/* 窄容器：收紧内边距、标题不再挤占一行、卡片单列 */
@container rdw (max-width: 620px){
  .rdw-toolbar{padding:0 10px}
  .rdw-toolbar-row{padding:7px 0 0}
  .rdw-tabs{padding:5px 0 0}
  .rdw-business-scroll{padding:12px 10px 20px}
  .rdw-foot{padding:6px 10px}
  .rdw-toolbar-title{font-size:13px;white-space:normal;overflow-wrap:anywhere}
  .rdw-welcome{grid-template-columns:1fr}
  .rdw-toolbar-actions{width:100%;margin-left:0;justify-content:flex-start}
  .rdw-scope{display:none}
}
/* 极窄容器（侧栏展开 + 会话区同时占位）：只保留主操作 */
@container rdw (max-width: 420px){
  .rdw-toolbar-row{gap:4px}
  .rdw-tabs{gap:4px}
  .rdw-toolbar-brand{width:24px;height:24px;font-size:13px}
}
/* 项目流程图：窄容器下降低最小可读尺寸，避免「压成一条细带」式空白；
   横向滚动由包裹层负责，图本身不参与整页横向溢出。 */
@container rdw (max-width: 900px){
  .rdw-fish-svg{min-width:480px!important;min-height:230px!important}
}
@container rdw (max-width: 620px){
  .rdw-fish-svg{min-width:420px!important;min-height:210px!important}
}
/* ═══════════════════════════════════════════════════════════════════════════
 * v4 交互层：命令栏 / 三栏舞台 / 全景抽屉 / 命令面板 / 侧滑面板
 *
 * 设计动因（原设计的三个结构性问题）：
 *   1. 6 个平级页签（总控/项目流程/主智能体/内容/网络/工程）把「高频导航（项目流程）」
 *      与「低频管理（工程/网络）」放在同一层，用户每切一次都要重建心理地图；
 *   2. 管理动作（回连/创建分支/拍板）散落在页签与其他页签之间，
 *      用户必须离开当前上下文才能完成一次决策；
 *   3. 项目流程全景 SVG 占用首屏大块纵向空间，把真正要读的会话区挤到折叠线以下。
 *
 * 解决：单页三栏舞台（导航 | 工作区 | 结果）+ 底部可收起全景抽屉 +
 *      低频管理收进 ⌘K 与右侧侧滑面板——高频常驻、低频按需。
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── 命令栏：品牌 + 面包屑 + 全局搜索 + 状态指示器 ── */
.rdw-cmdbar{flex:none;display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--rdw-organic-strip);border-bottom:1px solid var(--rdw-warm-line);position:relative;z-index:20;min-width:0}
.rdw-cmd-brand{display:flex;align-items:center;gap:7px;flex:0 0 auto}
.rdw-cmd-mark{width:25px;height:25px;display:grid;place-items:center;font-size:13px;border-radius:var(--rdw-r-pebble-sm);background:color-mix(in srgb,var(--rdw-sage-tint) 22%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-sage-tint) 42%,transparent)}
.rdw-cmd-name{font-family:var(--rdw-font-serif);font-size:14px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;color:var(--rdw-organic-ink)}
.rdw-crumbs{display:flex;align-items:center;gap:4px;min-width:0;flex:0 1 auto;font-size:11.5px}
.rdw-crumb{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:var(--rdw-r-pebble-sm);color:var(--rdw-organic-ink-2);white-space:nowrap;border:none;background:none;font:inherit;cursor:pointer;max-width:190px;overflow:hidden;text-overflow:ellipsis;transition:background .18s var(--rdw-ease-organic)}
.rdw-crumb:hover{background:var(--rdw-organic-hover);color:var(--rdw-organic-ink)}
.rdw-crumb.cur{background:color-mix(in srgb,var(--rdw-sage-tint) 17%,transparent);color:var(--rdw-sage);font-weight:600}
.rdw-crumb-sep{color:var(--rdw-organic-ink-3);opacity:.55;font-size:11.5px;flex:0 0 auto}
.rdw-search{flex:0 1 290px;min-width:130px;display:flex;align-items:center;gap:7px;padding:5px 11px;background:var(--rdw-organic-input);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble-sm);color:var(--rdw-organic-ink-3);font-size:12px;cursor:pointer;font:inherit;transition:border-color .18s var(--rdw-ease-organic)}
.rdw-search:hover{border-color:color-mix(in srgb,var(--rdw-sage) 34%,var(--rdw-warm-line));color:var(--rdw-organic-ink-2)}
.rdw-kbd{font-family:var(--rdw-font-mono);font-size:11px;padding:1px 5px;border-radius:5px;background:color-mix(in srgb,var(--rdw-mist) 52%,transparent);color:var(--rdw-organic-ink-3);border:1px solid var(--rdw-warm-line-2);flex:0 0 auto}
.rdw-status{display:flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto}
.rdw-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;border:1px solid transparent;white-space:nowrap;cursor:pointer;font:inherit;transition:transform .16s var(--rdw-ease-organic),box-shadow .16s var(--rdw-ease-organic),background .16s var(--rdw-ease-organic),border-color .16s var(--rdw-ease-organic)}
.rdw-pill:hover{transform:translateY(-1px);box-shadow:var(--rdw-shadow-organic-1)}
.rdw-pill .num{font-family:var(--rdw-font-mono);font-size:11.5px}
/* 顶部状态胶囊：默认用中性描边，只在悬停时浮出语义色。
 * 四个彩色胶囊常驻会让顶栏比中栏还闹，注意力被拽到顶上。
 * 语义只留在左侧图标（::before 变色的地方），文字和数字走中性。 */
.rdw-pill.warn{color:var(--rdw-organic-ink-2);background:transparent;border-color:var(--rdw-warm-line-2)}
.rdw-pill.warn>span:first-child{color:var(--rdw-tan-ink)}
.rdw-pill.warn .num{color:var(--rdw-tan-ink)}
.rdw-pill.warn:hover{background:color-mix(in srgb,var(--rdw-tan) 13%,transparent);border-color:color-mix(in srgb,var(--rdw-tan) 32%,transparent)}
.rdw-pill.blk{color:var(--rdw-organic-ink-2);background:transparent;border-color:var(--rdw-warm-line-2)}
.rdw-pill.blk>span:first-child{color:var(--rdw-st-rejected)}
.rdw-pill.blk .num{color:var(--rdw-st-rejected)}
.rdw-pill.blk:hover{background:color-mix(in srgb,var(--rdw-st-rejected) 11%,transparent);border-color:color-mix(in srgb,var(--rdw-st-rejected) 30%,transparent)}
.rdw-pill.ok{color:var(--rdw-organic-ink-2);background:transparent;border-color:var(--rdw-warm-line-2)}
.rdw-pill.ok>span:first-child{color:var(--rdw-sage)}
.rdw-pill.ok:hover{background:color-mix(in srgb,var(--rdw-sage-tint) 13%,transparent);border-color:color-mix(in srgb,var(--rdw-sage-tint) 30%,transparent)}
.rdw-pill.ghost{color:var(--rdw-organic-ink-2);background:transparent;border-color:var(--rdw-warm-line-2)}
.rdw-pill.ghost:hover{border-color:var(--rdw-warm-line);color:var(--rdw-organic-ink)}
.rdw-avatar-me{width:25px;height:25px;display:grid;place-items:center;font-size:12px;font-weight:700;color:#faf6f1;background:var(--rdw-soil);border-radius:var(--rdw-r-dot);flex:0 0 auto}

/* ── v3.9 主题选择器 ── */
.rdw-theme-btn{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:var(--rdw-r-pebble-sm);border:1px solid var(--rdw-warm-line);background:transparent;color:var(--rdw-organic-ink-2);font:inherit;font-size:11px;cursor:pointer;flex:0 0 auto;transition:background .16s var(--rdw-ease-organic),border-color .16s var(--rdw-ease-organic)}
.rdw-theme-btn:hover{background:var(--rdw-organic-hover);border-color:var(--rdw-warm-line)}
.rdw-theme-mask{position:fixed;inset:0;z-index:1200;background:transparent}
.rdw-theme-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:1201;width:262px;padding:6px;display:flex;flex-direction:column;gap:2px;border-radius:var(--rdw-r-pebble);background:var(--rdw-glass-strong);border:1px solid var(--rdw-warm-line);box-shadow:var(--rdw-shadow-organic-3);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.rdw-theme-pop-title{padding:4px 8px 5px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--rdw-organic-ink-3)}
.rdw-theme-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border:none;border-radius:var(--rdw-r-pebble-sm);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .16s var(--rdw-ease-organic)}
.rdw-theme-item:hover{background:var(--rdw-organic-hover)}
.rdw-theme-item.is-active{background:color-mix(in srgb,var(--rdw-sage-tint) 15%,transparent)}
.rdw-theme-item-name{font-size:12px;font-weight:600;color:var(--rdw-organic-ink);line-height:1.25}
.rdw-theme-item-hint{font-size:11px;color:var(--rdw-organic-ink-3);line-height:1.35}
.rdw-theme-check{margin-left:auto;flex:0 0 auto;font-size:12px;font-weight:700;color:var(--rdw-sage)}
@media (prefers-reduced-motion:reduce){.rdw-theme-item,.rdw-theme-btn{transition:none}}

/* ── 三栏舞台 ──
 * 高度链关键：舞台必须能**收缩**（min-height:0）且撑满父级（height:100%），
 * 否则内部嵌入的宿主会话窗口拿到的可用高度会是 0（正文空白）。
 * 330px 只作为极端窄屏下的可读下限，用 min-height 的 media 查询兜底，
 * 不放在主规则里阻止收缩。 */
.rdw-stage{flex:1 1 auto;height:100%;min-height:0;display:grid;grid-template-columns:minmax(210px,252px) minmax(0,1fr) minmax(200px,244px);gap:10px;padding:10px 12px;overflow:hidden}
/* 三栏分三级：侧栏 = 底板（灰面、无投影），中栏 = 工作台面（纯白、有投影）。
 * 眼睛先落在中栏，再按需移到两侧。 */
.rdw-pane{min-height:0;height:100%;display:flex;flex-direction:column;background:var(--rdw-side-surface);border:1px solid var(--rdw-side-line);border-radius:var(--rdw-r-blob);overflow:hidden}
.rdw-pane.paper{background:var(--rdw-organic-bg);background-image:var(--rdw-organic-grain)}
.rdw-pane-focus{background:var(--rdw-focus-surface);border-color:var(--rdw-focus-line);box-shadow:var(--rdw-focus-shadow)}
.rdw-pane-head{flex:0 0 auto;padding:9px 12px 7px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--rdw-side-line)}
.rdw-pane-title{font-family:var(--rdw-font-serif);font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--rdw-organic-ink)}
.rdw-pane-sub{font-size:11.5px;color:var(--rdw-organic-ink-3);margin-top:1px}
.rdw-pane-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px 10px 10px}
.rdw-pane-foot{flex:0 0 auto;display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--rdw-warm-line-2);background:color-mix(in srgb,var(--rdw-organic-surface) 74%,transparent)}

/* ── 项目目标 / 主支 / 分支导航行 ── */
.rdw-fishhead{padding:9px 11px;border-radius:var(--rdw-r-pebble);margin-bottom:8px;background:color-mix(in srgb,var(--rdw-sage-tint) 13%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-sage-tint) 34%,transparent);border-left:3px solid var(--rdw-sage)}
.rdw-fishhead-label{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--rdw-tan-ink);margin-bottom:3px}
.rdw-fishhead-title{font-family:var(--rdw-font-serif);font-size:12.5px;font-weight:600;line-height:1.35;color:var(--rdw-organic-ink)}
.rdw-fishhead-goal{font-size:11.5px;color:var(--rdw-organic-ink-3);line-height:1.45;margin-top:2px}
.rdw-nav-label{padding:8px 8px 3px;font-size:12px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:var(--rdw-organic-ink-3);display:flex;align-items:center;justify-content:space-between}
.rdw-nav-label .cnt{font-family:var(--rdw-font-mono);font-size:11px;opacity:.7}
.rdw-spine-line{width:1.5px;height:9px;margin-left:15px;background:color-mix(in srgb,var(--rdw-sage-tint) 52%,transparent)}
.rdw-spine-row{position:relative;display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:var(--rdw-r-pebble-sm);cursor:pointer;border:none;background:none;font:inherit;width:100%;text-align:left;transition:background .18s var(--rdw-ease-organic)}
.rdw-spine-row:hover{background:var(--rdw-organic-hover)}
.rdw-spine-row.sel{background:var(--rdw-organic-hover)}
.rdw-spine-row.sel::before{content:'';position:absolute;left:0;top:22%;bottom:22%;width:3px;border-radius:6px;background:var(--rdw-sage)}
.rdw-dot{width:7px;height:7px;flex:0 0 auto;border-radius:var(--rdw-r-dot)}
.rdw-spine-name{flex:1;min-width:0;font-size:11.5px;font-weight:500;color:var(--rdw-organic-ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdw-spine-row.sel .rdw-spine-name{font-weight:600;color:var(--rdw-organic-ink)}
.rdw-spine-id{font-family:var(--rdw-font-mono);font-size:11px;color:var(--rdw-organic-ink-3);flex:0 0 auto}
.rdw-spine-pct{font-family:var(--rdw-font-mono);font-size:11px;color:var(--rdw-organic-ink-3);flex:0 0 auto;min-width:25px;text-align:right}
.rdw-rib-list{display:flex;flex-direction:column;gap:1px;margin:1px 0 4px 12px;padding-left:8px;border-left:1.5px solid var(--rdw-warm-line-2)}
.rdw-rib-row{display:flex;align-items:center;gap:5px;padding:4px 7px;border-radius:var(--rdw-r-pebble-sm);cursor:pointer;border:none;background:none;font:inherit;width:100%;text-align:left;transition:background .18s var(--rdw-ease-organic)}
.rdw-rib-row:hover{background:var(--rdw-organic-hover)}
.rdw-rib-row.sel{background:var(--rdw-organic-hover)}
.rdw-rib-row.sel .rdw-rib-name{font-weight:600;color:var(--rdw-organic-ink)}
.rdw-rib-name{flex:1;min-width:0;font-size:11px;color:var(--rdw-organic-ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdw-rib-tag{flex:0 0 auto;padding:1px 6px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;font-family:var(--rdw-font-mono)}
.rdw-rib-act{opacity:0;flex:0 0 auto;width:18px;height:18px;display:grid;place-items:center;font-size:11.5px;border-radius:5px;border:none;background:none;cursor:pointer;transition:opacity .16s var(--rdw-ease-organic),background .16s var(--rdw-ease-organic)}
.rdw-rib-row:hover .rdw-rib-act{opacity:1}
.rdw-rib-act:hover{background:color-mix(in srgb,var(--rdw-sage-tint) 24%,transparent)}

/* ── 主支行内联操作（v3.9：↑ ↓ × 悬停显现，主支不必只能右键）── */
.rdw-mod-actions{opacity:0;transition:opacity .16s var(--rdw-ease-organic)}
.rdw-organic-row:hover .rdw-mod-actions,.rdw-mod-actions:focus-within{opacity:1}
.rdw-mod-act{width:16px;height:16px;display:grid;place-items:center;font-size:11px;line-height:1;border-radius:4px;border:none;background:none;color:var(--rdw-organic-ink-3);cursor:pointer;transition:background .16s var(--rdw-ease-organic),color .16s var(--rdw-ease-organic)}
.rdw-mod-act:hover:not(:disabled){background:color-mix(in srgb,var(--rdw-sage-tint) 24%,transparent);color:var(--rdw-organic-ink)}
.rdw-mod-act-danger:hover{background:color-mix(in srgb,var(--rdw-danger) 16%,transparent);color:var(--rdw-danger)}
@media (prefers-reduced-motion:reduce){.rdw-mod-actions{transition:none}}

/* 「＋ 主支」新增入口：低干扰胶囊，悬停转为鼠尾草实底 */
.rdw-add-module{flex:0 0 auto;padding:2px 7px;border-radius:var(--rdw-r-pebble-sm);border:1px solid color-mix(in srgb,var(--rdw-sage-tint) 30%,transparent);background:color-mix(in srgb,var(--rdw-sage-tint) 10%,transparent);color:var(--rdw-sage);font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;cursor:pointer;transition:background .16s var(--rdw-ease-organic),color .16s var(--rdw-ease-organic),border-color .16s var(--rdw-ease-organic)}
.rdw-add-module:hover{background:var(--rdw-sage);border-color:var(--rdw-sage);color:var(--rdw-on-brand)}

/* ── 中栏：任务工作区 ── */
.rdw-ws-head{padding:10px 13px 8px;border-bottom:1px solid var(--rdw-warm-line-2)}
.rdw-ws-crumb{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--rdw-organic-ink-3);margin-bottom:3px}
.rdw-ws-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.rdw-ws-title{font-family:var(--rdw-font-serif);font-size:18.5px;font-weight:600;letter-spacing:-.012em;line-height:1.28;color:var(--rdw-organic-ink)}
.rdw-ws-stage-tag{flex:0 0 auto;padding:3px 10px;border-radius:var(--rdw-r-pebble-sm);font-size:12px;font-weight:600;color:var(--rdw-sage);background:color-mix(in srgb,var(--rdw-sage-tint) 18%,transparent);border:1px solid color-mix(in srgb,var(--rdw-sage-tint) 38%,transparent)}
.rdw-agent-bar{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;border-radius:var(--rdw-r-pebble);margin:8px 13px 0;background:color-mix(in srgb,var(--rdw-mist) 42%,var(--rdw-organic-surface));border:1px solid var(--rdw-warm-line-2);border-left:3px solid var(--rdw-sage)}
.rdw-agent-main{flex:1;min-width:0}
.rdw-agent-name{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;margin-bottom:2px;color:var(--rdw-organic-ink)}
.rdw-agent-ctx{padding:1px 7px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;color:var(--rdw-teal-ink);background:color-mix(in srgb,var(--rdw-teal) 16%,transparent)}
.rdw-agent-brief{font-size:11px;color:var(--rdw-organic-ink-2);line-height:1.6}
.rdw-memdock{display:flex;align-items:center;gap:6px;margin:7px 13px 0;padding:5px 10px;border-radius:var(--rdw-r-pebble-sm);font-size:11.5px;color:var(--rdw-organic-ink-3);background:color-mix(in srgb,var(--rdw-teal) 8%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-teal) 24%,transparent)}
.rdw-memdock strong{color:var(--rdw-teal-ink);font-weight:600}
.rdw-milestones{display:flex;gap:7px;margin:7px 13px 0;flex-wrap:wrap}
.rdw-ms-card{flex:1 1 180px;min-width:0;padding:7px 10px;border-radius:var(--rdw-r-pebble-sm);background:color-mix(in srgb,var(--rdw-mist) 34%,var(--rdw-organic-surface));border:1px solid var(--rdw-warm-line-2)}
.rdw-ms-card.blk{background:color-mix(in srgb,var(--rdw-tan) 11%,var(--rdw-organic-surface));border-color:color-mix(in srgb,var(--rdw-tan) 30%,transparent)}
.rdw-ms-head{font-size:11.5px;font-weight:700;letter-spacing:.2px;margin-bottom:3px;display:flex;align-items:center;gap:4px}
.rdw-ms-head.next{color:var(--rdw-sage)}
.rdw-ms-head.stop{color:var(--rdw-tan-ink)}
.rdw-ms-item{font-size:11.5px;color:var(--rdw-organic-ink-2);line-height:1.5;padding-left:9px;position:relative;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rdw-ms-item::before{content:'·';position:absolute;left:2px}

/* ── 会话区与输入器 ── */
.rdw-chatwrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;margin:8px 13px 11px;border-radius:var(--rdw-r-blob);border:1px solid var(--rdw-warm-line);overflow:hidden;background:var(--rdw-organic-surface);box-shadow:var(--rdw-shadow-organic-1)}
.rdw-chatwrap-head{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:6px 12px;background:color-mix(in srgb,var(--rdw-mist) 40%,var(--rdw-organic-surface));border-bottom:1px solid var(--rdw-warm-line-2)}
.rdw-chatwrap-title{font-family:var(--rdw-font-serif);font-size:12px;font-weight:600;color:var(--rdw-organic-ink)}
.rdw-chatwrap-state{padding:1px 7px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;color:var(--rdw-teal-ink);background:color-mix(in srgb,var(--rdw-teal) 16%,transparent)}
.rdw-chatwrap-hint{margin-left:auto;font-size:11px;color:var(--rdw-organic-ink-3)}
/* ── 对话消息流：与 DeepSeek Harness 一致 ──
 * Harness 的对话是「单列消息流 + 底部 composer」：
 *   - 没有气泡尾巴，没有左右分栏，没有双方不同底色；
 *   - 只有「角色标签 + 正文」两段结构，正文铺满可用宽度；
 *   - 代码块用深色等宽块，行内代码用浅灰底；
 *   - 系统提示更淡更小，与真实消息区分。
 * 这样工作台内嵌的会话读起来和主 Harness 窗口完全一致。 */
.rdw-chat-stream{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:14px}
.rdw-msg{max-width:100%;font-size:13px;line-height:1.62}
.rdw-msg-role{font-size:12px;font-weight:600;display:block;margin-bottom:3px;color:var(--rdw-organic-ink-3)}
.rdw-msg.user .rdw-msg-role{color:var(--rdw-organic-ink-3)}
.rdw-msg.ai .rdw-msg-role{color:var(--rdw-organic-ink-3)}
.rdw-msg.sys .rdw-msg-role{color:var(--rdw-organic-ink-3)}
/* 用户与智能体不再用不同底色气泡——Harness 两者同为正文块 */
.rdw-msg.user,.rdw-msg.ai{padding:0;background:none;border:none;align-self:stretch}
.rdw-msg .rdw-msg-body,.rdw-msg > div{color:var(--rdw-organic-ink)}
.rdw-msg.sys{max-width:100%;padding:0;background:none;border:none;font-size:12px;color:var(--rdw-organic-ink-3)}
.rdw-msg.sys .sub{font-size:11.5px;color:var(--rdw-organic-ink-3);margin-top:2px}
/* Harness 风格的行内代码与代码块 */
.rdw-msg code,.rdw-msg .inline-code{
  font-family:var(--rdw-font-mono);font-size:12px;
  padding:1px 5px;border-radius:4px;
  background:var(--rdw-fill-tert);
}
.rdw-msg pre,.rdw-msg .code-block{
  margin:7px 0 0;padding:10px 12px;border-radius:var(--rdw-r-pebble);
  background:#1c1c1e;color:#f2f2f7;
  font-family:var(--rdw-font-mono);font-size:12px;line-height:1.55;
  overflow-x:auto;
}

/* ── 参数浮层 ── */
.rdw-popover{position:absolute;bottom:calc(100% + 6px);z-index:60;min-width:230px;background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble);box-shadow:var(--rdw-shadow-organic-3);padding:4px 0;display:flex;flex-direction:column}
.rdw-popover.left{left:0}
.rdw-popover.right{right:0}
.rdw-popover-head{display:flex;align-items:center;justify-content:space-between;padding:5px 11px 6px;font-size:11.5px;font-weight:700;color:var(--rdw-organic-ink-3);border-bottom:1px solid var(--rdw-warm-line-2);margin-bottom:2px}
.rdw-popover-head .x{cursor:pointer;font-size:11px;opacity:.6;border:none;background:none;color:inherit}
.rdw-popover-head .x:hover{opacity:1}
.rdw-pop-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 11px;cursor:pointer;font-size:11px;border:none;background:none;width:100%;text-align:left;font:inherit;transition:background .14s var(--rdw-ease-organic)}
.rdw-pop-item:hover{background:var(--rdw-organic-hover)}
.rdw-pop-item.on{background:color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)}
.rdw-pop-item-main{display:flex;flex-direction:column;gap:1px;min-width:0}
.rdw-pop-item-name{font-weight:500;color:var(--rdw-organic-ink)}
.rdw-pop-item.on .rdw-pop-item-name{font-weight:600}
.rdw-pop-item-note{font-size:11px;color:var(--rdw-organic-ink-3)}
.rdw-pop-item .tick{font-size:11px;color:var(--rdw-sage);font-weight:700;flex:0 0 auto}

/* ── 右栏：结果面板 ── */
.rdw-sec-label{padding:2px 6px 4px;font-size:11.5px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:var(--rdw-organic-ink-3);display:flex;align-items:center;justify-content:space-between}
.rdw-art-card{padding:7px 10px;border-radius:var(--rdw-r-pebble-sm);background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line-2);margin-bottom:5px;cursor:pointer;box-shadow:var(--rdw-shadow-organic-1);transition:box-shadow .2s var(--rdw-ease-organic),border-color .2s var(--rdw-ease-organic)}
.rdw-art-card:hover{box-shadow:var(--rdw-shadow-organic-2);border-color:color-mix(in srgb,var(--rdw-sage-tint) 30%,var(--rdw-warm-line-2))}
.rdw-art-top{display:flex;align-items:center;gap:6px;min-width:0}
.rdw-art-ico{font-family:var(--rdw-font-mono);font-size:11.5px;font-weight:700;color:var(--rdw-tan-ink);flex:0 0 auto}
.rdw-art-name{font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--rdw-organic-ink)}
.rdw-art-desc{font-size:11px;color:var(--rdw-organic-ink-3);padding-left:22px;margin-top:1px}
.rdw-attn-card{padding:7px 10px;border-radius:var(--rdw-r-pebble-sm);background:color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-tan) 32%,transparent)}
.rdw-attn-head{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--rdw-tan-ink);margin-bottom:4px}
.rdw-attn-item{display:flex;gap:5px;align-items:flex-start;font-size:11px;line-height:1.5;margin-bottom:3px}
.rdw-attn-badge{flex:0 0 auto;padding:0 5px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;color:var(--rdw-tan-ink);background:color-mix(in srgb,var(--rdw-tan) 22%,transparent)}
.rdw-attn-badge.stale{color:var(--rdw-st-rejected);background:color-mix(in srgb,var(--rdw-st-rejected) 13%,transparent)}
.rdw-attn-text{flex:1;min-width:0;color:var(--rdw-organic-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rdw-merge-block{margin-top:auto;padding-top:9px;border-top:1px solid var(--rdw-warm-line-2)}
.rdw-merge-state{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:var(--rdw-r-pebble-sm);font-size:11.5px;font-weight:600;color:var(--rdw-tan-ink);background:color-mix(in srgb,var(--rdw-tan) 20%,transparent);border:1px solid color-mix(in srgb,var(--rdw-tan) 40%,transparent)}
.rdw-merge-state .d{width:5px;height:5px;border-radius:var(--rdw-r-dot);background:var(--rdw-tan-ink)}
.rdw-merge-hint{font-size:11.5px;color:var(--rdw-organic-ink-3);line-height:1.55;margin:5px 0 7px}

/* ── 底部全景抽屉 ── */
.rdw-drawer{flex:none;background:var(--rdw-organic-bg);background-image:var(--rdw-organic-grain);border-top:1px solid var(--rdw-warm-line);overflow:hidden}
.rdw-drawer-bar{display:flex;align-items:center;gap:8px;padding:7px 16px;cursor:pointer;border:none;background:none;width:100%;font:inherit;text-align:left;transition:background .16s var(--rdw-ease-organic)}
.rdw-drawer-bar:hover{background:var(--rdw-organic-hover)}
.rdw-drawer-caret{font-size:11px;color:var(--rdw-organic-ink-3);transition:transform .24s var(--rdw-ease-organic);display:inline-block;flex:0 0 auto}
.rdw-drawer.open .rdw-drawer-caret{transform:rotate(90deg)}
.rdw-drawer-title{font-family:var(--rdw-font-serif);font-size:13px;font-weight:600;color:var(--rdw-organic-ink)}
.rdw-drawer-meta{font-size:11px;color:var(--rdw-organic-ink-3);font-family:var(--rdw-font-mono)}
.rdw-drawer-acts{margin-left:auto;display:flex;gap:6px}
.rdw-drawer-content{display:none;padding:0 16px 12px;max-height:34vh;overflow-y:auto;overflow-x:hidden}
.rdw-drawer.open .rdw-drawer-content{display:block}
.rdw-panorama{padding:8px;border-radius:var(--rdw-r-pebble);background:color-mix(in srgb,var(--rdw-mist) 22%,var(--rdw-organic-surface));border:1px solid var(--rdw-warm-line-2);margin-bottom:9px;display:flex;justify-content:center}
.rdw-panorama svg{width:100%;max-width:1180px;height:auto;display:block}

/* ── 命令面板 ── */
.rdw-palette-mask{position:fixed;inset:0;background:rgb(35 31 25/32%);backdrop-filter:blur(2px);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding-top:13vh}
.rdw-palette{width:min(560px,calc(100vw - 40px));background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-blob);box-shadow:var(--rdw-shadow-organic-3);overflow:hidden}
.rdw-palette-input{width:100%;padding:13px 16px;border:none;outline:none;font-size:13.5px;background:none;border-bottom:1px solid var(--rdw-warm-line-2);color:var(--rdw-organic-ink);font-family:inherit}
.rdw-palette-input::placeholder{color:var(--rdw-organic-ink-3)}
.rdw-palette-list{max-height:46vh;overflow-y:auto;padding:5px}
.rdw-pal-section{padding:7px 11px 3px;font-size:11px;font-weight:700;color:var(--rdw-organic-ink-3);text-transform:uppercase;letter-spacing:.3px}
.rdw-pal-item{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:var(--rdw-r-pebble-sm);cursor:pointer;font-size:12px;border:none;background:none;width:100%;text-align:left;font:inherit;color:var(--rdw-organic-ink)}
.rdw-pal-item:hover,.rdw-pal-item.on{background:var(--rdw-organic-hover)}
.rdw-pal-ico{width:20px;text-align:center;font-size:12px;flex:0 0 auto}
.rdw-pal-main{flex:1;min-width:0}
.rdw-pal-name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdw-pal-desc{font-size:11.5px;color:var(--rdw-organic-ink-3)}
.rdw-palette-foot{padding:7px 14px;border-top:1px solid var(--rdw-warm-line-2);display:flex;gap:12px;font-size:11px;color:var(--rdw-organic-ink-3)}

/* ── 侧滑面板（低频管理收进这里） ── */
.rdw-slide-mask{position:fixed;inset:0;background:rgb(35 31 25/24%);z-index:140}
.rdw-slide{position:fixed;top:0;right:0;bottom:0;width:min(660px,92vw);background:var(--rdw-organic-bg);background-image:var(--rdw-organic-grain);border-left:1px solid var(--rdw-warm-line);box-shadow:var(--rdw-shadow-organic-3);z-index:150;display:flex;flex-direction:column}
.rdw-slide-head{flex:0 0 auto;display:flex;align-items:center;gap:9px;padding:11px 15px;border-bottom:1px solid var(--rdw-warm-line);background:color-mix(in srgb,var(--rdw-organic-surface) 74%,transparent);flex-wrap:wrap}
.rdw-slide-title{font-family:var(--rdw-font-serif);font-size:16px;font-weight:600;color:var(--rdw-organic-ink)}
.rdw-slide-tabs{display:flex;gap:4px;margin-left:auto;align-items:center;flex-wrap:wrap}
.rdw-slide-tab{padding:4px 11px;border-radius:var(--rdw-r-pebble-sm);font-size:11.5px;color:var(--rdw-organic-ink-2);border:none;background:none;font:inherit;cursor:pointer;transition:background .16s var(--rdw-ease-organic),color .16s var(--rdw-ease-organic)}
.rdw-slide-tab:hover{background:var(--rdw-organic-hover)}
.rdw-slide-tab.on{background:color-mix(in srgb,var(--rdw-sage-tint) 18%,transparent);color:var(--rdw-sage);font-weight:600}
.rdw-slide-close{width:24px;height:24px;display:grid;place-items:center;border-radius:var(--rdw-r-pebble-sm);font-size:13px;color:var(--rdw-organic-ink-3);border:none;background:none;cursor:pointer}
.rdw-slide-close:hover{background:var(--rdw-organic-hover);color:var(--rdw-organic-ink)}
.rdw-slide-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:13px 15px 22px}
.rdw-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px}
.rdw-stat-card{padding:10px 12px;border-radius:var(--rdw-r-pebble);background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line-2);box-shadow:var(--rdw-shadow-organic-1)}
.rdw-stat-num{font-family:var(--rdw-font-serif);font-size:21px;font-weight:600;line-height:1.1;color:var(--rdw-organic-ink)}
.rdw-stat-lbl{font-size:11.5px;color:var(--rdw-organic-ink-3);margin-top:2px}

/* ── 时间轴（主智能体） ── */
.rdw-tl{position:relative;padding-left:20px}
.rdw-tl::before{content:'';position:absolute;left:6px;top:4px;bottom:4px;width:1.5px;background:var(--rdw-warm-line-2)}
.rdw-tl-item{position:relative;margin-bottom:11px}
.rdw-tl-item::before{content:'';position:absolute;left:-17px;top:5px;width:8px;height:8px;border-radius:var(--rdw-r-dot);background:var(--rdw-sage);border:2px solid var(--rdw-organic-surface)}
.rdw-tl-item.rej::before{background:var(--rdw-st-rejected)}
.rdw-tl-item.idea::before{background:var(--rdw-tan)}
.rdw-tl-time{font-family:var(--rdw-font-mono);font-size:11px;color:var(--rdw-organic-ink-3)}
.rdw-tl-act{display:inline-flex;padding:1px 6px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;margin:2px 0}
.rdw-tl-body{font-size:11.5px;color:var(--rdw-organic-ink-2);line-height:1.6}

/* ── 响应式：窄容器降级 ── */
@container rdw (max-width:1180px){
  .rdw-stage{grid-template-columns:minmax(196px,226px) minmax(0,1fr) minmax(186px,216px)}
  .rdw-crumbs{display:none}
  .rdw-search{flex:0 1 200px}
}
@container rdw (max-width:980px){
  .rdw-stage{grid-template-columns:minmax(180px,206px) minmax(0,1fr);grid-template-rows:1fr}
  .rdw-pane.right{display:none}
  .rdw-cmd-name{display:none}
}
@container rdw (max-width:740px){
  .rdw-stage{grid-template-columns:minmax(0,1fr);grid-template-rows:1fr}
  .rdw-pane.left{display:none}
  .rdw-search{display:none}
  .rdw-drawer-meta{display:none}
}

@media (prefers-reduced-motion:reduce){
  .rdw-shell *,.rdw-shell *::before,.rdw-shell *::after{transition-duration:.01ms!important;animation-duration:.01ms!important}
}

/* ── v3.5 交互系统 2.0：右键菜单 / 速览卡 / 幻影分支 / 回收站 ── */
.rdw-ctxmask{position:fixed;inset:0;z-index:400}
.rdw-ctxmenu{position:fixed;z-index:401;min-width:220px;max-width:300px;padding:5px;background:var(--rdw-glass);backdrop-filter:blur(18px) saturate(1.5);-webkit-backdrop-filter:blur(18px) saturate(1.5);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble);box-shadow:0 8px 28px rgba(35,31,25,.16),0 2px 6px rgba(35,31,25,.08);animation:rdw-ctx-in .12s var(--rdw-ease-organic)}
@keyframes rdw-ctx-in{from{opacity:0;transform:scale(.96) translateY(-3px)}to{opacity:1;transform:none}}
.rdw-ctx-item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 10px;border:none;background:none;border-radius:var(--rdw-r-pebble-sm);font:inherit;font-size:12px;color:var(--rdw-organic-ink);cursor:pointer;text-align:left;transition:background .1s}
.rdw-ctx-item:hover:not(:disabled),.rdw-ctx-item.on{background:var(--rdw-organic-hover)}
.rdw-ctx-item:disabled{color:var(--rdw-organic-ink-3);cursor:default;opacity:.62}
.rdw-ctx-ico{width:17px;text-align:center;flex:0 0 auto;font-size:12px}
.rdw-ctx-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rdw-ctx-kbd{font-family:var(--rdw-font-mono);font-size:11px;color:var(--rdw-organic-ink-3);flex:0 0 auto}
.rdw-ctx-sep{height:1px;margin:4px 8px;background:var(--rdw-warm-line-2)}
.rdw-ctx-sub{font-size:11px;color:var(--rdw-organic-ink-3);padding:2px 10px 4px 35px;line-height:1.4}
.rdw-hovercard{position:fixed;z-index:390;width:264px;padding:11px 13px;background:var(--rdw-glass);backdrop-filter:blur(18px) saturate(1.5);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble);box-shadow:0 10px 30px rgba(35,31,25,.14);animation:rdw-ctx-in .14s var(--rdw-ease-organic);pointer-events:auto}
.rdw-hovercard-title{font-size:12.5px;font-weight:600;color:var(--rdw-organic-ink);display:flex;align-items:center;gap:6px;margin-bottom:3px}
.rdw-hovercard-meta{font-size:11px;color:var(--rdw-organic-ink-3);margin-bottom:6px}
.rdw-hovercard-brief{font-size:11.5px;color:var(--rdw-organic-ink-2);line-height:1.5;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rdw-hovercard-acts{display:flex;gap:5px}
.rdw-hovercard-acts button{flex:1;padding:4px 0;border-radius:var(--rdw-r-pebble-sm);border:1px solid var(--rdw-warm-line);background:var(--rdw-organic-input);color:var(--rdw-organic-ink-2);font-size:11px;cursor:pointer;font:inherit}
.rdw-hovercard-acts button:hover{background:var(--rdw-organic-hover)}
.rdw-hovercard-acts button.primary{background:var(--rdw-soil);color:#faf6f1;border:none}
.rdw-phantom{opacity:.42;pointer-events:none}
.rdw-phantom-hit{pointer-events:all;cursor:copy}
.rdw-inline-sprout{position:fixed;z-index:395;padding:9px 11px;background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble);box-shadow:0 8px 24px rgba(35,31,25,.14);animation:rdw-ctx-in .13s var(--rdw-ease-organic)}
.rdw-inline-sprout input{width:190px;padding:5px 8px;border:1px solid var(--rdw-warm-line);border-radius:var(--rdw-r-pebble-sm);background:var(--rdw-organic-input);color:var(--rdw-organic-ink);font:inherit;font-size:12px;outline:none}
.rdw-inline-sprout input:focus{border-color:var(--rdw-sys-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--rdw-sys-blue) 18%,transparent)}
.rdw-inline-sprout .row{display:flex;gap:6px;margin-top:7px}
.rdw-inline-sprout .hint{font-size:11px;color:var(--rdw-organic-ink-3);margin-top:5px}
.rdw-inline-sprout button{padding:4px 10px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;cursor:pointer;font:inherit;border:1px solid var(--rdw-warm-line);background:var(--rdw-organic-input);color:var(--rdw-organic-ink-2)}
.rdw-inline-sprout button.solid{background:var(--rdw-soil);color:#faf6f1;border:none}
.rdw-recycle-fab{position:fixed;right:18px;bottom:44px;z-index:380;width:44px;height:44px;border-radius:50%;border:1px solid var(--rdw-warm-line);background:var(--rdw-glass);backdrop-filter:blur(14px);box-shadow:0 4px 14px rgba(35,31,25,.12);cursor:pointer;font-size:17px;display:grid;place-items:center;transition:transform .15s var(--rdw-ease-organic)}
.rdw-recycle-fab:hover{transform:scale(1.08)}
.rdw-recycle-fab .n{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--rdw-st-rejected);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;font-family:var(--rdw-font-mono)}
.rdw-undobtn{position:relative}
.rdw-undobtn .cnt{position:absolute;top:-3px;right:-3px;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--rdw-sys-blue);color:#fff;font-size:11px;display:grid;place-items:center}
.rdw-msg-anchor{display:inline-flex;align-items:center;gap:3px;padding:0 6px;border-radius:var(--rdw-r-pebble-sm);font-size:11px;font-weight:600;background:color-mix(in srgb,var(--rdw-sage-tint) 20%,transparent);color:var(--rdw-sage);border:1px solid color-mix(in srgb,var(--rdw-sage) 34%,transparent);cursor:pointer;font-family:var(--rdw-font-mono)}
.rdw-ribs-table tr{position:relative}
.rdw-ribs-table tr:hover{background:var(--rdw-organic-hover)}
.rdw-fishbone-stage:focus{outline:none}
.rdw-kbd-focus{outline:2px solid var(--rdw-sys-blue);outline-offset:1px;border-radius:var(--rdw-r-pebble-sm)}

/* ── v3.7 分支会话与推理轨迹视图（对标 DSH 原生三图设计） ── */
.rdw-chat-tabs-bar{display:flex;align-items:center;justify-content:space-between;padding:0 4px;border-bottom:1px solid var(--rdw-warm-line-2);margin-bottom:6px;flex:0 0 auto}
.rdw-chat-tabs{display:flex;align-items:center;gap:18px}
.rdw-chat-tab{padding:8px 2px;background:none;border:none;font:inherit;font-size:12.5px;color:var(--rdw-organic-ink-3);cursor:pointer;position:relative;transition:color .12s}
.rdw-chat-tab.active{color:var(--rdw-organic-ink);font-weight:600}
.rdw-chat-tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--rdw-soil);border-radius:1px}
.rdw-chat-stream{flex:1 1 auto;height:0;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:6px 4px 12px}
.rdw-chat-context-card{padding:10px 12px;border-radius:var(--rdw-r-pebble);background:color-mix(in srgb,var(--rdw-sage-tint) 14%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-sage) 28%,transparent);display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.55}
.rdw-chat-bubble{display:flex;flex-direction:column;gap:3px;max-width:88%}
.rdw-chat-bubble.user{align-self:flex-end}
.rdw-chat-bubble.agent{align-self:flex-start}
.rdw-chat-bubble-header{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--rdw-organic-ink-3);margin-bottom:2px}
.rdw-chat-bubble-body{padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.rdw-chat-bubble.user .rdw-chat-bubble-body{background:color-mix(in srgb,var(--rdw-accent) 12%,var(--rdw-organic-surface));border:1px solid color-mix(in srgb,var(--rdw-accent) 26%,transparent);color:var(--rdw-organic-ink);border-bottom-right-radius:2px}
.rdw-chat-bubble.agent .rdw-chat-bubble-body{background:var(--rdw-fill-quat);border:1px solid var(--rdw-warm-line);color:var(--rdw-organic-ink);border-bottom-left-radius:2px}
.rdw-chat-empty{flex:1 1 auto;height:0;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px}
.rdw-chat-empty-title{font-size:18px;font-weight:600;color:var(--rdw-organic-ink);display:flex;align-items:center;gap:8px}
.rdw-chat-empty-meta{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--rdw-organic-ink-3)}
.rdw-chat-composer{flex:0 0 auto;padding:8px 12px;background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line);border-radius:16px;box-shadow:0 2px 8px rgba(35,31,25,.04);display:flex;flex-direction:column;gap:6px}
.rdw-chat-composer textarea{width:100%;border:none;outline:none;background:transparent;font:inherit;font-size:12px;color:var(--rdw-organic-ink);resize:none;min-height:38px;max-height:120px;line-height:1.5}
.rdw-chat-composer-bar{display:flex;align-items:center;justify-content:space-between;padding-top:2px}
.rdw-chat-composer-pills{display:flex;align-items:center;gap:6px}
.rdw-chat-composer-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:var(--rdw-organic-hover);border:1px solid var(--rdw-warm-line-2);font-size:11px;color:var(--rdw-organic-ink-2);cursor:pointer}
.rdw-chat-composer-send{width:26px;height:26px;border-radius:50%;background:#007aff;color:#fff;border:none;cursor:pointer;display:grid;place-items:center;font-size:13px;font-weight:700;transition:opacity .15s}
.rdw-chat-composer-send:disabled{opacity:.4;cursor:default}
.rdw-trace-stream{flex:1 1 auto;height:0;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:6px 4px 12px}
.rdw-trace-card{padding:10px 13px;border-radius:var(--rdw-r-pebble);background:var(--rdw-organic-surface);border:1px solid var(--rdw-warm-line-2);display:flex;flex-direction:column;gap:6px}
.rdw-trace-card-title{font-size:12px;font-weight:700;color:var(--rdw-organic-ink);display:flex;align-items:center;gap:6px}
.rdw-trace-card-body{font-size:11.5px;color:var(--rdw-organic-ink-2);line-height:1.65;white-space:pre-wrap;word-break:break-word}
`

/** 首用/无项目引导文案（业务页自己负责，不使用宿主通用引导）。 */
export const WELCOME_COPY = {
  title: '把研究项目画成一条项目流程',
  subtitle: '这条项目流程是你的研究主线：项目目标是研究目标，主支是研究阶段，分支是从任意位置长出的探索智能体。',
  points: [
    ['📋 项目目标', '研究目标与当前阶段：你要回答的那个问题就写在这里。'],
    ['🌿 主支', '主任务沿主支推进，默认只有一条主线，不会事先分叉。'],
    ['🌱 分支', '只有当某个子问题真的复杂到值得独立探索时，才由你手动分出一根。'],
    ['↩ 回连', '分支的成果你满意后一键接回主支，主线继续往前走。'],
  ],
  stepLoad: '已经有一个研究项目？填入项目绝对路径后点「加载」。',
  stepExample: '还没有项目？先加载示例项目，看整条主线是怎么组织的。',
  stepCreate: '要从零开始？点「新建项目」建一个研究骨架。',
  stepChat: '需要 AI 帮忙时再打开对话，会话会关联到这个工作台；不打开也不影响业务页使用。',
  chatIdleTitle: '还没有关联的对话',
  chatIdleBody: '这里放的是这个工作台的 AI 会话。需要时再开始，业务数据不会因此中断。',
  chatStart: '开始对话',
  chatStartHint: '会在当前工作区新建一个会话，并关联到这个工作台。',
  chatUnavailable: '宿主没有提供会话能力，业务页仍可正常使用。',
  chatInlineHint: '会话已嵌入中栏工作区（项目正文区）。本侧栏仅作分屏对照入口，可收起。',
  chatTitle: 'AI 对话',
  chatOpen: '打开对话',
  chatClose: '收起对话',
}

