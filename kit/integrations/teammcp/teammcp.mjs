#!/usr/bin/env node
/**
 * TeamMCP 项目路由桥 CLI —— 把 research-dag 项目接入本机 TeamMCP 协作总线。
 *
 * 设计约束（见 SPEC.md）：
 *  - 零第三方依赖（Node >= 18，内置 fetch）。
 *  - 令牌只存 $DSH_HOME/teammcp/agents.json（默认 ~/.dsh/teammcp/agents.json，0600），
 *    绝不写入项目目录、绝不打印令牌全文（最多前 8 位）。
 *  - 项目侧只写 control/teammcp.json（非机密，原子写）；不改 control/ 其它文件、
 *    不碰 handoff 状态（route 只是通知，不是审批）。
 *  - pull 不调用 /api/inbox（v1.0.2 有 bug），用 /api/history + 本地 lastSeen。
 *
 * 命令：doctor / init / push / pull / send / route / status
 * 退出码：0 成功；1 校验；2 用法；3 IO/网络/服务端错误。
 *
 * @module integrations/teammcp/teammcp
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_SERVER = 'http://127.0.0.1:3100'
const DEFAULT_BUS = 'research-dag'
const DEFAULT_STATE_PROJECT = 'research-dag'
const TOKEN_SCHEMA = 1
const HTTP_TIMEOUT_MS = 5000
const MAX_TEXT_CHARS = 10000
const MAX_PROJECT_SEARCH_DEPTH = 8
const HANDOFF_STATUSES = ['DRAFT', 'PROVISIONAL', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'BLOCKED']
const VERSION = '1.2.0'
const NETWORK_PROJECT = DEFAULT_STATE_PROJECT
const STALE_HOURS = 48
const MAX_IDEAS = 20
const MAX_REVIEWED = 50
const MAX_RESULTS = 20

/* ------------------------------------------------------------------ 错误 */

class TmcpError extends Error {
  constructor(code, message, exit = 3) {
    super(message)
    this.name = 'TmcpError'
    this.code = code
    this.exit = exit
    this.status = undefined
  }
}

const fail = (code, message, exit = 3) => {
  throw new TmcpError(code, message, exit)
}
const usageError = (message) => fail('E002', message, 2)
const validError = (message, exit = 1) => fail('E001', message, exit)
const networkError = (message) => fail('E003', message, 3)

/* ------------------------------------------------------------ 参数与输出 */

const COMMANDS = [
  'doctor',
  'init',
  'push',
  'publish',
  'idea',
  'review',
  'digest',
  'pull',
  'send',
  'route',
  'status',
]
const BOOLEAN_FLAGS = new Set([
  'json',
  'write',
  'no-state',
  'help',
  'dry-run',
  'no-message',
  'satisfied',
  'not-satisfied',
])
const VALUE_FLAGS = new Set([
  'project',
  'server',
  'bus',
  'channel',
  'channels',
  'to',
  'text',
  'handoff',
  'note',
  'tag',
  'stream',
  'module',
  'version',
  'since',
])

function parseArgv(argv) {
  const options = { _: [], flags: new Set() }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--') {
      options._.push(...argv.slice(i + 1))
      break
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq > 0) {
        const key = arg.slice(2, eq)
        if (!VALUE_FLAGS.has(key)) usageError(`未知参数 --${key}`)
        options[key] = arg.slice(eq + 1)
        continue
      }
      const key = arg.slice(2)
      if (BOOLEAN_FLAGS.has(key)) {
        options.flags.add(key)
        if (key === 'json') options.json = true
        if (key === 'write') options.write = true
        if (key === 'no-state') options['no-state'] = true
        if (key === 'no-message') options['no-message'] = true
        if (key === 'satisfied') options.satisfied = true
        if (key === 'not-satisfied') options['not-satisfied'] = true
        if (key === 'help') options.help = true
        if (key === 'dry-run') options['dry-run'] = true
        continue
      }
      if (!VALUE_FLAGS.has(key)) usageError(`未知参数 --${key}`)
      const next = argv[i + 1]
      if (next === undefined || (next.startsWith('--') && next.length > 2)) {
        usageError(`参数 --${key} 缺少值`)
      }
      options[key] = next
      i += 1
      continue
    }
    options._.push(arg)
  }
  return options
}

const isJson = (options) => options.json === true

/** 输出最终结果：--json 时 stdout 只输出 JSON。 */
function emit(options, jsonData, humanLines) {
  if (isJson(options)) {
    process.stdout.write(`${JSON.stringify(jsonData, null, 2)}\n`)
    return
  }
  for (const line of humanLines) process.stdout.write(`${line}\n`)
}

function maskToken(token) {
  if (typeof token !== 'string' || token.length === 0) return '(missing)'
  if (token.length <= 8) return '…'
  return `${token.slice(0, 8)}…`
}

function nowIso() {
  return new Date().toISOString()
}

function shortTime(iso) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(iso || ''))
  if (!match) return String(iso || '').slice(0, 16)
  return match[2]
}

function firstLine(text, max = 200) {
  const line = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)[0]
  return line ? line.slice(0, max) : ''
}

const cmpStr = (a, b) => {
  const left = String(a === undefined || a === null ? '' : a)
  const right = String(b === undefined || b === null ? '' : b)
  return left < right ? -1 : left > right ? 1 : 0
}

/* ------------------------------------------------------------ 路径与文件 */

const pathExists = (target) => {
  try {
    fs.statSync(target)
    return true
  } catch {
    return false
  }
}

const isFile = (target) => {
  try {
    return fs.statSync(target).isFile()
  } catch {
    return false
  }
}

const isDirectory = (target) => {
  try {
    return fs.statSync(target).isDirectory()
  } catch {
    return false
  }
}

function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.trim()
    ? path.resolve(process.env.DSH_HOME)
    : path.join(os.homedir(), '.dsh')
}

function tokenStorePath() {
  return path.join(dshHome(), 'teammcp', 'agents.json')
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function atomicWriteJson(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  fs.renameSync(tmp, file)
  try {
    fs.chmodSync(file, mode)
  } catch {
    /* Windows 上 chmod 是近似；忽略 */
  }
}

function atomicWriteText(file, text, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, text, 'utf8')
  fs.renameSync(tmp, file)
  try {
    fs.chmodSync(file, mode)
  } catch {
    /* ignore */
  }
}

function findProjectRoot(start, maxDepth = MAX_PROJECT_SEARCH_DEPTH) {
  let dir = path.resolve(start)
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    if (isFile(path.join(dir, 'control', 'PROJECT_STATE.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function resolveProjectRoot(options, { required = true } = {}) {
  if (typeof options.project === 'string' && options.project.trim()) {
    const root = path.resolve(options.project.trim())
    if (!isDirectory(root) || !isFile(path.join(root, 'control', 'PROJECT_STATE.json'))) {
      validError(`--project 不是 research-dag 项目（缺 control/PROJECT_STATE.json）：${root}`)
    }
    return root
  }
  const found = findProjectRoot(process.cwd())
  if (found) return found
  if (required) {
    validError('找不到 research-dag 项目：当前目录向上 8 层没有 control/PROJECT_STATE.json（用 --project 指定）')
  }
  return null
}

function readProjectState(root) {
  const file = path.join(root, 'control', 'PROJECT_STATE.json')
  const state = readJsonFile(file)
  if (!state || typeof state !== 'object') validError(`无法读取项目状态：${file}`)
  return state
}

function projectIdentity(root, state) {
  const project = state && state.project && typeof state.project === 'object' ? state.project : {}
  const projectId = String(project.id || path.basename(root) || '')
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(projectId)) {
    validError(`项目 id 非法或缺失：${JSON.stringify(projectId)}`)
  }
  return { projectId, title: String(project.title || project.name || projectId) }
}

function projectConfigPath(root) {
  return path.join(root, 'control', 'teammcp.json')
}

function readProjectConfig(root) {
  return readJsonFile(projectConfigPath(root))
}

function writeProjectConfig(root, config) {
  atomicWriteJson(projectConfigPath(root), config, 0o644)
}

/* ---------------------------------------------------------------- 令牌库 */

function loadTokenStore() {
  const file = tokenStorePath()
  const raw = pathExists(file) ? readJsonFile(file) : null
  const store =
    raw && typeof raw === 'object'
      ? raw
      : { schema: TOKEN_SCHEMA, server: DEFAULT_SERVER, admin: { channel: 'Chairman', state: 'human' }, agents: {} }
  store.schema = TOKEN_SCHEMA
  if (!store.server) store.server = DEFAULT_SERVER
  if (!store.admin || typeof store.admin !== 'object') store.admin = { channel: 'Chairman', state: 'human' }
  if (!store.agents || typeof store.agents !== 'object' || Array.isArray(store.agents)) store.agents = {}
  for (const [name, entry] of Object.entries(store.agents)) {
    if (!entry || typeof entry !== 'object' || typeof entry.token !== 'string') delete store.agents[name]
  }
  return store
}

function saveTokenStore(store) {
  atomicWriteJson(tokenStorePath(), store, 0o600)
}

function storeAgentNames(store) {
  return Object.keys(store.agents)
}

function storeProjectAgents(store) {
  return Object.entries(store.agents)
    .filter(([, entry]) => entry && typeof entry.projectId === 'string' && entry.projectId.length > 0)
    .map(([name, entry]) => ({ name, projectId: entry.projectId, role: entry.role }))
}

function maskAgentList(store) {
  return Object.entries(store.agents).map(([name, entry]) => ({
    name,
    role: entry.role || '',
    projectId: entry.projectId || null,
    token: maskToken(entry.token),
  }))
}

/* ------------------------------------------------------------------ 网络 */

function normalizeServer(raw) {
  const value = String(raw || DEFAULT_SERVER).trim()
  let url
  try {
    url = new URL(value)
  } catch {
    usageError(`--server 不是合法 URL：${value}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    usageError('--server 必须是 http(s):// 地址')
  }
  if (url.pathname && url.pathname !== '/') {
    usageError('--server 不应带路径（用 http://host:port 形式）')
  }
  return `${url.protocol}//${url.host}`
}

function resolveServer(options, store) {
  const raw = options.server || (store && store.server) || DEFAULT_SERVER
  return normalizeServer(raw)
}

/**
 * 调用 TeamMCP HTTP API。
 * @returns {Promise<{status:number,data:any}>}
 */
async function api(server, method, apiPath, { token, body, query } = {}) {
  const url = new URL(`${server}${apiPath}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  }
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const init = { method, headers, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    const name = error && error.name ? error.name : ''
    const detail = name === 'TimeoutError' || name === 'AbortError' ? '请求超时（5s）' : String(error && error.message ? error.message : error)
    networkError(`TeamMCP 请求失败 ${method} ${apiPath}：${detail}`)
  }
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && data.error
        ? String(data.error)
        : String(text || `HTTP ${response.status}`).slice(0, 500)
    const code = response.status === 401 || response.status === 403 ? 'E005' : 'E005'
    const err = new TmcpError(
      code,
      `TeamMCP API ${response.status} ${method} ${apiPath}：${message}`,
      response.status >= 500 ? 3 : 1,
    )
    err.status = response.status
    throw err
  }
  return { status: response.status, data }
}

async function getHealth(server) {
  try {
    const { data } = await api(server, 'GET', '/api/health')
    return data
  } catch (error) {
    if (error instanceof TmcpError) {
      throw new TmcpError('E003', `无法连接 TeamMCP（${server}）：${error.message}`, 3)
    }
    throw error
  }
}

async function meOrNull(server, token) {
  try {
    const { data } = await api(server, 'GET', '/api/me', { token })
    return data
  } catch (error) {
    if (error instanceof TmcpError && error.status === 401) return null
    throw error
  }
}

/* ------------------------------------------------------------ 注册与令牌 */

async function ensureAgent(store, server, name, role, projectId, notes) {
  if (!name || typeof name !== 'string') validError('agent 名字不能为空')
  const existing = store.agents[name]
  if (existing && existing.token) {
    const me = await meOrNull(server, existing.token)
    if (me && me.name === name) {
      if (role && !existing.role) existing.role = role
      if (projectId && !existing.projectId) existing.projectId = projectId
      notes.push(`复用已有 agent：${name}（${maskToken(existing.token)}）`)
      return existing
    }
    notes.push(`agent ${name} 的本地令牌已失效，重新注册`)
    delete store.agents[name]
  }
  const { data } = await api(server, 'POST', '/api/register', { body: { name, role: role || '' } })
  const token = data && typeof data.apiKey === 'string' ? data.apiKey : ''
  if (!token) fail('E005', `注册 agent ${name} 失败：服务端未返回 apiKey`, 3)
  store.agents[name] = {
    token,
    role: role || '',
    ...(projectId ? { projectId } : {}),
  }
  saveTokenStore(store)
  notes.push(`注册 agent：${name}（${maskToken(token)}）`)
  return store.agents[name]
}

/**
 * 已知/未知项目 id → 确保 dag-<id> agent 存在（send/route 的跨项目 DM 用）。
 */
async function ensureRecipientAgent(store, server, projectId, notes) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(projectId)) {
    usageError(`项目 id 非法：${projectId}`)
  }
  const name = `dag-${projectId}`
  await ensureAgent(store, server, name, `Research project: ${projectId}`, projectId, notes)
  return name
}

/* --------------------------------------------------------- 频道与成员管理 */

async function listChannels(server, token) {
  const { data } = await api(server, 'GET', '/api/channels', { token })
  return Array.isArray(data) ? data : []
}

async function getChannelMembers(server, token, channelId) {
  const { data } = await api(server, 'GET', `/api/channels/${encodeURIComponent(channelId)}/members`, { token })
  return data && Array.isArray(data.members) ? data.members : []
}

async function addChannelMember(server, chairmanToken, channelId, agentName) {
  await api(server, 'POST', `/api/channels/${encodeURIComponent(channelId)}/members`, {
    token: chairmanToken,
    body: { agent_name: agentName },
  })
}

/**
 * 确保 group 频道存在且包含所需成员（幂等）。
 * @returns {Promise<{id:string,created:boolean,addedMembers:string[],members:string[]}>}
 */
async function ensureGroupChannel(server, chairmanToken, spec, notes) {
  const { id } = spec
  const existingChannels = await listChannels(server, chairmanToken)
  let channel = existingChannels.find((item) => item && item.id === id)
  let created = false
  if (!channel) {
    try {
      await api(server, 'POST', '/api/channels', {
        token: chairmanToken,
        body: {
          id,
          type: 'group',
          name: spec.name || id,
          description: spec.description || '',
          members: spec.members || [],
        },
      })
      created = true
      notes.push(`创建频道 ${id}`)
    } catch (error) {
      if (!(error instanceof TmcpError && error.status === 409)) throw error
      notes.push(`频道 ${id} 已存在（创建冲突 409），继续补齐成员`)
    }
    channel = { id }
  }
  const currentMembers = await getChannelMembers(server, chairmanToken, id)
  const addedMembers = []
  for (const member of spec.members || []) {
    if (!member || currentMembers.includes(member)) continue
    await addChannelMember(server, chairmanToken, id, member)
    addedMembers.push(member)
    notes.push(`频道 ${id} 加入成员 ${member}`)
  }
  return {
    id,
    created,
    addedMembers,
    members: [...new Set([...currentMembers, ...addedMembers])],
  }
}

async function resolveSendTarget(server, token, config, spec) {
  const raw = String(spec || 'bus').trim()
  if (raw === '' || raw === 'bus') return config.busChannel || DEFAULT_BUS
  if (raw === 'project') {
    if (!config.channel) validError('项目配置缺少 channel，请先运行 init')
    return config.channel
  }
  if (raw.startsWith('channel:')) {
    const id = raw.slice('channel:'.length).trim()
    if (!id) usageError('--channel 需要频道 id')
    return id
  }
  // 其它按频道 id 精确匹配
  const channels = await listChannels(server, token)
  const found = channels.find((channel) => channel && channel.id === raw)
  if (!found) validError(`频道不存在：${raw}（--channel bus|project|<id>）`)
  return raw
}

/* ---------------------------------------------------------------- CLI 工具 */

function parseJsonOutput(text) {
  if (typeof text !== 'string' || !text.trim()) return null
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith('{')) continue
    try {
      return JSON.parse(lines[i])
    } catch {
      /* 继续 */
    }
  }
  try {
    return JSON.parse(text.trim())
  } catch {
    return null
  }
}

function kitTool() {
  return path.resolve(HERE, '..', '..', 'tools', 'dag.mjs')
}

function dagToolFor(root) {
  const local = path.join(root, 'control', 'dag.mjs')
  if (isFile(local)) return local
  return kitTool()
}

function runDagOnce(tool, root, command) {
  const args = [tool, command, '--json', '--root', root]
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, ...(path.extname(process.execPath).toLowerCase() === '.exe' ? { ELECTRON_RUN_AS_NODE: '1' } : {}) },
  })
}

/**
 * 优先项目内 control/dag.mjs；失败（如旧版 CLI 没有 results 命令）时自动重试 kit CLI。
 * JSON 解析成功即保留（verify 发现 issues 时 exit=1 也算成功解析）。
 */
function runDagJson(root, command, notes) {
  const preferred = dagToolFor(root)
  let tool = preferred
  let result = runDagOnce(tool, root, command)
  let json = parseJsonOutput(result.stdout || '')
  if ((!json || result.status !== 0) && tool !== kitTool()) {
    const kit = kitTool()
    if (isFile(kit)) {
      const retry = runDagOnce(kit, root, command)
      const retryJson = parseJsonOutput(retry.stdout || '')
      if (retryJson && (retry.status === 0 || json === null)) {
        notes.push(`${command}：项目 CLI 结果不可用（exit=${result.status}），已改用 kit CLI`)
        tool = kit
        result = retry
        json = retryJson
      }
    }
  }
  if (result.error) {
    notes.push(`${command} --json 执行失败：${result.error.message}`)
    return { ok: false, json: null, status: null, stdout: result.stdout || '', stderr: result.stderr || '', tool }
  }
  if (!json) {
    const detail = firstLine(result.stderr || result.stdout || '') || `exit=${result.status}`
    notes.push(`${command} --json 失败（${detail}），降级读取文件`)
  } else if (result.status !== 0) {
    // verify 在发现问题时 exit=1，但 stdout 仍是合法 JSON；这里保留 JSON 不降级。
    notes.push(`${command} --json 退出码 ${result.status}（JSON 已解析）`)
  }
  return { ok: json !== null, json, status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', tool }
}

/* ------------------------------------------------------------ handoff 解析 */

function stripQuotes(value) {
  const text = String(value || '').trim()
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1)
  }
  return text
}

/** 解析 handoff 扁平 frontmatter（够用即可；不引入 YAML 依赖）。 */
function parseFrontmatter(content) {
  const source = String(content || '')
  const info = { frontmatter: {}, body: source, hasFrontmatter: false }
  if (!source.startsWith('---')) return info
  const firstNl = source.indexOf('\n')
  if (firstNl < 0) return info
  if (source.slice(0, firstNl).replace(/\r$/, '').trim() !== '---') return info
  const entries = {}
  let pos = firstNl + 1
  while (pos <= source.length) {
    const nl = source.indexOf('\n', pos)
    const end = nl < 0 ? source.length : nl
    let line = source.slice(pos, end)
    if (line.endsWith('\r')) line = line.slice(0, -1)
    if (line.trim() === '---') {
      const bodyStart = nl < 0 ? source.length : nl + 1
      let body = source.slice(bodyStart)
      if (body.startsWith('\r\n')) body = body.slice(2)
      else if (body.startsWith('\n')) body = body.slice(1)
      info.frontmatter = entries
      info.body = body
      info.hasFrontmatter = true
      return info
    }
    if (line.trim()) {
      const colon = line.indexOf(':')
      if (colon > 0) {
        const key = line.slice(0, colon).trim()
        const value = stripQuotes(line.slice(colon + 1).trim())
        entries[key] = value === '' ? null : value
      }
    }
    if (nl < 0) break
    pos = nl + 1
  }
  return info
}

function readHandoff(root, handoffRel) {
  const raw = String(handoffRel || '').trim()
  if (!raw) usageError('--handoff 必填（项目内相对路径）')
  if (path.isAbsolute(raw) || raw.startsWith('/') || /^[A-Za-z]:/.test(raw)) {
    validError('--handoff 必须是项目内相对路径')
  }
  const abs = path.resolve(root, raw)
  const rel = path.relative(root, abs)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    validError('--handoff 路径逃逸到项目根之外')
  }
  if (!isFile(abs)) validError(`handoff 不存在：${raw}`)
  const content = fs.readFileSync(abs, 'utf8')
  const parsed = parseFrontmatter(content)
  const fm = parsed.frontmatter || {}
  if (!fm.status) validError(`handoff 缺少 frontmatter.status：${raw}`)
  const status = String(fm.status).toUpperCase()
  if (!HANDOFF_STATUSES.includes(status)) validError(`handoff status 非法：${fm.status}`)
  return {
    abs,
    rel: rel.split(path.sep).join('/'),
    content,
    frontmatter: fm,
    status,
    stream: fm.stream || '',
    version: fm.version !== undefined && fm.version !== null ? String(fm.version) : '',
    module: fm.module || '',
    branch: fm.branch || '',
    project: fm.project || '',
  }
}

/* ------------------------------------------------------------- 项目配置 */

function defaultProjectConfig({ server, projectId, agent, busChannel }) {
  return {
    schema: 1,
    server,
    projectId,
    agent,
    channel: `dag-${projectId}`,
    busChannel,
    lastSeen: {},
    lastPush: {},
  }
}

function mergeProjectConfig(existing, patch) {
  const base = existing && typeof existing === 'object' ? existing : {}
  return {
    ...base,
    ...patch,
    schema: 1,
    lastSeen: { ...(base.lastSeen && typeof base.lastSeen === 'object' ? base.lastSeen : {}), ...(patch.lastSeen || {}) },
    lastPush: { ...(base.lastPush && typeof base.lastPush === 'object' ? base.lastPush : {}), ...(patch.lastPush || {}) },
  }
}

/* --------------------------------------------------------------- 状态读写 */

async function writeStateField(server, token, projectId, field, value, reason) {
  const { data } = await api(server, 'POST', '/api/state', {
    token,
    body: { project_id: projectId, field, value, reason },
  })
  return data
}

async function readStateField(server, token, projectId, field) {
  const { data } = await api(server, 'GET', '/api/state', { token, query: { project_id: projectId, field } })
  if (!data || typeof data !== 'object') return null
  try {
    return JSON.parse(data.value)
  } catch {
    return data.value
  }
}

async function writeStateFields(server, token, projectId, entries, reason, notes) {
  const written = []
  for (const [field, value] of entries) {
    try {
      await writeStateField(server, token, projectId, field, value, reason)
      written.push(field)
    } catch (error) {
      if (error instanceof TmcpError && error.status === 403) {
        notes.push(`state 字段 ${field} 被拒绝（403）：需要 STATE_ADMINS（human/CEO/CTO/PM），当前令牌不是管理员`)
      }
      throw error
    }
  }
  return written
}

/* ------------------------------------------------------- 汇总数据（push） */

function buildHandoffTitle(entry) {
  if (!entry) return ''
  if (typeof entry === 'string') return entry
  const stream = entry.stream || entry.branch || entry.path || ''
  const version = entry.version !== undefined && entry.version !== null ? ` v${entry.version}` : ''
  return `${stream}${version}`.trim()
}

function gatherDagData(root, state, notes) {
  const statusRun = runDagJson(root, 'status', notes)
  const verifyRun = runDagJson(root, 'verify', notes)
  const listRun = runDagJson(root, 'list', notes)

  let status = statusRun.json
  if (!status || typeof status !== 'object') {
    notes.push('status --json 不可用，降级读取 PROJECT_STATE.json')
    status = {
      ok: true,
      project: state.project || {},
      phase: state.phase || '',
      next_steps: Array.isArray(state.next_steps) ? state.next_steps : [],
      blockers: Array.isArray(state.blockers) ? state.blockers : [],
      pending_decisions: Array.isArray(state.pending_decisions) ? state.pending_decisions : [],
      accepted: [],
      modules: Array.isArray(state.modules) ? state.modules : [],
    }
  }

  let verify = verifyRun.json
  if (!verify || typeof verify !== 'object') {
    notes.push('verify --json 不可用，按未验证处理')
    verify = { ok: false, checked: {}, issues: [{ code: 'TMCP-E003', message: 'DAG verify 不可用' }] }
  }

  let list = listRun.json
  if (!list || typeof list !== 'object') {
    notes.push('list --json 不可用，降级读取 control/ledger.json')
    const ledger = readJsonFile(path.join(root, 'control', 'ledger.json'))
    list = { ok: true, handoffs: ledger && Array.isArray(ledger.handoffs) ? ledger.handoffs : [] }
  }

  const handoffs = Array.isArray(list.handoffs) ? list.handoffs : []
  const acceptedFromList = handoffs.filter((handoff) => String(handoff.status || '').toUpperCase() === 'ACCEPTED')
  const accepted = Array.isArray(status.accepted) && status.accepted.length > 0 ? status.accepted : acceptedFromList
  const pending = Array.isArray(status.pending_decisions) ? status.pending_decisions : []
  const checked = verify.checked && typeof verify.checked === 'object' ? verify.checked : {}
  const modules = Array.isArray(status.modules) ? status.modules : Array.isArray(state.modules) ? state.modules : []
  const branches = Array.isArray(state.branches) ? state.branches : []
  const handoffCount = Number.isFinite(Number(checked.handoffs)) ? Number(checked.handoffs) : handoffs.length
  const moduleCount = Number.isFinite(Number(checked.modules)) ? Number(checked.modules) : modules.length
  const branchCount = Number.isFinite(Number(checked.branches)) ? Number(checked.branches) : branches.length
  const blockedCount = handoffs.filter((handoff) => String(handoff.status || '').toUpperCase() === 'BLOCKED').length

  return {
    status,
    verify,
    list,
    handoffs,
    accepted,
    pending,
    counts: {
      handoffs: handoffCount,
      modules: moduleCount,
      branches: branchCount,
      accepted: accepted.length,
      pending: pending.length,
      blocked: blockedCount,
    },
    tool: statusRun.status === null ? dagToolFor(root) : dagToolFor(root),
  }
}

function buildPushContent({ projectId, title, data }) {
  const { status, verify } = data
  const phase = status.phase || (status.project && status.project.phase) || 'unknown'
  const verifyState = verify.ok ? 'ok' : 'fail'
  const acceptedTitles = data.accepted.map(buildHandoffTitle).filter(Boolean)
  const pendingTitles = data.pending.map(buildHandoffTitle).filter(Boolean)
  const nextSteps = (Array.isArray(status.next_steps) ? status.next_steps : [])
    .map((step) => (typeof step === 'string' ? step : buildHandoffTitle(step)))
    .filter(Boolean)
  const lines = []
  lines.push(`**project: ${projectId} · ${title}**`)
  lines.push(
    `phase: ${phase} ｜ verify: ${verifyState} (${data.counts.handoffs} handoff / ${data.counts.modules} 模块 / ${data.counts.branches} 分支)`,
  )
  lines.push(`待决定: ${data.counts.pending} ｜ 已接受: ${data.counts.accepted} ｜ 阻塞: ${data.counts.blocked}`)
  if (acceptedTitles.length > 0) lines.push(`已接受: ${acceptedTitles.slice(0, 10).join('、')}`)
  if (nextSteps.length > 0) lines.push(`下一步: ${nextSteps.slice(0, 5).join('；')}`)
  const content = lines.join('\n')
  const summary = content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 500)
  return { content, summary, phase, verifyState, acceptedTitles, pendingTitles }
}

/* ------------------------------------------------------- 项目网络层辅助 */

function localMinute(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseSince(raw, now = new Date()) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  const value = String(raw).trim()
  const match = /^(\d+)\s*(m|h|d)$/i.exec(value)
  if (match) {
    const amount = Number(match[1])
    const unit = match[2].toLowerCase()
    const ms = unit === 'm' ? amount * 60000 : unit === 'h' ? amount * 3600000 : amount * 86400000
    return new Date(now.getTime() - ms)
  }
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date
  usageError(`--since 非法：${value}（支持 24h、7d 或 ISO 时间）`)
}

const isNewerThan = (iso, since) => Boolean(since && iso && new Date(iso).getTime() >= since.getTime())

function normalizeText(value, max = 200) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

/** 抽取 handoff 正文第 N 节（如第 4 节「关键结果」），用于 results 不可用时的兜底。 */
function extractSectionBody(text, number) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const headingRe = new RegExp(`^##\\s*${number}[.、\\s]`)
  let collecting = false
  const collected = []
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (collecting) break
      if (headingRe.test(line)) {
        collecting = true
        continue
      }
    }
    if (collecting) collected.push(line)
  }
  return collected.join('\n').trim()
}

/* --------------------------------------------------------- IDEAS / REVIEWS */

function parseIdeasFile(root) {
  const file = path.join(root, 'control', 'IDEAS.md')
  if (!isFile(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const entries = []
  let current = null
  const finalize = () => {
    if (!current) return
    const body = current.lines.join('\n').trim()
    if (body) entries.push({ at: current.at, ...(current.tag ? { tag: current.tag } : {}), text: body })
    current = null
  }
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(rawLine)
    if (heading) {
      finalize()
      const label = heading[1]
      const at = label.split('·')[0].trim()
      const tagMatch = /\[([^\]]+)\]/.exec(label)
      current = { at, tag: tagMatch ? tagMatch[1].trim() : null, lines: [] }
      continue
    }
    if (current) current.lines.push(rawLine)
  }
  finalize()
  return entries
}

function appendIdea(root, text, tag) {
  const file = path.join(root, 'control', 'IDEAS.md')
  const previous = isFile(file) ? fs.readFileSync(file, 'utf8') : ''
  const heading = tag ? `## ${localMinute()} · [${tag}]` : `## ${localMinute()}`
  const block = `${heading}\n\n${String(text).trim()}\n`
  const next = previous.trim().length > 0 ? `${previous.replace(/\s+$/, '')}\n\n${block}` : block
  atomicWriteText(file, next, 0o644)
  return file
}

function parseReviewsFile(root) {
  const file = path.join(root, 'control', 'REVIEWS.md')
  if (!isFile(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const entries = []
  let current = null
  const finalize = () => {
    if (!current) return
    const note = current.lines.join('\n').trim()
    entries.push({
      stream: current.stream,
      version: current.version,
      at: current.at,
      by: current.by,
      satisfied: current.satisfied,
      note,
    })
    current = null
  }
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s+·\s+(.+?)\s+v(\d+)\s+·\s+(满意|不满意)\s*$/.exec(rawLine)
    if (heading) {
      finalize()
      current = {
        at: heading[1].trim(),
        stream: heading[2].trim(),
        version: Number(heading[3]),
        satisfied: heading[4] === '满意',
        by: 'user',
        lines: [],
      }
      continue
    }
    if (current) current.lines.push(rawLine)
  }
  finalize()
  return entries
}

function appendReview(root, record) {
  const file = path.join(root, 'control', 'REVIEWS.md')
  const previous = isFile(file) ? fs.readFileSync(file, 'utf8') : ''
  const heading = `## ${record.at} · ${record.stream} v${record.version} · ${record.satisfied ? '满意' : '不满意'}`
  const block = record.note ? `${heading}\n\n${record.note}\n` : `${heading}\n`
  const next = previous.trim().length > 0 ? `${previous.replace(/\s+$/, '')}\n\n${block}` : block
  atomicWriteText(file, next, 0o644)
  return file
}

function mergeIdeas(existing, local) {
  const map = new Map()
  const push = (entry) => {
    if (!entry) return
    const text = String(entry.text === undefined ? entry : entry.text).trim()
    if (!text) return
    const at = String(entry.at || entry.updatedAt || '')
    const key = `${at}|${text}`
    if (!map.has(key)) map.set(key, { ...(entry.tag ? { tag: entry.tag } : {}), at, text })
  }
  for (const entry of asArray(existing)) push(entry)
  for (const entry of asArray(local)) push(entry)
  return [...map.values()].sort((a, b) => cmpStr(b.at, a.at)).slice(0, MAX_IDEAS)
}

function mergeReviewed(existing, local) {
  const map = new Map()
  const push = (entry) => {
    if (!entry || !entry.stream) return
    const stream = String(entry.stream).trim()
    const version = Number.isFinite(Number(entry.version)) ? Number(entry.version) : 1
    const at = String(entry.at || '')
    const key = `${stream}|${version}|${at}`
    if (!map.has(key)) {
      map.set(key, {
        stream,
        version,
        at,
        by: String(entry.by || 'user'),
        satisfied: entry.satisfied === true,
        note: String(entry.note || ''),
      })
    }
  }
  for (const entry of asArray(existing)) push(entry)
  for (const entry of asArray(local)) push(entry)
  return [...map.values()].sort((a, b) => cmpStr(b.at, a.at)).slice(0, MAX_REVIEWED)
}

/* --------------------------------------------------------- 复核覆盖统计 */

function reviewRecordKey(stream, version) {
  return `${String(stream || '').trim()}|${Number.isFinite(Number(version)) ? Number(version) : 1}`
}

/** reviewed 数组 → 每个 stream/version 的最新记录（按 at 降序）。 */
function buildReviewIndex(reviewed) {
  const index = new Map()
  const sorted = [...asArray(reviewed)].sort((a, b) => cmpStr(b && b.at, a && a.at))
  for (const record of sorted) {
    if (!record || !record.stream) continue
    const key = reviewRecordKey(record.stream, record.version)
    if (!index.has(key)) index.set(key, record)
  }
  return index
}

function isResultSatisfied(result, index) {
  if (!result) return false
  const record = index.get(reviewRecordKey(result.stream, result.version))
  return Boolean(record && record.satisfied === true)
}

/** digest 用：给项目补 module 级复核计数、给 results 标 reviewed 标记。 */
function projectReviewStats(project) {
  const index = buildReviewIndex(project.reviewed)
  const results = asArray(project.results).map((result) => ({
    ...result,
    reviewed: isResultSatisfied(result, index),
  }))
  const completion = asArray(project.completion).map((module) => {
    const moduleResults = results.filter((result) => result.module === module.module)
    return {
      ...module,
      acceptedCount: moduleResults.length,
      reviewedCount: moduleResults.filter((result) => result.reviewed).length,
    }
  })
  const acceptedResults = results.length
  const reviewedResults = results.filter((result) => result.reviewed).length
  return {
    ...project,
    results,
    completion,
    review: {
      accepted: acceptedResults,
      reviewed: reviewedResults,
      pending: Math.max(0, acceptedResults - reviewedResults),
      percent: acceptedResults > 0 ? Math.round((reviewedResults / acceptedResults) * 100) : 0,
    },
  }
}

/** 所有项目中「已接受但未标记满意」的结果（最多 max 条）。 */
function buildPendingReview(projects, max = 30) {
  const items = []
  for (const project of projects) {
    for (const result of asArray(project.results)) {
      if (result.reviewed) continue
      items.push({
        projectId: project.projectId,
        title: project.title,
        module: result.module || '',
        stream: result.stream,
        version: Number.isFinite(Number(result.version)) ? Number(result.version) : 1,
        path: result.path || '',
        acceptedAt: result.acceptedAt || '',
      })
    }
  }
  items.sort((a, b) => cmpStr(a.projectId, b.projectId) || cmpStr(b.acceptedAt, a.acceptedAt))
  return items.slice(0, max)
}

/* ------------------------------------------------------------ 网络 state 读 */

async function readAllStateItems(server, token, projectId = DEFAULT_STATE_PROJECT) {
  const items = []
  let offset = 0
  const limit = 200
  for (let guard = 0; guard < 20; guard += 1) {
    const { data } = await api(server, 'GET', '/api/state', {
      token,
      query: { project_id: projectId, limit, offset },
    })
    const batch = data && Array.isArray(data.items) ? data.items : []
    items.push(...batch)
    const total = Number(data && data.total)
    if (batch.length === 0 || (Number.isFinite(total) && items.length >= total)) break
    offset += batch.length
  }
  return items
}

function stateItemsToMap(items) {
  const map = new Map()
  for (const item of items) {
    if (!item || typeof item.field !== 'string') continue
    let value = item.value
    try {
      value = JSON.parse(item.value)
    } catch {
      /* 保留原字符串 */
    }
    map.set(item.field, value)
  }
  return map
}

/* ------------------------------------------------------------- 项目卡片计算 */

function buildCompletionRows(state, handoffs) {
  const modules = Array.isArray(state.modules) ? state.modules : []
  const byModule = new Map()
  const bucketFor = (id) => {
    if (!byModule.has(id)) {
      byModule.set(id, { accepted: [], pending: [], blocked: [], drafts: 0, activeTotal: 0 })
    }
    return byModule.get(id)
  }
  for (const handoff of handoffs) {
    if (!handoff || !handoff.module) continue
    const status = String(handoff.status || '').toUpperCase()
    const stream = String(handoff.stream || handoff.branch || handoff.path || '').trim()
    if (['ACCEPTED', 'PROVISIONAL', 'BLOCKED', 'DRAFT'].includes(status)) {
      bucketFor(handoff.module).activeTotal += 1
    }
    if (status === 'ACCEPTED') {
      const bucket = bucketFor(handoff.module)
      if (stream && !bucket.accepted.includes(stream)) bucket.accepted.push(stream)
    } else if (status === 'PROVISIONAL') {
      const bucket = bucketFor(handoff.module)
      if (stream && !bucket.pending.includes(stream)) bucket.pending.push(stream)
    } else if (status === 'BLOCKED') {
      const bucket = bucketFor(handoff.module)
      if (stream && !bucket.blocked.includes(stream)) bucket.blocked.push(stream)
    } else if (status === 'DRAFT') {
      bucketFor(handoff.module).drafts += 1
    }
  }
  const rows = []
  for (const module of modules) {
    const id = module && module.id
    if (id === undefined || id === null) continue
    const bucket = byModule.get(id) || { accepted: [], pending: [], blocked: [], drafts: 0, activeTotal: 0 }
    let status = 'idle'
    if (bucket.pending.length > 0) status = 'active'
    else if (bucket.blocked.length > 0) status = 'blocked'
    else if (bucket.accepted.length > 0 && bucket.drafts === 0) status = 'done'
    rows.push({
      module: id,
      name: module.name || id,
      accepted: bucket.accepted,
      pending: bucket.pending,
      blocked: bucket.blocked,
      status,
    })
  }
  return rows
}

function buildResultsRows(root, resultsJson, handoffs) {
  const fromResults = resultsJson && Array.isArray(resultsJson.results) ? resultsJson.results : []
  const rows = []
  for (const result of fromResults) {
    if (!result) continue
    rows.push({
      stream: result.stream || result.branch || '',
      version: Number.isFinite(Number(result.version)) ? Number(result.version) : 1,
      module: result.module || '',
      path: result.path || '',
      summary: normalizeText(
        result.keyResults || `${result.stream || result.branch || 'result'} v${result.version || 1}`,
        200,
      ),
      acceptedAt: result.decidedAt || result.acceptedAt || null,
    })
  }
  if (rows.length === 0) {
    for (const handoff of handoffs.filter((item) => String(item.status || '').toUpperCase() === 'ACCEPTED')) {
      const fullPath = path.join(root, handoff.path || '')
      let summary = ''
      let acceptedAt = handoff.submitted_at || handoff.created_at || null
      try {
        const parsed = parseFrontmatter(fs.readFileSync(fullPath, 'utf8'))
        summary = normalizeText(extractSectionBody(parsed.body, 4), 200)
        acceptedAt = parsed.frontmatter.decided_at || acceptedAt
      } catch {
        /* 读取失败则用标题兜底 */
      }
      rows.push({
        stream: handoff.stream || handoff.branch || '',
        version: Number.isFinite(Number(handoff.version)) ? Number(handoff.version) : 1,
        module: handoff.module || '',
        path: handoff.path || '',
        summary: summary || normalizeText(`${handoff.stream || handoff.branch} v${handoff.version}`, 200),
        acceptedAt,
      })
    }
  }
  return rows
    .sort((a, b) => cmpStr(b.acceptedAt || '', a.acceptedAt || ''))
    .slice(0, MAX_RESULTS)
}

function buildCardSummary({ projectId, title, progress }) {
  return normalizeText(
    `project: ${projectId} · ${title} ｜ progress ${progress.percent}%（${progress.phase || 'unknown'}）｜ accepted ${progress.accepted} · pending ${progress.pending} · blocked ${progress.blocked}`,
    500,
  )
}

/**
 * 计算项目卡片（NETWORK.md 第 2 节 schema）。
 * @returns {{card:object, progress:object, completion:object[], results:object[], ideas:object[], reviewed:object[], blockers:string[], summary:string}}
 */
function buildProjectCard({ root, state, data, resultsRun, projectId, title, existingIdeas, existingReviewed, now }) {
  const resultsJson = resultsRun && resultsRun.json ? resultsRun.json : null
  const counts = resultsJson && resultsJson.counts && typeof resultsJson.counts === 'object' ? resultsJson.counts : null
  const handoffs = data.handoffs || []
  const countByStatus = (status) => handoffs.filter((item) => String(item.status || '').toUpperCase() === status).length
  const accepted = counts && Number.isFinite(Number(counts.results)) ? Number(counts.results) : countByStatus('ACCEPTED')
  const pending = counts && Number.isFinite(Number(counts.pending)) ? Number(counts.pending) : countByStatus('PROVISIONAL')
  const draft = counts && Number.isFinite(Number(counts.draft)) ? Number(counts.draft) : countByStatus('DRAFT')
  const blocked = counts && Number.isFinite(Number(counts.blocked)) ? Number(counts.blocked) : countByStatus('BLOCKED')
  const denominator = accepted + pending + draft + blocked
  const percent = denominator > 0 ? Math.round((accepted / denominator) * 100) : 0
  const phase =
    (resultsJson && resultsJson.project && resultsJson.project.phase) ||
    data.status.phase ||
    state.phase ||
    'unknown'
  const nextSteps = asArray(data.status.next_steps)
    .map((step) => (typeof step === 'string' ? step : buildHandoffTitle(step)))
    .filter(Boolean)
  const progress = {
    phase,
    accepted,
    pending,
    draft,
    blocked,
    percent,
    nextSteps,
    updatedAt: now,
  }
  const completion = buildCompletionRows(state, handoffs)
  const results = buildResultsRows(root, resultsJson, handoffs)
  const ideas = mergeIdeas(existingIdeas, parseIdeasFile(root))
  const reviewed = mergeReviewed(existingReviewed, parseReviewsFile(root))
  const blockers = asArray(data.status.blockers)
    .map((blocker) => normalizeText(typeof blocker === 'string' ? blocker : JSON.stringify(blocker), 300))
    .filter(Boolean)
  const summary = buildCardSummary({ projectId, title, progress })
  return {
    card: { progress, completion, results, ideas, blockers, reviewed, summary, updated: now },
    progress,
    completion,
    results,
    ideas,
    reviewed,
    blockers,
    summary,
  }
}

function updateNetworkProjects(existing, entry) {
  const list = asArray(existing).filter((item) => item && typeof item.projectId === 'string')
  const index = list.findIndex((item) => item.projectId === entry.projectId)
  if (index >= 0) list[index] = entry
  else list.push(entry)
  return list.sort((a, b) => cmpStr(a.projectId, b.projectId))
}

function buildPublishMessage({ projectId, title, progress, results, ideas, blockers }) {
  const lines = []
  lines.push(`**[publish] ${projectId} · ${title}**`)
  lines.push(
    `progress ${progress.percent}%（${progress.phase || 'unknown'}）｜ accepted ${progress.accepted} · pending ${progress.pending} · blocked ${progress.blocked}`,
  )
  const resultTitles = results.slice(0, 5).map((result) => `${result.stream} v${result.version}`)
  lines.push(`results: ${resultTitles.length > 0 ? resultTitles.join('、') : '(暂无)'}`)
  if (ideas.length > 0) {
    lines.push(`ideas: ${ideas.slice(0, 2).map((idea) => normalizeText(idea.text, 80)).join('；')}`)
  }
  if (blockers.length > 0) {
    lines.push(`blockers: ${blockers.slice(0, 2).map((blocker) => normalizeText(blocker, 100)).join('；')}`)
  }
  return lines.join('\n')
}

/* ------------------------------------------------------------- digest 生成 */

function projectDigestEntry(projectId, fallback, map) {
  const progress = map.get(`${projectId}.progress`) && typeof map.get(`${projectId}.progress`) === 'object' ? map.get(`${projectId}.progress`) : {}
  const title =
    (progress.projectTitle && String(progress.projectTitle)) ||
    (fallback && fallback.title) ||
    (() => {
      const summary = map.get(`${projectId}.summary`)
      if (typeof summary === 'string') {
        const match = /project:\s*[^·]+·\s*(.+?)\s+｜/.exec(summary)
        if (match && match[1].trim()) return match[1].trim()
      }
      return projectId
    })()
  return {
    projectId,
    title,
    phase: progress.phase || (fallback && fallback.phase) || '',
    percent: Number.isFinite(Number(progress.percent)) ? Number(progress.percent) : Number(fallback && fallback.percent) || 0,
    accepted: Number.isFinite(Number(progress.accepted)) ? Number(progress.accepted) : Number(fallback && fallback.accepted) || 0,
    pending: Number.isFinite(Number(progress.pending)) ? Number(progress.pending) : Number(fallback && fallback.pending) || 0,
    draft: Number.isFinite(Number(progress.draft)) ? Number(progress.draft) : 0,
    blocked: Number.isFinite(Number(progress.blocked)) ? Number(progress.blocked) : 0,
    updated: String(map.get(`${projectId}.updated`) || (fallback && fallback.updated) || ''),
    progress,
    completion: asArray(map.get(`${projectId}.completion`)),
    results: asArray(map.get(`${projectId}.results`)),
    ideas: asArray(map.get(`${projectId}.ideas`)),
    reviewed: asArray(map.get(`${projectId}.reviewed`)),
    blockers: asArray(map.get(`${projectId}.blockers`)).map((item) => String(item)),
    summary: typeof map.get(`${projectId}.summary`) === 'string' ? map.get(`${projectId}.summary`) : '',
  }
}

function buildDigestAttention(projects, selfProjectId, stale, since) {
  const attention = []
  for (const project of projects) {
    if (project.projectId === selfProjectId) continue
    const pendingStreams = []
    for (const module of project.completion) {
      for (const stream of asArray(module && module.pending)) {
        if (!pendingStreams.includes(stream)) pendingStreams.push(stream)
      }
    }
    if (pendingStreams.length === 0 && project.pending > 0) {
      // 没有模块明细时用进度计数兜底
      attention.push({
        projectId: project.projectId,
        kind: 'pending',
        text: `待决定 ${project.pending} 项`,
        new: isNewerThan(project.updated, since),
      })
    }
    for (const stream of pendingStreams.slice(0, 3)) {
      attention.push({
        projectId: project.projectId,
        kind: 'pending',
        text: `待决定：${stream}`,
        new: isNewerThan(project.updated, since),
      })
    }
    for (const blocker of project.blockers.slice(0, 3)) {
      attention.push({
        projectId: project.projectId,
        kind: 'blocked',
        text: `阻塞：${blocker}`,
        new: isNewerThan(project.updated, since),
      })
    }
    for (const idea of project.ideas.slice(0, 3)) {
      attention.push({
        projectId: project.projectId,
        kind: 'idea',
        text: `想法：${normalizeText(idea.text, 120)}`,
        at: idea.at,
        new: isNewerThan(idea.at, since),
      })
    }
    for (const result of project.results.slice(0, 3)) {
      attention.push({
        projectId: project.projectId,
        kind: 'result',
        text: `结果：${result.stream} v${result.version}（${result.module}）— ${normalizeText(result.summary, 120)}`,
        at: result.acceptedAt,
        new: isNewerThan(result.acceptedAt, since),
      })
    }
  }
  for (const item of stale) {
    attention.push({
      projectId: item.projectId,
      kind: 'stale',
      text: `停滞 >${STALE_HOURS}h：最近更新 ${item.updated || '(无)'}`,
      new: false,
    })
  }
  return attention
}

function buildDigestMarkdown({
  projects,
  attention,
  stale,
  generatedAt,
  since,
  networkUpdated,
  selfProjectId,
  root,
  pendingReview = [],
  pendingReviewTotal = 0,
}) {
  const lines = []
  lines.push('# 项目网络摘要（NETWORK）')
  lines.push('')
  lines.push(`- 生成时间：${generatedAt}`)
  lines.push(
    `- 项目数：${projects.length} ｜ 网络更新时间：${networkUpdated || '(未发布)'} ｜ 本机项目：${selfProjectId || '(未知)'}`,
  )
  lines.push(`- 统计窗口：${since ? `自 ${since.toISOString()}（🆕 为新）` : '全量'}`)
  lines.push('')
  lines.push('## 概览')
  lines.push('')
  lines.push('| 项目 | 阶段 | 进度 | 已接受 | 待决定 | 阻塞 | 最近更新 |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')
  if (projects.length === 0) {
    lines.push('| (无) | - | - | - | - | - | - |')
  }
  for (const project of projects) {
    const mark = project.new ? '🆕 ' : ''
    lines.push(
      `| ${mark}${project.projectId} · ${normalizeText(project.title, 40)} | ${project.phase || '-'} | ${project.percent}% | ${project.accepted} | ${project.pending} | ${project.blocked} | ${project.updated || '-'} |`,
    )
  }
  lines.push('')
  lines.push('## 待你复核')
  lines.push('')
  if (pendingReviewTotal === 0) {
    lines.push('全部已复核。')
  } else {
    for (const item of pendingReview) {
      const mark = isNewerThan(item.acceptedAt, since) ? '🆕 ' : ''
      lines.push(
        `- ${mark}\`${item.projectId}\` · \`${item.module || '(未知模块)'}\` · ${item.stream} v${item.version} · ${item.path || '(无路径)'}`,
      )
    }
    if (pendingReviewTotal > pendingReview.length) {
      lines.push('')
      lines.push(`（共 ${pendingReviewTotal} 条未复核，仅列前 ${pendingReview.length} 条）`)
    }
  }
  lines.push('')
  lines.push('## 待主项目关注')
  lines.push('')
  if (attention.length === 0) {
    lines.push('没有需要主项目关注的事项，继续专注研究。')
  } else {
    for (const item of attention) {
      const mark = item.new ? '🆕 ' : ''
      const label = { pending: '待决定', blocked: '阻塞', idea: '想法', result: '结果', stale: '停滞' }[item.kind] || item.kind
      lines.push(`- ${mark}[${label}] \`${item.projectId}\`：${item.text}`)
    }
  }
  if (stale.length > 0) {
    lines.push('')
    lines.push(`停滞项目（>${STALE_HOURS}h 未更新）：${stale.map((item) => `${item.projectId}（${item.updated || '无更新'}）`).join('、')}`)
  }
  for (const project of projects) {
    lines.push('')
    lines.push(`## ${project.projectId} · ${project.title}`)
    lines.push('')
    lines.push(
      `- 进度：${project.percent}%（${project.phase || 'unknown'}）｜ accepted ${project.accepted} · pending ${project.pending} · draft ${project.draft} · blocked ${project.blocked}`,
    )
    lines.push(`- 最近更新：${project.updated || '-'}`)
    if (project.review && Number.isFinite(Number(project.review.accepted))) {
      lines.push(
        `- 复核：${project.review.reviewed}/${project.review.accepted} 个已接受结果已复核（${project.review.percent}%）`,
      )
    }
    lines.push('')
    lines.push('### 完成度')
    lines.push('')
    if (project.completion.length === 0) {
      lines.push('- (无模块卡片)')
    } else {
      lines.push('| 模块 | 状态 | 已接受 | 待决定 | 阻塞 | 已复核/已接受 |')
      lines.push('| --- | --- | --- | --- | --- | --- |')
      for (const module of project.completion) {
        const list = (items) => (asArray(items).length > 0 ? asArray(items).join('、') : '-')
        const reviewedCount = Number.isFinite(Number(module.reviewedCount)) ? Number(module.reviewedCount) : 0
        const acceptedCount = Number.isFinite(Number(module.acceptedCount)) ? Number(module.acceptedCount) : 0
        lines.push(
          `| ${module.name || module.module} | ${module.status} | ${list(module.accepted)} | ${list(module.pending)} | ${list(module.blocked)} | ${reviewedCount}/${acceptedCount} |`,
        )
      }
    }
    lines.push('')
    lines.push('### 最近结果')
    lines.push('')
    if (project.results.length === 0) lines.push('- (暂无已接受结果)')
    for (const result of project.results.slice(0, 3)) {
      lines.push(
        `- ${result.stream} v${result.version}（${result.module}，${result.acceptedAt || '-'}）${result.reviewed ? '（已复核）' : '（待复核）'}：${normalizeText(result.summary, 160)}`,
      )
    }
    lines.push('')
    lines.push('### 想法')
    lines.push('')
    if (project.ideas.length === 0) lines.push('- (暂无想法)')
    for (const idea of project.ideas.slice(0, 3)) {
      lines.push(`- ${idea.at || '-'}${idea.tag ? ` [${idea.tag}]` : ''}：${normalizeText(idea.text, 160)}`)
    }
    lines.push('')
    lines.push('### 复核（满意度）')
    lines.push('')
    if (project.reviewed.length === 0) lines.push('- (暂无复核记录)')
    for (const review of project.reviewed.slice(0, 3)) {
      lines.push(
        `- ${review.stream} v${review.version} → ${review.satisfied ? '满意' : '不满意'}（${review.at}，by ${review.by}）${review.note ? `：${normalizeText(review.note, 100)}` : ''}`,
      )
    }
    if (project.blockers.length > 0) {
      lines.push('')
      lines.push('### 阻塞')
      lines.push('')
      for (const blocker of project.blockers.slice(0, 3)) lines.push(`- ${blocker}`)
    }
  }
  lines.push('')
  lines.push('## 本机网络')
  lines.push('')
  lines.push(`- 项目根：${root}`)
  lines.push('- 本文件由 `teammcp.mjs digest --write` 生成（整体覆盖，只读 state）。')
  lines.push('- 用户只需要读这一页 + 自己项目的 `dag results`；不用读全部聊天记录。')
  lines.push('- 命令提示：`node research-dag/integrations/teammcp/teammcp.mjs digest --project <root> --write`')
  return `${lines.join('\n')}\n`
}

/* ----------------------------------------------------------------- 命令 */

function usageText() {
  return [
    'TeamMCP 项目路由桥 + 项目网络层 v1.2 —— research-dag 项目 ↔ TeamMCP 协作总线',
    '',
    '用法：node research-dag/integrations/teammcp/teammcp.mjs <命令> [选项]',
    '',
    '命令（路由层）：',
    '  doctor                        巡检 TeamMCP（在线/agent 数/schema/令牌库/network）',
    '  init    --project <root>      注册身份、确保 bus 与项目频道、写 control/teammcp.json',
    '  push    --project <root>      项目摘要 → 频道消息 + 共享 state',
    '  pull    --project <root>      拉取项目频道/bus/DM 新消息（--write 写 INBOX.md）',
    '  send    --project <root> --to <bus|project|project:<id>|channel:<id>> --text <文本>',
    '  route   --project <root> --handoff <相对路径> [--to project:<id>,...] [--note <文本>]',
    '  status  [--project <root>]    服务/令牌库/项目频道/lastSeen/lastPush',
    '',
    '命令（项目网络层）：',
    '  publish --project <root> [--channel bus|project] [--no-message]',
    '                                结构化项目卡片 → 共享 state（network 命名空间）+ 总线消息',
    '  idea    --project <root> --text <文本> [--tag <标签>] [--to project:<id>,...]',
    '                                追加 control/IDEAS.md + 总线消息 + state ideas',
    '  review  --project <root> --stream <stream> [--version N] [--satisfied|--not-satisfied] [--note <文本>]',
    '          --project <root> --module <moduleId> [--satisfied|--not-satisfied] [--note <文本>]',
    '                                追加 control/REVIEWS.md + 总线消息 + state reviewed；--module 批量复核该模块全部已接受结果',
    '  digest  --project <root> [--write] [--since 24h|7d|<ISO>]',
    '                                读取 network state → 打印/写 control/NETWORK.md',
    '',
    '通用选项：',
    '  --json         stdout 只输出 JSON',
    '  --server URL   TeamMCP 地址（默认 http://127.0.0.1:3100）',
    '  --project DIR  项目根（默认从当前目录向上 8 层找 control/PROJECT_STATE.json）',
    '',
    '环境变量：DSH_HOME（默认 ~/.dsh，令牌库存 <DSH_HOME>/teammcp/agents.json）',
    '退出码：0 成功 / 1 校验 / 2 用法 / 3 IO+网络',
  ].join('\n')
}

async function cmdDoctor(options) {
  const notes = []
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  if (store.server !== server) store.server = server
  const health = await getHealth(server)
  let setup = null
  try {
    const { data } = await api(server, 'GET', '/api/setup-status')
    setup = data
  } catch {
    notes.push('GET /api/setup-status 不可用（可选）')
  }

  const adminChannel = store.admin.channel || 'Chairman'
  const adminState = store.admin.state || 'human'
  await ensureAgent(store, server, adminChannel, 'Chairman', undefined, notes)
  await ensureAgent(store, server, adminState, 'human', undefined, notes)
  saveTokenStore(store)

  const probeField = `${DEFAULT_STATE_PROJECT}.__doctor`
  const probeValue = nowIso()
  let schema = { status: 'unknown', field: probeField }
  try {
    await writeStateField(server, store.agents[adminState].token, DEFAULT_STATE_PROJECT, probeField, probeValue, 'doctor probe')
    schema = { status: 'ok', field: probeField, value: probeValue }
  } catch (error) {
    if (error instanceof TmcpError) {
      schema = {
        status: 'broken',
        field: probeField,
        detail: error.message,
        hint: 'TeamMCP v1.0.2 全新库可能缺 change_log.source / audit_reports.visibility 列；运行 node research-dag/integrations/teammcp/fix-schema.mjs',
      }
      notes.push('共享 state 写入失败：schema 可能缺列，见 fix-schema.mjs')
    } else {
      throw error
    }
  }

  // 项目网络层检查：network.updated 是否存在、各项目卡片字段是否可读
  let network = { status: 'missing', updated: null, projects: [], cardsReadable: false }
  try {
    const items = await readAllStateItems(server, store.agents[adminState].token)
    const map = stateItemsToMap(items)
    const updated = map.get('network.updated')
    const networkProjects = asArray(map.get('network.projects')).filter(
      (entry) => entry && typeof entry.projectId === 'string',
    )
    if (!updated || networkProjects.length === 0) {
      network = {
        status: 'missing',
        updated: typeof updated === 'string' ? updated : null,
        projects: [],
        cardsReadable: false,
        hint: '网络层尚未发布：先运行 publish（如 node teammcp.mjs publish --project <root>）',
      }
      notes.push('network 层尚未发布：先运行 publish')
    } else {
      const cardFields = ['progress', 'completion', 'results', 'ideas', 'blockers', 'reviewed', 'summary', 'updated']
      const checks = networkProjects.map((entry) => {
        const fieldsReadable = cardFields.every((name) => map.has(`${entry.projectId}.${name}`))
        const progress = map.get(`${entry.projectId}.progress`)
        return {
          projectId: entry.projectId,
          title: entry.title || '',
          percent: progress && Number.isFinite(Number(progress.percent)) ? Number(progress.percent) : null,
          fieldsReadable,
        }
      })
      const allReadable = checks.every((check) => check.fieldsReadable)
      network = {
        status: allReadable ? 'ok' : 'partial',
        updated: typeof updated === 'string' ? updated : null,
        projects: checks,
        cardsReadable: allReadable,
      }
      if (!allReadable) notes.push('部分项目卡片字段缺失：重新运行对应项目的 publish')
    }
  } catch (error) {
    network = {
      status: 'broken',
      updated: null,
      projects: [],
      cardsReadable: false,
      detail: error && error.message ? error.message : String(error),
    }
    notes.push(`network 检查失败：${network.detail}`)
  }

  const result = {
    ok: schema.status === 'ok',
    server,
    online: true,
    version: VERSION,
    teammcp: {
      version: setup && setup.server_version ? setup.server_version : null,
      uptime: health && health.uptime ? health.uptime : null,
      agents: health && health.agents ? health.agents.total : 0,
      setupComplete: setup ? setup.needs_setup === false : null,
    },
    schema,
    network,
    tokenStore: {
      path: tokenStorePath(),
      exists: pathExists(tokenStorePath()),
      agents: storeAgentNames(store).map((name) => ({
        name,
        role: store.agents[name].role || '',
        token: maskToken(store.agents[name].token),
      })),
    },
    warnings: notes,
  }
  emit(options, result, [
    'TeamMCP 巡检',
    `  服务地址 : ${server}`,
    `  在线     : ${result.online ? '是' : '否'}${result.teammcp.uptime ? `（uptime ${result.teammcp.uptime}）` : ''}`,
    `  agent 数 : ${result.teammcp.agents}`,
    `  schema   : ${schema.status}${schema.status === 'ok' ? `（写入 ${probeField} 成功）` : '（写入共享 state 失败）'}`,
    `  network  : ${network.status === 'ok' ? `ok（${network.projects.length} 个项目卡片可读）` : network.status === 'missing' ? 'missing（先运行 publish）' : network.status}`,
    `  令牌库   : ${result.tokenStore.path}${result.tokenStore.exists ? '' : '（尚未创建，doctor 已自动注册 Chairman/human）'}`,
    `  已登记   : ${result.tokenStore.agents.length > 0 ? result.tokenStore.agents.map((agent) => `${agent.name}(${agent.token})`).join(', ') : '(无)'}`,
    ...(schema.status !== 'ok' ? [`  提示     : ${schema.hint || '运行 node research-dag/integrations/teammcp/fix-schema.mjs'}`] : []),
    ...(network.status === 'missing' && network.hint ? [`  提示     : ${network.hint}`] : []),
    ...notes.map((note) => `  说明     : ${note}`),
  ])
  if (schema.status !== 'ok') process.exitCode = 1
  return result
}

async function cmdInit(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId, title } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root) || {}
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  if (store.server !== server) store.server = server
  await getHealth(server)

  const channelAdminName = store.admin.channel || 'Chairman'
  const stateAdminName = store.admin.state || 'human'
  const projectAgentName = `dag-${projectId}`
  const busChannel = (options.bus && String(options.bus).trim()) || existingConfig.busChannel || DEFAULT_BUS

  await ensureAgent(store, server, channelAdminName, 'Chairman', undefined, notes)
  await ensureAgent(store, server, stateAdminName, 'human', undefined, notes)
  await ensureAgent(store, server, projectAgentName, `Research project: ${projectId}`, projectId, notes)
  saveTokenStore(store)

  const chairmanToken = store.agents[channelAdminName].token
  const dagAgents = storeProjectAgents(store).map((agent) => agent.name)
  const busMembers = [...new Set([channelAdminName, stateAdminName, ...dagAgents, projectAgentName])]
  const projectChannel = `dag-${projectId}`
  const projectMembers = [...new Set([channelAdminName, stateAdminName, projectAgentName])]

  const busInfo = await ensureGroupChannel(
    server,
    chairmanToken,
    {
      id: busChannel,
      name: '研究项目路由总线',
      description: 'research-dag 项目间路由',
      members: busMembers,
    },
    notes,
  )
  const channelInfo = await ensureGroupChannel(
    server,
    chairmanToken,
    {
      id: projectChannel,
      name: title || projectId,
      description: `research-dag 项目 ${projectId} 的通知频道`,
      members: projectMembers,
    },
    notes,
  )

  const config = mergeProjectConfig(existingConfig, {
    server,
    projectId,
    agent: projectAgentName,
    channel: projectChannel,
    busChannel,
    lastSeen: existingConfig.lastSeen || {},
    lastPush: existingConfig.lastPush || {},
  })
  writeProjectConfig(root, config)

  const result = {
    ok: true,
    server,
    projectId,
    title,
    agent: projectAgentName,
    channel: projectChannel,
    busChannel,
    tokenStore: tokenStorePath(),
    channels: {
      bus: { id: busInfo.id, created: busInfo.created, addedMembers: busInfo.addedMembers },
      project: { id: channelInfo.id, created: channelInfo.created, addedMembers: channelInfo.addedMembers },
    },
    agents: storeAgentNames(store).map((name) => ({ name, token: maskToken(store.agents[name].token) })),
    configPath: projectConfigPath(root),
    warnings: notes,
  }
  emit(options, result, [
    `初始化 TeamMCP 项目路由：${projectId} · ${title}`,
    `  服务地址 : ${server}`,
    `  项目 agent: ${projectAgentName}`,
    `  bus 频道  : ${busChannel}${busInfo.created ? '（新建）' : '（已存在）'}`,
    `  项目频道  : ${projectChannel}${channelInfo.created ? '（新建）' : '（已存在）'}`,
    `  令牌库    : ${tokenStorePath()}（不打印令牌全文）`,
    `  项目配置  : ${projectConfigPath(root)}`,
    ...notes.map((note) => `  说明      : ${note}`),
  ])
  return result
}

async function cmdPush(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId, title } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent && !options['no-state']) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')

  await getHealth(server)
  const data = gatherDagData(root, state, notes)
  const summary = buildPushContent({ projectId, title, data })
  const target = await resolveSendTarget(server, projectAgent.token, existingConfig, options.channel)
  if (summary.content.length > MAX_TEXT_CHARS) fail('E004', `消息正文超过 ${MAX_TEXT_CHARS} 字符`, 1)

  const { data: sent } = await api(server, 'POST', '/api/send', {
    token: projectAgent.token,
    body: { channel: target, content: summary.content },
  })
  const messageId = sent && sent.id ? sent.id : null
  const timestamp = sent && sent.timestamp ? sent.timestamp : null

  let stateFields = []
  let stateValues = {}
  if (!options['no-state']) {
    const updated = nowIso()
    const fields = [
      [`${projectId}.phase`, summary.phase],
      [`${projectId}.verify`, summary.verifyState],
      [`${projectId}.accepted`, summary.acceptedTitles],
      [`${projectId}.pending`, summary.pendingTitles],
      [`${projectId}.updated`, updated],
      [`${projectId}.summary`, summary.summary],
    ]
    stateFields = await writeStateFields(server, humanAgent.token, DEFAULT_STATE_PROJECT, fields, 'dag push', notes)
    for (const [field] of fields) {
      stateValues[field] = await readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, field)
    }
  }

  const config = mergeProjectConfig(existingConfig, {
    lastPush: {
      at: nowIso(),
      phase: summary.phase,
      verify: summary.verifyState,
      messageId,
      channel: target,
    },
  })
  writeProjectConfig(root, config)

  const result = {
    ok: true,
    server,
    projectId,
    channel: target,
    messageId,
    timestamp,
    verify: { ok: data.verify.ok === true, checked: data.counts },
    state: { projectId: DEFAULT_STATE_PROJECT, fields: stateFields, values: stateValues },
    summary: summary.content,
    warnings: notes,
  }
  emit(options, result, [
    `推送项目摘要：${projectId} · ${title}`,
    `  频道    : ${target}`,
    `  消息 id : ${messageId || '(服务端未返回)'}`,
    `  verify  : ${summary.verifyState}（${data.counts.handoffs} handoff / ${data.counts.modules} 模块 / ${data.counts.branches} 分支）`,
    `  state   : ${options['no-state'] ? '已跳过（--no-state）' : `写入 ${stateFields.length} 字段（${DEFAULT_STATE_PROJECT}）`}`,
    ...(Object.keys(stateValues).length > 0
      ? [`  已写值  : ${Object.entries(stateValues).map(([field, value]) => `${field}=${JSON.stringify(value)}`).join('，')}`]
      : []),
    ...notes.map((note) => `  说明    : ${note}`),
  ])
  return result
}

async function cmdPull(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId, title } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  await getHealth(server)

  let channelIds
  if (options.channels) {
    channelIds = String(options.channels)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    if (channelIds.length === 0) usageError('--channels 需要至少一个频道 id')
  } else {
    const channels = await listChannels(server, projectAgent.token)
    const dmChannels = channels
      .filter((channel) => channel && channel.type === 'dm')
      .map((channel) => channel.id)
      .filter(Boolean)
    channelIds = [
      ...new Set([existingConfig.channel, existingConfig.busChannel || DEFAULT_BUS, ...dmChannels].filter(Boolean)),
    ]
  }

  const lastSeen = { ...(existingConfig.lastSeen && typeof existingConfig.lastSeen === 'object' ? existingConfig.lastSeen : {}) }
  const channelResults = []
  let total = 0
  for (const channel of channelIds) {
    let history
    try {
      const response = await api(server, 'GET', '/api/history', {
        token: projectAgent.token,
        query: { channel, limit: 50 },
      })
      history = response.data
    } catch (error) {
      if (error instanceof TmcpError && (error.status === 403 || error.status === 404)) {
        notes.push(`跳过频道 ${channel}：${error.message}`)
        continue
      }
      throw error
    }
    const messages = history && Array.isArray(history.messages) ? history.messages : []
    const threshold = lastSeen[channel] || null
    const fresh = messages.filter((message) => {
      const createdAt = String(message && message.created_at ? message.created_at : '')
      if (!createdAt) return false
      return !threshold || createdAt > String(threshold)
    })
    const batchMax = messages.length > 0 ? String(messages[messages.length - 1].created_at || '') : ''
    if (fresh.length > 0 && batchMax) lastSeen[channel] = batchMax
    const mapped = fresh.map((message) => ({
      id: message.id,
      from: message.from_agent,
      content: message.content,
      created_at: message.created_at,
    }))
    total += mapped.length
    channelResults.push({ channel, new: mapped })
  }

  if (options.write && total > 0) {
    const inboxPath = path.join(root, 'control', 'INBOX.md')
    const lines = [`## ${nowIso()} pull`, '']
    for (const entry of channelResults) {
      for (const message of entry.new) {
        lines.push(`- [${shortTime(message.created_at)}] ${message.from} @${entry.channel}: ${firstLine(message.content)}`)
      }
    }
    const previous = isFile(inboxPath) ? fs.readFileSync(inboxPath, 'utf8') : ''
    const prefix = previous.length > 0 && !previous.endsWith('\n') ? `${previous}\n` : previous
    atomicWriteText(inboxPath, `${prefix}${lines.join('\n')}\n`, 0o644)
    notes.push(`已追加 ${total} 条消息到 control/INBOX.md`)
  }

  const config = mergeProjectConfig(existingConfig, { lastSeen })
  writeProjectConfig(root, config)

  const result = {
    ok: true,
    server,
    projectId,
    channels: channelResults,
    total,
    ...(options.write ? { inbox: path.join(root, 'control', 'INBOX.md') } : {}),
    warnings: notes,
  }
  const humanLines = [`拉取项目消息：${projectId} · ${title}`, `  频道数: ${channelResults.length}，新消息: ${total} 条`]
  for (const entry of channelResults) {
    for (const message of entry.new) {
      humanLines.push(`  [${shortTime(message.created_at)}] ${message.from} @${entry.channel}: ${firstLine(message.content)}`)
    }
  }
  if (total === 0) humanLines.push('  （无新消息）')
  humanLines.push(...notes.map((note) => `  说明: ${note}`))
  emit(options, result, humanLines)
  return result
}

async function cmdSend(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')

  const text = typeof options.text === 'string' ? options.text : options._[1]
  if (typeof text !== 'string' || text.trim().length === 0) usageError('--text 必填')
  if ([...text].length > MAX_TEXT_CHARS) fail('E004', `正文超过 ${MAX_TEXT_CHARS} 字符（当前 ${[...text].length}）`, 1)
  const to = typeof options.to === 'string' ? options.to.trim() : ''
  if (!to) usageError('--to 必填（bus|project|project:<id>|channel:<id>）')

  let target
  let dmTo = null
  let recipientName = null
  if (to === 'bus' || to === 'project') {
    target = await resolveSendTarget(server, projectAgent.token, existingConfig, to)
  } else if (to.startsWith('project:')) {
    const recipientProjectId = to.slice('project:'.length).trim()
    if (!recipientProjectId) usageError('--to project:<id> 缺少项目 id')
    if (recipientProjectId === projectId) validError('不能 route/DM 到项目自身')
    recipientName = await ensureRecipientAgent(store, server, recipientProjectId, notes)
    dmTo = recipientProjectId
    target = `dm:${recipientName}`
  } else if (to.startsWith('channel:')) {
    target = await resolveSendTarget(server, projectAgent.token, existingConfig, to)
  } else {
    usageError(`--to 非法：${to}（bus|project|project:<id>|channel:<id>）`)
  }

  const { data: sent } = await api(server, 'POST', '/api/send', {
    token: projectAgent.token,
    body: { channel: target, content: text },
  })
  const result = {
    ok: true,
    server,
    from: `dag-${projectId}`,
    channel: target,
    ...(dmTo ? { dmTo } : {}),
    messageId: sent && sent.id ? sent.id : null,
    timestamp: sent && sent.timestamp ? sent.timestamp : null,
    warnings: notes,
  }
  emit(options, result, [
    `发送消息：dag-${projectId} → ${dmTo ? `project:${dmTo}` : to}`,
    `  频道    : ${target}`,
    `  消息 id : ${result.messageId || '(服务端未返回)'}`,
    ...(notes.length > 0 ? notes.map((note) => `  说明    : ${note}`) : []),
  ])
  return result
}

async function cmdRoute(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')

  await getHealth(server)
  const handoff = readHandoff(root, options.handoff)
  const note = typeof options.note === 'string' ? options.note.trim() : ''
  const recipients = []
  if (options.to) {
    for (const item of String(options.to).split(',').map((part) => part.trim()).filter(Boolean)) {
      if (!item.startsWith('project:')) usageError(`--to 只支持 project:<id>（收到 ${item}）`)
      const id = item.slice('project:'.length).trim()
      if (!id) usageError('--to project:<id> 缺少项目 id')
      if (id === projectId) validError('不能 route 到项目自身')
      recipients.push(id)
    }
  }

  const lines = [
    `[handoff-route] ${projectId} · ${handoff.stream || '(no-stream)'} v${handoff.version || '?'} · ${handoff.status}`,
    `module: ${handoff.module || '(none)'} ｜ branch: ${handoff.branch || '(none)'}`,
    `path: ${handoff.rel}`,
  ]
  if (note) lines.push(note)
  const content = lines.join('\n')
  if (content.length > MAX_TEXT_CHARS) fail('E004', `消息正文超过 ${MAX_TEXT_CHARS} 字符`, 1)

  const busChannel = existingConfig.busChannel || DEFAULT_BUS
  const { data: busSent } = await api(server, 'POST', '/api/send', {
    token: projectAgent.token,
    body: { channel: busChannel, content },
  })

  const dms = []
  for (const recipientProjectId of [...new Set(recipients)]) {
    const recipientName = await ensureRecipientAgent(store, server, recipientProjectId, notes)
    const { data: dmSent } = await api(server, 'POST', '/api/send', {
      token: projectAgent.token,
      body: { channel: `dm:${recipientName}`, content },
    })
    dms.push({ to: `project:${recipientProjectId}`, channel: `dm:${recipientName}`, messageId: dmSent && dmSent.id ? dmSent.id : null })
  }

  const at = nowIso()
  const lastHandoff = {
    stream: handoff.stream || null,
    version: handoff.version || null,
    status: handoff.status,
    path: handoff.rel,
    at,
  }
  const stateFields = await writeStateFields(
    server,
    humanAgent.token,
    DEFAULT_STATE_PROJECT,
    [
      [`${projectId}.last_handoff`, lastHandoff],
      [`${projectId}.updated`, at],
    ],
    'dag route',
    notes,
  )
  const config = mergeProjectConfig(existingConfig, {
    lastPush: { ...(existingConfig.lastPush || {}), lastRouteAt: at },
  })
  writeProjectConfig(root, config)

  const result = {
    ok: true,
    server,
    projectId,
    handoff: {
      path: handoff.rel,
      stream: handoff.stream,
      version: handoff.version,
      status: handoff.status,
      module: handoff.module,
      branch: handoff.branch,
    },
    bus: { channel: busChannel, messageId: busSent && busSent.id ? busSent.id : null },
    dms,
    state: {
      projectId: DEFAULT_STATE_PROJECT,
      fields: stateFields,
      lastHandoff,
    },
    warnings: notes,
  }
  emit(options, result, [
    `路由 handoff：${projectId} → ${busChannel}${dms.length > 0 ? ` + ${dms.length} 个 DM` : ''}`,
    `  handoff : ${handoff.rel}（${handoff.status}）`,
    `  bus 消息: ${result.bus.messageId || '(服务端未返回)'}`,
    ...dms.map((dm) => `  DM      : ${dm.to} → ${dm.messageId || '(服务端未返回)'}`),
    `  state   : ${stateFields.join(', ')}（${DEFAULT_STATE_PROJECT}）`,
    ...notes.map((noteText) => `  说明    : ${noteText}`),
  ])
  return result
}

async function cmdStatus(options) {
  const notes = []
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const health = await getHealth(server)
  let setup = null
  try {
    setup = (await api(server, 'GET', '/api/setup-status')).data
  } catch {
    /* optional */
  }

  const root = resolveProjectRoot(options, { required: false })
  const projectSection = { found: Boolean(root) }
  if (root) {
    const state = readProjectState(root)
    const { projectId, title } = projectIdentity(root, state)
    const config = readProjectConfig(root)
    projectSection.root = root
    projectSection.projectId = projectId
    projectSection.title = title
    projectSection.initialized = Boolean(config)
    if (config) {
      projectSection.agent = config.agent
      projectSection.channel = config.channel
      projectSection.busChannel = config.busChannel
      projectSection.lastSeen = config.lastSeen || {}
      projectSection.lastPush = config.lastPush || {}
      const token = store.agents[config.agent] && store.agents[config.agent].token
      if (token) {
        try {
          const channels = await listChannels(server, token)
          const wanted = [config.channel, config.busChannel || DEFAULT_BUS].filter(Boolean)
          projectSection.unread = Object.fromEntries(
            channels
              .filter((channel) => wanted.includes(channel.id))
              .map((channel) => [channel.id, Number.isFinite(Number(channel.unread)) ? Number(channel.unread) : 0]),
          )
        } catch (error) {
          notes.push(`读取频道未读数失败：${error.message}`)
        }
      }
    }
  }

  const result = {
    ok: true,
    server,
    online: true,
    teammcp: {
      version: setup && setup.server_version ? setup.server_version : null,
      uptime: health && health.uptime ? health.uptime : null,
      agents: health && health.agents ? health.agents.total : 0,
      onlineAgents: health && health.agents && health.agents.onlineNames ? health.agents.onlineNames : [],
    },
    tokenStore: {
      path: tokenStorePath(),
      exists: pathExists(tokenStorePath()),
      agents: maskAgentList(store),
    },
    project: projectSection,
    warnings: notes,
  }
  const lines = [
    'TeamMCP 状态',
    `  服务地址 : ${server}`,
    `  在线     : 是${result.teammcp.uptime ? `（uptime ${result.teammcp.uptime}）` : ''}`,
    `  agent 数 : ${result.teammcp.agents}`,
    `  令牌库   : ${result.tokenStore.path}${result.tokenStore.exists ? '' : '（不存在）'}`,
    `  已登记   : ${result.tokenStore.agents.length > 0 ? result.tokenStore.agents.map((agent) => `${agent.name}(${agent.token})`).join(', ') : '(无)'}`,
  ]
  if (projectSection.found) {
    lines.push(`  项目     : ${projectSection.projectId} · ${projectSection.title}`)
    if (projectSection.initialized) {
      lines.push(`  频道     : ${projectSection.channel} / bus ${projectSection.busChannel}`)
      lines.push(
        `  未读     : ${projectSection.unread && Object.keys(projectSection.unread).length > 0 ? Object.entries(projectSection.unread).map(([id, unread]) => `${id}=${unread}`).join(', ') : '(未知)'}`,
      )
      lines.push(
        `  lastSeen : ${Object.keys(projectSection.lastSeen || {}).length > 0 ? Object.entries(projectSection.lastSeen).map(([id, seen]) => `${id}=${seen || 'null'}`).join(', ') : '(无)'}`,
      )
      lines.push(
        `  lastPush : ${projectSection.lastPush && projectSection.lastPush.at ? `${projectSection.lastPush.at}（${projectSection.lastPush.verify || '?'}）` : '(无)'}`,
      )
    } else {
      lines.push('  状态     : 尚未 init（control/teammcp.json 不存在）')
    }
  } else {
    lines.push('  项目     : (当前目录不在 research-dag 项目内)')
  }
  lines.push(...notes.map((note) => `  说明     : ${note}`))
  emit(options, result, lines)
  return result
}

/* ----------------------------------------------------- 项目网络层命令 */

async function cmdPublish(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId, title } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')
  if (options.channel !== undefined && !['bus', 'project'].includes(options.channel)) {
    usageError('publish --channel 只支持 bus|project')
  }
  await getHealth(server)

  const data = gatherDagData(root, state, notes)
  const resultsRun = runDagJson(root, 'results', notes)
  const [existingIdeas, existingReviewed, existingNetworkProjects] = await Promise.all([
    readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.ideas`),
    readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.reviewed`),
    readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, 'network.projects'),
  ])
  const now = nowIso()
  const cardData = buildProjectCard({
    root,
    state,
    data,
    resultsRun,
    projectId,
    title,
    existingIdeas,
    existingReviewed,
    now,
  })
  const networkProjects = updateNetworkProjects(existingNetworkProjects, {
    projectId,
    title,
    phase: cardData.progress.phase,
    percent: cardData.progress.percent,
    accepted: cardData.progress.accepted,
    pending: cardData.progress.pending,
    updated: now,
  })
  const entries = [
    [`${projectId}.progress`, cardData.progress],
    [`${projectId}.completion`, cardData.completion],
    [`${projectId}.results`, cardData.results],
    [`${projectId}.ideas`, cardData.ideas],
    [`${projectId}.blockers`, cardData.blockers],
    [`${projectId}.reviewed`, cardData.reviewed],
    [`${projectId}.summary`, cardData.summary],
    [`${projectId}.updated`, now],
    ['network.updated', now],
    ['network.projects', networkProjects],
  ]
  const fields = await writeStateFields(server, humanAgent.token, DEFAULT_STATE_PROJECT, entries, 'dag publish', notes)
  const values = {}
  for (const [field] of entries.slice(0, 8)) {
    values[field] = await readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, field)
  }

  let channel = null
  let messageId = null
  let timestamp = null
  if (!options['no-message']) {
    channel = options.channel === 'project' ? existingConfig.channel : existingConfig.busChannel || DEFAULT_BUS
    const content = buildPublishMessage({
      projectId,
      title,
      progress: cardData.progress,
      results: cardData.results,
      ideas: cardData.ideas,
      blockers: cardData.blockers,
    })
    if (content.length > MAX_TEXT_CHARS) fail('E004', `消息正文超过 ${MAX_TEXT_CHARS} 字符`, 1)
    const { data: sent } = await api(server, 'POST', '/api/send', {
      token: projectAgent.token,
      body: {
        channel,
        content,
        metadata: {
          kind: 'publish',
          projectId,
          percent: cardData.progress.percent,
          accepted: cardData.progress.accepted,
          pending: cardData.progress.pending,
          updated: now,
        },
      },
    })
    messageId = sent && sent.id ? sent.id : null
    timestamp = sent && sent.timestamp ? sent.timestamp : null
  }

  const config = mergeProjectConfig(existingConfig, {
    lastPublish: {
      at: now,
      percent: cardData.progress.percent,
      accepted: cardData.progress.accepted,
      pending: cardData.progress.pending,
      messageId,
      channel,
    },
  })
  writeProjectConfig(root, config)

  const result = {
    ok: true,
    server,
    projectId,
    title,
    channel,
    messageId,
    timestamp,
    percent: cardData.progress.percent,
    accepted: cardData.progress.accepted,
    pending: cardData.progress.pending,
    draft: cardData.progress.draft,
    blocked: cardData.progress.blocked,
    state: { projectId: DEFAULT_STATE_PROJECT, fields, values },
    network: { projectCount: networkProjects.length, projects: networkProjects },
    card: {
      progress: cardData.progress,
      completion: cardData.completion,
      results: cardData.results.length,
      ideas: cardData.ideas.length,
      reviewed: cardData.reviewed.length,
      blockers: cardData.blockers.length,
    },
    warnings: notes,
  }
  emit(options, result, [
    `发布项目卡片（网络层）：${projectId} · ${title}`,
    `  进度    : ${cardData.progress.percent}%（${cardData.progress.phase}）｜ accepted ${cardData.progress.accepted} · pending ${cardData.progress.pending} · blocked ${cardData.progress.blocked}`,
    `  结果    : ${cardData.results.length} 条（最近 ≤20）｜ 想法 ${cardData.ideas.length} 条 ｜ 复核 ${cardData.reviewed.length} 条`,
    `  完成度  : ${cardData.completion.length} 个模块卡片`,
    `  state   : 写入 ${fields.length} 字段（${DEFAULT_STATE_PROJECT}）`,
    `  消息    : ${options['no-message'] ? '已跳过（--no-message）' : `${channel} → ${messageId || '(服务端未返回)'}`}`,
    `  网络项目: ${networkProjects.length} 个 → ${networkProjects.map((project) => `${project.projectId}(${project.percent}%)`).join(', ')}`,
    ...notes.map((note) => `  说明    : ${note}`),
  ])
  return result
}

async function cmdIdea(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')

  const text = typeof options.text === 'string' ? options.text.trim() : ''
  if (!text) usageError('--text 必填（想法内容）')
  if ([...text].length > 5000) fail('E004', '想法正文超过 5000 字符', 1)
  const tag = typeof options.tag === 'string' && options.tag.trim() ? options.tag.trim().slice(0, 40) : ''
  await getHealth(server)

  const file = appendIdea(root, text, tag)
  const existingIdeas = await readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.ideas`)
  const ideas = mergeIdeas(existingIdeas, parseIdeasFile(root))
  await writeStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.ideas`, ideas, 'dag idea')

  const content = `[idea] ${projectId}: ${text}`
  if (content.length > MAX_TEXT_CHARS) fail('E004', `消息正文超过 ${MAX_TEXT_CHARS} 字符`, 1)
  const metadata = { kind: 'idea', projectId, ...(tag ? { tag } : {}) }
  const channel = existingConfig.busChannel || DEFAULT_BUS
  const { data: sent } = await api(server, 'POST', '/api/send', {
    token: projectAgent.token,
    body: { channel, content, metadata },
  })
  const messageId = sent && sent.id ? sent.id : null
  const dms = []
  if (options.to) {
    for (const item of String(options.to).split(',').map((part) => part.trim()).filter(Boolean)) {
      if (!item.startsWith('project:')) usageError(`--to 只支持 project:<id>（收到 ${item}）`)
      const recipientProjectId = item.slice('project:'.length).trim()
      if (!recipientProjectId) usageError('--to project:<id> 缺少项目 id')
      if (recipientProjectId === projectId) validError('不能 DM 到项目自身')
      const recipientName = await ensureRecipientAgent(store, server, recipientProjectId, notes)
      const { data: dmSent } = await api(server, 'POST', '/api/send', {
        token: projectAgent.token,
        body: { channel: `dm:${recipientName}`, content, metadata },
      })
      dms.push({ to: `project:${recipientProjectId}`, messageId: dmSent && dmSent.id ? dmSent.id : null })
    }
  }

  const result = {
    ok: true,
    server,
    projectId,
    file,
    channel,
    messageId,
    dms,
    ideaCount: ideas.length,
    state: { projectId: DEFAULT_STATE_PROJECT, field: `${projectId}.ideas`, count: ideas.length },
    warnings: notes,
  }
  emit(options, result, [
    `记录想法：${projectId}`,
    `  文件    : ${file}`,
    `  想法总数: ${ideas.length} 条（保留最近 ${MAX_IDEAS} 条）`,
    `  消息    : ${channel} → ${messageId || '(服务端未返回)'}`,
    ...(dms.length > 0 ? [`  DM      : ${dms.map((dm) => `${dm.to}→${dm.messageId || '?'}`).join(', ')}`] : []),
    ...notes.map((note) => `  说明    : ${note}`),
  ])
  return result
}

async function cmdReview(options) {
  const notes = []
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId } = projectIdentity(root, state)
  const existingConfig = readProjectConfig(root)
  if (!existingConfig) validError('项目尚未初始化：先运行 init')
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const projectAgent = store.agents[`dag-${projectId}`]
  if (!projectAgent) validError('令牌库缺少项目 agent：先运行 init')
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')

  const streamInput = typeof options.stream === 'string' ? options.stream.trim() : ''
  const moduleInput = typeof options.module === 'string' ? options.module.trim() : ''
  if (streamInput.length > 100) usageError('--stream 过长（≤100 字符）')
  if (moduleInput.length > 100) usageError('--module 过长（≤100 字符）')
  if (!streamInput && !moduleInput) usageError('--stream 或 --module 至少给一个')
  if (options.satisfied && options['not-satisfied']) usageError('--satisfied 与 --not-satisfied 不能同时使用')
  const satisfied = options.satisfied ? true : options['not-satisfied'] ? false : true
  const mode = streamInput ? 'stream' : 'module'
  const note =
    typeof options.note === 'string' && options.note.trim()
      ? options.note.trim().slice(0, 2000)
      : mode === 'module'
        ? '子项目内容复核'
        : ''
  await getHealth(server)

  const data = gatherDagData(root, state, notes)
  const resultsRun = runDagJson(root, 'results', notes)
  const accepted = (
    resultsRun.json && Array.isArray(resultsRun.json.results)
      ? resultsRun.json.results
      : data.handoffs.filter((handoff) => String(handoff.status || '').toUpperCase() === 'ACCEPTED')
  )
    .map((result) => ({
      stream: result.stream || result.branch || '',
      version: Number.isFinite(Number(result.version)) ? Number(result.version) : 1,
      module: result.module || '',
      path: result.path || '',
    }))
    .filter((result) => result.stream)

  const targets = []
  let targetModule = moduleInput
  let targetStream = streamInput
  let targetVersion = null
  if (mode === 'stream') {
    if (options.version !== undefined) {
      targetVersion = Number(options.version)
      if (!Number.isInteger(targetVersion) || targetVersion < 1) usageError(`--version 必须是正整数：${options.version}`)
    } else {
      const versions = data.handoffs
        .filter((handoff) => handoff && handoff.stream === streamInput)
        .map((handoff) => Number(handoff.version))
        .filter((item) => Number.isInteger(item) && item > 0)
      const acceptedVersions = accepted
        .filter((result) => result.stream === streamInput)
        .map((result) => Number(result.version))
      const candidates = [...versions, ...acceptedVersions].filter((item) => Number.isInteger(item) && item > 0)
      targetVersion = candidates.length > 0 ? Math.max(...candidates) : 1
    }
    const acceptedMatch =
      accepted.find((result) => result.stream === streamInput && Number(result.version) === Number(targetVersion)) ||
      accepted.find((result) => result.stream === streamInput)
    if (moduleInput) {
      const moduleMatch = accepted.find((result) => result.stream === streamInput && result.module === moduleInput)
      if (acceptedMatch && !moduleMatch) validError(`stream ${streamInput} 不属于模块 ${moduleInput}`)
      targetModule = moduleInput
    } else if (acceptedMatch) {
      targetModule = acceptedMatch.module
    }
    if (!acceptedMatch) notes.push(`stream ${streamInput} 不在已接受结果中（仍可复核，digest 的待你复核不含它）`)
    targets.push({
      stream: streamInput,
      version: targetVersion,
      module: targetModule,
      path: acceptedMatch ? acceptedMatch.path : '',
    })
  } else {
    targetStream = null
    const moduleAccepted = accepted.filter((result) => result.module === moduleInput)
    if (moduleAccepted.length === 0) {
      validError(`模块 ${moduleInput} 没有已接受结果可复核（先 accept 结果并 publish）`)
    }
    const seen = new Set()
    for (const result of moduleAccepted) {
      const key = reviewRecordKey(result.stream, result.version)
      if (seen.has(key)) continue
      seen.add(key)
      targets.push(result)
    }
    if (targets.length === 1) targetStream = targets[0].stream
  }

  const at = nowIso()
  const existingReviewed = await readStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.reviewed`)
  const existingIndex = buildReviewIndex(existingReviewed)
  const applied = []
  const skipped = []
  for (const target of targets) {
    const existing = existingIndex.get(reviewRecordKey(target.stream, target.version))
    if (existing && Boolean(existing.satisfied) === satisfied) {
      skipped.push({ ...target, reason: '已存在相同复核结论' })
      continue
    }
    appendReview(root, {
      stream: target.stream,
      version: target.version,
      at,
      by: 'user',
      satisfied,
      note,
    })
    applied.push({ ...target, at, by: 'user', satisfied, note })
  }
  const file = path.join(root, 'control', 'REVIEWS.md')
  const reviewed = mergeReviewed(existingReviewed, parseReviewsFile(root))
  await writeStateField(server, humanAgent.token, DEFAULT_STATE_PROJECT, `${projectId}.reviewed`, reviewed, 'dag review')

  let channel = null
  let messageId = null
  if (applied.length > 0) {
    channel = existingConfig.busChannel || DEFAULT_BUS
    let content
    let metadata
    if (mode === 'stream') {
      const target = applied[0]
      content = `[review] ${projectId}: ${target.stream} v${target.version} → ${satisfied ? '满意' : '不满意'}`
      metadata = { kind: 'review', projectId, stream: target.stream, version: target.version, satisfied }
    } else {
      const titles = applied.map((item) => `${item.stream} v${item.version}`)
      content = `[review] ${projectId}: 模块 ${moduleInput} → ${satisfied ? '满意' : '不满意'}（${applied.length} 条：${titles.join('、')}）`
      metadata = {
        kind: 'review',
        projectId,
        module: moduleInput,
        satisfied,
        streams: applied.map((item) => ({ stream: item.stream, version: item.version })),
      }
    }
    if (content.length > MAX_TEXT_CHARS) fail('E004', `消息正文超过 ${MAX_TEXT_CHARS} 字符`, 1)
    const { data: sent } = await api(server, 'POST', '/api/send', {
      token: projectAgent.token,
      body: { channel, content, metadata },
    })
    messageId = sent && sent.id ? sent.id : null
  }

  const result = {
    ok: true,
    server,
    projectId,
    mode,
    module: mode === 'module' ? moduleInput : targetModule || null,
    stream: mode === 'stream' ? streamInput : null,
    version: mode === 'stream' ? targetVersion : null,
    file,
    channel,
    messageId,
    targets,
    applied,
    skipped,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    records: applied,
    reviewedCount: reviewed.length,
    state: {
      projectId: DEFAULT_STATE_PROJECT,
      field: `${projectId}.reviewed`,
      count: reviewed.length,
    },
    warnings: notes,
  }
  const scopeLabel =
    mode === 'module' ? `模块 ${moduleInput}` : `${streamInput} v${targetVersion}`
  const humanLines = [
    `记录复核（满意度）：${projectId} · ${scopeLabel} → ${satisfied ? '满意' : '不满意'}`,
  ]
  if (mode === 'module') {
    humanLines.push(`  覆盖结果: ${targets.map((item) => `${item.stream} v${item.version}`).join('、') || '(无)'}`)
  }
  humanLines.push(
    `  已应用  : ${applied.length} 条（跳过已复核 ${skipped.length} 条）`,
    `  文件    : ${file}`,
    `  复核总数: ${reviewed.length} 条（保留最近 ${MAX_REVIEWED} 条）`,
    `  消息    : ${applied.length > 0 ? `${channel} → ${messageId || '(服务端未返回)'}` : '未发送（无新增复核）'}`,
  )
  if (note) humanLines.push(`  备注    : ${note}`)
  humanLines.push(...notes.map((item) => `  说明    : ${item}`))
  emit(options, result, humanLines)
  return result
}

async function cmdDigest(options) {
  const root = resolveProjectRoot(options)
  const state = readProjectState(root)
  const { projectId: selfProjectId } = projectIdentity(root, state)
  const store = loadTokenStore()
  const server = resolveServer(options, store)
  const humanAgent = store.agents[store.admin.state || 'human']
  if (!humanAgent) validError('令牌库缺少 human（共享 state 管理员）：先运行 init/doctor')
  await getHealth(server)

  const since = parseSince(options.since)
  const items = await readAllStateItems(server, humanAgent.token)
  const map = stateItemsToMap(items)
  let networkProjects = asArray(map.get('network.projects')).filter(
    (entry) => entry && typeof entry.projectId === 'string',
  )
  if (networkProjects.length === 0) {
    // 兜底：从 `<id>.progress` 字段反推项目，保证首次/部分发布也能 digest
    const ids = new Set()
    for (const field of map.keys()) {
      const match = /^([A-Za-z0-9][A-Za-z0-9._-]{0,63})\.progress$/.exec(field)
      if (match) ids.add(match[1])
    }
    networkProjects = [...ids].map((projectId) => ({ projectId }))
  }
  if (!networkProjects.some((entry) => entry.projectId === selfProjectId) && map.has(`${selfProjectId}.progress`)) {
    networkProjects.push({ projectId: selfProjectId })
  }
  const projects = networkProjects
    .map((entry) => projectReviewStats(projectDigestEntry(entry.projectId, entry, map)))
    .sort((a, b) => cmpStr(a.projectId, b.projectId))
  for (const project of projects) project.new = isNewerThan(project.updated, since)
  const pendingReview = buildPendingReview(projects, 30)
  const pendingReviewTotal = projects.reduce(
    (sum, project) => sum + (project.review && Number.isFinite(Number(project.review.pending)) ? Number(project.review.pending) : 0),
    0,
  )

  const now = new Date()
  const stale = []
  for (const project of projects) {
    if (!project.updated) continue
    const timestamp = new Date(project.updated).getTime()
    if (!Number.isFinite(timestamp)) continue
    const ageHours = (now.getTime() - timestamp) / 3600000
    if (ageHours > STALE_HOURS) {
      stale.push({
        projectId: project.projectId,
        title: project.title,
        updated: project.updated,
        ageHours: Math.round(ageHours),
      })
    }
  }
  const attention = buildDigestAttention(projects, selfProjectId, stale, since)
  const generatedAt = nowIso()
  const networkUpdated = map.get('network.updated') || null
  const markdown = buildDigestMarkdown({
    projects,
    attention,
    stale,
    generatedAt,
    since,
    networkUpdated: typeof networkUpdated === 'string' ? networkUpdated : null,
    selfProjectId,
    root,
    pendingReview,
    pendingReviewTotal,
  })

  let file = null
  if (options.write) {
    file = path.join(root, 'control', 'NETWORK.md')
    atomicWriteText(file, markdown, 0o644)
  }
  const result = {
    ok: true,
    generatedAt,
    networkUpdated: typeof networkUpdated === 'string' ? networkUpdated : null,
    selfProjectId,
    since: since ? since.toISOString() : null,
    projects,
    attention,
    stale,
    pendingReview,
    pendingReviewTotal,
    ...(file ? { path: file } : {}),
  }
  if (isJson(options)) {
    emit(options, result, [])
  } else if (options.write) {
    emit(options, result, [
      '生成项目网络摘要（NETWORK.md）',
      `  项目数  : ${projects.length}`,
      `  待复核  : ${pendingReviewTotal} 条（列出 ${pendingReview.length} 条）`,
      `  待关注  : ${attention.length} 条 ｜ 停滞项目 ${stale.length} 个`,
      `  文件    : ${file}`,
      `  网络更新: ${networkUpdated || '(未发布)'}`,
    ])
  } else {
    process.stdout.write(markdown)
  }
  return result
}

/* ------------------------------------------------------------------ main */

function pickCommand(options) {
  if (options.help) return 'help'
  const command = options._[0]
  if (!command) return 'help'
  if (command === 'help') return 'help'
  if (!COMMANDS.includes(command)) usageError(`未知命令：${command}（可用：${COMMANDS.join(', ')}）`)
  return command
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    process.stdout.write(`${usageText()}\n`)
    process.exit(0)
  }
  const options = parseArgv(argv)
  const command = pickCommand(options)
  if (command === 'help' || options.help) {
    process.stdout.write(`${usageText()}\n`)
    process.exit(0)
  }
  switch (command) {
    case 'doctor':
      await cmdDoctor(options)
      break
    case 'init':
      await cmdInit(options)
      break
    case 'push':
      await cmdPush(options)
      break
    case 'publish':
      await cmdPublish(options)
      break
    case 'idea':
      await cmdIdea(options)
      break
    case 'review':
      await cmdReview(options)
      break
    case 'digest':
      await cmdDigest(options)
      break
    case 'pull':
      await cmdPull(options)
      break
    case 'send':
      await cmdSend(options)
      break
    case 'route':
      await cmdRoute(options)
      break
    case 'status':
      await cmdStatus(options)
      break
    default:
      usageError(`未知命令：${command}`)
  }
}

main().catch((error) => {
  const options = (() => {
    try {
      return parseArgv(process.argv.slice(2))
    } catch {
      return {}
    }
  })()
  const tmcp = error instanceof TmcpError ? error : new TmcpError('E007', String(error && error.stack ? error.stack : error), 3)
  if (isJson(options)) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, code: `TMCP-${tmcp.code}`, message: tmcp.message }, null, 2)}\n`,
    )
  } else {
    process.stderr.write(`TMCP-${tmcp.code}: ${tmcp.message}\n`)
  }
  process.exit(tmcp.exit || 3)
})
