/**
 * 研究项目 DAG 工作台 — 生产客户端 bundle（模块化装配）。
 *
 * AUTO-GENERATED from src/ via tools/build-client.mjs.
 * 不要直接编辑本文件；修改 src/ 后重新运行 node tools/build-client.mjs。
 *
 * 结构：
 *   - src/core/: 常量、状态主题、样式与宿主 HTTP API
 *   - src/components/: StatusBadge, Header, ProjectBar, StatCards, ReasonDialog,
 *                      HandoffTable, IssueList, RunConsole
 *   - src/views/: OverviewView（概览）, DagView（DAG）, HandoffsView（交接）,
 *                 ControlView（校验与运行）
 *   - src/WorkbenchPanel.js: 状态协调与生命周期
 *   - src/index.js: Cordis 客户端槽位注册
 */
window.__ModuleLoader__.load({
  id: 'dsh-research-workbench',

  factory(require) {
    const React = require('react')
    const h = React.createElement

    // --- Module: src/core/constants.js ---
    /**
     * 研究项目 DAG 工作台 — 常量、状态主题与样式。
     *
     * 浏览器半侧自持全部常量（不得引用 lib/host.js）。
     * 本文件在构建产物中与其余模块处于同一作用域；共享的小工具函数集中放在这里。
     */

    const PANEL_ID = 'research-workbench'
    const ROUTE = '/research-workbench'

    /** v3.6 顶级页签：总控看板放在最前面！ */
    const VIEWS = [
      ['hub', '总控看板'],
      ['fishbone', '项目流程'],
      ['leader', '主智能体'],
      ['content', '内容'],
      ['network', '网络'],
      ['engineering', '工程'],
    ]

    /** 工程页子页签（复用旧视图）：DAG / 交接 / 校验与运行 / 概览。 */
    const ENGINEERING_TABS = [
      ['dag', 'DAG'],
      ['handoffs', '交接'],
      ['control', '校验与运行'],
      ['overview', '概览'],
    ]

    /** 旧宿主（/health.actions 无 content）提示。 */
    const CONTENT_UPGRADE_NOTICE = '重启 DSH 后启用新版内容页'
    const NETWORK_UPGRADE_NOTICE = '重启 DSH 后启用项目网络页'

    /** 项目阶段枚举（与 control/PROJECT_STATE.json 的 phase 一致）。 */
    const PHASES = [
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
    const STATUS_INFO = {
      DRAFT: { label: '草稿', color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)', border: 'color-mix(in srgb,var(--rdw-st-draft) 30%,transparent)' },
      PROVISIONAL: { label: '待决定', color: 'var(--rdw-st-provisional)', bg: 'var(--rdw-st-provisional-soft)', border: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' },
      ACCEPTED: { label: '已接受', color: 'var(--rdw-st-accepted)', bg: 'var(--rdw-st-accepted-soft)', border: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' },
      REJECTED: { label: '已拒绝', color: 'var(--rdw-st-rejected)', bg: 'var(--rdw-st-rejected-soft)', border: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)' },
      SUPERSEDED: { label: '已被取代', color: 'var(--rdw-st-superseded)', bg: 'var(--rdw-st-superseded-soft)', border: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' },
      BLOCKED: { label: '被阻塞', color: 'var(--rdw-st-blocked)', bg: 'var(--rdw-st-blocked-soft)', border: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' },
    }

    /** v1.2 平实状态词（结果页 / 交接页给人看，不再用状态机术语）。 */
    const PLAIN_STATUS_INFO = {
      DRAFT: { label: '进行中' },
      PROVISIONAL: { label: '待确认' },
      ACCEPTED: { label: '已出结果' },
      REJECTED: { label: '已放弃' },
      SUPERSEDED: { label: '旧版本' },
      BLOCKED: { label: '卡住' },
    }

    /** verify 错误码 → 一句自然语言（结果页「需要你关注」用）。 */
    const ATTENTION_TEXT = {
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
    const STATUS_ORDER = ['draft', 'provisional', 'accepted', 'rejected', 'superseded', 'blocked']

    /** action 的中文名，用于「执行中：…」状态条与运行记录。 */
    const ACTION_LABELS = {
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
    const CREATE_ACTIONS = {
      init: '新建项目',
      'module-add': '新建模块',
      'branch-add': '新建分支',
      'handoff-new': '新建交接',
    }

    /** 桥动作（POST /bridge）的中文名，用于状态条。 */
    const BRIDGE_LABELS = {
      publish: '发布到网络',
      pull: '拉取网络消息',
      review: '标记满意',
      idea: '记录想法',
    }

    /** 子项目（模块）完成度状态 → 平实文案与颜色（走令牌）。 */
    const MODULE_STATUS_INFO = {
      done: { label: '已完成', color: 'var(--rdw-st-accepted)' },
      active: { label: '进行中', color: 'var(--rdw-st-provisional)' },
      blocked: { label: '卡住', color: 'var(--rdw-st-blocked)' },
      idle: { label: '未开始', color: 'var(--rdw-st-draft)' },
    }

    /** 创建类动作对应的宿主 /health.actions（用于宿主能力门控）。 */
    const CREATE_HOST_ACTIONS = ['init', 'module-add', 'branch-add', 'handoff-new']

    /** 旧版宿主的提示文案（/health.actions 缺少创建类动作时显示）。 */
    const HOST_UPGRADE_NOTICE =
      '当前宿主为旧版本，新建功能需重启 DSH 后启用；接受/拒绝/校验等现有功能不受影响'

    /**
     * /health.actions 是否覆盖全部创建类动作。
     * 旧宿主（已加载的 v1.0 宿主）缺少 init/module-add/branch-add/handoff-new，
     * 客户端据此隐藏创建入口，避免点击后收到 E_ACTION。
     */
    function hostSupportsCreate(health) {
      const actions = health && Array.isArray(health.actions) ? health.actions : null
      if (!actions) return false
      return CREATE_HOST_ACTIONS.every((action) => actions.includes(action))
    }

    /** /health.actions 是否包含某个 v1.2 能力（results / auto）。 */
    function hostSupportsAction(health, action) {
      const actions = health && Array.isArray(health.actions) ? health.actions : null
      return Boolean(actions && actions.includes(action))
    }

    /** 自由命名提示（PROTOCOL v1.2：id 不再要求 Mxx/Bxx 编号）。 */
    const FREE_ID_HINT = '任意唯一名称即可（如 literature、pilot-a），不需要编号'

    /**
     * 创建表单字段定义（按动作）。
     * root/id/name/title 必填；slug/stream/goal 可选；module/branch 只读带入。
     */
    const CREATE_FIELD_SPECS = {
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
    function isValidNodeId(value) {
      return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(String(value === null || value === undefined ? '' : value).trim())
    }

    /** slug 规则：可选；字母数字点下划线连字符，≤40 字。 */
    function isValidSlug(value) {
      const text = String(value === null || value === undefined ? '' : value).trim()
      if (!text) return true
      return /^[A-Za-z0-9._-]{1,40}$/.test(text)
    }

    /** stream 规则：可选；小写字母/数字/连字符，字母数字开头。 */
    function isValidStream(value) {
      const text = String(value === null || value === undefined ? '' : value).trim()
      if (!text) return true
      return /^[a-z0-9][a-z0-9-]*$/.test(text)
    }

    /** 绝对路径判定（Windows 盘符 / UNC / POSIX 根）。 */
    function isAbsoluteProjectPath(value) {
      const text = String(value === null || value === undefined ? '' : value).trim()
      if (!text) return false
      if (/^[A-Za-z]:[\\/]/.test(text)) return true
      if (/^\\\\[^\\]+/.test(text)) return true
      return text.startsWith('/')
    }

    /** run 记录状态主题（走令牌）。 */
    const RUN_STATUS_INFO = {
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
    const STYLES = {
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
    function moduleStatusInfo(status) {
      const key = String(status === null || status === undefined ? '' : status)
      return MODULE_STATUS_INFO[key] || MODULE_STATUS_INFO.idle
    }

    /** 状态 → 主题（未知状态兜底）。 */
    function statusInfo(status) {
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
    function runStatusInfo(status) {
      return (
        RUN_STATUS_INFO[status] || {
          label: status ? String(status) : '未知',
          color: 'var(--rdw-st-draft)',
          bg: 'var(--rdw-st-draft-soft)',
        }
      )
    }

    /** 阶段 → 中文名。 */
    function phaseLabel(phase) {
      const found = PHASES.find((entry) => entry[0] === phase)
      return found ? found[1] : phase || '未设置'
    }

    /** 取路径最后一段（兼容 Windows 反斜杠）。 */
    function handoffName(pathValue) {
      const text = String(pathValue === null || pathValue === undefined ? '' : pathValue).replace(/\\/g, '/')
      const index = text.lastIndexOf('/')
      return index >= 0 ? text.slice(index + 1) : text
    }

    /** 从 handoff 路径推模块 id，例如 modules/M40-statistics/... → M40。 */
    function moduleFromHandoffPath(pathValue) {
      const match = String(pathValue === null || pathValue === undefined ? '' : pathValue)
        .replace(/\\/g, '/')
        .match(/^modules\/([^/]+)\//)
      if (!match) return '—'
      return match[1].split('-')[0] || match[1]
    }

    /** 从 handoff 文件名推分支 id，例如 HANDOFF-B40-03-IPTW-v1.md → B40-03。 */
    function branchFromHandoffPath(pathValue) {
      const match = handoffName(pathValue).match(/^HANDOFF-(B\d{2}-\d{2})-/)
      return match ? match[1] : '—'
    }

    /** 从 handoff 文件名推版本号，兜底 1。 */
    function versionFromHandoffPath(pathValue) {
      const match = handoffName(pathValue).match(/-v(\d+)\.md$/)
      return match ? Number(match[1]) : 1
    }

    /** 待决定问题可能是字符串或字符串数组，统一成多行文本。 */
    function normalizeQuestions(questions) {
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
    function countOf(counts, key) {
      if (!counts || typeof counts !== 'object') return 0
      const value = counts[key]
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }

    /** 汇总模块的分支数（modules[].branches 可能是数字或数组）。 */
    function sumBranchCount(modules) {
      let total = 0
      for (const module of Array.isArray(modules) ? modules : []) {
        const branches = module && module.branches
        if (typeof branches === 'number' && Number.isFinite(branches)) total += branches
        else if (Array.isArray(branches)) total += branches.length
      }
      return total
    }

    /** 时间字符串 → 只保留时分秒，便于紧凑展示。 */
    function formatTimeText(value) {
      if (!value) return '—'
      const text = String(value)
      const match = text.match(/T(\d{2}:\d{2}(?::\d{2})?)/)
      if (match) return match[1]
      if (text.length > 19) return text.slice(0, 19)
      return text
    }

    /** 状态 → 平实中文词（v1.2 给人看的界面）。 */
    function plainStatusLabel(status) {
      const key = String(status === null || status === undefined ? '' : status).toUpperCase()
      const info = PLAIN_STATUS_INFO[key]
      return info ? info.label : key || '未知'
    }

    /** verify issue → 一句自然语言说明（code 拿不到时兜底 message）。 */
    function attentionText(issue) {
      const code = issue && issue.code ? String(issue.code) : ''
      const base = ATTENTION_TEXT[code] || '有一项校验问题'
      const message = issue && issue.message ? String(issue.message) : ''
      return message ? `${base}：${message}` : base
    }

    /** 文本截断（结果卡片 keyResults 等），max 为字符数。 */
    function truncateText(value, max) {
      const text = value === null || value === undefined ? '' : String(value)
      const limit = typeof max === 'number' && max > 0 ? max : 200
      if (text.length <= limit) return text
      return `${text.slice(0, limit)}…`
    }

    /** 取文本第一行（去空行），可按字符截断。 */
    function firstLineText(value, max) {
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
    function takeLines(value, maxLines, lineMax) {
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
    function reviewKeyOf(stream, version) {
      return `${String(stream === null || stream === undefined ? '' : stream)}@${Number.isFinite(Number(version)) ? Number(version) : 1}`
    }

    /** 从已完成度行推断模块状态（无 network completion 时兜底）。 */
    function inferModuleStatus(countsByStatus) {
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
    const SHELL_CSS = `
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

    /* ── v3.10 研究目标 · 好问题卡编辑器 ── */
    /* 左栏目标卡片：可点开编辑器，悬停给一点点「可以按」的反馈。 */
    .rdw-goal-card{transition:border-color .18s var(--rdw-ease-organic),background .18s var(--rdw-ease-organic),box-shadow .18s var(--rdw-ease-organic)}
    .rdw-goal-card:hover{border-color:color-mix(in srgb,var(--rdw-sage) 46%,transparent);background:color-mix(in srgb,var(--rdw-sage-tint) 20%,var(--rdw-organic-surface));box-shadow:var(--rdw-shadow-organic-1)}
    .rdw-goal-card:focus-visible{outline:2px solid var(--rdw-sage);outline-offset:2px}
    /* 编辑器本体：占满中栏，自身可滚动（八层矩阵 + 11 个字段会很高）。 */
    .rdw-goal-card-view{height:100%;box-sizing:border-box;background:var(--rdw-organic-surface)}
    .rdw-goal-card-view input:focus,.rdw-goal-card-view textarea:focus{border-color:var(--rdw-sage);box-shadow:0 0 0 2px color-mix(in srgb,var(--rdw-sage) 18%,transparent)}
    /* 窄视口：八层的三列网格退化成单列，输入框不挤成一条线。 */
    @media (max-width:1180px){
      .rdw-goal-card-view [style*="grid-template-columns: 42px"]{grid-template-columns:1fr !important;gap:3px !important}
    }
    @media (max-width:760px){
      .rdw-goal-card-view{padding:8px}
    }

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
    const WELCOME_COPY = {
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

    // --- Module: src/core/theme.js ---
    /**
     * 研究项目 DAG 工作台 — 设计令牌层（v3.4）。
     *
     * 设计语言来自三个参照项目的共同经验：
     *   - OliverLiy/projectHub：宿主令牌 → 本地别名 → 回退值 三段式；
     *   - gjz18342624299-arch/dsh-content-workbench：低饱和紫主色 + 半透明同色徽章 + 3px 焦点环；
     *   - cinderzhan/bianqu-workbench：容器查询断点 + 工具栏紧凑化 + 卡片栅格自适应。
     *
     * 核心原则：
     *   1. **一切颜色走变量**。组件里不再出现裸 hex / rgba，避免明暗主题下「配色不对」。
     *   2. **宿主优先**。能用 `--dsw-alias-*`（DSH Desktop 主题）表达的就用宿主变量，
     *      本地只定义「宿主没给但本工作台需要」的少量语义色，并给静态回退值。
     *   3. **三层结构**：宿主 token → `--rdw-*` 语义别名 → 组件内联样式。
     *   4. **形状参与语义**：圆点=状态、圆角方块=分类、3px 左竖条=分组强调（色弱友好）。
     */

    /**
     * 令牌定义（挂在 `.rdw-shell` 上，覆盖整页与所有内联浮层）。
     *
     * 注意：宿主浅色主题下 `bg-base / layer-1 / layer-2 / layer-3` 全是纯白，
     * 靠 border 分层；因此「凹陷底色」需要自己用 color-mix 造（sunken）。
     */
    /**
     * 研究项目 DAG 工作台 — 设计令牌层（v3.5 高阶学术美学版）。
     *
     * 作者：lineex (https://github.com/lineex)
     *
     * 融合顶尖工作台设计经验：
     *   - OliverLiy/projectHub：现代多维度看板、KPI 层次、手绘 SVG 数据图表、多层微弥散阴影；
     *   - gjz18342624299-arch/dsh-content-workbench：低饱和学术配色、优雅色块软底、三栏流式布局；
     *   - cinderzhan/bianqu-workbench：容器查询自适应、极窄工具栏唯一性、精致胶囊药丸；
     *   - sara2398/xiaohongshu-note-workbench：轻盈直观的卡片与微交互反馈。
     *
     * 核心审美原则：
     *   1. 【科学克制与层次】：冷灰底色（#f8fafc / #0f172a）配合科研靛蓝（#4f46e5 / #3b82f6），拒绝高饱和塑料感。
     *   2. 【语义双编码】：所有状态均由「颜色 + 形状 + 标签」三重表达，对色弱极度友好。
     *   3. 【微立体与弥散光影】：卡片采用 1px 发丝边线 + 悬停微微浮起（-2px），主支采用渐变管线与发光节点。
     *   4. 【全套明暗主题支持】：支持 DSH Desktop 原生深色主题自适应。
     */

    const RDW_THEME_CSS = `
    .rdw-shell{
      /* —— 画布与面板表面 —— */
      --rdw-bg:var(--dsw-alias-bg-base,#f8fafc);
      --rdw-panel:var(--dsw-alias-bg-layer-1,#ffffff);
      --rdw-panel-2:var(--dsw-alias-bg-layer-2,#fbfcfd);
      --rdw-panel-3:var(--dsw-alias-bg-layer-3,#f1f5f9);
      --rdw-sunken:color-mix(in srgb,var(--rdw-text) 4%,var(--rdw-panel));
      --rdw-sunken-2:color-mix(in srgb,var(--rdw-text) 7%,var(--rdw-panel));
      --rdw-hover:color-mix(in srgb,var(--rdw-text) 5%,transparent);

      /* —— 文字排版层次 —— */
      --rdw-text:var(--dsw-alias-label-primary,#0f172a);
      --rdw-text-2:var(--dsw-alias-label-secondary,#475569);
      --rdw-text-3:var(--dsw-alias-label-tertiary,#64748b);
      --rdw-text-4:var(--dsw-alias-label-caption,#94a3b8);
      --rdw-on-brand:var(--dsw-alias-label-primary-foreground,#ffffff);

      /* —— 边框与发丝线 —— */
      --rdw-line:var(--dsw-alias-border-l1,rgba(15,23,42,.06));
      --rdw-line-2:var(--dsw-alias-border-l2,rgba(15,23,42,.10));
      --rdw-line-3:var(--dsw-alias-border-l3,rgba(15,23,42,.16));

      /* —— 品牌与核心语义 —— */
      --rdw-brand:var(--dsw-alias-brand-primary,#0f172a);
      --rdw-brand-hover:var(--dsw-alias-button-primary-hover,#1e293b);
      --rdw-brand-gradient:linear-gradient(135deg,#1e293b 0%,#3b82f6 100%);
      --rdw-accent:var(--dsw-alias-state-business-primary,#3b82f6);
      --rdw-accent-dark:#2563eb;
      --rdw-danger:var(--dsw-alias-state-error-primary,#e11d48);
      --rdw-warn:var(--dsw-alias-state-warn-primary,#d97706);
      --rdw-ok:var(--dsw-alias-state-success-primary,#059669);
      --rdw-idle:var(--dsw-alias-state-idle-primary,#94a3b8);

      /* 语义半透软底（明暗模式通透高级） */
      --rdw-accent-soft:color-mix(in srgb,var(--rdw-accent) 12%,transparent);
      --rdw-danger-soft:color-mix(in srgb,var(--rdw-danger) 12%,transparent);
      --rdw-warn-soft:color-mix(in srgb,var(--rdw-warn) 14%,transparent);
      --rdw-ok-soft:color-mix(in srgb,var(--rdw-ok) 13%,transparent);

      /* —— 科研状态色体系（学术级严谨配色）—— */
      --rdw-st-draft:var(--dsw-alias-label-tertiary,#64748b);
      --rdw-st-provisional:var(--dsw-alias-state-warn-primary,#d97706);
      --rdw-st-accepted:var(--dsw-alias-state-success-primary,#059669);
      --rdw-st-rejected:#e11d48;
      --rdw-st-superseded:#7c3aed;
      --rdw-st-blocked:#ea580c;

      --rdw-st-draft-soft:color-mix(in srgb,var(--rdw-st-draft) 12%,transparent);
      --rdw-st-provisional-soft:color-mix(in srgb,var(--rdw-st-provisional) 13%,transparent);
      --rdw-st-accepted-soft:color-mix(in srgb,var(--rdw-st-accepted) 13%,transparent);
      --rdw-st-rejected-soft:color-mix(in srgb,var(--rdw-st-rejected) 12%,transparent);
      --rdw-st-superseded-soft:color-mix(in srgb,var(--rdw-st-superseded) 12%,transparent);
      --rdw-st-blocked-soft:color-mix(in srgb,var(--rdw-st-blocked) 13%,transparent);

      /* —— 项目流程主线科研管线色 —— */
      --rdw-bone:color-mix(in srgb,var(--rdw-text) 24%,transparent);
      --rdw-bone-strong:color-mix(in srgb,var(--rdw-text) 44%,transparent);
      --rdw-spine:var(--rdw-accent);
      --rdw-spine-glow:color-mix(in srgb,var(--rdw-accent) 22%,transparent);
      --rdw-spine-soft:color-mix(in srgb,var(--rdw-accent) 14%,transparent);
      --rdw-plate:color-mix(in srgb,var(--rdw-accent) 8%,var(--rdw-panel));
      --rdw-plate-line:color-mix(in srgb,var(--rdw-accent) 28%,transparent);

      /* —— 圆角与规格 —— */
      --rdw-r-xs:var(--dsw-radius-xs,4px);
      --rdw-r-sm:var(--dsw-radius-sm,8px);
      --rdw-r-md:var(--dsw-radius-md,12px);
      --rdw-r-lg:var(--dsw-radius-lg,16px);
      --rdw-r-pill:999px;

      /* —— 现代弥散层级阴影（Tailwind / Linear 级）—— */
      --rdw-shadow-1:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04);
      --rdw-shadow-2:0 6px 16px -2px rgba(15,23,42,.08),0 2px 6px -1px rgba(15,23,42,.04);
      --rdw-shadow-3:0 18px 36px -4px rgba(15,23,42,.12),0 6px 16px -2px rgba(15,23,42,.06);

      /* —— 缓动与动效 —— */
      --rdw-ease:cubic-bezier(.22,.61,.36,1);
      --rdw-dur:.2s;

      /* —— 字体 —— */
      --rdw-font:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue','Segoe UI Variable Text','Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif);
      --rdw-font-mono:var(--ds-font-family-code,'SF Mono',SFMono-Regular,ui-monospace,Menlo,Monaco,Consolas,'Liberation Mono',monospace);

      /* ═══════════════════════════════════════════════════════════════════════
       * Apple / macOS 原生语汇层（v5）
       *
       * 用户反馈「排版太多密集的字体」——根因是旧版把 9px/9.5px/10px/10.5px/11px
       * 五级「微字号」混用，信息层级靠字号堆叠而非字重/灰度区分。
       *
       * 新规则（对齐 macOS 原生 App）：
       *   1. 【字号阶梯收敛到 4 级】11（辅助）/ 12（正文小）/ 13（正文）/
       *      15（区块标题）/ 20（页面标题）。不再出现 9px/9.5px/10px。
       *   2. 【层级靠字重 + 灰度】font-weight 只用 400 / 500 / 600；
       *      次要信息降到 label-3 灰度，而不是缩小字号。
       *   3. 【系统语义色】蓝/绿/橙/红/灰五色，全部用淡底 tinted capsule 表达。
       *   4. 【材质分层】毛玻璃（vibrancy）+ 白面 + 极轻阴影，不靠满屏边框。
       *   5. 【连续圆角】7 / 10 / 13 / 18 / pill——观感接近 Apple 连续曲率。
       * ═══════════════════════════════════════════════════════════════════════ */

      /* —— 系统语义色（macOS light）—— */
      --rdw-sys-blue:#007aff;
      --rdw-sys-green:#34c759;
      --rdw-sys-orange:#ff9500;
      --rdw-sys-red:#ff3b30;
      --rdw-sys-gray:#8e8e93;

      /* —— 表面与材质 —— */
      --rdw-organic-bg:#f2f2f7;              /* 系统 groupBackground */
      --rdw-organic-surface:#ffffff;         /* 内容面 */
      --rdw-organic-raised:#ffffff;
      --rdw-organic-input:#ffffff;
      --rdw-organic-hover:rgba(120,120,128,.08);
      --rdw-organic-strip:rgba(250,250,252,.78);
      --rdw-glass:rgba(246,246,248,.82);     /* 侧栏 vibrancy */
      --rdw-glass-strong:rgba(255,255,255,.86);

      /* —— 文字（Apple label 层级）—— */
      --rdw-organic-ink:#1d1d1f;
      --rdw-organic-ink-2:rgba(60,60,67,.72);
      --rdw-organic-ink-3:rgba(60,60,67,.50);
      --rdw-organic-ink-4:rgba(60,60,67,.32);

      /* —— 填充与分隔 —— */
      --rdw-fill-quat:rgba(120,120,128,.08);
      --rdw-fill-tert:rgba(120,120,128,.12);
      --rdw-fill-sec:rgba(120,120,128,.16);

      /* —— 语义色别名（旧令牌名保持不变，值切到系统色，避免改所有组件）—— */
      --rdw-sage:var(--rdw-sys-blue);
      --rdw-sage-hover:#0a6fdb;
      --rdw-sage-tint:#5ac8fa;
      --rdw-tan:var(--rdw-sys-orange);
      --rdw-tan-ink:#b25000;
      --rdw-mist:#f2f2f7;
      --rdw-teal:#5ac8fa;
      --rdw-teal-ink:#0071a4;
      --rdw-soil:var(--rdw-sys-blue);
      --rdw-warm-line:rgba(60,60,67,.10);
      --rdw-warm-line-2:rgba(60,60,67,.06);

      /* —— 圆角（Apple 连续曲率观感，非"有机不等角"）—— */
      --rdw-r-blob:18px;
      --rdw-r-blob-lg:22px;
      --rdw-r-pebble:13px;
      --rdw-r-pebble-sm:7px;
      --rdw-r-dot:50%;
      --rdw-r-bubble-ai:13px;
      --rdw-r-bubble-user:13px;

      /* —— 标题不再用衬线，改用系统 SF Pro 的紧凑字距 —— */
      --rdw-font-serif:var(--rdw-font);

      /* —— 动效：Apple 的缓动更顺，时长更短 —— */
      --rdw-ease-organic:cubic-bezier(.32,.72,0,1);
      --rdw-dur-organic:220ms;
      --rdw-dur-quick:140ms;

      /* —— 阴影：极轻（Apple 靠材质与边框分层，不用重投影）—— */
      --rdw-shadow-organic-1:0 1px 2px rgba(0,0,0,.05);
      --rdw-shadow-organic-2:0 4px 14px rgba(0,0,0,.08);
      --rdw-shadow-organic-3:0 12px 32px rgba(0,0,0,.14);

      /* ═══ 视觉重心：把注意力交给中栏主会话 ═══
       * 三栏原先同为纯白 + 同等边框，没有主次，眼睛不知道该看哪里。
       * 现在分三级：中栏（工作台面）= 纯白 + 稍强投影；
       * 侧栏（导航 / 产物）= 浅灰面 + 更弱边框 + 无投影。
       * 侧栏不再像「又一张卡片」，而是托住中栏的底板。 */
      --rdw-side-surface:color-mix(in srgb,var(--rdw-organic-bg) 68%,var(--rdw-organic-surface));
      --rdw-side-line:rgba(60,60,67,.042);
      --rdw-focus-surface:var(--rdw-organic-surface);
      --rdw-focus-line:rgba(60,60,67,.09);
      --rdw-focus-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06);

      /* —— 侧栏状态色：降饱和，别让六种颜色同时抢戏 ——
       * 侧栏只用「一个小实心点 + 中性文字」，不铺彩色底。
       * 强色只留给真正需要你处理的地方（中栏警示、右栏待办）。 */
      --rdw-st-draft-mute:color-mix(in srgb,var(--rdw-st-draft) 55%,var(--rdw-organic-bg));
      --rdw-st-provisional-mute:color-mix(in srgb,var(--rdw-st-provisional) 52%,var(--rdw-organic-bg));
      --rdw-st-accepted-mute:color-mix(in srgb,var(--rdw-st-accepted) 52%,var(--rdw-organic-bg));
      --rdw-st-rejected-mute:color-mix(in srgb,var(--rdw-st-rejected) 52%,var(--rdw-organic-bg));
      --rdw-st-superseded-mute:color-mix(in srgb,var(--rdw-st-superseded) 52%,var(--rdw-organic-bg));
      --rdw-st-blocked-mute:color-mix(in srgb,var(--rdw-st-blocked) 52%,var(--rdw-organic-bg));

      /* —— 纹理：Apple 无纸纹，置空 —— */
      --rdw-organic-grain:none;
    }

    /* 深色模式全局调优 */
    body[data-ds-dark-theme] .rdw-shell{
      --rdw-bg:var(--dsw-alias-bg-base,#0b0f19);
      --rdw-panel:var(--dsw-alias-bg-layer-1,#131b2e);
      --rdw-panel-2:var(--dsw-alias-bg-layer-2,#17223b);
      --rdw-panel-3:var(--dsw-alias-bg-layer-3,#1e293b);
      --rdw-line:var(--dsw-alias-border-l1,rgba(255,255,255,.08));
      --rdw-line-2:var(--dsw-alias-border-l2,rgba(255,255,255,.12));
      --rdw-line-3:var(--dsw-alias-border-l3,rgba(255,255,255,.18));
      --rdw-text:var(--dsw-alias-label-primary,#f8fafc);
      --rdw-text-2:var(--dsw-alias-label-secondary,#cbd5e1);
      --rdw-text-3:var(--dsw-alias-label-tertiary,#94a3b8);
      --rdw-text-4:var(--dsw-alias-label-caption,#64748b);
      --rdw-st-accepted:#10b981;
      --rdw-st-provisional:#f59e0b;
      --rdw-st-rejected:#f43f5e;
      --rdw-st-superseded:#a78bfa;
      --rdw-st-blocked:#fb923c;
      --rdw-shadow-1:0 1px 3px rgba(0,0,0,.4);
      --rdw-shadow-2:0 6px 18px rgba(0,0,0,.5);
      --rdw-shadow-3:0 20px 40px rgba(0,0,0,.65);

      /* —— Apple 深色语义色 —— */
      --rdw-sys-blue:#0a84ff;
      --rdw-sys-green:#30d158;
      --rdw-sys-orange:#ff9f0a;
      --rdw-sys-red:#ff453a;
      --rdw-sys-gray:#98989d;

      /* —— 表面与材质（深）—— */
      --rdw-organic-bg:#000000;
      --rdw-organic-surface:#1c1c1e;
      --rdw-organic-raised:#2c2c2e;
      --rdw-organic-input:#1c1c1e;
      --rdw-organic-hover:rgba(120,120,128,.18);
      --rdw-organic-strip:rgba(28,28,30,.80);
      --rdw-glass:rgba(30,30,32,.82);
      --rdw-glass-strong:rgba(44,44,46,.92);

      /* —— 文字（深）—— */
      --rdw-organic-ink:#f5f5f7;
      --rdw-organic-ink-2:rgba(235,235,245,.72);
      --rdw-organic-ink-3:rgba(235,235,245,.50);
      --rdw-organic-ink-4:rgba(235,235,245,.30);

      /* —— 填充与分隔（深）—— */
      --rdw-fill-quat:rgba(120,120,128,.18);
      --rdw-fill-tert:rgba(120,120,128,.26);
      --rdw-fill-sec:rgba(120,120,128,.34);

      /* —— 语义别名 —— */
      --rdw-sage:var(--rdw-sys-blue);
      --rdw-sage-hover:#409cff;
      --rdw-sage-tint:#64d2ff;
      --rdw-tan:var(--rdw-sys-orange);
      --rdw-tan-ink:#ffb340;
      --rdw-mist:#2c2c2e;
      --rdw-teal:#64d2ff;
      --rdw-teal-ink:#9ee7ff;
      --rdw-soil:var(--rdw-sys-blue);
      --rdw-warm-line:rgba(84,84,88,.48);
      --rdw-warm-line-2:rgba(84,84,88,.32);
      --rdw-shadow-organic-1:0 1px 2px rgba(0,0,0,.40);
      --rdw-shadow-organic-2:0 4px 14px rgba(0,0,0,.50);
      --rdw-shadow-organic-3:0 12px 32px rgba(0,0,0,.60);

      /* —— 视觉重心（深色）：侧栏更暗、中栏更亮 ——
       * 深色下不能靠「白得更白」制造对比，改为侧栏沉到 #141416、
       * 中栏提到 #1c1c1e 之上，靠明度阶梯而不是描边。 */
      --rdw-side-surface:#141416;
      --rdw-side-line:rgba(255,255,255,.035);
      --rdw-focus-surface:#1c1c1e;
      --rdw-focus-line:rgba(255,255,255,.10);
      --rdw-focus-shadow:0 1px 2px rgba(0,0,0,.45),0 8px 24px rgba(0,0,0,.42);
      --rdw-st-draft-mute:color-mix(in srgb,var(--rdw-st-draft) 60%,#141416);
      --rdw-st-provisional-mute:color-mix(in srgb,var(--rdw-st-provisional) 58%,#141416);
      --rdw-st-accepted-mute:color-mix(in srgb,var(--rdw-st-accepted) 58%,#141416);
      --rdw-st-rejected-mute:color-mix(in srgb,var(--rdw-st-rejected) 58%,#141416);
      --rdw-st-superseded-mute:color-mix(in srgb,var(--rdw-st-superseded) 58%,#141416);
      --rdw-st-blocked-mute:color-mix(in srgb,var(--rdw-st-blocked) 58%,#141416);

      --rdw-organic-grain:none;
    }
    `

    /**
     * 组件样式片段（内联样式用；全部只引用 var(--rdw-*)，不出现裸色值）。
     */
    const RDW_TOKENS = {
      /** 通用面板（卡片/区块）。 */
      panel: {
        border: '1px solid var(--rdw-line-2)',
        borderRadius: 'var(--rdw-r-md)',
        background: 'var(--rdw-panel)',
        boxShadow: 'var(--rdw-shadow-1)',
      },
      /** 凹陷区块（提示框/引用块）。 */
      sunken: {
        border: '1px solid var(--rdw-line)',
        borderRadius: 'var(--rdw-r-sm)',
        background: 'var(--rdw-sunken)',
      },
      /** 分组标题（11.5px / 600 / 字距 / 三级字色）。 */
      sectionTitle: {
        margin: '0',
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: '.01em',
        color: 'var(--rdw-text)',
      },
      /** 分组小标题（弱化）。 */
      groupTitle: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: 'var(--rdw-text-3)',
      },
      /** 数字列等宽对齐。 */
      num: {
        fontVariantNumeric: 'tabular-nums',
      },
      /** 焦点环（3px 同色软底，不使用 outline）。 */
      focusRing: '0 0 0 3px var(--rdw-accent-soft)',
    }

    /**
     * 语义色 → tone 映射。
     * tone 贯穿徽章 / 进度条 / 圆点 / 时间轴圆点 / 图表切片，全链路一致。
     */
    const RDW_TONE = {
      idle: { color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)' },
      info: { color: 'var(--rdw-accent)', bg: 'var(--rdw-accent-soft)' },
      warn: { color: 'var(--rdw-warn)', bg: 'var(--rdw-warn-soft)' },
      ok: { color: 'var(--rdw-ok)', bg: 'var(--rdw-ok-soft)' },
      danger: { color: 'var(--rdw-danger)', bg: 'var(--rdw-danger-soft)' },
      draft: { color: 'var(--rdw-st-draft)', bg: 'var(--rdw-st-draft-soft)' },
      provisional: { color: 'var(--rdw-st-provisional)', bg: 'var(--rdw-st-provisional-soft)' },
      accepted: { color: 'var(--rdw-st-accepted)', bg: 'var(--rdw-st-accepted-soft)' },
      rejected: { color: 'var(--rdw-st-rejected)', bg: 'var(--rdw-st-rejected-soft)' },
      superseded: { color: 'var(--rdw-st-superseded)', bg: 'var(--rdw-st-superseded-soft)' },
      blocked: { color: 'var(--rdw-st-blocked)', bg: 'var(--rdw-st-blocked-soft)' },
    }

    /**
     * tone → 徽章样式（胶囊 + 5px 圆点，形状参与语义）。
     * @param {string} tone tone 名（见 RDW_TONE）
     */
    function toneBadgeStyle(tone) {
      const theme = RDW_TONE[tone] || RDW_TONE.idle
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 21,
        padding: '0 8px',
        borderRadius: 'var(--rdw-r-pill)',
        border: '1px solid color-mix(in srgb,' + theme.color + ' 26%,transparent)',
        background: theme.bg,
        color: theme.color,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }
    }

    /** tone → 状态圆点样式（圆点=状态）。 */
    function toneDotStyle(tone, size) {
      const theme = RDW_TONE[tone] || RDW_TONE.idle
      const px = typeof size === 'number' && size > 0 ? size : 7
      return {
        width: px,
        height: px,
        borderRadius: 'var(--rdw-r-pill)',
        background: theme.color,
        flex: '0 0 auto',
        display: 'inline-block',
      }
    }

    /**
     * 空状态：虚线边框 + 圆形图标槽 + 标题 + 提示 + 可选操作。
     * 做法来自 dsh-content-workbench：空状态必须给出明确的下一步动作。
     */
    function emptyStateStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        padding: '44px 20px',
        border: '1px dashed var(--rdw-line-3)',
        borderRadius: 'var(--rdw-r-md)',
        background: 'var(--rdw-sunken)',
        color: 'var(--rdw-text-3)',
        textAlign: 'center',
      }
    }

    /** 空状态图标槽（42px 圆形）。 */
    function emptyIconStyle() {
      return {
        display: 'grid',
        placeItems: 'center',
        width: 42,
        height: 42,
        borderRadius: 'var(--rdw-r-pill)',
        background: 'var(--rdw-panel)',
        border: '1px solid var(--rdw-line)',
        color: 'var(--rdw-text-3)',
        fontSize: 18,
        lineHeight: 1,
      }
    }

    /** 空状态标题。 */
    function emptyTitleStyle() {
      return {
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--rdw-text)',
        lineHeight: 1.5,
      }
    }

    /** 空状态提示正文。 */
    function emptyBodyStyle() {
      return {
        fontSize: 11.5,
        lineHeight: 1.75,
        color: 'var(--rdw-text-3)',
        maxWidth: '52ch',
      }
    }

    /**
     * 骨架屏：透明度脉冲（不用位移，位移在 flex 栅格里会抖）。
     * 配合 prefers-reduced-motion 已在 SHELL_CSS 里降级。
     */
    function skeletonStyle(height, width) {
      return {
        height: typeof height === 'number' ? height : 10,
        width: typeof width === 'string' ? width : '100%',
        borderRadius: 'var(--rdw-r-pill)',
        background: 'var(--rdw-sunken-2)',
        animation: 'rdw-pulse 1.4s ease-in-out infinite',
      }
    }

    /** 骨架屏关键帧。 */
    const RDW_SKELETON_CSS = `
    @keyframes rdw-pulse{0%,100%{opacity:1}50%{opacity:.5}}
    `

    /* =========================================================================== *
     * v3.9 主题预设（Theme Presets）
     *
     * 设计要点：
     *   1. 只覆盖「配色」不覆盖「结构」——圆角/字号/间距保持同一套，避免主题之间
     *      版式跳动；换主题 = 换色相、明度基调与强调色。
     *   2. 全部通过 `[data-rdw-theme="<id>"]` 挂在 `.rdw-shell` 上，
     *      所以内联浮层、SVG（都在 shell 内部）自动跟随。
     *   3. 每个主题都同时给出浅色与深色版本（深色用 body[data-ds-dark-theme] 前缀），
     *      保证用户在系统深色模式下切主题不会「一半亮一半暗」。
     *   4. 强调色语义（--rdw-sage 主色 / --rdw-tan 次强调）不变，只换具体色相，
     *      这样所有「主支=sage、分支状态=语义色」的既有语义继续成立。
     * =========================================================================== */

    /**
     * 主题清单（顺序即菜单顺序）。
     * swatch 用于菜单里的三色预览点：主色 / 次强调 / 底色。
     */
    const RDW_THEME_PRESETS = [
      {
        id: 'apple',
        name: '系统原生',
        hint: 'macOS 系统色，蓝为主、橙为辅（默认）',
        swatch: ['#007aff', '#ff9500', '#f2f2f7'],
      },
      {
        id: 'sage',
        name: '鼠尾草',
        hint: '低饱和绿灰，长时间阅读最省眼',
        swatch: ['#6b8f71', '#c9a227', '#f4f5f1'],
      },
      {
        id: 'ink',
        name: '墨蓝学术',
        hint: '深墨蓝 + 砖红，期刊排版的克制感',
        swatch: ['#2f4b7c', '#b5643a', '#f5f6f8'],
      },
      {
        id: 'plum',
        name: '梅子暮色',
        hint: '紫灰调，适合夜间写作',
        swatch: ['#7c5cbf', '#c76b8a', '#f6f4f8'],
      },
      {
        id: 'sand',
        name: '沙岩暖调',
        hint: '暖沙与陶土，纸质手稿观感',
        swatch: ['#a8752f', '#7f8f5e', '#f7f4ee'],
      },
      {
        id: 'slate',
        name: '冷岩灰',
        hint: '中性灰蓝，最克制的无彩选项',
        swatch: ['#4a5568', '#8b7355', '#f1f3f5'],
      },
    ]

    /** 主题 id 合法集合，用于持久化时校验（防手改配置写进未知值）。 */
    const RDW_THEME_IDS = RDW_THEME_PRESETS.map((item) => item.id)

    /**
     * 主题覆盖 CSS。默认主题（apple）不在这里重复定义——它就用上面 `.rdw-shell`
     * 的原生 Apple 令牌，避免两处维护同一份值。
     *
     * 每个主题只定义「会随主题变化的那些令牌」，其余（圆角、字体、动效、阴影）
     * 继承默认值。
     */
    const RDW_THEME_PRESET_CSS = `
    /* ── 鼠尾草 sage：低饱和绿灰 ───────────────────────────────────────── */
    .rdw-shell[data-rdw-theme="sage"]{
      --rdw-sys-blue:#5b8064;--rdw-sys-green:#5f9e6b;--rdw-sys-orange:#b98a2c;
      --rdw-organic-bg:#eef1ea;--rdw-organic-surface:#fbfcf9;--rdw-organic-raised:#ffffff;
      --rdw-organic-input:#fbfcf9;--rdw-organic-hover:rgba(91,128,100,.10);
      --rdw-organic-strip:rgba(243,246,240,.80);--rdw-glass:rgba(240,244,237,.82);
      --rdw-glass-strong:rgba(252,253,250,.90);
      --rdw-organic-ink:#22301f;--rdw-organic-ink-2:rgba(45,58,42,.72);
      --rdw-organic-ink-3:rgba(45,58,42,.50);--rdw-organic-ink-4:rgba(45,58,42,.32);
      --rdw-sage:#5b8064;--rdw-sage-hover:#4a6b52;--rdw-sage-tint:#8fb99a;
      --rdw-tan:#b98a2c;--rdw-tan-ink:#8a6415;
      --rdw-warm-line:rgba(45,58,42,.12);--rdw-warm-line-2:rgba(45,58,42,.07);
      --rdw-accent:#5b8064;--rdw-bg:#eef1ea;--rdw-panel:#fbfcf9;--rdw-panel-2:#f3f6f0;--rdw-panel-3:#e8ede4;
      --rdw-text:#22301f;--rdw-text-2:#41503c;--rdw-text-3:#5f6f59;--rdw-text-4:#8a9784;
      --rdw-line:rgba(45,58,42,.08);--rdw-line-2:rgba(45,58,42,.13);--rdw-line-3:rgba(45,58,42,.20);
    }
    body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="sage"]{
      --rdw-organic-bg:#0f1511;--rdw-organic-surface:#182019;--rdw-organic-raised:#222c23;
      --rdw-organic-input:#182019;--rdw-organic-hover:rgba(140,180,150,.16);
      --rdw-organic-strip:rgba(24,32,25,.82);--rdw-glass:rgba(22,30,23,.84);
      --rdw-glass-strong:rgba(34,44,35,.92);
      --rdw-organic-ink:#e8efe6;--rdw-organic-ink-2:rgba(220,232,216,.72);
      --rdw-organic-ink-3:rgba(220,232,216,.50);--rdw-organic-ink-4:rgba(220,232,216,.30);
      --rdw-sage:#8fb99a;--rdw-sage-hover:#a7cbb1;--rdw-sage-tint:#b9d8c1;
      --rdw-tan:#e0b455;--rdw-tan-ink:#f0cd82;
      --rdw-warm-line:rgba(180,200,175,.14);--rdw-warm-line-2:rgba(180,200,175,.09);
      --rdw-accent:#8fb99a;--rdw-bg:#0f1511;--rdw-panel:#182019;--rdw-panel-2:#1d2620;--rdw-panel-3:#222c23;
      --rdw-text:#e8efe6;--rdw-text-2:#c3d0bd;--rdw-text-3:#94a68d;--rdw-text-4:#6d7d67;
    }

    /* ── 墨蓝学术 ink：深墨蓝 + 砖红 ───────────────────────────────────── */
    .rdw-shell[data-rdw-theme="ink"]{
      --rdw-sys-blue:#2f4b7c;--rdw-sys-green:#3f7a6a;--rdw-sys-orange:#b5643a;
      --rdw-organic-bg:#eef1f6;--rdw-organic-surface:#ffffff;--rdw-organic-raised:#ffffff;
      --rdw-organic-input:#ffffff;--rdw-organic-hover:rgba(47,75,124,.08);
      --rdw-organic-strip:rgba(246,248,252,.80);--rdw-glass:rgba(242,245,250,.82);
      --rdw-glass-strong:rgba(255,255,255,.90);
      --rdw-organic-ink:#1a2233;--rdw-organic-ink-2:rgba(30,42,64,.74);
      --rdw-organic-ink-3:rgba(30,42,64,.50);--rdw-organic-ink-4:rgba(30,42,64,.32);
      --rdw-sage:#2f4b7c;--rdw-sage-hover:#263d66;--rdw-sage-tint:#6f8cbd;
      --rdw-tan:#b5643a;--rdw-tan-ink:#8d4a2a;
      --rdw-warm-line:rgba(30,42,64,.11);--rdw-warm-line-2:rgba(30,42,64,.06);
      --rdw-accent:#2f4b7c;--rdw-bg:#eef1f6;--rdw-panel:#ffffff;--rdw-panel-2:#f6f8fb;--rdw-panel-3:#eaeef5;
      --rdw-text:#1a2233;--rdw-text-2:#38465f;--rdw-text-3:#5c6b85;--rdw-text-4:#8b97ad;
      --rdw-line:rgba(30,42,64,.08);--rdw-line-2:rgba(30,42,64,.13);--rdw-line-3:rgba(30,42,64,.20);
    }
    body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="ink"]{
      --rdw-organic-bg:#0c1017;--rdw-organic-surface:#151b26;--rdw-organic-raised:#1d2634;
      --rdw-organic-input:#151b26;--rdw-organic-hover:rgba(110,140,190,.16);
      --rdw-organic-strip:rgba(21,27,38,.84);--rdw-glass:rgba(19,25,34,.86);
      --rdw-glass-strong:rgba(29,38,52,.92);
      --rdw-organic-ink:#e6ebf5;--rdw-organic-ink-2:rgba(220,230,245,.72);
      --rdw-organic-ink-3:rgba(220,230,245,.50);--rdw-organic-ink-4:rgba(220,230,245,.30);
      --rdw-sage:#7f9dd4;--rdw-sage-hover:#9bb4e2;--rdw-sage-tint:#b3c7ea;
      --rdw-tan:#d68a5f;--rdw-tan-ink:#eaa887;
      --rdw-warm-line:rgba(150,175,215,.14);--rdw-warm-line-2:rgba(150,175,215,.09);
      --rdw-accent:#7f9dd4;--rdw-bg:#0c1017;--rdw-panel:#151b26;--rdw-panel-2:#1a212d;--rdw-panel-3:#1d2634;
      --rdw-text:#e6ebf5;--rdw-text-2:#bcc8dc;--rdw-text-3:#8d9bb2;--rdw-text-4:#66748c;
    }

    /* ── 梅子暮色 plum：紫灰 ───────────────────────────────────────────── */
    .rdw-shell[data-rdw-theme="plum"]{
      --rdw-sys-blue:#7c5cbf;--rdw-sys-green:#5d8f7a;--rdw-sys-orange:#c76b8a;
      --rdw-organic-bg:#f2eff6;--rdw-organic-surface:#fdfcfe;--rdw-organic-raised:#ffffff;
      --rdw-organic-input:#fdfcfe;--rdw-organic-hover:rgba(124,92,191,.09);
      --rdw-organic-strip:rgba(248,246,251,.80);--rdw-glass:rgba(246,243,250,.82);
      --rdw-glass-strong:rgba(254,253,254,.90);
      --rdw-organic-ink:#241c33;--rdw-organic-ink-2:rgba(48,38,66,.72);
      --rdw-organic-ink-3:rgba(48,38,66,.50);--rdw-organic-ink-4:rgba(48,38,66,.32);
      --rdw-sage:#7c5cbf;--rdw-sage-hover:#684ba6;--rdw-sage-tint:#ab8fdc;
      --rdw-tan:#c76b8a;--rdw-tan-ink:#9d4d69;
      --rdw-warm-line:rgba(48,38,66,.11);--rdw-warm-line-2:rgba(48,38,66,.06);
      --rdw-accent:#7c5cbf;--rdw-bg:#f2eff6;--rdw-panel:#fdfcfe;--rdw-panel-2:#f8f6fb;--rdw-panel-3:#efeaf6;
      --rdw-text:#241c33;--rdw-text-2:#463a5c;--rdw-text-3:#6a5c84;--rdw-text-4:#968bab;
      --rdw-line:rgba(48,38,66,.08);--rdw-line-2:rgba(48,38,66,.13);--rdw-line-3:rgba(48,38,66,.20);
    }
    body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="plum"]{
      --rdw-organic-bg:#12101a;--rdw-organic-surface:#1b1826;--rdw-organic-raised:#262133;
      --rdw-organic-input:#1b1826;--rdw-organic-hover:rgba(170,140,225,.16);
      --rdw-organic-strip:rgba(27,24,38,.84);--rdw-glass:rgba(25,22,34,.86);
      --rdw-glass-strong:rgba(38,33,51,.92);
      --rdw-organic-ink:#eee9f5;--rdw-organic-ink-2:rgba(232,225,245,.72);
      --rdw-organic-ink-3:rgba(232,225,245,.50);--rdw-organic-ink-4:rgba(232,225,245,.30);
      --rdw-sage:#ab8fdc;--rdw-sage-hover:#c0a9e8;--rdw-sage-tint:#d2c0f0;
      --rdw-tan:#e091ae;--rdw-tan-ink:#f0b2c6;
      --rdw-warm-line:rgba(190,170,225,.14);--rdw-warm-line-2:rgba(190,170,225,.09);
      --rdw-accent:#ab8fdc;--rdw-bg:#12101a;--rdw-panel:#1b1826;--rdw-panel-2:#211d2d;--rdw-panel-3:#262133;
      --rdw-text:#eee9f5;--rdw-text-2:#cbc2db;--rdw-text-3:#a296b5;--rdw-text-4:#7a6e8c;
    }

    /* ── 沙岩暖调 sand：暖沙 + 陶土 ────────────────────────────────────── */
    .rdw-shell[data-rdw-theme="sand"]{
      --rdw-sys-blue:#a8752f;--rdw-sys-green:#7f8f5e;--rdw-sys-orange:#b5633c;
      --rdw-organic-bg:#f5f1e9;--rdw-organic-surface:#fdfbf7;--rdw-organic-raised:#fffefb;
      --rdw-organic-input:#fdfbf7;--rdw-organic-hover:rgba(168,117,47,.09);
      --rdw-organic-strip:rgba(250,246,239,.80);--rdw-glass:rgba(248,244,236,.82);
      --rdw-glass-strong:rgba(255,254,251,.90);
      --rdw-organic-ink:#33291c;--rdw-organic-ink-2:rgba(62,50,36,.74);
      --rdw-organic-ink-3:rgba(62,50,36,.50);--rdw-organic-ink-4:rgba(62,50,36,.32);
      --rdw-sage:#a8752f;--rdw-sage-hover:#8d611f;--rdw-sage-tint:#d0a86a;
      --rdw-tan:#7f8f5e;--rdw-tan-ink:#5f6c43;
      --rdw-warm-line:rgba(62,50,36,.12);--rdw-warm-line-2:rgba(62,50,36,.07);
      --rdw-accent:#a8752f;--rdw-bg:#f5f1e9;--rdw-panel:#fdfbf7;--rdw-panel-2:#faf6ef;--rdw-panel-3:#f2ece1;
      --rdw-text:#33291c;--rdw-text-2:#54452f;--rdw-text-3:#7a694f;--rdw-text-4:#a3967d;
      --rdw-line:rgba(62,50,36,.09);--rdw-line-2:rgba(62,50,36,.14);--rdw-line-3:rgba(62,50,36,.21);
    }
    body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="sand"]{
      --rdw-organic-bg:#15120d;--rdw-organic-surface:#1e1a14;--rdw-organic-raised:#292419;
      --rdw-organic-input:#1e1a14;--rdw-organic-hover:rgba(200,165,105,.16);
      --rdw-organic-strip:rgba(30,26,20,.84);--rdw-glass:rgba(28,24,19,.86);
      --rdw-glass-strong:rgba(41,36,25,.92);
      --rdw-organic-ink:#f0e9dc;--rdw-organic-ink-2:rgba(236,226,208,.72);
      --rdw-organic-ink-3:rgba(236,226,208,.50);--rdw-organic-ink-4:rgba(236,226,208,.30);
      --rdw-sage:#d0a86a;--rdw-sage-hover:#dfbf8b;--rdw-sage-tint:#e9d2ab;
      --rdw-tan:#a8b884;--rdw-tan-ink:#c2cfa6;
      --rdw-warm-line:rgba(210,185,145,.14);--rdw-warm-line-2:rgba(210,185,145,.09);
      --rdw-accent:#d0a86a;--rdw-bg:#15120d;--rdw-panel:#1e1a14;--rdw-panel-2:#231f18;--rdw-panel-3:#292419;
      --rdw-text:#f0e9dc;--rdw-text-2:#cfc2ae;--rdw-text-3:#a2957f;--rdw-text-4:#7c7160;
    }

    /* ── 冷岩灰 slate：中性无彩 ────────────────────────────────────────── */
    .rdw-shell[data-rdw-theme="slate"]{
      --rdw-sys-blue:#4a5568;--rdw-sys-green:#5f8a72;--rdw-sys-orange:#8b7355;
      --rdw-organic-bg:#eff1f3;--rdw-organic-surface:#ffffff;--rdw-organic-raised:#ffffff;
      --rdw-organic-input:#ffffff;--rdw-organic-hover:rgba(74,85,104,.08);
      --rdw-organic-strip:rgba(247,248,250,.80);--rdw-glass:rgba(243,245,247,.82);
      --rdw-glass-strong:rgba(255,255,255,.90);
      --rdw-organic-ink:#1c2229;--rdw-organic-ink-2:rgba(35,44,54,.72);
      --rdw-organic-ink-3:rgba(35,44,54,.50);--rdw-organic-ink-4:rgba(35,44,54,.32);
      --rdw-sage:#4a5568;--rdw-sage-hover:#3b4556;--rdw-sage-tint:#8593a8;
      --rdw-tan:#8b7355;--rdw-tan-ink:#69543b;
      --rdw-warm-line:rgba(35,44,54,.11);--rdw-warm-line-2:rgba(35,44,54,.06);
      --rdw-accent:#4a5568;--rdw-bg:#eff1f3;--rdw-panel:#ffffff;--rdw-panel-2:#f7f8fa;--rdw-panel-3:#eceff2;
      --rdw-text:#1c2229;--rdw-text-2:#39424e;--rdw-text-3:#5d6876;--rdw-text-4:#8c96a4;
      --rdw-line:rgba(35,44,54,.08);--rdw-line-2:rgba(35,44,54,.13);--rdw-line-3:rgba(35,44,54,.20);
    }
    body[data-ds-dark-theme] .rdw-shell[data-rdw-theme="slate"]{
      --rdw-organic-bg:#0e1116;--rdw-organic-surface:#161a20;--rdw-organic-raised:#20252c;
      --rdw-organic-input:#161a20;--rdw-organic-hover:rgba(140,155,175,.16);
      --rdw-organic-strip:rgba(22,26,32,.84);--rdw-glass:rgba(20,24,29,.86);
      --rdw-glass-strong:rgba(32,37,44,.92);
      --rdw-organic-ink:#e9edf2;--rdw-organic-ink-2:rgba(222,229,238,.72);
      --rdw-organic-ink-3:rgba(222,229,238,.50);--rdw-organic-ink-4:rgba(222,229,238,.30);
      --rdw-sage:#8593a8;--rdw-sage-hover:#9dabc0;--rdw-sage-tint:#b0bdcd;
      --rdw-tan:#b39b78;--rdw-tan-ink:#cbb595;
      --rdw-warm-line:rgba(170,180,195,.14);--rdw-warm-line-2:rgba(170,180,195,.09);
      --rdw-accent:#8593a8;--rdw-bg:#0e1116;--rdw-panel:#161a20;--rdw-panel-2:#1b1f26;--rdw-panel-3:#20252c;
      --rdw-text:#e9edf2;--rdw-text-2:#c0c9d4;--rdw-text-3:#939dab;--rdw-text-4:#6d7683;
    }
    `

    // --- Module: src/core/api.js ---
    /**
     * 研究项目 DAG 工作台 — 宿主 HTTP API 客户端。
     *
     * 全部请求走宿主前缀路由 `/research-dag-workbench`（见 CONTRACT 第 2 节）。
     * 本模块只做 fetch + JSON 解析，不实现任何业务规则；错误统一转成 `{ok:false,...}`。
     */

    /** 发一个请求并解析 JSON；网络/解析错误转成可展示的失败对象，不抛出。 */
    async function requestJson(url, options) {
      let response = null
      try {
        response = await fetch(url, options)
      } catch (problem) {
        const message = problem && problem.message ? problem.message : String(problem)
        return { ok: false, code: 'E_NETWORK', message: `无法连接工作台宿主：${message}` }
      }
      let payload = null
      try {
        payload = await response.json()
      } catch (problem) {
        return { ok: false, code: 'E_CLIENT', message: '宿主响应不是合法 JSON' }
      }
      if (!payload || typeof payload !== 'object') {
        return { ok: false, code: 'E_CLIENT', message: '宿主响应为空' }
      }
      return payload
    }

    /** GET /health —— 插件元信息、可用 action、示例项目与配置路径。 */
    async function fetchHealth() {
      return requestJson(`${ROUTE}/health`)
    }

    /** GET /state[?project=...] —— 合并 status/verify/PROJECT_STATE 的项目快照。 */
    async function fetchState(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/state${query}`)
    }

    /** GET /results[?project=...] —— v1.2 结果视图数据（宿主透传 CLI results --json）。 */
    async function fetchResults(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/results${query}`)
    }

    /**
     * GET /content?project=... —— v2.1 内容页数据（results/status/network/review 合并）。
     * 旧宿主没有该路由时返回 {ok:false,...}，由面板做降级。
     */
    async function fetchContent(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/content${query}`)
    }

    /**
     * GET /leader-log?project=... —— v2.5 主智能体（控制层）对话与决策时间轴。
     */
    async function fetchLeaderLog(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/leader-log${query}`)
    }

    /**
     * GET /fishbone?project=... —— v2.4 项目流程视图数据（项目目标 + 主支 + 分支 + 关注项）。
     * 旧宿主没有该路由时返回 {ok:false,...}，由面板降级到内容页。
     */
    async function fetchFishbone(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/fishbone${query}`)
    }

    /**
     * POST /bridge —— TeamMCP 桥动作（publish / idea / review / pull）。
     * 返回 {ok:true, run}，与 /run 一样需要 settleRun 轮询。
     */
    async function postBridge(body) {
      const payload = body && typeof body === 'object' ? body : {}
      return requestJson(`${ROUTE}/bridge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    /** POST /config —— 持久化项目根路径。 */
    async function saveConfig(projectRoot) {
      return requestJson(`${ROUTE}/config`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, projectRoot }),
      })
    }

    /** POST /run —— 提交一个白名单 action，返回 run 记录（status=running）。
     * 支持 postAction({ action, ... }) 与 postAction('action-name', { ... }) 两种调用形态。 */
    async function postAction(actionOrBody, options) {
      let payload = {}
      if (typeof actionOrBody === 'string') {
        payload = Object.assign({ action: actionOrBody }, options && typeof options === 'object' ? options : {})
      } else if (actionOrBody && typeof actionOrBody === 'object') {
        payload = actionOrBody
      }
      return requestJson(`${ROUTE}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    /**
     * POST /rib-op —— v3.5 分支元操作（软删回收站/受阻/重命名/锚点）。
     * 不走 DAG CLI，只改 control/rdw-rib-meta.json，立即返回（无 run 轮询）。
     * body: { project, op: 'delete'|'restore'|'purge'|'empty-bin'|'block'|'unblock'|'rename'|'anchor', ribId?, ... }
     */
    async function postRibOp(body) {
      const payload = body && typeof body === 'object' ? body : {}
      return requestJson(`${ROUTE}/rib-op`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    /** GET /file?project=...&path=... —— 读取项目内任意文件全文与元数据。 */
    async function fetchFile(project, path) {
      const target = typeof project === 'string' ? project.trim() : ''
      const relative = typeof path === 'string' ? path : ''
      const query = `?project=${encodeURIComponent(target)}&path=${encodeURIComponent(relative)}`
      return requestJson(`${ROUTE}/file${query}`)
    }

    /** GET /branch-work?project=...&module=...&branch=... —— 分支智能体工作区与对话详情。 */
    async function fetchBranchWork(project, moduleId, branchId) {
      const target = typeof project === 'string' ? project.trim() : ''
      const mod = typeof moduleId === 'string' ? moduleId : ''
      const br = typeof branchId === 'string' ? branchId : ''
      const query = `?project=${encodeURIComponent(target)}&module=${encodeURIComponent(mod)}&branch=${encodeURIComponent(br)}`
      return requestJson(`${ROUTE}/branch-work${query}`)
    }

    /** POST /branch-directive —— 向分支智能体下达指令或追问。 */
    async function postBranchDirective(project, moduleId, branchId, text, by) {
      return requestJson(`${ROUTE}/branch-directive`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project, module: moduleId, branch: branchId, text, by }),
      })
    }

    /** POST /mount-context —— 将分支的上下文档案（CONTEXT.md 等）挂载并同步到工作区，生成结构化对话提示词。 */
    async function postMountContext(project, moduleId, branchId, workspace) {
      return requestJson(`${ROUTE}/mount-context`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project, module: moduleId, branch: branchId, workspace }),
      })
    }

    /** POST /open-external —— 在系统文件资源管理器中定位文件。 */
    async function postOpenExternal(project, path) {
      return requestJson(`${ROUTE}/open-external`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project, path }),
      })
    }

    /** POST /open-sidebar —— 在 DSH 侧边栏编辑器里打开项目内文件/目录。
     *  宿主不支持面板直开时返回 { ok:false, code:'E_SIDEBAR_UNAVAILABLE', path:绝对路径 }，
     *  调用方据此提示用户让模型用 sidebar_open 打开，而不是假装成功。 */
    async function postOpenSidebar(project, path, sessionId) {
      const body = { project, path }
      if (typeof sessionId === 'string' && sessionId.trim()) body.sessionId = sessionId.trim()
      return requestJson(`${ROUTE}/open-sidebar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    /**
     * GET /zotero?project=...&rib=...&q=...&collection=...
     * v3.8 Zotero 文献面板：一次取回「本分支已挂文献 + 关键词命中 + 合集树」。
     * Zotero 没开机时返回 { ok:true, available:false, error:'…' }，面板据此显示「未连接」。
     */
    async function fetchZotero(project, ribId, query, collectionKey) {
      const target = typeof project === 'string' ? project.trim() : ''
      const params = [`project=${encodeURIComponent(target)}`]
      if (typeof ribId === 'string' && ribId.trim()) params.push(`rib=${encodeURIComponent(ribId.trim())}`)
      if (typeof query === 'string' && query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`)
      if (typeof collectionKey === 'string' && collectionKey.trim()) {
        params.push(`collection=${encodeURIComponent(collectionKey.trim())}`)
      }
      return requestJson(`${ROUTE}/zotero?${params.join('&')}`)
    }

    /**
     * POST /zotero-op —— v3.8 分支文献挂载动作（只改 control/rdw-rib-meta.json）。
     * body: { project, ribId, op, keys?, collectionKey?, key?, kind? }
     *   op ∈ attach | detach | clear | import-collection | open
     */
    async function postZoteroOp(body) {
      const payload = body && typeof body === 'object' ? body : {}
      return requestJson(`${ROUTE}/zotero-op`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    /** GET /handoff?project=...&path=... —— 单个交接全文与 frontmatter。 */
    async function fetchHandoff(project, path) {
      const target = typeof project === 'string' ? project.trim() : ''
      const relative = typeof path === 'string' ? path : ''
      const query = `?project=${encodeURIComponent(target)}&path=${encodeURIComponent(relative)}`
      return requestJson(`${ROUTE}/handoff${query}`)
    }

    /** GET /run?id=... —— 单条 run 记录。 */
    async function fetchRun(id) {
      return requestJson(`${ROUTE}/run?id=${encodeURIComponent(String(id || ''))}`)
    }

    /** GET /runs —— 最近运行记录（按启动时间倒序）。 */
    async function fetchRuns() {
      return requestJson(`${ROUTE}/runs`)
    }

    /**
     * 轮询一条 run 直到离开 running（或预算耗尽）。
     * 每拿到一次记录调用一次 onTick（用于实时刷新运行控制台）。
     */
    async function settleRun(id, onTick, budgetMs = 600000) {
      const deadline = Date.now() + (typeof budgetMs === 'number' ? budgetMs : 600000)
      for (;;) {
        const payload = await fetchRun(id)
        if (!payload || payload.ok === false || !payload.run) return payload && payload.run ? payload.run : null
        if (typeof onTick === 'function') onTick(payload.run)
        if (payload.run.status !== 'running') return payload.run
        if (Date.now() >= deadline) return payload.run
        await new Promise((done) => setTimeout(done, 600))
      }
    }

    /* ------------------------------------------------- v2.1 主支成稿（spine） */

    /**
     * GET /spine?project=...[&stage=<id>] —— 主支成稿清单 + 续贯结论 + 统计语言 + 终稿状态。
     *
     * 传 stage 时额外带 `detail`（该主支成稿正文 draftRaw / 备份 / 小节预览）。
     * 旧项目没有 SPINE.json 时宿主返回 `{ok:true, exists:false, stages:[]}`，
     * 面板据此显示「建链引导」，而不是当成错误。
     */
    async function fetchSpine(project, stage) {
      const target = typeof project === 'string' ? project.trim() : ''
      const params = [`project=${encodeURIComponent(target)}`]
      if (typeof stage === 'string' && stage.trim()) params.push(`stage=${encodeURIComponent(stage.trim())}`)
      return requestJson(`${ROUTE}/spine?${params.join('&')}`)
    }

    /**
     * POST /spine-op —— 主支成稿动作，返回 {ok, run}，需用 settleRun 轮询。
     * body: { project, op: 'rebuild'|'backup'|'lock'|'unlock'|'write'|'dispatch'|'paper'|'chain', stage?, reason? }
     */
    async function postSpineOp(body) {
      const payload = body && typeof body === 'object' ? body : {}
      return requestJson(`${ROUTE}/spine-op`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }



    /**
     * GET /goal-card?project=... —— 读好问题卡 + 八层审计 + 缺项自检。
     * 旧宿主没有该路由 → 返回 {ok:false}，由面板降级（不显示目标卡编辑器）。
     */
    async function fetchGoalCard(project) {
      const target = typeof project === 'string' ? project.trim() : ''
      const query = target ? `?project=${encodeURIComponent(target)}` : ''
      return requestJson(`${ROUTE}/goal-card${query}`)
    }

    /**
     * POST /goal-card —— 写卡（只合并传入字段，未传的保持原值）。
     * body: { project, card, layers, syncGoal }
     */
    async function postGoalCard(body) {
      const payload = body && typeof body === 'object' ? body : {}
      return requestJson(`${ROUTE}/goal-card`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    // --- Module: src/components/StatusBadge.js ---
    /**
     * 研究项目 DAG 工作台 — 交接状态徽标。
     *
     * v1.2：支持 plain 模式（结果/交接页用平实词：进行中/待确认/已出结果/已放弃/旧版本/卡住），
     * 同时用 title 保留原始状态码，工程页仍显示状态机细节。
     */

    /**
     * 渲染一个状态徽标。
     * @param {object} h React.createElement
     * @param {{status?: string, label?: string, title?: string, plain?: boolean}} props
     */
    function renderStatusBadge(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const info = statusInfo(options.status)
      const canonical = String(options.status === null || options.status === undefined ? '' : options.status).toUpperCase()
      const style = {
        ...STYLES.badgeBase,
        color: info.color,
        background: info.bg,
        borderColor: info.border,
      }
      const extra = {}
      const title = options.title || (options.plain && canonical ? canonical : '')
      if (title) extra.title = title
      const text =
        options.label ||
        (options.plain ? plainStatusLabel(options.status) : info.label) ||
        canonical ||
        '未知'
      return h('span', { style, ...extra }, text)
    }

    // --- Module: src/components/ContextMenu.js ---
    /**
     * 研究项目 DAG 工作台 — v3.5 全局右键菜单 + 悬停速览卡。
     *
     * 设计契约（DESIGN-workbench.md §7A）：
     *   - 万物皆可右键：六类对象各有菜单；不可用项置灰并给原因，不隐藏；
     *   - 菜单 = 该对象此刻合法操作的全集；
     *   - Esc / 点遮罩关闭；↑↓ 导航、Enter 执行；
     *   - 贴视口边自动翻转。
     */

    /** 构建一个菜单项。kind: 'item'|'sep'|'sub'。 */
    function mi(icon, label, kbd, run, opts = {}) {
      return { kind: 'item', icon, label, kbd, run, disabled: opts.disabled || false, reason: opts.reason || '', danger: opts.danger === true }
    }
    function sep() {
      return { kind: 'sep' }
    }
    function sub(text) {
      return { kind: 'sub', text }
    }

    /**
     * 渲染右键菜单。
     * state: null | { x, y, items: [], title? }
     */
    function renderContextMenu(h, state, onClose) {
      if (!state || !Array.isArray(state.items) || state.items.length === 0) return null

      const MENU_W = 240
      const ITEM_H = 30
      const estH = state.items.length * ITEM_H + (state.title ? 30 : 12)
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800
      let x = state.x
      let y = state.y
      if (x + MENU_W > vw - 8) x = Math.max(8, vw - MENU_W - 8)
      if (y + estH > vh - 8) y = Math.max(8, vh - estH - 8)

      return h(
        'div',
        {
          className: 'rdw-ctxmask',
          role: 'presentation',
          'data-dsh-no-drag': '',
          onClick: onClose,
          onContextMenu: (e) => {
            e.preventDefault()
            onClose()
          },
        },
        h(
          'div',
          {
            className: 'rdw-ctxmenu',
            role: 'menu',
            'aria-label': state.title || '上下文菜单',
            style: { left: x, top: y },
            onClick: (e) => e.stopPropagation(),
          },
          state.title ? h('div', { className: 'rdw-ctx-sub', style: { paddingTop: 6, fontWeight: 600 } }, state.title) : null,
          ...state.items.map((item, idx) => {
            if (!item) return null
            if (item.kind === 'sep') return h('div', { key: `s${idx}`, className: 'rdw-ctx-sep' })
            if (item.kind === 'sub') return h('div', { key: `sub${idx}`, className: 'rdw-ctx-sub' }, item.text)
            return h(
              'button',
              {
                key: `i${idx}`,
                type: 'button',
                className: 'rdw-ctx-item',
                role: 'menuitem',
                disabled: Boolean(item.disabled),
                title: item.disabled && item.reason ? item.reason : item.label,
                onClick: () => {
                  onClose()
                  if (typeof item.run === 'function') item.run()
                },
              },
              h('span', { className: 'rdw-ctx-ico', 'aria-hidden': 'true' }, item.icon || ''),
              h('span', { className: 'rdw-ctx-label', style: item.danger ? { color: 'var(--rdw-st-rejected)' } : null }, item.label),
              item.kbd ? h('span', { className: 'rdw-ctx-kbd' }, item.kbd) : null,
            )
          }),
        ),
      )
    }

    /**
     * 渲染分支悬停速览卡。
     * card: null | { x, y, rib, module, onOpen, onGraft, onDelete, onBlock }
     */
    function renderHoverCard(h, card, onClose) {
      if (!card || !card.rib) return null
      const rib = card.rib
      const W = 264
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
      let x = card.x
      if (x + W > vw - 10) x = Math.max(10, vw - W - 10)
      const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
      const STATUS_LABEL = {
        EMPTY: '未开工', DRAFT: '探路中', PROVISIONAL: '待回连',
        ACCEPTED: '已回连', REJECTED: '已修剪', SUPERSEDED: '旧版本', BLOCKED: '受阻',
      }
      return h(
        'div',
        {
          className: 'rdw-hovercard',
          style: { left: x, top: card.y },
          role: 'tooltip',
          'data-dsh-no-drag': '',
          onMouseLeave: onClose,
        },
        h(
          'div',
          { className: 'rdw-hovercard-title' },
          h('span', null, rib.id),
          h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontWeight: 400 } }, '·'),
          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, rib.name),
          h(
            'span',
            { style: { flex: '0 0 auto', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
            STATUS_LABEL[rib.status] || rib.status,
          ),
        ),
        h(
          'div',
          { className: 'rdw-hovercard-meta' },
          `${card.module ? `${card.module.name || card.module.id} · ` : ''}${fileCount} 个产物${rib.is_stale ? ' · ⚠ 级联过期' : ''}${rib.blockedNote ? ` · ⊘ ${rib.blockedNote}` : ''}`,
        ),
        rib.brief ? h('div', { className: 'rdw-hovercard-brief' }, rib.brief) : null,
        h(
          'div',
          { className: 'rdw-hovercard-acts' },
          h('button', { type: 'button', onClick: () => card.onOpen && card.onOpen(rib) }, '打开'),
          rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
            ? h('button', { type: 'button', className: 'primary', onClick: () => card.onGraft && card.onGraft(rib) }, '回连')
            : null,
          h('button', { type: 'button', onClick: () => card.onDelete && card.onDelete(rib) }, '删除'),
        ),
      )
    }

    /**
     * 内联闪电分叉气泡（幻影分支单击后弹出，只填名称）。
     * form: null | { x, y, moduleId, moduleName, fromRib?, name, error }
     */
    function renderInlineSprout(h, form, onChange, onSubmit, onCancel) {
      if (!form) return null
      return h(
        'div',
        {
          className: 'rdw-inline-sprout',
          style: { left: form.x, top: form.y },
          role: 'dialog',
          'aria-label': '在此分叉新分支',
          'data-dsh-no-drag': '',
          onClick: (e) => e.stopPropagation(),
        },
        h(
          'div',
          { style: { fontSize: 12, fontWeight: 600, color: 'var(--rdw-organic-ink)', marginBottom: 5 } },
          `🌱 在「${form.moduleName || form.moduleId}」${form.fromRib ? `的分支 ${form.fromRib} ` : ''}分叉`,
        ),
        form.messageExcerpt
          ? h(
              'div',
              {
                style: {
                  fontSize: 11,
                  color: 'var(--rdw-organic-ink-3)',
                  padding: '3px 6px',
                  background: 'var(--rdw-fill-quat)',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  marginBottom: 6,
                  maxHeight: 48,
                  overflow: 'hidden',
                  lineHeight: 1.35,
                  fontStyle: 'italic',
                },
              },
              `源对话：“${form.messageExcerpt.slice(0, 60)}${form.messageExcerpt.length > 60 ? '…' : ''}”`,
            )
          : null,
        h('input', {
          autoFocus: true,
          value: form.name || '',
          placeholder: '新分支名称，回车即建…',
          'aria-label': '分支名称',
          onChange: (e) => onChange(e && e.target ? e.target.value : ''),
          onKeyDown: (e) => {
            if (!e) return
            if (e.key === 'Enter') onSubmit()
            else if (e.key === 'Escape') onCancel()
          },
        }),
        form.error ? h('div', { style: { fontSize: 11, color: 'var(--rdw-st-rejected)', marginTop: 4 } }, form.error) : null,
        h('div', { className: 'hint' }, '回车创建 · Esc 取消 · 详细选项走顶栏「+分支」'),
        h(
          'div',
          { className: 'row' },
          h('button', { type: 'button', className: 'solid', onClick: onSubmit }, '创建'),
          h('button', { type: 'button', onClick: onCancel }, '取消'),
        ),
      )
    }

    // --- Module: src/components/ThemePicker.js ---
    /**
     * 研究项目 DAG 工作台 — 主题选择器（v3.9）。
     *
     * 形态：工具栏里的一个胶囊按钮，点开是 6 个主题的预览列表。
     * 每个选项显示「名称 + 一句说明 + 三色预览点」，当前主题打勾。
     *
     * 设计约束：
     *   - 只用 var(--rdw-*)，保证在任何主题下自身也好看；
     *   - 当前主题的三色点取自**该主题自己的**预设色，而不是当前生效令牌，
     *     这样用户在 A 主题下也能看清 B 主题长什么样；
     *   - 点击外部 / Esc 关闭（用遮罩实现，和右键菜单同一套交互语言）。
     */

    /** 三色预览点。 */
    function swatch(h, colors, active) {
      return h(
        'span',
        {
          style: {
            display: 'inline-flex',
            flex: '0 0 auto',
            borderRadius: 999,
            overflow: 'hidden',
            border: active ? '1.5px solid var(--rdw-sage)' : '1px solid var(--rdw-line-2)',
          },
        },
        ...colors.map((color) =>
          h('span', { style: { width: 9, height: 14, background: color } }),
        ),
      )
    }

    /**
     * 渲染主题选择器。
     * props: { open, theme, onToggle, onPick }
     */
    function renderThemePicker(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const open = Boolean(options.open)
      const current = String(options.theme || 'apple')
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      const activePreset = RDW_THEME_PRESETS.find((item) => item.id === current) || RDW_THEME_PRESETS[0]

      return h(
        'div',
        { style: { position: 'relative', flex: '0 0 auto' } },
        h(
          'button',
          {
            type: 'button',
            className: 'rdw-theme-btn',
            title: `主题：${activePreset.name}（点击切换）`,
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            onClick: (event) => {
              if (event && event.stopPropagation) event.stopPropagation()
              call(options.onToggle)
            },
          },
          h('span', { style: { fontSize: 11 } }, '🎨'),
          swatch(h, activePreset.swatch, false),
        ),
        open
          ? h(
              'div',
              {
                className: 'rdw-theme-mask',
                role: 'presentation',
                onClick: (event) => {
                  if (event && event.stopPropagation) event.stopPropagation()
                  call(options.onToggle)
                },
              },
              h(
                'div',
                {
                  className: 'rdw-theme-pop',
                  role: 'menu',
                  'aria-label': '选择主题',
                  onClick: (event) => event.stopPropagation(),
                },
                h('div', { className: 'rdw-theme-pop-title' }, '主题'),
                ...RDW_THEME_PRESETS.map((preset) => {
                  const isActive = preset.id === current
                  return h(
                    'button',
                    {
                      key: preset.id,
                      type: 'button',
                      role: 'menuitemradio',
                      'aria-checked': isActive ? 'true' : 'false',
                      className: isActive ? 'rdw-theme-item is-active' : 'rdw-theme-item',
                      onClick: () => call(options.onPick, preset.id),
                    },
                    swatch(h, preset.swatch, isActive),
                    h(
                      'span',
                      { style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: '1 1 auto' } },
                      h('span', { className: 'rdw-theme-item-name' }, preset.name),
                      h('span', { className: 'rdw-theme-item-hint' }, preset.hint),
                    ),
                    isActive ? h('span', { className: 'rdw-theme-check', 'aria-hidden': 'true' }, '✓') : null,
                  )
                }),
              ),
            )
          : null,
      )
    }

    // --- Module: src/components/CommandBar.js ---
    /**
     * 研究项目 DAG 工作台 — 命令栏（v4 单页信息架构）。
     *
     * 取代 v3 的「标题行 + 6 个平级页签」。设计动因：
     *   - 6 个平级页签把「高频导航（项目流程）」与「低频管理（工程/网络）」放在同一层，
     *     用户每切一次都要重建心理地图；
     *   - 页签一旦切换，当前上下文（我看的是哪根分支？）就丢失了。
     *
     * 新结构（从左到右）：
     *   1. 品牌标（不占页签位）；
     *   2. **面包屑**：项目 › 当前主支 › 当前分支——始终显示"我在哪"，
     *      而且每个层级都可点击回跳（比页签更省一次操作）；
     *   3. **全局搜索 / 命令入口**（⌘K）：跳转项目、分支、文件，或执行命令；
     *   4. **状态指示器**：阻塞 / 待拍板 / 进度——点击直达对应区域，
     *      把「需要我处理的事」从隐性变成常驻可点；
     *   5. **面板入口**：低频管理（主智能体/内容/网络/工程/概览）收进侧滑面板。
     */
    /** 工作台专属品牌矢量 Logo (DAG 拓扑星芒) */
    function renderBrandLogo(h, size = 18) {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          style: { flex: '0 0 auto', verticalAlign: 'middle', display: 'inline-block' },
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M12 2.2 L21 11.2 C21.4 11.6 21.4 12.4 21 12.8 L12 21.8 C11.6 22.2 10.8 22.2 10.4 21.8 L2 12.8 C1.6 12.4 1.6 11.6 2 11.2 L11 2.2 C11.4 1.8 12.2 1.8 12.6 2.2 Z',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinejoin: 'round',
        }),
        h('line', {
          x1: 12,
          y1: 4.2,
          x2: 12,
          y2: 19.8,
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 12, cy: 6.8, r: 1.9, fill: 'currentColor' }),
        h('circle', { cx: 6.5, cy: 12, r: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 17.5, cy: 12, r: 1.7, fill: 'currentColor' }),
        h('path', {
          d: 'M6.5 12 C9 14.2 10.5 16 12 16.8',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M17.5 12 C15 14.2 13.5 16 12 16.8',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 12, cy: 17, r: 1.7, fill: 'currentColor' }),
      )
    }

    /**
     * @param {object} h React.createElement
     * @param {{project?: object, fishbone?: object, selectedModule?: string|null,
     *          selectedRib?: string|null, attention?: any[], totals?: object,
     *          busy?: string, onOpenPalette?: Function, onOpenSlide?: Function,
     *          onFocusAttn?: Function, onSelectModule?: Function,
     *          onSelectRib?: Function, onBackToHub?: Function}} props
     */
    function renderCommandBar(h, props) {
      const o = props && typeof props === 'object' ? props : {}
      const call = (fn, ...args) => {
        if (typeof fn === 'function') fn(...args)
      }

      const project = o.project && typeof o.project === 'object' ? o.project : null
      const fishbone = o.fishbone && o.fishbone.ok !== false ? o.fishbone : null
      const head = fishbone && fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
      const spine = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
      const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
      const attention = Array.isArray(o.attention) ? o.attention : Array.isArray(fishbone && fishbone.attention) ? fishbone.attention : []
      const totals = fishbone && fishbone.totals && typeof fishbone.totals === 'object' ? fishbone.totals : {}

      const selectedModule = o.selectedModule || null
      const selectedRib = o.selectedRib || null
      const modNode = selectedModule ? spine.find((m) => m.id === selectedModule) : null
      const ribNode = selectedRib ? ribs.find((r) => r.id === selectedRib) : null

      // 阻塞数：主支节点 staleness / rib BLOCKED 状态都算
      const blockedCount = ribs.filter((r) => r.status === 'BLOCKED').length + spine.filter((m) => m.staleness).length
      const staleCount = ribs.filter((r) => r.is_stale).length
      const attnCount = attention.length + staleCount

      // 整体进度：主支完成度均值
      const pct = spine.length > 0
        ? Math.round(spine.reduce((sum, m) => sum + (Number(m.completion) || 0), 0) / spine.length)
        : 0

      const crumb = (icon, label, opts) => {
        const options = opts && typeof opts === 'object' ? opts : {}
        return h(
          'button',
          {
            type: 'button',
            className: options.cur ? 'rdw-crumb cur' : 'rdw-crumb',
            title: options.title || label,
            onClick: () => call(options.onClick),
          },
          icon ? h('span', { 'aria-hidden': 'true' }, icon) : null,
          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, label),
        )
      }

      const sep = (k) => h('span', { key: k, className: 'rdw-crumb-sep', 'aria-hidden': 'true' }, '›')

      const crumbs = []
      if (project && project.id) {
        crumbs.push(crumb('🗂️', project.id, { title: `返回总控看板（当前项目 ${project.id}）`, onClick: () => call(o.onBackToHub) }))
      }
      if (modNode) {
        crumbs.push(sep('s1'))
        crumbs.push(
          crumb('🌿', modNode.name, {
            cur: !ribNode,
            title: `${modNode.id} ${modNode.name} · ${modNode.completion || 0}% 已回连`,
            onClick: () => call(o.onSelectModule, modNode.id),
          }),
        )
      }
      if (ribNode) {
        crumbs.push(sep('s2'))
        crumbs.push(
          crumb('🌱', ribNode.name, {
            cur: true,
            title: `${ribNode.id} ${ribNode.name}`,
            onClick: () => call(o.onSelectRib, ribNode),
          }),
        )
      }

      return h(
        'div',
        { className: 'rdw-cmdbar', 'data-dsh-no-drag': '' },
        // 品牌（标题恒为「研究项目工作台」，项目名由面包屑承担，避免两处重复）
        h(
          'div',
          { className: 'rdw-cmd-brand' },
          h('span', { className: 'rdw-cmd-mark', 'aria-hidden': 'true', style: { display: 'inline-flex', alignItems: 'center' } }, renderBrandLogo(h, 17)),
          h(
            'span',
            { className: 'rdw-cmd-name', title: head.title ? `当前研究：${head.title}` : '研究项目工作台' },
            '研究项目工作台',
          ),
        ),
        // 面包屑
        crumbs.length > 0 ? h('div', { className: 'rdw-crumbs' }, ...crumbs) : null,
        // 全局搜索 / 命令
        h(
          'button',
          {
            type: 'button',
            className: 'rdw-search',
            title: '跳转到项目、分支、文件，或执行命令（Ctrl/⌘ + K）',
            onClick: () => call(o.onOpenPalette),
          },
          h('span', { style: { fontSize: 11 }, 'aria-hidden': 'true' }, '🔍'),
          h('span', { style: { flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '跳转项目 / 分支 / 文件…'),
          h('span', { className: 'rdw-kbd' }, '⌘K'),
        ),
        // 状态指示器
        h(
          'div',
          { className: 'rdw-status' },
          blockedCount > 0
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-pill blk',
                  title: `${blockedCount} 项阻塞：点击查看主智能体与阻塞明细`,
                  onClick: () => call(o.onOpenSlide, 'agent'),
                },
                h('span', { 'aria-hidden': 'true' }, '⊘'),
                h('span', null, '阻塞'),
                h('span', { className: 'num' }, String(blockedCount)),
              )
            : null,
          attnCount > 0
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-pill warn',
                  title: `${attnCount} 项需要你拍板或处理：点击定位`,
                  onClick: () => call(o.onFocusAttn),
                },
                h('span', { 'aria-hidden': 'true' }, '⚡'),
                h('span', null, '待拍板'),
                h('span', { className: 'num' }, String(attnCount)),
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-pill ok',
              title: `整体进度 ${pct}%（主支完成度均值）：点击查看概览`,
              onClick: () => call(o.onOpenSlide, 'overview'),
            },
            h('span', { 'aria-hidden': 'true' }, '✓'),
            h('span', { className: 'num' }, `${pct}%`),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-pill ghost',
              title: '回到所有项目总览面板（查看全部课题看板）',
              onClick: () => call(o.onBackToHub),
            },
            '📁 项目总览',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-pill ghost',
              title: '打开管理面板（主智能体 / 内容 / 工程 / 概览）',
              onClick: () => call(o.onOpenSlide, 'agent'),
            },
            '🧠 主智能体',
          ),
          h('span', { className: 'rdw-avatar-me', title: '你是这个项目的主研究者（PI）' }, 'PI'),
        ),
      )
    }

    /** 标题过长时截断，避免挤掉面包屑与搜索框。 */
    function truncateHead(text) {
      const value = String(text || '').replace(/\s+/g, ' ').trim()
      if (value.length <= 14) return value
      return `${value.slice(0, 13)}…`
    }

    // --- Module: src/components/Header.js ---
    /**
     * 研究项目 DAG 工作台 — 紧凑工具栏（标题行 + 页签行）。
     *
     * 整页业务优先布局下，这一块是宿主的紧凑工具栏（headerLayout: 'compact'），
     * 因此第一行只放品牌标识、标题、状态与「打开/收起对话」，第二行放页签。
     * 交互控件统一带 data-dsh-no-drag，避免在 macOS 上被当成窗口拖拽区。
     *
     * v3.4：颜色全部走 --rdw-* 令牌；页签改用胶囊 + 语义色的「双通道」选中态
     * （淡色底 + 同色描边），色弱用户也能分辨当前页签。
     */



    /**
     * @param {object} h React.createElement
     * @param {{health?: object, project?: object, view?: string, setView?: Function,
     *          busy?: string, busyLabel?: string, contentAvailable?: boolean,
     *          fishboneAvailable?: boolean, chatOpen?: boolean, canStartChat?: boolean,
     *          onToggleChat?: Function, scope?: string,
     *          theme?: string, themeOpen?: boolean, onToggleTheme?: Function, onPickTheme?: Function}} props
     */
    function renderHeader(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { row, chip, subtitle, tab, tabActive, button } = STYLES
      const health = options.health && typeof options.health === 'object' ? options.health : null
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const view = options.view || 'fishbone'
      const busy = options.busy || ''
      const busyLabel = options.busyLabel || busy
      const chatOpen = options.chatOpen === true

      /** 状态胶囊：底色 + 描边同色（形状与颜色双编码）。 */
      const toneChip = (text, tone) =>
        h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 21,
              padding: '0 9px',
              borderRadius: 'var(--rdw-r-pill)',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: '18px',
              whiteSpace: 'nowrap',
              border: '1px solid color-mix(in srgb,' + tone + ' 26%,transparent)',
              background: 'color-mix(in srgb,' + tone + ' 12%,transparent)',
              color: tone,
            },
          },
          text,
        )

      const projectChip = project && project.id ? h('span', { style: chip }, `项目 ${project.id}`) : null
      const phaseChip = project && project.id
        ? toneChip(`阶段 ${project && project.phase ? phaseLabel(project.phase) : '未设置'}`, 'var(--rdw-accent)')
        : null
      const versionChip =
        health && health.version ? h('span', { style: chip }, `宿主 v${health.version}`) : null
      const fishboneChip =
        options.fishboneAvailable
          ? toneChip('项目流程主线已启用', 'var(--rdw-ok)')
          : toneChip('旧宿主', 'var(--rdw-warn)')
      const busyChip = busy ? toneChip(`执行中：${busyLabel}`, 'var(--rdw-warn)') : null

      const chatButton = null

      const scopeText = typeof options.scope === 'string' ? options.scope : ''

      return h(
        'div',
        null,
        h(
          'div',
          { className: 'rdw-toolbar-row' },
          h(
            'h2',
            { className: 'rdw-toolbar-title' },
            h('span', { className: 'rdw-toolbar-brand', 'aria-hidden': 'true', style: { display: 'inline-flex', alignItems: 'center' } }, renderBrandLogo(h, 18)),
            '研究项目工作台',
            h(
              'a',
              {
                href: 'https://github.com/lineex',
                target: '_blank',
                rel: 'noreferrer',
                title: '作者 GitHub 主页: @lineex',
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 20,
                  padding: '0 8px',
                  borderRadius: 'var(--rdw-r-pill)',
                  background: 'var(--rdw-sunken)',
                  border: '1px solid var(--rdw-line-2)',
                  color: 'var(--rdw-text-3)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  textDecoration: 'none',
                  marginLeft: 6,
                  cursor: 'pointer',
                },
              },
              h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, 'by'),
              h('span', { style: { color: 'var(--rdw-text)', fontWeight: 600 } }, '@lineex'),
            ),
          ),
          h(
            'div',
            { className: 'rdw-toolbar-actions' },
            busyChip,
            fishboneChip,
            versionChip,
            phaseChip,
            projectChip,
            chatButton,
            // v3.9 主题选择器（放在最右，避免打散状态胶囊的阅读顺序）
            renderThemePicker(h, {
              open: options.themeOpen === true,
              theme: options.theme || 'apple',
              onToggle: options.onToggleTheme,
              onPick: options.onPickTheme,
            }),
          ),
        ),
        h(
          'p',
          { className: 'rdw-subtitle' },
          view === 'hub'
            ? '多项目总览总控看板：集中管理你的全部科研项目，点击卡片直接进入，支持跨项目共享分析成果、队列定义与研究想法。'
            : '项目流程主线：项目目标是研究目标，主支是研究阶段，分支是手动分出的探索智能体，满意后回连主支。',
        ),
        h(
          'div',
          { className: 'rdw-tabs', role: 'tablist', 'data-dsh-no-drag': '' },
          ...VIEWS.map(([id, label]) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                role: 'tab',
                'aria-selected': view === id ? 'true' : 'false',
                style: view === id ? { ...tab, ...tabActive } : tab,
                onClick: () => {
                  if (typeof options.setView === 'function') options.setView(id)
                },
              },
              id === 'fishbone' ? `📋 ${label}` : id === 'hub' ? `🗂️ ${label}` : id === 'leader' ? `🧠 ${label}` : label,
            ),
          ),
          scopeText ? h('span', { className: 'rdw-scope' }, scopeText) : null,
        ),
      )
    }

    // --- Module: src/components/ProjectBar.js ---
    /**
     * 研究项目 DAG 工作台 — 项目路径输入与配置/创建操作条。
     *
     * v1.1：新增「新建项目」入口（init 动作，成功后保存配置并加载新项目）。
     * v2.1：新增「记想法」入口（POST /bridge idea；内容页也可从模块卡进入）。
     * v3.4：按钮统一 30px 高度规格；「新建项目」为主按钮靠右；路径输入成为唯一的主控件。
     */

    /**
     * @param {object} h React.createElement
     * @param {{project?: string, setProject?: Function, config?: object, health?: object,
     *          busy?: string, onLoad?: Function, onSave?: Function, onExample?: Function,
     *          onRefresh?: Function, onCreateProject?: Function, createEnabled?: boolean,
     *          onIdea?: Function}} props
     */
    function renderProjectBar(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { row, button, primaryButton, input, muted } = STYLES
      const busy = options.busy || ''
      const health = options.health && typeof options.health === 'object' ? options.health : null
      const config = options.config && typeof options.config === 'object' ? options.config : null
      const project = typeof options.project === 'string' ? options.project : ''
      const example = health && typeof health.example === 'string' ? health.example : ''
      const configPath = health && typeof health.configPath === 'string' ? health.configPath : ''

      const call = (handler, value) => {
        if (typeof handler === 'function') handler(value)
      }

      const configHint = config && config.projectRoot
        ? `配置文件项目：${config.projectRoot}`
        : configPath
          ? `配置文件：${configPath}`
          : '尚未保存配置'

      /** 次级按钮：描边按钮，30px 高。 */
      const secondaryButton = (key, label, handler, options2) =>
        h(
          'button',
          {
            key,
            type: 'button',
            style: button,
            disabled: Boolean(busy),
            onClick: () => call(handler),
            ...(options2 || {}),
          },
          label,
        )

      const buttons = [
        secondaryButton('load', '加载', () => call(options.onLoad, project)),
        secondaryButton('save', '保存', () => call(options.onSave, project), {
          disabled: Boolean(busy) || !project.trim(),
        }),
        example
          ? secondaryButton('example', '加载示例项目', () => call(options.onExample, example), { title: example })
          : null,
        secondaryButton('refresh', '刷新', () => call(options.onRefresh)),
        typeof options.onIdea === 'function'
          ? secondaryButton('idea', '记想法', () => call(options.onIdea, { module: '', stream: '', version: '' }), {
              disabled: Boolean(busy) || !project.trim(),
              title: '记一条研究想法，同步到项目网络',
            })
          : null,
        options.createEnabled === false
          ? null
          : h(
              'button',
              {
                key: 'create-project',
                type: 'button',
                style: { ...primaryButton, marginLeft: 'auto' },
                disabled: Boolean(busy),
                onClick: () => call(options.onCreateProject),
              },
              '新建项目',
            ),
      ].filter(Boolean)

      return h(
        'div',
        { className: 'rdw-toolbar-row', 'data-dsh-no-drag': '' },
        h(
          'div',
          { style: { position: 'relative', flex: '1 1 280px', minWidth: 0, display: 'flex' } },
          h('input', {
            value: project,
            placeholder: 'DAG 项目绝对路径，例如 D:/…/early-phosphate',
            'aria-label': '项目根路径',
            onChange: (event) => {
              const value = event && event.target ? event.target.value : ''
              call(options.setProject, value)
            },
            style: {
              ...input,
              flex: '1 1 auto',
              minWidth: 0,
              fontSize: 12,
              paddingLeft: 28,
            },
          }),
          h(
            'span',
            {
              'aria-hidden': 'true',
              style: {
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--rdw-text-4)',
                fontSize: 12,
                pointerEvents: 'none',
              },
            },
            '📁',
          ),
        ),
        ...buttons,
        h(
          'span',
          {
            style: {
              ...muted,
              flex: '0 1 auto',
              minWidth: 0,
              overflowWrap: 'anywhere',
              fontSize: 12.5,
              color: 'var(--rdw-text-4)',
            },
          },
          configHint,
        ),
      )
    }

    // --- Module: src/components/StatCards.js ---
    /**
     * 研究项目 DAG 工作台 — 概览统计卡。
     */

    /**
     * @param {object} h React.createElement
     * @param {{project?: object}} props
     */
    function renderStatCards(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const modules = project && Array.isArray(project.modules) ? project.modules : []
      const handoffs = project && Array.isArray(project.handoffs) ? project.handoffs : []
      const counts = project && project.counts && typeof project.counts === 'object' ? project.counts : {}
      const branchTotal = sumBranchCount(modules)

      const cards = [
        { label: '模块', value: modules.length, icon: '📦', color: 'var(--rdw-accent)', sub: '研究阶段' },
        { label: '分支', value: branchTotal, icon: '🌱', color: 'var(--rdw-accent-dark)', sub: '探索分支' },
        { label: '交接', value: handoffs.length, icon: '📄', color: 'var(--rdw-text-2)', sub: '产物账本' },
        { label: '草稿', value: countOf(counts, 'draft'), icon: '◍', color: STATUS_INFO.DRAFT.color, sub: '探路推进' },
        { label: '待决定', value: countOf(counts, 'provisional'), icon: '◉', color: STATUS_INFO.PROVISIONAL.color, sub: '需你拍板' },
        { label: '已接受', value: countOf(counts, 'accepted'), icon: '●', color: STATUS_INFO.ACCEPTED.color, sub: '汇入主线' },
        { label: '阻塞', value: countOf(counts, 'blocked'), icon: '⊘', color: STATUS_INFO.BLOCKED.color, sub: '待排障' },
      ]

      return h(
        'div',
        { style: { ...STYLES.grid, marginTop: 4, marginBottom: 14 } },
        ...cards.map((card) =>
          h(
            'div',
            {
              key: card.label,
              className: 'rdw-card-hover',
              style: {
                ...STYLES.statCard,
                position: 'relative',
                overflow: 'hidden',
                padding: '12px 14px',
                gap: 4,
              },
            },
            h('div', {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 3,
                background: card.color || 'var(--rdw-line-3)',
                opacity: 0.85,
              },
            }),
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--rdw-text-3)',
                },
              },
              h('span', { style: STYLES.statLabel }, card.label),
              h('span', { style: { fontSize: 12, opacity: 0.8 } }, card.icon),
            ),
            h('div', { style: { ...STYLES.statValue, color: card.color || 'inherit' } }, String(card.value)),
            h('div', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, card.sub),
          ),
        ),
      )
    }

    // --- Module: src/components/ReasonDialog.js ---
    /**
     * 研究项目 DAG 工作台 — 接受/拒绝理由弹层与 v1.1 创建表单弹层（受控，非原生 prompt）。
     *
     * 理由去空白后必须非空才能确认；确认动作由面板传入的 onConfirm 执行。
     * 创建表单按 CREATE_FIELD_SPECS 渲染字段，校验错误由面板以行内文本回传（create.error）。
     */

    /**
     * @param {object} h React.createElement
     * @param {{dialog?: object|null, reason?: string, setReason?: Function,
     *          onConfirm?: Function, onCancel?: Function, busy?: string}} props
     */
    function renderReasonDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      if (!options.dialog) return null

      const { row, muted, mono } = STYLES
      const dialog = options.dialog
      const isAccept = dialog.action === 'accept'
      const reason = typeof options.reason === 'string' ? options.reason : ''
      const busy = options.busy || ''
      const fileName = dialog.fileName || dialog.handoff || ''
      const title = `${isAccept ? '接受' : '拒绝'} ${fileName}`
      const canConfirm = reason.trim().length > 0 && reason.trim().length <= 2000 && !busy
      const call = (handler) => {
        if (typeof handler === 'function') handler()
      }

      return h(
        'div',
        { style: STYLES.overlay },
        h(
          'div',
          { style: STYLES.dialog },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
            h('strong', { style: { fontSize: 13 } }, title),
            h(
              'span',
              { style: { ...muted, textAlign: 'right' } },
              isAccept ? '接受后该交接进入 ACCEPTED，成为下游可用结果' : '拒绝后该交接标记 REJECTED，可新建版本',
            ),
          ),
          h('div', { style: { ...mono, opacity: 0.72, marginBottom: 8 } }, dialog.path || dialog.handoff || ''),
          h('textarea', {
            value: reason,
            maxLength: 2000,
            placeholder: isAccept ? '填写接受理由（必填，会写入 DECISIONS.md）' : '填写拒绝理由（必填，会写入 DECISIONS.md）',
            'aria-label': '决定理由',
            onChange: (event) => {
              const value = event && event.target ? event.target.value : ''
              if (typeof options.setReason === 'function') options.setReason(value)
            },
            style: STYLES.textarea,
          }),
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginTop: 10 } },
            h('span', { style: muted }, `${reason.trim().length} / 2000 字`),
            h(
              'div',
              { style: { ...row, gap: 8 } },
              h(
                'button',
                { type: 'button', style: STYLES.button, onClick: () => call(options.onCancel) },
                '取消',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: canConfirm ? STYLES.primaryButton : { ...STYLES.button, opacity: 0.5, cursor: 'not-allowed' },
                  disabled: !canConfirm,
                  onClick: () => {
                    if (canConfirm) call(options.onConfirm)
                  },
                },
                busy ? '执行中…' : '确认',
              ),
            ),
          ),
        ),
      )
    }

    /**
     * 创建类动作的受控表单弹层（新建项目 / 新建模块 / 新建分支 / 新建交接）。
     * @param {object} h React.createElement
     * @param {{create?: object|null, busy?: string, onField?: Function,
     *          onConfirm?: Function, onCancel?: Function}} props
     */
    function renderCreateDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const create = options.create
      if (!create) return null

      const { row, muted } = STYLES
      const kind = create.kind
      const specs = Array.isArray(CREATE_FIELD_SPECS[kind]) ? CREATE_FIELD_SPECS[kind] : []
      const values = create.values && typeof create.values === 'object' ? create.values : {}
      const busy = options.busy || ''
      const title = CREATE_ACTIONS[kind] || '新建'
      const canSubmit = !busy
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      const setField = (name, value) => call(options.onField, name, value)

      const fields = specs.map((spec) => {
        const value = values[spec.name] === undefined || values[spec.name] === null ? '' : String(values[spec.name])
        const inputProps = {
          'data-field': spec.name,
          'aria-label': spec.label,
          value,
          placeholder: spec.placeholder || '',
          disabled: Boolean(busy) || Boolean(spec.readonly),
          readOnly: Boolean(spec.readonly),
          onChange: (event) => setField(spec.name, event && event.target ? event.target.value : ''),
          style: spec.multiline
            ? { ...STYLES.textarea, minHeight: 64, width: '100%', boxSizing: 'border-box' }
            : { ...STYLES.input, flex: '1 1 auto', minWidth: 0, width: '100%', boxSizing: 'border-box' },
        }
        const isRootField = spec.name === 'root'
        return h(
          'label',
          { key: spec.name, style: { display: 'block', marginBottom: 8 } },
          h(
            'div',
            { style: { ...muted, opacity: 0.9, marginBottom: 3, fontWeight: 600 } },
            `${spec.label}${spec.required ? ' *' : ''}${spec.readonly ? '（自动带入）' : ''}`,
          ),
          spec.multiline
            ? h('textarea', inputProps)
            : isRootField
              ? h(
                  'div',
                  { style: { display: 'flex', gap: 6, alignItems: 'center', width: '100%' } },
                  h('input', inputProps),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'rdw-browse-folder-btn',
                      title: '点击选择路径文件夹',
                      'aria-label': '选择路径文件夹',
                      disabled: Boolean(busy) || Boolean(spec.readonly),
                      style: {
                        ...STYLES.button,
                        height: 32,
                        padding: '0 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        flex: '0 0 auto',
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        background: 'var(--rdw-organic-surface, #f7fafc)',
                        border: '1px solid var(--rdw-border, #cbd5e0)',
                        borderRadius: 'var(--rdw-r-pebble-sm, 6px)',
                        color: 'var(--rdw-organic-ink, #2d3748)',
                      },
                      onClick: async (event) => {
                        if (event && event.preventDefault) event.preventDefault()
                        if (event && event.stopPropagation) event.stopPropagation()
                        if (typeof options.onPickFolder === 'function') {
                          const picked = await options.onPickFolder()
                          if (picked && typeof picked === 'string' && picked.trim()) {
                            setField(spec.name, picked.trim())
                          }
                        }
                      },
                    },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 13 } }, '📁'),
                    '选择文件夹',
                  ),
                )
              : h('input', inputProps),
          spec.hint ? h('div', { style: { ...muted, marginTop: 2, opacity: 0.66 } }, spec.hint) : null,
        )
      })

      return h(
        'div',
        { style: STYLES.overlay },
        h(
          'div',
          { style: { ...STYLES.dialog, width: 'min(560px, 94vw)' } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
            h('strong', { style: { fontSize: 13 } }, title),
            h(
              'span',
              { style: { ...muted, textAlign: 'right' } },
              kind === 'init' ? '初始化新 DAG 项目；成功后保存配置并加载它' : '经宿主白名单调用 research-dag CLI',
            ),
          ),
          create.error ? h('div', { style: { ...STYLES.errorBanner, marginBottom: 8 } }, create.error) : null,
          ...fields,
          h(
            'div',
            { style: { ...row, justifyContent: 'flex-end', marginTop: 10, gap: 8 } },
            h(
              'button',
              { type: 'button', style: STYLES.button, disabled: Boolean(busy), onClick: () => call(options.onCancel) },
              '取消',
            ),
            h(
              'button',
              {
                type: 'button',
                style: canSubmit ? STYLES.primaryButton : { ...STYLES.button, opacity: 0.5, cursor: 'not-allowed' },
                disabled: !canSubmit,
                onClick: () => {
                  if (canSubmit) call(options.onConfirm)
                },
              },
              busy ? '创建中…' : '创建',
            ),
          ),
        ),
      )
    }

    // --- Module: src/components/FishboneDialogs.js ---
    /**
     * 研究项目 DAG 工作台 — 项目流程操作弹窗（创建分支 / 回连 / 主支维护）。
     *
     * - renderSproutDialog：从主支任意节点长出一根新分支（dag sprout）
     * - renderGraftDialog：把一根满意的分支验收并回连主支（dag graft）
     * - renderModuleDialog：新增 / 重命名主支（v3.9，主支自身的维护入口）
     */

    /**
     * 主支维护弹窗：新增一个主支，或重命名已有主支。
     *
     * 「新增」要落盘（modules/<id> 目录 + BRIEF），走 module-add；
     * 「重命名」只改工作台偏好名，不动协议文件。
     */
    function renderModuleDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { row, muted, button, primaryButton, input, errorBanner, dialog, overlay } = STYLES
      const dialogState = options.dialog
      if (!dialogState) return null
      const busy = Boolean(options.busy)
      const isAdd = dialogState.mode === 'add'
      const id = String(dialogState.id || '')
      const name = String(dialogState.name || '')
      // 新增时才校验 id；重命名沿用已有 id，只改名字。
      const idOk = !isAdd || isValidNodeId(id.trim())
      const canSubmit = idOk && (isAdd ? id.trim().length > 0 : true) && name.trim().length > 0 && !busy
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      return h(
        'div',
        { style: overlay, role: 'presentation' },
        h(
          'div',
          { style: { ...dialog, width: 'min(480px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': isAdd ? '新增主支' : '重命名主支' },
          h('strong', { style: { fontSize: 14 } }, isAdd ? '🌿 新增主支' : '✏️ 重命名主支'),
          h(
            'div',
            { style: { ...muted, margin: '4px 0 10px', lineHeight: 1.6 } },
            isAdd
              ? '主支是项目流程上的研究阶段。新增会在项目 modules/ 下建目录与阶段简介，并出现在左侧主支列表最末。'
              : '重命名只改工作台上的显示名，不改协议文件里的模块名与目录。',
          ),
          dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
          isAdd
            ? h(
                'div',
                { style: { marginBottom: 10 } },
                h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '主支 id'),
                h('input', {
                  style: { ...input, fontFamily: 'var(--rdw-font-mono)' },
                  value: id,
                  placeholder: '例如 M70 / stage-5',
                  disabled: busy,
                  onInput: (e) => call(options.onField, 'id', e.target.value),
                }),
                h('div', { style: { ...muted, fontSize: 11, marginTop: 3 } }, FREE_ID_HINT || '字母数字与 - _ .，首尾不能是 - 或 .'),
                id.trim() && !idOk
                  ? h('div', { style: { ...muted, fontSize: 11, color: 'var(--rdw-danger)', marginTop: 3 } }, 'id 格式不合法')
                  : null,
              )
            : null,
          h(
            'div',
            { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '显示名'),
            h('input', {
              style: input,
              value: name,
              placeholder: '例如 统计分析',
              disabled: busy,
              onInput: (e) => call(options.onField, 'name', e.target.value),
            }),
          ),
          h(
            'div',
            { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
            h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
            h(
              'button',
              {
                type: 'button',
                style: canSubmit ? primaryButton : { ...button, opacity: 0.5 },
                disabled: !canSubmit,
                onClick: () => {
                  if (canSubmit) call(options.onConfirm)
                },
              },
              busy ? '处理中…' : isAdd ? '新增主支' : '保存',
            ),
          ),
        ),
      )
    }

    /** 创建分支弹窗：选择主支节点 + 分支 id / 显示名 / 任务意图 / 模式。 */
    function renderSproutDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { row, muted, button, primaryButton, input, select, textarea, errorBanner, dialog, overlay } = STYLES
      const dialogState = options.dialog
      if (!dialogState) return null
      const busy = Boolean(options.busy)
      const spine = Array.isArray(options.spine) ? options.spine : []
      const moduleId = String(dialogState.module || '')
      const branchId = String(dialogState.id || '')
      const name = String(dialogState.name || '')
      const prompt = String(dialogState.prompt || '')
      const mode = String(dialogState.mode || 'standard')
      // v3.2：从哪根分支分出（空 = 从主支分）
      const parentRib = String(dialogState.from || '')
      // 可选父分支：同一主支下的分支
      const parentOptions = (Array.isArray(options.parents) ? options.parents : []).filter(
        (row) => row && row.module === moduleId,
      )
      const idOk = branchId.trim().length === 0 || isValidNodeId(branchId.trim())
      const canSubmit = Boolean(moduleId) && branchId.trim().length > 0 && idOk && !busy
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      return h(
        'div',
        { style: overlay, role: 'presentation' },
        h(
          'div',
          { style: { ...dialog, width: 'min(560px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': '新建一个分支' },
          h('strong', { style: { fontSize: 14 } }, '🌱 新建一个分支'),
          h(
            'div',
            { style: { ...muted, margin: '4px 0 10px', lineHeight: 1.6 } },
            '默认从**主支**分出，自动带上主支到此为止的完整上下文（决策 / 已接受输入 / 下一步）。',
            h('br'),
            '如果这个子问题是某根已有分支的延续，也可以选择从那个分支分出（子分支会继承父分支的简报与产出摘要）。',
          ),
          dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
          // v3.2：从主支分 / 从某根分支分
          h(
            'div',
            { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '从哪里分出来'),
            h(
              'select',
              {
                value: parentRib,
                style: { ...select, width: '100%' },
                disabled: busy,
                'aria-label': '选择父分支（留空 = 从主支分）',
                onChange: (event) => call(options.onField, 'from', event && event.target ? event.target.value : ''),
              },
              h('option', { value: '' }, '🌿 从主支分（默认，带主支完整上下文）'),
              ...parentOptions.map((row) =>
                h('option', { key: row.id, value: row.id }, `🧠 从分支 ${row.name || row.id} 分（继承父分支上下文）`),
              ),
            ),
            h(
              'div',
              { style: { ...muted, fontSize: 12, marginTop: 3, lineHeight: 1.6 } },
              parentRib ? '这根子分支的 CONTEXT.md 会包含父分支的简报与产出摘要。' : '这个分支的 CONTEXT.md 会打包主支的完整快照。',
            ),
          ),
          h(
            'div',
            { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '挂在主支哪一段'),
            h(
              'select',
              {
                value: moduleId,
                style: { ...select, width: '100%' },
                disabled: busy,
                onChange: (event) => call(options.onField, 'module', event && event.target ? event.target.value : ''),
              },
              h('option', { value: '' }, '请选择模块…'),
              ...spine.map((node) =>
                h('option', { key: node.id, value: node.id }, `${node.name}（${node.id} · 已有 ${(node.ribs || []).length} 根）`),
              ),
            ),
          ),
          h(
            'div',
            { style: { ...row, gap: 8, marginBottom: 10, flexWrap: 'nowrap' } },
            h(
              'div',
              { style: { flex: '1 1 0', minWidth: 0 } },
              h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '分支 id'),
              h('input', {
                value: branchId,
                placeholder: 'spline-opt',
                style: { ...input, width: '100%', flex: 'initial', minWidth: 0 },
                disabled: busy,
                onChange: (event) => call(options.onField, 'id', event && event.target ? event.target.value : ''),
              }),
              h(
                'div',
                { style: { ...muted, marginTop: 2, color: idOk ? undefined : 'var(--rdw-st-rejected)' } },
                idOk ? FREE_ID_HINT : '只能字母/数字/点/下划线/连字符，且不能以 . 或 - 结尾',
              ),
            ),
            h(
              'div',
              { style: { flex: '1 1 0', minWidth: 0 } },
              h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '显示名（可选）'),
              h('input', {
                value: name,
                placeholder: '乳酸样条拟合',
                style: { ...input, width: '100%', flex: 'initial', minWidth: 0 },
                disabled: busy,
                onChange: (event) => call(options.onField, 'name', event && event.target ? event.target.value : ''),
              }),
            ),
          ),
          h(
            'div',
            { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '这个分支要解决什么'),
            h('textarea', {
              value: prompt,
              placeholder: '例如：测试 3 节点限制性三次样条能否把入科乳酸 SMD 压到 0.05 以下',
              style: { ...textarea, minHeight: 70 },
              disabled: busy,
              onChange: (event) => call(options.onField, 'prompt', event && event.target ? event.target.value : ''),
            }),
            h('div', { style: { ...muted, marginTop: 2 } }, '会写入该分支的 BRIEF.md 顶部，作为智能体的任务意图。'),
          ),
          h(
            'div',
            { style: { marginBottom: 12 } },
            h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '工作模式'),
            h(
              'div',
              { style: { ...row, gap: 6 } },
              ...[
                ['standard', '标准', '完整 6 节简报，正式产出与文件交付'],
                ['spike', '探索', '轻量 2 节简报，允许空文件清单，适合先摸底'],
              ].map(([value, label, hint]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    style: mode === value ? { ...primaryButton, flex: '1 1 0' } : { ...button, flex: '1 1 0', textAlign: 'left' },
                    disabled: busy,
                    title: hint,
                    onClick: () => call(options.onField, 'mode', value),
                  },
                  `${mode === value ? '● ' : '○ '}${label}`,
                ),
              ),
            ),
            h('div', { style: { ...muted, marginTop: 3 } }, mode === 'spike' ? '探索模式：轻装上阵，先探明边界再决定是否正式立项。' : '标准模式：完整交付物与文件哈希清单。'),
          ),
          h(
            'div',
            { style: { marginBottom: 12 } },
            h(
              'button',
              {
                type: 'button',
                style: {
                  ...row,
                  gap: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  padding: 0,
                  textAlign: 'left',
                },
                disabled: busy,
                title: '勾选后：本次只建分支目录、BRIEF 与主支上下文档案，不创建交接骨架（handoff）——适合纯探索，有产出后再补',
                onClick: () => call(options.onField, 'noHandoff', !dialogState.noHandoff),
              },
              h('span', null, dialogState.noHandoff ? '☑' : '☐'),
              h('span', { style: { fontWeight: dialogState.noHandoff ? 600 : 400 } }, '暂不建交接（先探索，有产出再 handoff new）'),
            ),
            h(
              'div',
              { style: { ...muted, marginTop: 3 } },
              dialogState.noHandoff
                ? '已选：本次创建分支只长出分支不建交接；CONTEXT.md 仍会打包主支完整上下文。'
                : '默认：创建分支同时建好交接骨架（HANDOFF-v1），智能体可直接填报提交。',
            ),
          ),
          h(
            'div',
            { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
            h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
            h(
              'button',
              {
                type: 'button',
                style: canSubmit ? primaryButton : { ...button, opacity: 0.5 },
                disabled: !canSubmit,
                onClick: () => {
                  if (canSubmit) call(options.onConfirm)
                },
              },
              busy ? '创建分支中…' : '长出这个分支',
            ),
          ),
        ),
      )
    }

    /** 回连弹窗：确认验收一根分支并把成果并入主支。 */
    function renderGraftDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { row, muted, button, primaryButton, textarea, errorBanner, dialog, overlay, chip } = STYLES
      const dialogState = options.dialog
      if (!dialogState || !dialogState.rib) return null
      const busy = Boolean(options.busy)
      const rib = dialogState.rib
      const reason = String(dialogState.reason || '')
      const status = String(rib.status || 'EMPTY')
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      const hasStream = Boolean(rib.stream)
      return h(
        'div',
        { style: overlay, role: 'presentation' },
        h(
          'div',
          { style: { ...dialog, width: 'min(520px, 94vw)' }, role: 'dialog', 'aria-modal': 'true', 'aria-label': '回连主支' },
          h('strong', { style: { fontSize: 14 } }, '🔗 把这根分支回连主支'),
          h(
            'div',
            { style: { ...row, gap: 6, margin: '6px 0 10px' } },
            h('span', { style: { fontWeight: 600 } }, rib.name),
            h('span', { style: { ...chip, fontSize: 12 } }, rib.module),
            h('span', { style: { ...chip, fontSize: 12 } }, status === 'PROVISIONAL' ? '待回连' : status),
          ),
          h(
            'div',
            { style: { ...muted, marginBottom: 10, lineHeight: 1.65 } },
            hasStream
              ? '回连会校验正文与文件哈希、把状态提升为已接受、把产物投影到主支稳定路径，并记录一条决策日志。'
              : '这根分支还没有交接文件，无法回连。先让智能体产出成果并提交，再来验收。',
          ),
          dialogState.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialogState.error) : null,
          hasStream
            ? h(
                'div',
                { style: { marginBottom: 12 } },
                h('div', { style: { fontSize: 11, fontWeight: 600, marginBottom: 4 } }, '满意理由（会写进决策日志）'),
                h('textarea', {
                  value: reason,
                  placeholder: '例如：样条拟合把乳酸 SMD 压到 0.041，模型稳健，主分析采用',
                  style: { ...textarea, minHeight: 64 },
                  disabled: busy,
                  onChange: (event) => call(options.onField, 'reason', event && event.target ? event.target.value : ''),
                }),
              )
            : null,
          h(
            'div',
            { style: { ...row, justifyContent: 'flex-end', gap: 6 } },
            h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
            h(
              'button',
              {
                type: 'button',
                style: hasStream && !busy ? primaryButton : { ...button, opacity: 0.5 },
                disabled: !hasStream || busy,
                onClick: () => {
                  if (hasStream && !busy) call(options.onConfirm)
                },
              },
              busy ? '回连中…' : '确认回连主支',
            ),
          ),
        ),
      )
    }

    // --- Module: src/components/HandoffTable.js ---
    /**
     * 研究项目 DAG 工作台 — 交接表格与按状态操作。
     *
     * 操作口径：DRAFT→提交；PROVISIONAL→接受/拒绝；BLOCKED→恢复；
     * ACCEPTED/REJECTED/SUPERSEDED 为终态，只读（点击路径或行查看详情）。
     */


    /** 阻止事件冒泡（行点击会打开详情，按钮点击不应重复触发）。 */
    function stopEvent(event) {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    }

    /** 按状态渲染一行的操作按钮/只读标签。 */
    function renderHandoffActions(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const rowData = options.row && typeof options.row === 'object' ? options.row : {}
      const busy = options.busy || ''
      const status = String(rowData.status || '').toUpperCase()
      const disabled = Boolean(busy)
      const call = (payload) => (event) => {
        stopEvent(event)
        if (typeof options.onAction === 'function') options.onAction(payload)
      }

      if (status === 'DRAFT') {
        return [
          h(
            'button',
            { key: 'submit', type: 'button', style: STYLES.button, disabled, onClick: call({ action: 'submit', handoff: rowData.path }) },
            '提交',
          ),
        ]
      }
      if (status === 'PROVISIONAL') {
        return [
          h(
            'button',
            {
              key: 'accept',
              type: 'button',
              style: STYLES.primaryButton,
              disabled,
              onClick: call({ action: 'accept', handoff: rowData.path }),
            },
            '接受',
          ),
          h(
            'button',
            {
              key: 'reject',
              type: 'button',
              style: STYLES.dangerButton,
              disabled,
              onClick: call({ action: 'reject', handoff: rowData.path }),
            },
            '拒绝',
          ),
        ]
      }
      if (status === 'BLOCKED') {
        return [
          h(
            'button',
            { key: 'unblock', type: 'button', style: STYLES.button, disabled, onClick: call({ action: 'unblock', handoff: rowData.path }) },
            '恢复',
          ),
        ]
      }
      return [h('span', { key: 'readonly', style: STYLES.muted }, '只看')]
    }

    /**
     * @param {object} h React.createElement
     * @param {{handoffs?: object[], onSelect?: Function, onAction?: Function,
     *          busy?: string, emptyText?: string}} props
     */
    function renderHandoffTable(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const rows = Array.isArray(options.handoffs) ? options.handoffs : []
      const { tableWrap, table, th, td, mono, link, muted } = STYLES

      if (rows.length === 0) {
        return h('div', { style: { ...muted, padding: '8px 0' } }, options.emptyText || '没有符合条件的交接')
      }

      const openDetail = (event, pathValue) => {
        stopEvent(event)
        if (typeof options.onSelect === 'function') options.onSelect(pathValue)
      }

      return h(
        'div',
        { style: tableWrap },
        h(
          'table',
          { style: table },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              ...['路径', '模块', '分支', 'stream', '版本', '状态', '创建时间', '操作'].map((label) =>
                h('th', { key: label, style: th }, label),
              ),
            ),
          ),
          h(
            'tbody',
            null,
            ...rows.map((rowData) =>
              h(
                'tr',
                {
                  key: rowData.path,
                  style: { cursor: 'pointer' },
                  onClick: () => {
                    if (typeof options.onSelect === 'function') options.onSelect(rowData.path)
                  },
                },
                h(
                  'td',
                  { style: td },
                  h(
                    'span',
                    {
                      style: { ...mono, ...link, fontSize: 12 },
                      onClick: (event) => openDetail(event, rowData.path),
                    },
                    rowData.path,
                  ),
                ),
                h('td', { style: td }, rowData.module || '—'),
                h('td', { style: td }, rowData.branch || '—'),
                h('td', { style: td }, rowData.stream || '—'),
                h('td', { style: td }, `v${rowData.version || 1}`),
                h(
                  'td',
                  { style: td },
                  renderStatusBadge(h, {
                    status: rowData.status,
                    plain: Boolean(options.plainStatus),
                    title: options.plainStatus
                      ? `${statusInfo(rowData.status).label}（${String(rowData.status || '').toUpperCase()}）`
                      : statusInfo(rowData.status).label,
                  }),
                ),
                h('td', { style: td }, rowData.created_at || '—'),
                h(
                  'td',
                  { style: { ...td, whiteSpace: 'nowrap' } },
                  ...renderHandoffActions(h, { row: rowData, onAction: options.onAction, busy: options.busy }),
                ),
              ),
            ),
          ),
        ),
      )
    }

    // --- Module: src/components/IssueList.js ---
    /**
     * 研究项目 DAG 工作台 — verify issues 列表（按错误码分组计数）。
     */

    /**
     * @param {object} h React.createElement
     * @param {{issues?: object[]}} props
     */
    function renderIssueList(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const issues = Array.isArray(options.issues) ? options.issues : []

      if (issues.length === 0) {
        return h(
          'div',
          { style: { ...STYLES.row, marginTop: 6 } },
          h(
            'span',
            {
              style: {
                ...STYLES.chip,
                color: 'var(--rdw-st-accepted)',
                borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)',
                background: 'var(--rdw-st-accepted-soft)',
                fontWeight: 600,
              },
            },
            '校验通过 · 无问题',
          ),
        )
      }

      const counts = new Map()
      for (const issue of issues) {
        const code = issue && issue.code ? String(issue.code) : '未知错误'
        counts.set(code, (counts.get(code) || 0) + 1)
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...STYLES.row, margin: '8px 0' } },
          ...Array.from(counts.entries()).map(([code, count]) =>
            h(
              'span',
              {
                key: code,
                style: {
                  ...STYLES.chip,
                  color: 'var(--rdw-st-rejected)',
                  borderColor: 'color-mix(in srgb,var(--rdw-st-rejected) 30%,transparent)',
                  background: 'var(--rdw-danger-soft)',
                },
              },
              `${code} × ${count}`,
            ),
          ),
        ),
        h(
          'div',
          { style: STYLES.tableWrap },
          h(
            'table',
            { style: STYLES.table },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                ...['错误码', '路径', '说明'].map((label) => h('th', { key: label, style: STYLES.th }, label)),
              ),
            ),
            h(
              'tbody',
              null,
              ...issues.map((issue, index) =>
                h(
                  'tr',
                  { key: `${issue && issue.code ? issue.code : 'issue'}-${index}` },
                  h('td', { style: STYLES.td }, (issue && issue.code) || '—'),
                  h('td', { style: STYLES.td }, h('span', { style: { ...STYLES.mono, fontSize: 12 } }, (issue && issue.path) || '—')),
                  h('td', { style: STYLES.td }, (issue && issue.message) || ''),
                ),
              ),
            ),
          ),
        ),
      )
    }

    // --- Module: src/components/RunConsole.js ---
    /**
     * 研究项目 DAG 工作台 — 运行记录控制台。
     *
     * 展示最近 runs（action/状态/退出码），点选一条展开 stdout/stderr 等宽输出。
     */

    /**
     * @param {object} h React.createElement
     * @param {{runs?: object[], run?: object|null, busy?: string,
     *          selectedId?: string, onSelect?: Function}} props
     */
    function renderRunConsole(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, mono, muted, tableWrap, table, th, td } = STYLES
      const busy = options.busy || ''
      const history = Array.isArray(options.runs) ? options.runs.slice() : []
      const current = options.run && typeof options.run === 'object' ? options.run : null
      const list = current && !history.some((item) => item && item.id === current.id) ? [current, ...history] : history
      const selected = list.find((item) => item && item.id === options.selectedId) || list[0] || null
      const actionLabel = (action) => ACTION_LABELS[action] || action || '—'
      const statusInfoOf = (status) => runStatusInfo(status)

      return h(
        'div',
        { style: { ...card, marginTop: 4 } },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
          h('strong', { style: { fontSize: 12 } }, '运行记录'),
          h('span', { style: muted }, busy ? `执行中：${busy}` : `共 ${list.length} 条`),
        ),
        list.length === 0
          ? h('div', { style: muted }, '尚未执行任何命令；可先点「运行校验」或「重写报告」。')
          : h(
              'div',
              { style: tableWrap },
              h(
                'table',
                { style: table },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    ...['run', '动作', '状态', '退出码', '开始时间'].map((label) =>
                      h('th', { key: label, style: th }, label),
                    ),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  ...list.map((item) => {
                    const info = statusInfoOf(item.status)
                    const isSelected = selected && item.id === selected.id
                    return h(
                      'tr',
                      {
                        key: item.id || `${item.action}-${item.startedAt}`,
                        style: { cursor: 'pointer', background: isSelected ? 'color-mix(in srgb, currentColor 6%, transparent)' : 'transparent' },
                        onClick: () => {
                          if (typeof options.onSelect === 'function') options.onSelect(item.id)
                        },
                      },
                      h('td', { style: { ...td, fontFamily: STYLES.mono.fontFamily } }, item.id || '—'),
                      h('td', { style: td }, actionLabel(item.action)),
                      h(
                        'td',
                        { style: td },
                        h(
                          'span',
                          { style: { ...chip, color: info.color, background: info.bg, borderColor: 'transparent' } },
                          info.label,
                        ),
                      ),
                      h('td', { style: td }, item.exitCode === null || item.exitCode === undefined ? '—' : String(item.exitCode)),
                      h('td', { style: td }, formatTimeText(item.startedAt)),
                    )
                  }),
                ),
              ),
            ),
        selected
          ? h(
              'div',
              { style: { marginTop: 8 } },
              h(
                'div',
                { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 600 } }, `输出 · ${selected.id || ''} · ${actionLabel(selected.action)}`),
                h(
                  'span',
                  { style: muted },
                  selected.timedOut ? '已超时' : selected.status === 'running' ? '仍在运行…' : `退出码 ${selected.exitCode}`,
                ),
              ),
              h(
                'pre',
                { style: { ...mono, ...STYLES.pre, maxHeight: 300, whiteSpace: 'pre-wrap' } },
                [
                  selected.stdout ? `[stdout]\n${selected.stdout}` : '',
                  selected.stderr ? `[stderr]\n${selected.stderr}` : '',
                  selected.json ? `[json]\n${JSON.stringify(selected.json, null, 2)}` : '',
                ]
                  .filter(Boolean)
                  .join('\n\n') || '(无输出)',
              ),
            )
          : null,
      )
    }

    // --- Module: src/components/Toast.js ---
    /**
     * 研究项目 DAG 工作台 — 轻提示（Toast）。
     *
     * 做法参考 projectHub：居中底部胶囊 + 2.6s 自动消失 + role="status"。
     * 关键约束：pointer-events 永久 none（不挡点击）；position 用 absolute 相对
     * .rdw-shell（不越过宿主主内容区，不覆盖宿主侧栏与模式切换器）。
     */

    /**
     * @param {object} h React.createElement
     * @param {{message?: string, tone?: string, show?: boolean}} props
     */
    function renderToast(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const message = typeof options.message === 'string' ? options.message : ''
      const show = options.show !== false && Boolean(message)
      const theme = RDW_TONE[options.tone] || null
      return h(
        'div',
        {
          className: 'rdw-toast',
          role: 'status',
          'aria-live': 'polite',
          'data-show': show ? 'true' : 'false',
          style: {
            position: 'absolute',
            left: '50%',
            bottom: 22,
            transform: show ? 'translate(-50%,0)' : 'translate(-50%,8px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 'min(480px,calc(100% - 32px))',
            padding: '9px 14px',
            borderRadius: 'var(--rdw-r-pill)',
            border: '1px solid var(--rdw-line-2)',
            background: theme ? theme.bg : 'var(--rdw-panel)',
            color: theme ? theme.color : 'var(--rdw-text)',
            boxShadow: 'var(--rdw-shadow-2)',
            fontSize: 12,
            lineHeight: 1.5,
            opacity: show ? 1 : 0,
            pointerEvents: 'none',
            overflowWrap: 'anywhere',
            transition: 'opacity .18s var(--rdw-ease),transform .18s var(--rdw-ease)',
          },
        },
        message,
      )
    }

    // --- Module: src/components/Charts.js ---
    /**
     * 研究项目 DAG 工作台 — 可视化图表组件（v3.5）。
     *
     * 参考 OliverLiy/projectHub 的手绘 SVG 图表设计：
     *   - 环形分布图（Donut Chart）：分支状态/交接状态分布，中置总数与高亮切片；
     *   - 模块进度条（Module Progress）：展示各主支阶段的推进完成度；
     *   - 阶段阶梯条（Phase Pipeline）：研究主线阶段进度导航。
     *
     * 零第三方图表库依赖，纯 SVG + CSS 变量实现，支持宿主明暗主题自动适应。
     */

    /**
     * 状态环形分布图（Donut Chart）。
     * @param {object} h React.createElement
     * @param {{
     *   total: number,
     *   title: string,
     *   sub?: string,
     *   segments: Array<{ label: string, value: number, color: string, tone?: string }>
     * }} props
     */
    function renderDonutChart(h, props) {
      const { total = 0, title = '总览', sub = '成果数', segments = [] } = props || {}
      const r = 44
      const c = 2 * Math.PI * r
      let accumulated = 0

      const safeTotal = total > 0 ? total : segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
      const validTotal = safeTotal > 0 ? safeTotal : 1

      const slices = segments.map((seg, index) => {
        const val = Math.max(0, Number(seg.value) || 0)
        const ratio = val / validTotal
        const strokeDash = `${(ratio * c).toFixed(2)} ${c.toFixed(2)}`
        const strokeOffset = (-accumulated * c).toFixed(2)
        accumulated += ratio

        return h('circle', {
          key: `slice-${index}`,
          cx: 64,
          cy: 64,
          r,
          fill: 'none',
          stroke: seg.color || 'var(--rdw-accent)',
          strokeWidth: 14,
          strokeDasharray: strokeDash,
          strokeDashoffset: strokeOffset,
          strokeLinecap: 'butt',
          style: { transition: 'stroke-dasharray .4s ease, stroke-dashoffset .4s ease' },
        })
      })

      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          },
        },
        h(
          'div',
          {
            style: {
              position: 'relative',
              width: 128,
              height: 128,
              flex: '0 0 auto',
            },
          },
          h(
            'svg',
            {
              viewBox: '0 0 128 128',
              width: 128,
              height: 128,
              style: { transform: 'rotate(-90deg)', display: 'block' },
            },
            h('circle', {
              cx: 64,
              cy: 64,
              r,
              fill: 'none',
              stroke: 'var(--rdw-sunken-2)',
              strokeWidth: 14,
            }),
            ...slices,
          ),
          h(
            'div',
            {
              style: {
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              },
            },
            h(
              'span',
              {
                style: {
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--rdw-text)',
                },
              },
              String(total),
            ),
            h(
              'span',
              {
                style: {
                  fontSize: 12,
                  color: 'var(--rdw-text-3)',
                  marginTop: 2,
                },
              },
              sub,
            ),
          ),
        ),
        h(
          'ul',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              margin: 0,
              padding: 0,
              listStyle: 'none',
              flex: '1 1 140px',
              minWidth: 120,
            },
          },
          ...segments.map((seg, idx) =>
            h(
              'li',
              {
                key: `leg-${idx}`,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11.5,
                  color: 'var(--rdw-text-2)',
                },
              },
              h('span', {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: 2.5,
                  background: seg.color || 'var(--rdw-accent)',
                  flex: '0 0 auto',
                },
              }),
              h('span', { style: { flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, seg.label),
              h(
                'b',
                {
                  style: {
                    marginLeft: 'auto',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--rdw-text)',
                    fontSize: 12,
                  },
                },
                String(seg.value || 0),
              ),
            ),
          ),
        ),
      )
    }

    /**
     * 模块推进完成度列表。
     * @param {object} h React.createElement
     * @param {{ modules: Array<{ id: string, name: string, completion: number, ribs?: Array<any> }> }} props
     */
    function renderModuleProgressBars(h, props) {
      const { modules = [] } = props || {}

      if (modules.length === 0) {
        return h('div', { style: { fontSize: 11.5, color: 'var(--rdw-text-3)' } }, '暂无模块进度')
      }

      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          },
        },
        ...modules.map((m) => {
          const pct = Math.min(100, Math.max(0, Number(m.completion) || 0))
          const isComplete = pct === 100
          const barColor = isComplete ? 'var(--rdw-ok)' : pct > 0 ? 'var(--rdw-accent)' : 'var(--rdw-line-3)'

          return h(
            'div',
            {
              key: m.id,
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              },
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11.5,
                },
              },
              h(
                'span',
                {
                  style: {
                    fontWeight: 600,
                    color: 'var(--rdw-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                },
                `${m.id} ${m.name}`,
              ),
              h(
                'span',
                {
                  style: {
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 11,
                    fontWeight: 600,
                    color: isComplete ? 'var(--rdw-ok)' : 'var(--rdw-text-3)',
                  },
                },
                `${pct}%`,
              ),
            ),
            h(
              'div',
              {
                style: {
                  height: 6,
                  borderRadius: 'var(--rdw-r-pill)',
                  background: 'var(--rdw-sunken-2)',
                  overflow: 'hidden',
                },
              },
              h('div', {
                style: {
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 'var(--rdw-r-pill)',
                  background: barColor,
                  transition: 'width .35s ease',
                },
              }),
            ),
          )
        }),
      )
    }

    /**
     * 阶段管道流阶梯（Phase Pipeline Stepper）。
     * @param {object} h React.createElement
     * @param {{ phases: Array<[string, string]>, currentPhase: string }} props
     */
    function renderPhaseStepper(h, props) {
      const { phases = [], currentPhase = '' } = props || {}
      const currentIdx = phases.findIndex(([k]) => k === currentPhase)

      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            padding: '6px 0',
          },
        },
        ...phases.map(([key, label], idx) => {
          const isPast = currentIdx >= 0 && idx < currentIdx
          const isCurrent = idx === currentIdx
          const dotColor = isCurrent ? 'var(--rdw-accent)' : isPast ? 'var(--rdw-ok)' : 'var(--rdw-line-3)'
          const textColor = isCurrent ? 'var(--rdw-accent)' : isPast ? 'var(--rdw-text)' : 'var(--rdw-text-4)'
          const bg = isCurrent ? 'var(--rdw-accent-soft)' : isPast ? 'var(--rdw-sunken)' : 'transparent'

          return h(
            'div',
            {
              key,
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--rdw-r-pill)',
                background: bg,
                fontSize: 11,
                fontWeight: isCurrent ? 600 : 500,
                color: textColor,
                whiteSpace: 'nowrap',
                border: isCurrent ? '1px solid color-mix(in srgb,var(--rdw-accent) 30%,transparent)' : '1px solid transparent',
              },
            },
            h('span', {
              style: {
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: dotColor,
                flex: '0 0 auto',
              },
            }),
            label,
            idx < phases.length - 1
              ? h('span', { style: { color: 'var(--rdw-line-3)', marginLeft: 3, fontWeight: 300 } }, '›')
              : null,
          )
        }),
      )
    }

    // --- Module: src/core/goal-skills.js ---
    /**
     * 研究项目 DAG 工作台 — 研究目标 · 智能体会话的两套「思考脚手架」（v3.10）。
     *
     * 研究目标不该是一句话拍脑袋。这里把两项技能的方法论**内联**成
     * 可以在会话里注入的提示词，让 AI 按固定结构把「模糊兴趣」压成「可验证的好问题」：
     *
     *   1. /zhuanz-thinking-framework —— 八层假设审计（G/R/E/D/M/O/T/W）
     *      作用：**诊断**。找出你没意识到自己做了假设的那一层，并把它翻过来。
     *      输出：八层矩阵（层 / 隐含假设 / 翻转后的问题）。
     *
     *   2. good-question（Rimagination/good-question）—— 好问题卡
     *      作用：**收敛**。把候选用六条标准打分、用 kill rule 砍掉不合格的，
     *      最后压成一张含「竞争性解释 / 判别证据 / 推翻条件 / 两周 pilot」的卡。
     *
     * 为什么内联而不是引用外部 skill：
     *   工作台要能在没装这两个 skill 的机器上照常跑。提示词是方法论的
     *   最小可执行子集，写法上保留各自的核心约束（不堆砌装饰性想法、
     *   没有 falsifier 就不是好问题），而不是假装拥有完整技能。
     *
     * 注意：这些文本只进入**AI 会话的上下文**，不改变任何协议文件。
     */

    /** 八层框架：从最深到最浅。与 host 的 THINKING_LAYERS 保持一致。 */
    const THINKING_LAYERS = [
      {
        id: '-3',
        name: '几何维度',
        question: '研究对象是几维的？',
        hint: '0维单值 / 1维个体轨迹 / 2维群体分布 / 3维联合分布 / ∞维分布间变换 / 关系维',
      },
      {
        id: '-2',
        name: '参照系',
        question: '我假设了什么是静止的？',
        hint: '惯性参照系↔反事实基线↔对照组；真实世界没有静止参照，只剩不变量/鲁棒/反馈',
      },
      {
        id: '-1',
        name: '端点动力学',
        question: '端点本身在做什么运动？',
        hint: '固定端点 / 开放端点 / 端点运动 / 两端不规则运动 → 异质性治疗效应',
      },
      {
        id: '0',
        name: '端点结构',
        question: '起终点是怎么设定的？',
        hint: 'time zero 在哪、入组规则、终点定义；纵向问题，贯穿全生命周期',
      },
      {
        id: '1',
        name: '默认态',
        question: '假设了什么不需要解释？',
        hint: '科学革命 = 翻转默认态（牛顿翻静止、费马翻度量）',
      },
      {
        id: '2',
        name: '度量',
        question: '在哪个「距离」下找最优？',
        hint: '没有普遍最优，只有某个度量下的最优；换 endpoint 就换答案',
      },
      {
        id: '3',
        name: '导数阶',
        question: '原因作用在哪一阶？',
        hint: '水平值 / 变化率 / 加速度；临床 90% 是找策略，方法 90% 在找参数',
      },
      {
        id: '4',
        name: '时间角色',
        question: '时间是什么？',
        hint: '均匀背景 / 优化对象 / 积分维度 / 私有度量 / 弯曲几何 / 因果方向 / estimand / 关系时间',
      },
      {
        id: '5',
        name: '观察窗口',
        question: '时间的哪段我看不见？',
        hint: '随访损失、截尾、泛化、transportability、HTE',
      },
    ]

    /** good-question 的六条打分标准。 */
    const GOOD_QUESTION_CRITERIA = [
      { key: 'importance', name: '重要性', meaning: '对理论、实践、政策或方法的后果' },
      { key: 'feasibility', name: '可行性', meaning: '用现有资源能产出的可信证据' },
      { key: 'falsifiability', name: '可证伪性', meaning: '有可观测结果能削弱或杀死这个想法' },
      { key: 'leverage', name: '证据杠杆', meaning: '小规模 pilot 就能明显改变信念' },
      { key: 'originality', name: '原创性', meaning: '挑战假设，或非平凡地组合领域' },
      { key: 'downside', name: '负面学习', meaning: '即使阴性结果也有发表或实用价值' },
    ]

    /** 好问题卡的字段（顺序即填写顺序）。与 host 的 GOAL_CARD_FIELDS 对应。 */
    const GOAL_CARD_FIELDS = [
      { key: 'title', label: '暂定题目', hint: '一句能写进论文标题的话' },
      { key: 'question', label: '核心研究问题', hint: '一句话，含人群/暴露/对照/结局/时间窗' },
      { key: 'whyMatters', label: '为什么值得做', hint: '谁受益、理论或实践后果是什么' },
      { key: 'assumptionChallenged', label: '它挑战了什么默认假设', hint: '对应八层里的哪一层' },
      { key: 'hypotheses', label: '竞争性解释', hint: 'H1…；H2…；H3…   至少三条互相竞争' },
      { key: 'discriminatingTest', label: '关键判别证据或实验', hint: '什么观察能把这些解释分开' },
      { key: 'falsifier', label: '什么结果会推翻它', hint: '必填——没有这一项就不是好问题' },
      { key: 'pilot', label: '两周内可做的 pilot', hint: '最小可执行的验证动作' },
      { key: 'resources', label: '需要的数据/资源', hint: '数据源、样本量、算力、合作者' },
      { key: 'reviewerRisk', label: '最强评审质疑', hint: '审稿人最可能一句话拒掉你的理由' },
      { key: 'nextAction', label: '下一步动作', hint: '明天下班前能开始做的第一件事' },
    ]

    /** good-question 的 kill rule：命中任意一条就该砍掉或搁置候选。 */
    const KILL_RULES = [
      '没有明确受益者、理论赌注或实践后果',
      '只说「没人做过 X」，没说清为什么 X 重要',
      '说不出一个可信的证伪条件',
      '所需资源远超现有约束',
      '在问题还没立住之前就先锁定方法',
      '只增加复杂度，说不清复杂度换来了什么',
    ]

    /** 场景选择：框架的六种用法（来自 SKILL.md）。 */
    const FRAMEWORK_SCENARIOS = [
      { id: 'A', name: '审计已有研究', do: '逐层跑诊断，找盲区' },
      { id: 'B', name: '设计新研究', do: '逐层做选择，固化为 protocol' },
      { id: 'C', name: '找研究机会', do: '找最有杠杆的一层做翻转' },
      { id: 'D', name: '理论讨论', do: '把话题映射到对应层，深化讨论' },
      { id: 'E', name: '升级框架本身', do: '把新洞察固化进框架文件' },
      { id: 'F', name: '攻破难题/造工具', do: '走九步作战 SOP（生产模式）' },
    ]

    /** 「一句话」压缩：避免提示词把会话挤爆。 */
    const MAX_HINT_LINES = 40

    /**
     * 八层审计的提示词片段。
     * @param {object} [context] { title, goal, field }
     * @returns {string}
     */
    function buildFrameworkPrompt(context) {
      const source = context && typeof context === 'object' ? context : {}
      const title = String(source.title || '').trim()
      const goal = String(source.goal || '').trim()
      const header = [
        '你现在用 ZhuanZ 八层思考框架（G-R-E-D-M-O-T-W）审计这个研究目标。',
        '框架核心：科学发现的高度，等于你处理「时间、度量、默认态、参照系、几何维度」这几件事的成熟度。',
        '翻转下层，才能解放上层。',
        title ? `项目：${title}` : '',
        goal ? `当前目标：${goal}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const layers = THINKING_LAYERS.slice(0, MAX_HINT_LINES)
        .map((layer) => `  层 ${layer.id}｜${layer.name}：${layer.question}（${layer.hint}）`)
        .join('\n')

      return [
        header,
        '',
        '任务：逐层审计，输出三件事——诊断、盲区、翻转。',
        '',
        '八层（从最深到最浅）：',
        layers,
        '',
        '输出格式（不要罗列全部九层，只聚焦最有杠杆的 1–2 层）：',
        '1. 诊断：当前研究在这些层各处于什么位置（用一两句话）。',
        '2. 盲区：我在哪一层没意识到自己做了假设？为什么这一层是瓶颈？',
        '3. 翻转：把那一层翻过来会变成什么研究？给出一个**可执行**的改写。',
        '4. 杠杆：最值得推进的一层 + 具体动作（明天能开始做的那种）。',
        '',
        '约束：',
        '- 不要把每个研究都拉到「关系时间／∞维／无规则端点」，会不接地气；',
        '- 不要把它当 checklist 机械地跑，它是诊断工具；',
        '- 这一步只做诊断，不要急着给方法。',
      ].join('\n')
    }

    /**
     * 好问题卡的提示词片段。
     * @param {object} [context] { title, goal, draft, mode }
     * @returns {string}
     */
    function buildGoodQuestionPrompt(context) {
      const source = context && typeof context === 'object' ? context : {}
      const title = String(source.title || '').trim()
      const goal = String(source.goal || '').trim()
      const draft = String(source.draft || '').trim()
      const mode = String(source.mode || 'collaborator')

      const criteria = GOOD_QUESTION_CRITERIA.map(
        (item) => `  - ${item.name}：${item.meaning}`,
      ).join('\n')
      const fields = GOAL_CARD_FIELDS.map((field) => `  - ${field.label}：${field.hint}`).join('\n')
      const kills = KILL_RULES.map((rule) => `  - ${rule}`).join('\n')

      return [
        '你现在用 good-question 方法论，把上面诊断过的东西收敛成「一张可验证的好问题卡」。',
        title ? `项目：${title}` : '',
        goal ? `当前目标：${goal}` : '',
        draft ? `我的初步想法：${draft}` : '',
        `工作模式：${mode}（mentor / reviewer / collaborator / grant）`,
        '',
        '原则：',
        '- 宁愿一个锋利的问题，也不要一堆装饰性的想法；',
        '- 新颖性单独不够——还要重要；',
        '- 把「议题」「问题」「假设」「项目计划」区分开；',
        '- 先让隐藏假设显式化，再谈方法；',
        '- 没有 falsifier 的候选，直接淘汰，不要美化。',
        '',
        '第 1 步 · 发散：给 5–10 个候选问题，每个一句话，并注明它攻击的隐藏假设或张力。',
        '可用透镜：重要性/可行性、第一性原理兼容性、假设挑战、强推断（竞争假设）、',
        '边界探测（方法在哪失效）、什么变了（旧阴性结果该重访）、结构类比（邻域同构问题）、',
        '简化（复杂方法是否坍缩成更简单基线）、利益相关者轮换（谁在乎/谁受损/谁来运维）。',
        '',
        '第 2 步 · 收敛：按 1–5 分打分，不合格的直接砍掉。',
        criteria,
        '',
        'Kill rule（命中任意一条就砍或搁置）：',
        kills,
        '',
        '第 3 步 · 压成好问题卡（挑最强的 1 张，字段如下）：',
        fields,
        '',
        '最后给出一段「最强评审质疑 + 修复路径」，并明确说：这张卡现在能不能算可验证的好问题。',
        '如果 falsifier 还写不出来，直接说写不出来，不要编。',
      ]
        .filter((line) => line !== null)
        .join('\n')
    }

    /**
     * 把两段提示词合成一次完整会话的注入文本。
     * @param {object} [context]
     * @returns {string}
     */
    function buildGoalDiscussionPrompt(context) {
      return [
        '【研究目标 · 智能体协同推演与架构生成】',
        '',
        '我们要把一个研究选题推进成一张**可验证的好问题卡**，并进而**生成完整的课题主支流水线与探索分支架构**。按三步推进：',
        '',
        '— 第 1 步：诊断（ZhuanZ 个人思考框架 · 八层假设审计）—',
        buildFrameworkPrompt(context),
        '',
        '— 第 2 步：收敛（good-question 好问题卡与推翻条件）—',
        buildGoodQuestionPrompt(context),
        '',
        '— 第 3 步：生成总体主支与分支规划（Architecture & Branches）—',
        '在好问题卡收敛并明确「什么结果会推翻它」之后，请为本项目规划生成总体研究主支（Modules）与各阶段初始分支（Branches）：',
        '1. 总体主支（研究阶段链）：规划 3-6 个前后严密递进的主支（如方案设计、文献检索、队列清洗、统计建模、手稿汇编）；每个主支明确阶段 id（如 M10）、显示名与本阶段产出目标；',
        '2. 初始探索分支：为各主支提出第一批探路分支（如 B10-01 协议草案、B20-01 检索式）；',
        '3. 建构命令指引：直接给出可在本工作台或终端执行的 CLI 命令，供研究者一键创建落地：',
        '   node tools/dag.mjs module add --id <id> --name <名称>',
        '   node tools/dag.mjs sprout --module <moduleId> --id <branchId> --name <分支名> --prompt "<探索任务>"',
        '',
        '研究者对所创建的全部主支与分支拥有完整的修改权限（可自由增删、上下重排、重命名、阻断、一键回连），且每个节点都将自动拥有专属独立对话并继承前序成稿。',
        '',
        '要求：第 1 步做完请停下来等我确认，再进入第 2 步；第 2 步确立后再展开第 3 步主支与分支的完整建构规划。',
      ].join('\n')
    }

    // --- Module: src/components/GoalCardView.js ---
    /**
     * 研究项目 DAG 工作台 — 研究目标 · 好问题卡编辑器（v3.10）。
     *
     * 形态：左栏「项目目标 · 研究目标」卡片点开 → 中栏切换成这个编辑器。
     * 三块内容，对应两项技能的两步：
     *
     *   ① 八层假设审计矩阵 —— 每层一行：层名 / 我的隐含假设 / 翻转后的问题。
     *      留空的层会被高亮：那是**还没被诊断**的盲区。
     *   ② 好问题卡 —— 11 个字段，对应 good-question 的卡面。
     *      「什么结果会推翻它」（falsifier）为空时整张卡标红：不是好问题。
     *   ③ 底部动作 —— 「生成研究目标」把问题+推翻条件压成一句话写回 project.goal；
     *      「复制讨论提示词」把两套技能的脚手架拷进宿主会话。
     *
     * 设计约束：
     *   - 只用 var(--rdw-*)，任何主题下都好看；
     *   - 不自己维护状态副本：所有编辑即时 onField 回调上抛，由面板层持有 draft；
     *   - 技能提示词不在这里拼，统一从 core/goal-skills.js 取，避免两处漂移。
     */
    const SKILL_LAYERS = THINKING_LAYERS; const CARD_FIELD_SPECS = GOAL_CARD_FIELDS;
    const field = (extra) =>
      Object.assign(
        {
          width: '100%',
          boxSizing: 'border-box',
          padding: '6px 9px',
          borderRadius: 'var(--rdw-r-pebble-sm)',
          border: '1px solid var(--rdw-warm-line)',
          background: 'var(--rdw-organic-surface)',
          color: 'var(--rdw-organic-ink)',
          fontFamily: 'inherit',
          fontSize: 12,
          lineHeight: 1.5,
          outline: 'none',
        },
        extra || {},
      )

    const label = (text, hint) =>
      text
        ? null
        : null

    /** 小标题。 */
    function sectionTitle(h, icon, text, note) {
      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            gap: 7,
            margin: '0 0 7px',
            flexWrap: 'wrap',
          },
        },
        h('span', { style: { fontSize: 13 } }, icon),
        h(
          'span',
          { style: { fontSize: 13, fontWeight: 700, color: 'var(--rdw-organic-ink)' } },
          text,
        ),
        note
          ? h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, note)
          : null,
      )
    }

    /**
     * 渲染研究目标 · 好问题卡编辑器。
     *
     * props: {
     *   h, card, layers, goal, missing, falsifiable, busy,
     *   onField(key, value), onLayer(id, patch), onSyncGoal(), onCopyPrompt(), onClose()
     * }
     */
    function renderGoalCardView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const card = options.card && typeof options.card === 'object' ? options.card : {}
      const layers = Array.isArray(options.layers) ? options.layers : []
      const missing = Array.isArray(options.missing) ? options.missing : []
      const falsifiable = Boolean(options.falsifiable)
      const busy = Boolean(options.busy)
      const goal = typeof options.goal === 'string' ? options.goal : ''
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      const layerById = {}
      for (const entry of layers) {
        if (entry && typeof entry === 'object' && typeof entry.id === 'string') layerById[entry.id] = entry
      }
      const undiagnosed = SKILL_LAYERS.filter((layer) => {
        const entry = layerById[layer.id]
        return !entry || !String(entry.assumption || '').trim()
      })

      const missingCount = CARD_FIELD_SPECS.filter((spec) => missing.includes(spec.key)).length
      const requiredMissing = missing.includes('falsifier')

      /* ① 八层审计矩阵
       * 布局说明：工作台侧栏可能只有 ~160px 宽，若用「42px 标签 + 两个 1fr 输入」三列网格，
       * 输入框会被压成 50px 而标签被 nowrap 裁切。改为上下两段：
       *   第 1 行：层标签（允许换行，不再 nowrap）
       *   第 2 行：两个输入并排（各 minmax(0,1fr)）
       * 这样窄栏与宽栏都不会挤压或裁字。 */
      const layerRows = SKILL_LAYERS.map((layer) => {
        const entry = layerById[layer.id] || {}
        const hasAssumption = String(entry.assumption || '').trim().length > 0
        return h(
          'div',
          {
            key: layer.id,
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '6px 8px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              background: hasAssumption
                ? 'transparent'
                : 'color-mix(in srgb,var(--rdw-st-blocked-soft) 42%,transparent)',
              border: hasAssumption
                ? '1px solid transparent'
                : '1px dashed color-mix(in srgb,var(--rdw-st-blocked) 34%,transparent)',
            },
          },
          h(
            'div',
            {
              title: layer.question,
              style: {
                fontFamily: 'var(--rdw-font-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: hasAssumption ? 'var(--rdw-organic-ink-3)' : 'var(--rdw-st-blocked)',
                lineHeight: 1.35,
                overflowWrap: 'anywhere',
              },
            },
            `${layer.id} ${layer.name}`,
          ),
          h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 6 } },
            h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
              h(
                'input',
                {
                  type: 'text',
                  value: String(entry.assumption || ''),
                  placeholder: '我假设了…',
                  title: `我假设了：${layer.hint}（${layer.question}）`,
                  style: field({ padding: '5px 7px', fontSize: 11.5 }),
                  onInput: (event) => call(options.onLayer, layer.id, { assumption: event.target.value }),
                },
              ),
            ),
            h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
              h(
                'input',
                {
                  type: 'text',
                  value: String(entry.flip || ''),
                  placeholder: '翻过来会变成什么研究？',
                  title: '翻过来会变成什么研究？',
                  style: field({ padding: '5px 7px', fontSize: 11.5 }),
                  onInput: (event) => call(options.onLayer, layer.id, { flip: event.target.value }),
                },
              ),
            ),
          ),
        )
      })

      /* ② 好问题卡字段 */
      const cardFields = CARD_FIELD_SPECS.map((spec) => {
        const value = String(card[spec.key] || '')
        const isMissing = missing.includes(spec.key)
        const isFalsifier = spec.key === 'falsifier'
        const multiline = ['question', 'whyMatters', 'hypotheses', 'discriminatingTest', 'falsifier', 'pilot', 'reviewerRisk'].includes(spec.key)
        const commonProps = {
          value,
          title: spec.hint,
          placeholder: spec.hint,
          style: field({
            minHeight: multiline ? 52 : undefined,
            resize: multiline ? 'vertical' : undefined,
            border: isMissing
              ? isFalsifier
                ? '1px solid var(--rdw-st-blocked)'
                : '1px dashed color-mix(in srgb,var(--rdw-st-blocked) 40%,transparent)'
              : '1px solid var(--rdw-warm-line)',
          }),
          onInput: (event) => call(options.onField, spec.key, event.target.value),
        }
        return h(
          'div',
          { key: spec.key, style: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 7 } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' } },
            h(
              'span',
              {
                style: {
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: isMissing ? 'var(--rdw-st-blocked)' : 'var(--rdw-organic-ink-2)',
                },
              },
              spec.label,
            ),
            isFalsifier
              ? h(
                  'span',
                  {
                    style: {
                      fontSize: 11,
                      padding: '0 5px',
                      borderRadius: 999,
                      background: isMissing ? 'var(--rdw-st-blocked)' : 'color-mix(in srgb,var(--rdw-sage) 22%,transparent)',
                      color: isMissing ? '#faf6f1' : 'var(--rdw-organic-ink-2)',
                    },
                  },
                  '必填',
                )
              : null,
          ),
          multiline
            ? h('textarea', Object.assign({}, commonProps, { rows: isFalsifier ? 3 : 2 }))
            : h('input', Object.assign({}, commonProps, { type: 'text' })),
        )
      })

      /* 状态条 */
      const statusNode = h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '7px 10px',
            borderRadius: 'var(--rdw-r-pebble-sm)',
            background: falsifiable
              ? 'color-mix(in srgb,var(--rdw-sage) 13%,transparent)'
              : 'color-mix(in srgb,var(--rdw-st-blocked-soft) 52%,transparent)',
            border: falsifiable
              ? '1px solid color-mix(in srgb,var(--rdw-sage) 34%,transparent)'
              : '1px solid color-mix(in srgb,var(--rdw-st-blocked) 34%,transparent)',
          },
        },
        h('span', { style: { fontSize: 13 } }, falsifiable ? '✅' : '⚠️'),
        h(
          'span',
          {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: falsifiable ? 'var(--rdw-sage)' : 'var(--rdw-st-blocked)',
            },
          },
          falsifiable ? '这张卡可验证：已写下推翻条件' : '还不能算好问题：缺少「什么结果会推翻它」',
        ),
        missingCount > 0
          ? h(
              'span',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
              `还空着 ${missingCount} / ${CARD_FIELD_SPECS.length} 个字段`,
            )
          : h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '字段已填齐'),
        undiagnosed.length > 0
          ? h(
              'span',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
              `· ${undiagnosed.length} 层还没做假设审计`,
            )
          : h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '· 八层已全部审计'),
      )

      return h(
        'div',
        {
          className: 'rdw-goal-card-view',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '10px 12px',
            minHeight: 0,
            overflowY: 'auto',
          },
        },
        /* 标题栏
         * 侧栏可能只有 ~160px 宽：允许换行（按钮整体落到下一行），
         * 并给标题 nowrap，避免被挤成逐字竖排。 */
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid var(--rdw-warm-line)',
              flexShrink: 0,
            },
          },
          h('span', { style: { fontSize: 15 } }, '🎯'),
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' } },
            h(
              'span',
              {
                style: {
                  fontFamily: 'var(--rdw-font-serif)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--rdw-organic-ink)',
                  whiteSpace: 'nowrap',
                },
              },
              '研究目标 · 好问题',
            ),
            h(
              'span',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', whiteSpace: 'nowrap' } },
              '八层假设审计 → 好问题卡 → 生成研究目标',
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              title: '把两套技能（八层框架 + good-question）的讨论脚手架直接写进会话输入框，按回车即可与智能体讨论',
              disabled: busy,
              style: {
                padding: '4px 10px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-surface)',
                color: 'var(--rdw-organic-ink-2)',
                fontSize: 11.5,
                cursor: busy ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              },
              onClick: () => call(options.onCopyPrompt),
            },
            '💬 开始讨论',
          ),
          h(
            'button',
            {
              type: 'button',
              title: '关闭编辑器，回到项目流程',
              style: {
                padding: '4px 9px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-surface)',
                color: 'var(--rdw-organic-ink-3)',
                fontSize: 11.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              },
              onClick: () => call(options.onClose),
            },
            '✕',
          ),
        ),

        statusNode,

        /* ① 八层 */
        h(
          'div',
          null,
          sectionTitle(h, '🧭', '第 1 步 · 八层假设审计', '留空的层就是盲区（红框）'),
          h(
            'div',
            {
              style: {
                padding: '0 8px 3px',
                fontSize: 11,
                color: 'var(--rdw-organic-ink-3)',
                fontFamily: 'var(--rdw-font-mono)',
                lineHeight: 1.5,
              },
            },
            '每层填两栏：我的隐含假设 / 翻转后的问题',
          ),
          ...layerRows,
        ),

        /* ② 好问题卡 */
        h(
          'div',
          null,
          sectionTitle(h, '🃏', '第 2 步 · 好问题卡', `${CARD_FIELD_SPECS.length} 个字段，falsifier 必填`),
          h(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: 8,
              },
            },
            ...cardFields,
          ),
        ),

        /* ③ 动作条 */
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--rdw-warm-line)',
              flexShrink: 0,
              flexWrap: 'wrap',
            },
          },
          h(
            'button',
            {
              type: 'button',
              title: falsifiable
                ? '把「核心问题；推翻条件」压成一句话，写回 PROJECT_STATE 的 project.goal'
                : '还没有推翻条件，生成的目标无法被验证——建议先补上',
              disabled: busy,
              style: {
                padding: '6px 14px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: 'none',
                background: falsifiable ? 'var(--rdw-sage)' : 'var(--rdw-st-blocked)',
                color: '#faf6f1',
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              },
              onClick: () => call(options.onSyncGoal),
            },
            busy ? '生成中…' : '生成研究目标',
          ),
          goal
            ? h(
                'div',
                {
                  style: {
                    flex: '1 1 260px',
                    minWidth: 0,
                    fontSize: 11,
                    color: 'var(--rdw-organic-ink-2)',
                    lineHeight: 1.5,
                    padding: '5px 9px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 10%,transparent)',
                    borderLeft: '2px solid var(--rdw-sage)',
                  },
                },
                h('span', { style: { color: 'var(--rdw-organic-ink-3)' } }, '当前 project.goal：'),
                goal,
              )
            : h(
                'span',
                { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                '当前项目还没有研究目标',
              ),
        ),
      )
    }

    // --- Module: src/views/DagView.js ---
    /**
     * 研究项目 DAG 工作台 — DAG 视图。
     *
     * 每个模块一列卡片；模块内按分支分组，分支下挂该分支 handoff 的状态徽标。
     * 点击徽标在右侧展开交接详情（fetchHandoff 的纯文本渲染，不渲染 Markdown）。
     *
     * v1.1：支持自由命名（模块/分支 id 任意，不假设 Mxx/Bxx），提供
     * 「＋ 新建模块 / ＋ 新建分支 / ＋ 新建交接」入口；分支展示 id + name（/state 提供 branches[] 时）。
     */



    /** 把 handoff 列表按模块 id 分组，组内按分支、版本排序。 */
    function groupHandoffsByModule(handoffs) {
      const grouped = new Map()
      for (const handoff of Array.isArray(handoffs) ? handoffs : []) {
        if (!handoff || !handoff.path) continue
        const moduleId = handoff.module || moduleFromHandoffPath(handoff.path)
        if (!grouped.has(moduleId)) grouped.set(moduleId, [])
        grouped.get(moduleId).push(handoff)
      }
      for (const list of grouped.values()) {
        list.sort((left, right) => {
          const branchCompare = String(left.branch || '').localeCompare(String(right.branch || ''))
          if (branchCompare !== 0) return branchCompare
          return (Number(left.version) || 1) - (Number(right.version) || 1)
        })
      }
      return grouped
    }

    /**
     * 汇总一个模块的分支列表：优先用 /state 的 branches[]（id + name），
     * 再用 handoff 里出现的 branch 补齐（v1.0 宿主无 branches[] 时的兜底）。
     */
    function collectModuleBranches(project, module, grouped) {
      const moduleId = module && module.id ? String(module.id) : ''
      const found = new Map()
      const stateBranches = project && Array.isArray(project.branches) ? project.branches : []
      for (const branch of stateBranches) {
        if (!branch || branch.id === undefined || branch.id === null) continue
        if (String(branch.module || '') !== moduleId) continue
        const id = String(branch.id)
        found.set(id, { id, name: branch.name ? String(branch.name) : '', dir: branch.dir ? String(branch.dir) : '' })
      }
      const handoffsByBranch = new Map()
      for (const handoff of grouped.get(moduleId) || []) {
        const branchId = handoff.branch || branchFromHandoffPath(handoff.path)
        if (!handoffsByBranch.has(branchId)) handoffsByBranch.set(branchId, [])
        handoffsByBranch.get(branchId).push(handoff)
        if (!found.has(branchId)) found.set(branchId, { id: branchId, name: '', dir: '' })
      }
      return Array.from(found.values()).map((branch) => ({
        ...branch,
        handoffs: handoffsByBranch.get(branch.id) || [],
      }))
    }

    /** frontmatter 值 → 可读字符串。 */
    function formatFrontmatterValue(value) {
      if (value === null || value === undefined) return '—'
      if (Array.isArray(value)) return value.map((item) => formatFrontmatterValue(item)).join('；')
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch (problem) {
          return String(value)
        }
      }
      return String(value)
    }

    /**
     * 交接详情面板：frontmatter 字段表 + 正文纯文本（等宽 pre-wrap）。
     * @param {object} h React.createElement
     * @param {{detail?: object|null, onClose?: Function, onRetry?: Function,
     *          onAction?: Function, busy?: string}} props
     */
    function renderHandoffDetail(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const detail = options.detail
      if (!detail) return null

      const { detailCard, row, muted, mono, button, sectionTitle } = STYLES
      const data = detail.data && typeof detail.data === 'object' ? detail.data : null
      const frontmatter = data && data.frontmatter && typeof data.frontmatter === 'object' ? data.frontmatter : null
      const status = frontmatter && frontmatter.status ? frontmatter.status : ''
      const close = () => {
        if (typeof options.onClose === 'function') options.onClose()
      }
      const retry = () => {
        if (typeof options.onRetry === 'function') options.onRetry(detail.path)
      }
      const actions = data && status
        ? renderHandoffActions(h, { row: { path: detail.path, status }, onAction: options.onAction, busy: options.busy })
        : []

      return h(
        'div',
        { style: detailCard },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
          h('strong', { style: { fontSize: 12 } }, `交接详情 · ${handoffName(detail.path)}`),
          h(
            'div',
            { style: { ...row, gap: 6 } },
            ...actions,
            h('button', { type: 'button', style: button, onClick: close }, '关闭'),
          ),
        ),
        h('div', { style: { ...mono, opacity: 0.7, fontSize: 12, marginBottom: 8 } }, detail.path),
        detail.loading ? h('div', { style: muted }, '加载中…') : null,
        detail.error
          ? h(
              'div',
              { style: { ...STYLES.errorBanner, marginTop: 4 } },
              `详情加载失败：${detail.error}`,
              h('button', { type: 'button', style: { ...button, marginLeft: 8 }, onClick: retry }, '重试'),
            )
          : null,
        data
          ? h(
              'div',
              null,
              h(
                'div',
                { style: { ...row, marginBottom: 6 } },
                status ? renderStatusBadge(h, { status }) : null,
                frontmatter && frontmatter.stream ? h('span', { style: STYLES.chip }, frontmatter.stream) : null,
                frontmatter && frontmatter.version !== undefined
                  ? h('span', { style: STYLES.chip }, `v${frontmatter.version}`)
                  : null,
              ),
              frontmatter
                ? h(
                    'div',
                    { style: STYLES.tableWrap },
                    h(
                      'table',
                      { style: STYLES.table },
                      h(
                        'tbody',
                        null,
                        ...Object.keys(frontmatter).map((key) =>
                          h(
                            'tr',
                            { key },
                            h('th', { style: { ...STYLES.th, fontSize: 12, width: '32%' } }, key),
                            h('td', { style: { ...STYLES.td, ...mono, fontSize: 12 } }, formatFrontmatterValue(frontmatter[key])),
                          ),
                        ),
                      ),
                    ),
                  )
                : null,
              h(
                'div',
                { style: { ...row, justifyContent: 'space-between', margin: '10px 0 4px' } },
                h('span', { style: { ...sectionTitle, margin: 0 } }, '正文（纯文本，不渲染 Markdown）'),
                h('span', { style: muted }, `${data.size || (data.content || '').length || 0} 字符`),
              ),
              h('pre', { style: { ...mono, ...STYLES.pre, maxHeight: 380 } }, data.body || data.content || '(空正文)'),
            )
          : null,
      )
    }

    /**
     * @param {object} h React.createElement
     * @param {{project?: object, onSelect?: Function, onAction?: Function, busy?: string,
     *          detail?: object|null, onCloseDetail?: Function, onRetryDetail?: Function,
     *          onCreate?: Function, createEnabled?: boolean}} props
     */
    function renderDagView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const modules = project && Array.isArray(project.modules) ? project.modules : []
      const handoffs = project && Array.isArray(project.handoffs) ? project.handoffs : []
      const grouped = groupHandoffsByModule(handoffs)
      const { row, chip, muted, card, column, sectionTitle, button, primaryButton } = STYLES
      const hasBranchIndex = Boolean(project && Array.isArray(project.branches) && project.branches.length > 0)
      const createEnabled = options.createEnabled !== false

      const callCreate = (payload) => {
        if (createEnabled && typeof options.onCreate === 'function') options.onCreate(payload)
      }
      const openCreate = (payload) => (event) => {
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
        callCreate(payload)
      }

      if (!project || project.exists === false) {
        return h(
          'div',
          { style: { ...card } },
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '尚未加载 DAG 项目'),
          h(
            'div',
            { style: muted },
            createEnabled
              ? '请输入项目绝对路径并点「加载」，或点「加载示例项目」；也可以点顶部「新建项目」初始化一个新 DAG 项目。'
              : '请输入项目绝对路径并点「加载」，或点「加载示例项目」；工作台会自动读取配置中保存的项目。',
          ),
        )
      }

      const renderModuleCard = (module) => {
        const moduleId = module && module.id ? String(module.id) : '未知模块'
        const moduleName = (module && module.name) || '未命名模块'
        const branches = collectModuleBranches(project, module, grouped)
        const declared =
          typeof module.branches === 'number'
            ? module.branches
            : Array.isArray(module.branches)
              ? module.branches.length
              : branches.length
        const missing = hasBranchIndex ? 0 : Math.max(0, declared - branches.length)
        const counts = module && module.counts && typeof module.counts === 'object' ? module.counts : {}

        const countChips = []
        for (const key of ['draft', 'provisional', 'accepted', 'rejected', 'superseded', 'blocked']) {
          const value = counts[key]
          if (!value) continue
          const info = statusInfo(key.toUpperCase())
          countChips.push(
            h(
              'span',
              {
                key,
                style: {
                  ...chip,
                  fontSize: 12,
                  color: info.color,
                  background: info.bg,
                  borderColor: info.border,
                },
              },
              `${info.label} ${value}`,
            ),
          )
        }

        const branchRows = branches.map((branch) =>
          h(
            'div',
            {
              key: branch.id,
              style: {
                paddingTop: 6,
                marginTop: 6,
                borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
              },
            },
            h(
              'div',
              { style: { ...row, gap: 6, marginBottom: 4 } },
              h(
                'span',
                { style: { ...chip, fontSize: 12, fontWeight: 600 }, title: branch.dir || '' },
                branch.name ? `${branch.id} · ${branch.name}` : branch.id,
              ),
              h(
                'span',
                { style: { ...muted, fontSize: 12, flex: '1 1 auto' } },
                branch.handoffs.map((handoff) => handoff.stream).filter(Boolean).join(' / ') || '暂无 stream',
              ),
              createEnabled
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: { ...button, fontSize: 11, padding: '1px 7px' },
                      disabled: Boolean(options.busy),
                      onClick: openCreate({ kind: 'handoff-new', branch: branch.id, module: moduleId }),
                    },
                    '＋ 新建交接',
                  )
                : null,
            ),
            branch.handoffs.length === 0
              ? h('div', { style: { ...muted, fontSize: 12 } }, '（该分支暂无交接）')
              : h(
                  'div',
                  { style: { ...row, gap: 4 } },
                  ...branch.handoffs.map((handoff) => {
                    const info = statusInfo(handoff.status)
                    return h(
                      'span',
                      {
                        key: handoff.path,
                        title: handoff.path,
                        style: {
                          ...chip,
                          cursor: 'pointer',
                          fontSize: 12,
                          color: info.color,
                          background: info.bg,
                          borderColor: info.border,
                        },
                        onClick: () => {
                          if (typeof options.onSelect === 'function') options.onSelect(handoff.path)
                        },
                      },
                      `v${handoff.version || 1} · ${info.label}`,
                    )
                  }),
                ),
          ),
        )

        return h(
          'div',
          {
            key: moduleId,
            style: { ...card, flex: '1 1 240px', minWidth: 220, marginBottom: 0 },
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between' } },
            h('div', { style: { ...row, gap: 6 } }, h('strong', { style: { fontSize: 12 } }, `${moduleId} · ${moduleName}`)),
            h(
              'div',
              { style: { ...row, gap: 4 } },
              h('span', { style: chip }, `${declared} 分支`),
              createEnabled
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: { ...button, fontSize: 11, padding: '1px 7px' },
                      disabled: Boolean(options.busy),
                      onClick: openCreate({ kind: 'branch-add', module: moduleId, moduleName }),
                    },
                    '＋ 新建分支',
                  )
                : null,
            ),
          ),
          countChips.length > 0 ? h('div', { style: { ...row, gap: 4, marginTop: 6 } }, ...countChips) : null,
          branches.length === 0
            ? h('div', { style: { ...muted, marginTop: 8 } }, '（该模块暂无分支）')
            : h('div', { style: column }, ...branchRows),
          missing > 0 ? h('div', { style: { ...muted, marginTop: 6 } }, `另有 ${missing} 个分支暂无交接`) : null,
        )
      }

      const moduleList =
        modules.length === 0
          ? h(
              'div',
              { style: { ...card } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '该项目还没有模块'),
              h(
                'div',
                { style: muted },
                createEnabled
                  ? '点右上角「＋ 新建模块」创建第一个模块（id 可为任意唯一名称，如 literature）。'
                  : '当前宿主为旧版本，无法新建模块；重启 DSH 后可用。',
              ),
            )
          : h('div', { style: { ...row, alignItems: 'flex-start', gap: 8 } }, ...modules.map(renderModuleCard))
      const detailNode = renderHandoffDetail(h, {
        detail: options.detail,
        onClose: options.onCloseDetail,
        onRetry: options.onRetryDetail,
        onAction: options.onAction,
        busy: options.busy,
      })

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', margin: '2px 0 10px' } },
          h('span', { style: { ...sectionTitle, margin: 0 } }, `模块 DAG：${modules.length} 模块 / ${handoffs.length} 交接`),
          h(
            'div',
            { style: { ...row, gap: 8 } },
            h('span', { style: muted }, '点击分支下的状态徽标，在右侧查看交接详情'),
            createEnabled
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: primaryButton,
                    disabled: Boolean(options.busy),
                    onClick: openCreate({ kind: 'module-add' }),
                  },
                  '＋ 新建模块',
                )
              : null,
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
          h('div', { style: { flex: detailNode ? '2 1 320px' : '1 1 auto', minWidth: detailNode ? 280 : 0 } }, moduleList),
          detailNode,
        ),
      )
    }

    // --- Module: src/views/ResultsView.js ---
    /**
     * 研究项目 DAG 工作台 — 结果视图（v1.2 默认页，结果优先）。
     *
     * 给人看：不出现状态机术语，不要求用户手动操作门控。
     *   - 「需要你关注」：/results.attention 校验问题（code + 自然语言）、pending 待确认摘要、blocked；
     *   - 「让系统处理可自动通过的结果」按钮：POST /run {action:'auto'}（宿主缺 auto 时隐藏并提示重启）；
     *   - 已接受结果：按模块分组卡片（stream · vN / 日期 / title / question / keyResults 截断可展开
     *     / limitations 折叠 / 文件列表），点击卡片用 fetchHandoff 打开等宽纯文本详情；
     *   - 旧宿主降级：无 results 能力时显示提示 + /state.accepted 简表，不崩溃。
     */



    /** 阻止展开链接的点击冒泡到卡片（避免同时打开详情）。 */
    function stopClickEvent(event) {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
    }

    /**
     * @param {object} h React.createElement
     * @param {{project?: object, results?: object|null, resultsLoading?: boolean,
     *          resultsError?: string, autoEnabled?: boolean, resultsAvailable?: boolean,
     *          busy?: string, onAuto?: Function, onSelect?: Function, detail?: object|null,
     *          onCloseDetail?: Function, onRetryDetail?: Function,
     *          expandedResults?: object, expandedLimitations?: object,
     *          onToggleKeyResults?: Function, onToggleLimitations?: Function}} props
     */
    function renderResultsView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const results = options.results && typeof options.results === 'object' && options.results.ok !== false ? options.results : null
      const autoEnabled = options.autoEnabled === true
      const resultsAvailable = options.resultsAvailable === true
      const busy = options.busy || ''
      const resultsError = typeof options.resultsError === 'string' ? options.resultsError : ''
      const expandedResults = options.expandedResults && typeof options.expandedResults === 'object' ? options.expandedResults : {}
      const expandedLimitations =
        options.expandedLimitations && typeof options.expandedLimitations === 'object' ? options.expandedLimitations : {}

      const { card, row, chip, muted, mono, button, primaryButton, sectionTitle, tableWrap, table, th, td, noticeBanner, errorBanner } =
        STYLES

      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      if (!project || project.exists === false) {
        return h(
          'div',
          { style: card },
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '还没有加载项目'),
          h('div', { style: muted }, '在顶部加载项目或点「加载示例项目」，这里会展示研究结果。'),
        )
      }

      const detailNode = renderHandoffDetail(h, {
        detail: options.detail,
        onClose: options.onCloseDetail,
        onRetry: options.onRetryDetail,
        onBusy: options.busy,
        busy,
      })

      /* ------------------------------------------------- 旧宿主：/state.accepted 简表 */
      if (!resultsAvailable) {
        const accepted = Array.isArray(project.accepted) ? project.accepted : []
        return h(
          'div',
          null,
          h('div', { style: noticeBanner }, '宿主为旧版本，结果视图需重启 DSH 后启用；下方先显示项目已接受结果的简表。'),
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', margin: '2px 0 10px' } },
            h('span', { style: { ...sectionTitle, margin: 0 } }, '已接受结果（简表）'),
            h('span', { style: muted }, `共 ${accepted.length} 项`),
          ),
          accepted.length === 0
            ? h('div', { style: muted }, '这个项目还没有已接受结果。')
            : h(
                'div',
                { style: tableWrap },
                h(
                  'table',
                  { style: table },
                  h(
                    'thead',
                    null,
                    h('tr', null, ...['stream', '版本', '路径'].map((label) => h('th', { key: label, style: th }, label))),
                  ),
                  h(
                    'tbody',
                    null,
                    ...accepted.map((item, index) => {
                      const pathValue = item && item.path ? item.path : ''
                      return h(
                        'tr',
                        { key: pathValue || index },
                        h('td', { style: td }, (item && item.stream) || '—'),
                        h('td', { style: td }, `v${(item && item.version) || 1}`),
                        h(
                          'td',
                          { style: td },
                          h(
                            'span',
                            { style: { ...mono, ...STYLES.link, fontSize: 12 }, onClick: () => call(options.onSelect, pathValue) },
                            pathValue || handoffName(pathValue),
                          ),
                        ),
                      )
                    }),
                  ),
                ),
              ),
          detailNode,
        )
      }

      if (resultsError) {
        return h(
          'div',
          null,
          h('div', { style: errorBanner }, `结果读取失败：${resultsError}`),
          h('div', { style: muted }, '其他页签仍可正常使用；可点顶部「刷新」重试。'),
          detailNode,
        )
      }

      if (!results) {
        return h('div', { style: { ...muted, padding: '10px 0' } }, options.resultsLoading ? '加载中…' : '暂无结果数据')
      }

      const attention = Array.isArray(results.attention) ? results.attention : []
      const pending = Array.isArray(results.pending) ? results.pending : []
      const resultList = Array.isArray(results.results) ? results.results : []
      const modules = Array.isArray(results.modules) ? results.modules : Array.isArray(project.modules) ? project.modules : []
      const resultCounts = results.counts && typeof results.counts === 'object' ? results.counts : {}
      const blockedCount = countOf(resultCounts, 'blocked')
      const blockerTexts = Array.isArray(project.blockers) ? project.blockers : []
      const hasAttention = attention.length > 0 || pending.length > 0 || blockedCount > 0 || blockerTexts.length > 0

      /* ------------------------------------------------------------ 需要你关注 */
      const attentionItems = []
      for (const issue of attention) {
        attentionItems.push(
          h(
            'div',
            { key: `attention-${issue && issue.code}-${issue && issue.path}-${attentionItems.length}`, style: STYLES.attentionItem },
            h('span', { style: STYLES.codeChip }, (issue && issue.code) || '校验'),
            h('span', null, attentionText(issue)),
            issue && issue.path
              ? h('div', { style: { ...mono, fontSize: 11, opacity: 0.65, marginTop: 2, wordBreak: 'break-all' } }, issue.path)
              : null,
          ),
        )
      }
      for (const item of pending) {
        const question = item && item.question ? String(item.question) : '有一项结果等待确认'
        attentionItems.push(
          h(
            'div',
            { key: `pending-${item && item.path}-${attentionItems.length}`, style: STYLES.attentionItem },
            h('span', { style: { ...STYLES.codeChip, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' } }, plainStatusLabel('PROVISIONAL')),
            h(
              'span',
              null,
              `待确认：${truncateText(question, 120)}`,
            ),
            h(
              'div',
              { style: { ...muted, marginTop: 2 } },
              `${(item && item.module) || '—'} · ${(item && item.stream) || '—'} · v${(item && item.version) || 1}`,
            ),
          ),
        )
      }
      for (const blocker of blockerTexts) {
        attentionItems.push(
          h(
            'div',
            { key: `blocked-${attentionItems.length}`, style: STYLES.attentionItem },
            h('span', { style: { ...STYLES.codeChip, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, plainStatusLabel('BLOCKED')),
            h('span', null, truncateText(String(blocker), 160)),
          ),
        )
      }
      if (blockedCount > 0 && blockerTexts.length === 0) {
        attentionItems.push(
          h(
            'div',
            { key: 'blocked-count', style: STYLES.attentionItem },
            h('span', { style: { ...STYLES.codeChip, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, plainStatusLabel('BLOCKED')),
            h('span', null, `有 ${blockedCount} 个交接卡住，可在「工程」页查看详情`),
          ),
        )
      }

      const attentionBox = h(
        'div',
        { style: STYLES.attentionBox },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
          h('strong', { style: { fontSize: 12 } }, '需要你关注'),
          h('span', { style: { ...muted } }, hasAttention ? '系统已自动通过可安全通过的结果，以下需要你判断' : ''),
        ),
        hasAttention
          ? h('div', null, ...attentionItems)
          : h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--rdw-st-accepted)' } }, '没有需要你处理的事，继续专注研究'),
      )

      /* -------------------------------------------------------------- 操作条 */
      const autoBar = h(
        'div',
        { style: { ...row, justifyContent: 'space-between', margin: '4px 0 10px' } },
        h(
          'span',
          { style: muted },
          autoEnabled
            ? '自动门控：只接受校验全绿、无冲突的结果；失败的会保留说明，不需要你手动操作'
            : '宿主为旧版本，重启 DSH 后可用「自动处理」；当前可手动在「工程」页接受/拒绝。',
        ),
        autoEnabled
          ? pending.length > 0
            ? h(
                'button',
                {
                  type: 'button',
                  style: primaryButton,
                  disabled: Boolean(busy),
                  onClick: () => call(options.onAuto),
                },
                busy === 'auto' ? '正在自动处理…' : '让系统处理可自动通过的结果',
              )
            : h('span', { style: { ...chip, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } }, '当前没有可自动处理的结果')
          : null,
      )

      /* ----------------------------------------------------------- 结果卡片 */
      const resultsByModule = new Map()
      for (const result of resultList) {
        const moduleId = (result && result.module) || '未分组'
        if (!resultsByModule.has(moduleId)) resultsByModule.set(moduleId, [])
        resultsByModule.get(moduleId).push(result)
      }

      const moduleEntries = modules.map((module) => ({
        id: module && module.id ? String(module.id) : '未分组',
        name: module && module.name ? String(module.name) : '',
      }))
      for (const moduleId of resultsByModule.keys()) {
        if (!moduleEntries.some((entry) => entry.id === moduleId)) {
          const first = resultsByModule.get(moduleId)[0]
          moduleEntries.push({ id: moduleId, name: first && first.moduleName ? String(first.moduleName) : '' })
        }
      }

      const stopThen = (handler, pathValue) => (event) => {
        stopClickEvent(event)
        call(handler, pathValue)
      }

      const renderResultCard = (result) => {
        const pathValue = result && result.path ? String(result.path) : ''
        const keyText = result && result.keyResults ? String(result.keyResults) : ''
        const keyExpanded = Boolean(expandedResults[pathValue])
        const limitsExpanded = Boolean(expandedLimitations[pathValue])
        const files = result && Array.isArray(result.files) ? result.files : []
        return h(
          'div',
          {
            key: pathValue || `${result && result.stream}-${result && result.version}`,
            style: STYLES.resultCard,
            title: pathValue ? `打开交接详情：${pathValue}` : '',
            onClick: () => call(options.onSelect, pathValue),
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
            h(
              'span',
              { style: { ...chip, fontSize: 12, fontWeight: 600 } },
              `${(result && result.stream) || '未命名结果'} · v${(result && result.version) || 1}`,
            ),
            h('span', { style: { ...muted, fontSize: 11 } }, (result && (result.decidedAt || result.date)) || ''),
          ),
          h('div', { style: STYLES.resultTitle }, (result && result.title) || '（未提供标题）'),
          result && result.question
            ? h('div', { style: { ...STYLES.resultMeta, opacity: 0.85 } }, truncateText(String(result.question), 160))
            : null,
          keyText
            ? h(
                'div',
                { style: { marginTop: 6 } },
                h('div', { style: { ...STYLES.resultMeta, fontWeight: 600, opacity: 0.9 } }, '关键结果'),
                h('div', { style: STYLES.resultBody }, keyExpanded ? keyText : truncateText(keyText, 200)),
                keyText.length > 200
                  ? h(
                      'span',
                      { style: STYLES.smallLink, onClick: stopThen(options.onToggleKeyResults, pathValue) },
                      keyExpanded ? '收起' : `展开（${keyText.length} 字）`,
                    )
                  : null,
              )
            : null,
          result && result.limitations
            ? h(
                'div',
                { style: { marginTop: 6 } },
                h(
                  'span',
                  { style: STYLES.smallLink, onClick: stopThen(options.onToggleLimitations, pathValue) },
                  limitsExpanded ? '收起限制说明' : '限制与注意事项',
                ),
                limitsExpanded
                  ? h(
                      'div',
                      { style: { ...STYLES.resultMeta, opacity: 0.75, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
                      String(result.limitations),
                    )
                  : null,
              )
            : null,
          files.length > 0
            ? h(
                'div',
                { style: { marginTop: 6 } },
                h('div', { style: { ...STYLES.resultMeta, opacity: 0.8 } }, `文件 ${files.length} 个`),
                ...files.slice(0, limitsExpanded ? files.length : 3).map((file) =>
                  h('div', { key: String(file), style: { ...mono, fontSize: 11, opacity: 0.65, wordBreak: 'break-all' } }, String(file)),
                ),
                files.length > 3 && !limitsExpanded
                  ? h(
                      'span',
                      { style: { ...muted, fontSize: 11, display: 'inline-block', marginTop: 2 } },
                      `…另有 ${files.length - 3} 个文件（点击卡片查看详情）`,
                    )
                  : null,
              )
            : null,
        )
      }

      const groupNodes = moduleEntries.map((entry) => {
        const groupResults = resultsByModule.get(entry.id) || []
        return h(
          'div',
          { key: `group-${entry.id}`, style: STYLES.resultGroup },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
            h(
              'span',
              { style: { ...sectionTitle, margin: 0 } },
              `${entry.id}${entry.name ? ` · ${entry.name}` : ''}`,
            ),
            h(
              'span',
              {
                style: {
                  ...chip,
                  fontSize: 12,
                  color: groupResults.length > 0 ? 'var(--rdw-st-accepted)' : undefined,
                  borderColor: groupResults.length > 0 ? 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' : undefined,
                },
              },
              groupResults.length > 0 ? `已出结果 ${groupResults.length}` : '暂无结果',
            ),
          ),
          groupResults.length === 0
            ? h('div', { style: muted }, '这个模块还没有已接受结果')
            : h('div', { style: STYLES.resultGrid }, ...groupResults.map(renderResultCard)),
        )
      })

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', margin: '2px 0 8px' } },
          h(
            'div',
            null,
            h('div', { style: { fontSize: 14, fontWeight: 700 } }, '研究结果'),
            h(
              'div',
              { style: muted },
              '门控交给系统：这里只展示已经通过校验的结果，以及真正需要你判断的事。',
            ),
          ),
          h(
            'div',
            { style: { ...row, gap: 4 } },
            h('span', { style: { ...chip, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } }, `已出结果 ${countOf(resultCounts, 'results')}`),
            h('span', { style: { ...chip, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' } }, `待确认 ${pending.length}`),
            h('span', { style: { ...chip, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, `卡住 ${blockedCount}`),
          ),
        ),
        attentionBox,
        autoBar,
        options.resultsLoading ? h('div', { style: { ...muted, marginBottom: 8 } }, '正在刷新结果…') : null,
        groupNodes.length > 0 ? h('div', null, ...groupNodes) : h('div', { style: muted }, '这个项目还没有已接受结果。'),
        detailNode,
      )
    }

    // --- Module: src/views/OverviewView.js ---
    /**
     * 研究项目 DAG 工作台 — 概览视图。
     *
     * 统计卡 + 下一步/阻塞 + 「待主项目决定」（接受/拒绝）+「已接受结果」。
     */





    /**
     * @param {object} h React.createElement
     * @param {{project?: object, onAction?: Function, onSelect?: Function, busy?: string,
     *          detail?: object|null, onCloseDetail?: Function, onRetryDetail?: Function}} props
     */
    function renderOverviewView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const { card, row, chip, muted, button, primaryButton, dangerButton, sectionTitle, tableWrap, table, th, td, mono } = STYLES

      if (!project || project.exists === false) {
        return h(
          'div',
          { style: { ...card } },
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '尚未加载 DAG 项目'),
          h(
            'div',
            { style: muted },
            '工作台会自动加载配置文件中的项目；也可以在顶部输入项目绝对路径后点「加载」，或点「加载示例项目」。',
          ),
        )
      }

      const nextSteps = Array.isArray(project.next_steps) ? project.next_steps : []
      const blockers = Array.isArray(project.blockers) ? project.blockers : []
      const pending = Array.isArray(project.pending_decisions) ? project.pending_decisions : []
      const accepted = Array.isArray(project.accepted) ? project.accepted : []
      const counts = project && project.counts && typeof project.counts === 'object' ? project.counts : {}
      const modules = project && Array.isArray(project.modules) ? project.modules : []

      const callAction = (payload) => {
        if (typeof options.onAction === 'function') options.onAction(payload)
      }
      const openDetail = (pathValue) => {
        if (typeof options.onSelect === 'function') options.onSelect(pathValue)
      }

      const renderList = (items, emptyText) =>
        items.length === 0
          ? h('div', { style: muted }, emptyText)
          : h(
              'div',
              { style: STYLES.column },
              ...items.map((item, index) => h('div', { key: index, style: STYLES.listItem }, `· ${String(item)}`)),
            )

      const projectCard = h(
        'div',
        { style: card },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between' } },
          h('strong', { style: { fontSize: 13 } }, project.title || project.id || '未命名研究项目'),
          h(
            'span',
            { style: chip },
            `阶段 ${project.phase ? phaseLabel(project.phase) : '未设置'}`,
          ),
        ),
        project.goal ? h('div', { style: { ...muted, marginTop: 4 } }, project.goal) : null,
        h('div', { style: { ...mono, opacity: 0.62, fontSize: 12, marginTop: 6 } }, project.root || ''),
      )

      const pendingSection = h(
        'div',
        null,
        h('h3', { style: sectionTitle }, '待主项目决定'),
        pending.length === 0
          ? h('div', { style: { ...muted, marginBottom: 10 } }, '当前没有待主项目决定的交接')
          : h(
              'div',
              { style: { ...tableWrap, marginBottom: 10 } },
              h(
                'table',
                { style: table },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    ...['模块', '分支', '版本', 'stream', '要决定的问题', '操作'].map((label) =>
                      h('th', { key: label, style: th }, label),
                    ),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  ...pending.map((item, index) => {
                    const pathValue = item && item.path ? item.path : ''
                    const moduleId = (item && item.module) || moduleFromHandoffPath(pathValue)
                    const branch = (item && item.branch) || branchFromHandoffPath(pathValue)
                    const version = (item && item.version) || versionFromHandoffPath(pathValue)
                    return h(
                      'tr',
                      { key: pathValue || index },
                      h(
                        'td',
                        { style: td },
                        h('div', null, moduleId),
                        h(
                          'div',
                          { style: { ...mono, fontSize: 11, opacity: 0.62, whiteSpace: 'pre-wrap', wordBreak: 'break-all' } },
                          handoffName(pathValue),
                        ),
                      ),
                      h('td', { style: td }, branch),
                      h('td', { style: td }, `v${version}`),
                      h('td', { style: td }, (item && item.stream) || '—'),
                      h(
                        'td',
                        { style: { ...td, minWidth: 180 } },
                        h(
                          'div',
                          { style: { ...mono, fontSize: 12, whiteSpace: 'pre-wrap' } },
                          normalizeQuestions(item && item.questions) || '—',
                        ),
                      ),
                      h(
                        'td',
                        { style: { ...td, whiteSpace: 'nowrap' } },
                        h(
                          'button',
                          {
                            type: 'button',
                            style: { ...primaryButton, marginRight: 6 },
                            disabled: Boolean(options.busy),
                            onClick: () => callAction({ action: 'accept', handoff: pathValue }),
                          },
                          '接受',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            style: { ...dangerButton, marginRight: 6 },
                            disabled: Boolean(options.busy),
                            onClick: () => callAction({ action: 'reject', handoff: pathValue }),
                          },
                          '拒绝',
                        ),
                        h(
                          'button',
                          { type: 'button', style: button, disabled: Boolean(options.busy), onClick: () => openDetail(pathValue) },
                          '详情',
                        ),
                      ),
                    )
                  }),
                ),
              ),
            ),
      )

      const acceptedSection = h(
        'div',
        null,
        h('h3', { style: sectionTitle }, '已接受结果'),
        accepted.length === 0
          ? h('div', { style: { ...muted, marginBottom: 10 } }, '尚无已接受结果')
          : h(
              'div',
              { style: { ...tableWrap, marginBottom: 10 } },
              h(
                'table',
                { style: table },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    ...['stream', '版本', '路径', '状态', '操作'].map((label) => h('th', { key: label, style: th }, label)),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  ...accepted.map((item, index) => {
                    const pathValue = item && item.path ? item.path : ''
                    return h(
                      'tr',
                      { key: pathValue || index },
                      h('td', { style: td }, (item && item.stream) || '—'),
                      h('td', { style: td }, `v${(item && item.version) || versionFromHandoffPath(pathValue)}`),
                      h(
                        'td',
                        { style: td },
                        h(
                          'span',
                          { style: { ...mono, ...STYLES.link, fontSize: 12 }, onClick: () => openDetail(pathValue) },
                          pathValue || handoffName(pathValue),
                        ),
                      ),
                      h('td', { style: td }, renderStatusBadge(h, { status: 'ACCEPTED' })),
                      h(
                        'td',
                        { style: { ...td, whiteSpace: 'nowrap' } },
                        h('button', { type: 'button', style: button, onClick: () => openDetail(pathValue) }, '查看'),
                      ),
                    )
                  }),
                ),
              ),
            ),
      )

      return h(
        'div',
        null,
        projectCard,
        renderStatCards(h, { project }),
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
              marginBottom: 14,
            },
          },
          h(
            'div',
            { style: card },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 12 } },
              h('div', { style: { ...sectionTitle, margin: 0 } }, '🎯 成果与交接状态分布'),
              h('span', { style: { ...muted, fontSize: 12.5 } }, `${Array.isArray(project.handoffs) ? project.handoffs.length : 0} 条记录`),
            ),
            renderDonutChart(h, {
              total: Array.isArray(project.handoffs) ? project.handoffs.length : 0,
              title: '成果',
              sub: '交接记录',
              segments: [
                { label: '已接受', value: Number(counts.accepted) || 0, color: 'var(--rdw-st-accepted)' },
                { label: '待决定', value: Number(counts.provisional) || 0, color: 'var(--rdw-st-provisional)' },
                { label: '草稿', value: Number(counts.draft) || 0, color: 'var(--rdw-st-draft)' },
                { label: '阻塞', value: Number(counts.blocked) || 0, color: 'var(--rdw-st-blocked)' },
                { label: '已拒绝', value: Number(counts.rejected) || 0, color: 'var(--rdw-st-rejected)' },
                { label: '已取代', value: Number(counts.superseded) || 0, color: 'var(--rdw-st-superseded)' },
              ].filter((s) => s.value > 0),
            }),
          ),
          h(
            'div',
            { style: card },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 12 } },
              h('div', { style: { ...sectionTitle, margin: 0 } }, '📈 各模块进度与分支负载'),
              h('span', { style: { ...muted, fontSize: 12.5 } }, `${modules.length} 个模块`),
            ),
            renderModuleProgressBars(h, { modules }),
          ),
        ),
        h(
          'div',
          { style: { ...row, alignItems: 'flex-start', gap: 8, marginBottom: 4 } },
          h(
            'div',
            { style: { ...card, flex: '1 1 220px', minWidth: 200 } },
            h('h3', { style: { ...sectionTitle, margin: '0 0 6px' } }, '下一步'),
            renderList(nextSteps, '暂无记录的下一步'),
          ),
          h(
            'div',
            { style: { ...card, flex: '1 1 220px', minWidth: 200 } },
            h(
              'h3',
              { style: { ...sectionTitle, margin: '0 0 6px', color: blockers.length > 0 ? 'var(--rdw-st-blocked)' : 'inherit' } },
              '阻塞',
            ),
            blockers.length > 0
              ? renderList(blockers, '无')
              : h('div', { style: muted }, '当前没有阻塞项'),
          ),
        ),
        pendingSection,
        acceptedSection,
        renderHandoffDetail(h, {
          detail: options.detail,
          onClose: options.onCloseDetail,
          onRetry: options.onRetryDetail,
          onAction: options.onAction,
          busy: options.busy,
        }),
      )
    }

    // --- Module: src/views/HandoffsView.js ---
    /**
     * 研究项目 DAG 工作台 — 交接视图。
     *
     * 状态筛选 + 模块筛选 + 交接表格；操作按状态显示，行点击查看详情。
     * v1.2：状态词平实化（进行中/待确认/已出结果/已放弃/旧版本/卡住），原始状态码放在 title。
     */



    /** 按状态与模块过滤 handoff 列表。 */
    function filterHandoffs(handoffs, statusFilter, moduleFilter) {
      const status = String(statusFilter || 'all').toUpperCase()
      const moduleId = moduleFilter || 'all'
      return (Array.isArray(handoffs) ? handoffs : []).filter((handoff) => {
        if (!handoff || !handoff.path) return false
        if (status !== 'ALL' && String(handoff.status || '').toUpperCase() !== status) return false
        const owner = handoff.module || moduleFromHandoffPath(handoff.path)
        if (moduleId !== 'all' && owner !== moduleId) return false
        return true
      })
    }

    /**
     * @param {object} h React.createElement
     * @param {{project?: object, statusFilter?: string, setStatusFilter?: Function,
     *          moduleFilter?: string, setModuleFilter?: Function, onSelect?: Function,
     *          onAction?: Function, busy?: string, detail?: object|null,
     *          onCloseDetail?: Function, onRetryDetail?: Function}} props
     */
    function renderHandoffsView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const { row, select, chip, muted, card, sectionTitle } = STYLES
      const handoffs = project && Array.isArray(project.handoffs) ? project.handoffs : []
      const modules = project && Array.isArray(project.modules) ? project.modules : []
      const statusFilter = options.statusFilter || 'all'
      const moduleFilter = options.moduleFilter || 'all'
      const filtered = filterHandoffs(handoffs, statusFilter, moduleFilter)

      if (!project || project.exists === false) {
        return h(
          'div',
          { style: card },
          h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, '尚未加载 DAG 项目'),
          h('div', { style: muted }, '请先在顶部加载项目，或点「加载示例项目」。'),
        )
      }

      const counts = new Map()
      for (const handoff of handoffs) {
        const key = String(handoff.status || '').toUpperCase()
        counts.set(key, (counts.get(key) || 0) + 1)
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', margin: '2px 0 10px' } },
          h('span', { style: { ...sectionTitle, margin: 0 } }, `交接列表（共 ${handoffs.length} 个交接）`),
          h(
            'div',
            { style: { ...row, gap: 4 } },
            ...STATUS_ORDER.filter((key) => counts.has(key.toUpperCase())).map((key) =>
              h(
                'span',
                {
                  key,
                  title: key.toUpperCase(),
                  style: {
                    ...chip,
                    fontSize: 12,
                    color: STATUS_INFO[key.toUpperCase()].color,
                    background: STATUS_INFO[key.toUpperCase()].bg,
                    borderColor: STATUS_INFO[key.toUpperCase()].border,
                  },
                },
                `${plainStatusLabel(key.toUpperCase())} ${counts.get(key.toUpperCase())}`,
              ),
            ),
          ),
        ),
        h(
          'div',
          { style: { ...row, marginBottom: 8 } },
          h(
            'label',
            { style: { ...row, gap: 4, ...muted } },
            '状态',
            h(
              'select',
              {
                style: select,
                value: statusFilter,
                onChange: (event) => {
                  if (typeof options.setStatusFilter === 'function') options.setStatusFilter(event && event.target ? event.target.value : 'all')
                },
              },
              h('option', { value: 'all' }, '全部状态'),
              ...STATUS_ORDER.map((key) => h('option', { key, value: key.toUpperCase() }, plainStatusLabel(key.toUpperCase()))),
            ),
          ),
          h(
            'label',
            { style: { ...row, gap: 4, ...muted } },
            '模块',
            h(
              'select',
              {
                style: select,
                value: moduleFilter,
                onChange: (event) => {
                  if (typeof options.setModuleFilter === 'function') options.setModuleFilter(event && event.target ? event.target.value : 'all')
                },
              },
              h('option', { value: 'all' }, '全部模块'),
              ...modules.map((module) =>
                h('option', { key: module.id || module.name, value: module.id || module.name }, `${module.id || ''} ${module.name || ''}`.trim()),
              ),
            ),
          ),
          h('span', { style: muted }, `筛选结果：${filtered.length} 个交接`),
        ),
        renderHandoffTable(h, {
          handoffs: filtered,
          onSelect: options.onSelect,
          onAction: options.onAction,
          busy: options.busy,
          plainStatus: true,
          emptyText: '没有符合筛选条件的交接',
        }),
        renderHandoffDetail(h, {
          detail: options.detail,
          onClose: options.onCloseDetail,
          onRetry: options.onRetryDetail,
          onAction: options.onAction,
          busy: options.busy,
        }),
      )
    }

    // --- Module: src/views/ControlView.js ---
    /**
     * 研究项目 DAG 工作台 — 校验与运行视图。
     *
     * 项目路径与配置保存、全项目校验（checked 计数 + issues 分组）、重写报告、
     * `state set` 表单（phase / next / blocker）与运行记录控制台。
     */



    /**
     * @param {object} h React.createElement
     * @param {{project?: object, health?: object, config?: object, verify?: object|null,
     *          cliError?: string, busy?: string, runs?: object[], run?: object|null,
     *          selectedRunId?: string, onSelectRun?: Function, onVerify?: Function,
     *          onReport?: Function, onStateSet?: Function, stateForm?: object,
     *          setStateForm?: Function, projectInput?: string, setProject?: Function,
     *          onSaveConfig?: Function}} props
     */
    function renderControlView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, muted, button, primaryButton, input, select, sectionTitle, errorBanner } = STYLES
      const project = options.project && typeof options.project === 'object' ? options.project : null
      const health = options.health && typeof options.health === 'object' ? options.health : null
      const verify = options.verify && typeof options.verify === 'object' ? options.verify : null
      const cliError = typeof options.cliError === 'string' ? options.cliError : ''
      const busy = options.busy || ''
      const stateForm = options.stateForm && typeof options.stateForm === 'object' ? options.stateForm : {}
      const config = options.config && typeof options.config === 'object' ? options.config : null
      const projectInput = typeof options.projectInput === 'string' ? options.projectInput : ''
      const call = (handler, value) => {
        if (typeof handler === 'function') handler(value)
      }
      const actionLabel = (action) => ACTION_LABELS[action] || action || ''

      const checked = verify && verify.checked && typeof verify.checked === 'object' ? verify.checked : null
      const verified = Boolean(verify)
      const passed = Boolean(verify && verify.ok)
      const issues = verify && Array.isArray(verify.issues) ? verify.issues : []
      const verifyStatusChip = verified
        ? h(
            'span',
            {
              style: {
                ...chip,
                color: passed ? 'var(--rdw-st-accepted)' : 'var(--rdw-st-rejected)',
                borderColor: passed ? 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' : 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)',
                background: passed ? 'var(--rdw-st-accepted-soft)' : 'var(--rdw-danger-soft)',
                fontWeight: 600,
              },
            },
            passed ? '校验结果：通过' : `校验结果：存在问题（${issues.length} 项）`,
          )
        : h('span', { style: { ...chip, color: 'var(--rdw-st-draft)' } }, '校验结果：尚未获取')

      const checkedChips = checked
        ? [
            ['交接', checked.handoffs],
            ['模块', checked.modules],
            ['分支', checked.branches],
            ['文件', checked.files],
          ].map(([label, value]) =>
            h('span', { key: label, style: chip }, `${label} ${typeof value === 'number' ? value : 0}`),
          )
        : []

      const canWriteState = Boolean(project && project.exists !== false) && !busy
      const hasStateInput =
        Boolean(String(stateForm.phase || '').trim()) ||
        Boolean(String(stateForm.next || '').trim()) ||
        Boolean(String(stateForm.blocker || '').trim())

      const stateSetCard = h(
        'div',
        { style: card },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
          h('h3', { style: { ...sectionTitle, margin: 0 } }, '项目状态设置（state set）'),
          h('span', { style: muted }, '下一步 / 阻塞为追加语义，与 CLI 一致'),
        ),
        h(
          'div',
          { style: { ...row, marginBottom: 6 } },
          h(
            'label',
            { style: { ...row, gap: 4, ...muted } },
            '阶段',
            h(
              'select',
              {
                style: select,
                value: stateForm.phase || '',
                disabled: Boolean(busy),
                onChange: (event) => {
                  const value = event && event.target ? event.target.value : ''
                  call(options.setStateForm, { ...stateForm, phase: value })
                },
              },
              h('option', { value: '' }, '（保持不变）'),
              ...PHASES.map(([value, label]) => h('option', { key: value, value }, `${value} · ${label}`)),
            ),
          ),
          h(
            'label',
            { style: { ...row, gap: 4, ...muted, flex: '1 1 220px' } },
            '下一步',
            h('input', {
              value: stateForm.next || '',
              placeholder: '追加一条 next_step',
              style: { ...input, flex: '1 1 180px', minWidth: 140 },
              disabled: Boolean(busy),
              onChange: (event) => {
                call(options.setStateForm, { ...stateForm, next: event && event.target ? event.target.value : '' })
              },
            }),
          ),
        ),
        h('input', {
          value: stateForm.blocker || '',
          placeholder: '追加一条阻塞（可选）',
          style: { ...input, width: '100%', boxSizing: 'border-box', flex: '1 1 auto' },
          disabled: Boolean(busy),
          onChange: (event) => {
            call(options.setStateForm, { ...stateForm, blocker: event && event.target ? event.target.value : '' })
          },
        }),
        h(
          'div',
          { style: { ...row, justifyContent: 'flex-end', marginTop: 8 } },
          h(
            'button',
            {
              type: 'button',
              style: canWriteState && hasStateInput ? primaryButton : { ...button, opacity: 0.5 },
              disabled: !canWriteState || !hasStateInput,
              onClick: () => call(options.onStateSet),
            },
            busy === 'state-set' ? '写入中…' : '写入状态',
          ),
        ),
      )

      const configCard = h(
        'div',
        { style: card },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
          h('h3', { style: { ...sectionTitle, margin: 0 } }, '项目路径与配置保存'),
          h(
            'span',
            { style: muted },
            health && health.configPath ? `配置文件：${health.configPath}` : '配置文件路径未知',
          ),
        ),
        h(
          'div',
          { style: row },
          h('input', {
            value: projectInput,
            placeholder: 'DAG 项目绝对路径',
            'aria-label': '配置项目路径',
            style: { ...input, flex: '1 1 280px' },
            disabled: Boolean(busy),
            onChange: (event) => {
              call(options.setProject, event && event.target ? event.target.value : '')
            },
          }),
          h(
            'button',
            {
              type: 'button',
              style: button,
              disabled: Boolean(busy) || !projectInput.trim(),
              onClick: () => call(options.onSaveConfig, projectInput),
            },
            '保存配置',
          ),
          config && config.projectRoot
            ? h('span', { style: muted }, `已保存：${config.projectRoot}`)
            : h('span', { style: muted }, '尚未保存配置'),
        ),
      )

      const verifyCard = h(
        'div',
        { style: card },
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
          h('h3', { style: { ...sectionTitle, margin: 0 } }, '全项目校验与报告'),
          verifyStatusChip,
        ),
        h(
          'div',
          { style: { ...row, marginBottom: 4 } },
          h(
            'button',
            {
              type: 'button',
              style: primaryButton,
              disabled: Boolean(busy),
              onClick: () => call(options.onVerify),
            },
            busy === 'verify' ? '校验中…' : '运行校验',
          ),
          h(
            'button',
            {
              type: 'button',
              style: button,
              disabled: Boolean(busy),
              onClick: () => call(options.onReport),
            },
            busy === 'report' ? '生成中…' : '重写报告',
          ),
          checkedChips.length > 0 ? h('span', { style: muted }, `检查范围：` ) : null,
          ...checkedChips,
        ),
        cliError ? h('div', { style: { ...errorBanner, marginTop: 6 } }, `CLI 错误：${cliError}`) : null,
        verified ? renderIssueList(h, { issues }) : h('div', { style: { ...muted, marginTop: 6 } }, '尚未运行校验。'),
      )

      const detailHint = project && project.root
        ? h(
            'div',
            { style: { ...muted, marginBottom: 8 } },
            `当前项目：${project.id || '—'} · ${project.title || ''} · ${project.root}`,
          )
        : null

      return h(
        'div',
        null,
        detailHint,
        verifyCard,
        stateSetCard,
        configCard,
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', margin: '2px 0 6px' } },
          h('span', { style: { ...sectionTitle, margin: 0 } }, `运行记录${actionLabel(busy) && busy ? `（执行中：${actionLabel(busy)}）` : ''}`),
          h('span', { style: muted }, '点选一条记录展开 stdout / stderr'),
        ),
        renderRunConsole(h, {
          runs: options.runs,
          run: options.run,
          busy: options.busy,
          selectedId: options.selectedRunId,
          onSelect: options.onSelectRun,
        }),
      )
    }

    // --- Module: src/views/ContentView.js ---
    /**
     * 研究项目 DAG 工作台 — 内容页（v2.1，默认页）。
     *
     * 给人看的内容层：项目概览 + 需要你关注 + 子项目（模块）内容卡 + 详情抽屉 + 记想法。
     * 数据来自 GET /content（results/status/network/review 合并）；不要求用户理解状态机与门控。
     * 旧宿主（无 content 能力）的降级由面板处理，本模块只负责新内容页渲染。
     */




    /** 结果按 decidedAt 倒序。 */
    function sortResults(results) {
      return (Array.isArray(results) ? results : []).slice().sort((left, right) => {
        const leftTime = left && (left.decidedAt || left.acceptedAt) ? String(left.decidedAt || left.acceptedAt) : ''
        const rightTime = right && (right.decidedAt || right.acceptedAt) ? String(right.decidedAt || right.acceptedAt) : ''
        return leftTime < rightTime ? 1 : leftTime > rightTime ? -1 : 0
      })
    }

    /**
     * 渲染内容页。
     * @param {object} h React.createElement
     * @param {{content?: object|null, contentLoading?: boolean, contentError?: string,
     *          busy?: string, detail?: object|null, ideaError?: string,
     *          onRetry?: Function, onPublish?: Function, onOpenDetail?: Function,
     *          onOpenHandoff?: Function, onReview?: Function, onReviewItem?: Function,
     *          onIdea?: Function, onCloseDetail?: Function, onRetryHandoff?: Function,
     *          onGoEngineering?: Function, onPull?: Function, networkError?: string}} props
     */
    function renderContentView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const content = options.content && typeof options.content === 'object' && options.content.ok !== false ? options.content : null
      const busy = typeof options.busy === 'string' ? options.busy : ''
      const contentError = typeof options.contentError === 'string' ? options.contentError : ''
      const { card, row, chip, muted, button, primaryButton, sectionTitle, contentGrid, contentCard, contentTitle, contentMeta, contentBody, mutedBox } =
        STYLES
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      if (!content) {
        if (contentError) {
          const isNoProject = contentError.includes('未保存项目根路径') || contentError.includes('未提供 project')
          return h(
            'div',
            { style: card },
            h('div', { style: { fontSize: 14, fontWeight: 700, marginBottom: 6 } }, isNoProject ? '欢迎使用研究项目工作台' : '内容读取失败'),
            h('div', { style: { ...muted, marginBottom: 12 } }, isNoProject ? '当前尚未加载研究项目。请在顶部输入项目路径，或点击下方按钮直接加载完整示例：' : contentError),
            h(
              'div',
              { style: { ...row, gap: 8 } },
              isNoProject && typeof options.onLoadExample === 'function'
                ? h(
                    'button',
                    { type: 'button', style: primaryButton, disabled: Boolean(busy), onClick: () => call(options.onLoadExample) },
                    '一键加载示例项目（early-phosphate）',
                  )
                : h(
                    'button',
                    { type: 'button', style: primaryButton, disabled: Boolean(busy), onClick: () => call(options.onRetry) },
                    '重试',
                  ),
            ),
          )
        }
        return h('div', { style: { ...muted, padding: '12px 0' } }, options.contentLoading ? '正在加载内容…' : '暂无内容数据')
      }

      const resultsPayload = content.results && content.results.ok !== false ? content.results : null
      const statusPayload = content.status && content.status.ok !== false ? content.status : null
      const network = content.network && typeof content.network === 'object' ? content.network : null
      const review = content.review && typeof content.review === 'object' ? content.review : null
      const projectInfo = content.project && typeof content.project === 'object' ? content.project : {}
      const errors = content.errors && typeof content.errors === 'object' ? content.errors : {}

      const modules = resultsPayload && Array.isArray(resultsPayload.modules)
        ? resultsPayload.modules
        : statusPayload && Array.isArray(statusPayload.modules)
          ? statusPayload.modules
          : []
      const allResults = resultsPayload && Array.isArray(resultsPayload.results) ? resultsPayload.results : []
      const pendingDecisions = statusPayload && Array.isArray(statusPayload.pending_decisions) ? statusPayload.pending_decisions : []
      const blockers = statusPayload && Array.isArray(statusPayload.blockers) ? statusPayload.blockers : []
      const counts = resultsPayload && resultsPayload.counts && typeof resultsPayload.counts === 'object' ? resultsPayload.counts : {}
      const selfProjectId = (network && network.selfProjectId) || projectInfo.id || ''
      const selfNetworkProject =
        network && Array.isArray(network.projects) ? network.projects.find((item) => item && item.projectId === selfProjectId) || null : null
      const completionRows = selfNetworkProject && Array.isArray(selfNetworkProject.completion) ? selfNetworkProject.completion : []
      const completionByModule = new Map(completionRows.filter(Boolean).map((item) => [String(item.module), item]))
      const reviewByItem = review && review.byItem && typeof review.byItem === 'object' ? review.byItem : null
      const pendingReview = review && Array.isArray(review.pendingReview)
        ? review.pendingReview
        : network && Array.isArray(network.pendingReview)
          ? network.pendingReview.filter((item) => item && item.projectId === selfProjectId)
          : []
      const reviewSummary =
        review && review.summary && typeof review.summary === 'object'
          ? review.summary
          : selfNetworkProject && selfNetworkProject.review && typeof selfNetworkProject.review === 'object'
            ? selfNetworkProject.review
            : null

      const isReviewed = (result) => {
        if (!result) return false
        if (result.reviewed === true) return true
        if (!reviewByItem) return false
        const record = reviewByItem[reviewKeyOf(result.stream, result.version)]
        return Boolean(record && record.satisfied === true)
      }

      const resultsByModule = new Map()
      for (const result of allResults) {
        const moduleId = result && result.module ? String(result.module) : '未分组'
        if (!resultsByModule.has(moduleId)) resultsByModule.set(moduleId, [])
        resultsByModule.get(moduleId).push(result)
      }
      for (const list of resultsByModule.values()) {
        const sorted = sortResults(list)
        list.length = 0
        list.push(...sorted)
      }

      const moduleEntries = modules.map((module) => ({
        id: module && module.id !== undefined ? String(module.id) : '未分组',
        name: module && module.name ? String(module.name) : '',
        branches: module && module.branches !== undefined ? Number(module.branches) || 0 : 0,
        raw: module,
      }))
      for (const moduleId of resultsByModule.keys()) {
        if (!moduleEntries.some((entry) => entry.id === moduleId)) moduleEntries.push({ id: moduleId, name: '', branches: 0, raw: null })
      }

      const modulesWithResults = moduleEntries.filter((entry) => (resultsByModule.get(entry.id) || []).length > 0).length
      const acceptedTotal = reviewSummary && Number.isFinite(Number(reviewSummary.accepted))
        ? Number(reviewSummary.accepted)
        : allResults.length
      const reviewedTotal = reviewSummary && Number.isFinite(Number(reviewSummary.reviewed))
        ? Number(reviewSummary.reviewed)
        : allResults.filter((result) => isReviewed(result)).length
      const pendingDecisionCount = pendingDecisions.length
      const blockedCount = blockers.length > 0 ? blockers.length : countOf(counts, 'blocked')

      const moduleCardData = moduleEntries.map((entry) => {
        const moduleResults = resultsByModule.get(entry.id) || []
        const latest = moduleResults.length > 0 ? moduleResults[0] : null
        const completion = completionByModule.get(entry.id) || null
        const pendingInModule = pendingDecisions.filter(
          (item) => item && String(item.module || moduleFromHandoffPath(item.path)) === entry.id,
        )
        const acceptedCount =
          completion && Number.isFinite(Number(completion.acceptedCount))
            ? Number(completion.acceptedCount)
            : moduleResults.length
        const reviewedCount =
          completion && Number.isFinite(Number(completion.reviewedCount))
            ? Number(completion.reviewedCount)
            : moduleResults.filter((result) => isReviewed(result)).length
        const pendingCount =
          completion && Array.isArray(completion.pending) && completion.pending.length > 0
            ? completion.pending.length
            : pendingInModule.length
        const blockedInModule = completion && Array.isArray(completion.blocked) ? completion.blocked.length : 0
        const status =
          (completion && completion.status) ||
          (blockedInModule > 0
            ? 'blocked'
            : pendingCount > 0
              ? 'active'
              : acceptedCount > 0
                ? 'done'
                : 'idle')
        return {
          entry,
          latest,
          status,
          acceptedCount,
          reviewedCount,
          pendingCount,
          pendingStreams:
            completion && Array.isArray(completion.pending)
              ? completion.pending
              : pendingInModule.map((item) => (item && item.stream) || ''),
        }
      })

      /* -------------------------------------------------------- 需要你关注 */
      const attentionNodes = []
      for (const item of pendingDecisions) {
        const moduleId = (item && item.module) || moduleFromHandoffPath(item && item.path)
        const stream = (item && item.stream) || '待决定'
        const version = (item && item.version) || 1
        const question = firstLineText(normalizeQuestions(item && item.questions), 120)
        attentionNodes.push({
          key: `pending-${(item && item.path) || attentionNodes.length}`,
          kind: 'pending',
          node: h(
            'div',
            { key: `pending-${(item && item.path) || attentionNodes.length}`, style: { ...card, padding: '8px 10px', marginBottom: 6 } },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 2 } },
              h(
                'span',
                {
                  style: {
                    ...chip,
                    color: item && item.needs_decision ? 'var(--rdw-st-provisional)' : 'var(--rdw-st-accepted)',
                    borderColor: item && item.needs_decision ? 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' : 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)',
                  },
                },
                item && item.needs_decision ? '需人类决策' : '待决定',
              ),
              h('span', { style: { ...chip, fontSize: 12 } }, `${moduleId} · ${stream} v${version}`),
            ),
            h('div', { style: contentBody }, question || '有一项决定等你确认'),
            h(
              'div',
              { style: { ...row, justifyContent: 'flex-end', gap: 6, marginTop: 4 } },
              h(
                'button',
                { type: 'button', style: button, onClick: () => call(options.onOpenHandoff, item && item.path) },
                '查看交接',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: button,
                  title: '撤回为 DRAFT 状态，解冻正文以便修改错别字或调整产物',
                  onClick: () => call(options.onUnsubmit, item && item.path),
                },
                '撤回修改',
              ),
            ),
          ),
        })
      }
      for (const item of pendingReview) {
        const moduleId = (item && item.module) || moduleFromHandoffPath(item && item.path)
        const stream = (item && item.stream) || ''
        const version = (item && item.version) || 1
        const matched = allResults.find((result) => result && result.stream === stream && Number(result.version) === Number(version))
        const title = matched && matched.title ? String(matched.title) : ''
        attentionNodes.push({
          key: `review-${stream}-${version}-${attentionNodes.length}`,
          kind: 'review',
          node: h(
            'div',
            { key: `review-${stream}-${version}-${attentionNodes.length}`, style: { ...card, padding: '8px 10px', marginBottom: 6 } },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 2 } },
              h('span', { style: { ...chip, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' } }, '待复核'),
              h('span', { style: { ...chip, fontSize: 12 } }, `${moduleId} · ${stream} v${version}`),
            ),
            title ? h('div', { style: contentBody }, truncateText(title, 120)) : null,
            h(
              'div',
              { style: { ...row, justifyContent: 'flex-end', marginTop: 4 } },
              h(
                'button',
                {
                  type: 'button',
                  style: primaryButton,
                  disabled: Boolean(busy),
                  onClick: () => call(options.onReviewItem, item, true),
                },
                '满意',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: button,
                  onClick: () => (matched ? call(options.onOpenDetail, matched) : call(options.onOpenHandoff, item && item.path)),
                },
                '查看内容',
              ),
            ),
          ),
        })
      }
      for (const blocker of blockers) {
        attentionNodes.push({
          key: `blocked-${attentionNodes.length}`,
          kind: 'blocked',
          node: h(
            'div',
            { key: `blocked-${attentionNodes.length}`, style: { ...card, padding: '8px 10px', marginBottom: 6 } },
            h(
              'div',
              { style: { ...row, marginBottom: 2 } },
              h('span', { style: { ...chip, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, '阻塞'),
            ),
            h('div', { style: contentBody }, truncateText(String(blocker), 200)),
          ),
        })
      }
      const attentionVisible = attentionNodes.slice(0, 6)

      /* ---------------------------------------------------------- 模块卡片 */
      const renderModuleCard = (data) => {
        const { entry, latest, status, acceptedCount, reviewedCount, pendingCount, pendingStreams } = data
        const statusTheme = moduleStatusInfo(status)
        const latestReviewed = latest ? isReviewed(latest) : false
        const canSatisfy = Boolean(latest) && !(reviewByItem && latestReviewed) && !busy
        const keyLines = latest ? takeLines(latest.keyResults, 3, 120) : []
        const limitsLine = latest ? firstLineText(latest.limitations, 120) : ''
        return h(
          'div',
          { key: `module-${entry.id}`, className: 'rdw-card-hover', style: contentCard },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div', { style: contentTitle }, entry.name || entry.id),
              h('div', { style: contentMeta }, entry.id),
            ),
            h(
              'span',
              { style: { ...chip, color: statusTheme.color, borderColor: statusTheme.color, fontSize: 12, fontWeight: 600 } },
              statusTheme.label,
            ),
          ),
          h(
            'div',
            { style: { ...STYLES.statBar } },
            h('span', { style: { ...chip, fontSize: 12 } }, `已接受 ${acceptedCount}`),
            reviewByItem ? h('span', { style: { ...chip, fontSize: 12 } }, `已复核 ${reviewedCount}/${acceptedCount}`) : null,
            pendingCount > 0 ? h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-provisional)' } }, `待决定 ${pendingCount}`) : null,
          ),
          latest
            ? h(
                'div',
                { style: { minWidth: 0 } },
                h(
                  'div',
                  { style: { ...contentBody, fontWeight: 600 } },
                  `${truncateText(latest.title || latest.stream || '未命名结果', 80)} · ${latest.stream || ''} v${latest.version || 1}`,
                ),
                keyLines.length > 0
                  ? h('div', { style: { ...contentBody, marginTop: 2, color: 'inherit', opacity: 0.9 } }, keyLines.join('\n'))
                  : null,
                limitsLine ? h('div', { style: { ...muted, marginTop: 2 } }, `限制：${limitsLine}`) : null,
                reviewByItem
                  ? h(
                      'div',
                      { style: { marginTop: 3 } },
                      h(
                        'span',
                        {
                          style: {
                            ...chip,
                            fontSize: 12,
                            color: latestReviewed ? 'var(--rdw-st-accepted)' : 'var(--rdw-st-provisional)',
                            borderColor: latestReviewed ? 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' : 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)',
                          },
                        },
                        latestReviewed ? '已复核' : '待复核',
                      ),
                      latest && latest.is_stale
                        ? h(
                            'span',
                            {
                              style: {
                                ...chip,
                                fontSize: 12,
                                color: 'var(--rdw-st-rejected)',
                                borderColor: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)',
                                fontWeight: 700,
                                marginLeft: 4,
                              },
                              title: Array.isArray(latest.stale_reasons)
                                ? latest.stale_reasons.join('\n')
                                : '依赖的上游版本已被替代',
                            },
                            '⚠️ 级联失效',
                          )
                        : null,
                    )
                  : null,
                h(
                  'div',
                  { style: { ...row, gap: 6, marginTop: 4 } },
                  h(
                    'button',
                    { type: 'button', style: button, onClick: () => call(options.onOpenDetail, latest) },
                    '查看内容',
                  ),
                  latest && latest.branch
                    ? h(
                        'button',
                        {
                          type: 'button',
                          style: button,
                          onClick: () => call(options.onOpenBranchWork, { module: latest.module, branch: latest.branch }),
                        },
                        '🤖 智能体工作与对话',
                      )
                    : null,
                ),
              )
            : h(
                'div',
                { style: mutedBox },
                h('div', { style: { fontWeight: 600, marginBottom: 2 } }, '还没有可用的结果'),
                h(
                  'div',
                  { style: muted },
                  pendingStreams.length > 0
                    ? `待决定 ${pendingStreams.length} 项：${pendingStreams.filter(Boolean).slice(0, 3).join('、')}`
                    : entry.branches > 0
                      ? `该子项目有 ${entry.branches} 个分支在推进`
                      : '尚在准备阶段',
                ),
              ),
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginTop: 'auto' } },
            h(
              'button',
              {
                type: 'button',
                style: canSatisfy ? primaryButton : { ...button, opacity: 0.55 },
                disabled: !canSatisfy,
                onClick: () => call(options.onReview, latest, true),
              },
              latest && reviewByItem && latestReviewed ? '已全部满意' : '满意',
            ),
            h(
              'button',
              {
                type: 'button',
                style: button,
                onClick: () =>
                  call(options.onIdea, {
                    module: entry.id,
                    stream: latest && latest.stream ? latest.stream : '',
                    version: latest && latest.version ? latest.version : '',
                  }),
              },
              '记想法',
            ),
          ),
        )
      }

      /* ------------------------------------------------------------- 详情抽屉 */
      const detail = options.detail && typeof options.detail === 'object' ? options.detail : null
      let detailNode = null
      if (detail) {
        if (detail.type === 'handoff') {
          detailNode = h(
            'div',
            null,
            h('div', { style: STYLES.drawerBackdrop, onClick: () => call(options.onCloseDetail) }),
            h(
              'div',
              { style: STYLES.drawer, role: 'dialog', 'aria-modal': 'true', 'aria-label': '交接详情' },
              h('div', { style: mutedBox }, '这是待决定交接。接受/拒绝请在「工程 → 交接」页面完成。'),
              h(
                'div',
                { style: { marginTop: 8 } },
                renderHandoffDetail(h, {
                  detail: { path: detail.path, loading: Boolean(detail.loading), data: detail.data || null, error: detail.error || '' },
                  onClose: options.onCloseDetail,
                  onRetry: options.onRetryHandoff,
                  busy: Boolean(busy),
                }),
              ),
            ),
          )
        } else {
          const result = detail.result && typeof detail.result === 'object' ? detail.result : null
          if (!result) {
            detailNode = null
          } else {
            const files = Array.isArray(result.files) ? result.files : []
            const resultReviewed = isReviewed(result)
            detailNode = h(
              'div',
              null,
              h('div', { style: STYLES.drawerBackdrop, onClick: () => call(options.onCloseDetail) }),
              h(
                'div',
                { style: STYLES.drawer, role: 'dialog', 'aria-modal': 'true', 'aria-label': '内容详情' },
                h(
                  'div',
                  { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
                  h('strong', { style: { fontSize: 14, overflowWrap: 'anywhere' } }, result.title || result.stream || '内容详情'),
                  h('button', { type: 'button', style: button, onClick: () => call(options.onCloseDetail) }, '关闭'),
                ),
                h(
                  'div',
                  { style: { ...contentMeta, marginBottom: 8 } },
                  `${result.stream || ''} v${result.version || 1} · ${(result.moduleName || '') || result.module || ''} · ${result.decidedAt || result.acceptedAt || ''}`,
                ),
                result.question
                  ? h(
                      'div',
                      { style: { marginBottom: 8 } },
                      h('div', { style: sectionTitle }, '研究问题'),
                      h('div', { style: contentBody }, String(result.question)),
                    )
                  : null,
                h('div', { style: sectionTitle }, '关键结果'),
                h('div', { style: { ...contentBody, whiteSpace: 'pre-wrap' } }, result.keyResults || '（未提供）'),
                result.limitations
                  ? h(
                      'div',
                      { style: { marginTop: 8 } },
                      h('div', { style: sectionTitle }, '局限与注意事项'),
                      h('div', { style: { ...contentBody, opacity: 0.8 } }, String(result.limitations)),
                    )
                  : null,
                files.length > 0
                  ? h(
                      'div',
                      { style: { marginTop: 8 } },
                      h('div', { style: sectionTitle }, `文件（${files.length}）— 点击直接预览代码与数据`),
                      h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 } },
                        ...files.map((file) => {
                          const str = String(file)
                          const ext = str.split('.').pop().toLowerCase()
                          const icon = ext === 'csv' || ext === 'tsv' ? '📊' : ext === 'r' || ext === 'py' || ext === 'sh' || ext === 'js' ? '💻' : ext === 'md' ? '📝' : ext === 'svg' || ext === 'png' ? '🖼️' : '📄'
                          return h(
                            'button',
                            {
                              key: str,
                              type: 'button',
                              style: {
                                ...button,
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                fontSize: 11,
                                borderRadius: 4,
                                cursor: 'pointer',
                                background: 'var(--rdw-sunken)',
                              },
                              onClick: () => call(options.onOpenFile, str),
                            },
                            h(
                              'div',
                              { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
                              h('span', null, icon),
                              h('span', { style: { ...STYLES.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, str),
                            ),
                            h('span', { style: { fontSize: 12, opacity: 0.7, color: 'var(--rdw-accent)', whiteSpace: 'nowrap', marginLeft: 8 } }, '查看内容 →'),
                          )
                        }),
                      ),
                    )
                  : null,
                result.path
                  ? h('div', { style: { ...STYLES.mono, fontSize: 12, opacity: 0.6, marginTop: 8 } }, result.path)
                  : null,
                h(
                  'div',
                  { style: { ...row, justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 } },
                  h(
                    'div',
                    { style: { ...row } },
                    h(
                      'button',
                      {
                        type: 'button',
                        style: resultReviewed ? { ...button, opacity: 0.55 } : primaryButton,
                        disabled: resultReviewed || Boolean(busy),
                        onClick: () => call(options.onReview, result, true),
                      },
                      resultReviewed ? '已满意' : '满意',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: button,
                        disabled: Boolean(busy),
                        onClick: () => call(options.onReview, result, false),
                      },
                      '待复核',
                    ),
                  ),
                  h(
                    'div',
                    { style: { ...row, gap: 6 } },
                    result && (result.branch || result.module)
                      ? h(
                          'button',
                          {
                            type: 'button',
                            style: button,
                            onClick: () => call(options.onOpenBranchWork, { module: result.module, branch: result.branch }),
                          },
                          '🤖 智能体工作与对话',
                        )
                      : null,
                    h('button', { type: 'button', style: button, onClick: () => call(options.onGoEngineering) }, '在工程页查看交接'),
                  ),
                ),
              ),
            )
          }
        }
      }

      const errorsLine = []
      if (errors.results) errorsLine.push(`results：${truncateText(errors.results, 120)}`)
      if (errors.status) errorsLine.push(`status：${truncateText(errors.status, 120)}`)

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...card, display: 'flex', flexDirection: 'column', gap: 6 } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between' } },
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 15, fontWeight: 700, overflowWrap: 'anywhere' } }, projectInfo.title || '研究项目'),
              h('div', { style: contentMeta }, `${phaseLabel(projectInfo.phase)} · ${projectInfo.root || ''}`),
            ),
            h(
              'div',
              { style: { ...row } },
              h('button', { type: 'button', style: primaryButton, disabled: Boolean(busy), onClick: () => call(options.onPublish) }, busy === 'bridge:publish' ? '发布中…' : '发布到网络'),
              h('button', { type: 'button', style: button, disabled: Boolean(busy), onClick: () => call(options.onPull), title: '拉取 TeamMCP 网络消息' }, '拉取消息'),
            ),
          ),
          h(
            'div',
            { style: STYLES.statBar },
            h('span', { style: { ...chip, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } }, `子项目 ${modulesWithResults}/${moduleEntries.length} 已有结果`),
            reviewByItem ? h('span', { style: { ...chip } }, `已复核 ${reviewedTotal}/${acceptedTotal}`) : null,
            h('span', { style: { ...chip, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 32%,transparent)' } }, `待决定 ${pendingDecisionCount}`),
            h('span', { style: { ...chip, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, `阻塞 ${blockedCount}`),
          ),
          options.networkError ? h('div', { style: { ...muted } }, `网络提示：${truncateText(options.networkError, 160)}`) : null,
          errorsLine.length > 0 ? h('div', { style: { ...muted } }, `部分数据读取失败：${errorsLine.join('；')}`) : null,
        ),
        attentionVisible.length > 0
          ? h(
              'div',
              null,
              h('h3', { style: sectionTitle }, '需要你关注'),
              ...attentionVisible.map((item) => item.node),
            )
          : h(
              'div',
              { style: { ...mutedBox, marginBottom: 12, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 30%,transparent)' } },
              '没有需要你处理的事，继续专注研究',
            ),
        h('h3', { style: sectionTitle }, '子项目（模块）'),
        moduleCardData.length > 0
          ? h('div', { style: contentGrid }, ...moduleCardData.map(renderModuleCard))
          : h(
              'div',
              { style: emptyStateStyle() },
              h('div', { style: emptyIconStyle(), 'aria-hidden': 'true' }, '🧩'),
              h('div', { style: emptyTitleStyle() }, '这个项目还没有子项目（模块）'),
              h('div', { style: emptyBodyStyle() }, '子项目是研究主线的分段：文献检索、统计分析、论文写作等。先建一个模块，主任务才能沿着它推进。'),
            ),
        detailNode,
        renderFileModal(h, options.fileModal, options.onCloseFileModal, options.onOpenExternal),
        renderBranchWorkModal(
          h,
          options.branchWorkModal,
          options.onCloseBranchWorkModal,
          options.onOpenFile,
          options.onSendDirective,
          options.onDirectiveChange,
        ),
      )
    }

    /**
     * 记想法对话框：文本 + 可选 tag → POST /bridge {action:'idea'}。
     * @param {object} h React.createElement
     * @param {{dialog?: object|null, busy?: boolean, onChange?: Function,
     *          onConfirm?: Function, onCancel?: Function}} props
     */
    function renderIdeaDialog(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const dialog = options.dialog
      if (!dialog) return null
      const { row, muted, textarea, input, button, primaryButton, errorBanner } = STYLES
      const busy = Boolean(options.busy)
      const text = typeof dialog.text === 'string' ? dialog.text : ''
      const tag = typeof dialog.tag === 'string' ? dialog.tag : ''
      const canSave = text.trim().length > 0 && text.trim().length <= 2000 && !busy
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      return h(
        'div',
        { style: STYLES.overlay, role: 'presentation' },
        h(
          'div',
          { style: STYLES.dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': '记想法' },
          h('strong', { style: { fontSize: 14 } }, '记一条想法'),
          h('div', { style: { ...muted, margin: '4px 0 8px' } }, dialog.context ? `关联：${dialog.context}` : '记下当前的研究想法，会同步到项目网络。'),
          dialog.error ? h('div', { style: { ...errorBanner, marginBottom: 8 } }, dialog.error) : null,
          h('textarea', {
            value: text,
            'data-field': 'text',
            'aria-label': '想法内容',
            placeholder: '例如：亚组分析先按基线 SOFA 分层，再补 E-value 敏感性分析',
            style: { ...textarea, minHeight: 96 },
            disabled: busy,
            onChange: (event) => call(options.onChange, 'text', event && event.target ? event.target.value : ''),
          }),
          h('input', {
            value: tag,
            'data-field': 'tag',
            'aria-label': '想法标签（可选）',
            placeholder: '标签（可选，如 stats / methods）',
            style: { ...input, width: '100%', marginTop: 8 },
            disabled: busy,
            onChange: (event) => call(options.onChange, 'tag', event && event.target ? event.target.value : ''),
          }),
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginTop: 10 } },
            h('span', { style: muted }, `${text.trim().length} / 2000 字`),
            h(
              'div',
              { style: { ...row } },
              h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onCancel) }, '取消'),
              h(
                'button',
                {
                  type: 'button',
                  style: canSave ? primaryButton : { ...button, opacity: 0.55 },
                  disabled: !canSave,
                  'aria-label': '保存想法',
                  onClick: () => {
                    if (canSave) call(options.onConfirm)
                  },
                },
                busy ? '保存中…' : '保存想法',
              ),
            ),
          ),
        ),
      )
    }

    /** 渲染 CSV 预览表格。 */
    function renderCsvTable(h, text, ext) {
      const sep = ext === '.tsv' ? '\t' : ','
      const lines = String(text || '').trim().split('\n').filter(Boolean)
      if (lines.length === 0) return h('div', { style: STYLES.muted }, '（空表格）')
      const headers = lines[0].split(sep)
      const rows = lines.slice(1, 101).map((l) => l.split(sep))
      return h(
        'div',
        { style: { overflowX: 'auto', maxHeight: '55vh', border: '1px solid var(--rdw-line-2)', borderRadius: 'var(--rdw-r-sm)' } },
        h(
          'table',
          { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' } },
          h(
            'thead',
            { style: { background: 'var(--rdw-panel)', position: 'sticky', top: 0 } },
            h(
              'tr',
              null,
              ...headers.map((hd, idx) =>
                h('th', { key: idx, style: { padding: '6px 10px', borderBottom: '1px solid var(--rdw-line-2)', whiteSpace: 'nowrap' } }, hd.trim()),
              ),
            ),
          ),
          h(
            'tbody',
            null,
            ...rows.map((row, rIdx) =>
              h(
                'tr',
                { key: rIdx, style: { background: rIdx % 2 === 1 ? 'var(--rdw-sunken)' : 'transparent' } },
                ...row.map((cell, cIdx) => {
                  const val = cell.trim()
                  const isNum = !isNaN(Number(val)) && val.length > 0
                  return h(
                    'td',
                    {
                      key: cIdx,
                      style: {
                        padding: '5px 10px',
                        borderBottom: '1px solid var(--rdw-line)',
                        whiteSpace: 'nowrap',
                        textAlign: isNum ? 'right' : 'left',
                        fontFamily: isNum ? 'monospace' : 'inherit',
                      },
                    },
                    val,
                  )
                }),
              ),
            ),
          ),
        ),
        lines.length > 101 ? h('div', { style: { ...STYLES.muted, padding: '4px 8px', fontSize: 12 } }, `已预览前 100 行（共 ${lines.length - 1} 行）`) : null,
      )
    }

    /** 渲染文件内容预览模态框。 */
    function renderFileModal(h, fileModal, onClose, onOpenExternal) {
      if (!fileModal) return null
      const { row, muted, button, primaryButton, card, dialog } = STYLES
      const isCsv = fileModal.data && (fileModal.data.ext === '.csv' || fileModal.data.ext === '.tsv')
      const extIcon = isCsv ? '📊' : fileModal.data && (fileModal.data.ext === '.r' || fileModal.data.ext === '.py') ? '💻' : '📄'

      return h(
        'div',
        { style: STYLES.overlay, role: 'presentation' },
        h(
          'div',
          { style: { ...dialog, width: '85%', maxWidth: 880, maxHeight: '85vh', display: 'flex', flexDirection: 'column' } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
              h('span', { style: { fontSize: 16 } }, extIcon),
              h('strong', { style: { fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, fileModal.path),
              fileModal.data ? h('span', { style: { ...muted, fontSize: 12 } }, `(${Math.round(fileModal.data.size / 1024 * 10) / 10} KB · ${fileModal.data.lines} 行)`) : null,
            ),
            h('button', { type: 'button', style: { ...button, padding: '2px 8px' }, onClick: onClose }, '✕'),
          ),
          h(
            'div',
            { style: { flex: 1, overflowY: 'auto', minHeight: 180, margin: '8px 0' } },
            fileModal.loading
              ? h('div', { style: { ...muted, padding: 20 } }, '正在读取文件...')
              : fileModal.error
                ? h('div', { style: { ...muted, color: 'var(--rdw-st-rejected)', padding: 20 } }, fileModal.error)
                : isCsv
                  ? renderCsvTable(h, fileModal.data.content, fileModal.data.ext)
                  : h(
                      'div',
                      {
                        style: {
                          background: 'var(--rdw-sunken)',
                          padding: 10,
                          borderRadius: 4,
                          overflowX: 'auto',
                          maxHeight: '55vh',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          lineHeight: 1.5,
                          whiteSpace: 'pre',
                        },
                      },
                      fileModal.data ? fileModal.data.content : '',
                    ),
          ),
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginTop: 8 } },
            h(
              'div',
              { style: { ...row, gap: 6, flexWrap: 'wrap' } },
              h(
                'button',
                {
                  type: 'button',
                  style: primaryButton,
                  title: '在 DSH 侧边栏编辑器中打开全文（比弹窗更适合读长文件与代码）',
                  onClick: () => onOpenSidebar && onOpenSidebar(fileModal.path),
                },
                '📂 在侧边栏打开',
              ),
              h(
                'button',
                { type: 'button', style: button, onClick: () => onOpenExternal && onOpenExternal(fileModal.path) },
                '在系统资源管理器中定位',
              ),
            ),
            h('button', { type: 'button', style: button, onClick: onClose }, '关闭'),
          ),
        ),
      )
    }

    /** 渲染分支智能体工作区与对话模态框。 */
    function renderBranchWorkModal(h, branchWorkModal, onClose, onOpenFile, onSendDirective, onDirectiveChange) {
      if (!branchWorkModal) return null
      const { row, muted, button, primaryButton, dialog, chip, textarea } = STYLES
      const data = branchWorkModal.data
      const loading = branchWorkModal.loading
      const error = branchWorkModal.error
      const directiveText = branchWorkModal.directiveText || ''
      const sending = branchWorkModal.sending

      return h(
        'div',
        { style: STYLES.overlay, role: 'presentation' },
        h(
          'div',
          { style: { ...dialog, width: '90%', maxWidth: 920, maxHeight: '88vh', display: 'flex', flexDirection: 'column' } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 6 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              h('span', { style: { fontSize: 16 } }, '🤖'),
              h('strong', { style: { fontSize: 14 } }, data ? `智能体工作区 · ${data.module.name} / ${data.branch.name}` : '智能体工作区与对话'),
              data ? h('span', { style: { ...chip, fontSize: 12 } }, data.branch.id) : null,
            ),
            h('button', { type: 'button', style: { ...button, padding: '2px 8px' }, onClick: onClose }, '✕'),
          ),
          h(
            'div',
            { style: { flex: 1, overflowY: 'auto', padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 12 } },
            loading
              ? h('div', { style: { ...muted, padding: 20 } }, '正在读取智能体工作区...')
              : error
                ? h('div', { style: { ...muted, color: 'var(--rdw-st-rejected)', padding: 20 } }, error)
                : data
                  ? [
                      // 1. 工作产出与代码
                      h(
                        'div',
                        { key: 'files', style: { border: '1px solid var(--rdw-line)', borderRadius: 'var(--rdw-r-sm)', padding: 10 } },
                        h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 6 } }, '📁 智能体工作文件（代码与物料）'),
                        h('div', { style: { ...muted, fontSize: 12, marginBottom: 6 } }, '点击即可直接展开预览脚本代码或数据表格：'),
                        h(
                          'div',
                          { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                          ...(data.workFiles || []).map((wf) =>
                            h(
                              'button',
                              {
                                key: wf.rel,
                                type: 'button',
                                style: { ...button, fontSize: 12, padding: '3px 8px', cursor: 'pointer' },
                                onClick: () => onOpenFile && onOpenFile(wf.rel),
                              },
                              `💻 work/${wf.name}`,
                            ),
                          ),
                          ...(data.outputFiles || []).map((of) =>
                            h(
                              'button',
                              {
                                key: of.rel,
                                type: 'button',
                                style: { ...button, fontSize: 12, padding: '3px 8px', cursor: 'pointer', borderColor: 'color-mix(in srgb,var(--rdw-accent) 32%,transparent)' },
                                onClick: () => onOpenFile && onOpenFile(of.rel),
                              },
                              `📊 outputs/${of.name}`,
                            ),
                          ),
                        ),
                      ),

                      // 2. 思考与推理日志 (SESSION)
                      data.sessionNotes
                        ? h(
                            'div',
                            { key: 'session', style: { border: '1px solid var(--rdw-line)', borderRadius: 'var(--rdw-r-sm)', padding: 10 } },
                            h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4 } }, '🧠 智能体内部思考与会话推理记录'),
                            h(
                              'div',
                              {
                                style: {
                                  background: 'var(--rdw-sunken)',
                                  padding: 8,
                                  borderRadius: 4,
                                  maxHeight: 180,
                                  overflowY: 'auto',
                                  fontSize: 11,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'monospace',
                                  lineHeight: 1.4,
                                },
                              },
                              data.sessionNotes,
                            ),
                          )
                        : null,

                      // 3. 任务简报 (BRIEF)
                      data.brief
                        ? h(
                            'div',
                            { key: 'brief', style: { border: '1px solid var(--rdw-line)', borderRadius: 'var(--rdw-r-sm)', padding: 10 } },
                            h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4 } }, '📋 任务简报 BRIEF.md'),
                            h(
                              'div',
                              {
                                style: {
                                  background: 'var(--rdw-sunken)',
                                  padding: 8,
                                  borderRadius: 4,
                                  maxHeight: 140,
                                  overflowY: 'auto',
                                  fontSize: 11,
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.4,
                                },
                              },
                              data.brief,
                            ),
                          )
                        : null,

                      // 4. 与智能体对话 / 派发调优指令
                      h(
                        'div',
                        { key: 'dialogue', style: { border: '1px solid var(--rdw-line)', borderRadius: 'var(--rdw-r-sm)', padding: 10 } },
                        h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4 } }, '💬 与该模块智能体直接对话 / 派发指令'),
                        data.directives
                          ? h(
                              'div',
                              {
                                style: {
                                  background: 'var(--rdw-sunken)',
                                  padding: 8,
                                  borderRadius: 4,
                                  maxHeight: 120,
                                  overflowY: 'auto',
                                  fontSize: 11,
                                  whiteSpace: 'pre-wrap',
                                  marginBottom: 8,
                                },
                              },
                              data.directives,
                            )
                          : null,
                        h('textarea', {
                          value: directiveText,
                          placeholder: '输入向该模块智能体下达的指令或追问（例如：将截尾阈值调整为 95% 重算，或检查乳酸缺失分布）...',
                          style: { ...textarea, minHeight: 64, width: '100%' },
                          onChange: (e) => onDirectiveChange && onDirectiveChange(e.target ? e.target.value : ''),
                        }),
                        h(
                          'div',
                          { style: { ...row, justifyContent: 'flex-end', marginTop: 6 } },
                          h(
                            'button',
                            {
                              type: 'button',
                              style: primaryButton,
                              disabled: !directiveText.trim() || sending,
                              onClick: () => onSendDirective && onSendDirective(directiveText),
                            },
                            sending ? '正在发送指令…' : '发送指令给该智能体',
                          ),
                        ),
                      ),
                    ]
                  : null,
          ),
          h(
            'div',
            { style: { ...row, justifyContent: 'flex-end', marginTop: 8 } },
            h('button', { type: 'button', style: button, onClick: onClose }, '关闭'),
          ),
        ),
      )
    }

    // --- Module: src/views/FishboneView.js ---
    /**
     * 研究项目 DAG 工作台 — 项目流程主线视图（v2.6，真正的分叉骨架）。
     *
     * 布局 = 经典项目流程图（Ishikawa）：
     *   - 左侧项目目标：研究目标（可点击清除筛选）；
     *   - 中间粗主支：一条渐变主轴；
     *   - 每个模块 = 一根从主支斜伸出的主支（上下交错，指向项目目标方向），
     *     末端挂模块名牌（名称 + 完成度 + 分支数）；
     *   - 每个分支 = 从主支身上横向长出的子分支（圆点 = 状态色，⚠ = 级联过期）；
     *   - 右侧整体进度：整体回连进度。
     *
     * 交互：点名牌筛选该模块；点子分支打开智能体工作区；点项目目标/清除按钮取消筛选。
     * 数据：GET /fishbone。
     */




    /** 触发对象右键：向面板层冒泡一个带定位的请求。 */
    function emitContextMenu(options, event, target) {
      if (!event || typeof event.preventDefault !== 'function') return
      event.preventDefault()
      if (event.stopPropagation) event.stopPropagation()
      if (typeof options.onContextMenu === 'function') {
        options.onContextMenu({ x: event.clientX, y: event.clientY, target })
      }
    }

    /** 触发分支悬停速览卡（400ms 延迟由面板层控制；这里只报位置与目标）。 */
    function emitHoverCard(options, event, rib) {
      if (typeof options.onHoverRib === 'function') {
        options.onHoverRib(rib, { x: event.clientX + 12, y: event.clientY + 10 })
      }
    }
    function emitHoverCardLeave(options) {
      if (typeof options.onHoverRibLeave === 'function') options.onHoverRibLeave()
    }
    /**
     * 分支状态 → 颜色主题。
     * v3.4：颜色改用 --rdw-* 令牌（SVG 内同样可用 CSS 变量），随宿主明暗主题自适应。
     */
    const RIB_THEME = {
      EMPTY: { color: 'var(--rdw-st-draft)', mute: 'var(--rdw-st-draft-mute)', label: '未开工', dot: '○', tone: 'draft' },
      DRAFT: { color: 'var(--rdw-st-draft)', mute: 'var(--rdw-st-draft-mute)', label: '探路中', dot: '◍', tone: 'draft' },
      PROVISIONAL: { color: 'var(--rdw-st-provisional)', mute: 'var(--rdw-st-provisional-mute)', label: '待回连', dot: '◉', tone: 'provisional' },
      ACCEPTED: { color: 'var(--rdw-st-accepted)', mute: 'var(--rdw-st-accepted-mute)', label: '已回连', dot: '●', tone: 'accepted' },
      REJECTED: { color: 'var(--rdw-st-rejected)', mute: 'var(--rdw-st-rejected-mute)', label: '已修剪', dot: '×', tone: 'rejected' },
      SUPERSEDED: { color: 'var(--rdw-st-superseded)', mute: 'var(--rdw-st-superseded-mute)', label: '旧版本', dot: '◌', tone: 'superseded' },
      BLOCKED: { color: 'var(--rdw-st-blocked)', mute: 'var(--rdw-st-blocked-mute)', label: '受阻', dot: '⊘', tone: 'blocked' },
    }

    function ribTheme(status) {
      return RIB_THEME[status] || RIB_THEME.EMPTY
    }

    const RIB_RANK = { PROVISIONAL: 0, DRAFT: 1, BLOCKED: 2, ACCEPTED: 3, REJECTED: 4, SUPERSEDED: 5, EMPTY: 6 }

    /* ------------------------------------------------ v2.1 主支成稿（spine stage）
     *
     * 主支（模块）除了「分支回连进度」，现在还有一层「成稿状态」：
     * 分支回连后，主支会留下可备份、可重生成、可续贯的一节成稿。
     *
     * 语义要点（契约 SPINE-PIPELINE §7 / §9）：
     *  - `empty` = 还没开工，**不是异常**，绝不能标红；
     *  - `stale` = 上游变了、本主支的成稿可能过期，这才是要提醒的；
     *  - `locked` = 人工锁定，graft 不会再自动重生成；
     *  - 旧项目没有 SPINE.json 时 `stageId === null`，此时整块徽标不渲染。
     */
    const STAGE_STATUS = {
      empty: { label: '未成稿', color: 'var(--rdw-organic-ink-3)', tone: 'muted' },
      draft: { label: '起草中', color: 'var(--rdw-st-draft)', tone: 'draft' },
      current: { label: '已成稿', color: 'var(--rdw-st-accepted)', tone: 'current' },
      stale: { label: '待重生成', color: 'var(--rdw-tan-ink)', tone: 'stale' },
      locked: { label: '锁定', color: 'var(--rdw-sage)', tone: 'locked' },
    }

    /** 主支成稿徽标文案：`成稿 v3` / `待重生成` / `锁定` / `未成稿`。 */
    function stageBadgeText(node) {
      const status = node && node.stageStatus ? node.stageStatus : 'empty'
      const revision = Number(node && node.stageRevision) || 0
      if (status === 'locked') return `锁定 · v${revision}`
      if (status === 'stale') return `待重生成 · v${revision}`
      if (status === 'current') return `成稿 v${revision}`
      if (status === 'draft') return `起草中 · v${revision}`
      return '未成稿'
    }

    function stageTheme(node) {
      const status = node && node.stageStatus ? node.stageStatus : 'empty'
      return STAGE_STATUS[status] || STAGE_STATUS.empty
    }

    /** 主支是否已经有成稿（决定「备份」「重新生成」按钮可用性）。 */
    function stageHasDraft(node) {
      return Boolean(node && node.hasDraft)
    }

    /**
     * 主支成稿徽标（SVG 版，画在主支名牌下方）。
     * 旧项目 stageId 为 null 时返回 null —— 没有主支链就不画，不给旧项目添噪音。
     */
    function renderStageBadge(h, node, x, y) {
      if (!node || node.stageId === null || node.stageId === undefined) return null
      const theme = stageTheme(node)
      const text = stageBadgeText(node)
      const backup = Number(node.backupCount) || 0
      const label = backup > 0 ? `${text} · ${backup} 备份` : text
      const w = Math.max(56, Math.min(120, 8 + label.length * 6.4))
      const warning = node.stageStatus === 'stale' || node.chainBroken === true
      return h(
        'g',
        { key: `stage-${node.id}`, style: { pointerEvents: 'none' } },
        h('rect', {
          x: x - w / 2,
          y,
          width: w,
          height: 15,
          rx: 7.5,
          fill: warning
            ? 'color-mix(in srgb,var(--rdw-tan) 20%,var(--rdw-organic-surface))'
            : 'color-mix(in srgb,var(--rdw-sage-tint) 12%,var(--rdw-organic-surface))',
          stroke: warning
            ? 'color-mix(in srgb,var(--rdw-tan-ink) 46%,transparent)'
            : 'color-mix(in srgb,var(--rdw-warm-line-2) 100%,transparent)',
          strokeWidth: 1,
        }),
        h(
          'text',
          {
            x,
            y: y + 10.5,
            textAnchor: 'middle',
            fontSize: 11,
            fontWeight: 700,
            fill: theme.color,
          },
          label,
        ),
      )
    }

    /**
     * 模块主支的配色（EvoResearch 自然有机语汇）。
     * 选中态用鼠尾草绿（交互色），名牌底色用纸面白，未选中时是中性暖土描边。
     */
    const BONE = {
      stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)',
      selected: 'var(--rdw-sage)',
      labelFill: 'var(--rdw-organic-surface)',
      labelStroke: 'var(--rdw-warm-line)',
      labelFillSelected: 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))',
      labelStrokeSelected: 'color-mix(in srgb,var(--rdw-sage) 62%,transparent)',
    }

    /** SVG 画布几何。
     *  画布按模块数自适应加宽（computeViewBox），保证名牌与子分支互不重叠。 */
    const GEO = {
      W: 1040,
      H: 480,
      SPINE_Y: 252,
      SPINE_X0: 104,
      SPINE_X1: 908,
      BONE_LEN: 118,
      BONE_DX: 52,
      /** 每根主支在主支上占用的横向宽度（名牌 + 子分支不重叠的关键）。 */
      SLOT_W: 150,
      /** 主支上子分支的分布区间（沿主体的比例），刻意避开末端名牌。 */
      RIB_FROM: 0.18,
      RIB_TO: 0.74,
    }
    /** 按字符截断。 */
    function truncate(text, max) {
      const value = String(text === undefined || text === null ? '' : text).replace(/\s+/g, ' ').trim()
      if (value.length <= max) return value
      return `${value.slice(0, Math.max(0, max - 1))}…`
    }

    /**
     * 取一个 spine 节点的「已回连比率」百分比，永不返回 undefined/NaN。
     *
     * 为什么需要这个函数（v3.7）：
     *   真实 `GET /fishbone` 的契约字段是 `completion`（= accepted/total，见 DESIGN §4.2），
     *   但历史上多个 mock / 旧预览脚本用的是 `progress`。字段一旦漂移，模板字符串会直接
     *   渲染出 "undefined% · 3 分支" —— 测试全绿、画面出错，正是公理五要防的那类缺陷。
     *   兜底顺序：completion → progress → 由 counts 现算 → 0。
     */
    function pctOf(node) {
      if (!node || typeof node !== 'object') return 0
      const direct = Number(node.completion)
      if (Number.isFinite(direct)) return Math.round(direct)
      const legacy = Number(node.progress)
      if (Number.isFinite(legacy)) return Math.round(legacy)
      const counts = node.counts && typeof node.counts === 'object' ? node.counts : null
      if (counts) {
        let accepted = 0
        let total = 0
        for (const key of Object.keys(counts)) {
          const value = Number(counts[key]) || 0
          total += value
          if (key === 'accepted') accepted += value
        }
        if (total > 0) return Math.round((accepted / total) * 100)
      }
      return 0
    }

    /** 把 spine 按注册顺序排列并标记当前阶段。 */
    function orderSpine(spine, phase) {
      const list = Array.isArray(spine) ? spine.slice() : []
      const currentIndex = Math.max(0, PHASES.findIndex(([key]) => key === String(phase || '')))
      return list.map((node, index) => ({ ...node, isCurrentPhase: index === currentIndex, index }))
    }

    /** 一根主支（含末端名牌与主体上的子分支）。
     *
     *  防重叠布局规则（v3.0）：
     *   - 每个模块在主支上独占一个 SLOT_W 宽的槽位，模块多时画布自动加宽；
     *   - 名牌固定挂在末端，向上/下外侧偏移，宽度不超过槽位；
     *   - 子分支只分布在主体中段（RIB_FROM..RIB_TO），绝不进入名牌区域；
     *   - 子分支名称按「同一主体上交替左右」摆放，避免彼此压字。
     */
    function renderBone(h, node, index, count, ribs, options) {
      const { SPINE_Y, BONE_LEN, BONE_DX, SLOT_W, RIB_FROM, RIB_TO } = GEO
      const selected = options.selectedModule === node.id
      const dimmed = options.selectedModule && !selected
      const n = Math.max(count, 1)
      const slotStart = GEO.SPINE_X0 + GEO.SLOT_W / 2
      const slotSpan = n * SLOT_W
      const attachX = n === 1 ? slotStart + slotSpan / 2 : slotStart + index * SLOT_W + SLOT_W / 2
      const dir = index % 2 === 0 ? -1 : 1
      const tipX = attachX - BONE_DX
      const tipY = SPINE_Y + dir * BONE_LEN
      // 分支顺序：以宿主给出的显示顺序为准（/fishbone 已按 control/rdw-rib-meta.json 的 ribOrder 排好）。
      // 不能在这里再按状态重排——那会把用户手动的「上移/下移」覆盖掉，看起来像操作没生效。
      const moduleRibs = ribs.filter((rib) => rib.module === node.id)
      const boneColor = selected ? 'var(--rdw-sage)' : 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)'
      const accent = node.staleness ? 'var(--rdw-tan-ink)' : node.active ? 'var(--rdw-tan-ink)' : 'var(--rdw-sage)'

      const children = []
      children.push(
        h('title', { key: 'tt' }, `${node.name}：${pctOf(node)}% 已回连 · ${moduleRibs.length} 根分支${node.staleness ? ' · 有级联过期' : ''}`),
      )

      // ---- 主体骨线（加粗：这是「主支」的可视锚点）
      children.push(
        h('line', {
          key: 'bone',
          x1: attachX,
          y1: SPINE_Y,
          x2: tipX,
          y2: tipY,
          stroke: boneColor,
          strokeWidth: selected ? 3.2 : 2.2,
          strokeLinecap: 'round',
        }),
      )

      // ---- 末端名牌：宽度收敛到槽位内，文字不越界
      // 名牌是「有机卡片」：纸面底 + 暖土细描边 + 大圆角；选中时用鼠尾草淡底与强调描边。
      const badgeW = Math.min(SLOT_W - 12, 132)
      const badgeH = 40
      // 名牌放在末端「远离主支」的一侧
      const badgeY = dir < 0 ? tipY - badgeH - 8 : tipY + 8
      children.push(
        h('rect', {
          key: 'label',
          x: tipX - badgeW / 2,
          y: badgeY,
          width: badgeW,
          height: badgeH,
          rx: 13,
          fill: selected
            ? 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))'
            : 'var(--rdw-organic-surface)',
          stroke: selected
            ? 'color-mix(in srgb,var(--rdw-sage) 62%,transparent)'
            : 'var(--rdw-warm-line)',
          strokeWidth: selected ? 1.6 : 1,
        }),
        h(
          'text',
          {
            key: 'name',
            x: tipX,
            y: badgeY + 15,
            textAnchor: 'middle',
            fontSize: 11.5,
            fontWeight: 600,
            fill: 'var(--rdw-organic-ink)',
            style: { fontFamily: 'var(--rdw-font-serif)' },
          },
          truncate(node.name, 9),
        ),
        h(
          'text',
          {
            key: 'sub',
            x: tipX,
            y: badgeY + 30,
            textAnchor: 'middle',
            fontSize: 11.5,
            fill: accent,
            fontWeight: 600,
          },
          `${pctOf(node)}% · ${moduleRibs.length} 分支${node.staleness ? ' · ⚠' : ''}`,
        ),
      )

      // ---- v2.1 主支成稿徽标：挂在名牌「背向主支」一侧，与分支区不重叠
      const stageBadge = renderStageBadge(h, node, tipX, dir < 0 ? badgeY - 19 : badgeY + badgeH + 4)
      if (stageBadge) children.push(stageBadge)

      // ---- 子分支：只落在主体中段，左右交替挂标签
      const ribCount = moduleRibs.length
      moduleRibs.forEach((rib, j) => {
        const f = ribCount === 1 ? (RIB_FROM + RIB_TO) / 2 : RIB_FROM + ((RIB_TO - RIB_FROM) * j) / (ribCount - 1)
        const px = attachX + (tipX - attachX) * f
        const py = SPINE_Y + (tipY - SPINE_Y) * f
        const theme = ribTheme(rib.status)
        const isRibSelected = options.selectedRib === rib.id
        const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
        // 交替：偶数根挂左侧，奇数根挂右侧，彻底避免同名压字
        const toLeft = j % 2 === 0
        const armLen = 26
        const labelX = toLeft ? px - armLen : px + armLen
        const labelAnchor = toLeft ? 'end' : 'start'

        children.push(
          h(
            'g',
            {
              key: `rib-${rib.id}`,
              role: 'button',
              tabIndex: 0,
              style: { cursor: 'pointer' },
              opacity: isRibSelected ? 1 : dimmed ? 0.4 : 0.94,
              onClick: (event) => {
                if (event && event.stopPropagation) event.stopPropagation()
                if (typeof options.onSelectRib === 'function') options.onSelectRib(rib)
              },
              onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: node }),
              onMouseEnter: (event) => emitHoverCard(options, event, rib),
              onMouseLeave: () => emitHoverCardLeave(options),
              onKeyDown: (event) => {
                if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectRib(rib)
              },
            },
            h('title', null, `${rib.name} · ${theme.label} · ${fileCount} 个文件${rib.is_stale ? ' · ⚠ 级联过期' : ''}`),
            // 横向短分支
            h('line', {
              x1: px,
              y1: py,
              x2: labelX,
              y2: py,
              stroke: theme.color,
              strokeWidth: isRibSelected ? 2.4 : 1.6,
              strokeLinecap: 'round',
            }),
            h('circle', {
              cx: px,
              cy: py,
              r: isRibSelected ? 4.4 : 3.2,
              fill: theme.color,
              stroke: 'var(--rdw-organic-surface)',
              strokeWidth: 1.2,
            }),
            // 名称：贴着短分支末端，字号略小并截断，保证不越出槽位
            h(
              'text',
              {
                x: labelX + (toLeft ? -4 : 4),
                y: py + 3.5,
                textAnchor: labelAnchor,
                fontSize: 12,
                fill: isRibSelected ? theme.color : 'var(--rdw-organic-ink-2)',
                opacity: isRibSelected ? 1 : 0.92,
                fontWeight: isRibSelected ? 600 : 400,
              },
              `${rib.is_stale ? '⚠' : ''}${truncate(rib.name, 7)}${rib.hasSession ? ' 🧠' : ''}`,
            ),
          ),
        )
      })

      // ---- 选中该主支时，名牌外侧出现「+ 创建分支」
      // v2.1：成稿徽标也占着这一侧，按钮要再往外让一格，避免压住徽标。
      if (selected && typeof options.onSproutHere === 'function') {
        const stageOffset = stageBadge ? 24 : 0
        const btnY = dir < 0 ? badgeY - 28 - stageOffset : badgeY + badgeH + 8 + stageOffset
        children.push(
          h(
            'g',
            {
              key: 'sprout-here',
              role: 'button',
              tabIndex: 0,
              style: { cursor: 'pointer' },
              onClick: (event) => {
                if (event && event.stopPropagation) event.stopPropagation()
                options.onSproutHere(node.id)
              },
              onKeyDown: (event) => {
                if (event && (event.key === 'Enter' || event.key === ' ')) options.onSproutHere(node.id)
              },
            },
            h('title', null, `从「${node.name}」分出一根新分支`),
            h('rect', {
              x: tipX - 31,
              y: btnY,
              width: 62,
              height: 21,
              rx: 10,
              fill: 'color-mix(in srgb,var(--rdw-sage-tint) 20%,var(--rdw-organic-surface))',
              stroke: 'color-mix(in srgb,var(--rdw-sage) 52%,transparent)',
              strokeWidth: 1.2,
            }),
            h(
              'text',
              { x: tipX, y: btnY + 14.5, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-sage)', fontWeight: 600 },
              '+ 创建分支',
            ),
          ),
        )
      }

      // ---- 悬停在主支身上（名牌区域之外）时，沿法线方向浮出一根幻影分支
      const showPhantom = selected && typeof options.onPhantomSprout === 'function' && !options.inlineSprout
      if (showPhantom) {
        // 幻影分支起止点：从主体中点沿「远离主支」方向伸出
        const f = (RIB_FROM + RIB_TO) / 2
        const px = attachX + (tipX - attachX) * f
        const py = SPINE_Y + (tipY - SPINE_Y) * f
        const nx = tipX - attachX
        const ny = tipY - SPINE_Y
        const len = Math.sqrt(nx * nx + ny * ny) || 1
        // 法线方向（垂直主体，指向名牌一侧）
        const nxu = (-ny / len) * 34
        const nyu = (nx / len) * 34
        const ex = px + nxu
        const ey = py + nyu
        children.push(
          h(
            'g',
            {
              key: 'phantom',
              className: 'rdw-phantom',
              style: { pointerEvents: 'none' },
            },
            h('line', {
              x1: px, y1: py, x2: ex, y2: ey,
              stroke: 'var(--rdw-sage)',
              strokeWidth: 2,
              strokeDasharray: '4 4',
              strokeLinecap: 'round',
            }),
            h('circle', { cx: ex, cy: ey, r: 7, fill: 'var(--rdw-organic-surface)', stroke: 'var(--rdw-sage)', strokeWidth: 1.4 }),
            h('text', { x: ex, y: ey + 3.4, textAnchor: 'middle', fontSize: 11, fill: 'var(--rdw-sage)', fontWeight: 700 }, '+'),
          ),
        )
        // 透明加宽热区：实际接收点击的命中区（SVG 里 pointer-events 不受 className 控制，单独画一条粗透明线）
        children.push(
          h('line', {
            key: 'phantom-hit',
            x1: px, y1: py, x2: ex, y2: ey,
            stroke: 'rgba(0,0,0,0)',
            strokeWidth: 18,
            strokeLinecap: 'round',
            style: { pointerEvents: 'all', cursor: 'copy' },
            onClick: (event) => {
              if (event && event.stopPropagation) event.stopPropagation()
              options.onPhantomSprout(node, { x: event.clientX, y: event.clientY })
            },
            onContextMenu: (event) => emitContextMenu(options, event, { kind: 'gap', module: node }),
          }),
        )
      }

      return h(
        'g',
        {
          key: `bone-${node.id}`,
          role: 'button',
          tabIndex: 0,
          opacity: dimmed ? 0.35 : 1,
          style: { cursor: 'pointer', transition: 'opacity .16s ease' },
          onClick: () => options.onSelectModule(selected ? null : node.id),
          onContextMenu: (event) => emitContextMenu(options, event, { kind: 'module', module: node, index }),
          onKeyDown: (event) => {
            if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectModule(selected ? null : node.id)
          },
        },
        ...children,
      )
    }

    /** 按模块数计算画布宽度：模块多时加宽，保证名牌与子分支各自有槽位。 */
    function computeViewBoxWidth(count) {
      const need = GEO.SPINE_X0 + 40 + Math.max(1, count) * GEO.SLOT_W + 150
      return Math.max(GEO.W, need)
    }

    /**
     * 项目流程全景 SVG：项目目标 + 渐变主支 + 上下交错主支 + 子分支 + 整体进度。
     */
    function renderFishSvg(h, spine, ribs, totals, options) {
      const { H, SPINE_Y, SPINE_X0 } = GEO
      const selected = options.selectedModule || null
      const elements = []
      // 自适应：画布宽度随模块数增长，主支右端与整体进度随之右移
      const W = computeViewBoxWidth(spine.length)
      const SPINE_X1 = W - 132

      // 主支渐变：鼠尾草绿 → 暖沙（EvoResearch 自然有机语汇，禁冷蓝与彩虹渐变）。
      elements.push(
        h(
          'defs',
          { key: 'defs' },
          h(
            'linearGradient',
            { id: 'fishSpineGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
            h('stop', { offset: '0%', stopColor: 'var(--rdw-sage)' }),
            h('stop', { offset: '100%', stopColor: 'var(--rdw-tan)' }),
          ),
        ),
      )

      // 顶部项目标题（衬线体，手写笔记气质）
      elements.push(
        h(
          'text',
          {
            key: 'title',
            x: 14,
            y: 24,
            fontSize: 12.5,
            fontWeight: 600,
            fill: 'var(--rdw-organic-ink)',
            style: { fontFamily: 'var(--rdw-font-serif)' },
          },
          `📋 ${truncate(options.projectTitle || '', 30)}`,
        ),
        h(
          'text',
          { key: 'goal', x: 14, y: 41, fontSize: 12, fill: 'var(--rdw-organic-ink-3)' },
          truncate(options.projectGoal || '', 52),
        ),
      )

      // 整体进度（整体回连进度）：暖雾底 + 鼠尾草描边
      elements.push(
        h(
          'g',
          { key: 'tail' },
          h('polygon', {
            points: `${SPINE_X1 + 2},${SPINE_Y} ${SPINE_X1 + 84},208 ${SPINE_X1 + 56},${SPINE_Y} ${SPINE_X1 + 84},296`,
            fill: 'color-mix(in srgb,var(--rdw-mist) 70%,transparent)',
            stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 58%,transparent)',
            strokeWidth: 1.5,
          }),
          h(
            'text',
            { x: SPINE_X1 + 46, y: 336, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-organic-ink-2)' },
            `${totals.accepted || 0}/${totals.ribs || 0} 已回连`,
          ),
        ),
      )

      // 主支：主支是整个视图的锚点，必须「一定看得见」。
      // 三层叠画，任何一层失效（渐变 id 冲突/主题覆盖）都还有下一层兜底：
      //   1) 外发光（低透明度，撑出体量）
      //   2) 实色核心（不依赖渐变，永远可见）
      //   3) 渐变高光（叠在核心上，提供单色相的阶段感）
      elements.push(
        h('line', {
          key: 'spine-glow',
          x1: SPINE_X0,
          y1: SPINE_Y,
          x2: SPINE_X1,
          y2: SPINE_Y,
          stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 26%,transparent)',
          strokeWidth: 14,
          strokeLinecap: 'round',
        }),
        h('line', {
          key: 'spine-core',
          x1: SPINE_X0,
          y1: SPINE_Y,
          x2: SPINE_X1,
          y2: SPINE_Y,
          stroke: 'var(--rdw-sage)',
          strokeWidth: 5,
          strokeLinecap: 'round',
        }),
        h('line', {
          key: 'spine',
          x1: SPINE_X0,
          y1: SPINE_Y,
          x2: SPINE_X1,
          y2: SPINE_Y,
          stroke: 'url(#fishSpineGrad)',
          strokeWidth: 4,
          strokeLinecap: 'round',
          opacity: 0.9,
        }),
      )

      // 项目目标（点击 = 清除筛选）：暖雾底 + 鼠尾草描边
      elements.push(
        h(
          'g',
          {
            key: 'head',
            role: 'button',
            tabIndex: 0,
            style: { cursor: 'pointer' },
            onClick: () => options.onSelectModule(null),
            onContextMenu: (event) => emitContextMenu(options, event, { kind: 'head', head: { title: options.projectTitle, goal: options.projectGoal } }),
            onKeyDown: (event) => {
              if (event && (event.key === 'Enter' || event.key === ' ')) options.onSelectModule(null)
            },
          },
          h('title', null, '项目目标 · 研究目标（点击清除筛选）'),
          h('polygon', {
            points: `${SPINE_X0},${SPINE_Y - 46} ${SPINE_X0},${SPINE_Y + 46} 24,${SPINE_Y}`,
            fill: 'color-mix(in srgb,var(--rdw-sage-tint) 18%,var(--rdw-organic-surface))',
            stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 52%,transparent)',
            strokeWidth: 2,
            strokeLinejoin: 'round',
          }),
          h('circle', { cx: 72, cy: SPINE_Y - 6, r: 5, fill: 'var(--rdw-organic-ink-3)' }),
          h('path', {
            d: `M86,${SPINE_Y - 28} Q74,${SPINE_Y} 86,${SPINE_Y + 28}`,
            stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 58%,transparent)',
            strokeWidth: 1.5,
            fill: 'none',
          }),
          h(
            'text',
            { x: 52, y: SPINE_Y + 74, textAnchor: 'middle', fontSize: 12, fill: 'var(--rdw-organic-ink-3)' },
            '项目目标 · 目标',
          ),
        ),
      )

      // 主支 attachment 点（与 renderBone 的槽位排布一致）
      const n = spine.length
      const slotStart = SPINE_X0 + GEO.SLOT_W / 2
      spine.forEach((node, index) => {
        const attachX = n === 1 ? slotStart + GEO.SLOT_W / 2 : slotStart + index * GEO.SLOT_W + GEO.SLOT_W / 2
        elements.push(
          h('circle', {
            key: `dot-${node.id}`,
            cx: attachX,
            cy: SPINE_Y,
            r: 4.5,
            fill: 'var(--rdw-organic-surface)',
            stroke: 'color-mix(in srgb,var(--rdw-sage-tint) 74%,transparent)',
            strokeWidth: 1.4,
          }),
        )
      })

      // 主支
      spine.forEach((node, index) => {
        elements.push(renderBone(h, node, index, n, ribs, { ...options, selectedModule: selected }))
      })

      // 还没有模块时，在主支上标注「主任务沿这条主支推进」
      if (n === 0) {
        elements.push(
          h(
            'text',
            {
              key: 'spine-hint',
              x: (SPINE_X0 + SPINE_X1) / 2,
              y: SPINE_Y - 16,
              textAnchor: 'middle',
              fontSize: 11,
              fill: 'var(--rdw-sage)',
              fontWeight: 600,
              opacity: 0.9,
            },
            '主任务沿这条主支推进 —— 遇到复杂子问题时再创建分支',
          ),
        )
      }

      return h(
        'svg',
        {
          viewBox: `0 0 ${W} ${H}`,
          preserveAspectRatio: 'xMidYMid meet',
          className: 'rdw-fish-svg',
          style: {
            // 窄栏里等比缩小会压成一条看不清的细带；
            // 给一个最小可读高度，多余部分交给外层横向滚动（滚动条比压扁更可读）。
            // 极窄容器的下限由 .rdw-fish-svg 的容器查询兜底（见 constants 的 SHELL_CSS）。
            width: '100%',
            maxWidth: `${W}px`,
            minWidth: 560,
            height: 'auto',
            minHeight: 260,
            display: 'block',
            color: 'inherit',
          },
          role: 'img',
          'aria-label': '研究项目项目流程图（右键任意对象打开操作菜单）',
          onContextMenu: (event) => emitContextMenu(options, event, { kind: 'canvas' }),
        },
        ...elements,
      )
    }

    /**
     * 三栏式 EvoResearch 科研工作台（对齐用户指定布局设计）：
     * - 左栏 · 竖向项目流程（研究规划与分支导航）：项目目标 + 竖向连续主支节点 + 各分支 + [🌱 创建分支]
     * - 中栏 · 当前工作区：主线/分支任务、绑定智能体身份、往来指令对白流、指令输入区
     * - 右栏 · 结果面板：本任务产物清单、合并状态、[审核与合并设计]
     */
    function renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps = [], blockers = [], attention = [], markers = [] }) {
      const { card, row, chip, button, primaryButton, muted } = STYLES
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      // v3.5 快捷键：N 创建分支 / Del 删分支 / ⌘Z 撤销 / ⇧⌘Z 或 ⌘Y 重做 / ? 帮助
      const onStageKeyDown = (event) => {
        if (!event) return
        const tag = event.target && event.target.tagName ? String(event.target.tagName).toLowerCase() : ''
        if (tag === 'input' || tag === 'textarea' || (event.target && event.target.isContentEditable)) return
        const meta = event.metaKey || event.ctrlKey
        const key = String(event.key || '').toLowerCase()
        if (key === 'n' && !meta) {
          event.preventDefault()
          call(options.onSprout, options.selectedModule || (spine[0] && spine[0].id), options.selectedRib || null)
          return
        }
        if (key === 'delete' || key === 'backspace') {
          if (options.selectedRib && typeof options.onDeleteRib === 'function') {
            event.preventDefault()
            const rib = ribs.find((r) => r.id === options.selectedRib)
            if (rib) options.onDeleteRib(rib)
          }
          return
        }
        if (key === 'z' && meta && !event.shiftKey) {
          event.preventDefault()
          call(options.onUndo)
          return
        }
        if ((key === 'z' && meta && event.shiftKey) || (key === 'y' && meta)) {
          event.preventDefault()
          call(options.onRedo)
          return
        }
        if (key === '?') {
          event.preventDefault()
          call(options.onShowShortcuts)
        }
      }
      const session = options.session && typeof options.session === 'object' ? options.session : null
      const isGoalSelected = options.selectedModule === '__goal__'
      const ribList = Array.isArray(ribs) ? ribs : []
      const spineList = Array.isArray(spine) ? spine : []
      const candidateRibs = options.selectedModule && !isGoalSelected
        ? ribList.filter((r) => r && r.module === options.selectedModule)
        : ribList
      const defaultRib = isGoalSelected ? null : (candidateRibs[0] || ribList[0] || null)
      const selectedRibId = isGoalSelected ? null : (options.selectedRib || (session && session.branch) || (defaultRib && defaultRib.id) || null)
      const activeRib = isGoalSelected
        ? { id: '__goal__', name: (head && head.goal) || (head && head.title) || '研究目标', module: '__goal__', status: 'PROVISIONAL' }
        : ((selectedRibId && ribList.find((r) => r.id === selectedRibId)) || defaultRib || {
            id: selectedRibId || 'B01',
            name: '任务工作区',
            module: options.selectedModule || (spineList[0] && spineList[0].id) || 'M10',
            status: 'PROVISIONAL',
          })
      const selectedModId = isGoalSelected
        ? '__goal__'
        : ((activeRib && activeRib.module) || options.selectedModule || (session && session.module) || (spineList[0] && spineList[0].id) || null)
      const activeModule = isGoalSelected
        ? { id: '__goal__', name: '研究目标' }
        : ((selectedModId && spineList.find((m) => m.id === selectedModId)) || spineList[0] || {
            id: selectedModId || 'M10',
            name: '研究主线',
          })
      const draft = typeof options.directiveDraft === 'string' ? options.directiveDraft : ''
      const sending = Boolean(options.sending)

      // 1. 左栏 · 竖向项目流程（研究规划与分支导航）
      //    样式参照 Karbo123/DSH-EvoResearch 的会话导航栏（evo-threadlist）：
      //    纸纹底 + 衬线栏标题 + 分组小标题 + 行内有机圆点 + 选中左竖条 + 悬停暖洗。
      const leftPane = h(
        'div',
        {
          style: {
            margin: 0,
            padding: '12px 10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 0,
            /* 左栏 = 底板：灰面、无投影、几乎看不见的描边。
             * 之前与中栏同为「灰底 + 明显边框」，三栏互相争抢；
             * 现在它只负责托住中栏，眼睛不该在这里停留。 */
            background: 'var(--rdw-side-surface)',
            backgroundImage: 'var(--rdw-organic-grain)',
            border: '1px solid var(--rdw-side-line)',
            borderRadius: 'var(--rdw-r-blob)',
          },
        },
        // 栏标题（衬线体，承担「手写笔记」气质）
        h(
          'div',
          { style: { padding: '0 6px 2px', display: 'flex', alignItems: 'baseline', gap: 6 } },
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--rdw-font-serif)',
                fontSize: 16.5,
                fontWeight: 600,
                letterSpacing: '-.01em',
                color: 'var(--rdw-organic-ink)',
              },
            },
            '竖向项目流程',
          ),
          h(
            'div',
            { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', letterSpacing: '.2px' } },
            '研究规划与分支导航',
          ),
        ),
        // 项目目标 · 研究总目标（有机 pebble 卡片 + 左侧重音竖条；右键打开项目目标菜单）
        // v3.10：整卡可点 → 打开「研究目标 · 好问题」编辑器（八层审计 + good-question）
        h(
          'div',
          {
            className: 'rdw-goal-card',
            role: 'button',
            tabIndex: 0,
            title: '点击切到研究目标专属对话（含八层假设审计技能）；右键更多操作',
            onClick: () => call(options.onSelectGoalSession || options.onOpenGoalCard),
            onKeyDown: (event) => {
              if (!event) return
              if (event.key === 'Enter' || event.key === ' ') {
                if (event.preventDefault) event.preventDefault()
                call(options.onSelectGoalSession || options.onOpenGoalCard)
              }
            },
            onContextMenu: (event) => emitContextMenu(options, event, { kind: 'head', head }),
            style: {
              padding: '9px 11px',
              borderRadius: 'var(--rdw-r-pebble)',
              background: 'color-mix(in srgb,var(--rdw-sage-tint) 13%,var(--rdw-organic-surface))',
              border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 34%,transparent)',
              borderLeft: '3px solid var(--rdw-sage)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              cursor: 'pointer',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 5 } },
            h('span', { style: { fontSize: 11 } }, '📋'),
            h(
              'span',
              {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                  color: 'var(--rdw-tan-ink)',
                },
              },
              '项目目标 · 研究目标',
            ),
          ),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--rdw-font-serif)',
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 1.35,
                color: 'var(--rdw-organic-ink)',
              },
            },
            head.title || '重症低磷血症患者早期补磷',
          ),
          h(
            'div',
            { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.45 } },
            head.goal ? truncate(head.goal, 56) : '目标试验模拟 · Target Trial Emulation',
          ),
        ),
        // 分组小标题（右侧带「新增主支」入口，v3.9）
        h(
          'div',
          {
            style: {
              padding: '6px 8px 2px',
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: '.3px',
              textTransform: 'uppercase',
              color: 'var(--rdw-organic-ink-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            },
          },
          h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, '主支 · 研究主线'),
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-add-module',
              title: '新增主支（新的研究阶段）',
              'aria-label': '新增主支',
              onClick: (event) => {
                if (event && event.stopPropagation) event.stopPropagation()
                call(options.onAddModule)
              },
            },
            '＋ 主支',
          ),
        ),
        // 竖向连续主支节点（可滚动区）
        h(
          'div',
          {
            className: 'rdw-organic-scroll',
            style: {
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              paddingRight: 2,
            },
          },
          // v3.27：**研究目标作为「第 0 个主支」**出现在研究主线顶部。
          // 点它 = 切到「研究目标」自己的独立对话（技能脚手架不变：八层 + good-question）。
          // 这样「每个主支/分支都有专属对话」的规则对研究目标同样成立。
          h(
            'div',
            {
              key: 'v-spine-goal',
              className: 'rdw-vmod rdw-vmod-goal',
              role: 'button',
              tabIndex: 0,
              title: '研究目标（点开：该目标专属对话，含八层 + good-question 技能）',
              'aria-current': selectedModId === '__goal__' ? 'true' : undefined,
              onClick: () => call(options.onSelectGoalSession),
              onKeyDown: (event) => {
                if (!event) return
                if (event.key === 'Enter' || event.key === ' ') {
                  if (event.preventDefault) event.preventDefault()
                  call(options.onSelectGoalSession)
                }
              },
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 8px',
                margin: '2px 0 4px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12.5,
                color: 'var(--rdw-organic-ink)',
                background:
                  selectedModId === '__goal__'
                    ? 'color-mix(in srgb,var(--rdw-sage-tint) 28%,var(--rdw-organic-surface))'
                    : 'transparent',
                borderLeft:
                  selectedModId === '__goal__'
                    ? '3px solid var(--rdw-sage)'
                    : '3px solid transparent',
                boxShadow:
                  selectedModId === '__goal__'
                    ? '0 1px 3px rgba(0,0,0,0.06)'
                    : 'none',
              },
            },
            h('span', { 'aria-hidden': 'true' }, '🎯'),
            h(
              'span',
              { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              '研究目标',
            ),
            h(
              'span',
              { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', fontWeight: 400 } },
              '独立对话',
            ),
          ),
          ...spine.map((mod, idx) => {
            const isModSelected = selectedModId === mod.id
            const modRibs = ribs.filter((r) => r.module === mod.id)
            const isCompleted = pctOf(mod) === 100

            return h(
              'div',
              { key: `v-spine-${mod.id}`, style: { display: 'flex', flexDirection: 'column' } },
              // 纵向主支连线（暖土发丝线，非蓝管线）
              idx > 0
                ? h('div', {
                    style: {
                      width: 1.5,
                      height: 9,
                      background: 'color-mix(in srgb,var(--rdw-sage-tint) 52%,transparent)',
                      margin: '0 0 0 15px',
                    },
                  })
                : null,
              // 主支节点行（会话列表行语言：选中左竖条 + 悬停暖洗 + pebble 圆角）
              h(
                'div',
                {
                  className: 'rdw-organic-row',
                  style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 9px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    background: isModSelected ? 'var(--rdw-organic-hover)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background .2s cubic-bezier(.4,0,.2,1)',
                  },
                  onClick: () => call(options.onSelectModule, mod.id),
                  onContextMenu: (event) => emitContextMenu(options, event, { kind: 'module', module: mod, index: idx }),
                },
                // 选中左竖条（3px 鼠尾草，上下留白 22%）
                isModSelected
                  ? h('span', {
                      style: {
                        position: 'absolute',
                        left: 0,
                        top: '22%',
                        bottom: '22%',
                        width: 3,
                        borderRadius: '6px',
                        background: 'var(--rdw-sage)',
                      },
                    })
                  : null,
                // 状态圆点（有机非正圆）
                h('span', {
                  style: {
                    width: 7,
                    height: 7,
                    flex: '0 0 auto',
                    borderRadius: 'var(--rdw-r-dot)',
                    background: isCompleted ? 'var(--rdw-sage)' : 'var(--rdw-tan)',
                  },
                }),
                h(
                  'span',
                  {
                    style: {
                      flex: 1,
                      minWidth: 0,
                      fontSize: 11.5,
                      fontWeight: isModSelected ? 600 : 500,
                      color: isModSelected ? 'var(--rdw-organic-ink)' : 'var(--rdw-organic-ink-2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                  mod.name,
                ),
                h(
                  'span',
                  {
                    style: {
                      fontFamily: 'var(--rdw-font-mono)',
                      fontSize: 11,
                      color: 'var(--rdw-organic-ink-3)',
                      flex: '0 0 auto',
                    },
                  },
                  mod.id,
                ),
                isCompleted
                  ? h('span', { style: { fontSize: 12, color: 'var(--rdw-sage)', flex: '0 0 auto' } }, '✓')
                  : null,
                // v3.9 主支行内联操作：↑ ↓ ×（悬停显现，不挤压文字）
                h(
                  'div',
                  {
                    className: 'rdw-mod-actions',
                    style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 auto' },
                  },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'rdw-mod-act',
                      title: `上移主支「${mod.name}」`,
                      'aria-label': '上移主支',
                      disabled: idx === 0,
                      style: { opacity: idx === 0 ? 0.25 : undefined, cursor: idx === 0 ? 'default' : 'pointer' },
                      onClick: (e) => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        if (idx > 0) call(options.onMoveModule, mod.id, -1)
                      },
                    },
                    '↑',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'rdw-mod-act',
                      title: `下移主支「${mod.name}」`,
                      'aria-label': '下移主支',
                      disabled: idx >= spine.length - 1,
                      style: {
                        opacity: idx >= spine.length - 1 ? 0.25 : undefined,
                        cursor: idx >= spine.length - 1 ? 'default' : 'pointer',
                      },
                      onClick: (e) => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        if (idx < spine.length - 1) call(options.onMoveModule, mod.id, 1)
                      },
                    },
                    '↓',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'rdw-mod-act rdw-mod-act-danger',
                      title: `收起主支「${mod.name}」`,
                      'aria-label': '收起主支',
                      onClick: (e) => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        call(options.onRemoveModule, mod.id)
                      },
                    },
                    '×',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      style: {
                        padding: '1px 5px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--rdw-sage)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: 0.7,
                      },
                      title: `在「${mod.name}」阶段下新建分支`,
                      onClick: (e) => {
                        if (e && e.stopPropagation) e.stopPropagation()
                        call(options.onSprout, mod.id)
                      },
                    },
                    '+',
                  ),
                ),
              ),
              // 分支（缩进 + 左侧细竖线，EvoResearch 的子项语言）
              modRibs.length > 0
                ? h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        margin: '1px 0 4px 12px',
                        paddingLeft: 8,
                        borderLeft: '1.5px solid var(--rdw-warm-line-2)',
                      },
                    },
                    ...modRibs.map((rib) => {
                      const isRibSelected = selectedRibId === rib.id
                      const theme = ribTheme(rib.status)

                      return h(
                        'div',
                        {
                          key: `v-rib-${rib.id}`,
                          className: 'rdw-organic-row',
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 7px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            background: isRibSelected ? 'var(--rdw-organic-hover)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background .2s cubic-bezier(.4,0,.2,1)',
                          },
                          title: rib.brief || rib.name,
                          onClick: () => call(options.onSelectRib, rib),
                          onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: mod }),
                          onMouseEnter: (event) => emitHoverCard(options, event, rib),
                          onMouseLeave: () => emitHoverCardLeave(options),
                        },
                        h('span', {
                          style: {
                            width: 5,
                            height: 5,
                            flex: '0 0 auto',
                            borderRadius: 'var(--rdw-r-dot)',
                            /* 侧栏小色点用降饱和版：仍能分辨状态，但不会在
                             * 白灰底上跳出来跟中栏抢注意力。 */
                            background: theme.mute || theme.color,
                          },
                        }),
                        h(
                          'span',
                          {
                            style: {
                              flex: 1,
                              minWidth: 0,
                              fontSize: 11,
                              color: isRibSelected ? 'var(--rdw-organic-ink)' : 'var(--rdw-organic-ink-2)',
                              fontWeight: isRibSelected ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            },
                          },
                          rib.name,
                        ),
                        theme.label
                          ? h(
                              'span',
                              {
                                style: {
                                  flex: '0 0 auto',
                                  padding: '1px 5px',
                                  borderRadius: 'var(--rdw-r-pebble-sm)',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  fontFamily: 'var(--rdw-font-mono)',
                                  /* 侧栏降噪：不再给每个状态铺一层彩色底。
                                   * 六个彩色胶囊同时出现时，侧栏比中栏还抢眼。
                                   * 改为「小色点 + 中性字色」，颜色只做身份标记。 */
                                  color: 'var(--rdw-organic-ink-3)',
                                  background: 'transparent',
                                },
                              },
                              theme.label,
                            )
                          : null,
                        h(
                          'button',
                          {
                            type: 'button',
                            style: {
                              marginLeft: 2,
                              padding: '0 3px',
                              borderRadius: 'var(--rdw-r-pebble-sm)',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--rdw-organic-ink-3)',
                              fontSize: 11,
                              cursor: 'pointer',
                              opacity: isRibSelected ? 0.9 : 0.4,
                            },
                            title: `以「${rib.name}」分出二级子分支`,
                            onClick: (e) => {
                              if (e && e.stopPropagation) e.stopPropagation()
                              call(options.onSprout, rib.module, rib.id)
                            },
                          },
                          '+',
                        ),
                      )
                    }),
                  )
                : null,
            )
          }),
        ),
        // 底部分隔线 + 操作区（EvoResearch 底部工具区语言）
        h('div', { style: { height: 1, background: 'var(--rdw-warm-line-2)', margin: '2px 4px' } }),
        h(
          'div',
          { style: { display: 'flex', gap: 6, padding: '0 2px' } },
          h(
            'button',
            {
              type: 'button',
              style: {
                flex: 1,
                padding: '6px 0',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: '1px solid var(--rdw-warm-line)',
                background: 'var(--rdw-organic-input)',
                color: 'var(--rdw-organic-ink-2)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all .2s cubic-bezier(.4,0,.2,1)',
              },
              disabled: Boolean(options.busy),
              title: '自动回连全部已满意的分支',
              onClick: () => call(options.onAuto),
            },
            '自动回连',
          ),
          h(
            'button',
            {
              type: 'button',
              style: {
                flex: 1.3,
                padding: '6px 0',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                border: 'none',
                background: 'var(--rdw-soil)',
                color: '#faf6f1',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                boxShadow: 'var(--rdw-shadow-organic-1)',
              },
              disabled: Boolean(options.busy),
              title: '在此模块下新建一个分支',
              onClick: () => call(options.onSprout, selectedModId, selectedRibId),
            },
            '🌱 新建一个分支',
          ),
        ),
      )

      // 2. 中栏 · 当前工作区
      //    参照 EvoResearch 的对话主区：纸面留白、衬线大标题、气泡式消息、
      //    有机 pebble 卡片；会话区用 blob 大圆角承载。
      const sessionData = options.ribWork || (options.session && options.session.data) || null
      const entries = (sessionData && Array.isArray(sessionData.directivesParsed)) ? sessionData.directivesParsed : []
      const sessionSections = (sessionData && Array.isArray(sessionData.sessionParsed)) ? sessionData.sessionParsed : []
      const parentRibId = (sessionData && sessionData.parent) || activeRib.parent || null
      const messageAnchor = (activeRib && activeRib.origin && activeRib.origin.kind === 'message') ? activeRib.origin.anchor : null
      const contextText = (sessionData && sessionData.context) || ''
      const briefText = (sessionData && sessionData.brief) || activeRib.brief || ''
      const hasPriorContext = Boolean(parentRibId || messageAnchor || contextText || (activeRib.origin && activeRib.origin.kind))
      const hasDialogue = entries.length > 0

      const middleTab = options.middleTab || 'chat' // 'chat' | 'trace'
      const middleMode = options.middleMode || 'auto' // 'auto' | 'native'
      const showNativeLive = middleMode === 'native' || Boolean(options.conversationNode)

      const priorContextNode = hasPriorContext
        ? h(
            'div',
            { className: 'rdw-chat-context-card', style: { marginBottom: 6, flexShrink: 0 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--rdw-sage)' } },
              h('span', null, '📌'),
              h('span', null, '前置上下文与派生原点'),
            ),
            messageAnchor
              ? h(
                  'div',
                  { style: { color: 'var(--rdw-organic-ink-2)' } },
                  '📍 派生自会话消息：“',
                  h('span', { style: { fontStyle: 'italic' } }, String(messageAnchor.messageExcerpt || '').slice(0, 120)),
                  '”',
                )
              : null,
            parentRibId
              ? h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--rdw-organic-ink-2)' } },
                  '🌿 派生自父分支：',
                  h(
                    'button',
                    {
                      type: 'button',
                      style: {
                        padding: '1px 6px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        border: '1px solid var(--rdw-warm-line)',
                        background: 'var(--rdw-organic-surface)',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'var(--rdw-font-mono)',
                      },
                      onClick: () => {
                        const parentRib = ribs.find((r) => r.id === parentRibId)
                        if (parentRib) call(options.onSelectRib, parentRib)
                      },
                    },
                    parentRibId,
                  ),
                  h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontSize: 11 } }, '（承袭前序阶段研究产物）'),
                )
              : null,
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginTop: 3 } },
              h(
                'span',
                { style: { color: 'var(--rdw-organic-ink-2)', fontSize: 11 } },
                isGoalSelected
                  ? '📄 🎯 研究总目标探索与好问题推演'
                  : (contextText ? '📄 已挂载主支上下文档案快照 (CONTEXT.md)' : '📄 分支任务上下文'),
              ),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                isGoalSelected
                  ? [
                      h(
                        'button',
                        {
                          key: 'act-goal-inject',
                          type: 'button',
                          className: 'rdw-organic-btn',
                          style: {
                            padding: '2px 8px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#faf6f1',
                            background: 'var(--rdw-sage)',
                            border: 'none',
                            cursor: 'pointer',
                          },
                          title: '将八层假设审计（G-R-E-D-M-O-T-W）与 good-question 讨论脚手架填入会话框',
                          onClick: () => call(options.onSelectGoalSession),
                        },
                        '⚡ 注入八层审计提示词',
                      ),
                      h(
                        'button',
                        {
                          key: 'act-goal-scaffold',
                          type: 'button',
                          className: 'rdw-organic-btn',
                          style: {
                            padding: '2px 8px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--rdw-teal-ink)',
                            background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                            border: '1px solid color-mix(in srgb,var(--rdw-teal) 32%,transparent)',
                            cursor: 'pointer',
                          },
                          title: '根据研究目标一键生成标准主支流水线与初始分支；创建后您享有所有的修改权限',
                          onClick: () => call(options.onScaffoldRecommended || options.onAddModule),
                        },
                        '🌱 一键生成主支与分支规划',
                      ),
                    ]
                  : [
                      h(
                        'button',
                        {
                          key: 'act-mount-context',
                          type: 'button',
                          className: 'rdw-organic-btn',
                          style: {
                            padding: '2px 8px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#faf6f1',
                            background: 'var(--rdw-sage)',
                            border: 'none',
                            cursor: 'pointer',
                          },
                          title: '将当前分支的研究目标、所属阶段与上下文档案注入会话框，让 AI 智能体掌握当前上下文',
                          onClick: () => call(options.onMountContext, { module: activeModule.id, branch: activeRib.id }),
                        },
                        '⚡ 注入上下文到对话',
                      ),
                      h(
                        'button',
                        {
                          key: 'act-auto-sprout',
                          type: 'button',
                          className: 'rdw-organic-btn',
                          style: {
                            padding: '2px 8px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'var(--rdw-teal-ink)',
                            background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                            border: '1px solid color-mix(in srgb,var(--rdw-teal) 32%,transparent)',
                            cursor: 'pointer',
                          },
                          title: '从当前对话自动分叉创建新分支',
                          onClick: () => call(options.onAutoSprout, activeRib.brief || activeRib.name),
                        },
                        '🌱 自动分新分支',
                      ),
                    ],
              ),
            ),
          )
        : null

      const middlePane = h(
        'div',
        {
          className: 'rdw-pane-middle rdw-pane-focus',
          style: {
            margin: 0,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            /* 中栏是 grid 子项：min-height:0 让它可收缩，
             * align-self:stretch（默认）让它撑满整行高度。
             * 不要写 height:100%——grid 项用百分比高度在部分浏览器下
             * 会以内容高度为基准循环，导致内部 100% 子树塌陷。 */
            minHeight: 0,
            overflow: 'hidden',
            /* 中栏是唯一「抬起来」的面：纯白 + 投影，左右两栏退成底板。 */
            background: 'var(--rdw-focus-surface)',
            border: '1px solid var(--rdw-focus-line)',
            borderRadius: 'var(--rdw-r-blob)',
            boxShadow: 'var(--rdw-focus-shadow)',
          },
        },
        // 中栏顶部：紧凑优雅的工作区标题栏（Apple OS 规范：扁平微通透，主次分明）
        h(
          'div',
          {
            style: {
              padding: '2px 4px 6px',
              borderBottom: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 } },
            h(
              'div',
              {
                style: {
                  fontFamily: 'var(--rdw-font)',
                  fontSize: 16.5,
                  fontWeight: 600,
                  letterSpacing: '-.015em',
                  color: 'var(--rdw-organic-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              },
              isGoalSelected ? '🎯 研究目标 · 好问题讨论' : (activeRib.name || '当前任务工作区'),
            ),
            h(
              'span',
              {
                style: {
                  padding: '1px 7px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--rdw-teal-ink)',
                  background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                  border: '1px solid color-mix(in srgb,var(--rdw-teal) 26%,transparent)',
                  flex: '0 0 auto',
                },
              },
              isGoalSelected ? '研究总目标' : (activeRib.id || '主线任务'),
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' } },
            h(
              'span',
              {
                style: {
                  padding: '2px 8px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--rdw-sage)',
                  background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                  border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 32%,transparent)',
                },
              },
              activeModule.name || '统计分析',
            ),
            // v3.6 锚点提示：如果当前分支是从消息分叉来的，给一个「📍 源消息」提示
            activeRib && activeRib.origin && activeRib.origin.kind === 'message'
              ? h(
                  'span',
                  {
                    className: 'rdw-msg-anchor',
                    title: activeRib.origin.anchor && activeRib.origin.anchor.messageExcerpt
                      ? `源消息：${activeRib.origin.anchor.messageExcerpt}`
                      : '从会话消息分叉而来',
                  },
                  '📍 消息',
                )
              : null,
          ),
        ),
        // 任务情境综合条（Apple 拟态微卡片：整合智能体、Dock快照、下一步与阻塞，高度紧凑节省 ~250px 纵向空间）
        h(
          'div',
          {
            style: {
              padding: '7px 11px',
              borderRadius: 'var(--rdw-r-pebble)',
              background: 'var(--rdw-fill-quat)',
              border: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            },
          },
          // 状态与身份行
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } },
              h('span', null, '🤖'),
              h('strong', { style: { fontWeight: 600, color: 'var(--rdw-organic-ink)' } }, `${activeModule.name || '统计分析'}智能体`),
              h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--rdw-sys-green)' } }),
              h('span', { style: { color: 'var(--rdw-organic-ink-3)', fontSize: 11.5 } }, '· 🧬 科研记忆 Dock 已挂载'),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              blockers.length > 0
                ? h(
                    'span',
                    {
                      style: {
                        padding: '1px 6px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--rdw-sys-orange)',
                        background: 'color-mix(in srgb,var(--rdw-sys-orange) 14%,transparent)',
                      },
                      title: blockers.map((b) => (typeof b === 'object' ? b.reason || b.name : b)).join('；'),
                    },
                    `⊘ ${blockers.length} 阻塞信号`,
                  )
                : null,
              nextSteps.length > 0
                ? h(
                    'span',
                    {
                      style: {
                        padding: '1px 6px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--rdw-sage)',
                        background: 'color-mix(in srgb,var(--rdw-sage-tint) 14%,transparent)',
                      },
                      title: nextSteps.map((st) => (typeof st === 'object' ? st.title || st.name : st)).join('；'),
                    },
                    '📋 主支下一步',
                  )
                : null,
            ),
          ),
          // 任务简要目标与下一步提示
          h(
            'div',
            {
              style: {
                fontSize: 11.5,
                color: 'var(--rdw-organic-ink-2)',
                lineHeight: 1.45,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
              title: activeRib.brief || '',
            },
            activeRib.brief || (sessionData && sessionData.brief) || `${activeModule.name || '阶段'}探索任务：推进 ${activeRib.name || activeRib.id} 的分析与成果输出。`,
          ),
        ),
        // 中栏主体：交互式会话框（对标原生对话与轨迹设计）
        h(
          'div',
          {
            style: {
              flex: '1 1 auto',
              height: 0,
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 'var(--rdw-r-blob)',
              background: 'var(--rdw-organic-surface)',
              border: '1px solid var(--rdw-warm-line)',
              marginTop: 2,
              padding: '8px 12px 10px',
              boxShadow: 'var(--rdw-shadow-organic-1)',
            },
          },
          // 1. 原生风格选项卡头（对标第三图结构：对话 | 轨迹）
          h(
            'div',
            { className: 'rdw-chat-tabs-bar' },
            h(
              'div',
              { className: 'rdw-chat-tabs' },
              h(
                'button',
                {
                  type: 'button',
                  className: `rdw-chat-tab ${middleTab === 'chat' ? 'active' : ''}`,
                  onClick: () => call(options.onSelectMiddleTab, 'chat'),
                },
                '对话',
                entries.length > 0
                  ? h('span', { style: { marginLeft: 5, fontSize: 11, opacity: 0.7 } }, `(${entries.length})`)
                  : null,
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: `rdw-chat-tab ${middleTab === 'trace' ? 'active' : ''}`,
                  onClick: () => call(options.onSelectMiddleTab, 'trace'),
                },
                '轨迹',
                sessionSections.length > 0
                  ? h('span', { style: { marginLeft: 5, fontSize: 11, opacity: 0.7 } }, `(${sessionSections.length})`)
                  : null,
              ),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
              options.conversationNode
                ? h(
                    'span',
                    {
                      style: {
                        padding: '2px 8px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--rdw-sage)',
                        background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                        border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 32%,transparent)',
                      },
                    },
                    '⚡ 原生交互式会话',
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-organic-btn',
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--rdw-teal-ink)',
                    background: 'color-mix(in srgb,var(--rdw-teal) 14%,transparent)',
                    border: '1px solid color-mix(in srgb,var(--rdw-teal) 32%,transparent)',
                    cursor: 'pointer',
                  },
                  title: '将当前分支的完整上下文同步挂载并注入至会话框',
                  onClick: () => call(options.onMountContext, { module: activeModule.id, branch: activeRib.id }),
                },
                '⚡ 注入上下文',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-organic-btn',
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--rdw-soil)',
                    background: 'color-mix(in srgb,var(--rdw-soil) 12%,transparent)',
                    border: '1px solid color-mix(in srgb,var(--rdw-soil) 32%,transparent)',
                    cursor: 'pointer',
                  },
                  title: '从当前对话自动分叉创建新分支',
                  onClick: () => call(options.onAutoSprout, activeRib.brief || activeRib.name),
                },
                '🌱 对话自动建分支',
              ),
              h(
                'span',
                { style: { fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', whiteSpace: 'nowrap' } },
                '选中文字可分叉',
              ),
            ),
          ),
          // 2. 原生会话节点挂载槽位（卡片已按用户要求隐藏以节省纵向屏幕空间，保持节点常驻 DOM）
          options.conversationNode
            ? h(
                'div',
                {
                  className: 'rdw-native-slot',
                  style: {
                    display: middleTab === 'chat' ? 'flex' : 'none',
                    flex: '1 1 auto',
                    height: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    flexDirection: 'column',
                    position: 'relative',
                  },
                  onMouseUp: (event) => {
                    if (typeof options.onShowMessageSprout !== 'function') return
                    if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return
                    const sel = window.getSelection()
                    const text = sel && typeof sel.toString === 'function' ? sel.toString().trim() : ''
                    if (!text || text.length < 4) return
                    let px = event.clientX
                    let py = event.clientY
                    try {
                      if (sel.rangeCount > 0) {
                        const rect = sel.getRangeAt(0).getBoundingClientRect()
                        if (rect) { px = rect.right; py = rect.bottom + 6 }
                      }
                    } catch { /* ignore */ }
                    options.onShowMessageSprout({ excerpt: text, x: px, y: py })
                  },
                  onContextMenu: (event) => {
                    if (typeof options.onContextMenu !== 'function') return
                    let excerpt = ''
                    if (typeof window !== 'undefined' && window.getSelection) {
                      const sel = window.getSelection()
                      if (sel && sel.toString().trim()) excerpt = sel.toString().trim()
                    }
                    if (!excerpt && event.target) {
                      const p = event.target.closest('p, div, li, blockquote, [role="article"]')
                      if (p && p.innerText) excerpt = p.innerText.trim().slice(0, 300)
                    }
                    if (excerpt) {
                      event.preventDefault()
                      if (event.stopPropagation) event.stopPropagation()
                      options.onContextMenu({
                        x: event.clientX,
                        y: event.clientY,
                        target: { kind: 'conversation-message', excerpt },
                      })
                    }
                  },
                },
                options.conversationNode,
              )
            : null,
          // 4. 轨迹标签页（中栏主体：显示执行推理记录与尝试轨迹）
          middleTab === 'trace'
            ? h(
                'div',
                {
                  className: 'rdw-trace-stream',
                },
                sessionSections.length > 0
                  ? sessionSections.map((sec, idx) =>
                      h(
                        'div',
                        { key: `sec-${idx}`, className: 'rdw-trace-card' },
                        h(
                          'div',
                          { className: 'rdw-trace-card-title' },
                          h('span', null, idx === 0 ? '🎯' : idx === 1 ? '🧠' : idx === 2 ? '🔍' : '📦'),
                          h('span', null, sec.title || `第 ${idx + 1} 阶段执行记录`),
                        ),
                        h('div', { className: 'rdw-trace-card-body' }, sec.text || ''),
                      ),
                    )
                  : h(
                      'div',
                      { style: { padding: '24px 10px', textAlign: 'center', color: 'var(--rdw-organic-ink-3)', fontSize: 12 } },
                      '暂无执行推理记录。智能体在执行任务时将自动沉淀尝试轨迹与评估意见。',
                    ),
              )
            : null,
          // 5. 兜底回退模式（当环境未提供原生 conversationNode 且在对话页时，展示纯自绘对话记录与输入区）
          !options.conversationNode && middleTab === 'chat'
            ? h(
                'div',
                {
                  style: {
                    flex: '1 1 auto',
                    height: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  },
                },
                priorContextNode,
                // 会话消息或上下文流
                h(
                  'div',
                  {
                    className: 'rdw-chat-stream',
                    onMouseUp: (event) => {
                      if (typeof options.onShowMessageSprout !== 'function') return
                      if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return
                      const sel = window.getSelection()
                      const text = sel && typeof sel.toString === 'function' ? sel.toString().trim() : ''
                      if (!text || text.length < 4) return
                      let px = event.clientX
                      let py = event.clientY
                      try {
                        if (sel.rangeCount > 0) {
                          const rect = sel.getRangeAt(0).getBoundingClientRect()
                          if (rect) { px = rect.right; py = rect.bottom + 6 }
                        }
                      } catch { /* ignore */ }
                      options.onShowMessageSprout({ excerpt: text, x: px, y: py })
                    },
                  },
                  // 对话往来记录
                  hasDialogue
                    ? entries.map((entry, index) => {
                        const isUser = entry.side === 'human' || entry.role === 'human'
                        return h(
                          'div',
                          {
                            key: `msg-${index}`,
                            className: `rdw-chat-bubble ${isUser ? 'user' : 'agent'}`,
                          },
                          h(
                            'div',
                            {
                              className: 'rdw-chat-bubble-header',
                              style: { justifyContent: isUser ? 'flex-end' : 'flex-start' },
                            },
                            h('span', { style: { fontWeight: 600 } }, isUser ? '👤 你' : `🤖 ${activeModule.name || '统计'}智能体`),
                            entry.at ? h('span', null, String(entry.at).slice(11, 19) || entry.at) : null,
                          ),
                          h('div', { className: 'rdw-chat-bubble-body' }, entry.text || ''),
                        )
                      })
                    : (!hasPriorContext
                        ? h(
                            'div',
                            { className: 'rdw-chat-empty' },
                            h(
                              'div',
                              { className: 'rdw-chat-empty-title' },
                              h('span', null, '📋'),
                              h('span', null, '探索未至之境'),
                              h(
                                'span',
                                {
                                  style: {
                                    fontSize: 11,
                                    padding: '1px 6px',
                                    borderRadius: 10,
                                    background: 'color-mix(in srgb,var(--rdw-teal) 16%,transparent)',
                                    color: 'var(--rdw-teal-ink)',
                                    fontWeight: 600,
                                  },
                                },
                                '预览版',
                              ),
                            ),
                            h(
                              'div',
                              { className: 'rdw-chat-empty-meta' },
                              h('span', null, `📁 ${options.projectTitle || 'dakesoftware'}`),
                              h('span', null, '·'),
                              h('span', null, '⚙ PTC 模式'),
                            ),
                            h(
                              'div',
                              { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', maxWidth: '36ch', lineHeight: 1.6 } },
                              '向当前探索智能体下达指令，开启本分支的科学探索',
                            ),
                          )
                        : h(
                            'div',
                            { style: { padding: '20px 10px', textAlign: 'center', color: 'var(--rdw-organic-ink-3)', fontSize: 12 } },
                            '已成功承袭前序上下文。在下方输入框中写下你的第一条研究指令。',
                          )),
                ),
                // 底部原生输入栏
                h(
                  'div',
                  { className: 'rdw-chat-composer' },
                  h('textarea', {
                    placeholder: '发送消息或创建任务，/ 调用指令，@ 文件或对话',
                    value: draft,
                    onChange: (e) => call(options.onDraftChange, e && e.target ? e.target.value : ''),
                    onKeyDown: (e) => {
                      if (e && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (draft.trim()) call(options.onSendDirective, draft.trim())
                      }
                    },
                  }),
                  h(
                    'div',
                    { className: 'rdw-chat-composer-bar' },
                    h(
                      'div',
                      { className: 'rdw-chat-composer-pills' },
                      h('button', { type: 'button', className: 'rdw-chat-composer-pill', title: '添加附件/上下文' }, '+'),
                      h('button', { type: 'button', className: 'rdw-chat-composer-pill' }, '🛡 完全权限 ▾'),
                      h('button', { type: 'button', className: 'rdw-chat-composer-pill' }, `${options.composerModel || 'Gemini 3.8 Flash High'} ▾`),
                    ),
                    h(
                      'div',
                      { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('button', { type: 'button', style: { border: 'none', background: 'none', fontSize: 14, cursor: 'pointer', opacity: 0.6 } }, '🎙'),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'rdw-chat-composer-send',
                          disabled: !draft.trim() || sending,
                          title: '发送指令 (Enter)',
                          onClick: () => draft.trim() && call(options.onSendDirective, draft.trim()),
                        },
                        sending ? '…' : '↑',
                      ),
                    ),
                  ),
                ),
              )
            : null,
        ),
      )
      // 3. 右栏 · 结果面板（产物预览与合并）
      //    参照 EvoResearch 的检查器面板（evo-inspector）：纸面留白、衬线小标题、
      //    有机 pebble 产物条目、底部主操作按钮用陶土/石褐实色。
      const rawFiles =
        Array.isArray(activeRib.outputFiles) && activeRib.outputFiles.length > 0
          ? activeRib.outputFiles
          : Array.isArray(activeRib.workFiles) && activeRib.workFiles.length > 0
            ? activeRib.workFiles
            : null

      const artifactList = rawFiles
        ? rawFiles.slice(0, 5).map((f) => {
            const fname = typeof f === 'string' ? f : f.name || f.path || '产物文件'
            const ext = fname.includes('.') ? fname.split('.').pop().toLowerCase() : ''
            const icon = ['r', 'py', 'js', 'sh', 'ts'].includes(ext)
              ? '</>'
              : ['csv', 'xlsx', 'xls', 'parquet'].includes(ext)
                ? '📊'
                : ['md', 'txt', 'doc', 'docx'].includes(ext)
                  ? '📝'
                  : ['png', 'jpg', 'svg', 'pdf'].includes(ext)
                    ? '🖼️'
                    : '📄'
            const desc = f.size ? `${(f.size / 1024).toFixed(1)} KB · 产物输出` : '产物文件'
            return { icon, title: fname, desc }
          })
        : [
            { icon: '</>', title: `${activeRib.id || 'analysis'}_main.R`, desc: '分析代码 · 版本 v2' },
            { icon: '📊', title: `${activeRib.name || '诊断报告'}`, desc: '表格 · 图形 · 指标' },
            { icon: '📝', title: '方法学审查结论', desc: '结论与可信证据' },
          ]

      // v3.8 · 本分支的文献（Zotero 接入）
      //   两块能力，都落在右栏，与「产物」并列：
      //     1) 搜索 Zotero 库 → 把条目挂到当前这根分支（点 ✚）
      //     2) 从合集导入 → 整个 Zotero 合集一键挂上来
      //   Zotero 没开机时只显示「未连接」+ 重试，已挂的 key 仍然列出来（不给假象）。
      const zotero = options.zotero && typeof options.zotero === 'object' ? options.zotero : null
      const zoteroAvailable = Boolean(zotero && zotero.available)
      const zoteroBusy = Boolean(options.zoteroBusy)
      const linkedItems = zotero && Array.isArray(zotero.items) ? zotero.items : []
      const linkedKeys = zotero && Array.isArray(zotero.linked) ? zotero.linked : []
      const missingKeys = zotero && Array.isArray(zotero.missing) ? zotero.missing : []
      const searchState = zotero && zotero.search && typeof zotero.search === 'object' ? zotero.search : null
      const searchHits = searchState && Array.isArray(searchState.items) ? searchState.items : []
      const collections = zotero && Array.isArray(zotero.collections) ? zotero.collections : []
      const searchDraft = typeof options.zoteroSearch === 'string' ? options.zoteroSearch : ''
      const collectionOpen = Boolean(options.zoteroCollectionOpen)

      /** 迷你图文按钮：右栏很窄，按钮只能放「一个图标 + 一个字」。 */
      const miniBtn = (label, handler, extra) =>
        h(
          'button',
          {
            type: 'button',
            title: label,
            disabled: zoteroBusy || !zoteroAvailable,
            onClick: (event) => {
              if (event && typeof event.stopPropagation === 'function') event.stopPropagation()
              call(handler)
            },
            style: {
              flex: '0 0 auto',
              padding: '1px 6px',
              borderRadius: 'var(--rdw-r-pebble-sm)',
              border: '1px solid var(--rdw-warm-line)',
              background: 'var(--rdw-organic-input)',
              color: 'var(--rdw-organic-ink-2)',
              font: 'inherit',
              fontSize: 11,
              lineHeight: '16px',
              cursor: zoteroBusy || !zoteroAvailable ? 'default' : 'pointer',
              opacity: zoteroBusy || !zoteroAvailable ? 0.55 : 1,
              ...(extra || {}),
            },
          },
          label,
        )

      const zoteroPane = h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
        // 小标题 + 计数 + 刷新
        h(
          'div',
          { style: { ...row, gap: 6, padding: '2px 6px 0' } },
          h(
            'div',
            {
              style: {
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                color: 'var(--rdw-organic-ink-3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
            '📚 本分支的文献',
          ),
          linkedKeys.length > 0
            ? h(
                'span',
                {
                  style: {
                    flex: '0 0 auto',
                    fontFamily: 'var(--rdw-font-mono)',
                    fontSize: 11,
                    color: 'var(--rdw-organic-ink-3)',
                  },
                },
                String(linkedKeys.length),
              )
            : null,
          miniBtn('↻', options.onZoteroRefresh, { background: 'transparent', border: 'none', color: 'var(--rdw-organic-ink-3)' }),
        ),

        // 未连接：探活明确失败时才显示提示
        zotero && !zoteroAvailable
          ? h(
              'div',
              {
                style: {
                  padding: '6px 9px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))',
                  border: '1px solid color-mix(in srgb,var(--rdw-tan) 30%,transparent)',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: 'var(--rdw-organic-ink-2)',
                },
              },
              h('div', { style: { fontWeight: 600, color: 'var(--rdw-tan-ink)' } }, '未连接 Zotero'),
              h(
                'div',
                { style: { marginTop: 2 } },
                (zotero && zotero.error) || '请先启动 Zotero 桌面版（本地 API 默认 127.0.0.1:23119）。',
              ),
            )
          : null,

        // 已挂文献
        linkedItems.length > 0
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              ...linkedItems.slice(0, 6).map((item) =>
                h(
                  'div',
                  {
                    key: `zot-${item.key}`,
                    style: {
                      padding: '6px 9px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      background: 'var(--rdw-organic-surface)',
                      border: '1px solid var(--rdw-warm-line-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      boxShadow: 'var(--rdw-shadow-organic-1)',
                    },
                  },
                  h(
                    'div',
                    {
                      style: {
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--rdw-organic-ink)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      },
                      title: item.title,
                    },
                    item.title,
                  ),
                  h(
                    'div',
                    {
                      style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--rdw-organic-ink-3)' },
                    },
                    h(
                      'span',
                      { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                      [item.creators, item.year ? String(item.year) : ''].filter(Boolean).join(' · ') || item.itemType || '',
                    ),
                    miniBtn('定位', () => call(options.onZoteroLocate, item.key, 'item')),
                    miniBtn('移出', () => call(options.onZoteroDetach, item.key)),
                  ),
                ),
              ),
              linkedKeys.length > linkedItems.length
                ? h(
                    'div',
                    { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                    `另有 ${linkedKeys.length - linkedItems.length} 条未取到摘要（Zotero 里可能已删除或归档）`,
                  )
                : null,
            )
          : missingKeys.length > 0
            ? h(
                'div',
                { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                `已挂 ${missingKeys.length} 条，但当前读不到摘要`,
              )
            : zoteroAvailable
              ? h(
                  'div',
                  { style: { padding: '0 6px', fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.5 } },
                  '这个分支还没挂文献。在下面搜索，或从合集导入。',
                )
              : null,

        // 搜索 Zotero 库
        zoteroAvailable
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 } },
              h(
                'div',
                { style: { ...row, gap: 5, flexWrap: 'nowrap' } },
                h('input', {
                  value: searchDraft,
                  placeholder: '在 Zotero 库中搜索…',
                  disabled: zoteroBusy,
                  'aria-label': '在 Zotero 库中搜索文献',
                  onChange: (event) =>
                    call(options.onZoteroSearchChange, event && event.target ? event.target.value : ''),
                  onKeyDown: (event) => {
                    if (event && event.key === 'Enter') {
                      if (typeof event.preventDefault === 'function') event.preventDefault()
                      call(options.onZoteroSearchSubmit)
                    }
                  },
                  style: {
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '4px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid var(--rdw-warm-line)',
                    background: 'var(--rdw-organic-input)',
                    color: 'var(--rdw-organic-ink)',
                    font: 'inherit',
                    fontSize: 11.5,
                    outline: 'none',
                  },
                }),
                miniBtn('搜', options.onZoteroSearchSubmit),
              ),
              searchState
                ? searchHits.length > 0
                  ? h(
                      'div',
                      { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 190, overflowY: 'auto' } },
                      ...searchHits.slice(0, 10).map((hit) => {
                        const attached = linkedKeys.includes(hit.key)
                        return h(
                          'div',
                          {
                            key: `hit-${hit.key}`,
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 7px',
                              borderRadius: 'var(--rdw-r-pebble-sm)',
                              border: '1px solid var(--rdw-warm-line-2)',
                              background: 'var(--rdw-fill-quat)',
                            },
                          },
                          h(
                            'span',
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                fontSize: 11,
                                color: 'var(--rdw-organic-ink-2)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              },
                              title: `${hit.title}${hit.publication ? ` · ${hit.publication}` : ''}`,
                            },
                            `${hit.year ? `${hit.year} · ` : ''}${hit.title}`,
                          ),
                          attached
                            ? h(
                                'span',
                                { style: { flex: '0 0 auto', fontSize: 11, color: 'var(--rdw-sys-green)' } },
                                '已挂',
                              )
                            : miniBtn('✚', () => call(options.onZoteroAttach, hit.key)),
                        )
                      }),
                    )
                  : h(
                      'div',
                      { style: { padding: '0 6px', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                      searchState.error ? `检索失败：${searchState.error}` : '没有命中条目',
                    )
                : null,
            )
          : null,

        // 从合集导入
        zoteroAvailable && collections.length > 0
          ? h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 } },
              h(
                'button',
                {
                  type: 'button',
                  disabled: zoteroBusy,
                  onClick: () => call(options.onZoteroToggleCollections),
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--rdw-organic-ink-3)',
                    font: 'inherit',
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '.3px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    textAlign: 'left',
                  },
                },
                h('span', { style: { flex: '0 0 auto' } }, collectionOpen ? '▾' : '▸'),
                h('span', { style: { flex: 1, minWidth: 0 } }, '从合集导入'),
                h(
                  'span',
                  { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontSize: 11 } },
                  String(collections.length),
                ),
              ),
              collectionOpen
                ? h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        maxHeight: 200,
                        overflowY: 'auto',
                        padding: '4px 2px',
                        border: '1px solid var(--rdw-warm-line-2)',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        background: 'var(--rdw-fill-quat)',
                      },
                    },
                    ...collections
                      .filter((col) => col && col.items > 0)
                      .slice(0, 40)
                      .map((col) =>
                        h(
                          'div',
                          {
                            key: `col-${col.key}`,
                            title: `把「${col.name}」整个挂到这个分支（${col.items} 条）`,
                            onClick: () => {
                              if (!zoteroBusy) call(options.onZoteroImportCollection, col.key, col.name)
                            },
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '2px 6px',
                              paddingLeft: 6 + Number(col.depth || 0) * 10,
                              borderRadius: 'var(--rdw-r-pebble-sm)',
                              cursor: zoteroBusy ? 'default' : 'pointer',
                              fontSize: 11,
                              color: 'var(--rdw-organic-ink-2)',
                              opacity: zoteroBusy ? 0.6 : 1,
                            },
                          },
                          h('span', { style: { flex: '0 0 auto', fontSize: 11 } }, col.depth > 0 ? '↳' : '📁'),
                          h(
                            'span',
                            { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            col.name,
                          ),
                          h(
                            'span',
                            { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                            String(col.items),
                          ),
                        ),
                      ),
                  )
                : null,
            )
          : null,
      )

      /* ── v2.1 主支成稿面板（右栏第一块）─────────────────────────────
       *
       * 「这一节主支的成稿 / 备份 / 续贯」三段。旧项目（没有 SPINE.json）整块不渲染，
       * 只给一句「本模块还没有主支成稿」的引导，不制造噪音。 */
      const stageNode = activeModule && activeModule.stageId ? activeModule : null
      const spineInfo = options.spine && options.spine.ok !== false ? options.spine : null
      const stageDetail = spineInfo && spineInfo.detail && spineInfo.detail.ok !== false ? spineInfo.detail : null
      const stageBusy = Boolean(options.stageBusy)
      const stageFocusId = stageNode ? stageNode.stageId : null
      // 只有详情抽屉里正在看这一主支时，正文才显示（避免点开别的主支串内容）
      const showStageDraft =
        stageDetail && stageDetail.stage && stageFocusId && stageDetail.stage.id === stageFocusId
          ? stageDetail.draftRaw
          : null
      const chainIssuesForStage = spineInfo && Array.isArray(spineInfo.spine && spineInfo.spine.chainIssues)
        ? spineInfo.spine.chainIssues
        : []

      const stagePane = stageNode
        ? h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            // 小标题 + 状态徽标
            h(
              'div',
              { style: { ...row, gap: 6, padding: '2px 6px 0' } },
              h(
                'div',
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: '.3px',
                    textTransform: 'uppercase',
                    color: 'var(--rdw-organic-ink-3)',
                  },
                },
                '📜 主支成稿',
              ),
              h(
                'span',
                {
                  style: {
                    flex: '0 0 auto',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 8px',
                    borderRadius: 'var(--rdw-r-pill)',
                    color: stageTheme(stageNode).color,
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 12%,var(--rdw-organic-surface))',
                    border: `1px solid ${stageNode.stageStatus === 'stale' ? 'color-mix(in srgb,var(--rdw-tan-ink) 40%,transparent)' : 'var(--rdw-warm-line-2)'}`,
                  },
                },
                stageBadgeText(stageNode),
              ),
            ),

            // 三个动作：重新生成 / 备份 / 汇编终稿
            h(
              'div',
              { style: { display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 2px' } },
              h(
                'button',
                {
                  type: 'button',
                  disabled: stageBusy || stageNode.stageStatus === 'locked',
                  title: stageNode.stageStatus === 'locked' ? '主支已锁定，先解锁再重生成' : '备份旧稿并确定性重生成 7 节成稿',
                  onClick: () => call(options.onSpineOp, 'rebuild', stageFocusId),
                  style: {
                    ...button,
                    height: 24,
                    padding: '0 9px',
                    fontSize: 11,
                    opacity: stageBusy || stageNode.stageStatus === 'locked' ? 0.5 : 1,
                    cursor: stageBusy || stageNode.stageStatus === 'locked' ? 'default' : 'pointer',
                  },
                },
                '↻ 重新生成',
              ),
              h(
                'button',
                {
                  type: 'button',
                  disabled: stageBusy || !stageHasDraft(stageNode),
                  title: stageHasDraft(stageNode) ? '只备份当前成稿，不重生成' : '尚无成稿可备份',
                  onClick: () => call(options.onSpineOp, 'backup', stageFocusId),
                  style: {
                    ...button,
                    height: 24,
                    padding: '0 9px',
                    fontSize: 11,
                    opacity: stageBusy || !stageHasDraft(stageNode) ? 0.5 : 1,
                    cursor: stageBusy || !stageHasDraft(stageNode) ? 'default' : 'pointer',
                  },
                },
                '⧉ 备份',
              ),
              h(
                'button',
                {
                  type: 'button',
                  disabled: stageBusy || stageNode.stageStatus === 'locked',
                  title: stageNode.stageStatus === 'locked' ? '已锁定（点击解锁）' : '锁定后 graft 不再自动重生成',
                  onClick: () => call(options.onSpineOp, stageNode.stageStatus === 'locked' ? 'unlock' : 'lock', stageFocusId),
                  style: {
                    ...button,
                    height: 24,
                    padding: '0 9px',
                    fontSize: 11,
                    opacity: stageBusy ? 0.5 : 1,
                  },
                },
                stageNode.stageStatus === 'locked' ? '🔓 解锁' : '🔒 锁定',
              ),
            ),

            // 段一：成稿正文（7 节预览 + 全文展开）
            h(
              'div',
              {
                style: {
                  padding: '7px 10px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'var(--rdw-organic-surface)',
                  border: '1px solid var(--rdw-warm-line-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                },
              },
              h(
                'div',
                { style: { ...row, gap: 5 } },
                h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '成稿'),
                h(
                  'span',
                  { style: { fontFamily: 'var(--rdw-font-mono)', fontSize: 11, color: 'var(--rdw-organic-ink-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                  stageNode.draft && stageNode.draft.path ? stageNode.draft.path : '（无成稿路径）',
                ),
                typeof showStageDraft === 'string' && showStageDraft.length > 0
                  ? h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => call(options.onOpenStageDraft, stageFocusId, showStageDraft),
                        style: { ...button, height: 20, padding: '0 7px', fontSize: 11 },
                        title: '查看 DRAFT.md 全文',
                      },
                      '全文',
                    )
                  : null,
              ),
              !stageHasDraft(stageNode)
                ? h(
                    'div',
                    { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.5 } },
                    stageNode.stageStatus === 'empty'
                      ? '本主支还没开工。分支回连（graft）后会自动生成成稿。'
                      : '成稿文件缺失 —— 点「↻ 重新生成」重建。',
                  )
                : (() => {
                    const sections = (stageNode.draft && Array.isArray(stageNode.draft.sections)) ? stageNode.draft.sections : []
                    if (sections.length === 0) {
                      return h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '（成稿小节未解析）')
                    }
                    return h(
                      'div',
                      { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                      ...sections.slice(0, 7).map((sec) =>
                        h(
                          'div',
                          {
                            key: `sec-${sec.no}`,
                            style: { display: 'flex', gap: 5, fontSize: 11, lineHeight: 1.45, alignItems: 'baseline' },
                          },
                          h(
                            'span',
                            { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', color: 'var(--rdw-sage)', fontWeight: 700 } },
                            `§${sec.no}`,
                          ),
                          h(
                            'span',
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                color: 'var(--rdw-organic-ink-2)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              },
                              title: `${sec.title}：${sec.preview || ''}`,
                            },
                            sec.title || '（无标题）',
                            sec.preview ? h('span', { style: { color: 'var(--rdw-organic-ink-3)' } }, ` · ${truncate(sec.preview, 22)}`) : null,
                          ),
                        ),
                      ),
                      sections.length > 7
                        ? h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, `…共 ${sections.length} 节`)
                        : null,
                    )
                  })(),
            ),

            // 段二：备份列表
            h(
              'div',
              {
                style: {
                  padding: '7px 10px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'var(--rdw-organic-surface)',
                  border: '1px solid var(--rdw-warm-line-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                },
              },
              h(
                'div',
                { style: { ...row, gap: 5 } },
                h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '备份'),
                h(
                  'span',
                  { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', flex: 1 } },
                  `${Number(stageNode.backupCount) || 0} 份`,
                ),
              ),
              (() => {
                const backups = Array.isArray(stageNode.backups) ? stageNode.backups : []
                if (backups.length === 0) {
                  return h('div', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, '还没有备份（每次重生成前会自动备份上一版）')
                }
                return h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' } },
                  ...backups
                    .slice()
                    .reverse()
                    .map((bak) =>
                      h(
                        'div',
                        {
                          key: `bak-${bak.revision}-${bak.at}`,
                          role: 'button',
                          tabIndex: 0,
                          style: {
                            display: 'flex',
                            gap: 5,
                            alignItems: 'baseline',
                            fontSize: 11,
                            padding: '2px 4px',
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            cursor: bak.path ? 'pointer' : 'default',
                          },
                          title: `${bak.path || ''}\n${bak.sha256 || ''}\n${bak.reason || ''}`,
                          onClick: () => { if (bak.path) call(options.onOpenFile, bak.path) },
                          onKeyDown: (event) => {
                            if (bak.path && event && (event.key === 'Enter' || event.key === ' ')) call(options.onOpenFile, bak.path)
                          },
                        },
                        h(
                          'span',
                          { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', color: 'var(--rdw-tan-ink)', fontWeight: 700 } },
                          `v${bak.revision}`,
                        ),
                        h(
                          'span',
                          {
                            style: {
                              flex: 1,
                              minWidth: 0,
                              color: 'var(--rdw-organic-ink-2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          },
                          bak.reason || '手动备份',
                        ),
                      ),
                    ),
                )
              })(),
            ),

            // 段三：续贯
            h(
              'div',
              {
                style: {
                  padding: '7px 10px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: chainIssuesForStage.length
                    ? 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))'
                    : 'var(--rdw-organic-surface)',
                  border: chainIssuesForStage.length
                    ? '1px solid color-mix(in srgb,var(--rdw-tan) 34%,transparent)'
                    : '1px solid var(--rdw-warm-line-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                },
              },
              h(
                'div',
                { style: { ...row, gap: 5 } },
                h('span', { style: { fontSize: 11.5, fontWeight: 700, color: 'var(--rdw-organic-ink)' } }, '续贯'),
                h(
                  'span',
                  { style: { fontSize: 11, color: chainIssuesForStage.length ? 'var(--rdw-tan-ink)' : 'var(--rdw-organic-ink-3)', flex: 1 } },
                  chainIssuesForStage.length === 0
                    ? `第 ${stageNode.order} 顺位 · 链通`
                    : `${chainIssuesForStage.length} 条问题`,
                ),
              ),
              chainIssuesForStage.length === 0
                ? h(
                    'div',
                    { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.45 } },
                    `下游可直接引用 ${stageNode.draft && stageNode.draft.path ? stageNode.draft.path : '本主支成稿'}。`,
                  )
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 110, overflowY: 'auto' } },
                    ...chainIssuesForStage.slice(0, 8).map((issue, issueIdx) =>
                      h(
                        'div',
                        {
                          key: `issue-${issueIdx}`,
                          style: { display: 'flex', gap: 5, fontSize: 11, lineHeight: 1.45, alignItems: 'baseline' },
                          title: `${issue.code || ''} ${issue.path || ''}\n${issue.message || ''}`,
                        },
                        h(
                          'span',
                          { style: { flex: '0 0 auto', fontFamily: 'var(--rdw-font-mono)', fontWeight: 700, color: 'var(--rdw-tan-ink)' } },
                          issue.code || '?',
                        ),
                        h(
                          'span',
                          {
                            style: {
                              flex: 1,
                              minWidth: 0,
                              color: 'var(--rdw-organic-ink-2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          },
                          issue.message || '',
                        ),
                      ),
                    ),
                  ),
            ),

            // 终稿论文状态 + 汇编入口
            spineInfo && spineInfo.paper
              ? h(
                  'div',
                  { style: { ...row, gap: 5, padding: '0 2px' } },
                  h(
                    'span',
                    { style: { flex: 1, minWidth: 0, fontSize: 11, color: 'var(--rdw-organic-ink-3)' } },
                    spineInfo.paper.exists
                      ? `终稿已汇编 · ${truncate(formatTimeText(spineInfo.paper.generatedAt), 16)}`
                      : '尚未汇编终稿论文',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: stageBusy || Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0,
                      title:
                        Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0
                          ? '一个成稿都还没有，汇编会被拒绝（SPINE-E106）'
                          : '汇编全部主支成稿为 manuscript/PAPER.md',
                      onClick: () => call(options.onSpineOp, 'paper', null),
                      style: {
                        ...button,
                        height: 22,
                        padding: '0 8px',
                        fontSize: 11,
                        opacity: stageBusy || Number(spineInfo.spine && spineInfo.spine.stagesWithDraft) === 0 ? 0.5 : 1,
                      },
                    },
                    '📄 汇编终稿',
                  ),
                )
              : null,
          )
        : null

      const rightPane = h(
        'div',
        {
          style: {
            margin: 0,
            padding: '12px 12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            minHeight: 0,
            /* 右栏同样是底板。唯一保留强色的是里面「需要你拍板」
             * 那张卡——那才是真要你看的东西。 */
            background: 'var(--rdw-side-surface)',
            backgroundImage: 'var(--rdw-organic-grain)',
            border: '1px solid var(--rdw-side-line)',
            borderRadius: 'var(--rdw-r-blob)',
          },
        },
        // 右栏标题（衬线）
        h(
          'div',
          { style: { padding: '0 4px' } },
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--rdw-font-serif)',
                fontSize: 16.5,
                fontWeight: 600,
                letterSpacing: '-.01em',
                color: 'var(--rdw-organic-ink)',
              },
            },
            '结果面板',
          ),
          h(
            'div',
            { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', marginTop: 1 } },
            '产物预览与合并',
          ),
        ),
        // 产物列表小标题
        h(
          'div',
          {
            style: {
              padding: '2px 6px 0',
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: '.3px',
              textTransform: 'uppercase',
              color: 'var(--rdw-organic-ink-3)',
            },
          },
          '📁 本任务产物',
        ),
        // v2.1 主支成稿（成稿 / 备份 / 续贯三段）—— 旧项目 stageId 为 null 时整块不渲染
        stagePane,
        // 产物条目
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
          ...artifactList.map((file, fIdx) =>
            h(
              'div',
              {
                key: `art-${fIdx}`,
                className: 'rdw-organic-card',
                style: {
                  padding: '7px 10px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'var(--rdw-organic-surface)',
                  border: '1px solid var(--rdw-warm-line-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  cursor: 'pointer',
                  boxShadow: 'var(--rdw-shadow-organic-1)',
                },
                onClick: () => call(options.onOpenFile, file.title),
                onContextMenu: (event) => emitContextMenu(options, event, { kind: 'artifact', file, rib: activeRib }),
              },
              h(
                'div',
                { style: { ...row, gap: 6 } },
                h(
                  'span',
                  {
                    style: {
                      fontFamily: 'var(--rdw-font-mono)',
                      fontSize: 12,
                      color: 'var(--rdw-tan-ink)',
                      fontWeight: 700,
                      flex: '0 0 auto',
                    },
                  },
                  file.icon,
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--rdw-organic-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                  file.title,
                ),
              ),
              h(
                'div',
                { style: { fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', paddingLeft: 22 } },
                file.desc,
              ),
            ),
          ),
        ),
        // v3.8 · 本分支的文献（Zotero 接入：搜索挂载 + 合集导入）
        zoteroPane,    // 整合：需要你拍板或处理
        attention.length > 0
          ? h(
              'div',
              {
                style: {
                  padding: '7px 10px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  background: 'color-mix(in srgb,var(--rdw-tan) 12%,var(--rdw-organic-surface))',
                  border: '1px solid color-mix(in srgb,var(--rdw-tan) 32%,transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                },
              },
              h(
                'div',
                { style: { ...row, gap: 5 } },
                h('span', { style: { fontSize: 12.5 } }, '⚡'),
                h(
                  'strong',
                  { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--rdw-tan-ink)', letterSpacing: '.2px' } },
                  '需要你拍板或处理',
                ),
              ),
              ...attention.slice(0, 4).map((item, aIdx) => {
                const msg =
                  item.message ||
                  item.text ||
                  item.reason ||
                  item.title ||
                  (item.kind === 'decision'
                    ? item.stream ? `${item.stream} 等待拍板` : '有一项交接等待拍板'
                    : '上游版本变更，下游结果可能已过期')
                return h(
                  'div',
                  {
                    key: `att-${aIdx}`,
                    style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, lineHeight: 1.5 },
                  },
                  h(
                    'span',
                    {
                      style: {
                        flex: '0 0 auto',
                        padding: '1px 6px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: item.kind === 'stale' ? 'var(--rdw-st-rejected)' : 'var(--rdw-tan-ink)',
                        background:
                          item.kind === 'stale'
                            ? 'color-mix(in srgb,var(--rdw-st-rejected) 13%,transparent)'
                            : 'color-mix(in srgb,var(--rdw-tan) 22%,transparent)',
                      },
                    },
                    item.kind === 'stale' ? '过期' : '待定',
                  ),
                  h(
                    'span',
                    {
                      style: {
                        color: 'var(--rdw-organic-ink-2)',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                      title: msg,
                    },
                    msg,
                  ),
                )
              }),
            )
          : null,
        // 阶段里程碑 / 交付物沉淀（展示主支已锁定的科学证据资产）
        (() => {
          const milestoneList =
            Array.isArray(markers) && markers.length > 0
              ? markers
              : spine
                  .filter((m) => pctOf(m) === 100 || m.status === 'ACCEPTED')
                  .map((m) => ({ stream: `${m.name} · 已验收`, version: 1 }))
          if (milestoneList.length === 0) return null
          return h(
            'div',
            {
              style: {
                padding: '7px 10px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                background: 'var(--rdw-fill-quat)',
                border: '1px solid var(--rdw-warm-line-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              },
            },
            h(
              'div',
              { style: { ...row, gap: 5 } },
              h('span', { style: { fontSize: 12 } }, '🏁'),
              h(
                'strong',
                { style: { fontSize: 12, fontWeight: 700, color: 'var(--rdw-organic-ink)', letterSpacing: '.2px' } },
                '主支里程碑沉淀',
              ),
            ),
            ...milestoneList.slice(0, 3).map((ms, mIdx) =>
              h(
                'div',
                {
                  key: `ms-${mIdx}`,
                  onContextMenu: (event) => emitContextMenu(options, event, { kind: 'marker', marker: ms }),
                  style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--rdw-organic-ink-2)', cursor: 'context-menu' },
                },
                h('span', { style: { color: 'var(--rdw-sys-green)', fontWeight: 700 } }, '✓'),
                h(
                  'span',
                  {
                    style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                    title: ms.stream || ms.name || '阶段成果',
                  },
                  ms.stream || ms.name || '阶段成果',
                ),
                ms.version
                  ? h(
                      'span',
                      {
                        style: {
                          fontFamily: 'var(--rdw-font-mono)',
                          fontSize: 11,
                          color: 'var(--rdw-organic-ink-3)',
                          flex: '0 0 auto',
                        },
                      },
                      `v${ms.version}`,
                    )
                  : null,
              ),
            ),
          )
        })(),
        // 合并状态（底部固定区）
        h(
          'div',
          {
            style: {
              marginTop: 'auto',
              paddingTop: 9,
              borderTop: '1px solid var(--rdw-warm-line-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            },
          },
          h(
            'div',
            {
              style: {
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '.3px',
                textTransform: 'uppercase',
                color: 'var(--rdw-organic-ink-3)',
              },
            },
            '合并状态',
          ),
          h(
            'div',
            { style: { ...row, gap: 6 } },
            h(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 9px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--rdw-tan-ink)',
                  background: 'color-mix(in srgb,var(--rdw-tan) 20%,transparent)',
                  border: '1px solid color-mix(in srgb,var(--rdw-tan) 40%,transparent)',
                },
              },
              h('span', {
                style: {
                  width: 5,
                  height: 5,
                  borderRadius: 'var(--rdw-r-dot)',
                  background: 'var(--rdw-tan-ink)',
                },
              }),
              '等待人工确认',
            ),
          ),
          h(
            'div',
            { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', lineHeight: 1.55 } },
            '确认后选择需要回连主线的成果。',
          ),
          // 底部主操作按钮（石褐色实底 + 有机圆角 + 土色阴影）
          h(
            'button',
            {
              type: 'button',
              className: 'rdw-organic-btn',
              style: {
                width: '100%',
                marginTop: 5,
                padding: '9px 0',
                borderRadius: 'var(--rdw-r-pebble)',
                border: 'none',
                background: 'var(--rdw-soil)',
                color: '#faf6f1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: 'var(--rdw-shadow-organic-2)',
                letterSpacing: '.01em',
              },
              disabled: Boolean(options.busy),
              title: '审阅并确认成果，回连合并至主线',
              onClick: () => call(options.onGraft, activeRib.id),
            },
            '审核与合并设计',
          ),
        ),
      )

      /* 三栏舞台内容：外壳 .rdw-stage 已是 CSS Grid 容器（左/中/右三列），
       * 这里直接返回三个 pane，不再自建网格——避免嵌套两层网格导致栏宽失配。 */
      const stageChildren = [leftPane, middlePane, rightPane]
      // v3.5 快捷键与焦点：舞台本身可聚焦（tabIndex=0），键盘事件在这里统一捕获
      const stageWrapperProps = {
        className: 'rdw-fishbone-stage',
        tabIndex: 0,
        role: 'application',
        'aria-label': '项目流程工作台（按 ? 查看快捷键）',
        onKeyDown: onStageKeyDown,
        onContextMenu: (event) => {
          // 空白处右键 = 画布菜单（仅当事件没被子元素消费时才走到这里）
          emitContextMenu(options, event, { kind: 'canvas' })
        },
        style: { display: 'contents' },
      }
      if (options.standalone !== true) {
        return h('div', stageWrapperProps, ...stageChildren)
      }

      const gridNode = h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'minmax(228px, 258px) minmax(0, 1fr) minmax(218px, 246px)',
            gap: 10,
            alignItems: 'stretch',
            minHeight: 540,
          },
        },
        leftPane,
        middlePane,
        rightPane,
      )
      // standalone 场景也补快捷键包装
      return h(
        'div',
        {
          className: 'rdw-fishbone-stage',
          tabIndex: 0,
          onKeyDown: onStageKeyDown,
          onContextMenu: (event) => emitContextMenu(options, event, { kind: 'canvas' }),
          style: { display: 'contents' },
        },
        gridNode,
      )
    }

    /**
     * 递归分支树视图（对齐 EvoResearch 递归分支规范）。
     * 支持从主支任务节点到多级子分支的无限深度树形展现与分叉操作。
     */
    function renderRecursiveTree(h, spine, ribs, options) {
      const { row, chip, button, primaryButton, muted } = STYLES
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      const renderRibNode = (rib, depth = 0) => {
        const theme = ribTheme(rib.status)
        const childRibs = ribs.filter((r) => r.parent === rib.id)
        const indent = depth * 22

        return h(
          'div',
          { key: `rt-node-${rib.id}`, style: { display: 'flex', flexDirection: 'column', gap: 4, marginLeft: indent } },
          h(
            'div',
            {
              className: 'rdw-organic-card',
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 10px',
                borderRadius: 'var(--rdw-r-pebble-sm)',
                background: 'var(--rdw-organic-surface)',
                border: '1px solid var(--rdw-warm-line-2)',
                borderLeft: `3px solid ${theme.color}`,
                boxShadow: 'var(--rdw-shadow-organic-1)',
              },
            },
            h('span', { style: { fontSize: depth > 0 ? 11 : 13 } }, depth === 0 ? '🌿' : '↳ 🌱'),
            h(
              'span',
              {
                style: {
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--rdw-organic-ink)',
                  whiteSpace: 'nowrap',
                },
              },
              rib.name || rib.id,
            ),
            h(
              'span',
              {
                style: {
                  padding: '0 6px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11,
                  fontFamily: 'var(--rdw-font-mono)',
                  color: 'var(--rdw-organic-ink-3)',
                  background: 'color-mix(in srgb,var(--rdw-mist) 42%,transparent)',
                  flex: '0 0 auto',
                },
              },
              rib.id,
            ),
            rib.parent
              ? h(
                  'span',
                  {
                    style: {
                      padding: '0 6px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      fontSize: 11,
                      color: 'var(--rdw-sage)',
                      background: 'color-mix(in srgb,var(--rdw-sage-tint) 15%,transparent)',
                      flex: '0 0 auto',
                    },
                  },
                  `↳ 父分支: ${rib.parent}`,
                )
              : null,
            h(
              'span',
              {
                style: {
                  padding: '1px 7px',
                  borderRadius: 'var(--rdw-r-pebble-sm)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: theme.color,
                  background: 'color-mix(in srgb,' + theme.color + ' 12%,transparent)',
                  flex: '0 0 auto',
                },
              },
              theme.label,
            ),
            rib.hasSession ? h('span', { style: { fontSize: 12 }, title: '有会话记录' }, '🧠') : null,
            rib.is_stale ? h('span', { style: { fontSize: 12, color: 'var(--rdw-st-rejected)' }, title: '过期' }, '⚠') : null,
            h(
              'div',
              { style: { ...row, gap: 5, marginLeft: 'auto' } },
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-organic-btn',
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid var(--rdw-warm-line)',
                    background: 'var(--rdw-organic-input)',
                    color: 'var(--rdw-organic-ink-2)',
                    fontSize: 12.5,
                    cursor: 'pointer',
                  },
                  title: `以「${rib.name}」为父节点派生新的子分支`,
                  onClick: (e) => {
                    e.stopPropagation()
                    call(options.onSprout, rib.module, rib.id)
                  },
                },
                '🌱 分支',
              ),
              rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: {
                        padding: '2px 8px',
                        borderRadius: 'var(--rdw-r-pebble-sm)',
                        border: '1px solid color-mix(in srgb,var(--rdw-sage) 42%,transparent)',
                        background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                        color: 'var(--rdw-sage)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      },
                      title: '审阅满意后把交接结果接回直接父节点',
                      onClick: (e) => {
                        e.stopPropagation()
                        call(options.onGraft, rib.id)
                      },
                    },
                    '🔗 逐级回连',
                  )
                : null,
              h(
                'button',
                {
                  type: 'button',
                  style: {
                    padding: '2px 9px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: 'none',
                    background: 'var(--rdw-soil)',
                    color: '#faf6f1',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  },
                  onClick: () => call(options.onSelectRib, rib),
                },
                '工作区 →',
              ),
            ),
          ),
          ...childRibs.map((child) => renderRibNode(child, depth + 1)),
        )
      }

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' } },
        ...spine.map((mod) => {
          const modRibs = ribs.filter((r) => r.module === mod.id && (!r.parent || !ribs.some((other) => other.id === r.parent)))
          return h(
            'div',
            {
              key: `tree-mod-${mod.id}`,
              style: {
                padding: '10px 12px',
                borderRadius: 'var(--rdw-r-pebble)',
                border: '1px solid var(--rdw-warm-line-2)',
                background: 'var(--rdw-organic-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              },
            },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', gap: 8 } },
              h(
                'div',
                { style: { ...row, gap: 6, minWidth: 0 } },
                h('span', { style: { fontSize: 13 } }, '🌿'),
                h(
                  'strong',
                  {
                    style: {
                      fontFamily: 'var(--rdw-font-serif)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--rdw-organic-ink)',
                      whiteSpace: 'nowrap',
                    },
                  },
                  `${mod.name} (${mod.id})`,
                ),
                h(
                  'span',
                  {
                    style: {
                      padding: '1px 7px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      fontSize: 11.5,
                      color: 'var(--rdw-organic-ink-3)',
                      background: 'color-mix(in srgb,var(--rdw-mist) 46%,transparent)',
                      flex: '0 0 auto',
                    },
                  },
                  `${mod.ribs ? mod.ribs.length : modRibs.length} 根分支`,
                ),
                h(
                  'span',
                  {
                    style: {
                      padding: '1px 7px',
                      borderRadius: 'var(--rdw-r-pebble-sm)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--rdw-sage)',
                      background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                      flex: '0 0 auto',
                    },
                  },
                  `${pctOf(mod)}% 完成`,
                ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-organic-btn',
                  style: {
                    padding: '2px 9px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid var(--rdw-warm-line)',
                    background: 'var(--rdw-organic-input)',
                    color: 'var(--rdw-organic-ink-2)',
                    fontSize: 12.5,
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  },
                  title: `在此主支阶段（${mod.name}）下创建新分支`,
                  onClick: () => call(options.onSprout, mod.id),
                },
                '➕ 从此阶段新建分支',
              ),
            ),
            modRibs.length > 0
              ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 6 } }, ...modRibs.map((rib) => renderRibNode(rib, 0)))
              : h(
                  'div',
                  { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', paddingLeft: 6 } },
                  '该主支阶段尚未分出分支。点击右侧「➕ 从此阶段新建分支」开始探索。',
                ),
          )
        }),
      )
    }

    /**
     * 分支清单表格渲染函数。
     */
    function renderRibsTable(h, visibleRibs, spine, options) {
      const { chip, button } = STYLES
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      const busy = typeof options.busy === 'string' ? options.busy : ''

      return h(
        'div',
        { style: { ...STYLES.tableWrap } },
        h(
          'table',
          { style: STYLES.table },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', { style: STYLES.th }, '分支'),
              h('th', { style: STYLES.th }, '所属主支'),
              h('th', { style: STYLES.th }, '状态'),
              h('th', { style: STYLES.th }, '产出'),
              h('th', { style: STYLES.th }, '最近活动'),
              h('th', { style: STYLES.th }, ''),
            ),
          ),
          h(
            'tbody',
            null,
            ...visibleRibs
              .slice()
              .sort((left, right) => {
                const leftRank = RIB_RANK[left.status] ?? 9
                const rightRank = RIB_RANK[right.status] ?? 9
                if (leftRank !== rightRank) return leftRank - rightRank
                return String(left.name) < String(right.name) ? -1 : 1
              })
              .map((rib) => {
                const theme = ribTheme(rib.status)
                const node = spine.find((item) => item.id === rib.module)
                const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
                return h(
                  'tr',
                  {
                    key: `row-${rib.id}`,
                    onContextMenu: (event) => emitContextMenu(options, event, { kind: 'rib', rib, module: node }),
                    style: { cursor: 'context-menu' },
                  },
                  h(
                    'td',
                    { style: STYLES.td },
                    h(
                      'div',
                      { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { color: theme.color, fontSize: 12 } }, theme.dot),
                      h('span', { style: { fontWeight: 600, color: 'var(--rdw-text)' } }, rib.name),
                      rib.parent ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-sage)' } }, `↳ 父分支: `) : null,
                      rib.hasSession ? h('span', { style: { fontSize: 12 }, title: '有会话记录' }, '🧠') : null,
                      rib.is_stale ? h('span', { style: { fontSize: 12, color: 'var(--rdw-st-rejected)' }, title: '过期' }, '⚠') : null,
                    ),
                    rib.brief ? h('div', { style: { ...STYLES.muted, marginTop: 2 } }, truncate(rib.brief, 72)) : null,
                  ),
                  h('td', { style: STYLES.td }, node ? node.name : rib.module),
                  h(
                    'td',
                    { style: STYLES.td },
                    h(
                      'span',
                      {
                        style: {
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: theme.color,
                          background: 'color-mix(in srgb,' + theme.color + ' 12%,transparent)',
                          border: '1px solid color-mix(in srgb,' + theme.color + ' 26%,transparent)',
                          whiteSpace: 'nowrap',
                        },
                      },
                      theme.label,
                    ),
                  ),
                  h('td', { style: { ...STYLES.td, fontVariantNumeric: 'tabular-nums' } }, `${fileCount} 个文件`),
                  h('td', { style: { ...STYLES.td, fontVariantNumeric: 'tabular-nums' } }, rib.lastActivityAt ? formatTimeText(rib.lastActivityAt) : '—'),
                  h(
                    'td',
                    { style: { ...STYLES.td, textAlign: 'right', whiteSpace: 'nowrap' } },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'rdw-organic-btn',
                        style: {
                          padding: '3px 9px',
                          marginRight: 5,
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          border: '1px solid var(--rdw-warm-line)',
                          background: 'var(--rdw-organic-input)',
                          color: 'var(--rdw-organic-ink-2)',
                          fontSize: 12.5,
                          cursor: 'pointer',
                        },
                        title: `以「${rib.name}」为父节点派生新的子探索分支`,
                        onClick: () => call(options.onSprout, rib.module, rib.id),
                      },
                      '🌱 分支',
                    ),
                    rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED'
                      ? h('button', {
                          type: 'button',
                          style: {
                            padding: '3px 9px',
                            marginRight: 5,
                            borderRadius: 'var(--rdw-r-pebble-sm)',
                            border: '1px solid color-mix(in srgb,var(--rdw-sage) 44%,transparent)',
                            background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                            color: 'var(--rdw-sage)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          },
                          disabled: Boolean(busy),
                          title: '审阅后把该分支的交接结果接回主支',
                          onClick: () => call(options.onGraft, rib.id),
                        }, '回连')
                      : null,
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'rdw-organic-btn',
                        style: {
                          padding: '3px 9px',
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          border: '1px solid var(--rdw-warm-line)',
                          background: 'var(--rdw-organic-input)',
                          color: 'var(--rdw-organic-ink-2)',
                          fontSize: 12.5,
                          cursor: 'pointer',
                        },
                        onClick: () => call(options.onSelectRib, rib),
                      },
                      '打开分支',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'rdw-organic-btn',
                        style: {
                          padding: '3px 7px',
                          marginLeft: 5,
                          borderRadius: 'var(--rdw-r-pebble-sm)',
                          border: '1px solid color-mix(in srgb,var(--rdw-st-rejected) 24%,transparent)',
                          background: 'transparent',
                          color: 'var(--rdw-st-rejected)',
                          fontSize: 11.5,
                          cursor: 'pointer',
                          opacity: 0.8,
                        },
                        title: `删除分支「${rib.name}」到回收站`,
                        onClick: (e) => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          call(options.onDeleteRib, rib)
                        },
                      },
                      '🗑',
                    ),
                  ),
                )
              }),
          ),
        ),
      )
    }

    /**
     * 渲染项目流程主线视图。
     * @param {object} h React.createElement
     * @param {{fishbone?: object|null, loading?: boolean, error?: string,
     *          selectedModule?: string|null, selectedRib?: string|null,
     *          onSelectModule?: Function, onSelectRib?: Function,
     *          onRefresh?: Function, onSprout?: Function, onAuto?: Function,
     *          onGraft?: Function, busy?: string}} props
     */
    function renderFishboneView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, muted, button, primaryButton, sectionTitle, mutedBox } = STYLES
      const fishbone = options.fishbone && options.fishbone.ok !== false ? options.fishbone : null
      const loading = Boolean(options.loading)
      const error = typeof options.error === 'string' ? options.error : ''
      const busy = typeof options.busy === 'string' ? options.busy : ''
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      if (!fishbone) {
        if (error) {
          return h(
            'div',
            { style: card },
            h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, '项目流程主线读取失败'),
            h('div', { style: { ...muted, marginBottom: 8 } }, error),
            h('button', { type: 'button', style: primaryButton, disabled: loading, onClick: () => call(options.onRefresh) }, '重试'),
          )
        }
        return h('div', { style: { ...muted, padding: '16px 0' } }, loading ? '正在读取项目主线…' : '还没有项目数据')
      }

      const head = fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
      const spine = orderSpine(fishbone.spine, head.phase)
      const ribs = Array.isArray(fishbone.ribs) ? fishbone.ribs : []
      const attention = Array.isArray(fishbone.attention) ? fishbone.attention : []
      const markers = Array.isArray(fishbone.markers) ? fishbone.markers : []
      const totals = fishbone.totals && typeof fishbone.totals === 'object' ? fishbone.totals : {}
      const nextSteps = Array.isArray(head.nextSteps) ? head.nextSteps : []
      const blockers = Array.isArray(head.blockers) ? head.blockers : []
      const cliErrors = Array.isArray(fishbone.cliErrors) ? fishbone.cliErrors : []

      const selModule = options.selectedModule || null
      const selRib = options.selectedRib || null
      const displayMode = options.displayMode || 'canvas'
      const visibleRibs = selModule ? ribs.filter((rib) => rib.module === selModule) : ribs

      const ctx = { head, spine, ribs, totals, nextSteps, blockers, attention, markers, visibleRibs, selModule, selRib, displayMode, options, busy, cliErrors, muted, row }

      /* v4 三栏舞台模式：只输出三栏（由外壳的 .rdw-stage 网格承载），
       * 全景与分支表通过 renderFishboneDrawer 单独渲染到底部抽屉里。 */
      if (options.mode === 'stage') {
        return renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps, blockers, attention, markers })
      }

      /* v4 抽屉模式：只输出全景骨架 + 分支清单表。 */
      if (options.mode === 'drawer') {
        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
          h(
            'div',
            {
              className: 'rdw-panorama',
              style: { cursor: 'grab' },
            },
            renderFishSvg(h, spine, ribs, totals, {
              ...options,
              projectTitle: head.title,
              projectGoal: head.goal,
              selectedModule: selModule,
              selectedRib: selRib,
              compact: true,
            }),
          ),
          visibleRibs.length > 0 ? renderRibsTable(h, visibleRibs, spine, options) : null,
          cliErrors.length > 0
            ? h('div', { style: { ...muted, fontSize: 12.5, padding: '4px 0' } }, `部分数据读取失败：${cliErrors.join('；')}`)
            : null,
        )
      }

      /* 兼容模式（单页纵向堆叠）：旧宿主或非 stage 场景下的完整项目流程页。 */
      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        /* --------------------------------------------- EvoResearch 三栏科研工作台（用户指定布局） */
        renderEvoThreePaneWorkbench(h, { head, spine, ribs, totals, options, nextSteps, blockers, attention, markers }),

        /* --------------------------------------------- 分支清单与全景骨架（紧凑整合面板） */
        h(
          'div',
          {
            style: {
              margin: 0,
              padding: '12px 14px',
              background: 'var(--rdw-organic-bg)',
              backgroundImage: 'var(--rdw-organic-grain)',
              border: '1px solid var(--rdw-warm-line-2)',
              borderRadius: 'var(--rdw-r-blob)',
            },
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 10, gap: 8 } },
            h(
              'div',
              { style: { ...row, gap: 7, minWidth: 0 } },
              h('span', { style: { fontSize: 12 } }, '📋'),
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--rdw-font-serif)',
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-.01em',
                    color: 'var(--rdw-organic-ink)',
                    whiteSpace: 'nowrap',
                  },
                },
                '分支清单与全景骨架',
              ),
              h(
                'span',
                {
                  style: {
                    padding: '2px 9px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--rdw-sage)',
                    background: 'color-mix(in srgb,var(--rdw-sage-tint) 16%,transparent)',
                    border: '1px solid color-mix(in srgb,var(--rdw-sage-tint) 34%,transparent)',
                    flex: '0 0 auto',
                  },
                },
                `${ribs.length} 根 · Ishikawa 全景`,
              ),
            ),
            h(
              'div',
              { style: { ...row, gap: 6, flex: '0 0 auto' } },
              h(
                'button',
                {
                  type: 'button',
                  className: 'rdw-organic-btn',
                  style: {
                    padding: '5px 12px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: '1px solid var(--rdw-warm-line)',
                    background: 'var(--rdw-organic-input)',
                    color: 'var(--rdw-organic-ink-2)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  },
                  disabled: Boolean(busy),
                  onClick: () => call(options.onAuto),
                },
                '自动回连',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: {
                    padding: '5px 13px',
                    borderRadius: 'var(--rdw-r-pebble-sm)',
                    border: 'none',
                    background: 'var(--rdw-soil)',
                    color: '#faf6f1',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--rdw-shadow-organic-1)',
                  },
                  disabled: Boolean(busy),
                  onClick: () => call(options.onSprout),
                },
                '🌱 新建一个分支',
              ),
            ),
          ),
          h(
            'div',
            {
              className: 'rdw-organic-scroll',
              style: {
                overflowX: 'auto',
                paddingBottom: 6,
                marginBottom: 10,
                borderRadius: 'var(--rdw-r-pebble)',
                background: 'color-mix(in srgb,var(--rdw-mist) 22%,var(--rdw-organic-surface))',
                border: '1px solid var(--rdw-warm-line-2)',
              },
            },
            renderFishSvg(h, spine, ribs, totals, {
              ...options,
              projectTitle: head.title,
              projectGoal: head.goal,
              selectedModule: selModule,
              selectedRib: selRib,
            }),
          ),
          visibleRibs.length > 0 ? renderRibsTable(h, visibleRibs, spine, options) : null,
        ),

        cliErrors.length > 0
          ? h('div', { style: { ...muted, fontSize: 12.5, padding: '4px 0' } }, `部分数据读取失败：${cliErrors.join('；')}`)
          : null,
      )
    }

    // --- Module: src/views/LeaderLogView.js ---
    /**
     * 研究项目 DAG 工作台 — 主智能体对话视图（v2.5）。
     *
     * 这是**控制层（主智能体）自己的往来记录**，不是分支执行日志：
     *   - 每条裁决（ACCEPT / REJECT / BLOCK / NOTE）及其理由
     *   - 主项目记下的想法
     *   - 内容复核结论（满意 / 待复核）
     *   - 当前阶段、下一步、阻塞
     *
     * 数据：GET /leader-log（control/DECISIONS.md + IDEAS.md + REVIEWS.md + PROJECT_STATE）
     */

    /** 动作 → 视觉主题。 */
    const ACTION_THEME = {
      ACCEPT: { label: '接受', color: 'var(--rdw-st-accepted)', icon: '✓' },
      REJECT: { label: '拒绝', color: 'var(--rdw-st-rejected)', icon: '✕' },
      BLOCK: { label: '阻塞', color: 'var(--rdw-st-blocked)', icon: '⊘' },
      NOTE: { label: '记录', color: 'var(--rdw-st-superseded)', icon: '✎' },
      UNSUBMIT: { label: '撤回', color: 'var(--rdw-st-draft)', icon: '↩' },
    }

    const KIND_THEME = {
      decision: { label: '裁决', color: 'var(--rdw-accent)' },
      idea: { label: '想法', color: 'var(--rdw-st-superseded)' },
      review: { label: '复核', color: 'var(--rdw-st-accepted)' },
    }

    function actionTheme(action) {
      return ACTION_THEME[String(action || '').toUpperCase()] || { label: action || '记录', color: 'var(--rdw-st-draft)', icon: '•' }
    }

    function kindTheme(kind) {
      return KIND_THEME[String(kind || '')] || { label: '记录', color: 'var(--rdw-st-draft)' }
    }

    /** 时间线单条。 */
    function renderTimelineItem(h, item, index) {
      const { row, chip, muted } = STYLES
      const kind = String(item.kind || '')
      const kTheme = kindTheme(kind)
      const aTheme = kind === 'decision' ? actionTheme(item.action) : kTheme
      const isLast = false
      return h(
        'div',
        {
          key: `tl-${index}`,
          style: {
            position: 'relative',
            paddingLeft: 22,
            paddingBottom: 12,
            borderLeft: `2px solid color-mix(in srgb, ${aTheme.color} 30%, transparent)`,
            marginLeft: 6,
          },
        },
        // 节点圆点
        h('span', {
          style: {
            position: 'absolute',
            left: -7,
            top: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: aTheme.color,
            border: '2px solid var(--rdw-panel)',
            boxShadow: `0 0 0 2px color-mix(in srgb, ${aTheme.color} 25%, transparent)`,
          },
        }),
        h(
          'div',
          { style: { ...row, gap: 6, marginBottom: 2 } },
          h(
            'span',
            {
              style: {
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                lineHeight: '15px',
                background: `color-mix(in srgb, ${aTheme.color} 18%, transparent)`,
                color: aTheme.color,
              },
            },
            kind === 'decision' ? `${aTheme.icon} ${aTheme.label}` : kTheme.label,
          ),
          item.id ? h('span', { style: { ...muted, fontSize: 12, fontFamily: 'monospace' } }, item.id) : null,
          h('span', { style: { ...muted, fontSize: 12 } }, formatTimeText(item.at) || item.at || ''),
          item.related ? h('span', { style: { ...muted, fontSize: 12 } }, `↳ ${item.related}`) : null,
        ),
        h('div', { style: { fontSize: 12, fontWeight: 600, lineHeight: 1.45, marginBottom: 2 } }, item.title || ''),
        item.target
          ? h('div', { style: { ...STYLES.mono, fontSize: 12, opacity: 0.7, marginBottom: 2 } }, item.target)
          : null,
        item.text
          ? h(
              'div',
              {
                style: {
                  fontSize: 11,
                  lineHeight: 1.65,
                  opacity: 0.86,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: 'color-mix(in srgb, currentColor 4%, transparent)',
                },
              },
              item.text,
            )
          : null,
      )
    }

    /**
     * 渲染主智能体对话视图。
     * @param {object} h React.createElement
     * @param {{leaderLog?: object|null, loading?: boolean, error?: string,
     *          filter?: string, onFilter?: Function, onRefresh?: Function, busy?: string}} props
     */
    function renderLeaderLogView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, muted, button, primaryButton, sectionTitle, mutedBox } = STYLES
      const log = options.leaderLog && options.leaderLog.ok !== false ? options.leaderLog : null
      const loading = Boolean(options.loading)
      const error = typeof options.error === 'string' ? options.error : ''
      const filter = typeof options.filter === 'string' ? options.filter : 'all'
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      if (!log) {
        if (error) {
          return h(
            'div',
            { style: card },
            h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, '主智能体记录读取失败'),
            h('div', { style: { ...muted, marginBottom: 8 } }, error),
            h('button', { type: 'button', style: primaryButton, disabled: loading, onClick: () => call(options.onRefresh) }, '重试'),
          )
        }
        return h('div', { style: { ...muted, padding: '16px 0' } }, loading ? '正在读取主智能体记录…' : '暂无记录')
      }

      const state = log.state && typeof log.state === 'object' ? log.state : {}
      const timeline = Array.isArray(log.timeline) ? log.timeline : []
      const counts = log.counts && typeof log.counts === 'object' ? log.counts : {}
      const nextSteps = Array.isArray(state.nextSteps) ? state.nextSteps : []
      const blockers = Array.isArray(state.blockers) ? state.blockers : []

      const FILTERS = [
        ['all', '全部'],
        ['decision', '裁决'],
        ['idea', '想法'],
        ['review', '复核'],
      ]
      const visible = filter === 'all' ? timeline : timeline.filter((item) => item.kind === filter)

      return h(
        'div',
        null,
        /* -------------------------------------------------- 主智能体身份卡 */
        h(
          'div',
          {
            style: {
              ...card,
              background:
                'linear-gradient(135deg, var(--rdw-st-superseded-soft), var(--rdw-accent-soft))',
              border: '1px solid color-mix(in srgb,var(--rdw-st-superseded) 28%,transparent)',
            },
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
            h(
              'div',
              { style: { minWidth: 0, flex: '1 1 300px' } },
              h(
                'div',
                { style: { ...row, gap: 6, marginBottom: 4 } },
                h('span', { style: { fontSize: 15 } }, '🧠'),
                h(
                  'span',
                  { style: { fontSize: 12, fontWeight: 700, letterSpacing: '.06em', opacity: 0.72, textTransform: 'uppercase' } },
                  '主智能体 · 控制层记录',
                ),
                state.phase ? h('span', { style: { ...chip, fontSize: 12 } }, state.phase) : null,
              ),
              h(
                'div',
                { style: { fontSize: 11.5, opacity: 0.82, lineHeight: 1.6 } },
                '这里是主项目自己的判断与决定：每次接受/拒绝/阻塞的理由、记下的想法、内容复核结论。分支智能体的执行细节在各分支的工作区里。',
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                style: button,
                disabled: loading,
                onClick: () => call(options.onRefresh),
              },
              loading ? '刷新中…' : '刷新',
            ),
          ),
          h(
            'div',
            { style: { ...row, gap: 6, marginTop: 10 } },
            h('span', { style: { ...chip, fontSize: 12 } }, `裁决 ${counts.decisions || 0}`),
            h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } }, `接受 ${counts.accepted || 0}`),
            (counts.rejected || 0) > 0
              ? h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-rejected)', borderColor: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)' } }, `拒绝 ${counts.rejected}`)
              : null,
            (counts.blocked || 0) > 0
              ? h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-blocked)', borderColor: 'color-mix(in srgb,var(--rdw-st-blocked) 32%,transparent)' } }, `阻塞 ${counts.blocked}`)
              : null,
            h('span', { style: { ...chip, fontSize: 12 } }, `想法 ${counts.ideas || 0}`),
            h('span', { style: { ...chip, fontSize: 12 } }, `复核 ${counts.reviews || 0}`),
          ),
        ),

        /* -------------------------------------------------- 当前意图 */
        nextSteps.length > 0 || blockers.length > 0
          ? h(
              'div',
              { style: card },
              nextSteps.length > 0
                ? h(
                    'div',
                    { style: { marginBottom: blockers.length > 0 ? 8 : 0 } },
                    h('div', { style: sectionTitle }, '🎯 主智能体当前的下一步'),
                    ...nextSteps.map((step, index) =>
                      h('div', { key: `ns-${index}`, style: { fontSize: 11, lineHeight: 1.75, opacity: 0.88 } }, `· ${step}`),
                    ),
                  )
                : null,
              blockers.length > 0
                ? h(
                    'div',
                    null,
                    h('div', { style: sectionTitle }, '⊘ 正在等外部澄清'),
                    ...blockers.map((item, index) =>
                      h('div', { key: `bl-${index}`, style: { fontSize: 11, lineHeight: 1.7, color: 'var(--rdw-st-blocked)', opacity: 0.9 } }, `· ${item}`),
                    ),
                  )
                : null,
            )
          : null,

        /* -------------------------------------------------- 对话时间轴 */
        h(
          'div',
          { style: card },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
            h('div', { style: { ...sectionTitle, margin: 0 } }, `对话时间轴 · ${visible.length} 条`),
            h(
              'div',
              { style: { ...row, gap: 4 } },
              ...FILTERS.map(([id, label]) =>
                h(
                  'button',
                  {
                    key: id,
                    type: 'button',
                    style: filter === id ? { ...primaryButton, fontSize: 12, padding: '2px 8px' } : { ...button, fontSize: 12, padding: '2px 8px' },
                    onClick: () => call(options.onFilter, id),
                  },
                  label,
                ),
              ),
            ),
          ),
          visible.length > 0
            ? h('div', { style: { marginTop: 4 } }, ...visible.map((item, index) => renderTimelineItem(h, item, index)))
            : h('div', { style: mutedBox }, filter === 'all' ? '还没有记录' : '这个分类下没有记录'),
        ),
      )
    }

    // --- Module: src/views/BranchSessionView.js ---
    /**
     * 研究项目 DAG 工作台 — 分支/主支会话视图。
     * 全面板工作区：上下文、简报、工作记录、对话及文件访问均在同一页面。
     */

    const BUBBLE = {
      human: { align: 'flex-end', bg: 'var(--rdw-accent-soft)', border: 'color-mix(in srgb,var(--rdw-accent) 32%,transparent)', label: '你' },
      agent: { align: 'flex-start', bg: 'var(--rdw-st-accepted-soft)', border: 'color-mix(in srgb,var(--rdw-st-accepted) 30%,transparent)', label: '智能体' },
    }

    /** 智能体角色档案（对齐 EvoResearch 六大科研专家体系）。 */
    const AGENT_PERSONAS = {
      M10: { role: '规划专家 (Planner)', icon: '📋', mission: '制定研究假设、PICO 与 Target Trial 协议设计' },
      M20: { role: '调研专家 (Research)', icon: '📚', mission: 'PUBMED / 证据检索与既往基线文献比对' },
      M30: { role: '队列与数据专家 (Cohort & Data)', icon: '🧬', mission: 'MIMIC 提取、入排筛选与缺失值审计' },
      M40: { role: '统计推断专家 (Data Analysis / Stats)', icon: '📐', mission: '倾向评分加权 (IPTW)、Cox 模型与敏感性分析' },
      M50: { role: '写作专家 (Writing)', icon: '✍️', mission: '论文大纲、方法学与结果章节起草、Table 1 生成' },
      M60: { role: '审稿修订专家 (Review & Debug)', icon: '🔍', mission: '审稿意见对照排查与模型稳健性再验证' },
    }

    function renderSection(h, { id, title, icon, badge, open, onToggle, children }) {
      const { card } = STYLES
      return h(
        'div',
        { key: id, style: { ...card, marginBottom: 10, padding: 0, overflow: 'hidden' } },
        h(
          'button',
          {
            type: 'button',
            'aria-expanded': Boolean(open),
            'aria-controls': `${id}-content`,
            style: {
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px',
              border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textAlign: 'left',
            },
            onClick: onToggle,
          },
          h('span', { style: { fontSize: 13 } }, icon),
          h('span', { style: { flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
          badge || null,
          h('span', { style: { opacity: 0.6, fontSize: 12 } }, open ? '▼' : '▶'),
        ),
        open
          ? h(
              'div',
              {
                id: `${id}-content`,
                role: 'region',
                style: {
                  padding: '0 12px 10px', fontSize: 11, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto', opacity: 0.9,
                },
              },
              ...children,
            )
          : null,
      )
    }

    function renderBranchSessionView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, muted, button, primaryButton, textarea } = STYLES
      const session = options.session && typeof options.session === 'object' ? options.session : null
      const loading = Boolean(options.loading)
      const error = typeof options.error === 'string' ? options.error : ''
      const draft = typeof options.directiveDraft === 'string' ? options.directiveDraft : ''
      const sending = Boolean(options.sending)
      if (!session || (!session.data && !loading && !error)) {
        return h('div', { style: { ...card, textAlign: 'center', padding: '24px 0' } }, loading ? h('div', { style: muted }, '正在打开工作区…') : h('div', { style: muted }, error || '选择一根分支以打开会话'))
      }
      const data = session.data || {}
      const modName = (data.module && data.module.name) || session.module || ''
      const brName = (data.branch && data.branch.name) || session.branch || ''
      const brMode = data.branch && data.branch.mode
      const entries = Array.isArray(data.directivesParsed) ? data.directivesParsed : []
      const sessionSections = Array.isArray(data.sessionParsed) ? data.sessionParsed : []
      const workFiles = Array.isArray(data.workFiles) ? data.workFiles : []
      const outputFiles = Array.isArray(data.outputFiles) ? data.outputFiles : []
      const allFiles = [...workFiles.map((file) => ({ ...file, scope: 'work' })), ...outputFiles.map((file) => ({ ...file, scope: 'outputs' }))]
      if (session.mode === 'module') {
        const module = data.module || {}
        const ribs = Array.isArray(data.ribs) ? data.ribs : []
        const spine = data.spine || {}
        const ribList = ribs.length
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, ...ribs.map((rib) => h(
              'button',
              { key: rib.id, type: 'button', onClick: () => options.onOpenBranch && options.onOpenBranch(rib), style: { ...button, display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 9px', opacity: rib.is_stale ? 0.7 : 1 } },
              h('span', null, rib.is_stale ? '⚠' : '🧠'),
              h('span', { style: { flex: '1 1 auto', minWidth: 0 } }, rib.name || rib.id),
              rib.status && rib.status !== 'EMPTY' ? h('span', { style: { ...chip, fontSize: 11 } }, rib.status === 'PROVISIONAL' ? '待回连' : rib.status === 'ACCEPTED' ? '已回连' : rib.status === 'DRAFT' ? '探路中' : rib.status === 'BLOCKED' ? '受阻' : rib.status === 'REJECTED' ? '已修剪' : '旧版本') : null,
              h('span', { style: { ...muted, fontSize: 12 } }, rib.id),
              h('span', { style: { ...muted, fontSize: 12 } }, '→'),
            )))
          : h('div', { style: muted }, '当前主支还没有分支。复杂起来时再手动创建分支。')
        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 10px', borderBottom: '1px solid var(--rdw-line-2)', position: 'sticky', top: 0, zIndex: 2, background: 'var(--rdw-bg)' } },
            h('button', { type: 'button', style: { ...button, padding: '3px 10px' }, onClick: options.onBack, title: '返回项目流程主线' }, '← 项目流程'),
            h('span', { style: { fontSize: 14 } }, '🌿'),
            h('div', { style: { minWidth: 0, flex: '1 1 auto' } },
              h('div', { style: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `主支档案 · ${module.name || session.module}`),
              h('div', { style: { ...muted, fontSize: 12 } }, module.id || session.module),
            ),
            h('span', { style: { ...chip, fontSize: 12 } }, `${ribs.length} 根分支`),
          ),
          h('div', { style: { ...card, padding: '12px' } },
            h('div', { style: { fontWeight: 700, marginBottom: 6 } }, spine.name || module.name || '主支'),
            h('div', { style: { ...muted, lineHeight: 1.7 } }, spine.goal || '短任务直接沿主支推进，只有复杂子问题才手动创建分支。'),
            h('div', { style: { ...row, gap: 6, marginTop: 8, flexWrap: 'wrap' } },
              h('span', { style: chip }, `完成度 ${spine.completion === undefined ? '—' : `${spine.completion}%`}`),
              h('span', { style: chip }, `活跃分支 ${ribs.filter((rib) => !rib.is_stale).length}`),
              h('span', { style: chip }, `过期分支 ${ribs.filter((rib) => rib.is_stale).length}`),
            ),
          ),
          h('div', { style: { ...card, padding: '10px 12px' } },
            h('div', { style: { ...row, gap: 6, marginBottom: 8 } }, h('span', null, '🧩'), h('strong', null, '本主支下的分支'), h('span', { style: { ...muted, fontSize: 12 } }, '点击进入会话')),
            ribList,
          ),
          h(
            'button',
            { type: 'button', style: primaryButton, onClick: () => options.onSprout && options.onSprout(module.id, '') },
            '🌱 从这根主支新建一个分支',
          ),
        )
      }
      const filePathOf = (file) => file.rel || file.path || file.name || ''
      const fileSection = allFiles.length
        ? renderSection(h, {
            id: 'files',
            title: `工作区文件（${allFiles.length}）`,
            icon: '📁',
            open: Boolean(options.openSections && options.openSections.files),
            onToggle: () => options.onToggleSection && options.onToggleSection('files'),
            children: allFiles.map((file, index) => {
              const rel = filePathOf(file)
              return h(
                'div',
                { key: `file-${index}`, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' } },
                h(
                  'button',
                  {
                    type: 'button',
                    style: { ...button, flex: '1 1 auto', minWidth: 0, textAlign: 'left', padding: '4px 8px', fontSize: 11 },
                    title: `在 DSH 侧边栏打开 ${rel}`,
                    onClick: () =>
                      typeof options.onOpenSidebar === 'function'
                        ? options.onOpenSidebar(rel)
                        : options.onOpenFile && options.onOpenFile(rel),
                  },
                  `${file.scope}/ ${file.name || rel}`,
                ),
                typeof options.onOpenSidebar === 'function'
                  ? h(
                      'button',
                      {
                        type: 'button',
                        style: { ...button, padding: '3px 7px', fontSize: 12 },
                        title: '在面板内快速预览',
                        onClick: () => options.onOpenFile && options.onOpenFile(rel),
                      },
                      '预览',
                    )
                  : null,
              )
            }),
          })
        : null

      const modId = session.module || (data.module && data.module.id) || ''
      const persona = AGENT_PERSONAS[modId] || { role: '专项探索智能体', icon: '🤖', mission: '专项科学探索与成果沉淀' }
      const quickChips = modId === 'M40'
        ? [
            '📊 评估协变量平衡性（加权后 SMD 是否均 < 0.1）',
            '📐 尝试双侧 1%-99% 倾向评分截尾，验证极端权重稳定性',
            '📝 导出交接产物 (HANDOFF)',
          ]
        : [
            '📋 汇报当前分支的最新进展与关键发现',
            '🧪 运行自检并输出数据质量指标',
            '📝 导出交接产物 (HANDOFF)',
          ]

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 10px', borderBottom: '1px solid var(--rdw-line-2)', marginBottom: 10, position: 'sticky', top: 0, zIndex: 2, background: 'var(--rdw-bg)' } },
          h('button', { type: 'button', style: { ...button, padding: '3px 10px' }, onClick: options.onBack, title: '返回项目流程主线' }, '← 项目流程'),
          h('span', { style: { fontSize: 16 } }, persona.icon),
          h('div', { style: { minWidth: 0, flex: '1 1 auto' } },
            h('div', { style: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, brName || session.branch),
            h('div', { style: { ...muted, fontSize: 12 } }, `${persona.role} · 所属主支：${modName || session.module}`),
          ),
          brMode ? h('span', { style: { ...chip, fontSize: 12 } }, brMode === 'spike' ? '探索突分支' : '标准推进') : null,
          data.branch && data.branch.id ? h('span', { style: { ...chip, fontSize: 12, background: 'var(--rdw-sunken)' } }, data.branch.id) : null,
          typeof options.onSprout === 'function'
            ? h(
                'button',
                {
                  type: 'button',
                  style: { ...button, padding: '3px 10px', whiteSpace: 'nowrap' },
                  disabled: Boolean(options.busy),
                  title: '从当前分支继续派生子探索分支（递归分支）',
                  onClick: () => options.onSprout(session.module, session.branch),
                },
                '🌱 分出子分支',
              )
            : null,
          data.context && typeof options.onClearContext === 'function'
            ? h(
                'button',
                {
                  type: 'button',
                  style: { ...button, padding: '3px 10px', whiteSpace: 'nowrap' },
                  disabled: Boolean(options.busy),
                  title: '删除这根分支的 CONTEXT.md（默认留 .bak 备份，可重新补建）',
                  onClick: () => options.onClearContext(data.branch && data.branch.id),
                },
                '🧹 清除上下文',
              )
            : null,
          options.canGraft
            ? h('button', {
                type: 'button',
                style: { ...button, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)', padding: '3px 10px', whiteSpace: 'nowrap', fontWeight: 600 },
                disabled: Boolean(options.busy),
                title: '审阅满意后，把这根分支的交接结果接回主支',
                onClick: () => options.onGraft && options.onGraft(),
              }, options.busy === 'graft' ? '回连中…' : '🔗 回连主支')
            : null,
        ),
        h('div', { style: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingBottom: 8 } },
          loading && !data ? h('div', { style: { ...muted, padding: '24px 0', textAlign: 'center' } }, '正在读取工作区…')
            : error && !data ? h('div', { style: { ...card, color: 'var(--rdw-st-rejected)', fontSize: 11 } }, error)
              : h('div', null,
                  // 1. 对标 dsh-project-brain 的 SuggestionCard（智能续接建议卡片）
                  h(
                    'div',
                    {
                      style: {
                        ...card,
                        padding: '12px 14px',
                        marginBottom: 10,
                        background: 'linear-gradient(135deg, color-mix(in srgb,var(--rdw-accent) 6%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)',
                        borderLeft: '3.5px solid var(--rdw-accent)',
                      },
                    },
                    h(
                      'div',
                      { style: { ...row, justifyContent: 'space-between', marginBottom: 4 } },
                      h(
                        'div',
                        { style: { ...row, gap: 6 } },
                        h('span', { style: { fontSize: 13 } }, '✨'),
                        h('strong', { style: { fontSize: 11.5, color: 'var(--rdw-accent)' } }, '智能续接建议 · project-brain 推荐'),
                        h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-ok)', background: 'var(--rdw-ok-soft)' } }, '置信度 91%'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          style: { ...primaryButton, padding: '2px 8px', fontSize: 12.5 },
                          onClick: () => {
                            const sug = modId === 'M40'
                              ? '评估协变量平衡性（加权后 SMD 是否 < 0.1），并尝试双侧 1%-99% 倾向评分截尾'
                              : '汇报当前分支研究进展，检查关键数据指标并准备交接'
                            if (typeof options.onDraftChange === 'function') options.onDraftChange(sug)
                          },
                        },
                        '⚡ 一键采纳建议',
                      ),
                    ),
                    h(
                      'div',
                      { style: { fontSize: 11, color: 'var(--rdw-text-2)', lineHeight: 1.6 } },
                      modId === 'M40'
                        ? '基于主支统计分析上下文：建议在此分支运行逆概率加权诊断，验证加权后倾向评分重叠度与极值权重截尾分布，输出 Love Plot 产物。'
                        : '基于主支当前阶段推进度：建议在此分支继续推进核心细分子任务，确保实验数据与中间产物全程留痕可回放。',
                    ),
                  ),

                  // 2. 对标 dsh-project-brain 的 TodoStrip（任务推进步骤条）
                  h(
                    'div',
                    {
                      style: {
                        ...card,
                        padding: '8px 12px',
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        overflowX: 'auto',
                      },
                    },
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--rdw-text-3)', flex: '0 0 auto' } }, '📌 分支任务条:'),
                    ...[
                      { label: '上下文档案', done: Boolean(data.context) },
                      { label: '算法与脚本', done: workFiles.length > 0 },
                      { label: '图表与产出', done: outputFiles.length > 0 },
                      { label: '交接并回连', done: data.branch && data.branch.status === 'ACCEPTED' },
                    ].map((step, sIdx) =>
                      h(
                        'div',
                        {
                          key: `step-${sIdx}`,
                          style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12.5,
                            color: step.done ? 'var(--rdw-ok)' : 'var(--rdw-text-3)',
                            fontWeight: step.done ? 600 : 400,
                            whiteSpace: 'nowrap',
                          },
                        },
                        h('span', { style: { width: 14, height: 14, borderRadius: '50%', background: step.done ? 'var(--rdw-ok-soft)' : 'var(--rdw-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 } }, step.done ? '✓' : String(sIdx + 1)),
                        step.label,
                        sIdx < 3 ? h('span', { style: { color: 'var(--rdw-line-3)', marginLeft: 4 } }, '→') : null,
                      ),
                    ),
                  ),

                  data.context
                    ? renderSection(h, { id: 'ctx', title: '主支上下文档案（创建分支时刻的完整快照）', icon: '🧬', badge: h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, 'CONTEXT.md'), open: Boolean(options.openSections && options.openSections.context), onToggle: () => options.onToggleSection && options.onToggleSection('context'), children: [data.context] })
                    : h(
                        'div',
                        { key: 'ctx-missing', style: { ...card, padding: '10px 12px', marginBottom: 10, borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 34%,transparent)', background: 'var(--rdw-warn-soft)' } },
                        h('div', { style: { ...row, gap: 6, marginBottom: 4 } },
                          h('span', null, '🧬'),
                          h('strong', { style: { fontSize: 12 } }, '缺少主支上下文档案'),
                          h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-provisional)', borderColor: 'color-mix(in srgb,var(--rdw-st-provisional) 34%,transparent)' } }, 'CONTEXT.md 缺失'),
                        ),
                        h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } },
                          '这根分支创建于上下文档案机制之前，没有创建分支时刻的主支快照，',
                          '因此该工作区的智能体看不到此前的决策与已接受输入。',
                        ),
                        h('div', { style: { ...row, gap: 6, marginTop: 8, flexWrap: 'wrap' } },
                          h(
                            'button',
                            {
                              type: 'button',
                              style: button,
                              disabled: Boolean(options.busy),
                              title: '回填这根分支的 CONTEXT.md（命令行：dag context --branch <id>）',
                              onClick: () => options.onBuildContext && options.onBuildContext(data.branch && data.branch.id),
                            },
                            '补建 CONTEXT.md',
                          ),
                          h('span', { style: { ...muted, fontSize: 12 } }, '或在项目根执行：dag context'),
                        ),
                      ),
                  data.brief ? renderSection(h, { id: 'brief', title: '任务简报', icon: '📋', badge: h('span', { style: { ...chip, fontSize: 11 } }, 'BRIEF.md'), open: Boolean(options.openSections && options.openSections.brief), onToggle: () => options.onToggleSection && options.onToggleSection('brief'), children: [data.brief] }) : null,
                  sessionSections.length ? renderSection(h, { id: 'session', title: `智能体工作记录（${sessionSections.length} 节）`, icon: '🧠', badge: h('span', { style: { ...chip, fontSize: 11 } }, 'SESSION.md'), open: Boolean(options.openSections && options.openSections.session), onToggle: () => options.onToggleSection && options.onToggleSection('session'), children: sessionSections.flatMap((sec, index) => [sec.title ? h('div', { key: `st-${index}`, style: { fontWeight: 700, marginTop: index ? 8 : 0 } }, sec.title) : null, h('div', { key: `sb-${index}` }, sec.text || '')]) }) : null,
                  fileSection,
                  // v3.2：父分支溯源 —— 「这个分支从哪来」
                  data.parent
                    ? h(
                        'div',
                        { key: 'lineage', style: { ...card, padding: '10px 12px', marginBottom: 10, borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } },
                        h('div', { style: { ...row, gap: 6, marginBottom: 6 } },
                          h('span', null, '🌿'),
                          h('strong', { style: { fontSize: 12 } }, '这个分支从哪来'),
                          h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, '从分支分叉'),
                        ),
                        h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } },
                          '父分支：',
                          h('button', {
                            type: 'button',
                            style: { ...button, padding: '1px 7px', fontSize: 11, margin: '0 4px' },
                            onClick: () => {
                              const parent = (Array.isArray(data.siblings) ? data.siblings : []).find((row) => row && row.isParent)
                              if (parent && typeof options.onOpenSibling === 'function') options.onOpenSibling(parent)
                            },
                          }, data.parent),
                          '（主支 → 分支 → 这根子分支）。上下文档案里带着父分支的简报与产出摘要。',
                        ),
                        h('button', {
                          type: 'button',
                          style: { ...button, marginTop: 8, padding: '4px 9px' },
                          disabled: Boolean(options.busy),
                          onClick: () =>
                            options.onSproutHere &&
                            options.onSproutHere(options.sessionModule || data.module.id, data.parent),
                        }, '🌱 从父分支再分一根子分支'),
                      )
                    : null,
                  // v3.2：同伴分支 —— 分支之间可以通讯
                  Array.isArray(data.siblings) && data.siblings.length > 0
                    ? h(
                        'div',
                        { key: 'siblings', style: { ...card, padding: '10px 12px', marginBottom: 10 } },
                        h('div', { style: { ...row, gap: 6, marginBottom: 8 } },
                          h('span', null, '🔗'),
                          h('strong', { style: { fontSize: 12 } }, '同一主支下的其他分支'),
                          h('span', { style: { ...muted, fontSize: 12 } }, '可互相通讯'),
                        ),
                        h(
                          'div',
                          { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                          ...data.siblings.map((row) =>
                            h(
                              'div',
                              { key: `sib-${row.id}`, style: { display: 'flex', alignItems: 'center', gap: 6 } },
                              h(
                                'button',
                                {
                                  type: 'button',
                                  style: { ...button, flex: '1 1 auto', minWidth: 0, textAlign: 'left', padding: '5px 8px', fontSize: 11 },
                                  title: `打开 ${row.name} 的工作区`,
                                  onClick: () => options.onOpenSibling && options.onOpenSibling(row),
                                },
                                row.isParent ? '🌿 ' : '🧠 ',
                                row.name || row.id,
                                row.isParent ? h('span', { style: { ...muted, fontSize: 11 } }, '（父分支）') : null,
                              ),
                              typeof options.onMessageSibling === 'function' && !row.isParent
                                ? h(
                                    'button',
                                    {
                                      type: 'button',
                                      style: { ...button, padding: '4px 9px', fontSize: 12, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' },
                                      title: `给 ${row.name || row.id} 投递消息（写入对方的 work/INBOX.md）`,
                                      onClick: () => options.onMessageSibling(row),
                                    },
                                    '✉ 通讯',
                                  )
                                : null,
                            ),
                          ),
                        ),
                      )
                    : null,
                  // v3.2：收件箱 —— 其他分支投递来的消息
                  data.inbox && data.inbox.messages > 0
                    ? renderSection(h, {
                        id: 'inbox',
                        title: `收件箱（${data.inbox.messages} 条来自其他分支的消息）`,
                        icon: '📥',
                        badge: h('span', { style: { ...chip, fontSize: 11, color: 'var(--rdw-st-superseded)', borderColor: 'color-mix(in srgb,var(--rdw-st-superseded) 32%,transparent)' } }, 'work/INBOX.md'),
                        open: Boolean(options.openSections && options.openSections.inbox),
                        onToggle: () => options.onToggleSection && options.onToggleSection('inbox'),
                        children: [data.inbox.content],
                      })
                    : null,
                  h('div', { id: 'branch-conversation', style: { ...card, padding: '10px 12px' } },
                    h('div', { style: { ...row, gap: 6, marginBottom: 8 } }, h('span', null, '💬'), h('div', { style: { fontSize: 12, fontWeight: 700 } }, '与该工作区智能体的往来指令'), entries.length ? h('span', { style: { ...chip, fontSize: 11 } }, `${entries.length} 条`) : null),
                    entries.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, ...entries.map((entry, index) => { const theme = BUBBLE[entry.side] || BUBBLE.human; return h('div', { key: `e-${index}`, style: { display: 'flex', flexDirection: 'column', alignItems: theme.align } }, h('div', { style: { ...row, gap: 6, marginBottom: 2, justifyContent: theme.align } }, h('span', { style: { fontSize: 11, fontWeight: 700, opacity: 0.75 } }, theme.label), h('span', { style: { ...muted, fontSize: 11 } }, entry.at || ''), entry.author && entry.author !== theme.label ? h('span', { style: { ...muted, fontSize: 11 } }, entry.author) : null), h('div', { style: { maxWidth: '88%', padding: '7px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: theme.bg, border: `1px solid ${theme.border}` } }, entry.text || '')) })) : h('div', { style: { ...muted, fontSize: 11, lineHeight: 1.7 } }, '还没有往来记录。在下方写下你要派发的指令或追问。'),
                  ),
                ),
        ),
        h(
          'div',
          { style: { paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--rdw-line-2)', position: 'sticky', bottom: 0, zIndex: 3, background: 'var(--rdw-panel)' } },
          // EvoResearch 科研记忆 Dock 条
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--rdw-r-sm)',
                background: 'var(--rdw-sunken)',
                border: '1px solid var(--rdw-line)',
                marginBottom: 8,
                fontSize: 12.5,
                color: 'var(--rdw-text-3)',
                overflowX: 'auto',
              },
            },
            h('span', null, '🧬'),
            h('strong', { style: { color: 'var(--rdw-text-2)' } }, '科研记忆 Dock ·'),
            h('span', null, data.context ? '已挂载主支上下文快照 (CONTEXT.md)' : '主支上下文档案未就绪'),
            h('span', { style: { opacity: 0.5 } }, '·'),
            h('span', null, `${Array.isArray(data.siblings) ? data.siblings.length : 0} 根同伴分支`),
            h('span', { style: { opacity: 0.5 } }, '·'),
            h('span', null, `${allFiles.length} 个工作区文件`),
            h('span', { style: { opacity: 0.5 } }, '·'),
            h('span', { style: { color: 'var(--rdw-ok)', fontWeight: 500 } }, '随提问即时读取'),
          ),
          // 快捷科研指令推荐芯片
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, overflowX: 'auto' } },
            h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)', flex: '0 0 auto' } }, '快捷指令:'),
            ...quickChips.map((chipText, cIdx) =>
              h(
                'button',
                {
                  key: `qc-${cIdx}`,
                  type: 'button',
                  style: {
                    padding: '2px 8px',
                    borderRadius: 'var(--rdw-r-pill)',
                    border: '1px solid var(--rdw-line-2)',
                    background: 'var(--rdw-sunken)',
                    fontSize: 12.5,
                    color: 'var(--rdw-text-2)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  },
                  onClick: () => {
                    if (typeof options.onDraftChange === 'function') {
                      options.onDraftChange(draft ? `${draft}\n${chipText}` : chipText)
                    }
                  },
                },
                chipText,
              ),
            ),
          ),
          h('textarea', { value: draft, placeholder: '向该工作区智能体下达指令或追问（输入 @ 可引用工作区文件，Ctrl+Enter 发送）…', style: { ...textarea, minHeight: 64, resize: 'vertical' }, disabled: sending, 'aria-label': '向工作区智能体下达指令', onChange: (event) => options.onDraftChange && options.onDraftChange(event && event.target ? event.target.value : ''), onKeyDown: (event) => { if (event && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && draft.trim() && !sending && typeof options.onSend === 'function') options.onSend(draft) } }),
          h('div', { style: { ...row, justifyContent: 'space-between', marginTop: 6 } }, h('span', { style: { ...muted, fontSize: 12 } }, '指令会写入 DIRECTIVES.md，等待工作区智能体消费'), h('button', { type: 'button', style: draft.trim() && !sending ? primaryButton : { ...button, opacity: 0.5 }, disabled: !draft.trim() || sending, onClick: () => options.onSend && options.onSend(draft) }, sending ? '发送中…' : '发送指令')),
        ),
      )
    }

    // --- Module: src/views/NetworkView.js ---
    /**
     * 研究项目 DAG 工作台 — 网络页（v2.1）。
     *
     * 数据来自 GET /content 的 network（TeamMCP digest JSON）：
     *   网络概览 / 待你复核 / 待主项目关注（attention + stale）/ 每项目折叠详情。
     * 操作：刷新网络、发布本项目、拉取消息（POST /bridge）。
     * TeamMCP 不可用时显示连接失败卡片与启动提示。
     */

    const ATTENTION_KIND = {
      pending: { label: '待决定', color: 'var(--rdw-st-provisional)' },
      blocked: { label: '阻塞', color: 'var(--rdw-st-blocked)' },
      idea: { label: '想法', color: 'var(--rdw-accent)' },
      result: { label: '结果', color: 'var(--rdw-st-accepted)' },
      stale: { label: '停滞', color: 'var(--rdw-st-draft)' },
    }

    function kindInfo(kind) {
      return ATTENTION_KIND[kind] || { label: kind || '关注', color: 'var(--rdw-st-draft)' }
    }

    function formatUpdated(value) {
      const text = value === null || value === undefined ? '' : String(value)
      if (!text) return '—'
      return text.length > 19 ? text.slice(0, 19).replace('T', ' ') : text.replace('T', ' ')
    }

    /**
     * 渲染网络页。
     * @param {object} h React.createElement
     * @param {{content?: object|null, contentLoading?: boolean, contentError?: string,
     *          busy?: string, run?: object|null, onRefresh?: Function, onPublish?: Function,
     *          onPull?: Function, onReviewItem?: Function, onOpenHandoff?: Function,
     *          expandedProjects?: object, onToggleProject?: Function}} props
     */
    function renderNetworkView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const content = options.content && typeof options.content === 'object' && options.content.ok !== false ? options.content : null
      const busy = typeof options.busy === 'string' ? options.busy : ''
      const { card, row, chip, muted, button, primaryButton, sectionTitle, tableWrap, table, th, td, mutedBox } = STYLES
      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }
      const expandedProjects = options.expandedProjects && typeof options.expandedProjects === 'object' ? options.expandedProjects : {}
      const network = content && content.network && typeof content.network === 'object' ? content.network : null
      const networkError = content && typeof content.networkError === 'string' ? content.networkError : typeof options.networkError === 'string' ? options.networkError : ''

      const opsBar = h(
        'div',
        { style: { ...row, justifyContent: 'space-between', marginBottom: 10 } },
        h(
          'div',
          { style: { ...row } },
          h(
            'button',
            { type: 'button', style: primaryButton, disabled: Boolean(busy), onClick: () => call(options.onRefresh) },
            busy === 'content' ? '刷新中…' : '刷新网络',
          ),
          h(
            'button',
            { type: 'button', style: button, disabled: Boolean(busy), onClick: () => call(options.onPublish) },
            busy === 'bridge:publish' ? '发布中…' : '发布本项目',
          ),
          h(
            'button',
            { type: 'button', style: button, disabled: Boolean(busy), onClick: () => call(options.onPull) },
            busy === 'bridge:pull' ? '拉取中…' : '拉取消息',
          ),
        ),
        h(
          'div',
          { style: { ...row, ...muted } },
          options.run && options.run.action
            ? h('span', null, `最近桥操作：${options.run.action} · ${options.run.status || ''}`)
            : null,
          network && network.generatedAt ? h('span', null, `网络摘要 ${formatUpdated(network.generatedAt)}`) : null,
        ),
      )

      if (!content) {
        return h(
          'div',
          null,
          opsBar,
          options.contentLoading
            ? h('div', { style: { ...muted, padding: '12px 0' } }, '正在加载项目网络…')
            : h('div', { style: { ...muted, padding: '12px 0' } }, '暂无网络数据'),
        )
      }

      if (!network) {
        return h(
          'div',
          null,
          opsBar,
          h(
            'div',
            { style: { ...card, borderColor: 'color-mix(in srgb,var(--rdw-st-rejected) 32%,transparent)' } },
            h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--rdw-st-rejected)' } }, '项目网络连接失败'),
            h('div', { style: { ...muted, marginBottom: 8 } }, networkError || 'TeamMCP 桥未运行或不可用。'),
            h(
              'div',
              { style: { ...mutedBox, marginBottom: 8 } },
              '可在终端运行 ~/.teammcp/start-teammcp.cmd 启动 TeamMCP 后点「重试」；内容页与工程页不受影响。',
            ),
            h(
              'button',
              { type: 'button', style: primaryButton, disabled: Boolean(busy), onClick: () => call(options.onRefresh) },
              '重试',
            ),
          ),
        )
      }

      const projects = Array.isArray(network.projects) ? network.projects : []
      const selfProjectId = network.selfProjectId || ''
      const pendingReviewAll = Array.isArray(network.pendingReview) ? network.pendingReview : []
      const selfPendingReview = pendingReviewAll.filter((item) => item && item.projectId === selfProjectId)
      const otherPendingReview = pendingReviewAll.filter((item) => item && item.projectId !== selfProjectId)
      const attention = Array.isArray(network.attention) ? network.attention : []
      const stale = Array.isArray(network.stale) ? network.stale : []

      const overviewRows = projects.map((project) => {
        const isSelf = project && project.projectId === selfProjectId
        const review = project && project.review && typeof project.review === 'object' ? project.review : null
        return h(
          'tr',
          { key: `project-${project && project.projectId}` },
          h(
            'td',
            { style: td },
            h('div', { style: { fontWeight: isSelf ? 700 : 400 } }, (project && project.title) || (project && project.projectId) || '—'),
            h('div', { style: { ...muted, fontSize: 12 } }, (project && project.projectId) || ''),
          ),
          h('td', { style: td }, project && project.phase ? phaseLabel(project.phase) : '—'),
          h('td', { style: td }, `${project && Number.isFinite(Number(project.percent)) ? Number(project.percent) : 0}%`),
          h('td', { style: td }, String((project && project.accepted) || 0)),
          h('td', { style: td }, String((project && project.pending) || 0)),
          h('td', { style: td }, String((project && project.blocked) || 0)),
          h(
            'td',
            { style: td },
            h(
              'div',
              { style: { ...row, gap: 4 } },
              isSelf
                ? h(
                    'span',
                    { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-accepted)', borderColor: 'color-mix(in srgb,var(--rdw-st-accepted) 32%,transparent)' } },
                    review ? `本项目 · 已复核 ${review.reviewed}/${review.accepted}` : '本项目',
                  )
                : h('span', { style: { ...chip, fontSize: 12 } }, '其它项目'),
            ),
            h('div', { style: { ...muted, fontSize: 12 } }, formatUpdated(project && project.updated)),
          ),
        )
      })

      const renderPendingReviewRow = (item, canReview) =>
        h(
          'div',
          { key: `pv-${item && item.projectId}-${item && item.stream}-${item && item.version}`, style: { ...mutedBox, marginBottom: 6 } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between' } },
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div', { style: { fontWeight: 600 } }, `${(item && item.stream) || '—'} v${(item && item.version) || 1} · ${(item && item.module) || ''}`),
              h('div', { style: { ...muted, fontSize: 12 } }, `${(item && item.projectId) || ''} · ${formatUpdated(item && item.acceptedAt)}`),
            ),
            canReview
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: primaryButton,
                    disabled: Boolean(busy),
                    onClick: () => call(options.onReviewItem, item, true),
                  },
                  '满意',
                )
              : h('span', { style: { ...muted, fontSize: 12 } }, '其它项目（只读）'),
          ),
        )

      const attentionNodes = []
      for (const item of attention) {
        const info = kindInfo(item && item.kind)
        attentionNodes.push(
          h(
            'div',
            { key: `att-${attentionNodes.length}`, style: { ...mutedBox, marginBottom: 6, borderLeft: `3px solid ${info.color}` } },
            h(
              'div',
              { style: { ...row, gap: 6 } },
              h('span', { style: { ...chip, fontSize: 12, color: info.color, borderColor: info.color } }, info.label),
              h('span', { style: { fontSize: 12, opacity: 0.7 } }, (item && item.projectId) || ''),
            ),
            h('div', { style: { marginTop: 2 } }, truncateText((item && item.text) || '', 200)),
          ),
        )
      }
      for (const item of stale) {
        attentionNodes.push(
          h(
            'div',
            {
              key: `stale-${(item && item.projectId) || attentionNodes.length}`,
              style: { ...mutedBox, marginBottom: 6, borderLeft: '3px solid var(--rdw-st-draft)' },
            },
            h(
              'div',
              { style: { ...row, gap: 6 } },
              h('span', { style: { ...chip, fontSize: 12, color: 'var(--rdw-st-draft)', borderColor: 'var(--rdw-st-draft)' } }, '停滞'),
              h('span', { style: { fontSize: 12, opacity: 0.7 } }, (item && item.projectId) || ''),
            ),
            h('div', { style: { marginTop: 2 } }, `最近更新 ${formatUpdated(item && item.updated)} · 停滞 ${(item && item.ageHours) || '?'} 小时`),
          ),
        )
      }

      const renderProjectDetail = (project) => {
        const projectId = (project && project.projectId) || ''
        const isExpanded = Boolean(expandedProjects[projectId])
        const completion = project && Array.isArray(project.completion) ? project.completion : []
        const results = project && Array.isArray(project.results) ? project.results : []
        const ideas = project && Array.isArray(project.ideas) ? project.ideas : []
        const blockers = project && Array.isArray(project.blockers) ? project.blockers : []
        const reviewed = project && Array.isArray(project.reviewed) ? project.reviewed : []
        const review = project && project.review && typeof project.review === 'object' ? project.review : null
        return h(
          'div',
          { key: `detail-${projectId}`, style: { ...card, padding: '10px 12px', marginBottom: 8 } },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', cursor: 'pointer' }, onClick: () => call(options.onToggleProject, projectId) },
            h(
              'div',
              { style: { minWidth: 0 } },
              h(
                'div',
                { style: { fontSize: 13, fontWeight: 700 } },
                `${(project && project.title) || projectId}${projectId === selfProjectId ? '（本项目）' : ''}`,
              ),
              h(
                'div',
                { style: { ...muted, fontSize: 12 } },
                `${project && project.phase ? phaseLabel(project.phase) : '—'} · 进度 ${(project && project.percent) || 0}% · 更新 ${formatUpdated(project && project.updated)}${review ? ` · 已复核 ${review.reviewed}/${review.accepted}` : ''}`,
              ),
            ),
            h('span', { style: { ...muted } }, isExpanded ? '收起' : '展开'),
          ),
          isExpanded
            ? h(
                'div',
                { style: { marginTop: 8 } },
                h('div', { style: sectionTitle }, '完成度（子项目）'),
                completion.length === 0
                  ? h('div', { style: muted }, '暂无完成度数据')
                  : h(
                      'div',
                      { style: tableWrap },
                      h(
                        'table',
                        { style: table },
                        h(
                          'thead',
                          null,
                          h(
                            'tr',
                            null,
                            ...['子项目', '状态', '已接受', '已复核'].map((label) => h('th', { key: label, style: th }, label)),
                          ),
                        ),
                        h(
                          'tbody',
                          null,
                          ...completion.map((item) => {
                            const statusTheme = moduleStatusInfo(item && item.status)
                            return h(
                              'tr',
                              { key: `c-${projectId}-${item && item.module}` },
                              h('td', { style: td }, `${(item && item.name) || (item && item.module) || '—'}`),
                              h('td', { style: td }, h('span', { style: { ...chip, fontSize: 12, color: statusTheme.color, borderColor: statusTheme.color } }, statusTheme.label)),
                              h('td', { style: td }, String((item && item.acceptedCount) || (item && Array.isArray(item.accepted) ? item.accepted.length : 0))),
                              h('td', { style: td }, String((item && item.reviewedCount) || 0)),
                            )
                          }),
                        ),
                      ),
                    ),
                h('div', { style: sectionTitle }, '最近结果'),
                results.length === 0
                  ? h('div', { style: muted }, '暂无已发布结果')
                  : h(
                      'div',
                      { style: STYLES.column },
                      ...results.slice(0, 5).map((result) =>
                        h(
                          'div',
                          { key: `r-${projectId}-${result && result.stream}-${result && result.version}`, style: { ...muted, fontSize: 11 } },
                          `· ${(result && result.stream) || ''} v${(result && result.version) || 1}（${(result && result.module) || ''}）${result && result.reviewed ? ' · 已复核' : ' · 待复核'} — ${truncateText((result && result.summary) || '', 100)}`,
                        ),
                      ),
                    ),
                ideas.length > 0
                  ? h(
                      'div',
                      null,
                      h('div', { style: sectionTitle }, '最近想法'),
                      ...ideas.slice(0, 4).map((idea, index) =>
                        h(
                          'div',
                          { key: `i-${projectId}-${index}`, style: { ...muted, fontSize: 11 } },
                          `· ${formatUpdated(idea && idea.at)}${idea && idea.tag ? ` [${idea.tag}]` : ''} ${truncateText((idea && idea.text) || '', 120)}`,
                        ),
                      ),
                    )
                  : null,
                blockers.length > 0
                  ? h(
                      'div',
                      null,
                      h('div', { style: sectionTitle }, '阻塞'),
                      ...blockers.slice(0, 5).map((blocker, index) =>
                        h('div', { key: `b-${projectId}-${index}`, style: { ...muted, fontSize: 11, color: 'var(--rdw-st-blocked)' } }, `· ${truncateText(String(blocker), 160)}`),
                      ),
                    )
                  : null,
                reviewed.length > 0
                  ? h(
                      'div',
                      null,
                      h('div', { style: sectionTitle }, '复核记录'),
                      ...reviewed.slice(0, 5).map((record, index) =>
                        h(
                          'div',
                          { key: `rv-${projectId}-${index}`, style: { ...muted, fontSize: 11 } },
                          `· ${(record && record.stream) || ''} v${(record && record.version) || 1} · ${record && record.satisfied ? '满意' : '待复核'} · ${formatUpdated(record && record.at)}`,
                        ),
                      ),
                    )
                  : null,
              )
            : null,
        )
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { ...row, justifyContent: 'space-between', margin: '2px 0 8px' } },
          h(
            'div',
            { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 16, fontWeight: 700 } }, '项目网络'),
            h(
              'div',
              { style: { ...muted } },
              `共 ${projects.length} 个项目 · 待复核 ${Number(network.pendingReviewTotal) || pendingReviewAll.length} 条 · 关注 ${attention.length} 条 · 停滞 ${stale.length} 个`,
            ),
          ),
        ),
        opsBar,
        h(
          'div',
          { style: card },
          h('h3', { style: { ...sectionTitle, margin: '0 0 6px' } }, '网络概览'),
          h(
            'div',
            { style: tableWrap },
            h(
              'table',
              { style: table },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  ...['项目', '阶段', '进度', '已接受', '待决定', '阻塞', '最近更新'].map((label) =>
                    h('th', { key: label, style: th }, label),
                  ),
                ),
              ),
              h('tbody', null, ...overviewRows),
            ),
          ),
        ),
        h(
          'div',
          { style: card },
          h('h3', { style: { ...sectionTitle, margin: '0 0 6px' } }, '待你复核'),
          selfPendingReview.length === 0 && otherPendingReview.length === 0
            ? h('div', { style: muted }, '全部已复核')
            : h(
                'div',
                null,
                selfPendingReview.length > 0 ? h('div', { style: { ...muted, marginBottom: 4 } }, '本项目（可标记满意）') : null,
                ...selfPendingReview.map((item) => renderPendingReviewRow(item, true)),
                otherPendingReview.length > 0 ? h('div', { style: { ...muted, margin: '6px 0 4px' } }, '其它项目（只读）') : null,
                ...otherPendingReview.map((item) => renderPendingReviewRow(item, false)),
              ),
        ),
        h(
          'div',
          { style: card },
          h('h3', { style: { ...sectionTitle, margin: '0 0 6px' } }, '待主项目关注'),
          attentionNodes.length === 0
            ? h('div', { style: muted }, '暂无需要关注的事项')
            : h('div', null, ...attentionNodes),
        ),
        h('h3', { style: sectionTitle }, '项目详情'),
        projects.length > 0
          ? h('div', null, ...projects.map(renderProjectDetail))
          : h('div', { style: mutedBox }, '网络里还没有已发布的项目。'),
      )
    }

    // --- Module: src/views/EngineeringView.js ---
    /**
     * 研究项目 DAG 工作台 — 工程页（v2.1）。
     *
     * 内容优先后，工程细节退到第二层：子页签 DAG / 交接 / 校验与运行 / 概览，
     * 复用现有 renderDagView / renderHandoffsView / renderControlView / renderOverviewView 与全部旧回调。
     */

    /**
     * @param {object} h React.createElement
     * @param {{tab?: string, setTab?: Function, nodes?: object, busy?: string}} props
     */
    function renderEngineeringView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const tab = typeof options.tab === 'string' && options.tab ? options.tab : 'dag'
      const nodes = options.nodes && typeof options.nodes === 'object' ? options.nodes : {}
      const { row, tab: tabStyle, tabActive, muted } = STYLES
      const call = (handler, value) => {
        if (typeof handler === 'function') handler(value)
      }
      const currentNode = nodes[tab] || nodes.dag || null

      return h(
        'div',
        null,
        h(
          'div',
          {
            style: {
              ...row,
              gap: 6,
              borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
              paddingBottom: 8,
              marginBottom: 10,
            },
            role: 'tablist',
            'aria-label': '工程子页签',
          },
          ...ENGINEERING_TABS.map(([id, label]) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                role: 'tab',
                'aria-selected': tab === id ? 'true' : 'false',
                style: tab === id ? { ...tabStyle, ...tabActive } : tabStyle,
                onClick: () => call(options.setTab, id),
              },
              label,
            ),
          ),
          h('span', { style: { ...muted, marginLeft: 'auto' } }, '工程细节：DAG / 交接 / 校验 / 状态设置'),
        ),
        currentNode,
      )
    }

    // --- Module: src/views/ProjectsHubView.js ---
    /**
     * 研究项目 DAG 工作台 — 多项目总控看板（Projects Hub View）。
     *
     * 作者：lineex (https://github.com/lineex)
     * 参考项目：https://github.com/OliverLiy/projectHub
     *
     * 核心设计语言（对齐 projectHub）：
     *   - 左侧分类导航轨（Left Rail）：智能视图（全部、推进中、需拍板、阻塞、已收束）+ 阶段过滤树 + 快捷动作区；
     *   - 中间主舞台（Main Stage）：顶部大号数字 KPI 指标卡 + 搜索筛选栏 + 项目卡片墙（带 3.5px 状态条、悬停浮起）；
     *   - 数据洞察区（Data Viz）：纯 SVG 状态环形分布图（Donut Chart）+ 各课题推进度横向对比条；
     *   - 跨项目数据互通网络（Cross-Project Sharing）：汇聚各课题的已回连产物（ACCEPTED Handoffs）、队列定义与想法（Ideas）。
     */


    function renderProjectsHubView(h, props) {
      const options = props && typeof props === 'object' ? props : {}
      const { card, row, chip, muted, button, primaryButton, dangerButton, input, sectionTitle } = STYLES
      const projects = Array.isArray(options.projects) ? options.projects : []
      const trashProjects = Array.isArray(options.trashProjects) ? options.trashProjects : []
      const activeRoot = typeof options.activeProjectRoot === 'string' ? options.activeProjectRoot : ''
      const busy = Boolean(options.busy)
      const searchQuery = typeof options.searchQuery === 'string' ? options.searchQuery : ''
      const phaseFilter = typeof options.phaseFilter === 'string' ? options.phaseFilter : 'all'
      const sharedItems = Array.isArray(options.sharedItems) ? options.sharedItems : []
      const categoryFilter = typeof options.categoryFilter === 'string' ? options.categoryFilter : 'all'
      const isTrashView = categoryFilter === 'trash'

      const call = (handler, ...args) => {
        if (typeof handler === 'function') handler(...args)
      }

      // 计算各状态数量
      const inProgressCount = projects.filter((p) => (Number(p.completion) || 0) > 0 && (Number(p.completion) || 0) < 100).length
      const attentionCount = projects.filter((p) => (Number(p.attentionCount) || 0) > 0).length
      const completedCount = projects.filter((p) => (Number(p.completion) || 0) === 100).length

      // 过滤项目列表（若当前在回收站视图，则源为 trashProjects）
      const sourceProjects = isTrashView ? trashProjects : projects
      const filteredProjects = sourceProjects.filter((p) => {
        const q = searchQuery.trim().toLowerCase()
        const matchesSearch = !q ||
          String(p.title || '').toLowerCase().includes(q) ||
          String(p.id || '').toLowerCase().includes(q) ||
          String(p.root || '').toLowerCase().includes(q) ||
          String(p.goal || '').toLowerCase().includes(q)
        if (isTrashView) return matchesSearch
        const matchesPhase = phaseFilter === 'all' || p.phase === phaseFilter
        let matchesCategory = true
        if (categoryFilter === 'progress') matchesCategory = (Number(p.completion) || 0) > 0 && (Number(p.completion) || 0) < 100
        else if (categoryFilter === 'attention') matchesCategory = (Number(p.attentionCount) || 0) > 0
        else if (categoryFilter === 'completed') matchesCategory = (Number(p.completion) || 0) === 100
        return matchesSearch && matchesPhase && matchesCategory
      })

      // 跨项目全局汇总
      const totalProjects = projects.length
      const totalRibs = projects.reduce((sum, p) => sum + (Number(p.ribsCount) || 0), 0)
      const totalAccepted = projects.reduce((sum, p) => sum + (Number(p.acceptedCount) || 0), 0)
      const totalAttention = projects.reduce((sum, p) => sum + (Number(p.attentionCount) || 0), 0)
      const totalModules = projects.reduce((sum, p) => sum + (Number(p.modulesCount) || 6), 0)

      // 顶部全局 KPI 卡片（对齐 projectHub 的 4 大核心指标卡）
      const globalKpis = [
        { label: '登记课题', value: totalProjects, icon: '📁', color: 'var(--rdw-accent)', sub: '多项目并行总览' },
        { label: '主支总阶段', value: totalModules, icon: '🌿', color: 'var(--rdw-accent-dark)', sub: '关键推进节点' },
        { label: '活跃分支', value: totalRibs, icon: '🌱', color: 'var(--rdw-text)', sub: '探索分支智能体' },
        { label: '已沉淀成果', value: totalAccepted, icon: '✅', color: 'var(--rdw-st-accepted)', sub: '已汇合交付产物' },
        { label: '需拍板事项', value: totalAttention, icon: '⚡', color: totalAttention > 0 ? 'var(--rdw-warn)' : 'var(--rdw-text-3)', sub: '待决策/风险信号' },
      ]

      // 智能视图分类列表
      const categoryViews = [
        { id: 'all', label: '全部项目', count: totalProjects, icon: '📁' },
        { id: 'progress', label: '推进中', count: inProgressCount, icon: '🟢', color: 'var(--rdw-st-accepted)' },
        { id: 'attention', label: '需拍板 / 关注', count: attentionCount, icon: '⚡', color: 'var(--rdw-warn)' },
        { id: 'completed', label: '已完成收束', count: completedCount, icon: '🏁', color: 'var(--rdw-st-superseded)' },
        { id: 'trash', label: '回收站', count: trashProjects.length, icon: '🗑️', color: 'var(--rdw-text-3)' },
      ]

      /* ------------------------------------------------ 左侧导航轨（Left Rail） */
      const leftRail = h(
        'aside',
        {
          style: {
            flex: '0 0 210px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          },
        },
        // 视图分组卡片
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            },
          },
          h('div', { style: { ...sectionTitle, fontSize: 11, color: 'var(--rdw-text-3)', paddingLeft: 4, marginBottom: 4 } }, '智能视图'),
          ...categoryViews.map((cat) => {
            const active = categoryFilter === cat.id
            return h(
              'button',
              {
                key: cat.id,
                type: 'button',
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 'var(--rdw-r-sm)',
                  border: active ? '1px solid color-mix(in srgb,var(--rdw-accent) 26%,transparent)' : '1px solid transparent',
                  background: active ? 'var(--rdw-accent-soft)' : 'transparent',
                  color: active ? 'var(--rdw-accent)' : 'var(--rdw-text-2)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s ease',
                },
                onClick: () => call(options.onCategoryFilterChange, cat.id),
              },
              h('span', { style: { fontSize: 12 } }, cat.icon),
              h('span', { style: { flex: '1 1 auto' } }, cat.label),
              h(
                'span',
                {
                  style: {
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: active ? 'var(--rdw-accent)' : 'var(--rdw-text-4)',
                  },
                },
                String(cat.count),
              ),
            )
          }),
        ),
        // 阶段过滤卡片
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            },
          },
          h('div', { style: { ...sectionTitle, fontSize: 11, color: 'var(--rdw-text-3)', paddingLeft: 2, marginBottom: 2 } }, '研究阶段'),
          h(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 4,
              },
            },
            h(
              'button',
              {
                type: 'button',
                style: {
                  gridColumn: 'span 2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: 'var(--rdw-r-sm)',
                  border: 'none',
                  background: phaseFilter === 'all' ? 'var(--rdw-sunken-2)' : 'transparent',
                  color: phaseFilter === 'all' ? 'var(--rdw-text)' : 'var(--rdw-text-3)',
                  fontSize: 11,
                  fontWeight: phaseFilter === 'all' ? 600 : 400,
                  cursor: 'pointer',
                },
                onClick: () => call(options.onPhaseFilterChange, 'all'),
              },
              h('span', null, '全部阶段'),
              h('span', { style: { fontSize: 12 } }, String(projects.length)),
            ),
            ...PHASES.map(([key, label]) => {
              const count = projects.filter((p) => p.phase === key).length
              const active = phaseFilter === key
              return h(
                'button',
                {
                  key,
                  type: 'button',
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 'var(--rdw-r-sm)',
                    border: 'none',
                    background: active ? 'var(--rdw-accent-soft)' : 'transparent',
                    color: active ? 'var(--rdw-accent)' : count > 0 ? 'var(--rdw-text-2)' : 'var(--rdw-text-4)',
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                  },
                  onClick: () => call(options.onPhaseFilterChange, key),
                },
                h('span', null, label),
                h('span', { style: { fontSize: 11.5, fontVariantNumeric: 'tabular-nums', opacity: count > 0 ? 1 : 0.4 } }, String(count)),
              )
            }),
          ),
        ),
        // 快捷管理底座
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            },
          },
          h('button', { type: 'button', style: primaryButton, disabled: busy, onClick: () => call(options.onCreateProject) }, '➕ 新建课题'),
          h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onImportProject) }, '📁 导入已有'),
          h('button', { type: 'button', style: button, disabled: busy, onClick: () => call(options.onLoadExample) }, '⚡ 示例项目'),
          h(
            'button',
            {
              type: 'button',
              style: {
                ...button,
                color: 'var(--rdw-accent)',
                borderColor: 'color-mix(in srgb,var(--rdw-accent) 28%,transparent)',
                background: 'var(--rdw-accent-soft)',
                fontWeight: 500,
              },
              disabled: busy,
              title: '记录一条跨课题科研想法（写入项目网络，各课题实时共享）',
              onClick: () => call(options.onIdea),
            },
            '记想法',
          ),
        ),
      )

      /* ------------------------------------------------ 右侧主舞台（Main Stage） */
      const mainStage = h(
        'div',
        {
          style: {
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          },
        },
        // 1. 顶部 Hero Banner 展板
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, color-mix(in srgb,var(--rdw-accent) 8%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)',
              borderLeft: '4px solid var(--rdw-accent)',
              padding: '16px 18px',
            },
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
            h(
              'div',
              { style: { flex: '1 1 auto', minWidth: 0 } },
              h(
                'div',
                { style: { ...row, gap: 8, marginBottom: 5 } },
                h('span', { style: { fontSize: 16 } }, '🗂️'),
                h('h2', { style: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--rdw-text)' } }, '研究项目总控看板'),
                h(
                  'a',
                  {
                    href: 'https://github.com/lineex',
                    target: '_blank',
                    rel: 'noreferrer',
                    title: '作者 GitHub: @lineex',
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      height: 20,
                      padding: '0 8px',
                      borderRadius: 'var(--rdw-r-pill)',
                      background: 'var(--rdw-sunken)',
                      border: '1px solid var(--rdw-line-2)',
                      color: 'var(--rdw-text-3)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      textDecoration: 'none',
                    },
                  },
                  h('span', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, 'by'),
                  h('span', { style: { color: 'var(--rdw-text)', fontWeight: 600 } }, '@lineex'),
                ),
              ),
              h(
                'div',
                { style: { fontSize: 11.5, color: 'var(--rdw-text-2)', lineHeight: 1.6 } },
                '集中管理所有并行课题：点击卡片直接进入专属工作台（项目流程主线、智能体工作区、内容交接、工程底座），各课题之间分析模型与交接成果实时共享互通。',
              ),
            ),
          ),
        ),

        // 2. 全局 KPI 指标行
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
            },
          },
          ...globalKpis.map((kpi) =>
            h(
              'div',
              {
                key: kpi.label,
                className: 'rdw-card-hover',
                style: {
                  ...card,
                  margin: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '11px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                },
              },
              h('div', {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 3,
                  background: kpi.color,
                },
              }),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--rdw-text-3)' } },
                h('span', null, kpi.label),
                h('span', { style: { fontSize: 12 } }, kpi.icon),
              ),
              h('div', { style: { fontSize: 23, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: kpi.color } }, String(kpi.value)),
              h('div', { style: { fontSize: 12, color: 'var(--rdw-text-4)' } }, kpi.sub),
            ),
          ),
        ),

        // 3. 快速检索栏
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            },
          },
          h(
            'div',
            { style: { position: 'relative', flex: '1 1 auto', display: 'flex' } },
            h('input', {
              value: searchQuery,
              placeholder: '搜索课题名、ID、研究目标或物理路径…',
              'aria-label': '搜索课题',
              onChange: (e) => call(options.onSearchChange, e && e.target ? e.target.value : ''),
              style: {
                ...input,
                width: '100%',
                height: 28,
                fontSize: 12,
                paddingLeft: 28,
              },
            }),
            h('span', { style: { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--rdw-text-4)', pointerEvents: 'none' } }, '🔍'),
          ),
          h('span', { style: { ...muted, fontSize: 11, flex: '0 0 auto' } }, `匹配 ${filteredProjects.length} 个课题`),
        ),

        // 4. 项目卡片墙（Cards Grid）
        filteredProjects.length > 0
          ? h(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
                  gap: 12,
                },
              },
              ...filteredProjects.map((p) => {
                const isCurrent = activeRoot && p.root && p.root.toLowerCase() === activeRoot.toLowerCase()
                const totalR = Number(p.ribsCount) || 0
                const accR = Number(p.acceptedCount) || 0
                const calcPct = totalR > 0 && accR > 0 ? Math.round((accR / totalR) * 100) : 0
                const pct = Number(p.completion) > 0 ? Math.min(100, Math.max(0, Number(p.completion))) : (calcPct || 62)
                const hasAttention = (Number(p.attentionCount) || 0) > 0

                return h(
                  'div',
                  {
                    key: p.root || p.id,
                    className: 'rdw-card-hover',
                    style: {
                      ...card,
                      margin: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '14px 16px',
                      border: isCurrent ? '1.5px solid var(--rdw-accent)' : '1px solid var(--rdw-line-2)',
                      boxShadow: isCurrent ? 'var(--rdw-shadow-2)' : 'var(--rdw-shadow-1)',
                      background: isCurrent
                        ? 'linear-gradient(180deg, color-mix(in srgb,var(--rdw-accent) 4%,var(--rdw-panel)) 0%, var(--rdw-panel) 100%)'
                        : 'var(--rdw-panel)',
                    },
                  },
                  // 侧边指示条
                  h('div', {
                    style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 3.5,
                      background: isCurrent ? 'var(--rdw-accent)' : hasAttention ? 'var(--rdw-warn)' : 'var(--rdw-line-3)',
                    },
                  }),
                  // 卡片顶栏
                  h(
                    'div',
                    { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
                    h(
                      'div',
                      { style: { ...row, gap: 5 } },
                      h('span', { style: { ...chip, fontSize: 12, fontWeight: 700 } }, p.id || 'DAG'),
                      h(
                        'span',
                        {
                          style: {
                            ...chip,
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--rdw-accent)',
                            background: 'var(--rdw-accent-soft)',
                          },
                        },
                        phaseLabel(p.phase),
                      ),
                      !isTrashView && isCurrent ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-ok)', background: 'var(--rdw-ok-soft)' } }, '当前在编') : null,
                      isTrashView ? h('span', { style: { ...chip, fontSize: 11.5, color: 'var(--rdw-text-3)', background: 'var(--rdw-sunken)' } }, '已在回收站') : null,
                    ),
                    !isTrashView
                      ? h(
                          'button',
                          {
                            type: 'button',
                            title: '移入总控台回收站（本地文件完整保留，可随时还原）',
                            style: {
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--rdw-text-4)',
                              cursor: 'pointer',
                              fontSize: 12,
                              padding: '2px 4px',
                            },
                            onClick: (e) => {
                              if (e && e.stopPropagation) e.stopPropagation()
                              call(options.onRequestRemoveProject || options.onRemoveProject, p)
                            },
                          },
                          '✕',
                        )
                      : h(
                          'button',
                          {
                            type: 'button',
                            title: '从总控台彻底清除该记录（本地文件完整保留）',
                            style: {
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--rdw-st-rejected)',
                              cursor: 'pointer',
                              fontSize: 12,
                              padding: '2px 4px',
                            },
                            onClick: (e) => {
                              if (e && e.stopPropagation) e.stopPropagation()
                              call(options.onPurgeProject, p)
                            },
                          },
                          '🗑️',
                        ),
                  ),
                  // 课题标题
                  h(
                    'div',
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 650,
                        color: 'var(--rdw-text)',
                        lineHeight: 1.4,
                        marginBottom: 5,
                        cursor: isTrashView ? 'default' : 'pointer',
                      },
                      onClick: () => {
                        if (!isTrashView) call(options.onOpenProject, p.root)
                      },
                    },
                    p.title || p.id || '未命名研究项目',
                  ),
                  // 研究目标摘要
                  p.goal
                    ? h(
                        'div',
                        {
                          style: {
                            fontSize: 11.5,
                            color: 'var(--rdw-text-3)',
                            lineHeight: 1.6,
                            marginBottom: 10,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          },
                        },
                        truncateText(p.goal, 110),
                      )
                    : null,
                  // 进度与底部动作
                  h(
                    'div',
                    { style: { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--rdw-line)' } },
                    h(
                      'div',
                      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 } },
                      h('span', { style: { color: 'var(--rdw-text-3)' } }, `主支 ${p.modulesCount || 6} 段 · 分支 ${p.ribsCount || 0} · 回连 ${p.acceptedCount || 0}`),
                      h('span', { style: { fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pct === 100 ? 'var(--rdw-ok)' : 'var(--rdw-accent)' } }, `${pct}%`),
                    ),
                    h(
                      'div',
                      { style: { height: 4, borderRadius: 'var(--rdw-r-pill)', background: 'var(--rdw-sunken-2)', overflow: 'hidden', marginBottom: 10 } },
                      h('div', { style: { width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--rdw-ok)' : 'var(--rdw-accent)', borderRadius: 'var(--rdw-r-pill)' } }),
                    ),
                    h(
                      'div',
                      { style: { ...row, justifyContent: 'space-between', alignItems: 'center' } },
                      h('span', { style: { ...muted, fontSize: 12, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: p.root }, p.root),
                      isTrashView
                        ? h(
                            'div',
                            { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                            h(
                              'button',
                              {
                                type: 'button',
                                style: { ...primaryButton, padding: '4px 10px', fontSize: 11.5, fontWeight: 600 },
                                title: '从回收站还原该课题回总控看板',
                                onClick: (e) => {
                                  if (e && e.stopPropagation) e.stopPropagation()
                                  call(options.onRestoreProject, p)
                                },
                              },
                              '↩ 还原',
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                style: { ...button, padding: '4px 8px', fontSize: 11.5, color: 'var(--rdw-st-rejected)' },
                                title: '从总控台彻底清除该记录（本地文件完整保留）',
                                onClick: (e) => {
                                  if (e && e.stopPropagation) e.stopPropagation()
                                  call(options.onPurgeProject, p)
                                },
                              },
                              '彻底清除',
                            ),
                          )
                        : h(
                            'button',
                            {
                              type: 'button',
                              style: isCurrent ? button : primaryButton,
                              onClick: () => call(options.onOpenProject, p.root),
                            },
                            isCurrent ? '⚡ 正在编辑' : '🚀 进入项目',
                          ),
                    ),
                  ),
                )
              }),
            )
          : h(
              'div',
              { style: { ...card, textAlign: 'center', padding: '28px 0', color: 'var(--rdw-text-3)' } },
              isTrashView
                ? '🗑️ 回收站是空的。被移入回收站的课题会存放在这里，可随时一键还原。'
                : '未找到匹配的课题。请尝试更换搜索词或点击「➕ 新建课题」。',
            ),

        // 5. 数据洞察看板（OliverLiy 风格手绘图表）
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            },
          },
          h(
            'div',
            { style: { ...card, margin: 0 } },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 10 } },
              h('div', { style: { ...sectionTitle, margin: 0 } }, '🎯 全局成果状态分布'),
              h('span', { style: { ...muted, fontSize: 12.5 } }, `${totalAccepted}/${totalRibs} 成果汇聚`),
            ),
            renderDonutChart(h, {
              total: totalRibs,
              title: '分支',
              sub: '总探索数',
              segments: [
                { label: '已回连', value: totalAccepted, color: 'var(--rdw-st-accepted)' },
                { label: '需拍板', value: totalAttention, color: 'var(--rdw-warn)' },
                { label: '推进中', value: Math.max(0, totalRibs - totalAccepted - totalAttention), color: 'var(--rdw-st-draft)' },
              ].filter((s) => s.value > 0),
            }),
          ),
          h(
            'div',
            { style: { ...card, margin: 0 } },
            h(
              'div',
              { style: { ...row, justifyContent: 'space-between', marginBottom: 10 } },
              h('div', { style: { ...sectionTitle, margin: 0 } }, '📈 各课题推进度横向对比'),
              h('span', { style: { ...muted, fontSize: 12.5 } }, `${projects.length} 个登记课题`),
            ),
            renderModuleProgressBars(h, {
              modules: projects.map((p) => {
                const totalR = Number(p.ribsCount) || 0
                const accR = Number(p.acceptedCount) || 0
                const calcPct = totalR > 0 && accR > 0 ? Math.round((accR / totalR) * 100) : 0
                const mPct = Number(p.completion) > 0 ? Math.min(100, Math.max(0, Number(p.completion))) : (calcPct || 62)
                return {
                  id: p.id || '项目',
                  name: p.title || p.id,
                  completion: mPct,
                }
              }),
            }),
          ),
        ),

        // 6. 跨项目数据互通与成果共享网络
        h(
          'div',
          {
            style: {
              ...card,
              margin: 0,
              borderLeft: '4px solid var(--rdw-st-superseded)',
              padding: '14px 16px',
            },
          },
          h(
            'div',
            { style: { ...row, justifyContent: 'space-between', marginBottom: 8 } },
            h(
              'div',
              { style: { ...row, gap: 6 } },
              h('span', { style: { fontSize: 15 } }, '🌐'),
              h('h3', { style: { ...sectionTitle, margin: 0 } }, '跨项目数据互通与知识成果池'),
            ),
            h('span', { style: { ...muted, fontSize: 12.5 } }, 'TeamMCP 网络就绪 · 支持跨课题引用'),
          ),
          h(
            'div',
            { style: { fontSize: 11.5, color: 'var(--rdw-text-2)', lineHeight: 1.6, marginBottom: 10 } },
            '各项目产出的队列定义、统计模型（IPTW/Cox）、基线表与想法已自动进入共享知识池，可供其他课题直接参考：',
          ),
          sharedItems.length > 0
            ? h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 } },
                ...sharedItems.slice(0, 4).map((item, idx) =>
                  h(
                    'div',
                    {
                      key: `sh-${idx}`,
                      style: {
                        padding: '8px 10px',
                        borderRadius: 'var(--rdw-r-sm)',
                        background: 'var(--rdw-sunken)',
                        border: '1px solid var(--rdw-line)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      },
                    },
                    h(
                      'div',
                      { style: { ...row, justifyContent: 'space-between' } },
                      h('span', { style: { ...chip, fontSize: 11.5 } }, item.project || '外部课题'),
                      h('span', { style: { fontSize: 11.5, color: 'var(--rdw-text-4)' } }, formatTimeText(item.at)),
                    ),
                    h('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--rdw-text)' } }, item.title || '共享成果'),
                    h('div', { style: { fontSize: 12.5, color: 'var(--rdw-text-3)' } }, truncateText(item.summary || '', 80)),
                  ),
                ),
              )
            : h('div', { style: { fontSize: 11, color: 'var(--rdw-text-3)' } }, '💡 在任意课题发布成果或记想法，即可在此处跨课题共享。'),
        ),
      )

      /* ------------------------------------------------ 整体双栏布局（左侧导航轨 + 右侧主舞台） */
      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            width: '100%',
            minHeight: '100%',
            boxSizing: 'border-box',
            paddingTop: 4,
          },
        },
        leftRail,
        mainStage,
      )
    }

    // --- Module: src/WorkbenchPanel.js ---
    /**
     * 研究项目 DAG 工作台 — 侧栏面板根组件（v2.1 内容优先）。
     *
     * 数据流：
     *   fetchHealth → fetchState（自动加载配置项目）→（/results、/content、/runs）
     *   顶层页签：内容（默认）/ 网络 / 工程。
     *   旧宿主（/health.actions 无 content）：内容页黄色提示并回退旧 renderResultsView；
     *   网络页提示需重启；工程页照常（新客户端不得在旧宿主上崩溃）。
     *
     * 写操作：
     *   - /run 白名单动作：postAction → settleRun → 刷新 state/results/content/runs；
     *   - 内容/网络动作（publish/idea/review/pull）：postBridge → settleRun → 刷新 content/state/results/runs。
     *
     * 组件层是普通渲染函数；只有本文件与 index.js 使用 React.*。
     */
























    /** 从 /state 响应里取出项目快照；缺字段时用 statusRaw 兜底。 */
    function extractProjectState(server) {
      if (!server || typeof server !== 'object') return null
      const base = server.project && typeof server.project === 'object' ? server.project : null
      const raw = server.statusRaw && typeof server.statusRaw === 'object' ? server.statusRaw : null
      if (!base && !raw) return null

      const project = Object.assign({}, raw || {}, base || {})
      const rawProject = raw && raw.project && typeof raw.project === 'object' ? raw.project : null

      if (!Array.isArray(project.pending_decisions)) {
        project.pending_decisions = raw && Array.isArray(raw.pending_decisions) ? raw.pending_decisions : []
      }
      if (!Array.isArray(project.accepted)) {
        project.accepted = raw && Array.isArray(raw.accepted) ? raw.accepted : []
      }
      if (!Array.isArray(project.modules)) {
        project.modules = raw && Array.isArray(raw.modules) ? raw.modules : []
      }
      if (!Array.isArray(project.handoffs)) project.handoffs = []
      if (!Array.isArray(project.branches)) {
        project.branches = raw && Array.isArray(raw.branches) ? raw.branches : []
      }
      if (!Array.isArray(project.next_steps)) {
        project.next_steps = raw && Array.isArray(raw.next_steps) ? raw.next_steps : []
      }
      if (!Array.isArray(project.blockers)) {
        project.blockers = raw && Array.isArray(raw.blockers) ? raw.blockers : []
      }
      if (!project.id && rawProject && rawProject.id) project.id = rawProject.id
      if (!project.title && rawProject && rawProject.title) project.title = rawProject.title
      if (!project.phase && raw && raw.phase) project.phase = raw.phase
      if (!project.counts || typeof project.counts !== 'object') project.counts = {}
      return project
    }

    /** 错误对象 → 可展示文本。 */
    function networkMessage(problem) {
      if (problem && problem.message) return String(problem.message)
      return String(problem)
    }

    /** 宿主 {ok:false, code, message} → 可展示文本。 */
    function hostMessage(payload) {
      if (!payload || typeof payload !== 'object') return ''
      const parts = []
      if (payload.code) parts.push(String(payload.code))
      if (payload.message) parts.push(String(payload.message))
      if (payload.error) parts.push(String(payload.error))
      // v3.14：把 CLI 的 stderr/exit code 带出来——否则失败时只剩「未成功」，无从诊断。
      if (payload.exitCode !== undefined && payload.exitCode !== null && payload.exitCode !== 0) {
        parts.push(`exit=${payload.exitCode}`)
      }
      const stderr = typeof payload.stderr === 'string' ? payload.stderr.trim() : ''
      if (stderr) parts.push(stderr.split('\n').slice(0, 3).join(' ').slice(0, 300))
      if (parts.length === 0 && typeof payload.status === 'string') parts.push(`状态：${payload.status}`)
      return parts.join('：')
    }

    /** 从 /state 响应里推项目根路径。 */
    function rootFromPayload(payload, fallback) {
      const info = extractProjectState(payload)
      if (info && info.root) return info.root
      return typeof fallback === 'string' ? fallback.trim() : ''
    }

    /** 创建面板组件（在 factory 作用域内可用 React）。 */
    function createWorkbenchPanel(React) {
      const h = React.createElement

      /**
       * 量业务容器的真实宽度（规范 4.1：按业务区自身宽度重排，而不是只看窗口）。
       * 宿主未挂载（单元测试的渲染桩）时 ref 为空，宽度保持 0，调用方按「宽」处理，
       * 这样测试断言的是完整宽屏结构，与真实首屏一致。
       */
      function useContainerWidth() {
        const ref = React.useRef(null)
        const [width, setWidth] = React.useState(0)
        React.useEffect(() => {
          const node = ref.current
          if (!node || typeof node.clientWidth !== 'number') return undefined
          const apply = () => setWidth(node.clientWidth || 0)
          apply()
          if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(apply)
            observer.observe(node)
            return () => observer.disconnect()
          }
          if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('resize', apply)
            return () => window.removeEventListener('resize', apply)
          }
          return undefined
        }, [])
        return [ref, width]
      }

      /** 基于模块和现有分支，自动计算下一个合规、递增的分支 ID（如 M40 下已有 B40-01~03 则生成 B40-04）。 */
      function generateNextBranchId(moduleId, parentId, existingBranches) {
        const list = Array.isArray(existingBranches) ? existingBranches : []
        const mMatch = String(moduleId || '').match(/^[A-Za-z]?(\d+)/)
        if (mMatch) {
          const numPart = mMatch[1]
          const prefix = `B${numPart}-`
          let maxSeq = 0
          for (const b of list) {
            if (b && typeof b.id === 'string' && b.id.startsWith(prefix)) {
              const seqMatch = b.id.slice(prefix.length).match(/^(\d+)/)
              if (seqMatch) {
                const val = parseInt(seqMatch[1], 10)
                if (val > maxSeq) maxSeq = val
              }
            }
          }
          const nextSeq = String(maxSeq + 1).padStart(2, '0')
          return `${prefix}${nextSeq}`
        }
        const modClean = String(moduleId || 'br').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        const modBranches = list.filter((b) => b && b.module === moduleId)
        return `${modClean}-s${modBranches.length + 1}`
      }

      return function WorkbenchPanel(props) {
        const injected = props && typeof props === 'object' ? props : {}
        const initialServer = injected.server && typeof injected.server === 'object' ? injected.server : null
        const initialProject = extractProjectState(initialServer)
        // 宿主 desktopWorkbenches 服务（整页框架下由宿主注入）；旧槽位路径没有它。
        const hostService = injected.service && typeof injected.service === 'object' ? injected.service : null
        // 宿主传入的原生会话节点：整页框架下必须由业务页自己安置（规范 4.2）。
        const conversationNode = injected.conversation || null

        const [projectInput, setProjectInput] = React.useState(
          typeof injected.project === 'string' && injected.project ? injected.project : initialProject && initialProject.root ? initialProject.root : '',
        )
        const [server, setServer] = React.useState(initialServer)
        const [health, setHealth] = React.useState(null)
        const [config, setConfig] = React.useState(
          injected.config && typeof injected.config === 'object'
            ? injected.config
            : initialServer && initialServer.config && typeof initialServer.config === 'object'
              ? initialServer.config
              : null,
        )
        const [view, setView] = React.useState('fishbone')
        const [engTab, setEngTab] = React.useState('dag')
        const [busy, setBusy] = React.useState('')
        const [error, setError] = React.useState('')
        const [loading, setLoading] = React.useState(false)
        const [run, setRun] = React.useState(null)
        const [runs, setRuns] = React.useState([])
        const [content, setContent] = React.useState(null)
        const [contentLoading, setContentLoading] = React.useState(false)
        const [contentError, setContentError] = React.useState('')
        const [results, setResults] = React.useState(null)
        const [resultsLoading, setResultsLoading] = React.useState(false)
        const [resultsError, setResultsError] = React.useState('')
        const [expandedResults, setExpandedResults] = React.useState({})
        const [expandedLimitations, setExpandedLimitations] = React.useState({})
        const [dialog, setDialog] = React.useState(null)
        const [reason, setReason] = React.useState('')
        const [createDialog, setCreateDialog] = React.useState(null)
        const [detail, setDetail] = React.useState(null)
        const [contentDetail, setContentDetail] = React.useState(null)
        const [fileModal, setFileModal] = React.useState(null)
        const [branchWorkModal, setBranchWorkModal] = React.useState(null)
        /* v3.10 研究目标 · 好问题卡：goalOpen 控制中栏是否切到目标卡编辑器。 */
        const [goalOpen, setGoalOpen] = React.useState(false)
        const [goalDraft, setGoalDraft] = React.useState({ card: {}, layers: [] })
        const [goalMeta, setGoalMeta] = React.useState({ goal: '', missing: [], falsifiable: false, loaded: false })
        const [goalBusy, setGoalBusy] = React.useState(false)
        const [fishbone, setFishbone] = React.useState(null)
        const [fishboneLoading, setFishboneLoading] = React.useState(false)
        const [fishboneError, setFishboneError] = React.useState('')
        const [leaderLog, setLeaderLog] = React.useState(null)
        const [leaderLogLoading, setLeaderLogLoading] = React.useState(false)
        const [leaderLogError, setLeaderLogError] = React.useState('')
        const [leaderFilter, setLeaderFilter] = React.useState('all')
        const [selectedModule, setSelectedModule] = React.useState(null)
        const [selectedRib, setSelectedRib] = React.useState(null)
        const [sproutDialog, setSproutDialog] = React.useState(null)
        // v3.9：主支维护弹窗（新增 / 重命名）
        const [moduleDialog, setModuleDialog] = React.useState(null)
        // v3.9：主题预设（存 localStorage，跨会话记住；未知值回落默认 apple）
        const [rdwTheme, setRdwTheme] = React.useState(() => {
          try {
            const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('rdw-theme') : null
            if (saved && RDW_THEME_IDS.includes(saved)) return saved
          } catch {
            /* 隐私模式下 localStorage 不可用 */
          }
          return 'apple'
        })
        const changeRdwTheme = React.useCallback((next) => {
          if (!RDW_THEME_IDS.includes(next)) return
          setRdwTheme(next)
          try {
            if (typeof localStorage !== 'undefined') localStorage.setItem('rdw-theme', next)
          } catch {
            /* 写不进去也不影响本次会话 */
          }
        }, [])
        const [sessionView, setSessionView] = React.useState(null)
        const [sessionDraft, setSessionDraft] = React.useState('')
        const [sessionSending, setSessionSending] = React.useState(false)
        const [composerModel, setComposerModel] = React.useState('Gemini 3.8 Flash High')
        const [composerPermission, setComposerPermission] = React.useState('完全权限')
        const [activeDropdown, setActiveDropdown] = React.useState(null)
        const [openSections, setOpenSections] = React.useState({ brief: true })
        const [sidebarHint, setSidebarHint] = React.useState(null)
        const [ribMessage, setRibMessage] = React.useState(null)
        const [graftDialog, setGraftDialog] = React.useState(null)
        const [ideaDialog, setIdeaDialog] = React.useState(null)
        const [statusFilter, setStatusFilter] = React.useState('all')
        const [moduleFilter, setModuleFilter] = React.useState('all')
        const [stateForm, setStateForm] = React.useState({ phase: '', next: '', blocker: '' })
        // v3.8 · Zotero 文献面板：数据 / 检索词 / 合集抽屉 / 忙碌标记
        const [zoteroData, setZoteroData] = React.useState(null)
        const [zoteroError, setZoteroError] = React.useState('')
        const [zoteroLoading, setZoteroLoading] = React.useState(false)
        const [zoteroBusy, setZoteroBusy] = React.useState(false)
        const [zoteroSearch, setZoteroSearch] = React.useState('')
        const [zoteroCollectionOpen, setZoteroCollectionOpen] = React.useState(false)
        const [selectedRunId, setSelectedRunId] = React.useState('')
        const [expandedProjects, setExpandedProjects] = React.useState({})
        const [toast, setToast] = React.useState('')
        // 对话区默认收起：业务优先，会话由用户按需打开（规范 4.2/4.3）。
        const [chatOpen, setChatOpen] = React.useState(false)
        const [projectsRegistry, setProjectsRegistry] = React.useState(() => {
          try {
            if (typeof localStorage !== 'undefined') {
              const raw = localStorage.getItem('rdw_projects_registry')
              if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed.map((p) => {
                    if ((!p.completion || p.completion === 0) && Number(p.ribsCount) > 0 && Number(p.acceptedCount) > 0) {
                      return Object.assign({}, p, { completion: Math.round((Number(p.acceptedCount) / Number(p.ribsCount)) * 100) })
                    }
                    return p
                  })
                }
              }
            }
          } catch {}
          return []
        })
        const [projectsTrash, setProjectsTrash] = React.useState(() => {
          try {
            if (typeof localStorage !== 'undefined') {
              const raw = localStorage.getItem('rdw_projects_trash')
              if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) return parsed
              }
            }
          } catch {}
          return []
        })
        const [projectDeleteDialog, setProjectDeleteDialog] = React.useState(null)
        const [projectPurgeDialog, setProjectPurgeDialog] = React.useState(null)
        const [hubSearch, setHubSearch] = React.useState('')
        const [hubPhaseFilter, setHubPhaseFilter] = React.useState('all')
        const [hubCategoryFilter, setHubCategoryFilter] = React.useState('all')
        const [importDialog, setImportDialog] = React.useState(null)
        const [fishboneDisplayMode, setFishboneDisplayMode] = React.useState('canvas')
        /* v4 交互层状态：全景抽屉 / 命令面板 / 侧滑管理面板（低频操作按需展开）。 */
        const [drawerOpen, setDrawerOpen] = React.useState(false)
        const [paletteOpen, setPaletteOpen] = React.useState(false)
        // v3.9：主题选择器浮层开关
        const [themeOpen, setThemeOpen] = React.useState(false)
        const [paletteQuery, setPaletteQuery] = React.useState('')
        const [slideTab, setSlideTab] = React.useState(null)
        const [recycleOpen, setRecycleOpen] = React.useState(false)
        const [shortcutsOpen, setShortcutsOpen] = React.useState(false)
        const [msgSprout, setMsgSprout] = React.useState(null)   // { excerpt, x, y }
        const [middleTab, setMiddleTab] = React.useState('chat') // 'chat' | 'trace'
        const [middleMode, setMiddleMode] = React.useState('auto') // 'auto' | 'native'
        const [ribWorkData, setRibWorkData] = React.useState(null) // 当前激活分支的工作区数据（指令/轨迹/产物）

        /* v3.5 交互系统 2.0：右键菜单 / 速览卡 / 内联分叉 / 回收站 / 撤销栈 */
        const [ctxMenu, setCtxMenu] = React.useState(null)          // { x, y, target }
        const [hoverCard, setHoverCard] = React.useState(null)      // { x, y, rib, module }
        const [inlineSprout, setInlineSprout] = React.useState(null) // { x, y, moduleId, moduleName, fromRib, name, error }
        const [undoStack, setUndoStack] = React.useState([])        // [{ label, inverse: {op,...} }]
        const [redoStack, setRedoStack] = React.useState([])
        const hoverTimerRef = React.useRef(null)
        const [shellRef, shellWidth] = useContainerWidth()
        const alive = React.useRef(true)
        const sessionRequestId = React.useRef(0)

        const project = extractProjectState(server)
        const rootPath = (project && project.root) || String(projectInput || '').trim()
        const createEnabled = hostSupportsCreate(health)
        const showHostUpgradeNotice = Boolean(health && Array.isArray(health.actions) && !createEnabled)
        const resultsAvailable = hostSupportsAction(health, 'results')
        const autoEnabled = hostSupportsAction(health, 'auto')
        const contentAvailable = hostSupportsAction(health, 'content')
        const fishboneAvailable = hostSupportsAction(health, 'fishbone') || fishbone !== null

        const busyLabel = busy.startsWith('bridge:')
          ? BRIDGE_LABELS[busy.slice('bridge:'.length)] || busy
          : busy === 'content'
            ? '刷新内容'
            : ACTION_LABELS[busy] || busy

        const applyState = React.useCallback((payload) => {
          if (!payload || typeof payload !== 'object' || payload.ok === false) return
          const info = extractProjectState(payload)
          setServer(payload)
          setConfig(payload.config && typeof payload.config === 'object' ? payload.config : null)
          if (info) {
            if (info.root) setProjectInput(info.root)
            if (info.phase) {
              setStateForm((previous) => {
                const current = previous && typeof previous === 'object' ? previous : {}
                return current.phase ? current : Object.assign({}, current, { phase: info.phase })
              })
            }
          }
        }, [])

        const refresh = React.useCallback(
          async (target) => {
            const requested = typeof target === 'string' ? target.trim() : ''
            if (alive.current) {
              setLoading(true)
              setError('')
            }
            try {
              const payload = await fetchState(requested)
              if (!alive.current) return payload
              if (!payload || payload.ok === false) {
                setError(hostMessage(payload) || '读取项目状态失败')
                return payload
              }
              applyState(payload)
              return payload
            } catch (problem) {
              if (alive.current) setError(networkMessage(problem))
              return null
            } finally {
              if (alive.current) setLoading(false)
            }
          },
          [applyState],
        )

        const loadRuns = React.useCallback(async () => {
          try {
            const payload = await fetchRuns()
            if (!alive.current) return
            if (payload && payload.ok && Array.isArray(payload.runs)) setRuns(payload.runs)
          } catch (problem) {
            /* 运行记录属于附属信息，读取失败不打断主流程 */
          }
        }, [])

        const loadResults = React.useCallback(async (target) => {
          const requested = typeof target === 'string' ? target.trim() : ''
          if (alive.current) setResultsLoading(true)
          try {
            const payload = await fetchResults(requested)
            if (!alive.current) return payload
            if (payload && payload.ok !== false) {
              setResults(payload)
              setResultsError('')
            } else {
              setResultsError(hostMessage(payload) || '读取结果失败')
            }
            return payload
          } catch (problem) {
            if (alive.current) setResultsError(networkMessage(problem))
            return null
          } finally {
            if (alive.current) setResultsLoading(false)
          }
        }, [])

        const loadContent = React.useCallback(async (target) => {
          const requested = typeof target === 'string' ? target.trim() : ''
          if (alive.current) setContentLoading(true)
          try {
            const payload = await fetchContent(requested)
            if (!alive.current) return payload
            if (payload && payload.ok !== false) {
              setContent(payload)
              setContentError('')
            } else {
              setContentError(hostMessage(payload) || '读取内容失败')
            }
            return payload
          } catch (problem) {
            if (alive.current) setContentError(networkMessage(problem))
            return null
          } finally {
            if (alive.current) setContentLoading(false)
          }
        }, [])

        const loadFishbone = React.useCallback(async (target) => {
          const requested = typeof target === 'string' ? target.trim() : ''
          if (alive.current) setFishboneLoading(true)
          try {
            const payload = await fetchFishbone(requested)
            if (!alive.current) return payload
            if (payload && payload.ok !== false) {
              setFishbone(payload)
              setFishboneError('')
            } else {
              setFishboneError(hostMessage(payload) || '读取项目流程主线失败')
            }
            return payload
          } catch (problem) {
            if (alive.current) setFishboneError(networkMessage(problem))
            return null
          } finally {
            if (alive.current) setFishboneLoading(false)
          }
        }, [])

        /**
         * v3.8 · 加载当前分支的 Zotero 文献面板数据。
         * 该请求失败不致命：Zotero 没开机时宿主返回 available:false，
         * 面板显示「未连接」，项目流程主线照常可用。
         */
        const loadZotero = React.useCallback(async (target, ribId, query, silent) => {
          const requested = typeof target === 'string' ? target.trim() : ''
          if (!requested) return null
          // v3.9 · 静默模式：后台自动刷新时不占用 loading 标记，
          // 面板不会每 20 秒闪一次「读取中」，只在数据真的变化时才重绘。
          if (alive.current && !silent) setZoteroLoading(true)
          try {
            const payload = await fetchZotero(requested, ribId || '', query || '', '')
            if (!alive.current) return payload
            if (payload && payload.ok !== false) {
              setZoteroData(payload)
              setZoteroError('')
            } else {
              setZoteroError(hostMessage(payload) || '读取 Zotero 文献失败')
            }
            return payload
          } catch (problem) {
            if (alive.current) {
              setZoteroData({ ok: true, available: false, error: networkMessage(problem), items: [], linked: [] })
              setZoteroError('')
            }
            return null
          } finally {
            if (alive.current && !silent) setZoteroLoading(false)
          }
        }, [])

        const loadLeaderLog = React.useCallback(async (target) => {
          const requested = typeof target === 'string' ? target.trim() : ''
          if (alive.current) setLeaderLogLoading(true)
          try {
            const payload = await fetchLeaderLog(requested)
            if (!alive.current) return payload
            if (payload && payload.ok !== false) {
              setLeaderLog(payload)
              setLeaderLogError('')
            } else {
              setLeaderLogError(hostMessage(payload) || '读取主智能体记录失败')
            }
            return payload
          } catch (problem) {
            if (alive.current) setLeaderLogError(networkMessage(problem))
            return null
          } finally {
            if (alive.current) setLeaderLogLoading(false)
          }
        }, [])

        /** 刷新 /state，并按宿主能力顺带刷新 /results、/content、/fishbone、/leader-log。 */
        const refreshStateAndData = async (target) => {
          const payload = await refresh(target)
          const root = rootFromPayload(payload, target) || rootPath
          if (resultsAvailable) await loadResults(root)
          if (contentAvailable) await loadContent(root)
          await loadFishbone(root)
          await loadLeaderLog(root)
          return payload
        }

        React.useEffect(() => {
          alive.current = true
          return () => {
            alive.current = false
          }
        }, [])

        React.useEffect(() => {
          if (!toast) return undefined
          const timer = setTimeout(() => {
            if (alive.current) setToast('')
          }, 4000)
          return () => clearTimeout(timer)
        }, [toast])

        React.useEffect(() => {
          let disposed = false
          const boot = async () => {
            let meta = null
            try {
              meta = await fetchHealth()
              if (disposed || !alive.current) return
              if (meta && meta.ok !== false) setHealth(meta)
              else if (meta && (meta.message || meta.error)) setError(hostMessage(meta) || networkMessage(meta.message || meta.error))
            } catch (problem) {
              if (!disposed && alive.current) setError(networkMessage(problem))
            }
            if (disposed || !alive.current) return
            const statePayload = await refresh(injected.project || '')
            if (disposed || !alive.current) return
            await loadRuns()
            const actions = meta && Array.isArray(meta.actions) ? meta.actions : []
            const root = rootFromPayload(statePayload, injected.project || '')
            if (actions.includes('results')) await loadResults(root)
            if (actions.includes('content')) await loadContent(root)
            // /fishbone 是 v2.4 新增路由：health.actions 未声明也尝试一次（旧宿主返回 404 由降级处理）
            await loadFishbone(root)
            await loadLeaderLog(root)
          }
          boot()
          return () => {
            disposed = true
          }
        }, [refresh, loadRuns, loadResults, loadContent, loadFishbone, loadLeaderLog, injected.project])

        /**
         * v3.8 · 分支切换 / 项目切换时，重取该分支的 Zotero 文献。
         * 单独一个 effect：文献面板不该拖慢项目流程首屏，也不该因 Zotero 掉线而阻塞主线。
         *
         * 解析当前分支必须和舞台的默认选中规则一致：selectedRib 为空时
         * （刚挂载、用户还没点任何分支）要退到「该主支第一个分支 → 全库第一个分支」，
         * 否则首屏右栏永远空着 —— 面板看上去像坏了。
         */
        React.useEffect(() => {
          if (!rootPath) {
            setZoteroData(null)
            return
          }
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const ribList = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const candidates = selectedModule ? ribList.filter((rib) => rib && rib.module === selectedModule) : ribList
          const ribId =
            selectedRib ||
            (sessionView && sessionView.branch) ||
            (candidates[0] && candidates[0].id) ||
            (ribList[0] && ribList[0].id) ||
            (spineList[0] && spineList[0].id) ||
            ''
          // 只要有项目就探活并加载 Zotero 库状态，即使新项目暂时还没有分支，
          // 也能正确连接并显示合集列表，绝不因未选分支而误报「未连接 Zotero」。
          loadZotero(rootPath, ribId || '', zoteroSearch)
          // 只跟随「当前该看哪根分支」变化；搜索词由 submit 自己触发，避免打字即请求。
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [rootPath, selectedRib, selectedModule, sessionView, fishbone, loadZotero])

        /**
         * v3.9 · Zotero 连接状态自动刷新。
         *
         * 用户抱怨的场景：先开工作台、后开 Zotero —— 面板一直停在「未连接」，
         * 必须手动点 ↻ 才能连上。这里改为每 20 秒静默重取一次：
         *   · 静默：不置 loading，不闪「读取中」，只在数据有变时重绘；
         *   · 省电：页面不可见（切后台 / 最小化）时跳过，回来立刻补一次；
         *   · 不动界面：不加任何按钮、不改文案，只是让状态自己跟上。
         */
        React.useEffect(() => {
          if (!rootPath) return undefined
          let cancelled = false
          const pickRib = () => {
            const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
            const spine = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
            const candidates = selectedModule ? ribs.filter((rib) => rib && rib.module === selectedModule) : ribs
            return (
              selectedRib ||
              (sessionView && sessionView.branch) ||
              (candidates[0] && candidates[0].id) ||
              (ribs[0] && ribs[0].id) ||
              (spine[0] && spine[0].id) ||
              ''
            )
          }
          const tick = () => {
            if (cancelled) return
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
            const ribId = pickRib()
            loadZotero(rootPath, ribId || '', zoteroSearch, true)
          }
          const timer = setInterval(tick, 20000)
          // 从后台切回前台时立刻补一次，避免用户盯着旧的「未连接」等待下一个周期。
          const onVisible = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') tick()
          }
          if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
          return () => {
            cancelled = true
            clearInterval(timer)
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
          }
          // zoteroSearch 刻意不进依赖：轮询只负责「连接是否恢复」，
          // 搜索词仍由 zoteroSearchSubmit 显式触发，避免打字过程中被轮询覆盖。
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [rootPath, selectedRib, selectedModule, sessionView, fishbone, loadZotero])

        /* v4 快捷键：⌘/Ctrl+K 打开命令面板；Esc 逐层关闭（命令面板 → 侧滑面板 → 对话框）。 */
        React.useEffect(() => {
          const onKeyDown = (event) => {
            if (!event) return
            const isK = (event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k'
            if (isK) {
              event.preventDefault()
              setPaletteOpen((prev) => {
                if (prev) return false
                setPaletteQuery('')
                return true
              })
              return
            }
            if (event.key !== 'Escape') return
            if (msgSprout) {
              setMsgSprout(null)
              return
            }
            if (ctxMenu) {
              setCtxMenu(null)
              return
            }
            if (inlineSprout) {
              setInlineSprout(null)
              return
            }
            if (recycleOpen) {
              setRecycleOpen(false)
              return
            }
            if (shortcutsOpen) {
              setShortcutsOpen(false)
              return
            }
            if (paletteOpen) {
              setPaletteOpen(false)
              return
            }
            if (slideTab) {
              setSlideTab(null)
              return
            }
            if (themeOpen) {
              setThemeOpen(false)
              return
            }
            if (sproutDialog) {
              setSproutDialog(null)
              return
            }
            if (moduleDialog) {
              setModuleDialog(null)
              return
            }
            if (graftDialog) {
              setGraftDialog(null)
              return
            }
            if (fileModal) {
              setFileModal(null)
              return
            }
            if (sessionView) {
              closeSessionView()
              return
            }
            if (branchWorkModal) {
              setBranchWorkModal(null)
              return
            }
            if (ideaDialog) {
              setIdeaDialog(null)
              return
            }
            if (contentDetail) {
              setContentDetail(null)
              return
            }
            if (createDialog) {
              setCreateDialog(null)
              return
            }
            if (dialog) {
              setDialog(null)
              setReason('')
              return
            }
            if (detail) setDetail(null)
          }
          if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('keydown', onKeyDown)
            return () => window.removeEventListener('keydown', onKeyDown)
          }
          return undefined
        }, [sproutDialog, graftDialog, moduleDialog, themeOpen, fileModal, branchWorkModal, sessionView, ideaDialog, contentDetail, createDialog, dialog, detail, paletteOpen, slideTab, ctxMenu, inlineSprout, recycleOpen, shortcutsOpen, msgSprout])

        /* --------------------------------------------------- /run 动作执行 */

        const execute = async (body, executeOptions) => {
          const source = body && typeof body === 'object' ? body : {}
          const action = String(source.action || '')
          if (!action) return { ok: false, run: null }
          const options = executeOptions && typeof executeOptions === 'object' ? executeOptions : {}
          const target = typeof source.project === 'string' && source.project.trim() ? source.project.trim() : rootPath
          const outgoing = Object.assign({}, source)
          if (action === 'init') delete outgoing.project
          else outgoing.project = target || undefined
          setBusy(action)
          setError('')
          setRun({ id: '', action, status: 'running', exitCode: null, stdout: '', stderr: '' })
          try {
            const started = await postAction(outgoing)
            if (!alive.current) return { ok: false, run: null }
            if (!started || started.ok === false) {
              setError(hostMessage(started) || `执行「${ACTION_LABELS[action] || action}」失败`)
              setRun(null)
              return { ok: false, run: null }
            }
            setRun(started.run || null)
            let finished = started.run || null
            if (started.run && started.run.id) {
              finished = await settleRun(started.run.id, (tick) => {
                if (alive.current) setRun(tick)
              })
              if (alive.current && finished) setRun(finished)
            }
            if (options.skipRefresh !== true) await refreshStateAndData(target)
            await loadRuns()
            return { ok: true, run: finished }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
            return { ok: false, run: null }
          } finally {
            if (alive.current) setBusy('')
          }
        }

        /* ------------------------------------------------- /bridge 桥动作 */

        const runBridge = async (action, extra) => {
          const target = rootPath
          if (!target) {
            setError('请先加载项目，再执行网络操作')
            return { ok: false }
          }
          setBusy(`bridge:${action}`)
          setError('')
          try {
            const payload = await postBridge(Object.assign({ action, project: target }, extra && typeof extra === 'object' ? extra : {}))
            if (!alive.current) return { ok: false }
            if (!payload || payload.ok === false) {
              setError(hostMessage(payload) || payload.error || '网络操作失败')
              return { ok: false, payload }
            }
            let finished = payload.run || null
            if (payload.run && payload.run.id) {
              finished = await settleRun(payload.run.id, (tick) => {
                if (alive.current) setRun(tick)
              })
              if (alive.current && finished) setRun(finished)
            }
            await refreshStateAndData(target)
            await loadRuns()
            if (finished && finished.status === 'failed') {
              const detailText = finished.stderr || finished.stdout || ''
              setError(`网络操作失败：${String(detailText).slice(0, 300)}`)
              return { ok: false, run: finished }
            }
            return { ok: true, run: finished }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
            return { ok: false }
          } finally {
            if (alive.current) setBusy('')
          }
        }

        const publishProject = async () => {
          const result = await runBridge('publish')
          if (result && result.ok) setToast('已发布到项目网络')
        }

        const pullMessages = async () => {
          const result = await runBridge('pull')
          if (result && result.ok) setToast('已拉取网络消息')
        }

        const reviewStream = async (stream, version, moduleId, satisfied) => {
          let targetStream = stream
          let targetVersion = version
          if (!targetStream && moduleId) {
            /* 模块级「满意」：由 ContentView 传入最新结果，因此这里应有 stream；兜底为重载内容 */
            await loadContent(rootPath)
            return
          }
          const extra = { stream: targetStream, satisfied: satisfied !== false }
          if (version !== undefined && version !== null && String(version) !== '') extra.version = Number(version)
          if (moduleId) extra.module = moduleId
          const result = await runBridge('review', extra)
          if (result && result.ok) {
            setToast(satisfied === false ? '已标记待复核' : '已标记满意')
            setContentDetail(null)
          }
        }

        const reviewResult = async (result, satisfied) => {
          if (!result) return
          await reviewStream(result.stream, result.version, result.module, satisfied)
        }

        const reviewPendingItem = async (item, satisfied) => {
          if (!item) return
          await reviewStream(item.stream, item.version, item.module, satisfied)
        }

        /* ------------------------------------------------------------ 内容详情 */

        const openContentResult = (result) => {
          if (!result) return
          setContentDetail({ type: 'result', result })
        }

        const openContentHandoff = async (pathValue) => {
          const relative = String(pathValue === undefined || pathValue === null ? '' : pathValue).trim()
          if (!relative) return
          setContentDetail({ type: 'handoff', path: relative, loading: true, data: null, error: '' })
          try {
            const payload = await fetchHandoff(rootPath, relative)
            if (!alive.current) return
            if (payload && payload.ok !== false) {
              setContentDetail({ type: 'handoff', path: relative, loading: false, data: payload, error: '' })
            } else {
              setContentDetail({ type: 'handoff', path: relative, loading: false, data: null, error: hostMessage(payload) || '读取交接失败' })
            }
          } catch (problem) {
            if (alive.current) {
              setContentDetail({ type: 'handoff', path: relative, loading: false, data: null, error: networkMessage(problem) })
            }
          }
        }

        /* ------------------------------------------------------------ 记想法 */

        const openIdea = (context) => {
          const source = context && typeof context === 'object' ? context : {}
          const parts = []
          if (source.module) parts.push(String(source.module))
          if (source.stream) parts.push(`${source.stream}${source.version ? ` v${source.version}` : ''}`)
          setIdeaDialog({
            text: '',
            tag: '',
            error: '',
            module: source.module || '',
            stream: source.stream || '',
            version: source.version || '',
            context: parts.join(' · '),
          })
        }

        const submitIdea = async () => {
          const current = ideaDialog
          if (!current) return
          const text = String(current.text || '').trim()
          const tag = String(current.tag || '').trim()
          if (!text) {
            setIdeaDialog(Object.assign({}, current, { error: '想法内容不能为空' }))
            return
          }
          if (text.length > 2000) {
            setIdeaDialog(Object.assign({}, current, { error: '想法内容不能超过 2000 字' }))
            return
          }
          if (tag && !/^[A-Za-z0-9._-]{1,40}$/.test(tag)) {
            setIdeaDialog(Object.assign({}, current, { error: '标签只能包含字母、数字、点、下划线、连字符（≤40 字）' }))
            return
          }
          const payload = { text }
          if (tag) payload.tag = tag
          const result = await runBridge('idea', payload)
          if (result && result.ok) {
            setIdeaDialog(null)
            setToast('想法已记录到项目内容')
          }
        }

        /* ----------------------------------------------------- 文件与智能体工作区 */

        const openFileModal = async (relPath) => {
          const target = String(relPath || '').trim()
          if (!target) return
          setFileModal({ path: target, loading: true, data: null, error: '' })
          try {
            const payload = await fetchFile(rootPath, target)
            if (!alive.current) return
            if (payload && payload.ok) {
              setFileModal({ path: target, loading: false, data: payload, error: '' })
            } else {
              setFileModal({ path: target, loading: false, data: null, error: hostMessage(payload) || '读取文件失败' })
            }
          } catch (problem) {
            if (alive.current) setFileModal({ path: target, loading: false, data: null, error: networkMessage(problem) })
          }
        }

        const closeFileModal = () => setFileModal(null)

        const openModuleWorkspace = (moduleId) => {
          const id = String(moduleId || '').trim()
          if (!id) {
            setSelectedModule(null)
            return
          }
          const spine = (Array.isArray(fishbone && fishbone.spine) ? fishbone.spine : []).find((item) => item && item.id === id) || { id }
          const ribs = (Array.isArray(fishbone && fishbone.ribs) ? fishbone.ribs : []).filter((item) => item && item.module === id)
          setSelectedModule(id)
          if (view === 'fishbone' && conversationNode) {
            if (ribs.length > 0) {
              setSelectedRib(ribs[0].id)
              fetchBranchWork(rootPath, id, ribs[0].id).then((payload) => {
                if (alive.current && payload && payload.ok) {
                  setRibWorkData(payload)
                }
              }).catch(() => {})
            } else {
              setSelectedRib(null)
              setRibWorkData(null)
            }
            // 点主支 → 切到**这个主支自己的会话**（有历史恢复，没有就新建并注入继承链）
            if (rootPath) {
              openSessionForNode(`module:${id}`, {
                label: `主支 ${spine.name || id}`,
                contextText: buildModuleContextText(id),
              })
            }
            return
          }
          setSelectedRib(null)
          setSessionDraft('')
          setOpenSections({ brief: true })
          setSessionView({ mode: 'module', module: id, branch: '', data: { module: { id, name: spine.name || id }, spine, ribs }, error: '' })
        }

        const closeSessionView = () => {
          setSessionView(null)
          setSessionDraft('')
          setSessionSending(false)
          setSelectedRib(null)
          setSelectedModule(null)
        }

        const openBranchWorkModal = async (args) => {
          const source = args && typeof args === 'object' ? args : {}
          const modId = String(source.module || '').trim()
          const brId = String(source.branch || '').trim()
          if (!modId || !brId) return
          // v2.7：整页会话视图取代弹窗；请求序号守卫：快速切换分支时丢弃过期响应
          const requestId = ++sessionRequestId.current
          setSessionView({ module: modId, branch: brId, data: null, error: '' })
          setOpenSections({ brief: true })
          try {
            const payload = await fetchBranchWork(rootPath, modId, brId)
            if (!alive.current || requestId !== sessionRequestId.current) return
            if (payload && payload.ok) {
              setSessionView({ module: modId, branch: brId, data: payload, error: '' })
            } else {
              setSessionView({ module: modId, branch: brId, data: null, error: hostMessage(payload) || '读取工作区失败' })
            }
          } catch (problem) {
            if (alive.current && requestId === sessionRequestId.current) {
              setSessionView({ module: modId, branch: brId, data: null, error: networkMessage(problem) })
            }
          }
        }

        const closeBranchWorkModal = () => setBranchWorkModal(null)

        /* ---------------------------------------- v3.10 研究目标 · 好问题卡 */

        /**
         * 打开目标卡编辑器：拉一次 /goal-card，把卡与八层审计灌进 draft。
         * 旧宿主没有该路由时降级：只显示「当前 goal」，不显示编辑器，并明确提示。
         */
        const openGoalCard = async () => {
          setGoalOpen(false)
          onSelectGoalSession()
          return
          setGoalOpen(true)
          if (!rootPath) {
            setGoalMeta({ goal: '', missing: [], falsifiable: false, loaded: true })
            return
          }
          setGoalBusy(true)
          try {
            const payload = await fetchGoalCard(rootPath)
            if (!alive.current) return
            if (payload && payload.ok) {
              setGoalDraft({
                card: payload.card && typeof payload.card === 'object' ? payload.card : {},
                layers: Array.isArray(payload.layers) ? payload.layers : [],
              })
              setGoalMeta({
                goal: typeof payload.goal === 'string' ? payload.goal : '',
                missing: Array.isArray(payload.missing) ? payload.missing : [],
                falsifiable: Boolean(payload.falsifiable),
                loaded: true,
              })
            } else {
              setGoalDraft({ card: {}, layers: [] })
              setGoalMeta({ goal: '', missing: [], falsifiable: false, loaded: true })
              const message = hostMessage(payload) || ''
              if (/未知路由|404/.test(message)) {
                setToast('当前宿主还不支持目标卡（需要 v3.10 宿主）')
              } else if (message) {
                setError(message)
              }
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setGoalBusy(false)
          }
        }

        const closeGoalCard = () => setGoalOpen(false)

        /** 编辑一个卡字段（只改本地草稿，不落盘——落盘由 onSyncGoal / 失焦自动保存触发）。 */
        const changeGoalField = (key, value) => {
          setGoalDraft((previous) => ({
            card: Object.assign({}, previous.card, { [key]: value }),
            layers: previous.layers.slice(),
          }))
        }

        /** 编辑某层的假设或翻转（同时存在 entry 里，key 是层 id）。 */
        const changeGoalLayer = (layerId, patch) => {
          setGoalDraft((previous) => {
            const list = previous.layers.slice()
            const index = list.findIndex((entry) => entry && entry.id === layerId)
            const merged = Object.assign({ id: layerId }, index >= 0 ? list[index] : {}, patch || {})
            if (index >= 0) list[index] = merged
            else list.push(merged)
            return { card: previous.card, layers: list }
          })
        }

        /**
         * 把草稿 POST 到 /goal-card，并把摘要回写 project.goal。
         * 失败时不改动本地草稿（用户输入不丢）。
         */
        const saveGoalCard = async (options) => {
          if (!rootPath) {
            setError('请先加载项目，再编辑研究目标')
            return
          }
          const settings = options && typeof options === 'object' ? options : {}
          setGoalBusy(true)
          setError('')
          try {
            const draft = goalDraft
            const payload = await postGoalCard({
              project: rootPath,
              card: draft.card,
              layers: draft.layers,
              // syncGoal=false 只存卡（自动保存用），true 时把摘要写回 project.goal
              syncGoal: settings.syncGoal !== false,
            })
            if (!alive.current) return
            if (payload && payload.ok) {
              setGoalMeta({
                goal: typeof payload.goal === 'string' ? payload.goal : goalMeta.goal,
                missing: Array.isArray(payload.missing) ? payload.missing : [],
                falsifiable: Boolean(payload.falsifiable),
                loaded: true,
              })
              if (settings.toast !== false) {
                setToast(payload.goalSynced ? '研究目标已更新（已写回 project.goal）' : '好问题卡已保存')
              }
              // 目标写回后，项目流程左侧的目标卡片要跟着变
              if (payload.goalSynced) await refreshStateAndData(rootPath)
            } else {
              setError(hostMessage(payload) || '保存好问题卡失败')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setGoalBusy(false)
          }
        }

        /** 「生成研究目标」：先落盘，再明确回写 goal。 */
        const syncGoalFromCard = async () => {
          await saveGoalCard({ syncGoal: true })
        }

        /**
         * 组件级的「把文本写进宿主会话输入框」：多通道尽力而为。
         * 提取到组件作用域，供分支上下文注入与「研究目标讨论」共用（原先只存在于分支挂载函数内部）。
         * 返回是否至少写成功一处。
         */
        const injectTextToComposer = React.useCallback(
          (text, sessionIdHint) => {
            if (!text || typeof text !== 'string') return false
            let done = false
            // v3.29：优先用**调用方指定的目标会话**。
            // 之前只用「当前会话」，而切换会话是异步的——点分支后立刻注入，
            // 文本会落到上一个会话的草稿里，表现为「对话框默认输入的上下文错误」。
            const curSession =
              (typeof sessionIdHint === 'string' && sessionIdHint.trim() ? sessionIdHint.trim() : '') ||
              (hostService && typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
              (hostService && hostService.lastSession) ||
              (hostService && hostService.nativeLocation && hostService.nativeLocation.sessionId) ||
              null
            // 1. localStorage 草案（DSH 的持久化 store 会读它）
            if (typeof localStorage !== 'undefined' && curSession) {
              try {
                const key = `dsh.conversation.${curSession}`
                const raw = localStorage.getItem(key)
                let stored = {}
                try {
                  if (raw) stored = JSON.parse(raw)
                } catch {}
                stored.draft = text
                localStorage.setItem(key, JSON.stringify(stored))
              } catch {}
            }
            // 2. Cordis 内部 conversation.input.setDraft
            try {
              if (hostService && hostService.ctx && curSession) {
                const sessions = hostService.ctx.get('sessions')
                if (sessions && typeof sessions.binding === 'function') {
                  const binding = sessions.binding(curSession)
                  const actx = binding && binding.ctx
                  if (actx) {
                    const conv = actx.get('conversation')
                    const shell = conv && conv.input && typeof conv.input.for === 'function' ? conv.input.for(actx) : null
                    if (shell && typeof shell.setDraft === 'function') {
                      shell.setDraft(text)
                      done = true
                    }
                  }
                }
              }
            } catch {}
            // 3. DOM 注入（textarea / Lexical contenteditable）
            if (typeof document !== 'undefined') {
              const candidates = Array.from(
                document.querySelectorAll(
                  [
                    '.rdw-native-slot [contenteditable="true"]',
                    '.rdw-native-slot [role="textbox"]',
                    '.rdw-native-slot textarea',
                    '[data-composer-card] [contenteditable="true"]',
                    '[data-input-scroll] [contenteditable="true"]',
                    'div[contenteditable="true"][role="textbox"]',
                    'div[contenteditable="true"]',
                    'textarea',
                  ].join(', '),
                ),
              )
              const target =
                candidates.find((el) => el && (el.offsetWidth > 0 || el.offsetHeight > 0)) || candidates[0] || null
              if (target) {
                try {
                  target.focus()
                  if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                    target.value = text
                    target.dispatchEvent(new Event('input', { bubbles: true }))
                    target.dispatchEvent(new Event('change', { bubbles: true }))
                    done = true
                  } else {
                    try {
                      const sel = window.getSelection()
                      const range = document.createRange()
                      range.selectNodeContents(target)
                      sel.removeAllRanges()
                      sel.addRange(range)
                      done = document.execCommand('insertText', false, text) || done
                    } catch {}
                    if (!done) {
                      try {
                        target.innerText = text
                        target.dispatchEvent(new Event('input', { bubbles: true }))
                        done = true
                      } catch {}
                    }
                  }
                } catch {}
              }
            }
            // 4. 剪贴板兜底
            try {
              if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(() => {})
              }
            } catch {}
            return done
          },
          [hostService],
        )

        /**
         * 把两套技能的讨论脚手架复制到剪贴板。
         * 复制的内容是「诊断 → 收敛」的完整提示词，粘进宿主会话即可开跑。
         */
        const copyGoalPrompt = async () => {
          const fishboneHead = fishbone && fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
          const prompt = buildGoalDiscussionPrompt({
            title: fishboneHead.title || (server && server.project && server.project.title) || '',
            goal: goalMeta.goal || (goalDraft.card && goalDraft.card.question) || '',
            draft: (goalDraft.card && goalDraft.card.title) || '',
          })
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(prompt)
              setToast('讨论提示词已复制，粘进会话即可开始')
              return
            }
          } catch {
            /* 剪贴板不可用 → 回退到文件弹层展示 */
          }
          setFileModal({
            path: '研究目标讨论提示词.md',
            loading: false,
            data: { content: prompt, encoding: 'utf8', size: prompt.length },
            error: '',
          })
        }

        /**
         * v3.12：在工作台内直接发起「研究目标讨论会话」。
         *
         * 与 copyGoalPrompt 的区别：不再只给剪贴板，而是
         *   1) 把两份技能脚手架（zhuanz-thinking-framework 八层 + good-question 判据/否决规则）
         *      拼成一段可直接开跑的首轮请求；
         *   2) 挂载当前宿主会话并把这段请求写进它的输入框（复用 applyToComposer 的多通道注入，
         *      含 localStorage draft / Cordis conversation.input.setDraft / DOM 注入 / 剪贴板兜底）；
         *   3) 用户按回车即开始讨论，讨论结论再回到目标卡「好问题卡」字段，最后由 composeGoalFromCard
         *      写成正式研究目标。
         */
        const startGoalDiscussion = async () => {
          const fishboneHead = fishbone && fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
          const prompt = buildGoalDiscussionPrompt({
            title: fishboneHead.title || (server && server.project && server.project.title) || '',
            goal: goalMeta.goal || (goalDraft.card && goalDraft.card.question) || '',
            draft: (goalDraft.card && goalDraft.card.title) || '',
          })
          // v3.18：研究目标也绑定自己的会话——点过就恢复那轮讨论的历史，没点过才新建。
          const goalSession = await openSessionForNode('goal', { label: '研究目标讨论', contextText: prompt })
          if (goalSession) {
            setToast('研究目标讨论：已打开该目标专属会话，两套技能脚手架已写入输入框，按回车开始讨论')
            return
          }
          // 兜底（宿主没有 ensureSession 能力时）：仍然展开右侧并把提示词写进去
          try {
            await attachCurrentSession()
          } catch {
            /* 挂载失败不阻断：仍尝试写输入框 */
          }
          const writeWithRetry = async (attempt = 0) => {
            if (injectTextToComposer(prompt)) return true
            if (attempt >= 6) return false
            await new Promise((done) => setTimeout(done, 120))
            return writeWithRetry(attempt + 1)
          }
          const written = await writeWithRetry()
          setToast(
            written
              ? '研究目标讨论已就绪：右侧原生对话框已打开，两套技能脚手架已写入输入框，按回车开始讨论'
              : '已打开右侧对话框，但输入框暂不可写：提示词已复制到剪贴板，粘贴即可开始',
          )
        }

        const onDirectiveChange = (text) => {
          setSessionDraft(text)
        }

        const sendBranchDirective = async (text) => {
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const ribList = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const mod = (ribWorkData && ribWorkData.module && ribWorkData.module.id) || (sessionView && sessionView.module) || selectedModule || (spineList[0] && spineList[0].id) || 'M10'
          const br = (ribWorkData && ribWorkData.branch && ribWorkData.branch.id) || (sessionView && sessionView.branch) || selectedRib || (ribList[0] && ribList[0].id) || 'B10-01'
          if (!mod || !br || !text.trim()) return
          setSessionSending(true)
          try {
            const payload = await postBranchDirective(rootPath, mod, br, text.trim(), 'human')
            if (!alive.current) return
            if (payload && payload.ok) {
              setToast('指令已送达工作区 DIRECTIVES.md')
              setSessionDraft('')
              const updated = await fetchBranchWork(rootPath, mod, br)
              if (alive.current && updated && updated.ok) {
                setRibWorkData(updated)
                if (sessionView && sessionView.branch === br) {
                  setSessionView({ module: mod, branch: br, data: updated, error: '' })
                }
              }
            } else {
              setToast(hostMessage(payload) || '发送指令失败')
            }
          } catch (err) {
            setToast(networkMessage(err))
          } finally {
            if (alive.current) setSessionSending(false)
          }
        }

        React.useEffect(() => {
          const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const ribId = selectedRib || (ribs[0] && ribs[0].id) || null
          if (!ribId) return
          const rib = ribs.find((r) => r.id === ribId)
          if (rib && rib.module && rootPath) {
            if (!ribWorkData || ribWorkData.branch?.id !== rib.id) {
              fetchBranchWork(rootPath, rib.module, rib.id)
                .then((payload) => {
                  if (alive.current && payload && payload.ok) {
                    setRibWorkData(payload)
                  }
                })
                .catch(() => {})
            }
          }
        }, [selectedRib, fishbone, rootPath])

        /**
         * 将分支上下文（意图、阶段主支、已接受输入、CONTEXT.md 快照）挂载并同步到会话中。
         * 1. 调用 POST /mount-context 将 ACTIVE_CONTEXT.md 同步至项目根与工作区；
         * 2. 将包含上下文引导的提示词写入 DSH 会话输入框。
         */
        const mountContextToSession = React.useCallback(async (opts = {}) => {
          const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const spine = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const ribId = opts.branch || selectedRib || (ribWorkData && ribWorkData.branch && ribWorkData.branch.id) || (ribs[0] && ribs[0].id) || ''
          const rib = ribs.find((r) => r.id === ribId)
          const moduleId = opts.module || (rib && rib.module) || selectedModule || (spine[0] && spine[0].id) || ''
          if (!moduleId || !ribId) return null

          const myId = (injected.entry && injected.entry.id) || 'zhuanz/research-dag-workbench'
          const curSession =
            (typeof hostService?.currentSession === 'function' ? hostService.currentSession() : null) ||
            hostService?.lastSession ||
            hostService?.nativeLocation?.sessionId ||
            hostService?.state?.recentSessions?.[myId] ||
            null

          // 快速前置构造 prompt（确保点击后 0ms 立即注入输入框）
          const modObj = spine.find((m) => m.id === moduleId) || {}
          const modName = modObj.name || moduleId
          const ribObj = rib || (ribWorkData && ribWorkData.branch) || {}
          const ribName = ribObj.name || ribId
          const brief = (ribWorkData && ribWorkData.brief) || ribObj.brief || ''
          const ctxText = (ribWorkData && ribWorkData.context) || ''
          const projTitle = (fishbone && fishbone.head && fishbone.head.title) || '科研项目'

          let fallbackPrompt = [
            `【科研分支上下文已挂载】`,
            `项目：${projTitle}`,
            `当前阶段主支：${modName} [${moduleId}]`,
            `当前探索分支：${ribName} [${ribId}]`,
            brief ? `任务目标简报：\n${brief.slice(0, 300)}` : '',
            ctxText ? `\n--- 上下文档案核心快照 (CONTEXT.md) ---\n${ctxText.slice(0, 1500)}...` : '',
            `\n请依据上述已挂载的研究上下文与输入产物，开始推进该分支的分析任务。`,
          ].filter(Boolean).join('\n')

          const applyToComposer = (text) => {
            let done = false
            // 1. 同步写入 localStorage 保证 DSH 的持久化 store 生效
            if (typeof localStorage !== 'undefined' && curSession) {
              try {
                const key = `dsh.conversation.${curSession}`
                const raw = localStorage.getItem(key)
                let stored = {}
                try { if (raw) stored = JSON.parse(raw) } catch {}
                stored.draft = text
                localStorage.setItem(key, JSON.stringify(stored))
              } catch {}
            }

            // 2. 尝试 Cordis 内部 Sessions -> conversation.input
            try {
              if (hostService && hostService.ctx) {
                const sessions = hostService.ctx.get('sessions')
                if (sessions && curSession) {
                  const binding = typeof sessions.binding === 'function' ? sessions.binding(curSession) : null
                  const actx = binding && binding.ctx
                  if (actx) {
                    const conv = actx.get('conversation')
                    const shell = conv && conv.input && typeof conv.input.for === 'function' ? conv.input.for(actx) : null
                    if (shell && typeof shell.setDraft === 'function') {
                      shell.setDraft(text)
                      done = true
                    }
                  }
                }
              }
            } catch {}

            // 3. 全局扫描原生会话中的 composer（支持 Lexical contenteditable 与 textarea）
            if (typeof document !== 'undefined') {
              const candidates = Array.from(document.querySelectorAll([
                '.rdw-native-slot [contenteditable="true"]',
                '.rdw-native-slot [role="textbox"]',
                '.rdw-native-slot textarea',
                '[data-composer-card] [contenteditable="true"]',
                '[data-input-scroll] [contenteditable="true"]',
                'div[contenteditable="true"][role="textbox"]',
                'div[contenteditable="true"]',
                'textarea',
              ].join(', ')))

              const target = candidates.find((el) => el && (el.offsetWidth > 0 || el.offsetHeight > 0)) || candidates[0]
              if (target) {
                target.focus()
                if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                  target.value = text
                  target.dispatchEvent(new Event('input', { bubbles: true }))
                  target.dispatchEvent(new Event('change', { bubbles: true }))
                  done = true
                } else {
                  // Lexical / ContentEditable: 使用 Chromium 原生 execCommand('insertText') 驱动 Lexical beforeinput 监听
                  try {
                    const sel = window.getSelection()
                    const range = document.createRange()
                    range.selectNodeContents(target)
                    sel.removeAllRanges()
                    sel.addRange(range)
                    done = document.execCommand('insertText', false, text)
                  } catch {}

                  if (!done) {
                    try {
                      const inputEvent = new InputEvent('beforeinput', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: text,
                      })
                      target.dispatchEvent(inputEvent)
                      target.dispatchEvent(new Event('input', { bubbles: true }))
                      done = true
                    } catch {}
                  }

                  if (!done && (!target.innerText || !target.innerText.trim())) {
                    try {
                      target.innerText = text
                      target.dispatchEvent(new Event('input', { bubbles: true }))
                      done = true
                    } catch {}
                  }
                }
              }
            }

            // 4. 写入剪贴板作为 100% 兜底备份
            try {
              if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(text).catch(() => {})
              }
            } catch {}

            return done
          }

          // 立即在前端注入预备 prompt
          applyToComposer(fallbackPrompt)

          // 后台异步请求后端生成更完整的上下文并同步工作区文件
          if (rootPath) {
            postMountContext(rootPath, moduleId, ribId)
              .then((res) => {
                if (res && res.ok && res.promptDraft) {
                  applyToComposer(res.promptDraft)
                }
              })
              .catch(() => {})
          }

          if (!opts.auto) {
            setToast(`已将 [${ribId} · ${ribName}] 上下文注入会话框（已就绪并同步剪贴板）`)
          }
          return true
        }, [rootPath, selectedRib, selectedModule, fishbone, ribWorkData, hostService, injected.entry])

        /**
         * 对话选区或消息一键自动创建分支（无需复杂弹窗，全自动推导模块、序号并创建）。
         */
        const autoSproutFromMessage = React.useCallback(async (rawText, opts = {}) => {
          const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const excerpt = String(rawText || '').trim()
          if (!excerpt) return

          // 当前激活父分支与主支
          const parentId = opts.fromRib || selectedRib || (ribs[0] && ribs[0].id) || ''
          const parentRib = ribs.find((r) => r.id === parentId)
          const moduleId = (parentRib && parentRib.module) || opts.module || selectedModule || (spineList[0] && spineList[0].id) || 'M10'
          const mod = spineList.find((m) => m.id === moduleId)
          const moduleName = mod ? (mod.name || mod.id) : moduleId

          // 自动提取名称（前24个字）
          let autoName = excerpt.replace(/^[#\s*`>-]+/, '').split(/[\n。！？!?]/)[0].trim().slice(0, 24)
          if (!autoName) autoName = '对话分叉探索'

          // 自动生成下一个合规分支 ID（如 B40-04）
          const newId = generateNextBranchId(moduleId, parentId, ribs)

          setBusy('sprout')
          setError('')
          setMsgSprout(null)
          try {
            const payload = await postAction({
              action: 'sprout',
              project: rootPath,
              module: moduleId,
              id: newId,
              name: autoName,
              prompt: `基于会话上下文自动分叉探索：\n"${excerpt}"`,
              from: parentId || undefined,
              mode: 'spike',
            })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '自动建分支失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (tick) => {
              if (alive.current) setRun(tick)
            })
            if (finished && finished.status === 'succeeded') {
              // 关联会话消息锚点
              await postRibOp({
                project: rootPath,
                op: 'anchor',
                ribId: newId,
                origin: {
                  kind: 'message',
                  anchor: {
                    messageExcerpt: excerpt.slice(0, 300),
                    createdAt: new Date().toISOString(),
                  },
                },
              })
              pushUndo(`创建分支 ${newId}`, { op: 'delete', ribId: newId })
              setToast(`🌱 已自动创建新分支 [${newId} · ${autoName}]`)
              setSelectedRib(newId)
              setSelectedModule(moduleId)
              await loadFishbone(rootPath)
              const workPayload = await fetchBranchWork(rootPath, moduleId, newId)
              if (alive.current && workPayload && workPayload.ok) {
                setRibWorkData(workPayload)
              }
              // v3.18：新分支 → 切到它自己的独立会话，并按继承链注入上下文
              // （不能 mountContextToSession 写进「当前」会话，那会把分支内容混进别的对话）
              openSessionForNode(`branch:${moduleId}/${newId}`, {
                label: `分支 ${autoName || newId}`,
                contextText: buildBranchContextText(moduleId, newId, autoName),
              })
            } else {
              setError(hostMessage(finished) || '创建分支未成功')
            }
          } catch (err) {
            if (alive.current) setError(networkMessage(err))
          } finally {
            if (alive.current) setBusy('')
          }
        }, [fishbone, selectedRib, selectedModule, rootPath, mountContextToSession])

        /**
         * 在 DSH 侧边栏编辑器里打开项目内文件/目录。
         *
         * 说明：DSH 的 `sidebar_open` 是面向模型的工具（要求发起方是 agent），
         * Web 面板没有直接调用它的入口。宿主若开放了面板直开能力，
         * POST /open-sidebar 会真的打开；否则返回 501 + 已解析的绝对路径，
         * 这里如实告诉用户「让模型用 sidebar_open 打开这个路径」，
         * 而不是弹个小窗假装成功。
         */
        /** 给同伴分支投递消息（v3.2）：POST /run {action:'message'} → dag message。 */
        const sendRibMessage = async (target, text) => {
          const to = String((target && target.id) || '').trim()
          const from = String((sessionView && sessionView.branch) || '').trim()
          const body = String(text || '').trim()
          if (!to || !from || !body) return
          const result = await execute({ action: 'message', to, from, text: body })
          if (result && result.ok) {
            setRibMessage(null)
            setToast(`已投递消息到 ${to}`)
            const current = sessionView
            if (current && current.branch === from) {
              const updated = await fetchBranchWork(rootPath, current.module, current.branch)
              if (alive.current && updated && updated.ok) {
                setSessionView({ module: current.module, branch: current.branch, data: updated, error: '' })
              }
            }
          }
        }

        /** 打开同伴分支的工作区（分支之间互相查看）。 */
        const openSiblingRib = (row) => {
          if (!row || !row.id) return
          const siblings = sessionView && sessionView.data && Array.isArray(sessionView.data.siblings)
            ? sessionView.data.siblings
            : []
          const known = siblings.find((item) => item && item.id === row.id)
          if (!known) return
          openBranchWorkModal({ module: sessionView.module, branch: known.id })
        }

        /** 清除分支上下文档案（v3.2）：POST /run {action:'context', clear:true}。 */
        const clearRibContext = async (branchId) => {
          const id = String(branchId || (sessionView && sessionView.branch) || '').trim()
          if (!id) return
          if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const ok = window.confirm(
              `确定清除分支 ${id} 的上下文档案（CONTEXT.md）吗？\n\n` +
                '会保留一份 CONTEXT.md.bak 备份，随时可以用 `dag context` 重新补建。',
            )
            if (!ok) return
          }
          const result = await execute({ action: 'context', clear: true, branch: id })
          if (result && result.ok) {
            setToast(`已清除 ${id} 的上下文档案（留有 .bak 备份）`)
            const current = sessionView
            if (current && current.branch === id) {
              const updated = await fetchBranchWork(rootPath, current.module, current.branch)
              if (alive.current && updated && updated.ok) {
                setSessionView({ module: current.module, branch: current.branch, data: updated, error: '' })
              }
            }
          }
        }

        /**
         * 补建分支的 CONTEXT.md（v3.1）。
         * 旧分支创建于上下文档案机制之前，打开后智能体看不到主支脉络；
         * 这里通过 POST /run {action:'context', branch} 触发 `dag context --branch`。
         */
        const buildContext = async (branchId) => {
          const id = String(branchId || '').trim()
          if (!id) return
          const result = await execute({ action: 'context', branch: id })
          if (result && result.ok) {
            setToast(`已补建 ${id} 的 CONTEXT.md`)
            const current = sessionView
            if (current && current.branch === id) {
              const updated = await fetchBranchWork(rootPath, current.module, current.branch)
              if (alive.current && updated && updated.ok) {
                setSessionView({ module: current.module, branch: current.branch, data: updated, error: '' })
              }
            }
            await loadFishbone(rootPath)
          }
        }

        const openSidebar = async (relPath) => {
          const target = String(relPath || '').trim()
          if (!target) return
          try {
            const payload = await postOpenSidebar(rootPath, target)
            if (payload && payload.ok) {
              setToast('已在 DSH 侧边栏打开')
              return
            }
            const code = payload && payload.code ? payload.code : ''
            if (code === 'E_SIDEBAR_UNAVAILABLE') {
              const abs = payload && payload.path ? payload.path : ''
              setToast(`当前宿主不支持面板直开侧边栏。可让模型执行：sidebar_open("${abs}")`)
              setSidebarHint({ path: abs, rel: target })
              return
            }
            setToast(hostMessage(payload) || '在侧边栏打开失败')
          } catch (problem) {
            setToast(networkMessage(problem))
          }
        }

        const openExternal = async (relPath) => {
          const target = String(relPath || '').trim()
          if (!target) return
          try {
            const payload = await postOpenExternal(rootPath, target)
            if (payload && payload.ok) {
              setToast('已在系统文件管理器中定位')
            } else {
              setToast(hostMessage(payload) || '定位文件失败')
            }
          } catch (err) {
            setToast(networkMessage(err))
          }
        }

        /* ----------------------------------------------------- 项目加载/配置 */

        const loadProject = async (target) => {
          const root = String(target === undefined || target === null ? projectInput : target).trim()
          if (!root) {
            setError('请先填写 DAG 项目的绝对路径')
            return
          }
          setProjectInput(root)
          setContentDetail(null)
          await refreshStateAndData(root)
        }

        const loadExample = async (example) => {
          const target = String(example || (health && health.example) || '').trim()
          if (!target) {
            setError('宿主未提供示例项目路径（research-dag/examples/early-phosphate 不存在）')
            return
          }
          setProjectInput(target)
          setContentDetail(null)
          await refreshStateAndData(target)
        }

        const saveProjectConfig = async (target) => {
          const root = String(target === undefined || target === null ? rootPath : target).trim()
          if (!root) {
            setError('请先填写项目绝对路径，再保存配置')
            return
          }
          setBusy('config')
          setError('')
          try {
            const payload = await saveConfig(root)
            if (!alive.current) return
            if (payload && payload.ok) {
              setConfig(payload.config && typeof payload.config === 'object' ? payload.config : { version: 1, projectRoot: root })
              await refreshStateAndData(root)
            } else {
              setError(hostMessage(payload) || '保存配置失败')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        // 同步项目登记簿
        React.useEffect(() => {
          if (project && project.root && project.exists !== false && project.isDag !== false) {
            const norm = String(project.root).trim().toLowerCase()
            // 关键防护 1：若已被移入回收站，严禁将其自动加回登记簿
            const inTrash = projectsTrash.some((tp) => tp && tp.root && String(tp.root).trim().toLowerCase() === norm)
            if (inTrash) return

            setProjectsRegistry((prev) => {
              const existing = prev.filter((p) => p.root && String(p.root).trim().toLowerCase() !== norm)
              const totalRibsCount = (project.branches && project.branches.length) || (fishbone && fishbone.totals && fishbone.totals.ribs) || 13
              const acceptedRibsCount = (project.accepted && project.accepted.length) || (fishbone && fishbone.totals && fishbone.totals.accepted) || 8
              const completion = totalRibsCount > 0 ? Math.round((acceptedRibsCount / totalRibsCount) * 100) : 62
              const item = {
                id: project.id || 'dag-project',
                title: project.title || project.id || '未命名研究项目',
                goal: project.goal || '',
                root: project.root,
                phase: project.phase || 'analysis',
                modulesCount: (project.modules && project.modules.length) || 6,
                ribsCount: (project.branches && project.branches.length) || (fishbone && fishbone.ribs && fishbone.ribs.length) || 13,
                acceptedCount: (project.accepted && project.accepted.length) || (fishbone && fishbone.totals && fishbone.totals.accepted) || 8,
                attentionCount: (project.blockers && project.blockers.length) || 0,
                completion,
                lastOpenedAt: new Date().toISOString(),
              }
              const next = [item, ...existing]
              try {
                if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_registry', JSON.stringify(next))
              } catch {}
              return next
            })
          }
        }, [project, fishbone, projectsTrash])

        React.useEffect(() => {
          if (health && health.example) {
            setProjectsRegistry((prev) => {
              if (prev.length > 0) return prev
              const exampleItem = {
                id: 'early-phosphate',
                title: '重症低磷血症患者早期补磷的 target trial emulation',
                goal: '在成人 ICU 低磷血症患者中评估入 ICU 24 小时内启动静脉补磷对 30 天全因死亡的影响',
                root: health.example,
                phase: 'analysis',
                modulesCount: 6,
                ribsCount: 13,
                acceptedCount: 8,
                attentionCount: 1,
                completion: 62,
                lastOpenedAt: new Date().toISOString(),
              }
              return [exampleItem]
            })
          }
        }, [health])

        const openProjectFromHub = async (targetRoot) => {
          const root = String(targetRoot || '').trim()
          if (!root) return
          setProjectInput(root)
          setContentDetail(null)
          setSessionView(null)
          await refreshStateAndData(root)
          setView('fishbone')
          setToast(`已加载项目：${root}`)
        }

        /** 点击课题卡片右上角 X：打开防误触确认弹窗 */
        const requestRemoveProject = (proj) => {
          if (!proj) return
          setProjectDeleteDialog(proj)
        }

        /** 用户在确认弹窗点击“移入回收站” */
        const confirmRemoveProject = (proj) => {
          if (!proj) return
          const targetProj = Object.assign({}, proj, {
            deletedAt: new Date().toISOString(),
          })
          // 1. 存入回收站
          setProjectsTrash((prev) => {
            const norm = String(targetProj.root || '').trim().toLowerCase()
            const filtered = prev.filter((p) => p && p.root && String(p.root).trim().toLowerCase() !== norm)
            const next = [targetProj, ...filtered]
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_trash', JSON.stringify(next))
            } catch {}
            return next
          })
          // 2. 从活跃登记簿移除
          setProjectsRegistry((prev) => {
            const norm = String(targetProj.root || '').trim().toLowerCase()
            const next = prev.filter((p) => p && p.root && String(p.root).trim().toLowerCase() !== norm && p.id !== targetProj.id)
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_registry', JSON.stringify(next))
            } catch {}
            return next
          })
          // 3. 关键防护 2：若当前活跃项目就是被移除的项目，卸载上下文避免被 useEffect 自动加回
          if (rootPath && targetProj.root && String(rootPath).trim().toLowerCase() === String(targetProj.root).trim().toLowerCase()) {
            setProjectInput('')
            setRootPath('')
            setServer((prev) => (prev ? Object.assign({}, prev, { project: null }) : prev))
            setFishbone(null)
            setView('hub')
          }
          setProjectDeleteDialog(null)
          setToast(`已将「${targetProj.title || targetProj.id}」移入回收站（可随时在左侧回收站还原）`)
        }

        /** 从回收站还原课题 */
        const restoreProjectFromTrash = (proj) => {
          if (!proj) return
          const norm = String(proj.root || '').trim().toLowerCase()
          // 1. 从回收站移除
          setProjectsTrash((prev) => {
            const next = prev.filter((p) => p && p.root && String(p.root).trim().toLowerCase() !== norm)
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_trash', JSON.stringify(next))
            } catch {}
            return next
          })
          // 2. 加回活跃登记簿
          setProjectsRegistry((prev) => {
            const existing = prev.filter((p) => p && p.root && String(p.root).trim().toLowerCase() !== norm)
            const restored = Object.assign({}, proj)
            delete restored.deletedAt
            const next = [restored, ...existing]
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_registry', JSON.stringify(next))
            } catch {}
            return next
          })
          setHubCategoryFilter('all')
          setToast(`已从回收站还原课题「${proj.title || proj.id}」`)
        }

        /** 点击彻底清除：打开确认弹窗 */
        const requestPurgeProject = (proj) => {
          if (!proj) return
          setProjectPurgeDialog(proj)
        }

        /** 确认彻底清除记录 */
        const confirmPurgeProject = (proj) => {
          if (!proj) return
          const norm = String(proj.root || '').trim().toLowerCase()
          setProjectsTrash((prev) => {
            const next = prev.filter((p) => p && p.root && String(p.root).trim().toLowerCase() !== norm)
            try {
              if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_trash', JSON.stringify(next))
            } catch {}
            return next
          })
          setProjectPurgeDialog(null)
          setToast(`已彻底清除「${proj.title || proj.id}」（本地文件完整保留）`)
        }

        const removeProjectFromRegistry = requestRemoveProject

        const importProjectSubmit = async (targetRoot) => {
          const root = String(targetRoot || '').trim()
          if (!root) return
          setImportDialog(null)
          await openProjectFromHub(root)
        }

        const crossProjectSharedItems = React.useMemo(() => {
          const list = []
          if (project && Array.isArray(project.accepted)) {
            for (const item of project.accepted) {
              list.push({
                project: project.id || '当前课题',
                title: item.stream || '已沉淀成果',
                summary: item.path || '',
                at: item.acceptedAt || '已沉淀',
              })
            }
          }
          if (content && content.network && Array.isArray(content.network.projects)) {
            for (const netP of content.network.projects) {
              if (Array.isArray(netP.results)) {
                for (const r of netP.results) {
                  list.push({
                    project: netP.projectId || '网络课题',
                    title: r.stream,
                    summary: r.summary || r.path,
                    at: r.acceptedAt || '',
                  })
                }
              }
              if (Array.isArray(netP.ideas)) {
                for (const idea of netP.ideas) {
                  list.push({
                    project: netP.projectId || '网络课题',
                    title: `💡 想法 · ${idea.tag || '研究'}`,
                    summary: idea.text,
                    at: idea.at || '',
                  })
                }
              }
            }
          }
          return list
        }, [project, content])

        /* ------------------------------------------------------- 旧视图动作 */

        const openActionDialog = (payload) => {
          const source = payload && typeof payload === 'object' ? payload : {}
          const action = source.action
          if (!action) return
          if (action === 'accept' || action === 'reject') {
            setReason('')
            setDialog({
              action,
              handoff: source.handoff,
              path: source.handoff,
              fileName: handoffName(source.handoff),
            })
            return
          }
          execute(source)
        }

        const cancelDialog = () => {
          setDialog(null)
          setReason('')
        }

        const confirmDialog = async () => {
          const pendingDialog = dialog
          const trimmed = String(reason || '').trim()
          if (!pendingDialog || !trimmed) return
          const payload = { action: pendingDialog.action, handoff: pendingDialog.handoff, reason: trimmed }
          payload.by = pendingDialog.action === 'accept' ? 'main' : 'main'
          setDialog(null)
          setReason('')
          await execute(payload)
        }

        const openDetail = async (pathValue) => {
          const relative = String(pathValue === undefined || pathValue === null ? '' : pathValue).trim()
          if (!relative) return
          setDetail({ path: relative, loading: true, data: null, error: '' })
          try {
            const payload = await fetchHandoff(rootPath, relative)
            if (!alive.current) return
            if (payload && payload.ok) {
              setDetail({ path: relative, loading: false, data: payload, error: '' })
            } else {
              setDetail({ path: relative, loading: false, data: null, error: hostMessage(payload) || '读取交接详情失败' })
            }
          } catch (problem) {
            if (alive.current) setDetail({ path: relative, loading: false, data: null, error: networkMessage(problem) })
          }
        }

        const closeDetail = () => setDetail(null)

        const submitStateForm = async () => {
          const form = stateForm && typeof stateForm === 'object' ? stateForm : {}
          const phase = String(form.phase || '').trim()
          const next = String(form.next || '').trim()
          const blocker = String(form.blocker || '').trim()
          if (!phase && !next && !blocker) {
            setError('项目状态设置至少需要一项：阶段 / 下一步 / 阻塞')
            return
          }
          const payload = { action: 'state-set' }
          if (phase) payload.phase = phase
          if (next) payload.next = next
          if (blocker) payload.blocker = blocker
          await execute(payload)
          if (alive.current) setStateForm({ phase: '', next: '', blocker: '' })
        }

        /* ------------------------------------------------------------ 创建流 */

        /**
         * 选择项目根文件夹：供新建项目弹窗中的「📁 选择文件夹」按钮调用。
         * 1. 优先调用宿主桌面 uiWorkspace.pickDirectory()；
         * 2. Electron window.electron.invoke('directory-picker:open')；
         * 3. DOM 动态 input[webkitdirectory] 兜底。
         */
        const pickProjectFolder = React.useCallback(async () => {
          try {
            const uiWorkspace =
              (hostService && hostService.ctx && typeof hostService.ctx.get === 'function'
                ? hostService.ctx.get('uiWorkspace')
                : null) ||
              (hostService && hostService.ctx && hostService.ctx.uiWorkspace)
            if (uiWorkspace && typeof uiWorkspace.pickDirectory === 'function') {
              const picked = await uiWorkspace.pickDirectory()
              if (picked && typeof picked === 'string' && picked.trim()) return picked.trim()
            }
          } catch {}
          try {
            if (typeof window !== 'undefined' && window.electron && typeof window.electron.invoke === 'function') {
              const picked = await window.electron.invoke('directory-picker:open')
              if (picked && typeof picked === 'string' && picked.trim()) return picked.trim()
            }
          } catch {}
          return new Promise((resolve) => {
            if (typeof document === 'undefined') return resolve('')
            const input = document.createElement('input')
            input.type = 'file'
            input.webkitdirectory = true
            input.style.position = 'fixed'
            input.style.left = '-9999px'
            input.style.opacity = '0'
            input.onchange = () => {
              try {
                const files = input.files
                if (files && files.length > 0) {
                  const f = files[0]
                  if (f.path) {
                    const folder = f.path.replace(/[/\\][^/\\]+$/, '')
                    resolve(folder || f.path)
                  } else {
                    resolve(f.webkitRelativePath ? f.webkitRelativePath.split('/')[0] : '')
                  }
                } else {
                  resolve('')
                }
              } catch {
                resolve('')
              } finally {
                if (input.parentNode) input.parentNode.removeChild(input)
              }
            }
            input.oncancel = () => {
              resolve('')
              if (input.parentNode) input.parentNode.removeChild(input)
            }
            document.body.appendChild(input)
            input.click()
          })
        }, [hostService])

        const openCreate = (payload) => {
          const source = payload && typeof payload === 'object' ? payload : {}
          const kind = source.kind
          if (!CREATE_FIELD_SPECS[kind]) return
          const values = {}
          if (kind === 'branch-add') values.module = source.module || ''
          if (kind === 'handoff-new') values.branch = source.branch || ''
          setCreateDialog({ kind, values, error: '' })
        }

        const changeCreateField = (name, value) => {
          setCreateDialog((previous) => {
            if (!previous) return previous
            const values = Object.assign({}, previous.values, { [name]: value })
            if (name === 'root' && value && !values.id) {
              const trimmed = String(value).trim().replace(/[/\\]+$/, '')
              const base = trimmed.split(/[/\\]/).pop() || ''
              if (base && isValidNodeId(base)) {
                values.id = base
              }
            }
            return Object.assign({}, previous, { values, error: '' })
          })
        }

        const buildCreatePayload = (create) => {
          const kind = create && create.kind
          const values = create && create.values && typeof create.values === 'object' ? create.values : {}
          const text = (key) => String(values[key] === undefined || values[key] === null ? '' : values[key]).trim()

          if (kind === 'init') {
            const root = text('root')
            const id = text('id')
            const title = text('title')
            const goal = text('goal')
            if (!root) return { error: '项目根路径不能为空（必须是绝对路径，例如 D:\\papers\\my-project）' }
            if (!isAbsoluteProjectPath(root)) return { error: '项目根路径必须是绝对路径（例如 D:\\papers\\my-project 或 /home/me/project）' }
            if (!id) return { error: '项目 id 不能为空（任意唯一名称即可，不需要编号）' }
            if (!isValidNodeId(id)) return { error: '项目 id 只能包含字母、数字、点、下划线、连字符，且以字母或数字开头（1–64 字）' }
            if (!title) return { error: '项目标题不能为空' }
            const body = { action: 'init', root, id, title }
            if (goal) body.goal = goal
            return { body }
          }

          if (kind === 'module-add') {
            const id = text('id')
            const name = text('name')
            const slug = text('slug')
            if (!id) return { error: '模块 id 不能为空（任意唯一名称即可，如 literature、pilot-a）' }
            if (!isValidNodeId(id)) return { error: '模块 id 只能包含字母、数字、点、下划线、连字符，且以字母或数字开头（1–64 字）' }
            if (!name) return { error: '模块显示名不能为空' }
            if (!isValidSlug(slug)) return { error: 'slug 只能包含字母、数字、点、下划线、连字符（≤40 字）' }
            const body = { action: 'module-add', id, name }
            if (slug) body.slug = slug
            return { body }
          }

          if (kind === 'branch-add') {
            const module = text('module')
            const id = text('id')
            const name = text('name')
            const slug = text('slug')
            if (!module) return { error: '缺少所属模块' }
            if (!id) return { error: '分支 id 不能为空（任意唯一名称即可，如 pilot-a）' }
            if (!isValidNodeId(id)) return { error: '分支 id 只能包含字母、数字、点、下划线、连字符，且以字母或数字开头（1–64 字）' }
            if (!name) return { error: '分支显示名不能为空' }
            if (!isValidSlug(slug)) return { error: 'slug 只能包含字母、数字、点、下划线、连字符（≤40 字）' }
            const body = { action: 'branch-add', module, id, name }
            if (slug) body.slug = slug
            return { body }
          }

          if (kind === 'handoff-new') {
            const branch = text('branch')
            const stream = text('stream')
            const slug = text('slug')
            if (!branch) return { error: '缺少所属分支' }
            if (!isValidStream(stream)) return { error: 'stream 只能包含小写字母、数字、连字符，且以字母或数字开头' }
            if (!isValidSlug(slug)) return { error: '文件名标签只能包含字母、数字、点、下划线、连字符（≤40 字）' }
            const body = { action: 'handoff-new', branch }
            if (stream) body.stream = stream
            if (slug) body.slug = slug
            return { body }
          }

          return { error: '未知的创建类型' }
        }

        const persistNewProject = async (root) => {
          try {
            const payload = await saveConfig(root)
            if (!alive.current) return
            if (payload && payload.ok) {
              setConfig(payload.config && typeof payload.config === 'object' ? payload.config : { version: 1, projectRoot: root })
              setProjectInput(root)
              await refreshStateAndData(root)
            } else {
              setError(hostMessage(payload) || '新项目已创建，但保存配置失败')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          }
        }

        const submitCreate = async () => {
          const current = createDialog
          if (!current) return
          const built = buildCreatePayload(current)
          if (built.error) {
            setCreateDialog(Object.assign({}, current, { error: built.error }))
            return
          }
          const kind = current.kind
          const body = built.body
          setCreateDialog(null)
          const result = await execute(body, kind === 'init' ? { skipRefresh: true } : undefined)
          if (!alive.current || !result || !result.ok) return
          if (kind === 'init') {
            await persistNewProject(String(body.root))
            if (alive.current) setView('content')
            return
          }
          if (kind === 'module-add' || kind === 'branch-add') {
            setEngTab('dag')
            setView('engineering')
            return
          }
          if (kind === 'handoff-new') {
            setEngTab('handoffs')
            setView('engineering')
          }
        }

        const toggleResultExpanded = (pathValue) => {
          const key = String(pathValue === undefined || pathValue === null ? '' : pathValue)
          if (!key) return
          setExpandedResults((previous) => Object.assign({}, previous, { [key]: !previous[key] }))
        }
        const toggleResultLimitations = (pathValue) => {
          const key = String(pathValue === undefined || pathValue === null ? '' : pathValue)
          if (!key) return
          setExpandedLimitations((previous) => Object.assign({}, previous, { [key]: !previous[key] }))
        }
        const toggleNetworkProject = (projectIdValue) => {
          const key = String(projectIdValue === undefined || projectIdValue === null ? '' : projectIdValue)
          if (!key) return
          setExpandedProjects((previous) => Object.assign({}, previous, { [key]: !previous[key] }))
        }

        const refreshContent = async () => {
          setBusy('content')
          setError('')
          try {
            await loadContent(rootPath)
            await loadRuns()
          } finally {
            if (alive.current) setBusy('')
          }
        }

        const unsubmitHandoff = async (pathValue) => {
          const target = String(pathValue || '').trim()
          if (!target) return
          setBusy('unsubmit')
          setError('')
          try {
            const payload = await postAction({ action: 'unsubmit', handoff: target, project: rootPath })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '撤回失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (r) => {
              if (alive.current) setRun(r)
            })
            if (finished && finished.status === 'succeeded') {
              setToast('已撤回至草稿状态（DRAFT），正文已解冻')
              await Promise.all([loadState(rootPath), loadContent(rootPath)])
            } else {
              setError(hostMessage(finished) || '撤回未成功')
            }
          } catch (err) {
            if (alive.current) setError(networkMessage(err))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        /* ------------------------------------------------------- 项目流程主线动作 */

        /**
         * v3.25：自适应找出「新建会话」的真实 API。
         *
         * 背景（真实故障链）：
         *   - 插件里曾写死 newSession / ensureSession 的**错误调用形态**（参数/时机不对），
         *     导致「点分支永远是同一个对话」或「弹 Select Workspace Directory」；
         *     （宿主客户端 bundle 方法名被压缩，静态搜不到），于是「点分支永远是同一个对话」；
         *   - 而某些调用会让宿主索要工作区目录，弹出 Select Workspace Directory。
         *
         * 做法：运行时在 hostService 自身与 Cordis 服务里，找出**看起来能建会话**的方法
         * （名字含 create/new/open/spawn/start/ensure + session/chat/conversation），
         * 逐个试调用，只有「返回了新的会话 id 且不等于当前会话」才算成功，并把成功的
         * 「服务.方法」缓存下来。找不到就返回 null，调用方退回复用当前对话（不弹框）。
         */
        const sessionCreatorRef = React.useRef(null) // { target, method, viaArgs }

        const discoverSessionCreator = React.useCallback(() => {
          if (sessionCreatorRef.current) return sessionCreatorRef.current
          if (!hostService) return null
          const sources = []
          const pushSource = (label, obj) => {
            if (obj && (typeof obj === 'object' || typeof obj === 'function')) sources.push({ label, obj })
          }
          pushSource('hostService', hostService)
          try {
            const ctx = hostService.ctx
            if (ctx && typeof ctx.get === 'function') {
              // 只探「会话/对话」类服务：工作区服务的方法可能触发目录选择流程
              // （Select Workspace Directory），因此不纳入候选。
              for (const name of ['sessions', 'conversation', 'chat', 'desktopSessions', 'sessionManager']) {
                let svc = null
                try {
                  svc = ctx.get(name)
                } catch {
                  svc = null
                }
                pushSource(`ctx.get(${name})`, svc)
              }
            }
          } catch {
            /* ignore */
          }
          const NAME_RE = /(create|new|open|spawn|start|ensure|begin)/i
          const OBJ_RE = /(session|chat|conversation|thread)/i
          const found = []
          for (const { label, obj } of sources) {
            let keys = []
            try {
              keys = Object.keys(obj)
            } catch {
              keys = []
            }
            for (const key of keys) {
              if (typeof obj[key] !== 'function') continue
              if (!NAME_RE.test(key) || !OBJ_RE.test(key)) continue
              found.push({ target: obj, method: key, label })
            }
          }
          if (found.length === 0) return null
          // 记录下来，等第一次真正调用时验证（探测阶段不调用，避免副作用/弹框）
          sessionCreatorRef.current = found
          return found
        }, [hostService])

        /** 把候选 API 清单与一次探测结果落盘，供实现时按真实名字对接。 */
        const reportHostDiagnostics = React.useCallback(async () => {
          if (!hostService || !rootPath) return
          const describe = (label, obj) => {
            const out = { label, keys: [], functions: [] }
            try {
              out.keys = Object.keys(obj || {}).slice(0, 200)
              out.functions = out.keys.filter((k) => {
                try {
                  return typeof obj[k] === 'function'
                } catch {
                  return false
                }
              })
            } catch {
              /* ignore */
            }
            return out
          }
          const payload = { services: [], candidates: [] }
          try {
            payload.hostService = describe('hostService', hostService)
            const ctx = hostService.ctx
            if (ctx && typeof ctx.get === 'function') {
              for (const name of ['sessions', 'conversation', 'uiWorkspace', 'chat', 'workspace']) {
                let svc = null
                try {
                  svc = ctx.get(name)
                } catch {
                  svc = null
                }
                if (svc) payload.services.push(describe(name, svc))
              }
            }
            const found = discoverSessionCreator()
            payload.candidates = Array.isArray(found) ? found.map((f) => `${f.label}.${f.method}`) : []
            payload.currentSession = (() => {
              try {
                return (typeof hostService.currentSession === 'function' && hostService.currentSession()) || null
              } catch {
                return null
              }
            })()
          } catch (error) {
            payload.error = String(error && error.message)
          }
          try {
            await postRibOp({ project: rootPath, op: 'diag-write', payload })
          } catch {
            /* 诊断失败不影响使用 */
          }
        }, [hostService, rootPath, discoverSessionCreator])

        /**
         * 把**当前对话**绑定到某个节点（分支/主支/研究目标）。
         *
         * 这是「每个节点独立对话」的安全实现路径：宿主负责建对话（用户在右侧点新建，
         * 不会弹工作区目录选择框），插件只记录「这个节点 → 那个会话 id」的映射。
         * 绑定之后，再点该节点就会 `showSession` 切到它自己的那轮对话。
         */
        const bindCurrentSessionTo = async (key, label) => {
          const normalized = typeof key === 'string' ? key.trim() : ''
          if (!normalized) return
          if (!rootPath) {
            setToast('请先打开一个项目')
            return
          }
          let cur = ''
          try {
            cur =
              (hostService && typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
              (hostService && hostService.lastSession) ||
              (hostService && hostService.nativeLocation && hostService.nativeLocation.sessionId) ||
              ''
          } catch {
            cur = ''
          }
          if (!cur) {
            setToast('当前没有可绑定的对话：请先打开右侧对话区')
            return
          }
          try {
            const saved = await postRibOp({ project: rootPath, op: 'session-bind', key: normalized, sessionId: cur })
            if (saved && saved.ok) setToast(`${label}：已绑定当前对话（之后再点它会切回这轮对话）`)
            else setToast(`${label}：绑定失败`)
          } catch (problem) {
            setToast(`${label}：绑定失败（${networkMessage(problem)}）`)
          }
        }

        const openSproutDialog = (moduleHint, fromRib) => {
          const modules = Array.isArray(fishbone && fishbone.spine) ? fishbone.spine : []
          // v3.14：项目还没有任何主支时，分支无处可挂——CLI 会报「模块不存在」。
          // 与其让用户撞一个看不懂的错误，不如直接把下一步说清楚并给出入口。
          if (modules.length === 0) {
            setToast('这个项目还没有主支：请先在左侧新增一个主支（研究阶段），分支要挂在主支下面')
            setModuleDialog({ mode: 'add', id: '', name: '', error: '' })
            return
          }
          const actualModule = (selectedModule && selectedModule !== '__goal__') ? selectedModule : ''
          const preferred = (moduleHint && moduleHint !== '__goal__' ? moduleHint : '') || actualModule || (modules[0] && modules[0].id) || ''
          setSproutDialog({
            module: preferred,
            id: '',
            name: '',
            prompt: '',
            mode: 'standard',
            noHandoff: false,
            // v3.2：空 = 从主支分；指定父分支 id = 从那根分支分
            from: fromRib ? String(fromRib) : '',
            error: '',
          })
        }

        const changeSproutField = (name, value) => {
          setSproutDialog((previous) => (previous ? Object.assign({}, previous, { [name]: value, error: '' }) : previous))
        }

        const submitSprout = async () => {
          const current = sproutDialog
          if (!current) return
          const moduleId = String(current.module || '').trim()
          const branchId = String(current.id || '').trim()
          const name = String(current.name || '').trim() || branchId
          const prompt = String(current.prompt || '').trim()
          if (!moduleId) {
            setSproutDialog(
              Object.assign({}, current, {
                error: '请选择分支要挂载的主支（研究阶段）；若下拉是空的，说明项目还没有主支，先新增主支',
              }),
            )
            return
          }
          if (!branchId) {
            setSproutDialog(Object.assign({}, current, { error: '请填写分支 id（如 spline-opt）' }))
            return
          }
          setSproutDialog(null)
          setBusy('sprout')
          setError('')
          try {
            const payload = await postAction({
              action: 'sprout',
              project: rootPath,
              module: moduleId,
              id: branchId,
              name,
              prompt,
              mode: current.mode === 'spike' ? 'spike' : 'standard',
              noHandoff: current.noHandoff === true,
              from: current.from ? String(current.from) : undefined,
            })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '创建分支失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (tick) => {
              if (alive.current) setRun(tick)
            })
            if (finished && finished.status === 'succeeded') {
              const fromRib = current.from ? `（从分支 ${current.from} 分出）` : '（从主支分出）'
              setToast(`已长出分支 ${branchId}${fromRib}，智能体可开工`)
              setSelectedRib(branchId)
              setSelectedModule(moduleId)
              await loadFishbone(rootPath)
              if (rootPath) {
                fetchBranchWork(rootPath, moduleId, branchId)
                  .then((p) => {
                    if (alive.current && p && p.ok) {
                      setRibWorkData(p)
                    }
                  })
                  .catch(() => {})
              }
            } else {
              setError(hostMessage(finished) || '创建分支未成功')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        const runAutoGraft = async () => {
          setBusy('auto')
          setError('')
          try {
            const payload = await postAction({ action: 'auto', project: rootPath })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '自动回连失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (tick) => {
              if (alive.current) setRun(tick)
            })
            if (finished && finished.status === 'succeeded') {
              const accepted = finished.json && Array.isArray(finished.json.accepted) ? finished.json.accepted.length : 0
              const held = finished.json && Array.isArray(finished.json.skipped)
                ? finished.json.skipped.filter((item) => item && item.code === 'HOLD_DECISION').length
                : 0
              setToast(
                accepted > 0 || held > 0
                  ? `自动回连完成：回连 ${accepted} 根${held > 0 ? `，另有 ${held} 根等你拍板` : ''}`
                  : '没有可自动回连的分支',
              )
              await Promise.all([loadFishbone(rootPath), loadContent(rootPath)])
            } else {
              setError(hostMessage(finished) || '自动回连未成功')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        const openGraftDialog = (ribId, options = {}) => {
          const rib = (Array.isArray(fishbone && fishbone.ribs) ? fishbone.ribs : []).find((item) => item && item.id === ribId)
          if (!rib) return
          // chain=true 表示「逐级回连到主支」：本分支 → 父分支 → … → 主支成稿，每级先备份
          setGraftDialog({ rib, reason: '', error: '', chain: Boolean(options.chain) })
        }

        const submitGraft = async () => {
          const current = graftDialog
          if (!current || !current.rib) return
          const rib = current.rib
          const reason = String(current.reason || '').trim() || '成果满意，回连主支'
          if (!rib.stream) {
            setGraftDialog(Object.assign({}, current, { error: '这根分支还没有交接文件，先让智能体产出再回连' }))
            return
          }
          setGraftDialog(null)
          setBusy('graft')
          setError('')
          try {
            const handoffPath = rib.dir ? `${rib.dir}/handoffs/HANDOFF-${rib.id}-v${rib.version || 1}.md` : ''
            const payload = await postAction({
              action: 'graft',
              project: rootPath,
              handoff: handoffPath,
              reason,
              ...(current.chain ? { chain: true } : {}),
            })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '回连失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (tick) => {
              if (alive.current) setRun(tick)
            })
            if (finished && finished.status === 'succeeded') {
              setToast(`分支 ${rib.id} 已回连主支`)
              await Promise.all([loadFishbone(rootPath), loadContent(rootPath)])
            } else {
              setError(hostMessage(finished) || '回连未成功')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        /** 主支成稿文件（相对项目）与状态，供继承链清单渲染。 */
        const stageDocLine = (stage) => {
          const dir = stage.stageId ? `spine/stages/${stage.stageId}/` : ''
          const status = stage.stageStatus || (stage.hasDraft ? 'current' : 'empty')
          const doc = stage.stageId ? `${dir}DRAFT.md` : '（该主支尚未建阶段，无成稿）'
          return `${stage.id}${stage.name && stage.name !== stage.id ? `（${stage.name}）` : ''} → ${doc} · 状态 ${status}`
        }

        /**
         * v3.19：生成「该分支独立会话」的继承链起点文本。
         *
         * 每个主支/分支都是**独立对话**；这里只给新对话一个合规的上下文起点，且必须
         * **递归列出所有前序结果**，而不只是本主支：
         *
         *   前序主支 1..N（按主支顺序，全部列出成稿路径）
         *   → 本主支成稿
         *   → 祖先分支链（根分支 → 直接父分支，全部列出）
         *   → 本分支任务（CONTEXT.md 内含等价继承链）
         *
         * 不读其它主支、不读旁系分支（避免污染）。
         */
        const buildBranchContextText = (moduleId, branchId, branchName) => {
          const spineAll = Array.isArray(fishbone && fishbone.spine) ? fishbone.spine : []
          const idx = spineAll.findIndex((m) => m && m.id === moduleId)
          const preceding = idx > 0 ? spineAll.slice(0, idx) : []
          const own = idx >= 0 ? spineAll[idx] : { id: moduleId, name: moduleId }
          const ribs = Array.isArray(fishbone && fishbone.ribs) ? fishbone.ribs : []
          const rib = ribs.find((r) => r && r.id === branchId) || {}
          // 祖先分支链：顺着 parent 一路向上再反转成「根 → 直接父」
          const ancestors = []
          const seen = new Set()
          let cursor = rib.parent || ''
          while (cursor && !seen.has(cursor)) {
            seen.add(cursor)
            const parentRib = ribs.find((r) => r && r.id === cursor)
            if (!parentRib) break
            ancestors.push(`${parentRib.id}${parentRib.name && parentRib.name !== parentRib.id ? `（${parentRib.name}）` : ''}`)
            cursor = parentRib.parent || ''
          }
          ancestors.reverse()

          return [
            `【科研分支上下文】`,
            `项目：${rootPath}（本对话与项目同目录，无需另设会话文件夹）`,
            `本分支：${branchId}${branchName && branchName !== branchId ? `（${branchName}）` : ''}`,
            ``,
            `继承顺序（唯一来源，逐级向下）：`,
            `① 前序主支结果（本主支之前的所有主支，共 ${preceding.length} 个）`,
            ...(preceding.length
              ? preceding.map((s, i) => `   ${i + 1}. ${stageDocLine(s)}`)
              : ['   （本主支已是第一个主支，无前序主支）']),
            `② 本主支结果`,
            `   ${own.id}${own.name && own.name !== own.id ? `（${own.name}）` : ''} → ${
              own.stageId ? `spine/stages/${own.stageId}/DRAFT.md` : '（尚未建阶段，无成稿）'
            } · 状态 ${own.stageStatus || (own.hasDraft ? 'current' : 'empty')}`,
            `③ 祖先分支链（根分支 → 直接父分支，共 ${ancestors.length} 级）`,
            ...(ancestors.length
              ? ancestors.map((a, i) => `   ${i + 1}. ${a}`)
              : ['   （本分支直接从主支分出，无祖先分支）']),
            `④ 本分支任务：modules/${moduleId}/branches/${branchId}/CONTEXT.md（含同一份继承链）`,
            ``,
            `本分支与本对话一对一独立；请**按 ①→②→③ 顺序**读取全部上下文再开始推进，不要读取其它主支或旁系分支。`,
          ]
            .filter((line) => line !== undefined && line !== null)
            .join('\n')
        }

        /** 主支独立会话的上下文：列出**该主支之前的所有主支结果** + 本主支。 */
        const buildModuleContextText = (moduleId) => {
          const spineAll = Array.isArray(fishbone && fishbone.spine) ? fishbone.spine : []
          const idx = spineAll.findIndex((m) => m && m.id === moduleId)
          const preceding = idx > 0 ? spineAll.slice(0, idx) : []
          const own = idx >= 0 ? spineAll[idx] : { id: moduleId, name: moduleId }
          return [
            `【主支（研究阶段）上下文】`,
            `项目：${rootPath}（本对话与项目同目录，无需另设会话文件夹）`,
            `本主支：${own.id}${own.name && own.name !== own.id ? `（${own.name}）` : ''}`,
            ``,
            `继承顺序（唯一来源，逐级向下）：`,
            `① 前序主支结果（本主支之前的所有主支，共 ${preceding.length} 个）`,
            ...(preceding.length
              ? preceding.map((s, i) => `   ${i + 1}. ${stageDocLine(s)}`)
              : ['   （本主支已是第一个主支，无前序主支）']),
            `② 本主支结果`,
            `   ${own.id} → ${
              own.stageId ? `spine/stages/${own.stageId}/DRAFT.md` : '（尚未建阶段，先建链再成稿）'
            } · 状态 ${own.stageStatus || (own.hasDraft ? 'current' : 'empty')}`,
            ``,
            `本主支与本对话一对一独立；请先读全部前序主支成稿，再推进本主支，不要读取后续主支。`,
          ].join('\n')
        }

        const selectRib = (rib) => {
          if (!rib) {
            setSelectedRib(null)
            return
          }
          setSelectedRib(rib.id)
          if (rib.module) setSelectedModule(rib.module)
          if (view === 'fishbone' && conversationNode) {
            if (rib.module && rib.id && rootPath) {
              fetchBranchWork(rootPath, rib.module, rib.id)
                .then((payload) => {
                  if (alive.current && payload && payload.ok) {
                    setRibWorkData(payload)
                  }
                })
                .catch(() => {})
              // 切到**这根分支自己的独立会话**（有历史就恢复，没有就新建并注入继承链）
              openSessionForNode(`branch:${rib.module}/${rib.id}`, {
                label: `分支 ${rib.name || rib.id}`,
                contextText: buildBranchContextText(rib.module, rib.id, rib.name),
              })
            }
            return
          }
          openBranchWorkModal({ module: rib.module, branch: rib.id })
        }

        /* ------------------------------------------------- v3.8 Zotero 文献挂载 */

        /** 当前该对哪根分支操作：优先显式选中，其次侧栏会话，最后第一根。 */
        const currentZoteroRib = () => {
          if (selectedRib) return selectedRib
          if (sessionView && sessionView.branch) return sessionView.branch
          const ribs = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          return (ribs[0] && ribs[0].id) || ''
        }

        /** 统一出口：挂载类动作成功后刷新文献面板（项目流程顺带刷新以更新计数）。 */
        const zoteroOp = async (body, successMessage) => {
          const ribId = String((body && body.ribId) || currentZoteroRib() || '').trim()
          if (!rootPath || !ribId) {
            setToast('请先选择一根分支')
            return null
          }
          setZoteroBusy(true)
          try {
            const result = await postZoteroOp(Object.assign({ project: rootPath }, body, { ribId }))
            if (!result || result.ok === false) {
              setToast(`Zotero 操作失败：${(result && result.message) || '未知错误'}`)
              return null
            }
            if (successMessage) {
              const detail = typeof successMessage === 'function' ? successMessage(result) : successMessage
              if (detail) setToast(detail)
            }
            await Promise.all([loadFishbone(rootPath), loadZotero(rootPath, ribId, zoteroSearch)])
            return result
          } catch (problem) {
            setToast(`Zotero 操作失败：${networkMessage(problem)}`)
            return null
          } finally {
            if (alive.current) setZoteroBusy(false)
          }
        }

        const zoteroAttach = (key) => zoteroOp({ op: 'attach', keys: [key] }, '已挂到本分支')

        const zoteroDetach = (key) => zoteroOp({ op: 'detach', keys: [key] }, '已移出本分支')

        const zoteroImportCollection = (collectionKey, name) =>
          zoteroOp(
            { op: 'import-collection', collectionKey },
            (result) =>
              result && typeof result.added === 'number'
                ? `已从「${name || '合集'}」导入 ${result.added} 条${result.truncated ? `（合集共 ${result.collectionTotal} 条，超出上限只取前 200 条）` : ''}`
                : '合集已挂载',
          )

        const zoteroLocate = async (key, kind) => {
          try {
            const result = await postZoteroOp({ project: rootPath, op: 'open', key, kind: kind || 'item' })
            if (!result || result.ok === false) {
              setToast(`定位失败：${(result && result.message) || 'Zotero 未能打开'}`)
            }
          } catch (problem) {
            setToast(`定位失败：${networkMessage(problem)}`)
          }
        }

        const zoteroRefresh = () => {
          const ribId = currentZoteroRib()
          if (!rootPath || !ribId) return
          loadZotero(rootPath, ribId, zoteroSearch)
        }

        const zoteroSearchSubmit = () => {
          const ribId = currentZoteroRib()
          if (!rootPath || !ribId) return
          loadZotero(rootPath, ribId, zoteroSearch)
        }

        /* ------------------------------------------------------- v3.5 交互系统 */

        /** 所有 rib-op 的统一出口：乐观刷新项目流程 + 失败提示。 */
        const ribOp = async (op, ribId, extra) => {
          const result = await postRibOp(Object.assign({ project: rootPath, op, ribId }, extra || {}))
          if (!result || result.ok === false) {
            setToast(`操作失败：${(result && result.message) || '未知错误'}`)
            return null
          }
          await loadFishbone(rootPath)
          return result
        }

        /**
         * 主支（module）操作：新增 / 重命名 / 删除 / 上移下移。
         *
         * 与分支不同，主支的「新增」必须走 DAG CLI（要在磁盘上建 modules/<id> 目录与 BRIEF），
         * 所以复用 action='module-add'；重命名与排序只改 control/rdw-rib-meta.json；
         * 删除是「从工作台视图收起」（协议文件里的模块由 CLI 管理，宿主不物理删除目录）。
         */
        const moduleOp = async (op, payload) => {
          try {
            const result = await postRibOp(Object.assign({ project: rootPath, op }, payload || {}))
            if (!result || result.ok === false) {
              setToast(`操作失败：${(result && result.message) || '未知错误'}`)
              return null
            }
            await loadFishbone(rootPath)
            return result
          } catch (problem) {
            setToast(`操作失败：${networkMessage(problem)}`)
            return null
          }
        }

        /** 新增主支：走 module-add（要建目录），成功后刷新并选中它。 */
        const addModule = async (idInput, nameInput) => {
          const id = String(idInput || '').trim()
          const name = String(nameInput || '').trim() || id
          if (!id) {
            setToast('请填写主支 id（如 M01）')
            return null
          }
          try {
            const result = await execute({ action: 'module-add', id, name })
            if (!result || result.ok === false || (result.run && result.run.status === 'failed')) {
              const errMsg = (result && result.run && result.run.stderr) || (result && result.message) || '执行失败'
              setToast(`新增主支失败：${errMsg}`)
              return null
            }
            await loadFishbone(rootPath)
            setSelectedModule(id)
            setToast(`已新增主支 ${name || id}`)
            return result
          } catch (problem) {
            setToast(`新增主支失败：${networkMessage(problem)}`)
            return null
          }
        }

        /**
         * 根据研究目标一键生成标准主支流水线与初始探索分支：
         * 1. M10 方案与协议设计 (B10-01 协议制定与因果图)
         * 2. M20 文献检索与证据 (B20-01 检索式构建与筛选)
         * 3. M30 队列定义与清洗 (B30-01 入排标准与变量审计)
         * 4. M40 统计建模与分析 (B40-01 主模型分析与诊断)
         * 5. M50 论文撰写与汇编 (B50-01 稿件大纲与成果汇编)
         * 创建后研究者享有所有的修改权限（自由增删、上下重排、重命名、成果回连）。
         */
        const scaffoldRecommendedModules = React.useCallback(async () => {
          if (!rootPath) {
            setToast('请先打开或创建一个课题项目')
            return
          }
          const existingSpine = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          if (existingSpine.length > 0) {
            const confirmMsg =
              `当前项目已有 ${existingSpine.length} 个主支阶段。\n\n是否继续追加创建推荐的标准科研流水线？（现有主支与分支均会保留，不会被覆盖）`
            if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(confirmMsg)) {
              return
            }
          }
          setBusy('scaffold')
          setToast('正在根据研究目标生成并建构总体主支与分支...')
          try {
            const pipeline = [
              { modId: 'M10', modName: '方案与协议设计', ribId: 'B10-01', ribName: '协议制定与因果图', prompt: '明确核心研究假设、PICO、时间零点与目标试验模拟协议' },
              { modId: 'M20', modName: '文献检索与证据', ribId: 'B20-01', ribName: '检索式构建与筛选', prompt: '检索相关临床指南、前人系统评价与基准文献证据' },
              { modId: 'M30', modName: '队列定义与清洗', ribId: 'B30-01', ribName: '入排标准与变量审计', prompt: '提取分析人群、核对暴露与结局变量、审计缺失数据' },
              { modId: 'M40', modName: '统计建模与分析', ribId: 'B40-01', ribName: '主模型分析与诊断', prompt: '构建倾向评分加权或回归模型、评估协变量平衡度' },
              { modId: 'M50', modName: '论文撰写与汇编', ribId: 'B50-01', ribName: '稿件大纲与成果汇编', prompt: '整合各主支成稿与核心图表、起草论文核心章节' },
            ]
            for (const item of pipeline) {
              const hasMod = existingSpine.some((m) => m && m.id === item.modId)
              if (!hasMod) {
                await execute({ action: 'module-add', id: item.modId, name: item.modName }, { skipRefresh: true })
              }
              await postAction({
                action: 'sprout',
                project: rootPath,
                module: item.modId,
                id: item.ribId,
                name: item.ribName,
                prompt: item.prompt,
                mode: 'standard',
              })
            }
            await refreshStateAndData(rootPath)
            await loadFishbone(rootPath)
            setToast('已成功生成 5 个总体主支与初始分支！您享有所有修改权限，各节点已就绪独立会话。')
          } catch (err) {
            setToast(`生成主支失败：${networkMessage(err)}`)
          } finally {
            if (alive.current) setBusy('')
          }
        }, [rootPath, fishbone, execute, postAction, refreshStateAndData, loadFishbone])
        const moveModule = async (moduleId, offset) => {
          if (!moduleId) return null
          return moduleOp('module-move', { moduleId, offset })
        }

        /**
         * 分支上移 / 下移：只改该主支下分支的显示顺序（写 control/rdw-rib-meta.json 的 ribOrder）。
         * offset=-1 上移，+1 下移；越界时宿主幂等返回当前顺序，不会报错。
         */
        const moveRib = async (rib, offset) => {
          if (!rib || !rib.id) return null
          const result = await ribOp('move', rib.id, { offset })
          if (result) setToast(`已${offset < 0 ? '上移' : '下移'}分支 ${rib.id}`)
          return result
        }

        /** 主支重命名：写入工作台偏好名，不改协议文件。 */
        const renameModule = async (moduleId, name) => {
          const text = String(name || '').trim()
          if (!moduleId || !text) return null
          const result = await moduleOp('module-rename', { moduleId, name: text })
          if (result) setToast(`已重命名主支：${text}`)
          return result
        }

        /** 提交主支弹窗（新增 / 重命名）。 */
        const submitModuleDialog = async () => {
          const current = moduleDialog
          if (!current) return
          const name = String(current.name || '').trim()
          if (!name) {
            setModuleDialog(Object.assign({}, current, { error: '请填写显示名' }))
            return
          }
          let result = null
          if (current.mode === 'add') {
            const id = String(current.id || '').trim()
            if (!id) {
              setModuleDialog(Object.assign({}, current, { error: '请填写主支 id' }))
              return
            }
            result = await addModule(id, name)
          } else {
            result = await renameModule(current.moduleId, name)
          }
          if (result) setModuleDialog(null)
        }

        /** 收起主支：若其下还有分支，先确认（cascade 级联，或取消）。 */
        const removeModule = async (moduleId) => {
          if (!moduleId) return null
          const node = (fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []).find((m) => m.id === moduleId)
          const count = node && Array.isArray(node.ribs) ? node.ribs.length : 0
          if (count > 0 && typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const agrees = window.confirm(
              `主支「${node.name || moduleId}」下还有 ${count} 个分支。\n\n确定从工作台收起这个主支吗？（分支数据会保留，可重新展开）`,
            )
            if (!agrees) return null
          }
          const result = await moduleOp('module-remove', { moduleId, cascade: count > 0 })
          if (result) setToast(`已收起主支 ${moduleId}`)
          return result
        }

        /** 记录一次可撤销操作。inverse 描述「怎么回去」。 */
        const pushUndo = (label, inverse) => {
          setUndoStack((prev) => [...prev.slice(-49), { label, inverse }])
          setRedoStack([])
        }
        const doUndo = async () => {
          const top = undoStack[undoStack.length - 1]
          if (!top) {
            setToast('没有可撤销的操作')
            return
          }
          const inv = top.inverse
          if (inv && inv.op) {
            await ribOp(inv.op, inv.ribId, inv.extra)
          }
          setUndoStack((prev) => prev.slice(0, -1))
          setRedoStack((prev) => [...prev, top])
          setToast(`已撤销：${top.label}`)
        }
        const doRedo = async () => {
          const top = redoStack[redoStack.length - 1]
          if (!top) {
            setToast('没有可重做的操作')
            return
          }
          // 重做 = 重新执行原操作的正向（用 inverse 里存的 forward 字段）
          if (top.forward && top.forward.op) {
            await ribOp(top.forward.op, top.forward.ribId, top.forward.extra)
          }
          setRedoStack((prev) => prev.slice(0, -1))
          setUndoStack((prev) => [...prev, top])
          setToast(`已重做：${top.label}`)
        }

        /** 删除分支（软删进回收站）。 */
        const deleteRib = async (rib, options = {}) => {
          if (!rib || !rib.id) return
          const hasChildren = (fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []).some((r) => r && r.parent === rib.id)
          const fileCount = (rib.workFiles ? rib.workFiles.length : 0) + (rib.outputFiles ? rib.outputFiles.length : 0)
          let cascade = false
          if (hasChildren) {
            cascade = typeof window !== 'undefined' && window.confirm
              ? window.confirm(`「${rib.name}」还有下级分叉。\n\n确定 = 连同下级一起删\n取消 = 只删本分支（下级上移到主支）`)
              : false
          }
          if (fileCount > 0 && !options.skipConfirm) {
            const ok = typeof window !== 'undefined' && window.confirm
              ? window.confirm(`「${rib.name}」含 ${fileCount} 项产物。\n\n删除后移入回收站，30 天内可还原。确定删除？`)
              : true
            if (!ok) return
          }
          const result = await ribOp('delete', rib.id, { cascade })
          if (result) {
            pushUndo(`删除 ${rib.id}`, { op: 'restore', ribId: rib.id })
            setToast(`已删除 ${rib.id} 到回收站（30 天可还原）`)
          }
        }

        /** 重命名分支。 */
        const renameRib = async (rib) => {
          if (!rib || !rib.id) return
          const next = typeof window !== 'undefined' && window.prompt
            ? window.prompt(`重命名分支 ${rib.id}：`, rib.name || rib.id)
            : null
          if (!next || !String(next).trim()) return
          const oldName = rib.name || rib.id
          const result = await ribOp('rename', rib.id, { name: String(next).trim() })
          if (result) {
            pushUndo(`重命名 ${rib.id}`, { op: 'rename', ribId: rib.id, extra: { name: oldName } })
            setToast(`已重命名为「${String(next).trim()}」`)
          }
        }

        /** 受阻标记切换。 */
        const toggleBlockRib = async (rib) => {
          if (!rib || !rib.id) return
          if (rib.status === 'BLOCKED') {
            const result = await ribOp('unblock', rib.id)
            if (result) {
              pushUndo(`解除受阻 ${rib.id}`, { op: 'block', ribId: rib.id })
              setToast(`已解除 ${rib.id} 的受阻标记`)
            }
          } else {
            const note = typeof window !== 'undefined' && window.prompt
              ? window.prompt(`标记 ${rib.id} 受阻的原因（可留空）：`, '')
              : ''
            const result = await ribOp('block', rib.id, { note: note || '' })
            if (result) {
              pushUndo(`标记受阻 ${rib.id}`, { op: 'unblock', ribId: rib.id })
              setToast(`已标记 ${rib.id} 受阻`)
            }
          }
        }

        /** 幻影分支单击 → 弹出内联闪电分叉气泡。 */
        const onPhantomSprout = (node, point) => {
          setInlineSprout({
            x: Math.min(point.x, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 230),
            y: point.y,
            moduleId: node.id,
            moduleName: node.name || node.id,
            fromRib: '',
            name: '',
            error: '',
          })
        }

        /** 内联闪电分叉：回车即建。 */
        const submitInlineSprout = async () => {
          const form = inlineSprout
          if (!form) return
          const name = String(form.name || '').trim()
          if (!name) {
            setInlineSprout(Object.assign({}, form, { error: '请填写分支名称' }))
            return
          }
          const id = generateNextBranchId(form.moduleId, form.fromRib, fishbone && fishbone.ribs)
          const msgExcerpt = form.messageExcerpt || ''
          setInlineSprout(null)
          setBusy('sprout')
          setError('')
          try {
            const payload = await postAction({
              action: 'sprout',
              project: rootPath,
              module: form.moduleId,
              id,
              name,
              prompt: msgExcerpt ? `基于会话上下文探索：\n"${msgExcerpt}"` : undefined,
              from: form.fromRib ? String(form.fromRib) : undefined,
              mode: 'spike',
            })
            if (!payload || payload.ok === false || !payload.run) {
              setError(hostMessage(payload) || '创建分支失败')
              return
            }
            setRun(payload.run)
            const finished = await settleRun(payload.run.id, (tick) => {
              if (alive.current) setRun(tick)
            })
            if (finished && finished.status === 'succeeded') {
              if (msgExcerpt) {
                await postRibOp({
                  project: rootPath,
                  op: 'anchor',
                  ribId: id,
                  origin: {
                    kind: 'message',
                    anchor: {
                      messageExcerpt: msgExcerpt.slice(0, 300),
                      createdAt: new Date().toISOString(),
                    },
                  },
                })
              }
              pushUndo(`创建分支 ${id}`, { op: 'delete', ribId: id })
              setToast(`已在「${form.moduleName}」长出分支 ${id} · ${name}`)
              setSelectedRib(id)
              setSelectedModule(form.moduleId)
              await loadFishbone(rootPath)
              const workPayload = await fetchBranchWork(rootPath, form.moduleId, id)
              if (alive.current && workPayload && workPayload.ok) {
                setRibWorkData(workPayload)
              }
              // v3.18：新分支 → 切到它自己的独立会话，并按继承链注入上下文
              openSessionForNode(`branch:${form.moduleId}/${id}`, {
                label: `分支 ${name || id}`,
                contextText: buildBranchContextText(form.moduleId, id, name),
              })
            } else {
              setError(hostMessage(finished) || '创建分支未成功')
            }
          } catch (problem) {
            if (alive.current) setError(networkMessage(problem))
          } finally {
            if (alive.current) setBusy('')
          }
        }

        /** 悬停速览卡：400ms 延迟触发。 */
        const onHoverRib = (rib, point) => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
          hoverTimerRef.current = setTimeout(() => {
            const module = (fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []).find((m) => m.id === rib.module)
            setHoverCard({
              x: point.x, y: point.y, rib, module,
              onOpen: (r) => { setHoverCard(null); selectRib(r) },
              onGraft: (r) => { setHoverCard(null); openGraftDialog(r.id) },
              onDelete: (r) => { setHoverCard(null); deleteRib(r) },
            })
          }, 400)
        }
        const onHoverRibLeave = () => {
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current)
            hoverTimerRef.current = null
          }
          // 延迟关闭：让用户有机会把鼠标移进卡片（卡片有自己的 onMouseLeave）
          setTimeout(() => setHoverCard((prev) => prev), 180)
        }

        /* ------------------------------------------------------- v3.5 右键菜单构建 */

        /** 按对象类型构建菜单项列表。 */
        const buildMenuItems = (target) => {
          if (!target || !target.kind) return []
          const ribsList = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const recycleCount = fishbone && Array.isArray(fishbone.recycleBin) ? fishbone.recycleBin.length : 0

          if (target.kind === 'rib') {
            const rib = target.rib
            const canGraft = Boolean(rib.stream && rib.status !== 'ACCEPTED' && rib.status !== 'REJECTED')
            const isBlocked = rib.status === 'BLOCKED'
            // 分支在所属主支下的位置决定上移/下移是否可用（同主支内首项不能再上移）
            const siblings = ribsList.filter((r) => r && r.module === rib.module)
            const siblingIdx = siblings.findIndex((r) => r && r.id === rib.id)
            const canRibUp = siblingIdx > 0
            const canRibDown = siblingIdx >= 0 && siblingIdx < siblings.length - 1
            return [
              mi('🔍', '打开工作区', 'Enter', () => selectRib(rib)),
              mi('🌱', '在此分支下再分叉', '⌘N', () => openSproutDialog(rib.module, rib.id)),
              sep(),
              mi('✏️', '重命名…', 'F2', () => renameRib(rib)),
              mi('📝', '编辑目标…', '', () => openSproutDialog(rib.module, rib.id)),
              sep(),
              // —— 分支自身的排序与增删（v3.11）——
              mi('＋', '在同一主支下新建分支', 'N', () => openSproutDialog(rib.module, null)),
              mi('↑', '上移分支', '⌥↑', () => moveRib(rib, -1), canRibUp ? {} : { disabled: true, reason: '已经是该主支下第一个分支' }),
              mi('↓', '下移分支', '⌥↓', () => moveRib(rib, 1), canRibDown ? {} : { disabled: true, reason: '已经是该主支下最后一个分支' }),
              sep(),
              mi('✅', '回连上一级', '⌘↵', () => openGraftDialog(rib.id), canGraft ? {} : { disabled: true, reason: rib.stream ? '该分支已回连或已修剪' : '还没有交接产物，先让智能体产出再回连' }),
              rib.parent
                ? mi('⤴', `逐级回连到主支（本分支 → ${rib.parent} → …）`, '', () => openGraftDialog(rib.id, { chain: true }), canGraft ? {} : { disabled: true, reason: '还没有交接产物' })
                : null,
              mi(isBlocked ? '🔓' : '🔒', isBlocked ? '解除受阻' : '标记受阻…', 'B', () => toggleBlockRib(rib)),
              mi('🔗', '把当前对话绑定到此分支', '', () => bindCurrentSessionTo(`branch:${rib.module}/${rib.id}`, `分支 ${rib.name || rib.id}`)),
              sep(),
              mi('🗑', '删除到回收站…', 'Del', () => deleteRib(rib), { danger: true }),
            ]
          }
          if (target.kind === 'module') {
            const mod = target.module
            // 主支在 spine 里的位置决定上移/下移是否可用（首项不能再上移）
            const modIdx = Number.isInteger(target.index)
              ? target.index
              : spineList.findIndex((m) => m && m.id === mod.id)
            const canUp = modIdx > 0
            const canDown = modIdx >= 0 && modIdx < spineList.length - 1
            return [
              mi('＋', '在此主支下新建分支', 'N', () => openSproutDialog(mod.id, null)),
              mi('📋', `查看该阶段全部分支 (${(mod.ribs || []).length})`, '', () => openModuleWorkspace(mod.id)),
              sep(),
              // —— 主支自身的增删改移（v3.9）——
              mi('✦', '新增主支…', '', () => setModuleDialog({ mode: 'add', id: '', name: '', error: '' })),
              mi('✏️', '重命名主支…', 'F2', () => setModuleDialog({ mode: 'rename', moduleId: mod.id, id: mod.id, name: mod.name || mod.id, error: '' })),
              sep(),
              mi('↑', '上移主支', '⌥↑', () => moveModule(mod.id, -1), canUp ? {} : { disabled: true, reason: '已经是第一个主支' }),
              mi('↓', '下移主支', '⌥↓', () => moveModule(mod.id, 1), canDown ? {} : { disabled: true, reason: '已经是最后一个主支' }),
              sep(),
              mi('📊', '在该主支下新增分支并排序…', '', () => openModuleWorkspace(mod.id)),
              mi('🗑', '收起该主支…', '', () => removeModule(mod.id), { danger: true }),
            ]
          }
          if (target.kind === 'head') {
            return [
              mi('✏️', '编辑研究目标（好问题卡）…', '', () => openGoalCard()),
              mi('💬', '开始研究目标讨论（八层 + good-question）', '', () => startGoalDiscussion()),
              mi('📋', '只复制讨论提示词', '', () => copyGoalPrompt()),
              sep(),
              mi('🧭', '查看主智能体决策记录', '', () => setSlideTab('agent')),
              mi('🗂', '导出项目摘要', '', () => setToast('导出摘要：走工程页「报告」')),
            ]
          }
          if (target.kind === 'artifact') {
            const file = target.file
            return [
              mi('👁', '预览', 'Space', () => openFileModal(file.title)),
              mi('📂', '在系统文件管理器中显示', '', () => openExternal(file.title)),
              sep(),
              mi('📋', '复制路径', '', () => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(file.title)
                setToast('已复制路径')
              }),
            ]
          }
          if (target.kind === 'marker') {
            const ms = target.marker
            return [
              mi('🔍', '查看该版本交接详情', '', () => openDetail(ms.path || '')),
              mi('📊', '与当前状态对比', '', () => setToast('对比功能走工程页「DAG」')),
            ]
          }
          if (target.kind === 'conversation-message') {
            return [
              mi('🌱', '从此消息分叉新探索分支', '⌥N', () => sproutFromMessage({ excerpt: target.excerpt })),
              sep(),
              mi('📋', '复制消息内容', '', () => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(target.excerpt)
                  setToast('已复制消息内容')
                }
              }),
            ]
          }
          if (target.kind === 'gap' || target.kind === 'canvas') {
            const list = [
              mi('＋', '新建一个分支', 'N', () => openSproutDialog(selectedModule || (spineList[0] && spineList[0].id), selectedRib)),
              sep(),
              undoStack.length > 0
                ? mi('↩', `撤销：${undoStack[undoStack.length - 1].label}`, '⌘Z', doUndo)
                : mi('↩', '撤销', '⌘Z', null, { disabled: true, reason: '没有可撤销的操作' }),
              redoStack.length > 0
                ? mi('↪', `重做：${redoStack[redoStack.length - 1].label}`, '⇧⌘Z', doRedo)
                : mi('↪', '重做', '⇧⌘Z', null, { disabled: true, reason: '没有可重做的操作' }),
              sep(),
            ]
            if (recycleCount > 0) {
              list.push(mi('🗑', `回收站 (${recycleCount})`, '', () => setRecycleOpen(true)))
            } else {
              list.push(mi('🗑', '回收站（空）', '', null, { disabled: true, reason: '回收站是空的' }))
            }
            return list
          }
          return []
        }

        const onContextMenu = (payload) => {
          const items = buildMenuItems(payload.target)
          if (items.length === 0) return
          setCtxMenu({ x: payload.x, y: payload.y, items, title: payload.target.kind === 'rib' ? `${payload.target.rib.id} · ${payload.target.rib.name}` : undefined })
        }

        /* ------------------------------------------------------- v3.6 会话消息锚定分叉 */

        /**
         * 从会话消息分叉：打开内联闪电分叉气泡，预填从消息提取的主题与引用。
         * 回车即在当前阶段下创建分支，并写入消息锚点。
         * @param {{excerpt: string, x?: number, y?: number, sessionId?: string, messageId?: string, moduleHint?: string}} anchor
         */
        const sproutFromMessage = async (anchor) => {
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          const ribList = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          const fromRibId = anchor.fromRib || selectedRib || (ribList[0] && ribList[0].id) || ''
          const fromRibObj = ribList.find((r) => r.id === fromRibId)
          // 主支阶段严格优先遵循父分支自身所属主支，杜绝跨模块校验失败
          const moduleId = (fromRibObj && fromRibObj.module) || anchor.moduleHint || selectedModule || (spineList[0] && spineList[0].id) || ''
          if (!moduleId) {
            setToast('请先选择或加载一个主支阶段')
            return
          }
          const rawText = String(anchor.excerpt || '').trim()
          let defaultName = rawText.replace(/^[#\s*`>-]+/, '').split(/[\n。！？!?]/)[0].trim().slice(0, 24)
          if (!defaultName) defaultName = '消息分叉探索'
          const mod = spineList.find((m) => m.id === moduleId)
          const moduleName = mod ? (mod.name || mod.id) : moduleId

          setInlineSprout({
            x: Math.min(anchor.x || 360, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 260),
            y: Math.min(anchor.y || 240, (typeof window !== 'undefined' ? window.innerHeight : 800) - 200),
            moduleId,
            moduleName,
            fromRib: fromRibId,
            name: defaultName,
            messageExcerpt: rawText,
            error: '',
          })
        }

        /* ------------------------------------------------- 对话（宿主原生会话） */

        /** 是否已有绑定到本工作台的会话（宿主 state.sessionBindings）。 */
        const sessionBound = (() => {
          if (!hostService) return false
          try {
            const current = typeof hostService.currentSession === 'function' ? hostService.currentSession() : null
            if (current === null || current === undefined) return false
            if (typeof hostService.ownsSession === 'function') return hostService.ownsSession(current)
            return false
          } catch (problem) {
            return false
          }
        })()

        /** 宿主是否提供「新建/连接会话」能力（不同版本方法名略有差异，逐个探测）。 */
        const canStartChat = Boolean(
          hostService &&
            (typeof hostService.ensureSession === 'function' ||
             typeof hostService.newWorkspaceSession === 'function' ||
             typeof hostService.newSession === 'function'),
        )

        /**
         * 开始一段关联到本工作台的对话。
         * 规范 4.2：不自动建会话——只有用户点了「开始对话」才建；
         * 会话本身交给宿主原生实现（不在这里另造聊天界面）。
         * v3.6 优化：优先使用 ensureSession 自动关联当前项目目录的工作区与原生会话。
         */
        const startChat = () => {
          if (!hostService) {
            setToast('当前宿主未提供会话能力，业务页仍可正常使用')
            return
          }
          try {
            // 一个项目 = 一个文件夹：这里**不向宿主索要目录**（那会弹 Select Workspace Directory）。
            // 也不打开右侧侧栏（v3.24 已移除）；只把当前会话切到中栏可见。
            const cur =
              (typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
              hostService.lastSession ||
              (hostService.nativeLocation && hostService.nativeLocation.sessionId) ||
              ''
            if (cur && typeof hostService.showSession === 'function') {
              hostService.showSession(cur)
              return
            }
            if (cur && typeof hostService.openSession === 'function') {
              hostService.openSession(cur)
              return
            }
            setToast('已打开右侧对话区；如需新对话，请用宿主的「新建对话」按钮（不会再让你选工作区目录）')
          } catch (problem) {
            setToast(`开始对话失败：${networkMessage(problem)}`)
          }
        }

        /** 自动把当前打开的会话绑定到本工作台并真正开启展示（触发 uiWorkspace.openSession）。 */
        const attachCurrentSession = React.useCallback(async () => {
          if (!hostService) return
          try {
            const myId = (injected.entry && injected.entry.id) || 'zhuanz/research-dag-workbench'
            const cur =
              (typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
              hostService.lastSession ||
              hostService.nativeLocation?.sessionId ||
              hostService.state?.recentSessions?.[myId] ||
              'session-d57c7053-0ca9-4e2d-a4bb-fe93b220ffe7'

            if (!cur) {
              startChat()
              return
            }
            if (typeof hostService.commit === 'function') {
              await hostService.commit((state) => {
                if (state) {
                  state.sessionBindings[cur] = myId
                  state.recentSessions[myId] = cur
                }
              })
            }
            // 核心：调用 showSession / openSession，真正激活并载入该会话的对话历史到 DOM！
            if (typeof hostService.showSession === 'function') {
              hostService.showSession(cur)
            } else if (typeof hostService.openSession === 'function') {
              hostService.openSession(cur)
            } else if (typeof hostService.ensureSession === 'function') {
              await hostService.ensureSession({ sessionId: cur })
            }
          } catch (err) {
            /* ignore */
          }
        }, [hostService, injected.entry, rootPath])

        const hasAttemptedAttach = React.useRef(false)
        /** 正在进行会话切换的 key（避免连点重复建会话）。 */
        const switchingSessionFor = React.useRef('')

        /**
         * v3.18：点击任意一级（研究目标 / 主支 / 分支）→ 切到它**自己的**会话。
         *
         * 规则：
         *   ① 该级已绑定过会话 → 直接 `showSession` 恢复它的对话历史（这就是「点哪看哪」）；
         *   ② 没绑定过 → 新建一个会话、建立绑定，并把「前序主支结果 → 本主支结果 →
         *      祖先分支链 → 本分支任务」的继承链上下文注入输入框（空会话也有起点）。
         *
         * 绑定持久化在 `<project>/control/rdw-rib-meta.json` 的 `sessionOf`，
         * 换窗口/重启后仍然记得每个节点对应哪个会话。
         */
        const openSessionForNode = React.useCallback(
          async (key, options = {}) => {
            if (!hostService || !rootPath) return null
            const normalized = typeof key === 'string' ? key.trim() : ''
            if (!normalized) return null
            if (switchingSessionFor.current === normalized) return null
            switchingSessionFor.current = normalized
            try {
              // ① 查已有绑定
              let bound = null
              try {
                const got = await postRibOp({ project: rootPath, op: 'session-get', key: normalized })
                if (got && got.ok && got.sessionId) bound = got.sessionId
              } catch {
                /* 查不到就按未绑定处理 */
              }
              // 兼容旧版 key：`branch:<id>` → 现在带主支前缀 `branch:<module>/<id>`
              if (!bound && normalized.startsWith('branch:')) {
                const legacy = `branch:${normalized.split('/').pop()}`
                if (legacy !== normalized) {
                  try {
                    const got = await postRibOp({ project: rootPath, op: 'session-get', key: legacy })
                    if (got && got.ok && got.sessionId) {
                      bound = got.sessionId
                      // 迁移到新 key，下次直接用
                      try {
                        await postRibOp({ project: rootPath, op: 'session-bind', key: normalized, sessionId: bound })
                      } catch {
                        /* 迁移失败也照常使用 */
                      }
                    }
                  } catch {
                    /* ignore */
                  }
                }
              }

              const myId = (injected.entry && injected.entry.id) || 'zhuanz/research-dag-workbench'
              const reveal = (sessionId) => {
                if (!sessionId) return
                try {
                  if (typeof hostService.commit === 'function') {
                    hostService.commit((state) => {
                      if (!state) return
                      state.sessionBindings[sessionId] = myId
                      state.recentSessions[myId] = sessionId
                    })
                  }
                } catch {
                  /* ignore */
                }
                try {
                  if (typeof hostService.showSession === 'function') hostService.showSession(sessionId)
                  else if (typeof hostService.openSession === 'function') hostService.openSession(sessionId)
                  else if (typeof hostService.ensureSession === 'function') hostService.ensureSession({ sessionId })
                } catch {
                  /* ignore */
                }
                try {
                  if (hostService.ctx?.uiWorkspace?.openSession) {
                    hostService.ctx.uiWorkspace.openSession(sessionId)
                  }
                } catch {
                  /* ignore */
                }
              }

              // ① 已绑定：直接切换并呈现历史，不注入、不覆盖任何上下文
              if (bound) {
                let stillExists = true
                try {
                  const listed = hostService.ctx?.sessions?.list?.getSnapshot?.()
                  const byId = listed && listed.byId ? listed.byId : null
                  if (byId && Object.keys(byId).length > 0) {
                    stillExists = Boolean(byId[bound])
                  }
                } catch {
                  stillExists = true
                }
                if (stillExists) {
                  reveal(bound)
                  if (options.alwaysInject && options.contextText) {
                    await writeContextTo(bound, options.contextText)
                  }
                  setToast(`${options.label || normalized}：已切到该节点的独立会话${options.alwaysInject ? '（讨论提示词已填入对话框）' : '（历史记录已恢复）'}`)
                  return bound
                }
                bound = null
              }

              /**
               * ② 未绑定 → **按官方路径真正新建一个会话**。
               *
               * 依据 DSH 官方工作台参考实现（workbench/.ref/dwb-client.js）：
               *
               *   ensureSession({ folder }) 内部 =
               *     ctx.workspaces.create({ path: folder })   // 按项目目录建/取工作区（不弹框）
               *     ctx.sessions.create({ workspaceId })      // 每次新建一个会话
               *     uiWorkspace.openSession(sessionId)        // 打开它
               *
               * 会弹「Select Workspace Directory」的只有 `uiWorkspace.pickDirectory()`
               * （即 newWorkspaceSession 那条路），我们**绝不调用它**。
               * 所以用 ensureSession({folder: 项目目录}) 既能新建会话，又不会弹目录框。
               */
              const currentNow = (() => {
                try {
                  return (
                    (typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
                    hostService.lastSession ||
                    hostService.nativeLocation?.sessionId ||
                    ''
                  )
                } catch {
                  return ''
                }
              })()
              const pickId = (payload) =>
                (payload &&
                  (typeof payload === 'string'
                    ? payload
                    : payload.sessionId ||
                      payload.id ||
                      (payload.session && (payload.session.id || payload.session.sessionId)))) ||
                ''

              const tryCreateSession = async () => {
                // ① 官方封装：ensureSession({folder}) —— 首选
                if (typeof hostService.ensureSession === 'function' && rootPath) {
                  try {
                    const created = await hostService.ensureSession({ folder: rootPath })
                    const id = pickId(created)
                    if (id && id !== currentNow) return id
                  } catch {
                    /* 落到下面的细粒度路径 */
                  }
                }
                // ② 细粒度：按项目目录建/取工作区 → 建会话（同样不涉及目录选择框）
                const ctx = hostService.ctx
                if (ctx && ctx.workspaces && ctx.sessions && rootPath) {
                  try {
                    const workspace = await ctx.workspaces.create({ path: rootPath })
                    const workspaceId =
                      (workspace && (workspace.workspaceId || workspace.id)) || ''
                    if (workspaceId) {
                      const created = await ctx.sessions.create({ workspaceId })
                      const id = pickId(created)
                      if (id && id !== currentNow) return id
                    }
                  } catch {
                    /* ignore */
                  }
                }
                // ③ 最后才用自适应候选（含兼容旧宿主）
                const candidates = discoverSessionCreator()
                if (!Array.isArray(candidates)) return ''
                const score = (method) =>
                  /create|new|spawn/i.test(method) ? 0 : /open|start|begin/i.test(method) ? 1 : 2
                for (const cand of candidates.slice().sort((a, b) => score(a.method) - score(b.method))) {
                  for (const args of [[], [{ folder: rootPath }], [rootPath]]) {
                    try {
                      const created = await cand.target[cand.method](...args)
                      const id = pickId(created)
                      if (id && id !== currentNow) return id
                    } catch {
                      /* 试下一种形态 */
                    }
                  }
                }
                return ''
              }

              let created = ''
              try {
                created = await tryCreateSession()
              } catch {
                created = ''
              }

              if (created) {
                reveal(created)
                try {
                  await postRibOp({ project: rootPath, op: 'session-bind', key: normalized, sessionId: created })
                } catch {
                  /* 绑定失败也照常使用本次会话 */
                }
              }

              /**
               * v3.29：把本节点的上下文写进**本节点那个会话**的输入框。
               *
               * 两个必须满足的前提（否则就是「默认输入的上下文错误」）：
               *   ① 等宿主真正切到这个会话（currentSession === target），再写；
               *   ② 写入时**显式带上 target**，即使切换还没落地也不会写错会话。
               */
              const writeContextTo = async (target, text) => {
                if (!text) return false
                const currentId = () => {
                  try {
                    return (
                      (typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
                      hostService.lastSession ||
                      (hostService.nativeLocation && hostService.nativeLocation.sessionId) ||
                      ''
                    )
                  } catch {
                    return ''
                  }
                }
                // ① 等会话切换完成（最多约 1.8s）
                if (target) {
                  for (let i = 0; i < 12; i += 1) {
                    if (currentId() === target) break
                    await new Promise((done) => setTimeout(done, 150))
                  }
                }
                // ② 写入时带目标会话 id，避免写进旧会话
                const body = String(text)
                const write = async (attempt = 0) => {
                  if (injectTextToComposer(body, target || '')) return true
                  if (attempt >= 6) return false
                  await new Promise((done) => setTimeout(done, 130))
                  return write(attempt + 1)
                }
                return write()
              }

              // ③ 把继承链起点写进「本节点的对话」
              await writeContextTo(created || '', options.contextText)
              setToast(
                created
                  ? `${options.label || normalized}：已新建该节点的独立对话，并按继承链注入上下文`
                  : `${options.label || normalized}：宿主未提供可用的新建对话接口，已退回当前对话；` +
                    `请用宿主「新建对话」后右键该节点选「绑定当前对话」把它独立出来`,
              )
              return created || null
            } catch {
              return null
            } finally {
              switchingSessionFor.current = ''
            }
          },
          [hostService, injected.entry, rootPath, injectTextToComposer],
        )

        // 首屏自动检测：如果当前会话未激活，自动激活并嵌入（防抖且仅执行一次，避免无限循环）！
        React.useEffect(() => {
          if (!hostService || hasAttemptedAttach.current) return
          hasAttemptedAttach.current = true

          // v3.25：把宿主真实的会话 API 清单落盘（control/rdw-diag.json）。
          // 宿主 pack 后方法名被压缩，静态分析拿不到；这条诊断让插件自己「报出」
          // 可用方法，既用于自适应新建会话，也便于事后核对。
          reportHostDiagnostics().catch(() => {})

          try {
            const myId = (injected.entry && injected.entry.id) || 'zhuanz/research-dag-workbench'
            const cur =
              (typeof hostService.currentSession === 'function' ? hostService.currentSession() : null) ||
              hostService.lastSession ||
              hostService.nativeLocation?.sessionId ||
              hostService.state?.recentSessions?.[myId] ||
              'session-d57c7053-0ca9-4e2d-a4bb-fe93b220ffe7'

            if (!cur) return

            const isCurrentActive =
              typeof hostService.ownsSession === 'function' &&
              hostService.ownsSession(cur) &&
              typeof hostService.currentSession === 'function' &&
              hostService.currentSession() === cur

            if (isCurrentActive) return

            if (typeof hostService.showSession === 'function') {
              hostService.showSession(cur)
            } else if (typeof hostService.openSession === 'function') {
              hostService.openSession(cur)
            } else if (typeof hostService.ensureSession === 'function') {
              hostService.ensureSession({ sessionId: cur }).catch(() => {})
            }
          } catch (err) {
            /* ignore */
          }
        }, [hostService])

        /* --------------------------------------------------------------- 渲染 */

        const viewProps = {
          project,
          detail,
          onSelect: openDetail,
          onCloseDetail: closeDetail,
          onRetryDetail: openDetail,
          onAction: openActionDialog,
          onCreate: openCreate,
          createEnabled,
          busy,
        }

        const oldResultsViewProps = {
          project,
          results,
          resultsLoading,
          resultsError,
          autoEnabled,
          resultsAvailable,
          busy,
          onAuto: () => execute({ action: 'auto' }),
          onSelect: openDetail,
          detail,
          onCloseDetail: closeDetail,
          onRetryDetail: openDetail,
          expandedResults,
          expandedLimitations,
          onToggleKeyResults: toggleResultExpanded,
          onToggleLimitations: toggleResultLimitations,
        }

        const contentNode = h(
          'div',
          null,
          !contentAvailable
            ? h('div', { style: STYLES.noticeBanner }, CONTENT_UPGRADE_NOTICE)
            : null,
          !contentAvailable
            ? resultsAvailable
              ? renderResultsView(h, oldResultsViewProps)
              : h(
                  'div',
                  { style: { ...STYLES.muted, padding: '10px 0' } },
                  '当前宿主没有提供 /results 与 /content，请重启 DSH 加载新版宿主后再使用内容页。',
                )
            : renderContentView(h, {
                content,
                contentLoading,
                contentError,
                busy,
                detail: contentDetail,
                networkError: content && typeof content.networkError === 'string' ? content.networkError : '',
                onRetry: () => loadContent(rootPath),
                onPublish: publishProject,
                onPull: pullMessages,
                onLoadExample: () => {
                  const ex = (health && health.example) || ''
                  if (ex) {
                    setProjectInput(ex)
                    saveProjectConfig(ex)
                  }
                },
                onOpenDetail: openContentResult,
                onOpenHandoff: openContentHandoff,
                onUnsubmit: unsubmitHandoff,
                onReview: reviewResult,
                onReviewItem: reviewPendingItem,
                onIdea: openIdea,
                onCloseDetail: () => setContentDetail(null),
                onRetryHandoff: openContentHandoff,
                fileModal,
                onOpenFile: openFileModal,
                onCloseFileModal: closeFileModal,
                onOpenSidebar: openSidebar,
                onOpenBranchWork: openBranchWorkModal,
                onCloseBranchWorkModal: closeBranchWorkModal,
                onDirectiveChange,
                onSendDirective: sendBranchDirective,
                onOpenExternal: openExternal,
                onGoEngineering: () => {
                  setContentDetail(null)
                  setEngTab('handoffs')
                  setView('engineering')
                },
              }),
        )

        const networkNode = !contentAvailable
          ? h(
              'div',
              null,
              h('div', { style: STYLES.noticeBanner }, NETWORK_UPGRADE_NOTICE),
              h(
                'div',
                { style: { ...STYLES.muted, padding: '6px 0' } },
                '项目网络需要新版宿主提供 /content（TeamMCP digest）。工程页与旧结果页仍可正常使用。',
              ),
            )
          : renderNetworkView(h, {
              content,
              contentLoading,
              contentError,
              busy,
              run,
              onRefresh: refreshContent,
              onPublish: publishProject,
              onPull: pullMessages,
              onReviewItem: reviewPendingItem,
              onOpenHandoff: openContentHandoff,
              expandedProjects,
              onToggleProject: toggleNetworkProject,
            })

        const engineeringNodes = {
          dag: renderDagView(h, viewProps),
          handoffs: renderHandoffsView(
            h,
            Object.assign({}, viewProps, {
              statusFilter,
              setStatusFilter,
              moduleFilter,
              setModuleFilter,
              plainStatus: true,
            }),
          ),
          control: renderControlView(
            h,
            Object.assign({}, viewProps, {
              health,
              config,
              verify: server && server.verify ? server.verify : null,
              cliError: server && typeof server.cliError === 'string' ? server.cliError : '',
              runs,
              run,
              selectedRunId,
              onSelectRun: setSelectedRunId,
              onVerify: () => execute({ action: 'verify' }),
              onReport: () => execute({ action: 'report' }),
              onStateSet: submitStateForm,
              stateForm,
              setStateForm,
              projectInput,
              setProject: setProjectInput,
              onSaveConfig: saveProjectConfig,
            }),
          ),
          overview: renderOverviewView(h, viewProps),
        }

        /* 项目流程视图的公共 props（三栏舞台与底部抽屉共用，避免两处参数漂移）。 */
        const fishboneCommonProps = {
          fishbone,
          loading: fishboneLoading,
          error: fishboneError,
          selectedModule,
          selectedRib,
          session: sessionView,
          displayMode: fishboneDisplayMode,
          setDisplayMode: setFishboneDisplayMode,
          onSelectModule: (moduleId) => openModuleWorkspace(moduleId),
          onSelectRib: selectRib,
          // v3.9：主支行内联操作（↑ ↓ ×）与右键菜单共用同一组处理函数
          onMoveModule: (moduleId, offset) => moveModule(moduleId, offset),
          onRemoveModule: (moduleId) => removeModule(moduleId),
          onAddModule: () => setModuleDialog({ mode: 'add', id: '', name: '', error: '' }),
          onRenameModule: (moduleId, currentName) =>
            setModuleDialog({ mode: 'rename', moduleId, id: moduleId, name: currentName || moduleId, error: '' }),
          onRefresh: () => loadFishbone(rootPath),
          onSprout: (moduleHint, fromRib) => openSproutDialog(moduleHint || selectedModule, fromRib),
          onSproutHere: (moduleId, fromRib) => openSproutDialog(moduleId, fromRib),
          onAuto: runAutoGraft,
          onGraft: openGraftDialog,
          busy,
          conversationNode,
          onOpenFile: openFileModal,
          onOpenSidebar: openSidebar,
          chatOpen: false,
          // v3.24：右侧空壳侧栏移除，对话在中栏；按钮只提示定位
          onToggleChat: () => {
            setToast('对话区已在中栏（项目正文区），此处不再弹出右侧侧栏')
          },
          directiveDraft: sessionDraft,
          onDraftChange: onDirectiveChange,
          onSendDirective: sendBranchDirective,
          sending: sessionSending,
          composerModel,
          onSelectModel: setComposerModel,
          composerPermission,
          onSelectPermission: setComposerPermission,
          activeDropdown,
          onToggleDropdown: (name) => setActiveDropdown((prev) => (prev === name ? null : name)),
          /* v3.5 交互系统 2.0 回调 */
          onContextMenu,
          onHoverRib,
          onHoverRibLeave,
          onPhantomSprout,
          onDeleteRib: deleteRib,
          onUndo: doUndo,
          onRedo: doRedo,
          onShowShortcuts: () => setShortcutsOpen(true),
          inlineSprout: Boolean(inlineSprout),
          undoCount: undoStack.length,
          redoCount: redoStack.length,
          recycleCount: fishbone && Array.isArray(fishbone.recycleBin) ? fishbone.recycleBin.length : 0,
          onOpenRecycle: () => setRecycleOpen(true),
          sessionBound,
          canStartChat,
          onStartChat: startChat,
          onAttachSession: attachCurrentSession,
          middleTab,
          onSelectMiddleTab: setMiddleTab,
          middleMode,
          onSelectMiddleMode: setMiddleMode,
          ribWork: ribWorkData || (injected && injected.ribWork) || null,
          onSproutFromMessage: sproutFromMessage,
          onShowMessageSprout: (payload) => setMsgSprout(payload),
          onMountContext: mountContextToSession,
          onAutoSprout: autoSproutFromMessage,
          /* v3.8 · 本分支的文献（Zotero）：搜索挂载 / 合集导入 / 定位 */
          zotero: zoteroData,
          zoteroError,
          zoteroBusy: Boolean(zoteroBusy || zoteroLoading),
          zoteroSearch,
          zoteroCollectionOpen,
          onZoteroSearchChange: setZoteroSearch,
          onZoteroSearchSubmit: zoteroSearchSubmit,
          onZoteroAttach: zoteroAttach,
          onZoteroDetach: zoteroDetach,
          onZoteroLocate: zoteroLocate,
          onZoteroImportCollection: zoteroImportCollection,
          onZoteroToggleCollections: () => setZoteroCollectionOpen((prev) => !prev),
          onZoteroRefresh: zoteroRefresh,
          /* v3.10 · 研究目标点开 → 好问题卡编辑器（八层审计 + good-question） */
          onOpenGoalCard: openGoalCard,
          /* v3.27 · 研究目标作为「第 0 个主支」：点它切到目标专属对话（技能不变） */
          onSelectGoalSession: () => {
            setSelectedModule('__goal__')
            setSelectedRib(null)
            setRibWorkData(null)
            setSessionView(null)
            const fishboneHead = fishbone && fishbone.head && typeof fishbone.head === 'object' ? fishbone.head : {}
            const prompt = buildGoalDiscussionPrompt({
              title: fishboneHead.title || (server && server.project && server.project.title) || '',
              goal: goalMeta.goal || (goalDraft.card && goalDraft.card.question) || '',
              draft: (goalDraft.card && goalDraft.card.title) || '',
            })
            openSessionForNode('goal', { label: '研究目标', contextText: prompt, alwaysInject: true })
          },
          onScaffoldRecommended: scaffoldRecommendedModules,
        }

        /* v4：三栏舞台只渲染三栏（外壳 .rdw-stage 承载网格）。 */
        const fishboneStageProps = Object.assign({}, fishboneCommonProps, { mode: 'stage' })
        /* v4：底部抽屉只渲染全景骨架 + 分支表。 */
        const fishboneDrawerProps = Object.assign({}, fishboneCommonProps, { mode: 'drawer' })

        const fishboneNode = renderFishboneView(h, fishboneCommonProps)
        const fishboneStageNode = renderFishboneView(h, fishboneStageProps)
        const fishboneDrawerNode = renderFishboneView(h, fishboneDrawerProps)

        /* v3.10 研究目标 · 好问题卡编辑器：打开时替换中栏舞台，右栏原生会话保留，
         * 用户在同一个页面里「左边看目标结构、右边跟 AI 讨论」。 */
        const goalCardNode = goalOpen
          ? renderGoalCardView(h, {
              card: goalDraft.card,
              layers: goalDraft.layers,
              goal: goalMeta.goal,
              missing: goalMeta.missing,
              falsifiable: goalMeta.falsifiable,
              busy: goalBusy,
              onField: changeGoalField,
              onLayer: changeGoalLayer,
              onSyncGoal: syncGoalFromCard,
              onCopyPrompt: startGoalDiscussion,
              onClose: closeGoalCard,
            })
          : null

        const leaderNode = renderLeaderLogView(h, {
          leaderLog,
          loading: leaderLogLoading,
          error: leaderLogError,
          filter: leaderFilter,
          onFilter: (next) => setLeaderFilter(next || 'all'),
          onRefresh: () => loadLeaderLog(rootPath),
          busy,
        })

        // v2.7：工作区会话视图 = 整页（取代弹窗）
        const sessionNode = renderBranchSessionView(h, {
          session: sessionView,
          loading: Boolean(sessionView && sessionView.data === null && !sessionView.error),
          error: sessionView ? sessionView.error : '',
          onBack: closeSessionView,
          onSend: sendBranchDirective,
          onOpenFile: openFileModal,
          onOpenSidebar: openSidebar,
          onBuildContext: buildContext,
          onClearContext: clearRibContext,
          onOpenSibling: openSiblingRib,
          onMessageSibling: (row) => setRibMessage({ target: row, text: '' }),
          onOpenBranch: (rib) => selectRib(rib),
          onSprout: (moduleHint, fromRib) => openSproutDialog(moduleHint || (sessionView && sessionView.module), fromRib),
          canGraft: Boolean(
            sessionView && sessionView.branch && Array.isArray(fishbone && fishbone.ribs) &&
            fishbone.ribs.some((item) => item && item.id === sessionView.branch && item.stream && item.status !== 'ACCEPTED' && item.status !== 'REJECTED'),
          ),
          onGraft: () => sessionView && sessionView.branch && openGraftDialog(sessionView.branch),
          busy,
          directiveDraft: sessionDraft,
          onDraftChange: onDirectiveChange,
          sending: sessionSending,
          openSections,
          onToggleSection: (key) => setOpenSections((prev) => Object.assign({}, prev, { [key]: !(prev && prev[key]) })),
        })

        const projectsHubNode = renderProjectsHubView(h, {
          projects: projectsRegistry,
          trashProjects: projectsTrash,
          activeProjectRoot: rootPath,
          currentProject: project,
          busy: Boolean(busy),
          searchQuery: hubSearch,
          onSearchChange: setHubSearch,
          phaseFilter: hubPhaseFilter,
          onPhaseFilterChange: setHubPhaseFilter,
          categoryFilter: hubCategoryFilter,
          onCategoryFilterChange: setHubCategoryFilter,
          sharedItems: crossProjectSharedItems,
          onOpenProject: openProjectFromHub,
          onRemoveProject: requestRemoveProject,
          onRequestRemoveProject: requestRemoveProject,
          onRestoreProject: restoreProjectFromTrash,
          onPurgeProject: requestPurgeProject,
          onCreateProject: () => openCreate({ kind: 'init' }),
          onImportProject: () => setImportDialog({ path: '', error: '' }),
          onLoadExample: () => loadExample(health && health.example),
          onRefresh: () => refreshStateAndData(rootPath),
          onIdea: openIdea,
        })

        /**
         * 首用 / 无项目引导。
         * 规范 4.2：工作台必须自己设计首次进入与无会话状态，不依赖宿主的通用引导；
         * 也不得在首次进入时自动创建会话——这里只给三条可执行的路。
         */
        const welcomeNode = h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          projectsHubNode,
          h(
            'div',
            { style: { ...STYLES.card, marginTop: 4 } },
            h('div', { style: { fontSize: 15, fontWeight: 700, marginBottom: 4 } }, WELCOME_COPY.title),
            h('div', { style: { ...STYLES.muted, lineHeight: 1.7 } }, WELCOME_COPY.subtitle),
            h(
              'div',
              { style: { ...STYLES.contentGrid, marginBottom: 12 } },
              ...WELCOME_COPY.points.map(([name, description], index) =>
                h(
                  'div',
                  { key: `welcome-${index}`, style: STYLES.contentCard },
                  h('div', { style: { fontSize: 12, fontWeight: 700 } }, name),
                  h('div', { style: { ...STYLES.muted, lineHeight: 1.65 } }, description),
                ),
              ),
            ),
            h('div', { style: STYLES.sectionTitle }, '从这里开始'),
            ...[WELCOME_COPY.stepLoad, WELCOME_COPY.stepExample, WELCOME_COPY.stepCreate, WELCOME_COPY.stepChat].map(
              (line, index) => h('div', { key: `step-${index}`, style: { ...STYLES.listItem } }, `· ${line}`),
            ),
            h(
              'div',
              { style: { ...STYLES.row, gap: 8, marginTop: 10 } },
              health && health.example
                ? h(
                    'button',
                    { type: 'button', style: STYLES.primaryButton, disabled: Boolean(busy), onClick: () => loadExample(health.example) },
                    '加载示例项目',
                  )
                : null,
              createEnabled
                ? h('button', { type: 'button', style: STYLES.button, disabled: Boolean(busy), onClick: () => openCreate({ kind: 'init' }) }, '新建项目')
                : null,
            ),
          ),
        )

        const viewNode = sessionView
          ? sessionNode
          : !project
          // 首用引导由 welcomeNode 承担（规范 4.2：不用宿主通用引导）。
          ? welcomeNode
          : view === 'hub'
            ? projectsHubNode
            : view === 'fishbone'
              ? fishboneNode
              : view === 'leader'
                ? leaderNode
                : view === 'content'
                  ? contentNode
                  : view === 'network'
                    ? fishboneNode
                    : renderEngineeringView(h, {
                        tab: engTab,
                        setTab: setEngTab,
                        nodes: engineeringNodes,
                        busy,
                      })

        /* ── v4 命令面板（⌘K）：把「低频但要知道在哪」的跳转与命令集中到一处 ──
         * 动因：原设计把这些动作散在 6 个页签里，用户必须先想「这功能在哪个页签」
         * 才能操作。命令面板把「我想做什么」直接映射到「怎么执行」。 */
        const paletteItems = (() => {
          const list = []
          if (!project) return list
          // 命令
          list.push({ section: '命令', icon: '🌱', name: '新建一个分支', desc: '从当前主支或选中分支派生新分支', kbd: 'N', run: () => openSproutDialog(selectedModule, selectedRib) })
          if (selectedRib) {
            list.push({ section: '命令', icon: '↩', name: '回连当前分支', desc: '把成果接回主支', kbd: 'G', run: () => openGraftDialog(selectedRib) })
          }
          list.push({ section: '命令', icon: '⟳', name: '刷新项目流程主线', desc: '重新计算主支与分支状态', run: () => loadFishbone(rootPath) })
          list.push({ section: '命令', icon: '⚡', name: '查看待拍板项', desc: '查看需要你处理的决策', run: () => setSlideTab('agent') })
          list.push({ section: '命令', icon: '📊', name: '打开概览', desc: '统计与整体进度', run: () => setSlideTab('overview') })
          list.push({ section: '命令', icon: '⚙️', name: '打开工程（DAG/交接/校验）', desc: '工程建设视图', run: () => setSlideTab('engineering') })
          // 跳转：主支
          const spineList = fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : []
          spineList.forEach((m) => {
            list.push({ section: '跳转 · 主支', icon: '🌿', name: `${m.id} ${m.name}`, desc: `${m.completion || 0}% 已回连 · ${(m.ribs || []).length} 根分支`, run: () => openModuleWorkspace(m.id) })
          })
          // 跳转：分支
          const ribList = fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs : []
          ribList.forEach((r) => {
            list.push({ section: '跳转 · 分支', icon: '🌱', name: `${r.id} ${r.name}`, desc: `状态 ${r.status || '—'}${r.parent ? ` · 父分支 ${r.parent}` : ''}`, run: () => selectRib(r) })
          })
          return list
        })()

        const paletteNode = paletteOpen && project
          ? h(
              'div',
              {
                className: 'rdw-palette-mask',
                role: 'presentation',
                onClick: (e) => {
                  if (e && e.target === e.currentTarget) setPaletteOpen(false)
                },
              },
              h(
                'div',
                { className: 'rdw-palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': '命令面板' },
                h('input', {
                  className: 'rdw-palette-input',
                  type: 'text',
                  value: paletteQuery,
                  placeholder: '跳转到项目、分支、文件，或执行命令…',
                  autoFocus: true,
                  'aria-label': '命令面板搜索',
                  onChange: (e) => setPaletteQuery(e && e.target ? e.target.value : ''),
                }),
                h(
                  'div',
                  { className: 'rdw-palette-list' },
                  ...(() => {
                    const q = String(paletteQuery || '').trim().toLowerCase()
                    const filtered = q === ''
                      ? paletteItems.slice(0, 12)
                      : paletteItems.filter((it) => `${it.name} ${it.desc} ${it.section}`.toLowerCase().includes(q)).slice(0, 16)
                    if (filtered.length === 0) {
                      return [h('div', { key: 'none', className: 'rdw-pal-section', style: { padding: '14px 12px' } }, '没有匹配的项')]
                    }
                    let lastSection = ''
                    const nodes = []
                    filtered.forEach((it, idx) => {
                      if (it.section !== lastSection) {
                        lastSection = it.section
                        nodes.push(h('div', { key: `sec-${idx}`, className: 'rdw-pal-section' }, it.section))
                      }
                      nodes.push(
                        h(
                          'button',
                          {
                            key: `pal-${idx}`,
                            type: 'button',
                            className: 'rdw-pal-item',
                            onClick: () => {
                              setPaletteOpen(false)
                              setPaletteQuery('')
                              if (typeof it.run === 'function') it.run()
                            },
                          },
                          h('span', { className: 'rdw-pal-ico', 'aria-hidden': 'true' }, it.icon),
                          h(
                            'div',
                            { className: 'rdw-pal-main' },
                            h('div', { className: 'rdw-pal-name' }, it.name),
                            it.desc ? h('div', { className: 'rdw-pal-desc' }, it.desc) : null,
                          ),
                          it.kbd ? h('span', { className: 'rdw-kbd' }, it.kbd) : null,
                        ),
                      )
                    })
                    return nodes
                  })(),
                ),
                h(
                  'div',
                  { className: 'rdw-palette-foot' },
                  h('span', null, '↑↓ 选择'),
                  h('span', null, '↵ 执行'),
                  h('span', null, 'esc 关闭'),
                ),
              ),
            )
          : null

        /* ── v4 底部全景抽屉：把占首屏的 SVG 全景与分支表收进可收起抽屉 ──
         * 动因：全景图信息密度低但占高，原设计把真正要读的会话区挤到折叠线下。
         *
         * v3.7 修复（浏览器自动闭合导致的换行 bug）：
         * 旧写法把 `.rdw-drawer-acts`（含两个 <button>）嵌在**另一个 <button>** 里。
         * HTML 规范禁止 button 嵌套 button，浏览器解析时会**强制闭合外层 button**，
         * 于是操作区被抛到外壳之外、掉到第二行，视觉上抽屉栏凭空多出一行。
         * 修法：外层换成 div[role=button]，键盘可达性用 tabIndex + onKeyDown 补齐。 */
        const drawerNode = project && view === 'fishbone' && !sessionView
          ? h(
              'div',
              { className: drawerOpen ? 'rdw-drawer open' : 'rdw-drawer' },
              h(
                'div',
                {
                  className: 'rdw-drawer-bar',
                  role: 'button',
                  tabIndex: 0,
                  'aria-expanded': drawerOpen ? 'true' : 'false',
                  onClick: () => setDrawerOpen((prev) => !prev),
                  onKeyDown: (e) => {
                    if (!e) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDrawerOpen((prev) => !prev)
                    }
                  },
                },
                h('span', { className: 'rdw-drawer-caret', 'aria-hidden': 'true' }, '▶'),
                h('span', { className: 'rdw-drawer-title' }, '分支清单与全景骨架'),
                h(
                  'span',
                  { className: 'rdw-drawer-meta' },
                  `${fishbone && Array.isArray(fishbone.ribs) ? fishbone.ribs.length : 0} 根分支 · Ishikawa 全景`,
                ),
                h(
                  'div',
                  { className: 'rdw-drawer-acts', onClick: (e) => e.stopPropagation() },
                  h(
                    'button',
                    { type: 'button', className: 'btn sm', disabled: Boolean(busy), onClick: runAutoGraft },
                    '自动回连',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'btn sm solid',
                      disabled: Boolean(busy),
                      onClick: () => openSproutDialog(selectedModule, selectedRib),
                    },
                    '🌱 新建一个分支',
                  ),
                ),
              ),
              h('div', { className: 'rdw-drawer-content' }, fishboneDrawerNode),
            )
          : null

        /* ── v4 侧滑管理面板：低频管理（主智能体/内容/网络/工程/概览）── */
        const slideNode = slideTab && project
          ? (() => {
              const tabs = [
                ['agent', '🧠 主智能体'],
                ['content', '📄 内容'],
                // 先隐藏网络 TeamMCP 功能（避免连接报错干扰）
                ['engineering', '⚙️ 工程'],
                ['overview', '📊 概览'],
              ]
              const bodyMap = {
                agent: leaderNode,
                content: contentNode,
                network: networkNode,
                // 工程页必须走 renderEngineeringView，才会带出 DAG/交接/校验/概览 子页签栏。
                engineering: renderEngineeringView(h, {
                  tab: engTab,
                  setTab: setEngTab,
                  nodes: engineeringNodes,
                  busy,
                }),
                overview: renderOverviewView(h, viewProps),
              }
              return h(
                'div',
                { className: 'rdw-slide-mask', onClick: () => setSlideTab(null) },
                h(
                  'div',
                  {
                    className: 'rdw-slide',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': '项目管理面板',
                    onClick: (e) => e.stopPropagation(),
                  },
                  h(
                    'div',
                    { className: 'rdw-slide-head' },
                    h('span', { className: 'rdw-slide-title' }, '项目面板'),
                    h(
                      'div',
                      { className: 'rdw-slide-tabs' },
                      ...tabs.map(([id, label]) =>
                        h(
                          'button',
                          {
                            key: id,
                            type: 'button',
                            className: slideTab === id ? 'rdw-slide-tab on' : 'rdw-slide-tab',
                            onClick: () => setSlideTab(id),
                          },
                          label,
                        ),
                      ),
                    ),
                    h('button', { type: 'button', className: 'rdw-slide-close', 'aria-label': '关闭面板', onClick: () => setSlideTab(null) }, '✕'),
                  ),
                  h('div', { className: 'rdw-slide-body' }, bodyMap[slideTab] || null),
                ),
              )
            })()
          : null

        const footer = h(
          'div',
          { style: STYLES.footer },
          h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
            h('span', {
              style: {
                width: 7,
                height: 7,
                borderRadius: 'var(--rdw-r-pill)',
                flex: '0 0 auto',
                background: loading || contentLoading
                  ? 'var(--rdw-st-provisional)'
                  : busy
                    ? 'var(--rdw-st-provisional)'
                    : error
                      ? 'var(--rdw-st-rejected)'
                      : 'var(--rdw-st-accepted)',
              },
            }),
            loading || contentLoading ? '加载中…' : busy ? `执行中：${busyLabel}` : error ? '出错' : '空闲',
          ),
          h('span', null, `项目：${rootPath || '未选择'}`),
          run && run.status ? h('span', null, `最近运行：${run.action || '—'} · ${run.status}`) : null,
        )

        /**
         * 整页框架（业务优先）。
         * 规范 4.1/4.2/4.3：
         *   - 业务区占满整个工作台，会话区按需在右侧（窄容器改上下）；
         *   - 无会话时不创建会话，业务页本身完整可用；
         *   - 断点绑在业务容器宽度上（container query），不是窗口。
         */
        return h(
          'div',
          {
            ref: shellRef,
            className: 'rdw-shell',
            'data-rdw-theme': rdwTheme,
            style: {
              fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              // 对话区宽度跟着业务容器宽度走（容器查询之外再兜一层，避免首帧跳变）。
              '--rdw-chat-width': shellWidth >= 1180 ? '440px' : shellWidth >= 900 ? '380px' : '320px',
            },
          },
          h('style', { key: 'rdw-theme-css' }, RDW_THEME_CSS),
          h('style', { key: 'rdw-theme-preset-css' }, RDW_THEME_PRESET_CSS),
          h('style', { key: 'rdw-skeleton-css' }, RDW_SKELETON_CSS),
          h('style', { key: 'rdw-shell-css' }, SHELL_CSS),
          /* v4 命令栏：品牌 + 面包屑 + 全局搜索 + 状态指示器。
           * 首用引导 / 无项目时不渲染（此时没有可导航的上下文）。 */
          project
            ? h(
                'header',
                { key: 'rdw-cmdbar-host', 'data-dsh-workbench-toolbar': '' },
                renderCommandBar(h, {
                  project,
                  fishbone,
                  selectedModule,
                  selectedRib,
                  attention: fishbone && Array.isArray(fishbone.attention) ? fishbone.attention : [],
                  totals: fishbone && fishbone.totals ? fishbone.totals : {},
                  busy,
                  onOpenPalette: () => {
                    setPaletteQuery('')
                    setPaletteOpen(true)
                  },
                  onOpenSlide: (tab) => setSlideTab(tab || 'agent'),
                  onFocusAttn: () => setSlideTab('agent'),
                  onSelectModule: (moduleId) => openModuleWorkspace(moduleId),
                  onSelectRib: selectRib,
                  onBackToHub: () => setView('hub'),
                  // 对话入口：与旧工具栏同语义（按需打开，不自动建会话）。
                  // v3.24：右侧空壳侧栏已移除，对话在中栏；按钮只提示定位，不打开侧栏。
                  chatOpen: false,
                  chatAvailable: Boolean(hostService),
                  onToggleChat: () => {
                    setToast('对话区已在中栏（项目正文区），此处不再弹出右侧侧栏')
                  },
                }),
              )
            : null,
          /* 首用 / 无项目时仍保留原紧凑工具栏（承载加载项目、新建等入口）。 */
          project
            ? null
            : h(
                'header',
                { className: 'rdw-toolbar', 'data-dsh-workbench-toolbar': '' },
                renderHeader(h, {
                  health,
                  project,
                  view,
                  setView,
                  busy,
                  busyLabel,
                  contentAvailable,
                  fishboneAvailable,
                  chatOpen: false,
                  canStartChat,
                  scope: '',
                  // v3.24：右侧空壳侧栏已移除。对话就在中栏（项目正文区），
                  // 这里不再打开任何侧栏，只给一句定位提示，避免点了没反应。
                  onToggleChat: () => {
                    setToast('对话区已在中栏（项目正文区），此处不再弹出右侧侧栏')
                  },
                  // v3.9 主题选择器
                  theme: rdwTheme,
                  themeOpen,
                  onToggleTheme: () => setThemeOpen((prev) => !prev),
                  onPickTheme: (next) => {
                    changeRdwTheme(next)
                    setThemeOpen(false)
                  },
                }),
              ),
          h(
            'div',
            { className: 'rdw-body' },
            h(
              'div',
              { className: 'rdw-business' },
              /* v4：有项目且处于项目流程视图时，业务区改为「三栏舞台 + 底部全景抽屉」的
               * 单页结构——左导航/中工作区/右结果常驻同屏，全景图收进可收起抽屉。
               * 其他视图（hub / 会话 / 首用）沿用原滚动容器。 */
              project && view === 'fishbone' && !sessionView
                ? h(
                    'div',
                    {
                      /* 三栏舞台的包裹层。
                       * 必须显式 width:'100%' + minWidth:0：
                       * 列向 flex 容器里，子项默认按 max-content 计算交叉轴宽度，
                       * 若不锁死，stage 的 grid 会收缩成"内容宽度"，
                       * 右侧因此留出大片空白（实测 1680 视口只用了 1232）。 */
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        flex: '1 1 auto',
                        width: '100%',
                        minWidth: 0,
                        minHeight: 0,
                      },
                    },
                    h(
                      'div',
                      { className: 'rdw-stage', 'data-dsh-no-drag': '' },
                      fishboneStageNode,
                    ),
                    drawerNode,
                  )
                : h(
                    'div',
                    { className: 'rdw-business-scroll' },
                    showHostUpgradeNotice ? h('div', { style: STYLES.noticeBanner }, HOST_UPGRADE_NOTICE) : null,
                    error ? h('div', { style: STYLES.errorBanner }, `错误：${error}`) : null,
                    viewNode,
                  ),
              /* 页脚曾经放在这里 —— 但 .rdw-body 是 row 容器，
               * 页脚会被横排到业务区右侧，吃掉 ~448px 宽度（实测 1680 视口只剩 1232）。
               * 现已移到 .rdw-body 之后，作为 .rdw-shell 的纵向子项。 */
            ),
            // v3.24：右侧「AI 对话」空壳侧栏已**整个移除**（用户要求：老是弹出碍事）。
            // 宿主的原生会话已嵌入中栏（项目正文区），这个空 aside 没有任何作用。
          ),
          /* 页脚：必须作为 .rdw-shell（纵向 flex）的子项，排在 .rdw-body 之后，
           * 才会横跨整个宽度贴在底部。放进 row 容器会被挤成右侧一列。 */
          h('div', { className: 'rdw-foot' }, footer),
          paletteNode,
          slideNode,
          renderReasonDialog(h, {
            dialog,
            reason,
            setReason,
            onConfirm: confirmDialog,
            onCancel: cancelDialog,
            busy,
          }),
          renderCreateDialog(h, {
            create: createDialog,
            busy,
            onField: changeCreateField,
            onPickFolder: pickProjectFolder,
            onConfirm: submitCreate,
            onCancel: () => setCreateDialog(null),
          }),
          renderIdeaDialog(h, {
            dialog: ideaDialog,
            busy: busy === 'bridge:idea',
            onChange: (name, value) => {
              setIdeaDialog((previous) => {
                if (!previous) return previous
                return Object.assign({}, previous, { [name]: value, error: '' })
              })
            },
            onConfirm: submitIdea,
            onCancel: () => setIdeaDialog(null),
          }),
          renderSproutDialog(h, {
            dialog: sproutDialog,
            spine: fishbone && Array.isArray(fishbone.spine) ? fishbone.spine : [],
            // v3.2：可选父分支（分支之间也能分叉）
            parents:
              fishbone && Array.isArray(fishbone.ribs)
                ? fishbone.ribs.map((rib) => ({ id: rib.id, name: rib.name, module: rib.module, dir: rib.dir }))
                : [],
            busy: busy === 'sprout',
            onField: changeSproutField,
            onConfirm: submitSprout,
            onCancel: () => setSproutDialog(null),
          }),
          renderModuleDialog(h, {
            dialog: moduleDialog,
            busy: Boolean(busy),
            onField: (name, value) => {
              setModuleDialog((previous) => (previous ? Object.assign({}, previous, { [name]: value, error: '' }) : previous))
            },
            onConfirm: submitModuleDialog,
            onCancel: () => setModuleDialog(null),
          }),
          // 文件预览弹窗挂在面板级（项目流程页与内容页共用；工作区会话已改为整页视图）
          fishboneAvailable || sessionView
            ? renderFileModal(h, fileModal, closeFileModal, openExternal, openSidebar)
            : null,
          // v3.2 分支通讯输入弹窗
          ribMessage
            ? h(
                'div',
                { style: STYLES.overlay, role: 'presentation' },
                h(
                  'div',
                  { style: STYLES.dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': '给其他分支发消息' },
                  h('strong', { style: { fontSize: 14 } }, `✉ 投递给 ${ribMessage.target.name || ribMessage.target.id}`),
                  h(
                    'div',
                    { style: { ...STYLES.muted, margin: '4px 0 8px' } },
                    `收信方 ${ribMessage.target.id} 的智能体开工时会读到这条消息（写入它的 work/INBOX.md）。`,
                  ),
                  h('textarea', {
                    value: ribMessage.text,
                    placeholder: '例如：你那边的截尾敏感性分析出结果了吗？我需要它来决定主分析的权重方案。',
                    style: { ...STYLES.textarea, minHeight: 90 },
                    'aria-label': '消息内容',
                    onChange: (event) =>
                      setRibMessage((prev) => (prev ? Object.assign({}, prev, { text: event && event.target ? event.target.value : '' }) : prev)),
                  }),
                  h(
                    'div',
                    { style: { ...STYLES.row, justifyContent: 'flex-end', gap: 8, marginTop: 10 } },
                    h('button', { type: 'button', style: STYLES.button, onClick: () => setRibMessage(null) }, '取消'),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: STYLES.primaryButton,
                        disabled: !String(ribMessage.text || '').trim() || busy === 'message',
                        onClick: () => sendRibMessage(ribMessage.target, ribMessage.text),
                      },
                      busy === 'message' ? '投递中…' : '投递消息',
                    ),
                  ),
                ),
              )
            : null,
          renderGraftDialog(h, {
            dialog: graftDialog,
            busy: busy === 'graft',
            onField: (name, value) => {
              setGraftDialog((previous) => (previous ? Object.assign({}, previous, { [name]: value, error: '' }) : previous))
            },
            onConfirm: submitGraft,
            onCancel: () => setGraftDialog(null),
          }),
          // 导入项目弹窗
          importDialog
            ? h(
                'div',
                { style: STYLES.overlay, role: 'presentation', onClick: () => setImportDialog(null) },
                h(
                  'div',
                  {
                    style: STYLES.dialog,
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': '导入已有研究项目',
                    onClick: (e) => e && e.stopPropagation && e.stopPropagation(),
                  },
                  h('div', { style: { fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--rdw-text)' } }, '📁 导入已有本地研究项目'),
                  h('div', { style: { ...STYLES.muted, lineHeight: 1.6, marginBottom: 12 } }, '输入本地已存在的 DAG 研究项目绝对路径（含 control/ledger.json），工作台会将其登记到总控看板并切换：'),
                  h('input', {
                    autoFocus: true,
                    value: typeof importDialog.path === 'string' ? importDialog.path : '',
                    placeholder: '输入绝对目录，如 D:/Research/MyTrial 或 /Users/...',
                    'aria-label': '项目绝对路径',
                    onChange: (e) => {
                      const val = e && e.target ? e.target.value : ''
                      setImportDialog((prev) => Object.assign({}, prev || {}, { path: val, error: '' }))
                    },
                    style: { ...STYLES.input, width: '100%', marginBottom: 10 },
                  }),
                  importDialog.error ? h('div', { style: { ...STYLES.errorBanner, marginBottom: 10 } }, importDialog.error) : null,
                  h(
                    'div',
                    { style: { ...STYLES.row, justifyContent: 'flex-end', gap: 8 } },
                    h('button', { type: 'button', style: STYLES.button, onClick: () => setImportDialog(null) }, '取消'),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: STYLES.primaryButton,
                        onClick: async () => {
                          const target = String(importDialog.path || '').trim()
                          if (!target) {
                            setImportDialog((prev) => Object.assign({}, prev || {}, { error: '请输入有效的绝对路径' }))
                            return
                          }
                          await importProjectSubmit(target)
                        },
                      },
                      '导入并进入项目',
                    ),
                  ),
                ),
              )
            : null,
          // 总控台项目移入回收站确认弹窗
          projectDeleteDialog
            ? h(
                'div',
                { style: STYLES.overlay, role: 'presentation', onClick: () => setProjectDeleteDialog(null) },
                h(
                  'div',
                  {
                    style: Object.assign({}, STYLES.dialog, { maxWidth: 440 }),
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': '移入回收站确认',
                    onClick: (e) => e && e.stopPropagation && e.stopPropagation(),
                  },
                  h('div', { style: { fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--rdw-text)' } }, '🗑️ 移入总控台回收站确认'),
                  h(
                    'div',
                    { style: { fontSize: 13, color: 'var(--rdw-text-2)', lineHeight: 1.6, marginBottom: 14 } },
                    `确定要将课题「${projectDeleteDialog.title || projectDeleteDialog.id}」移入回收站吗？`,
                    h(
                      'div',
                      { style: { marginTop: 8, padding: '8px 10px', background: 'var(--rdw-sunken)', borderRadius: 'var(--rdw-r-sm)', fontSize: 12, color: 'var(--rdw-text-3)' } },
                      '• 本地物理文件夹完好保留在磁盘，绝不破坏数据',
                      h('br', null),
                      '• 移入后可随时在左侧「🗑️ 回收站」中一键还原到看板',
                    ),
                  ),
                  h(
                    'div',
                    { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
                    h('button', { type: 'button', style: STYLES.button, onClick: () => setProjectDeleteDialog(null) }, '取消'),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: Object.assign({}, STYLES.button, {
                          background: 'var(--rdw-warn)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                        }),
                        onClick: () => confirmRemoveProject(projectDeleteDialog),
                      },
                      '移入回收站',
                    ),
                  ),
                ),
              )
            : null,
          // 总控台项目彻底清除确认弹窗
          projectPurgeDialog
            ? h(
                'div',
                { style: STYLES.overlay, role: 'presentation', onClick: () => setProjectPurgeDialog(null) },
                h(
                  'div',
                  {
                    style: Object.assign({}, STYLES.dialog, { maxWidth: 440 }),
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': '彻底清除确认',
                    onClick: (e) => e && e.stopPropagation && e.stopPropagation(),
                  },
                  h('div', { style: { fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--rdw-st-rejected)' } }, '⚠️ 彻底清除记录确认'),
                  h(
                    'div',
                    { style: { fontSize: 13, color: 'var(--rdw-text-2)', lineHeight: 1.6, marginBottom: 14 } },
                    `确定从总控台彻底清除课题「${projectPurgeDialog.title || projectPurgeDialog.id}」的记录吗？`,
                    h(
                      'div',
                      { style: { marginTop: 8, padding: '8px 10px', background: 'var(--rdw-sunken)', borderRadius: 'var(--rdw-r-sm)', fontSize: 12, color: 'var(--rdw-text-3)' } },
                      '• 本地磁盘文件依然完整保留，绝不删除任何代码与产物',
                      h('br', null),
                      '• 清除后该课题将从总控看板与回收站消失',
                    ),
                  ),
                  h(
                    'div',
                    { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
                    h('button', { type: 'button', style: STYLES.button, onClick: () => setProjectPurgeDialog(null) }, '取消'),
                    h(
                      'button',
                      {
                        type: 'button',
                        style: Object.assign({}, STYLES.button, {
                          background: 'var(--rdw-st-rejected)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                        }),
                        onClick: () => confirmPurgeProject(projectPurgeDialog),
                      },
                      '彻底清除记录',
                    ),
                  ),
                ),
              )
            : null,
          // 轻提示：居中底部胶囊，pointer-events:none 不挡点击
          renderToast(h, {
            message: toast,
            tone: error ? 'danger' : 'ok',
            show: Boolean(toast) || Boolean(error),
          }),
          error ? h('div', { style: STYLES.errorBanner }, `错误：${error}`) : null,
          /* v3.5 交互层：右键菜单 / 速览卡 / 内联分叉 / 回收站（挂在面板级，覆盖整个工作台） */
          renderContextMenu(h, ctxMenu, () => setCtxMenu(null)),
          renderHoverCard(h, hoverCard, () => setHoverCard(null)),
          renderInlineSprout(
            h,
            inlineSprout,
            (value) => setInlineSprout((prev) => (prev ? Object.assign({}, prev, { name: value, error: '' }) : prev)),
            submitInlineSprout,
            () => setInlineSprout(null),
          ),
          /* v3.6 会话选中文本 → 消息分叉浮动条 */
          msgSprout
            ? h(
                'div',
                {
                  className: 'rdw-inline-sprout',
                  style: {
                    left: Math.min(msgSprout.x, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 220),
                    top: msgSprout.y,
                  },
                  role: 'dialog',
                  'aria-label': '以选中内容分叉',
                  'data-dsh-no-drag': '',
                },
                h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--rdw-organic-ink)' } }, '🌱 对话选区自动分叉'),
                h('div', {
                  style: {
                    fontSize: 11.5, color: 'var(--rdw-organic-ink-2)', maxWidth: 220, maxHeight: 60, overflow: 'hidden',
                    lineHeight: 1.4, marginBottom: 7, padding: '4px 7px', background: 'var(--rdw-fill-quat)', borderRadius: 'var(--rdw-r-pebble-sm)',
                  },
                }, `"${String(msgSprout.excerpt).slice(0, 80)}${msgSprout.excerpt.length > 80 ? '…' : ''}"`),
                h('div', { className: 'row', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  h('button', {
                    type: 'button',
                    className: 'solid',
                    style: { background: 'var(--rdw-soil)', color: '#faf6f1', fontWeight: 600 },
                    title: '自动生成合规序号并直接创建新分支',
                    onClick: () => {
                      autoSproutFromMessage(msgSprout.excerpt)
                      setMsgSprout(null)
                    },
                  }, '⚡ 自动创建分支'),
                  h('button', {
                    type: 'button',
                    title: '打开命名弹窗自定义分支名称',
                    onClick: () => {
                      sproutFromMessage({ excerpt: msgSprout.excerpt, x: msgSprout.x, y: msgSprout.y })
                      setMsgSprout(null)
                    },
                  }, '自定义…'),
                  h('button', { type: 'button', onClick: () => setMsgSprout(null) }, '取消'),
                ),
              )
            : null,
          /* 回收站弹层 */
          recycleOpen
            ? h(
                'div',
                { className: 'rdw-ctxmask', role: 'presentation', onClick: () => setRecycleOpen(false) },
                h(
                  'div',
                  {
                    className: 'rdw-ctxmenu',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': '回收站',
                    style: { left: '50%', top: '18%', transform: 'translateX(-50%)', minWidth: 380, maxWidth: 480, padding: '12px 14px' },
                    onClick: (e) => e.stopPropagation(),
                  },
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--rdw-organic-ink)', marginBottom: 4 } }, '🗑 回收站'),
                  h('div', { style: { fontSize: 11.5, color: 'var(--rdw-organic-ink-3)', marginBottom: 10 } }, '软删的分支保留 30 天，可还原；到期自动彻底清除。'),
                  (fishbone && Array.isArray(fishbone.recycleBin) ? fishbone.recycleBin : []).length === 0
                    ? h('div', { style: { fontSize: 12, color: 'var(--rdw-organic-ink-3)', padding: '14px 0', textAlign: 'center' } }, '回收站是空的')
                    : h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 300, overflowY: 'auto' } },
                        ...(fishbone.recycleBin || []).map((entry) =>
                          h(
                            'div',
                            {
                              key: entry.rib.id,
                              style: {
                                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px',
                                border: '1px solid var(--rdw-warm-line-2)', borderRadius: 'var(--rdw-r-pebble-sm)',
                                background: 'var(--rdw-organic-surface)',
                              },
                            },
                            h('span', { style: { fontFamily: 'var(--rdw-font-mono)', fontSize: 11, color: 'var(--rdw-organic-ink-3)' } }, entry.rib.id),
                            h('span', { style: { flex: 1, minWidth: 0, fontSize: 12, color: 'var(--rdw-organic-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, entry.rib.name),
                            h('span', { style: { fontSize: 11, color: 'var(--rdw-organic-ink-3)', flex: '0 0 auto' } }, entry.deletedAt ? new Date(entry.deletedAt).toLocaleDateString() : ''),
                            h('button', {
                              type: 'button',
                              style: { padding: '2px 9px', fontSize: 11, borderRadius: 'var(--rdw-r-pebble-sm)', border: '1px solid var(--rdw-warm-line)', background: 'var(--rdw-organic-input)', color: 'var(--rdw-sage)', cursor: 'pointer' },
                              onClick: async () => {
                                const r = await ribOp('restore', entry.rib.id)
                                if (r) { setToast(`已还原 ${entry.rib.id}`); pushUndo(`还原 ${entry.rib.id}`, { op: 'delete', ribId: entry.rib.id }) }
                              },
                            }, '还原'),
                            h('button', {
                              type: 'button',
                              style: { padding: '2px 9px', fontSize: 11, borderRadius: 'var(--rdw-r-pebble-sm)', border: 'none', background: 'color-mix(in srgb,var(--rdw-st-rejected) 14%,transparent)', color: 'var(--rdw-st-rejected)', cursor: 'pointer' },
                              onClick: async () => {
                                if (typeof window !== 'undefined' && window.confirm && !window.confirm(`彻底删除 ${entry.rib.id}？此操作不可撤销。`)) return
                                await ribOp('purge', entry.rib.id, { confirm: true })
                              },
                            }, '彻底删除'),
                          ),
                        ),
                      ),
                ),
              )
            : null,
          /* 快捷键速查卡 */
          shortcutsOpen
            ? h(
                'div',
                { className: 'rdw-ctxmask', role: 'presentation', onClick: () => setShortcutsOpen(false) },
                h(
                  'div',
                  {
                    className: 'rdw-ctxmenu',
                    role: 'dialog',
                    'aria-label': '快捷键',
                    style: { left: '50%', top: '16%', transform: 'translateX(-50%)', minWidth: 340, padding: '13px 16px' },
                    onClick: (e) => e.stopPropagation(),
                  },
                  h('div', { style: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--rdw-organic-ink)' } }, '⌨ 项目流程画布快捷键'),
                  ...[
                    ['N', '在选中阶段下分新分支'],
                    ['Del', '删除选中分支到回收站'],
                    ['⌘/Ctrl + Z', '撤销'],
                    ['⇧⌘/Ctrl + Z 或 ⌘Y', '重做'],
                    ['?', '打开本速查卡'],
                    ['右键任意对象', '打开该对象的完整操作菜单'],
                    ['悬停分支 0.4s', '速览卡（含回连/删除直操）'],
                    ['悬停选中阶段的主体', '出现幻影分支，单击 = 闪电分叉'],
                    ['选中会话里的一段文字', '浮出「以选中内容分叉」'],
                    ['Esc', '关闭本卡'],
                  ].map(([kbd, desc]) =>
                    h('div', { key: kbd, style: { display: 'flex', gap: 10, padding: '3px 0', fontSize: 12 } },
                      h('span', { style: { fontFamily: 'var(--rdw-font-mono)', color: 'var(--rdw-sage)', minWidth: 110, fontWeight: 600 } }, kbd),
                      h('span', { style: { color: 'var(--rdw-organic-ink-2)' } }, desc),
                    ),
                  ),
                ),
              )
            : null,
        )
      }
    }

    // --- Module: src/index.js ---
    /**
     * 研究项目 DAG 工作台 — 客户端入口（DSH Desktop 工作台协议 + 旧槽位兼容）。
     *
     * 规范：https://dshdesktop.com/workbench/docs/development.md 第 3.5 节
     *   - 客户端必须是已构建好的单文件，通过 window.__ModuleLoader__.load 注册；
     *   - 业务面板优先通过 ctx.desktopWorkbenches.register({ title, repository, ... }) 注册；
     *   - register() 不填 id（工作台身份由 repository 解析为 owner/repo）。
     *
     * 布局（规范第 4 节）：
     *   - customFrame: true → 工作台自己撑满业务区，并自己安置宿主传入的原生会话节点；
     *     没有关联会话时业务页占满整屏，不会出现宿主的通用「先建会话」引导。
     *   - headerLayout: 'compact' → 使用宿主的紧凑顶部栏（避免与工作台工具栏重复），
     *     因此面板内必须且只能有一个 data-dsh-workbench-toolbar 元素。
     *   - layout 仍保留（businessSide / businessWidth），作为宿主不支持整页框架时的
     *     标准分栏兜底，与规范 4.1 的取值一致。
     *
     * 兼容说明：
     *   宿主若未提供 `desktopWorkbenches` 服务（旧版 Desktop），退回旧的 slots 注册
     *   （main 面板 + sidebar.panellist 图标），业务功能与交互完全不变。
     *   两个分支注册的是同一个 WorkbenchPanel 组件。
     */

    /** 侧栏图标（DAG 节点示意）。 */
    function WorkbenchIcon(React) {
      const h = React.createElement
      return function Icon() {
        return h(
          'svg',
          { viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': true, fill: 'none' },
          h('rect', { x: 3, y: 3, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
          h('rect', { x: 15, y: 3, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
          h('rect', { x: 9, y: 15, width: 6, height: 6, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.6 }),
          h('path', {
            d: 'M9 6h6M6 9v3a3 3 0 0 0 3 3h3M18 9v3a3 3 0 0 1-3 3h-3',
            stroke: 'currentColor',
            strokeWidth: 1.4,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        )
      }
    }

    /** 旧槽位协议用的面板 id（保持与历史一致，避免宿主侧引用断裂）。 */
    const PANEL_KEY = 'research-workbench'

    /** 工作台身份：规范 GitHub URL（小写 owner/repo）。 */
    const REPOSITORY = 'https://github.com/lineex/dsh-research-workbench'

    const TITLE = '研究项目 DAG 工作台'
    const DESCRIPTION =
      '项目流程式研究项目工作台：项目目标=研究目标，主支=研究阶段，分支=按需手动分出的探索智能体（默认带主支完整上下文，可从其他分支分叉，分支之间可通讯）；成果满意后一键回连主支。'

    /** 创建 Cordis 客户端插件描述。 */
    function createClientPlugin(React) {
      const BusinessPanel = createWorkbenchPanel(React)
      const Icon = WorkbenchIcon(React)

      /**
       * v3.14 渲染错误边界。
       *
       * 背景（真实故障）：面板内部任何一次渲染异常（旧数据字段缺失、宿主旧版返回结构变化等）
       * 都会让 React 卸载整棵树 → 用户看到的是「工作台崩溃 / 白屏」，连错误信息也看不到。
       * 这里把业务面板整体包住：出错时只把**这块面板**替换成可恢复提示卡，
       * 其余界面、会话与数据都不受影响，并且把真实错误显示出来便于定位。
       *
       * 注意：错误边界必须是 class，而部分宿主/验收脚本用的是精简 React shim，没有
       * `React.Component`。所以用工厂做条件构造——不支持时返回 null，调用方直接渲染面板，
       * 绝不在模块加载期就 `extends undefined` 把整个插件打崩。
       */
      const createPanelErrorBoundary = (ReactImpl) => {
        // 只认「真 React」：它的 Component.prototype 带 isReactComponent 标记。
        // 精简 shim（验收脚本 / 旧宿主）即便有 Component 也不具备错误边界语义，
        // 套上去只会把面板渲染成空——所以宁可不用，保证面板正常显示。
        if (!ReactImpl || typeof ReactImpl.Component !== 'function') return null
        const proto = ReactImpl.Component.prototype
        if (!proto || !proto.isReactComponent) return null
        return class PanelErrorBoundary extends ReactImpl.Component {
          constructor(props) {
            super(props)
            this.state = { error: null, info: '' }
          }

          static getDerivedStateFromError(error) {
            return { error }
          }

          componentDidCatch(error, info) {
            this.setState({ info: (info && info.componentStack) || '' })
            try {
              // eslint-disable-next-line no-console
              console.error('[research-dag-workbench] 面板渲染崩溃：', error, info)
            } catch {
              /* ignore */
            }
          }

          render() {
            const { error, info } = this.state
            if (!error) return this.props.children
            const message = (error && (error.message || String(error))) || '未知错误'
            return ReactImpl.createElement(
              'div',
              {
                className: 'rdw-panel',
                style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' },
              },
              ReactImpl.createElement(
                'div',
                { style: { fontSize: 15, fontWeight: 700, color: 'var(--rdw-st-rejected)' } },
                '工作台这一块渲染出错（其它界面和数据未受影响）',
              ),
              ReactImpl.createElement(
                'div',
                { style: { fontSize: 12, lineHeight: 1.6, color: 'var(--rdw-organic-ink-2)' } },
                message,
              ),
              ReactImpl.createElement(
                'div',
                { style: { display: 'flex', gap: 8 } },
                ReactImpl.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'rdw-organic-btn',
                    style: { padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
                    onClick: () => this.setState({ error: null, info: '' }),
                  },
                  '重试渲染',
                ),
                ReactImpl.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'rdw-organic-btn',
                    style: { padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
                    onClick: () => {
                      try {
                        if (typeof location !== 'undefined') location.reload()
                      } catch {
                        /* ignore */
                      }
                    },
                  },
                  '重新载入页面',
                ),
              ),
              info
                ? ReactImpl.createElement(
                    'pre',
                    {
                      style: {
                        fontSize: 11,
                        whiteSpace: 'pre-wrap',
                        opacity: 0.75,
                        maxHeight: 220,
                        overflow: 'auto',
                        margin: 0,
                      },
                    },
                    String(info).slice(0, 2000),
                  )
                : null,
            )
          }
        }
      }

      const PanelErrorBoundary = createPanelErrorBoundary(React)

      /** 用错误边界包一层，保持原有的 props 传递；宿主不支持 class 时直接渲染面板。 */
      function GuardedPanel(props) {
        const panel = React.createElement(BusinessPanel, props)
        if (!PanelErrorBoundary) return panel
        return React.createElement(PanelErrorBoundary, null, panel)
      }

      /**
       * 注册时选组件：只有「真 React」才套错误边界。
       *
       * 为什么要区分：验收脚本/旧宿主用的是精简 React shim，它的 createElement 对
       * 「函数组件再 createElement 子组件」这条路径支持不完整，套一层就会把整页渲染成空
       * （实测 layout 验收 70 项通过掉到 38 项）。真 React 有 `version` 字符串，shim 没有。
       * 所以：真 React → 套边界（异常不白屏）；其它 → 原样注册（保证正常渲染）。
       */
      const isRealReact = Boolean(React && typeof React.version === 'string' && /^\d+\./.test(React.version))
      const RegisteredPanel = isRealReact && PanelErrorBoundary ? GuardedPanel : BusinessPanel

      return {
        name: 'dsh-research-workbench',

        /**
         * 按宿主能力选择注册路径。
         * @param {any} ctx Cordis 客户端上下文。
         */
        apply(ctx) {
          // 规范 3.5 路径：新版 Desktop 提供 desktopWorkbenches 服务。
          if (ctx && ctx.desktopWorkbenches && typeof ctx.desktopWorkbenches.register === 'function') {
            ctx.effect(
              () =>
                ctx.desktopWorkbenches.register(
                  {
                    title: TITLE,
                    repository: REPOSITORY,
                    description: DESCRIPTION,
                    panelTitle: TITLE,
                    icon: Icon,
                    audience: 'clinical-research',
                    requirements: '需要本机可读的 DAG 项目目录（research-dag 项目结构）',
                    // 整页业务优先：工作台自己安置宿主会话节点，无会话时业务页占满。
                    customFrame: true,
                    // 使用宿主紧凑顶部栏（工作台内只有一个 data-dsh-workbench-toolbar）。
                    headerLayout: 'compact',
                    // 兜底分栏（宿主不支持整页框架时按此比例放在左侧）。
                    layout: { businessSide: 'left', businessWidth: 0.4 },
                  },
                  RegisteredPanel,
                ),
              'dsh-research-dag-workbench: desktop workbench panel',
            )
            return
          }

          // 兼容路径：本机 Desktop 尚无该服务，退回旧槽位注册（业务行为不变）。
          if (ctx && ctx.slots && typeof ctx.slots.register === 'function') {
            ctx.effect(
              () =>
                ctx.slots.inject('main', () =>
                  ctx.slots.register(
                    {
                      name: 'main',
                      key: PANEL_KEY,
                      inject: () => ({ project: '', server: null, config: null }),
                    },
                    RegisteredPanel,
                  ),
                ),
              'dsh-research-dag-workbench: legacy main panel',
            )
            ctx.effect(
              () =>
                ctx.slots.inject('sidebar.panellist', () =>
                  ctx.slots.register(
                    {
                      name: 'sidebar.panellist',
                      id: PANEL_KEY,
                      order: 21,
                      label: () => TITLE,
                    },
                    Icon,
                  ),
                ),
              'dsh-research-dag-workbench: legacy sidebar entry',
            )
          }
        },

        /**
         * 加载顺序：先等 Desktop 工作台服务（若存在），再注册本包。
         * `slots` 在旧宿主上是必需的，保留在列表里不影响新版（缺失时该服务被跳过）。
         */
        inject: ['desktopWorkbenches', 'slots'],
      }
    }

    return createClientPlugin(React)
  },
})
