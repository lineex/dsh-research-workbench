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
import {
  ACTION_LABELS,
  BRIDGE_LABELS,
  CONTENT_UPGRADE_NOTICE,
  CREATE_FIELD_SPECS,
  HOST_UPGRADE_NOTICE,
  NETWORK_UPGRADE_NOTICE,
  SHELL_CSS,
  STYLES,
  WELCOME_COPY,
  handoffName,
  hostSupportsAction,
  hostSupportsCreate,
  isAbsoluteProjectPath,
  isValidNodeId,
  isValidSlug,
  isValidStream,
} from './core/constants.js'
import { RDW_SKELETON_CSS, RDW_THEME_CSS, RDW_THEME_PRESET_CSS, RDW_THEME_IDS } from './core/theme.js'
import {
  fetchBranchWork,
  fetchContent,
  fetchFile,
  fetchFishbone,
  fetchHandoff,
  fetchHealth,
  fetchLeaderLog,
  fetchResults,
  fetchRuns,
  fetchState,
  fetchZotero,
  postAction,
  postBranchDirective,
  postBridge,
  postMountContext,
  postOpenExternal,
  postOpenSidebar,
  postRibOp,
  postZoteroOp,
  saveConfig,
  settleRun,
  fetchGoalCard,
  postGoalCard,
} from './core/api.js'
import { renderHeader } from './components/Header.js'
import { renderCommandBar } from './components/CommandBar.js'
import { renderContextMenu, renderHoverCard, renderInlineSprout, mi, sep, sub } from './components/ContextMenu.js'
import { renderToast } from './components/Toast.js'
import { renderProjectBar } from './components/ProjectBar.js'
import { renderCreateDialog, renderReasonDialog } from './components/ReasonDialog.js'
import { renderSproutDialog, renderGraftDialog, renderModuleDialog } from './components/FishboneDialogs.js'
import { renderResultsView } from './views/ResultsView.js'
import { renderContentView, renderIdeaDialog, renderFileModal, renderBranchWorkModal } from './views/ContentView.js'
import { renderFishboneView } from './views/FishboneView.js'
import { renderLeaderLogView } from './views/LeaderLogView.js'
import { renderBranchSessionView } from './views/BranchSessionView.js'
import { renderNetworkView } from './views/NetworkView.js'
import { renderOverviewView } from './views/OverviewView.js'
import { renderDagView } from './views/DagView.js'
import { renderHandoffsView } from './views/HandoffsView.js'
import { renderControlView } from './views/ControlView.js'
import { renderEngineeringView } from './views/EngineeringView.js'
import { renderProjectsHubView } from './views/ProjectsHubView.js'
import { renderGoalCardView } from './components/GoalCardView.js'
import { buildGoalDiscussionPrompt } from './core/goal-skills.js'

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
export function createWorkbenchPanel(React) {
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
      if (!ribId) {
        setZoteroData(null)
        return
      }
      loadZotero(rootPath, ribId, zoteroSearch)
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
        if (!ribId) return
        loadZotero(rootPath, ribId, zoteroSearch, true)
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
        setProjectsRegistry((prev) => {
          const norm = String(project.root).trim().toLowerCase()
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
    }, [project, fishbone])

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

    const removeProjectFromRegistry = (proj) => {
      setProjectsRegistry((prev) => {
        const next = prev.filter((p) => p.root !== proj.root && p.id !== proj.id)
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem('rdw_projects_registry', JSON.stringify(next))
        } catch {}
        return next
      })
      setToast(`已从总控台移除「${proj.title || proj.id}」（本地文件完整保留）`)
    }

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

    /** 主支上移 / 下移：只改显示顺序。 */
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
      onRemoveProject: removeProjectFromRegistry,
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
                ? networkNode
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
            ['network', '🌐 网络'],
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
