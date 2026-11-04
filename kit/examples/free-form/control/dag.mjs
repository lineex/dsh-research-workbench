#!/usr/bin/env node
/**
 * research-dag CLI —— PROTOCOL v1.3 的参考实现（零第三方依赖，Node >= 18，ESM，Windows 优先）
 *
 * 分层：
 *   解析层：frontmatter / handoff 正文 8 节 / 文件清单 markdown 表格 / BRIEF 6 节
 *   状态层：project state、ledger、DECISIONS、状态机转移与事件
 *   视图层：report / status / list / verify / check
 *   CLI 层：命令解析、--json 契约、退出码 0/1/2/3、原子写
 *
 * 所有核心函数均 export，供 tests/selftest.mjs 复用。
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 常量（与 PROTOCOL v1.3 对齐）
// ---------------------------------------------------------------------------

export const PROTOCOL_VERSION = '1.3';
export const SCHEMA_VERSION = 1;
export const SCRIPT_FILE = fileURLToPath(import.meta.url);

export const EXIT = Object.freeze({ OK: 0, INVALID: 1, USAGE: 2, IO: 3 });

export const ERR = Object.freeze({
  E001: 'DAG-E001', // 不是项目
  E002: 'DAG-E002', // 解析失败
  E003: 'DAG-E003', // 缺节
  E004: 'DAG-E004', // 清单文件缺失
  E005: 'DAG-E005', // 哈希不一致
  E006: 'DAG-E006', // 非法状态转移
  E007: 'DAG-E007', // 重复 id 或版本
  E008: 'DAG-E008', // 正文冻结被破坏
  E009: 'DAG-E009', // 同 stream 多个 ACCEPTED
  E010: 'DAG-E010', // 账本不一致
  E011: 'DAG-E011', // 缺少理由
  E012: 'DAG-E012', // project state 非法
  E013: 'DAG-E013', // 决策日志缺失条目
  E014: 'DAG-E014', // 路径逃逸
  E015: 'DAG-E015', // schema 不支持
});

export const STATUSES = Object.freeze([
  'DRAFT',
  'PROVISIONAL',
  'ACCEPTED',
  'REJECTED',
  'SUPERSEDED',
  'BLOCKED',
]);
export const TERMINAL_STATUSES = Object.freeze(['REJECTED', 'SUPERSEDED']);
export const PHASES = Object.freeze([
  'planning',
  'literature',
  'design',
  'data',
  'analysis',
  'manuscript',
  'review',
  'concluded',
]);
export const DECISION_ACTIONS = Object.freeze(['ACCEPT', 'REJECT', 'BLOCK', 'UNBLOCK', 'NOTE']);
export const STATUS_COUNT_KEY = Object.freeze({
  DRAFT: 'draft',
  PROVISIONAL: 'provisional',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  SUPERSEDED: 'superseded',
  BLOCKED: 'blocked',
});

export const HANDOFF_SECTIONS = Object.freeze(
  [
    '本分支解决的问题',
    '输入',
    '输出',
    '关键结果',
    '修改建议',
    '限制',
    '主项目需要做的决定',
    '文件清单',
  ].map((title, i) => ({ n: i + 1, title })),
);

export const BRIEF_SECTIONS = Object.freeze([
  '要解决的问题',
  '输入',
  '允许修改',
  '禁止修改',
  '完成标准',
  '必须交付',
]);

export const MANIFEST_HEADER = Object.freeze(['文件', 'SHA-256', '说明']);

/**
 * v1.2 统一节点 id 规则：module 与 branch 共用；各自 namespace 内项目唯一。
 * branch 不再要求模块号前缀，也不再与 module 的编号关联。
 * 长度 1–64，且**不得以 `.` 或 `-` 结尾**（Windows 目录名安全）。
 */
export const ID_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_])?$/;
/** module/branch 显示名长度上限（按 Unicode 码点计）。 */
export const NAME_MAX_CHARS = 80;
/** 目录追加 slug 规则（空串表示不追加；`<id>` 或 `<id>-<slug>`）。 */
export const DIR_SLUG_RE = /^[A-Za-z0-9._-]{0,40}$/;
/** handoff 文件名 label（`--slug`）规则：字母/数字/`._-`。 */
export const HANDOFF_LABEL_RE = /^[A-Za-z0-9._-]{1,80}$/;

export const COMMANDS = Object.freeze([
  'init',
  'module add',
  'branch new',
  'handoff new',
  'submit',
  'accept',
  'reject',
  'block',
  'unblock',
  'status',
  'list',
  'check',
  'verify',
  'report',
  'state set',
  'results',
  'auto',
  'selftest',
]);

// ---------------------------------------------------------------------------
// 错误类型
// ---------------------------------------------------------------------------

export class DagError extends Error {
  /**
   * @param {string} code DAG-E0xx
   * @param {string} message 中文说明
   * @param {number} exitCode 0/1/2/3
   * @param {{issues?: Array, payload?: object}} [extra]
   */
  constructor(code, message, exitCode = EXIT.INVALID, extra = {}) {
    super(message);
    this.name = 'DagError';
    this.code = code;
    this.exitCode = exitCode;
    if (extra.issues) this.issues = extra.issues;
    if (extra.payload) this.payload = extra.payload;
  }
}

function usageError(message) {
  return new DagError(ERR.E002, `用法错误：${message}`, EXIT.USAGE);
}

function invalid(code, message) {
  return new DagError(code, message, EXIT.INVALID);
}

function ioError(message) {
  return new DagError(ERR.E002, `I/O 错误：${message}`, EXIT.IO);
}

// ---------------------------------------------------------------------------
// 通用工具
// ---------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, '0');

/** 本地日期 YYYY-MM-DD */
export function todayLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 本地时间戳（带时区偏移），如 2026-10-18T12:00:00+08:00 */
export function nowIso(d = new Date()) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    `${todayLocal(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

/** 严格 YYYY-MM-DD（真实存在的日期） */
export function isDateStr(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function cmpStr(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  return x < y ? -1 : x > y ? 1 : 0;
}

/** markdown 表格单元格（转义竖线、折叠换行） */
export function mdCell(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

export function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

export function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

/** 对单个文件按原始字节计算 SHA-256 */
export function sha256File(absPath) {
  let buf;
  try {
    buf = fs.readFileSync(absPath);
  } catch (err) {
    throw ioError(`无法读取文件 ${absPath}：${err.message}`);
  }
  return sha256Hex(buf);
}

/**
 * PROTOCOL §3.5 body_hash（逐字实现）：
 *   body = 去掉 frontmatter 后的全文
 *   body = body.replace(/\r\n/g, "\n")
 *   body = body.replace(/\s+$/, "")
 *   body_hash = sha256_hex(utf8(body))
 */
export function hashBodyRaw(bodyRaw) {
  const body = String(bodyRaw).replace(/\r\n/g, '\n').replace(/\s+$/, '');
  return sha256Hex(body);
}

export function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (err) {
    throw ioError(`无法创建目录 ${p}：${err.message}`);
  }
}

/** 列出目录下的条目名（不存在时返回空数组） */
export function listNames(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export function readTextFile(absPath, label) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    throw ioError(`无法读取 ${label || absPath}：${err.message}`);
  }
}

/**
 * 原子写：同目录临时文件 + rename（Windows 下 rename 失败时退化为先删后改名）。
 */
export function writeFileAtomic(absPath, content) {
  const dir = path.dirname(absPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw ioError(`无法创建目录 ${dir}：${err.message}`);
  }
  const tmp = path.join(
    dir,
    `.${path.basename(absPath)}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  );
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    try {
      fs.renameSync(tmp, absPath);
    } catch {
      try {
        fs.unlinkSync(absPath);
      } catch {
        /* 目标不存在 */
      }
      fs.renameSync(tmp, absPath);
    }
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw ioError(`写入失败 ${absPath}：${err.message}`);
  }
}

export function writeJsonFile(absPath, value) {
  writeFileAtomic(absPath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJsonFile(absPath, label) {
  const text = readTextFile(absPath, label);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw invalid(ERR.E002, `${label || absPath} JSON 解析失败：${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 项目根定位 / 路径安全（DAG-E014）
// ---------------------------------------------------------------------------

export function isProjectRoot(dir) {
  return isFile(path.join(dir, 'control', 'ledger.json'));
}

/**
 * 定位项目根：--root 显式指定，否则从 cwd 向上找含 control/ledger.json 的目录（最多 6 层）。
 */
export function resolveProjectRoot(cwd, explicitRoot) {
  if (explicitRoot !== undefined && explicitRoot !== null && explicitRoot !== '') {
    const abs = path.resolve(cwd, String(explicitRoot));
    if (!isProjectRoot(abs)) {
      throw invalid(ERR.E001, `不是研究项目：${abs} 下没有 control/ledger.json`);
    }
    return abs;
  }
  let cur = path.resolve(cwd);
  for (let i = 0; i <= 6; i += 1) {
    if (isProjectRoot(cur)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw invalid(ERR.E001, '不是研究项目：未找到 control/ledger.json（可用 --root 指定，或先运行 dag init）');
}

/**
 * 校验并规范化清单/决策中的相对路径（PROTOCOL §3.4）：
 * 必须相对项目根、使用 `/`、禁止绝对路径 / Windows 盘符 / `..` 逃逸。
 * @returns {string} 规范化后的 posix 相对路径
 */
export function normalizeManifestPath(raw) {
  if (typeof raw !== 'string') throw invalid(ERR.E014, '清单路径必须是字符串');
  const p = raw.trim();
  if (p === '') throw invalid(ERR.E014, '清单路径为空');
  if (p.includes('\\')) throw invalid(ERR.E014, `清单路径必须使用 / 分隔符：${p}`);
  if (p.startsWith('/')) throw invalid(ERR.E014, `禁止绝对路径：${p}`);
  if (/^[A-Za-z]:/.test(p)) throw invalid(ERR.E014, `禁止 Windows 盘符路径：${p}`);
  const segments = p.split('/');
  for (const seg of segments) {
    if (seg === '') throw invalid(ERR.E014, `清单路径含空段：${p}`);
    if (seg === '.') throw invalid(ERR.E014, `清单路径含 . 段：${p}`);
    if (seg === '..') throw invalid(ERR.E014, `禁止 .. 路径逃逸：${p}`);
  }
  return segments.join('/');
}

function realRootOf(root) {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
}

function assertInsideRealRoot(realRoot, absPath) {
  let resolved = absPath;
  try {
    resolved = fs.realpathSync(absPath);
  } catch {
    resolved = path.resolve(absPath);
  }
  const rel = path.relative(realRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw invalid(ERR.E014, `路径逃逸到项目根之外：${toPosix(absPath)}`);
  }
  return resolved;
}

/**
 * 项目内文件解析：规范化相对路径 + 防逃逸（符号链接按 realpath 判定）。
 * @returns {{abs:string, rel:string}}
 */
export function resolveProjectFile(root, rel, { mustExist = false } = {}) {
  const normalized = normalizeManifestPath(rel);
  const realRoot = realRootOf(root);
  const abs = path.resolve(realRoot, ...normalized.split('/'));
  assertInsideRealRoot(realRoot, abs);
  if (mustExist) {
    if (!isFile(abs)) throw invalid(ERR.E004, `清单文件不存在：${normalized}`);
    return { abs: assertInsideRealRoot(realRoot, abs), rel: normalized };
  }
  return { abs, rel: normalized };
}

/**
 * 解析用户给出的 handoff 路径（可绝对、可相对 cwd/root），必须位于项目根内。
 * @returns {{abs:string, rel:string, exists:boolean}}
 */
export function resolveUserHandoffPath(root, cwd, arg) {
  if (typeof arg !== 'string' || arg.trim() === '') throw usageError('缺少 handoff 路径参数');
  const raw = arg.trim();
  const abs = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(cwd, raw);
  const realRoot = realRootOf(root);
  const exists = isFile(abs);
  const resolved = exists ? realpathSafe(abs) : path.resolve(abs);
  const rel = path.relative(realRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw invalid(ERR.E014, `handoff 路径逃逸到项目根之外：${arg}`);
  }
  return { abs: resolved, rel: toPosix(rel), exists };
}

function realpathSafe(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

// ---------------------------------------------------------------------------
// 解析层 1：frontmatter（PROTOCOL §3.2）
// ---------------------------------------------------------------------------

/**
 * 解析 frontmatter + 正文。
 * 规则：首行必须是 `---`；结束行是单独一行 `---`；key: value 以第一个 `:` 分隔；
 * value 去首尾空白；成对引号去引号；空 value 为 null；行内 `#` 不是注释；未知键保留。
 * @returns {{entries: Array<{key:string,value:(string|null)}>, bodyRaw: string}}
 */
export function parseFrontmatter(text) {
  let src = String(text);
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const firstNl = src.indexOf('\n');
  if (firstNl === -1) {
    throw invalid(ERR.E002, 'handoff 文件缺少 frontmatter（首行必须是 ---）');
  }
  const firstLine = src.slice(0, firstNl).replace(/\r$/, '');
  if (firstLine.trim() !== '---') {
    throw invalid(ERR.E002, 'handoff 文件第一行必须是 ---');
  }
  const entries = [];
  let pos = firstNl + 1;
  while (pos <= src.length) {
    const nl = src.indexOf('\n', pos);
    const end = nl === -1 ? src.length : nl;
    let line = src.slice(pos, end);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.trim() === '---') {
      const bodyStart = nl === -1 ? src.length : nl + 1;
      return { entries, bodyRaw: src.slice(bodyStart) };
    }
    if (line.trim() === '') {
      if (nl === -1) break;
      pos = nl + 1;
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) {
      throw invalid(ERR.E002, `frontmatter 行无法解析（缺少冒号）：${line.trim().slice(0, 100)}`);
    }
    const key = line.slice(0, colon).trim();
    if (key === '') throw invalid(ERR.E002, 'frontmatter 存在空 key');
    let value = line.slice(colon + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    entries.push({ key, value: value === '' ? null : value });
    if (nl === -1) break;
    pos = nl + 1;
  }
  throw invalid(ERR.E002, 'handoff frontmatter 未闭合（缺少结束 --- 行）');
}

/** 读取 frontmatter 键（重复时取最后一个） */
export function fmGet(entries, key) {
  let value = null;
  for (const entry of entries) if (entry.key === key) value = entry.value;
  return value;
}

/** 设置 frontmatter 键（保持位置；缺失时追加到末尾）；value 为 null 表示空值 */
export function fmSet(entries, key, value) {
  const v = value === undefined ? null : value === null ? null : String(value);
  for (const entry of entries) {
    if (entry.key === key) {
      entry.value = v;
      return;
    }
  }
  entries.push({ key, value: v });
}

export function serializeFrontmatter(entries) {
  return entries
    .map(({ key, value }) => {
      if (value === null || value === undefined || value === '') return `${key}:`;
      return `${key}: ${value}`;
    })
    .join('\n');
}

/** 序列化完整 handoff：frontmatter + bodyRaw（body 原样保留，用于状态变更） */
export function serializeDocument(entries, bodyRaw) {
  return `---\n${serializeFrontmatter(entries)}\n---\n${bodyRaw}`;
}

export function parseDocument(text) {
  const { entries, bodyRaw } = parseFrontmatter(text);
  return { entries, bodyRaw, bodyLines: bodyRaw.split('\n') };
}

/** 从 handoff frontmatter 读出类型化元数据 */
export function handoffMetaFromDoc(doc) {
  const g = (k) => fmGet(doc.entries, k);
  const versionRaw = g('version');
  const version = versionRaw !== null && /^\d+$/.test(versionRaw) ? Number(versionRaw) : null;
  const supersedesRaw = g('supersedes');
  let supersedes = 0;
  if (supersedesRaw !== null && supersedesRaw !== '' && supersedesRaw !== '0') {
    supersedes = /^\d+$/.test(supersedesRaw) ? Number(supersedesRaw) : supersedesRaw;
  }
  return {
    project: g('project'),
    module: g('module'),
    branch: g('branch'),
    stream: g('stream'),
    version,
    status: g('status'),
    created_at: g('created_at'),
    baseline: g('baseline'),
    submitted_at: g('submitted_at'),
    decided_at: g('decided_at'),
    decision_reason: g('decision_reason'),
    supersedes,
    superseded_by: g('superseded_by'),
    blocked_from: g('blocked_from'),
  };
}

// ---------------------------------------------------------------------------
// 解析层 2：handoff 正文 8 节 / BRIEF 6 节
// ---------------------------------------------------------------------------

/** 找出正文中的所有二级标题行 index 与文本 */
function h2Headings(bodyLines) {
  const heads = [];
  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i].replace(/\r$/, '');
    if (/^\s*##\s/.test(line)) heads.push({ i, line });
  }
  return heads;
}

/**
 * 判断一段内容是否有「非空内容行」：空行、标题行、占位符 `...` / `TODO` 不算。
 */
export function hasMeaningfulContent(lines) {
  for (const raw of lines) {
    const s = raw.replace(/\r$/, '').trim();
    if (s === '') continue;
    if (/^#{1,6}\s/.test(s)) continue;
    if (s === '...' || s === '…' || s === '....') continue;
    const upper = s.toUpperCase();
    if (upper === 'TODO' || upper.startsWith('TODO:') || upper.startsWith('TODO：')) continue;
    return true;
  }
  return false;
}

/**
 * 解析 handoff 正文 8 个必需节。
 * @returns {{sections: Map<number, {n:number,title:string,headingLine:number,contentStart:number,contentEnd:number,contentLines:string[]}>, errors: Array<{code:string,message:string}>}}
 */
export function analyzeHandoffBody(bodyLines) {
  const errors = [];
  const sections = new Map();
  const heads = h2Headings(bodyLines);
  let lastN = 0;
  for (let k = 0; k < heads.length; k += 1) {
    const { i, line } = heads[k];
    const m = /^\s*##\s+(\d{1,2})\.\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1 || n > 8) continue;
    const title = m[2].trim();
    const expected = HANDOFF_SECTIONS[n - 1].title;
    if (sections.has(n)) {
      errors.push({ code: ERR.E003, message: `第 ${n} 节重复` });
      continue;
    }
    if (title !== expected) {
      errors.push({
        code: ERR.E003,
        message: `第 ${n} 节标题不符（期望「${expected}」，实际「${title}」）`,
      });
    }
    const contentStart = i + 1;
    const contentEnd = k + 1 < heads.length ? heads[k + 1].i : bodyLines.length;
    sections.set(n, {
      n,
      title,
      headingLine: i,
      contentStart,
      contentEnd,
      contentLines: bodyLines.slice(contentStart, contentEnd),
    });
    if (n <= lastN) errors.push({ code: ERR.E003, message: `第 ${n} 节顺序错乱` });
    lastN = Math.max(lastN, n);
  }
  for (let n = 1; n <= 8; n += 1) {
    if (!sections.has(n)) {
      errors.push({ code: ERR.E003, message: `缺少第 ${n} 节「${HANDOFF_SECTIONS[n - 1].title}」` });
    }
  }
  return { sections, errors };
}

/**
 * 解析 BRIEF.md 6 个固定二级标题。
 * @returns {{sections: Map<string,{contentLines:string[]}>, errors: Array<{code:string,message:string}>}}
 */
export function analyzeBrief(text) {
  const errors = [];
  const sections = new Map();
  const bodyLines = String(text).replace(/\r\n/g, '\n').split('\n');
  const heads = h2Headings(bodyLines);
  for (let k = 0; k < heads.length; k += 1) {
    const { i, line } = heads[k];
    const title = line.trim().replace(/^##\s+/, '').trim();
    if (!BRIEF_SECTIONS.includes(title)) continue;
    if (sections.has(title)) {
      errors.push({ code: ERR.E003, message: `BRIEF 节重复：${title}` });
      continue;
    }
    const contentEnd = k + 1 < heads.length ? heads[k + 1].i : bodyLines.length;
    sections.set(title, { contentLines: bodyLines.slice(i + 1, contentEnd) });
  }
  for (const title of BRIEF_SECTIONS) {
    const sec = sections.get(title);
    if (!sec) {
      errors.push({ code: ERR.E003, message: `BRIEF 缺少节「${title}」` });
    } else if (!hasMeaningfulContent(sec.contentLines)) {
      errors.push({ code: ERR.E003, message: `BRIEF 节「${title}」内容为空` });
    }
  }
  return { sections, errors };
}

// ---------------------------------------------------------------------------
// 解析层 3：文件清单 markdown 表格（PROTOCOL §3.4）
// ---------------------------------------------------------------------------

const SHA_RE = /^[0-9a-f]{64}$/;

export function isRealSha(value) {
  return typeof value === 'string' && SHA_RE.test(value.trim());
}

/** `待计算`、空串都视为未计算 */
export function isPendingSha(value) {
  const s = String(value ?? '').trim();
  return s === '' || s === '待计算';
}

/** 拆分 markdown 表格行，支持 `\|` 转义；非表格行返回 null */
export function splitTableRow(line) {
  const s = String(line).trim();
  if (!s.startsWith('|')) return null;
  let inner = s.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === '\\' && inner[i + 1] === '|') {
      cur += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return Array.isArray(cells) && cells.length === 3 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function isManifestHeader(cells) {
  return (
    Array.isArray(cells) &&
    cells.length === 3 &&
    cells[0] === MANIFEST_HEADER[0] &&
    cells[1] === MANIFEST_HEADER[1] &&
    cells[2] === MANIFEST_HEADER[2]
  );
}

/**
 * 解析第 8 节文件清单表格。
 * @returns {{rows: Array<{path:string,sha:string,note:string,lineIndex:number}>, errors: Array<{code:string,message:string}>, hasTable:boolean}}
 */
export function parseManifestTable(sectionLines) {
  const errors = [];
  const rows = [];
  const lines = Array.isArray(sectionLines) ? sectionLines : [];
  const parsed = [];
  for (let i = 0; i < lines.length; i += 1) {
    const cells = splitTableRow(lines[i].replace(/\r$/, ''));
    if (cells) parsed.push({ i, cells });
  }
  if (parsed.length === 0) {
    return { rows, errors, hasTable: false };
  }
  const header = parsed[0];
  if (!isManifestHeader(header.cells)) {
    errors.push({ code: ERR.E002, message: '文件清单表头固定为 `| 文件 | SHA-256 | 说明 |`' });
    return { rows, errors, hasTable: true };
  }
  const sep = parsed[1];
  if (!sep || !isSeparatorRow(sep.cells)) {
    errors.push({ code: ERR.E002, message: '文件清单缺少表头分隔行 `| --- | --- | --- |`' });
    return { rows, errors, hasTable: true };
  }
  for (let k = 2; k < parsed.length; k += 1) {
    const { i, cells } = parsed[k];
    if (isSeparatorRow(cells)) {
      errors.push({ code: ERR.E002, message: `文件清单第 ${i + 1} 行是重复的分隔行` });
      continue;
    }
    if (cells.length !== 3) {
      errors.push({
        code: ERR.E002,
        message: `文件清单行必须有 3 列（文件 | SHA-256 | 说明），实际 ${cells.length} 列`,
      });
      continue;
    }
    const [p, sha, note] = cells;
    if (p === '') {
      errors.push({ code: ERR.E002, message: `文件清单第 ${i + 1} 行文件路径为空` });
      continue;
    }
    rows.push({ path: p, sha, note, lineIndex: i });
  }
  return { rows, errors, hasTable: true };
}

export function formatManifestRow(filePath, sha, note) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|');
  return `| ${esc(filePath)} | ${esc(sha)} | ${esc(note)} |`;
}

// ---------------------------------------------------------------------------
// 解析层 4：handoff 文件名（PROTOCOL v1.2：label 自由，目录↔id 由 state 映射）
// ---------------------------------------------------------------------------

/**
 * `HANDOFF-<label>-v<N>.md`。
 * v1.2 只要求 `HANDOFF-` 前缀、`-v<N>.md` 结尾；label 不参与语义，唯一权威是
 * frontmatter 与 PROJECT_STATE.json 的 dir 映射。
 */
export function parseHandoffFilename(fileName) {
  const m = /^HANDOFF-(.+)-v([1-9]\d*)\.md$/.exec(String(fileName));
  if (!m) return null;
  const label = m[1];
  if (label.length === 0) return null;
  return { label, version: Number(m[2]) };
}

// ---------------------------------------------------------------------------
// 状态层 1：PROJECT_STATE.json / ledger.json / DECISIONS.md
// ---------------------------------------------------------------------------

export function loadProjectState(root) {
  const file = path.join(root, 'control', 'PROJECT_STATE.json');
  const value = readJsonFile(file, 'control/PROJECT_STATE.json');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid(ERR.E012, 'control/PROJECT_STATE.json 必须是 JSON 对象');
  }
  if (value.schema !== SCHEMA_VERSION) {
    throw new DagError(
      ERR.E015,
      `不支持的 PROJECT_STATE schema：${JSON.stringify(value.schema)}`,
      EXIT.INVALID,
    );
  }
  return value;
}

export function saveProjectState(root, state) {
  writeJsonFile(path.join(root, 'control', 'PROJECT_STATE.json'), state);
}

export function loadLedger(root) {
  const file = path.join(root, 'control', 'ledger.json');
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw invalid(ERR.E002, `control/ledger.json 读取/解析失败：${err.message}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DagError(ERR.E010, 'control/ledger.json 结构非法（必须是对象）', EXIT.INVALID);
  }
  if (value.schema !== SCHEMA_VERSION) {
    throw new DagError(
      ERR.E015,
      `不支持的 ledger schema：${JSON.stringify(value.schema)}`,
      EXIT.INVALID,
    );
  }
  if (!Array.isArray(value.handoffs)) {
    throw new DagError(ERR.E010, 'control/ledger.json 缺少 handoffs 数组', EXIT.INVALID);
  }
  return value;
}

export function sortHandoffs(handoffs) {
  handoffs.sort((a, b) => cmpStr(a && a.path, b && b.path));
  return handoffs;
}

export function saveLedger(root, ledger) {
  sortHandoffs(ledger.handoffs);
  writeJsonFile(path.join(root, 'control', 'ledger.json'), ledger);
}

export function loadProject(root) {
  if (!isProjectRoot(root)) {
    throw invalid(ERR.E001, `不是研究项目：${root}（缺少 control/ledger.json）`);
  }
  return { root, state: loadProjectState(root), ledger: loadLedger(root) };
}

export function makeLedgerEntry(meta, relPath, at, by) {
  return {
    path: relPath,
    project: meta.project,
    module: meta.module,
    branch: meta.branch,
    stream: meta.stream,
    version: meta.version,
    status: 'DRAFT',
    body_hash: null,
    submitted_at: null,
    decided_at: null,
    decision_reason: null,
    supersedes: 0,
    superseded_by: null,
    blocked_from: null,
    files: [],
    events: [{ at, action: 'CREATE', by: by || meta.branch, from: null, to: 'DRAFT' }],
  };
}

export function findLedgerEntry(ledger, relPath) {
  return (ledger.handoffs || []).find((h) => h && h.path === relPath) || null;
}

/** 解析 DECISIONS.md（PROTOCOL §5.4） */
export function parseDecisions(text) {
  const decisions = [];
  const errors = [];
  let cur = null;
  for (const rawLine of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    const head = /^##\s+D-(\d{4})\s*·\s*(.*)$/.exec(line);
    if (head) {
      if (cur) decisions.push(cur);
      cur = { id: head[1], summary: head[2].trim(), fields: {} };
      continue;
    }
    if (/^##\s+D-/.test(line)) {
      errors.push({ code: ERR.E013, message: `决策标题格式非法：${line}` });
      continue;
    }
    if (!cur) continue;
    if (/^##\s/.test(line)) {
      decisions.push(cur);
      cur = null;
      continue;
    }
    const field = /^-\s*(时间|动作|对象|状态|理由|关联)\s*[:：]\s*(.*)$/.exec(line);
    if (field) {
      cur.fields[field[1]] = field[2].trim();
    }
  }
  if (cur) decisions.push(cur);
  const mapped = decisions.map((d) => ({
    id: d.id,
    summary: d.summary,
    time: d.fields['时间'] ?? null,
    action: d.fields['动作'] ?? null,
    object: d.fields['对象'] ?? null,
    status: d.fields['状态'] ?? null,
    reason: d.fields['理由'] ?? null,
    related: d.fields['关联'] ?? null,
  }));
  for (const d of mapped) {
    if (!d.action) errors.push({ code: ERR.E013, message: `决策 D-${d.id} 缺少 动作` });
    if (!d.object) errors.push({ code: ERR.E013, message: `决策 D-${d.id} 缺少 对象` });
  }
  return { decisions: mapped, errors };
}

/** 追加一条决策日志，返回 {id, summary} */
export function appendDecision(root, payload) {
  const file = path.join(root, 'control', 'DECISIONS.md');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw ioError(`无法读取 control/DECISIONS.md：${err.message}`);
  }
  const { decisions } = parseDecisions(text);
  const next = decisions.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0) + 1;
  const id = String(next).padStart(4, '0');
  const verbs = {
    ACCEPT: '接受',
    REJECT: '拒绝',
    BLOCK: '阻塞',
    UNBLOCK: '解除阻塞',
    NOTE: '备注',
  };
  const reason = String(payload.reason ?? '').replace(/\r?\n/g, ' ');
  const summary = `${verbs[payload.action] || payload.action} ${payload.branchName || payload.objectRel} v${payload.version}`;
  if (!text.endsWith('\n')) text += '\n';
  const block = [
    '',
    `## D-${id} · ${summary}`,
    `- 时间: ${todayLocal()}`,
    `- 动作: ${payload.action}`,
    `- 对象: ${payload.objectRel}`,
    `- 状态: ${payload.status || ''}`,
    `- 理由: ${reason}`,
  ].join('\n');
  writeFileAtomic(file, `${text}${block}\n`);
  return { id, summary };
}

// ---------------------------------------------------------------------------
// 状态层 2：目录扫描
// ---------------------------------------------------------------------------

/** 规范化 state 中的目录相对路径（posix，去掉尾部 `/`，统一分隔符） */
export function normalizeDirRel(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');
}

export function scanModuleDirs(root) {
  const modulesRoot = path.join(root, 'modules');
  return listNames(modulesRoot)
    .filter((name) => isDir(path.join(modulesRoot, name)))
    .sort(cmpStr)
    .map((name) => ({
      name,
      rel: `modules/${name}`,
      abs: path.join(modulesRoot, name),
    }));
}

export function scanBranchDirs(moduleDir) {
  const branchesRoot = path.join(moduleDir.abs, 'branches');
  return listNames(branchesRoot)
    .filter((name) => isDir(path.join(branchesRoot, name)))
    .sort(cmpStr)
    .map((name) => ({
      name,
      rel: `${moduleDir.rel}/branches/${name}`,
      abs: path.join(branchesRoot, name),
      moduleDirName: moduleDir.name,
      moduleRel: moduleDir.rel,
    }));
}

export function scanHandoffFiles(root) {
  const out = [];
  for (const mod of scanModuleDirs(root)) {
    const handoffsDir = path.join(mod.abs, 'handoffs');
    for (const name of listNames(handoffsDir).sort(cmpStr)) {
      if (!name.endsWith('.md')) continue;
      const abs = path.join(handoffsDir, name);
      if (!isFile(abs)) continue;
      out.push({
        rel: `${mod.rel}/handoffs/${name}`,
        abs,
        fileName: name,
        moduleDirName: mod.name,
        moduleRel: mod.rel,
      });
    }
  }
  return out.sort((a, b) => cmpStr(a.rel, b.rel));
}

/**
 * 按 PROJECT_STATE.json 的 `dir` 映射定位 handoff 所属模块（最长前缀匹配）。
 * 目录名不参与 id 推导——state.dir 是唯一权威。
 * @returns {{module:object, dir:string, tail:string}|null}
 */
export function findModuleForHandoff(state, rel) {
  if (!state || !Array.isArray(state.modules)) return null;
  let best = null;
  for (const module of state.modules) {
    if (!module || typeof module.dir !== 'string') continue;
    const dir = normalizeDirRel(module.dir);
    if (dir.length === 0) continue;
    if (rel !== dir && !rel.startsWith(`${dir}/`)) continue;
    if (!best || dir.length > best.dir.length) best = { module, dir };
  }
  if (!best) return null;
  return { module: best.module, dir: best.dir, tail: rel.slice(best.dir.length) };
}

/** handoff 身份校验：文件名、frontmatter 必填键、与 state 注册（module/branch/project）的一致性 */
export function collectHandoffIdentityIssues(rec, state) {
  const issues = [];
  const add = (code, message) => issues.push({ code, message });
  const fn = parseHandoffFilename(rec.fileName);
  if (!fn) {
    add(ERR.E002, '文件名必须以 HANDOFF- 开头、以 -v<N>.md 结尾');
    return issues;
  }
  const meta = rec.meta;

  const required = [
    ['project', meta.project],
    ['module', meta.module],
    ['branch', meta.branch],
    ['stream', meta.stream],
    ['version', meta.version],
    ['status', meta.status],
    ['created_at', meta.created_at],
  ];
  for (const [key, value] of required) {
    if (value === null || value === undefined || value === '') add(ERR.E002, `缺少必填键 ${key}`);
  }
  if (meta.version !== null && meta.version !== fn.version) {
    add(ERR.E002, `version(${meta.version}) 与文件名 v${fn.version} 不一致`);
  }
  if (state && state.project && meta.project && meta.project !== state.project.id) {
    add(ERR.E002, `project(${meta.project}) 与项目 id(${state.project.id}) 不一致`);
  }
  if (meta.stream && !/^[a-z0-9][a-z0-9-]*$/.test(meta.stream)) {
    add(ERR.E002, `stream 格式非法：${meta.stream}`);
  }
  if (meta.status && !STATUSES.includes(meta.status)) {
    add(ERR.E002, `status 非法：${meta.status}`);
  }
  if (meta.created_at && !isDateStr(meta.created_at)) {
    add(ERR.E002, `created_at 必须是 YYYY-MM-DD：${meta.created_at}`);
  }
  for (const key of ['submitted_at', 'decided_at']) {
    const value = meta[key];
    if (value !== null && value !== '' && !isDateStr(value)) {
      add(ERR.E002, `${key} 必须是 YYYY-MM-DD 或空：${value}`);
    }
  }
  if (meta.supersedes !== 0 && !Number.isInteger(meta.supersedes)) {
    add(ERR.E002, `supersedes 必须是整数：${meta.supersedes}`);
  }

  if (state && Array.isArray(state.modules)) {
    const found = findModuleForHandoff(state, rec.rel);
    if (!found) {
      add(ERR.E012, `handoff 不在任何已注册模块的 handoffs/ 目录下：${rec.rel}`);
    } else {
      const { module, tail } = found;
      if (tail !== `/handoffs/${rec.fileName}`) {
        add(ERR.E012, `handoff 必须直接位于模块 ${module.id} 的 handoffs/ 目录：${rec.rel}`);
      }
      if (meta.module && meta.module !== module.id) {
        add(ERR.E002, `module(${meta.module}) 与 state 中该目录对应的模块(${module.id}) 不一致`);
      }
      const branches = Array.isArray(state.branches) ? state.branches : [];
      const branch = branches.find((b) => b && b.id === meta.branch);
      if (!branch) {
        add(ERR.E002, `分支未在 PROJECT_STATE.json 注册：${meta.branch}`);
      } else if (branch.module !== module.id) {
        add(
          ERR.E002,
          `分支 ${meta.branch} 属于模块 ${branch.module}，与 handoff 所在模块 ${module.id} 不一致`,
        );
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// 视图层 1：report（PROJECT_STATE.md AUTO 区块 / MODULE_REGISTER.md）
// ---------------------------------------------------------------------------

/** 读取 handoff 第 7 节内容作为「要决定的问题」（容错，不抛异常） */
export function questionForHandoff(root, entry) {
  try {
    const rel = normalizeManifestPath(String(entry && entry.path));
    const file = path.join(root, ...rel.split('/'));
    if (!isFile(file)) return '';
    const doc = parseDocument(fs.readFileSync(file, 'utf8'));
    const { sections } = analyzeHandoffBody(doc.bodyLines);
    const sec = sections.get(7);
    if (!sec) return '';
    return sec.contentLines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s*/, ''))
      .join('；');
  } catch {
    return '';
  }
}

function latestActivityDate(ledger, moduleId, fallback) {
  let latest = '';
  for (const h of ledger.handoffs || []) {
    if (!h || h.module !== moduleId) continue;
    for (const value of [h.decided_at, h.submitted_at]) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const day = value.slice(0, 10);
        if (day > latest) latest = day;
      }
    }
    for (const ev of h.events || []) {
      if (ev && typeof ev.at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ev.at)) {
        const day = ev.at.slice(0, 10);
        if (day > latest) latest = day;
      }
    }
  }
  if (!latest && fallback) latest = String(fallback).slice(0, 10);
  return latest || '-';
}

export function buildAutoLines(root, state, ledger) {
  const lines = [];
  lines.push('## 当前阶段', String(state.phase ?? ''));
  lines.push('', '## 下一步');
  const nextSteps = Array.isArray(state.next_steps) ? state.next_steps : [];
  if (nextSteps.length === 0) lines.push('- （无）');
  else for (const step of nextSteps) lines.push(`- ${mdCell(step)}`);
  lines.push('', '## 阻塞');
  const blockers = Array.isArray(state.blockers) ? state.blockers : [];
  if (blockers.length === 0) lines.push('- 无');
  else for (const blocker of blockers) lines.push(`- ${mdCell(blocker)}`);

  lines.push('', '## 待主项目决定', '| 模块 | 分支 | 版本 | 要决定的问题 |', '|---|---|---|---|');
  const pending = (ledger.handoffs || [])
    .filter((h) => h && h.status === 'PROVISIONAL')
    .sort((a, b) => cmpStr(a.path, b.path));
  for (const h of pending) {
    const question = questionForHandoff(root, h) || '（未填写）';
    lines.push(`| ${mdCell(h.module)} | ${mdCell(h.branch)} | ${h.version} | ${mdCell(question)} |`);
  }

  lines.push('', '## 已接受结果（下游可用）', '| stream | 版本 | 位置 |', '|---|---|---|');
  const accepted = (ledger.handoffs || [])
    .filter((h) => h && h.status === 'ACCEPTED')
    .sort((a, b) => cmpStr(a.stream, b.stream) || cmpStr(a.path, b.path));
  for (const h of accepted) {
    lines.push(`| ${mdCell(h.stream)} | ${h.version} | ${mdCell(h.path)} |`);
  }

  lines.push(
    '',
    '## 模块概览',
    '| 模块 | 名称 | 分支 | 草稿 | 待决定 | 已接受 |',
    '|---|---|---|---|---|---|',
  );
  const modules = (Array.isArray(state.modules) ? state.modules : [])
    .slice()
    .sort((a, b) => cmpStr(a && a.id, b && b.id));
  for (const mod of modules) {
    const branchCount = (state.branches || []).filter((b) => b && b.module === mod.id).length;
    const counts = { DRAFT: 0, PROVISIONAL: 0, ACCEPTED: 0 };
    for (const h of ledger.handoffs || []) {
      if (h && h.module === mod.id && counts[h.status] !== undefined) counts[h.status] += 1;
    }
    lines.push(
      `| ${mdCell(mod.id)} | ${mdCell(mod.name)} | ${branchCount} | ${counts.DRAFT} | ${counts.PROVISIONAL} | ${counts.ACCEPTED} |`,
    );
  }
  return lines;
}

export function buildModuleRegister(state, ledger) {
  const lines = [
    '# 模块注册表',
    '',
    '| 模块 | 名称 | 分支数 | 已接受 | 待决定 | 最新活动 |',
    '|---|---|---|---|---|---|',
  ];
  const modules = (Array.isArray(state.modules) ? state.modules : [])
    .slice()
    .sort((a, b) => cmpStr(a && a.id, b && b.id));
  for (const mod of modules) {
    const branchCount = (state.branches || []).filter((b) => b && b.module === mod.id).length;
    const acceptedCount = (ledger.handoffs || []).filter(
      (h) => h && h.module === mod.id && h.status === 'ACCEPTED',
    ).length;
    const pendingCount = (ledger.handoffs || []).filter(
      (h) => h && h.module === mod.id && h.status === 'PROVISIONAL',
    ).length;
    lines.push(
      `| ${mdCell(mod.id)} | ${mdCell(mod.name)} | ${branchCount} | ${acceptedCount} | ${pendingCount} | ${latestActivityDate(ledger, mod.id, mod.created_at)} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export function replaceAutoBlock(markdown, contentLines) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const begin = lines.findIndex((line) => line.trim() === '<!-- BEGIN AUTO -->');
  const end = lines.findIndex((line) => line.trim() === '<!-- END AUTO -->');
  if (begin === -1 || end === -1 || end < begin) {
    throw invalid(
      ERR.E012,
      'control/PROJECT_STATE.md 缺少 AUTO 标记（<!-- BEGIN AUTO --> / <!-- END AUTO -->）',
    );
  }
  const out = [...lines.slice(0, begin + 1), '', ...contentLines, '', ...lines.slice(end)];
  let text = out.join('\n');
  if (!text.endsWith('\n')) text += '\n';
  return text;
}

/** 重新生成 AUTO 区块 + MODULE_REGISTER，并排序 ledger（幂等） */
export function internalReport(root, state, ledger) {
  const mdPath = path.join(root, 'control', 'PROJECT_STATE.md');
  if (!isFile(mdPath)) {
    throw invalid(ERR.E002, '缺少 control/PROJECT_STATE.md（可运行 dag init --force 补建）');
  }
  const markdown = fs.readFileSync(mdPath, 'utf8');
  writeFileAtomic(mdPath, replaceAutoBlock(markdown, buildAutoLines(root, state, ledger)));
  writeFileAtomic(
    path.join(root, 'control', 'MODULE_REGISTER.md'),
    buildModuleRegister(state, ledger),
  );
  saveLedger(root, ledger);
}

// ---------------------------------------------------------------------------
// 视图层 2：status / list
// ---------------------------------------------------------------------------

export function buildStatusPayload(root, state, ledger) {
  const pendingDecisions = (ledger.handoffs || [])
    .filter((h) => h && h.status === 'PROVISIONAL')
    .sort((a, b) => cmpStr(a.path, b.path))
    .map((h) => ({
      path: h.path,
      stream: h.stream,
      version: h.version,
      questions: questionForHandoff(root, h),
    }));
  const accepted = (ledger.handoffs || [])
    .filter((h) => h && h.status === 'ACCEPTED')
    .sort((a, b) => cmpStr(a.stream, b.stream) || cmpStr(a.path, b.path))
    .map((h) => ({ stream: h.stream, path: h.path, version: h.version }));
  const modules = (Array.isArray(state.modules) ? state.modules : [])
    .slice()
    .sort((a, b) => cmpStr(a && a.id, b && b.id))
    .map((mod) => {
      const counts = {
        draft: 0,
        provisional: 0,
        accepted: 0,
        rejected: 0,
        superseded: 0,
        blocked: 0,
      };
      for (const h of ledger.handoffs || []) {
        if (!h || h.module !== mod.id) continue;
        const key = STATUS_COUNT_KEY[h.status];
        if (key) counts[key] += 1;
      }
      return {
        id: mod.id,
        name: mod.name,
        branches: (state.branches || []).filter((b) => b && b.module === mod.id).length,
        counts,
      };
    });
  return {
    ok: true,
    project: {
      id: state.project && state.project.id,
      title: state.project && state.project.title,
    },
    phase: state.phase,
    next_steps: Array.isArray(state.next_steps) ? state.next_steps : [],
    blockers: Array.isArray(state.blockers) ? state.blockers : [],
    pending_decisions: pendingDecisions,
    accepted,
    modules,
  };
}

export function listPayload(root, filters = {}) {
  const handoffs = [];
  for (const file of scanHandoffFiles(root)) {
    const doc = parseDocument(fs.readFileSync(file.abs, 'utf8'));
    const meta = handoffMetaFromDoc(doc);
    if (filters.module && meta.module !== filters.module) continue;
    if (filters.status && meta.status !== filters.status) continue;
    handoffs.push({
      path: file.rel,
      module: meta.module,
      branch: meta.branch,
      stream: meta.stream,
      version: meta.version,
      status: meta.status,
      created_at: meta.created_at,
      submitted_at: meta.submitted_at,
    });
  }
  return { ok: true, handoffs };
}

// ---------------------------------------------------------------------------
// 视图层 3：verify（PROTOCOL §7 V01–V12）
// ---------------------------------------------------------------------------

/**
 * 全项目校验，顺序执行 V01–V12，收集全部问题（不 fail-fast）。
 * @returns {{ok:boolean, checked:{handoffs:number,modules:number,branches:number,files:number}, issues:Array<{code:string,path:string,message:string}>}}
 */
export function verifyProject(root) {
  const issues = [];
  const checked = { handoffs: 0, modules: 0, branches: 0, files: 0 };
  const add = (code, relPath, message) => issues.push({ code, path: relPath, message });
  const controlRel = (name) => `control/${name}`;
  const ctrl = path.join(root, 'control');

  // ---- V01：控制文件存在 + JSON 可解析 + schema=1 ----
  const requiredFiles = [
    ['PROJECT_STATE.json', ERR.E002],
    ['PROJECT_STATE.md', ERR.E002],
    ['MODULE_REGISTER.md', ERR.E002],
    ['DECISIONS.md', ERR.E002],
    ['ledger.json', ERR.E001],
  ];
  for (const [name, code] of requiredFiles) {
    if (!isFile(path.join(ctrl, name))) add(code, controlRel(name), '控制文件缺失');
  }

  let state = null;
  const statePath = path.join(ctrl, 'PROJECT_STATE.json');
  if (isFile(statePath)) {
    try {
      const value = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), '必须是 JSON 对象');
      } else if (value.schema !== SCHEMA_VERSION) {
        add(ERR.E015, controlRel('PROJECT_STATE.json'), `不支持的 schema：${JSON.stringify(value.schema)}`);
      } else {
        state = value;
      }
    } catch (err) {
      add(ERR.E002, controlRel('PROJECT_STATE.json'), `JSON 解析失败：${err.message}`);
    }
  }

  let ledger = null;
  const ledgerPath = path.join(ctrl, 'ledger.json');
  if (isFile(ledgerPath)) {
    try {
      const value = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        add(ERR.E010, controlRel('ledger.json'), '必须是 JSON 对象');
      } else if (value.schema !== SCHEMA_VERSION) {
        add(ERR.E015, controlRel('ledger.json'), `不支持的 schema：${JSON.stringify(value.schema)}`);
      } else if (!Array.isArray(value.handoffs)) {
        add(ERR.E010, controlRel('ledger.json'), '缺少 handoffs 数组');
      } else {
        ledger = value;
      }
    } catch (err) {
      add(ERR.E002, controlRel('ledger.json'), `JSON 解析失败：${err.message}`);
    }
  }

  const ledgerMap = new Map();
  if (ledger) {
    for (const entry of ledger.handoffs) {
      if (entry && typeof entry.path === 'string') {
        if (ledgerMap.has(entry.path)) add(ERR.E010, entry.path, '账本条目重复');
        else ledgerMap.set(entry.path, entry);
      }
    }
  }

  // ---- V02：project state 字段 ----
  if (state) {
    const project = state.project;
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), '缺少 project 对象');
    } else {
      if (typeof project.id !== 'string' || project.id.trim() === '') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'project.id 必须是非空字符串');
      }
      if (typeof project.title !== 'string' || project.title.trim() === '') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'project.title 必须是非空字符串');
      }
      if (project.goal !== undefined && project.goal !== null && typeof project.goal !== 'string') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'project.goal 必须是字符串');
      }
      if (!isDateStr(project.created_at)) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'project.created_at 必须是 YYYY-MM-DD');
      }
    }
    if (!PHASES.includes(state.phase)) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), `phase 非法：${JSON.stringify(state.phase)}`);
    }
    if (!Array.isArray(state.next_steps) || state.next_steps.some((s) => typeof s !== 'string')) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), 'next_steps 必须是字符串数组');
    }
    if (!Array.isArray(state.blockers) || state.blockers.some((s) => typeof s !== 'string')) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), 'blockers 必须是字符串数组');
    }
    if (!Array.isArray(state.modules)) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), 'modules 必须是数组');
    }
    if (!Array.isArray(state.branches)) {
      add(ERR.E012, controlRel('PROJECT_STATE.json'), 'branches 必须是数组');
    }
  }

  // ---- 磁盘扫描 ----
  const moduleDirs = scanModuleDirs(root);
  const branchDirs = [];
  for (const mod of moduleDirs) branchDirs.push(...scanBranchDirs(mod));
  const handoffFiles = scanHandoffFiles(root);
  checked.modules = moduleDirs.length;
  checked.branches = branchDirs.length;

  for (const branch of branchDirs) {
    if (!isFile(path.join(branch.abs, 'BRIEF.md'))) {
      add(ERR.E002, `${branch.rel}/BRIEF.md`, '分支缺少 BRIEF.md');
    } else {
      try {
        const brief = fs.readFileSync(path.join(branch.abs, 'BRIEF.md'), 'utf8');
        for (const err of analyzeBrief(brief).errors) add(err.code, `${branch.rel}/BRIEF.md`, err.message);
      } catch (err) {
        add(ERR.E002, `${branch.rel}/BRIEF.md`, `读取失败：${err.message}`);
      }
    }
  }

  // ---- V03：modules[] 与磁盘一一对应 ----
  if (state && Array.isArray(state.modules)) {
    const seenIds = new Set();
    const seenDirs = new Set();
    for (const mod of state.modules) {
      if (!mod || typeof mod !== 'object') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'modules[] 条目必须是对象');
        continue;
      }
      if (typeof mod.id !== 'string' || !ID_RE.test(mod.id)) {
        add(ERR.E002, controlRel('PROJECT_STATE.json'), `模块 id 非法：${JSON.stringify(mod.id)}`);
      } else if (seenIds.has(mod.id)) {
        add(ERR.E007, controlRel('PROJECT_STATE.json'), `模块 id 重复：${mod.id}`);
      } else {
        seenIds.add(mod.id);
      }
      if (typeof mod.name !== 'string' || mod.name.trim() === '') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块 ${mod.id} 的 name 非法`);
      } else if (Array.from(mod.name).length > NAME_MAX_CHARS) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块 ${mod.id} 的 name 超过 ${NAME_MAX_CHARS} 字`);
      }
      if (!isDateStr(mod.created_at)) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块 ${mod.id} 的 created_at 非法`);
      }
      if (typeof mod.dir !== 'string' || !normalizeDirRel(mod.dir).startsWith('modules/')) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块 ${mod.id} 的 dir 非法：${JSON.stringify(mod.dir)}`);
        continue;
      }
      const dirRel = normalizeDirRel(mod.dir);
      if (dirRel.split('/').includes('..')) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块 ${mod.id} 的 dir 含 .. 逃逸：${dirRel}`);
        continue;
      }
      if (seenDirs.has(dirRel)) {
        add(ERR.E007, controlRel('PROJECT_STATE.json'), `模块目录重复登记：${dirRel}`);
        continue;
      }
      seenDirs.add(dirRel);
      const abs = path.join(root, ...dirRel.split('/'));
      if (!isDir(abs)) add(ERR.E012, controlRel('PROJECT_STATE.json'), `模块目录不存在：${dirRel}`);
      else if (!isFile(path.join(abs, 'MODULE.md'))) add(ERR.E002, `${dirRel}/MODULE.md`, '模块缺少 MODULE.md');
    }
    for (const mod of moduleDirs) {
      if (!seenDirs.has(mod.rel)) {
        add(ERR.E012, mod.rel, '磁盘模块目录未在 PROJECT_STATE.json 的 modules[] 中登记');
      }
    }
  }

  // ---- V04：branches[] 与磁盘一一对应 ----
  if (state && Array.isArray(state.branches)) {
    const seenIds = new Set();
    const seenDirs = new Set();
    const moduleById = new Map(
      (Array.isArray(state.modules) ? state.modules : []).map((m) => [m && m.id, m]),
    );
    for (const branch of state.branches) {
      if (!branch || typeof branch !== 'object') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), 'branches[] 条目必须是对象');
        continue;
      }
      if (typeof branch.id !== 'string' || !ID_RE.test(branch.id)) {
        add(ERR.E002, controlRel('PROJECT_STATE.json'), `分支 id 非法：${JSON.stringify(branch.id)}`);
      } else if (seenIds.has(branch.id)) {
        add(ERR.E007, controlRel('PROJECT_STATE.json'), `分支 id 重复：${branch.id}`);
      } else {
        seenIds.add(branch.id);
      }
      if (typeof branch.name !== 'string' || branch.name.trim() === '') {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 的 name 非法`);
      } else if (Array.from(branch.name).length > NAME_MAX_CHARS) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 的 name 超过 ${NAME_MAX_CHARS} 字`);
      }
      if (!isDateStr(branch.created_at)) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 的 created_at 非法`);
      }
      const module = moduleById.get(branch.module);
      if (!module) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 引用了不存在的模块：${branch.module}`);
      }
      if (typeof branch.dir !== 'string' || !normalizeDirRel(branch.dir).startsWith('modules/')) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 的 dir 非法`);
        continue;
      }
      const dirRel = normalizeDirRel(branch.dir);
      if (dirRel.split('/').includes('..')) {
        add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支 ${branch.id} 的 dir 含 .. 逃逸：${dirRel}`);
        continue;
      }
      if (module) {
        const moduleDirRel = normalizeDirRel(module.dir);
        if (!dirRel.startsWith(`${moduleDirRel}/branches/`)) {
          add(
            ERR.E012,
            controlRel('PROJECT_STATE.json'),
            `分支 ${branch.id} 的 dir 不在模块 ${branch.module} 的 branches/ 下：${dirRel}`,
          );
        }
      }
      if (seenDirs.has(dirRel)) {
        add(ERR.E007, controlRel('PROJECT_STATE.json'), `分支目录重复登记：${dirRel}`);
        continue;
      }
      seenDirs.add(dirRel);
      const abs = path.join(root, ...dirRel.split('/'));
      if (!isDir(abs)) add(ERR.E012, controlRel('PROJECT_STATE.json'), `分支目录不存在：${dirRel}`);
      else if (!isFile(path.join(abs, 'BRIEF.md'))) add(ERR.E002, `${dirRel}/BRIEF.md`, '分支缺少 BRIEF.md');
    }
    for (const branch of branchDirs) {
      if (!seenDirs.has(branch.rel)) {
        add(ERR.E012, branch.rel, '磁盘分支目录未在 PROJECT_STATE.json 的 branches[] 中登记');
      }
    }
  }

  // ---- V05：handoff 文件名 / frontmatter / 路径一致性 ----
  const recByRel = new Map();
  for (const file of handoffFiles) {
    checked.handoffs += 1;
    let doc;
    try {
      doc = parseDocument(fs.readFileSync(file.abs, 'utf8'));
    } catch (err) {
      add(err.code || ERR.E002, file.rel, err.message);
      continue;
    }
    const meta = handoffMetaFromDoc(doc);
    if (!parseHandoffFilename(file.fileName)) {
      add(ERR.E002, file.rel, '文件名必须以 HANDOFF- 开头、以 -v<N>.md 结尾');
    }
    for (const issue of collectHandoffIdentityIssues(
      { rel: file.rel, fileName: file.fileName, meta },
      state,
    )) {
      add(issue.code, file.rel, issue.message);
    }
    const { sections, errors } = analyzeHandoffBody(doc.bodyLines);
    for (const err of errors) add(err.code, file.rel, err.message);
    let manifest = { rows: [], errors: [], hasTable: false };
    const section8 = sections.get(8);
    if (section8) manifest = parseManifestTable(section8.contentLines);
    for (const err of manifest.errors) add(err.code, file.rel, err.message);
    checked.files += manifest.rows.length;
    recByRel.set(file.rel, { ...file, doc, meta, sections, manifest });
  }

  // ---- V06：唯一性 / 同 stream 至多一个 ACCEPTED / ACCEPTED 哈希与账本一致 ----
  const streamVersionSeen = new Map();
  for (const rec of recByRel.values()) {
    const { stream, version } = rec.meta;
    if (!stream || !version) continue;
    const key = `${stream}\u0000${version}`;
    if (streamVersionSeen.has(key)) {
      add(ERR.E007, rec.rel, `重复的 (stream, version)：${stream} v${version}`);
    } else {
      streamVersionSeen.set(key, rec.rel);
    }
  }
  const acceptedByStream = new Map();
  for (const rec of recByRel.values()) {
    if (rec.meta.status !== 'ACCEPTED') continue;
    if (!acceptedByStream.has(rec.meta.stream)) acceptedByStream.set(rec.meta.stream, []);
    acceptedByStream.get(rec.meta.stream).push(rec.rel);
  }
  for (const [stream, rels] of acceptedByStream) {
    if (rels.length > 1) {
      for (const rel of rels) add(ERR.E009, rel, `同一 stream 存在多个 ACCEPTED：${stream}（${rels.length} 个）`);
    }
  }
  for (const rec of recByRel.values()) {
    if (rec.meta.status !== 'ACCEPTED') continue;
    const entry = ledgerMap.get(rec.rel);
    if (!entry) continue;
    for (const file of Array.isArray(entry.files) ? entry.files : []) {
      if (!file || typeof file.path !== 'string') continue;
      const row = rec.manifest.rows.find((r) => r.path === file.path);
      if (!row) {
        add(ERR.E005, rec.rel, `清单缺少账本中记录的文件：${file.path}`);
        continue;
      }
      if (String(row.sha).trim() !== String(file.sha256)) {
        add(ERR.E005, rec.rel, `清单哈希与账本不一致：${file.path}`);
      }
      try {
        const resolved = resolveProjectFile(root, file.path);
        if (isFile(resolved.abs)) {
          const actual = sha256File(resolved.abs);
          if (actual !== String(file.sha256)) add(ERR.E005, rec.rel, `文件实际哈希与账本不一致：${file.path}`);
        }
      } catch (err) {
        if (err instanceof DagError && err.code === ERR.E014) add(ERR.E014, rec.rel, err.message);
      }
    }
  }

  // ---- V07：正文冻结 / 待决清单未计算哈希 ----
  for (const rec of recByRel.values()) {
    const { status } = rec.meta;
    if (status && status !== 'DRAFT') {
      const entry = ledgerMap.get(rec.rel);
      const computed = hashBodyRaw(rec.doc.bodyRaw);
      if (entry) {
        if (entry.body_hash === null || entry.body_hash === undefined || entry.body_hash === '') {
          if (status !== 'BLOCKED') add(ERR.E008, rec.rel, '非 DRAFT handoff 账本缺少 body_hash');
        } else if (String(entry.body_hash) !== computed) {
          add(ERR.E008, rec.rel, '正文哈希与账本不一致（正文冻结被破坏）');
        }
      }
    }
    if (status === 'PROVISIONAL' || status === 'ACCEPTED') {
      for (const row of rec.manifest.rows) {
        if (isPendingSha(row.sha)) add(ERR.E005, rec.rel, `清单 SHA-256 未计算：${row.path}`);
      }
    }
  }

  // ---- V08：清单文件存在性 / 路径合法 / 哈希一致 ----
  for (const rec of recByRel.values()) {
    const strictFiles = rec.meta.status !== 'DRAFT';
    for (const row of rec.manifest.rows) {
      let resolved;
      try {
        resolved = resolveProjectFile(root, row.path);
      } catch (err) {
        add(err.code || ERR.E014, rec.rel, err.message);
        continue;
      }
      if (isRealSha(row.sha)) {
        try {
          const actual = sha256File(resolved.abs);
          if (actual !== row.sha.trim()) add(ERR.E005, rec.rel, `清单哈希不一致：${row.path}`);
        } catch {
          add(ERR.E004, rec.rel, `清单文件不存在：${row.path}`);
        }
      } else if (strictFiles) {
        if (!isFile(resolved.abs)) add(ERR.E004, rec.rel, `清单文件不存在：${row.path}`);
      }
    }
  }

  // ---- V09：账本与磁盘一一对应 / 状态一致 / 事件序列合法 ----
  const validateEvents = (entry, meta, rel) => {
    const events = entry.events;
    if (!Array.isArray(events) || events.length === 0) {
      add(ERR.E010, rel, '账本缺少 events');
      return;
    }
    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i] || {};
      if (i === 0) {
        if (ev.action !== 'CREATE' || ev.from !== null || ev.to !== 'DRAFT') {
          add(ERR.E010, rel, '首个事件必须是 CREATE(null→DRAFT)');
        }
      } else {
        if (ev.from !== events[i - 1].to) {
          add(ERR.E010, rel, `事件链断裂：第 ${i + 1} 个事件的 from(${ev.from}) ≠ 上一事件 to(${events[i - 1].to})`);
        }
        if (!allowedTransition(ev.action, ev.from, ev.to)) {
          add(ERR.E010, rel, `非法事件：${ev.action} ${ev.from}→${ev.to}`);
        }
      }
    }
    const last = events[events.length - 1] || {};
    if (last.to !== meta.status) {
      add(ERR.E010, rel, `最后事件目标(${last.to})与 handoff 状态(${meta.status})不一致`);
    }
  };
  if (ledger) {
    const ledgerPaths = new Set();
    for (const entry of ledger.handoffs) {
      if (!entry || typeof entry !== 'object') {
        add(ERR.E010, controlRel('ledger.json'), '账本条目必须是对象');
        continue;
      }
      if (typeof entry.path !== 'string' || entry.path === '') {
        add(ERR.E010, controlRel('ledger.json'), '账本条目缺少 path');
        continue;
      }
      if (ledgerPaths.has(entry.path)) add(ERR.E010, entry.path, '账本条目重复');
      ledgerPaths.add(entry.path);
      const rec = recByRel.get(entry.path);
      if (!rec) {
        add(ERR.E010, entry.path, '账本条目对应的 handoff 文件不存在');
        continue;
      }
      if (!STATUSES.includes(entry.status)) add(ERR.E010, entry.path, `账本 status 非法：${entry.status}`);
      else if (entry.status !== rec.meta.status) {
        add(ERR.E010, entry.path, `账本状态(${entry.status})与 handoff 状态(${rec.meta.status})不一致`);
      }
      if (entry.version !== rec.meta.version) add(ERR.E010, entry.path, '账本 version 与 handoff 不一致');
      if (entry.stream !== rec.meta.stream) add(ERR.E010, entry.path, '账本 stream 与 handoff 不一致');
      if (entry.module !== undefined && rec.meta.module !== undefined && entry.module !== rec.meta.module) {
        add(ERR.E010, entry.path, '账本 module 与 handoff 不一致');
      }
      if (entry.branch !== undefined && rec.meta.branch !== undefined && entry.branch !== rec.meta.branch) {
        add(ERR.E010, entry.path, '账本 branch 与 handoff 不一致');
      }
      validateEvents(entry, rec.meta, entry.path);
    }
    for (const rec of recByRel.values()) {
      if (!ledgerPaths.has(rec.rel)) add(ERR.E010, rec.rel, '账本缺少该 handoff 条目');
    }
  }

  // ---- V10：状态与 DECISIONS 对应 ----
  let decisions = [];
  const decisionsPath = path.join(ctrl, 'DECISIONS.md');
  if (isFile(decisionsPath)) {
    try {
      const parsed = parseDecisions(fs.readFileSync(decisionsPath, 'utf8'));
      decisions = parsed.decisions;
      for (const err of parsed.errors) add(err.code, controlRel('DECISIONS.md'), err.message);
    } catch (err) {
      add(ERR.E002, controlRel('DECISIONS.md'), `读取失败：${err.message}`);
    }
  }
  const seenDecisionIds = new Set();
  const decisionObjectRels = new Set();
  for (const decision of decisions) {
    if (seenDecisionIds.has(decision.id)) {
      add(ERR.E007, controlRel('DECISIONS.md'), `决策编号重复：D-${decision.id}`);
    }
    seenDecisionIds.add(decision.id);
    if (!DECISION_ACTIONS.includes(decision.action)) {
      add(ERR.E013, controlRel('DECISIONS.md'), `决策 D-${decision.id} 的动作非法：${decision.action}`);
    }
    if (decision.status && !STATUSES.includes(decision.status)) {
      add(ERR.E013, controlRel('DECISIONS.md'), `决策 D-${decision.id} 的状态非法：${decision.status}`);
    }
    if (decision.object) {
      try {
        const rel = normalizeManifestPath(decision.object);
        decisionObjectRels.add(rel);
        const resolved = resolveProjectFile(root, rel);
        if (!isFile(resolved.abs)) {
          add(ERR.E013, controlRel('DECISIONS.md'), `决策 D-${decision.id} 的对象不存在：${rel}`);
        }
      } catch (err) {
        add(
          err instanceof DagError && err.code === ERR.E014 ? ERR.E014 : ERR.E013,
          controlRel('DECISIONS.md'),
          `决策 D-${decision.id} 的对象路径非法：${decision.object}`,
        );
      }
    }
  }
  const decisionActionsFor = (rel) =>
    decisions.filter((d) => {
      if (!d.object) return false;
      try {
        return normalizeManifestPath(d.object) === rel;
      } catch {
        return false;
      }
    });
  for (const rec of recByRel.values()) {
    const need = { ACCEPTED: 'ACCEPT', REJECTED: 'REJECT', BLOCKED: 'BLOCK' }[rec.meta.status];
    if (!need) continue;
    const matched = decisionActionsFor(rec.rel).some((d) => d.action === need);
    if (!matched) {
      add(ERR.E013, rec.rel, `${rec.meta.status} handoff 缺少 ${need} 决策条目`);
    }
    if (typeof rec.meta.decision_reason !== 'string' || rec.meta.decision_reason.trim() === '') {
      add(ERR.E011, rec.rel, `${rec.meta.status} handoff 缺少 decision_reason`);
    }
  }

  // ---- V11：SUPERSEDED 链 ----
  for (const rec of recByRel.values()) {
    if (rec.meta.status !== 'SUPERSEDED') continue;
    const target = rec.meta.superseded_by;
    if (typeof target !== 'string' || target.trim() === '') {
      add(ERR.E010, rec.rel, 'SUPERSEDED handoff 缺少 superseded_by');
      continue;
    }
    let targetRel;
    try {
      targetRel = normalizeManifestPath(target);
    } catch {
      add(ERR.E014, rec.rel, `superseded_by 路径非法：${target}`);
      continue;
    }
    const targetRec = recByRel.get(targetRel);
    if (!targetRec) {
      add(ERR.E010, rec.rel, `superseded_by 指向的 handoff 不存在：${targetRel}`);
      continue;
    }
    if (targetRec.meta.supersedes !== rec.meta.version) {
      add(
        ERR.E010,
        rec.rel,
        `superseded_by 指向的 handoff 的 supersedes(${targetRec.meta.supersedes}) ≠ 本版本(${rec.meta.version})`,
      );
    }
    if (targetRec.meta.stream !== rec.meta.stream) {
      add(ERR.E010, rec.rel, 'superseded_by 指向了不同 stream 的 handoff');
    }
  }
  const byStream = new Map();
  for (const rec of recByRel.values()) {
    if (!Number.isInteger(rec.meta.version)) continue;
    if (!byStream.has(rec.meta.stream)) byStream.set(rec.meta.stream, []);
    byStream.get(rec.meta.stream).push(rec);
  }
  for (const [stream, recs] of byStream) {
    const links = new Map();
    for (const rec of recs) {
      if (Number.isInteger(rec.meta.supersedes) && rec.meta.supersedes > 0) {
        links.set(rec.meta.version, rec.meta.supersedes);
      }
    }
    let cycleReported = false;
    for (const start of links.keys()) {
      const seen = new Set();
      let cur = start;
      while (links.has(cur)) {
        if (seen.has(cur)) {
          if (!cycleReported) {
            add(ERR.E010, recs[0].rel, `stream ${stream} 的版本链存在环`);
            cycleReported = true;
          }
          break;
        }
        seen.add(cur);
        cur = links.get(cur);
      }
    }
  }

  // ---- V12：AUTO 标记 / MODULE_REGISTER / README ----
  const stateMdPath = path.join(ctrl, 'PROJECT_STATE.md');
  if (isFile(stateMdPath)) {
    const markdown = fs.readFileSync(stateMdPath, 'utf8');
    if (!markdown.includes('<!-- BEGIN AUTO -->') || !markdown.includes('<!-- END AUTO -->')) {
      add(ERR.E012, controlRel('PROJECT_STATE.md'), '缺少 AUTO 标记（<!-- BEGIN AUTO --> / <!-- END AUTO -->）');
    }
  }
  if (!isFile(path.join(root, 'README.md'))) add(ERR.E002, 'README.md', 'README.md 缺失');

  return { ok: issues.length === 0, checked, issues };
}

/** 状态机允许的事件（账本审计用） */
export function allowedTransition(action, from, to) {
  switch (action) {
    case 'CREATE':
      return from === null && to === 'DRAFT';
    case 'SUBMIT':
      return from === 'DRAFT' && to === 'PROVISIONAL';
    case 'ACCEPT':
      return from === 'PROVISIONAL' && to === 'ACCEPTED';
    case 'REJECT':
      return from === 'PROVISIONAL' && to === 'REJECTED';
    case 'BLOCK':
      return (from === 'DRAFT' || from === 'PROVISIONAL') && to === 'BLOCKED';
    case 'UNBLOCK':
      return from === 'BLOCKED' && (to === 'DRAFT' || to === 'PROVISIONAL');
    case 'SUPERSEDE':
      return from === 'ACCEPTED' && to === 'SUPERSEDED';
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 命令层：通用辅助
// ---------------------------------------------------------------------------

const PROJECT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function requireFlag(flags, name, message) {
  const value = flags[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw usageError(message || `缺少参数 --${name}`);
  }
  return String(value);
}

/** 校验统一节点 id（PROTOCOL v1.2 §2：module/branch 共用规则，不得以 . 或 - 结尾）。 */
function assertNodeId(id, label) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw usageError(
      `${label} id 非法（必须匹配 ^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_])?$，且不得以 . 或 - 结尾）：${String(id)}`,
    );
  }
}

/** 校验显示名：任意语言，按 Unicode 码点计 ≤80。 */
function assertDisplayName(name, label) {
  const value = String(name ?? '').trim();
  const length = Array.from(value).length;
  if (length === 0) throw usageError(`${label} name 不能为空`);
  if (length > NAME_MAX_CHARS) {
    throw usageError(`${label} name 不能超过 ${NAME_MAX_CHARS} 字（当前 ${length}）`);
  }
  return value;
}

/** 解析可选 `--slug`（目录后缀）：空串 = 不追加；否则 [A-Za-z0-9._-]{0,40}。 */
function optionalDirSlug(flags) {
  if (flags.slug === undefined || flags.slug === null) return '';
  const slug = String(flags.slug).trim();
  if (slug === '') return '';
  if (!DIR_SLUG_RE.test(slug)) {
    throw usageError(`slug 非法（必须匹配 [A-Za-z0-9._-]{0,40}）：${slug}`);
  }
  return slug;
}

/** handoff new 缺省 stream：分支 id 小写化并归一化为 [a-z0-9-]，空则用 stream。 */
export function defaultStreamForBranch(branchId) {
  const normalized = String(branchId ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'stream';
}

function fileNameFromRel(rel) {
  const parts = String(rel).split('/');
  return parts[parts.length - 1];
}

function branchNameOf(state, branchId) {
  const branch = (state.branches || []).find((b) => b && b.id === branchId);
  return branch ? branch.name : branchId;
}

/** 读取 handoff（用户参数路径），并做基本目录形态校验 */
function loadHandoffRecord(root, arg, ctx) {
  const target = resolveUserHandoffPath(root, ctx.cwd, arg);
  if (!target.exists) throw invalid(ERR.E002, `handoff 不存在：${arg}`);
  if (!/^modules\/[^/]+\/handoffs\/[^/]+\.md$/.test(target.rel)) {
    throw invalid(ERR.E002, `不是模块 handoffs 目录下的 handoff 文件：${target.rel}`);
  }
  const text = readTextFile(target.abs, target.rel);
  const doc = parseDocument(text);
  return { rel: target.rel, abs: target.abs, text, doc, meta: handoffMetaFromDoc(doc) };
}

function loadHandoffByRel(root, rel) {
  const normalized = normalizeManifestPath(rel);
  const abs = path.join(root, ...normalized.split('/'));
  if (!isFile(abs)) throw invalid(ERR.E002, `handoff 不存在：${normalized}`);
  const text = readTextFile(abs, normalized);
  const doc = parseDocument(text);
  return { rel: normalized, abs, text, doc, meta: handoffMetaFromDoc(doc) };
}

function assertHandoffIdentity(rec, state) {
  const issues = collectHandoffIdentityIssues(
    {
      rel: rec.rel,
      fileName: fileNameFromRel(rec.rel),
      meta: rec.meta,
    },
    state,
  );
  if (issues.length > 0) {
    throw new DagError(issues[0].code, issues.map((i) => i.message).join('；'));
  }
}

function requireReason(flags, command) {
  const reason = flags.reason;
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new DagError(ERR.E011, `${command} 需要非空 --reason <text>`, EXIT.INVALID);
  }
  return reason.replace(/\r?\n/g, ' ').trim();
}

function templateModuleMarkdown(id, name) {
  return [
    `# ${id} · ${name}`,
    '',
    '## 职责',
    '（待补充）',
    '',
    '## 输入',
    '（待补充）',
    '',
    '## 输出',
    '（待补充）',
    '',
  ].join('\n');
}

/** PROTOCOL §4 BRIEF 骨架（6 节，非空，保证 branch new 后 verify 通过） */
function templateBriefMarkdown(id, name) {
  return [
    `# ${id} · ${name}`,
    '',
    '## 要解决的问题',
    '一句话说明本分支要回答的问题。',
    '',
    '## 输入',
    '- 上游 handoff / artifact / 数据文件路径与版本',
    '',
    '## 允许修改',
    '- 只能改哪些文件/目录',
    '',
    '## 禁止修改',
    '- 不得改哪些文件（例如已 ACCEPTED 的 handoff、数据原始版本）',
    '',
    '## 完成标准',
    '- 可检查的验收条件',
    '',
    '## 必须交付',
    '- handoff 路径（由 handoff new 生成）',
    '- 本分支 outputs/ 下的文件清单',
    '',
  ].join('\n');
}

/** handoff 正文 8 节骨架 + 文件清单表头 */
export function handoffBodyTemplate() {
  const lines = [];
  for (const { n, title } of HANDOFF_SECTIONS) {
    lines.push('', `## ${n}. ${title}`);
    if (n === 8) {
      lines.push('', '| 文件 | SHA-256 | 说明 |', '| --- | --- | --- |');
    }
  }
  return `${lines.join('\n')}\n`;
}

function templateProjectStateMarkdown(title, goal) {
  const goalText = goal && goal.trim() ? goal.trim() : '（主项目手工维护）';
  return [
    `# 项目状态 — ${title}`,
    '',
    '## 研究总目标',
    goalText,
    '',
    '<!-- BEGIN AUTO -->',
    '<!-- END AUTO -->',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 命令层 1：init / module add / branch new / handoff new
// ---------------------------------------------------------------------------

export function cmdInit(args, ctx) {
  const flags = args.flags;
  const dir = args.positional[0];
  if (!dir) throw usageError('init 需要 <dir> 参数');
  const id = requireFlag(flags, 'id', 'init 需要 --id');
  const title = requireFlag(flags, 'title', 'init 需要 --title');
  if (!PROJECT_ID_RE.test(id)) throw usageError(`项目 id 非法（建议 [A-Za-z0-9._-]）：${id}`);
  const goal = flags.goal === undefined ? '' : String(flags.goal);
  const force = Boolean(flags.force);
  const root = path.resolve(ctx.cwd, dir);
  const exists = isDir(root);
  const alreadyProject = isProjectRoot(root);

  if (alreadyProject && !force) {
    throw new DagError(
      ERR.E002,
      `目录已是研究项目：${root}（如需补缺失文件请加 --force）`,
      EXIT.USAGE,
    );
  }
  if (!exists) {
    ensureDir(root);
  } else if (!alreadyProject && !force && listNames(root).length > 0) {
    throw usageError(`目标目录非空：${root}（如确认在此建项目请加 --force）`);
  }

  const today = todayLocal();
  ensureDir(path.join(root, 'control'));
  ensureDir(path.join(root, 'modules'));
  ensureDir(path.join(root, 'releases'));

  const writeIfMissing = (relPath, content) => {
    const abs = path.join(root, ...relPath.split('/'));
    if (!fs.existsSync(abs)) writeFileAtomic(abs, content);
  };

  const state = {
    schema: SCHEMA_VERSION,
    project: { id, title, goal, created_at: today },
    phase: 'planning',
    next_steps: [],
    blockers: [],
    modules: [],
    branches: [],
  };
  writeIfMissing('control/PROJECT_STATE.json', `${JSON.stringify(state, null, 2)}\n`);
  writeIfMissing('control/PROJECT_STATE.md', templateProjectStateMarkdown(title, goal));
  writeIfMissing(
    'control/MODULE_REGISTER.md',
    '# 模块注册表\n\n| 模块 | 名称 | 分支数 | 已接受 | 待决定 | 最新活动 |\n|---|---|---|---|---|---|\n',
  );
  writeIfMissing('control/DECISIONS.md', '# 决策日志\n');
  writeIfMissing(
    'control/ledger.json',
    `${JSON.stringify({ schema: SCHEMA_VERSION, handoffs: [] }, null, 2)}\n`,
  );
  writeIfMissing(
    'README.md',
    `# ${title}\n\n${goal && goal.trim() ? goal.trim() : '（项目目标待补充）'}\n\n> 由 research-dag 协议管理：\`node control/dag.mjs status\`。\n`,
  );

  // 复制工具自身到 <root>/control/dag.mjs（项目自包含）
  const destScript = path.join(root, 'control', 'dag.mjs');
  if (path.resolve(destScript) !== path.resolve(SCRIPT_FILE) && !fs.existsSync(destScript)) {
    try {
      fs.copyFileSync(SCRIPT_FILE, destScript);
    } catch (err) {
      throw ioError(`复制 control/dag.mjs 失败：${err.message}`);
    }
  }

  if (!alreadyProject) {
    internalReport(root, loadProjectState(root), loadLedger(root));
  }

  return {
    json: { ok: true, root: toPosix(root), project: { id, title } },
    human: `项目已初始化：${toPosix(root)}（id=${id}）`,
  };
}

export function cmdModuleAdd(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  const id = requireFlag(flags, 'id', 'module add 需要 --id');
  const rawName = requireFlag(flags, 'name', 'module add 需要 --name');
  assertNodeId(id, '模块');
  const name = assertDisplayName(rawName, '模块');
  const slug = optionalDirSlug(flags);
  const { state } = loadProject(root);
  if ((state.modules || []).some((m) => m && m.id === id)) {
    throw invalid(ERR.E007, `模块已存在：${id}`);
  }
  const dirName = slug ? `${id}-${slug}` : id;
  const relDir = `modules/${dirName}`;
  const absDir = path.join(root, 'modules', dirName);
  if (fs.existsSync(absDir)) throw invalid(ERR.E007, `模块目录已存在：${relDir}`);
  ensureDir(path.join(absDir, 'branches'));
  ensureDir(path.join(absDir, 'handoffs'));
  writeFileAtomic(path.join(absDir, 'MODULE.md'), templateModuleMarkdown(id, name));
  state.modules.push({ id, dir: relDir, name, created_at: todayLocal() });
  saveProjectState(root, state);
  return {
    json: { ok: true, module: { id, dir: relDir, name } },
    human: `已添加模块 ${id}：${relDir}`,
  };
}

export function cmdBranchNew(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  const moduleId = requireFlag(flags, 'module', 'branch new 需要 --module');
  const id = requireFlag(flags, 'id', 'branch new 需要 --id');
  const rawName = requireFlag(flags, 'name', 'branch new 需要 --name');
  assertNodeId(id, '分支');
  const name = assertDisplayName(rawName, '分支');
  const slug = optionalDirSlug(flags);
  const { state } = loadProject(root);
  const module = (state.modules || []).find((m) => m && m.id === moduleId);
  if (!module) throw usageError(`模块不存在：${moduleId}（先运行 module add）`);
  // branch 与 module 分属不同 namespace：允许与某个模块 id 同名，但分支 id 在项目内唯一。
  if ((state.branches || []).some((b) => b && b.id === id)) {
    throw invalid(ERR.E007, `分支已存在：${id}`);
  }
  const dirName = slug ? `${id}-${slug}` : id;
  const relDir = `${normalizeDirRel(module.dir)}/branches/${dirName}`;
  const absDir = path.join(root, ...relDir.split('/'));
  if (fs.existsSync(absDir)) throw invalid(ERR.E007, `分支目录已存在：${relDir}`);
  ensureDir(path.join(absDir, 'work'));
  ensureDir(path.join(absDir, 'outputs'));
  writeFileAtomic(path.join(absDir, 'BRIEF.md'), templateBriefMarkdown(id, name));
  state.branches.push({ id, module: moduleId, dir: relDir, name, created_at: todayLocal() });
  saveProjectState(root, state);
  return {
    json: { ok: true, branch: { id, module: moduleId, dir: relDir, name } },
    human: `已添加分支 ${id}：${relDir}`,
  };
}

export function cmdHandoffNew(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  const branchId = requireFlag(flags, 'branch', 'handoff new 需要 --branch');
  const { state, ledger } = loadProject(root);
  const branch = (state.branches || []).find((b) => b && b.id === branchId);
  if (!branch) throw usageError(`分支不存在：${branchId}（先运行 branch new）`);
  const module = (state.modules || []).find((m) => m && m.id === branch.module);
  if (!module) throw invalid(ERR.E012, `分支 ${branchId} 的模块 ${branch.module} 未注册`);
  const stream = flags.stream === undefined ? defaultStreamForBranch(branchId) : String(flags.stream);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(stream)) {
    throw usageError(`stream 必须匹配 [a-z0-9][a-z0-9-]*：${stream}`);
  }
  // --slug 覆盖文件名 label（自由字母/数字/._-；缺省 label = 分支 id 原样）。
  let label = branchId;
  if (flags.slug !== undefined) {
    label = String(flags.slug).trim();
    if (!HANDOFF_LABEL_RE.test(label)) {
      throw usageError(`SLUG 必须匹配 [A-Za-z0-9._-]{1,80}：${label}`);
    }
  }

  // 版本 = 该 stream 现有最大版本 + 1（磁盘 + 账本双重扫描）
  let maxVersion = 0;
  for (const entry of ledger.handoffs || []) {
    if (entry && entry.stream === stream && Number.isInteger(entry.version)) {
      maxVersion = Math.max(maxVersion, entry.version);
    }
  }
  for (const file of scanHandoffFiles(root)) {
    try {
      const doc = parseDocument(fs.readFileSync(file.abs, 'utf8'));
      const meta = handoffMetaFromDoc(doc);
      if (meta.stream === stream && Number.isInteger(meta.version)) {
        maxVersion = Math.max(maxVersion, meta.version);
      }
    } catch {
      /* verify 会报告解析错误 */
    }
  }
  const version = maxVersion + 1;
  const fileName = `HANDOFF-${label}-v${version}.md`;
  const relPath = `${normalizeDirRel(module.dir)}/handoffs/${fileName}`;
  const absPath = path.join(root, ...relPath.split('/'));
  if (fs.existsSync(absPath)) throw invalid(ERR.E007, `handoff 已存在：${relPath}`);

  const entries = [
    { key: 'project', value: state.project.id },
    { key: 'module', value: module.id },
    { key: 'branch', value: branchId },
    { key: 'stream', value: stream },
    { key: 'version', value: String(version) },
    { key: 'status', value: 'DRAFT' },
    { key: 'baseline', value: null },
    { key: 'created_at', value: todayLocal() },
    { key: 'submitted_at', value: null },
    { key: 'decided_at', value: null },
    { key: 'decision_reason', value: null },
    { key: 'supersedes', value: '0' },
    { key: 'superseded_by', value: null },
  ];
  writeFileAtomic(absPath, serializeDocument(entries, handoffBodyTemplate()));
  const meta = {
    project: state.project.id,
    module: module.id,
    branch: branchId,
    stream,
    version,
  };
  ledger.handoffs.push(makeLedgerEntry(meta, relPath, nowIso(), branchId));
  saveLedger(root, ledger);
  return {
    json: {
      ok: true,
      handoff: { path: relPath, module: module.id, branch: branchId, stream, version, status: 'DRAFT' },
    },
    human: `已创建 handoff：${relPath}（DRAFT v${version}）`,
  };
}

// ---------------------------------------------------------------------------
// 命令层 2：submit / accept / reject / block / unblock
// ---------------------------------------------------------------------------

export function cmdSubmit(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('submit 需要 <handoff> 参数');
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const entry = findLedgerEntry(ledger, rec.rel);
  if (!entry) throw invalid(ERR.E010, `账本缺少 handoff 条目：${rec.rel}`);
  assertHandoffIdentity(rec, state);
  if (!STATUSES.includes(rec.meta.status)) throw invalid(ERR.E002, `status 非法：${rec.meta.status}`);
  if (rec.meta.status !== 'DRAFT') {
    throw invalid(ERR.E006, `非法状态转移：${rec.meta.status} 不能 submit（仅 DRAFT）`);
  }
  const by = args.flags.by === undefined ? rec.meta.branch : String(args.flags.by);

  // 8 节完整性
  const { sections, errors } = analyzeHandoffBody(rec.doc.bodyLines);
  const sectionIssues = errors.slice();
  for (let n = 1; n <= 7; n += 1) {
    const sec = sections.get(n);
    if (sec && !hasMeaningfulContent(sec.contentLines)) {
      sectionIssues.push({ code: ERR.E003, message: `第 ${n} 节内容为空（submit 要求填写）` });
    }
  }
  const section8 = sections.get(8);
  const manifest = section8
    ? parseManifestTable(section8.contentLines)
    : { rows: [], errors: [{ code: ERR.E003, message: '缺少第 8 节「文件清单」' }], hasTable: false };
  sectionIssues.push(...manifest.errors);
  if (manifest.rows.length === 0) {
    sectionIssues.push({ code: ERR.E003, message: '第 8 节文件清单为空（至少需要一个文件行）' });
  }
  if (sectionIssues.length > 0) {
    throw new DagError(
      sectionIssues[0].code,
      sectionIssues.map((i) => i.message).join('；'),
      EXIT.INVALID,
    );
  }

  // 重算清单哈希（先全部校验，再落盘）
  const files = [];
  for (const row of manifest.rows) {
    const resolved = resolveProjectFile(root, row.path, { mustExist: true });
    files.push({ path: resolved.rel, sha256: sha256File(resolved.abs), note: row.note, lineIndex: row.lineIndex });
  }
  const bodyLines = rec.doc.bodyLines.map((line) => line.replace(/\r$/, ''));
  for (const file of files) {
    bodyLines[section8.contentStart + file.lineIndex] = formatManifestRow(
      file.path,
      file.sha256,
      file.note,
    );
  }
  let newBody = bodyLines.join('\n');
  if (!newBody.endsWith('\n')) newBody += '\n';

  const entries = rec.doc.entries;
  fmSet(entries, 'status', 'PROVISIONAL');
  fmSet(entries, 'submitted_at', todayLocal());
  fmSet(entries, 'decided_at', null);
  fmSet(entries, 'decision_reason', null);
  writeFileAtomic(rec.abs, serializeDocument(entries, newBody));

  const bodyHash = hashBodyRaw(newBody);
  const at = nowIso();
  entry.status = 'PROVISIONAL';
  entry.body_hash = bodyHash;
  entry.submitted_at = at;
  entry.files = files.map((f) => ({ path: f.path, sha256: f.sha256 }));
  entry.events.push({ at, action: 'SUBMIT', by, from: 'DRAFT', to: 'PROVISIONAL' });
  saveLedger(root, ledger);
  return {
    json: {
      ok: true,
      handoff: { path: rec.rel, status: 'PROVISIONAL', body_hash: bodyHash, files: files.map((f) => f.path) },
    },
    human: `已提交：${rec.rel}（DRAFT → PROVISIONAL，${files.length} 个文件）`,
  };
}

// ---------------------------------------------------------------------------
// 命令层 2b：accept 的校验/落盘拆分（手动 accept 与 dag auto 共用同一路径）
// ---------------------------------------------------------------------------

const AUTO_ACCEPT_REASON = '自动通过：verify 全绿';

/**
 * accept 的严格前置校验（只读，不落盘）：正文冻结、清单哈希、8 节、同 stream 决策前置。
 * @returns {{entry:object, oldAccepted:object|null}}
 */
function prepareAccept(root, state, ledger, rec) {
  const entry = findLedgerEntry(ledger, rec.rel);
  if (!entry) throw invalid(ERR.E010, `账本缺少 handoff 条目：${rec.rel}`);
  assertHandoffIdentity(rec, state);
  if (rec.meta.status !== 'PROVISIONAL') {
    throw invalid(ERR.E006, `非法状态转移：${rec.meta.status} 不能 accept（仅 PROVISIONAL）`);
  }

  // 正文冻结校验
  const computed = hashBodyRaw(rec.doc.bodyRaw);
  if (!entry.body_hash) throw invalid(ERR.E008, '账本缺少 body_hash，无法确认正文冻结');
  if (String(entry.body_hash) !== computed) {
    throw invalid(ERR.E008, '正文哈希与账本不一致（正文冻结被破坏）');
  }
  // 清单哈希校验（清单 vs 账本 vs 实际文件）
  const { sections, errors } = analyzeHandoffBody(rec.doc.bodyLines);
  if (errors.length > 0) throw new DagError(errors[0].code, errors.map((e) => e.message).join('；'));
  const manifest = parseManifestTable(sections.get(8).contentLines);
  if (manifest.errors.length > 0) {
    throw new DagError(manifest.errors[0].code, manifest.errors.map((e) => e.message).join('；'));
  }
  const ledgerFiles = Array.isArray(entry.files) ? entry.files : [];
  for (const file of ledgerFiles) {
    const row = manifest.rows.find((r) => r.path === file.path);
    if (!row) throw invalid(ERR.E005, `清单缺少账本中记录的文件：${file.path}`);
    if (!isRealSha(row.sha) || row.sha.trim() !== String(file.sha256)) {
      throw invalid(ERR.E005, `清单哈希与账本不一致：${file.path}`);
    }
    const resolved = resolveProjectFile(root, file.path, { mustExist: true });
    const actual = sha256File(resolved.abs);
    if (actual !== String(file.sha256)) {
      throw invalid(ERR.E005, `文件实际哈希与账本不一致：${file.path}`);
    }
  }

  // 同 stream 前置条件
  const siblings = (ledger.handoffs || []).filter(
    (h) => h && h.path !== rec.rel && h.stream === rec.meta.stream,
  );
  const otherProvisional = siblings.find((h) => h.status === 'PROVISIONAL');
  if (otherProvisional) {
    throw invalid(ERR.E006, `同 stream 存在其他 PROVISIONAL：${otherProvisional.path}`);
  }
  const acceptedSiblings = siblings.filter((h) => h.status === 'ACCEPTED');
  const blocking = acceptedSiblings.find((h) => Number(h.version) >= Number(rec.meta.version));
  if (blocking) {
    throw invalid(
      ERR.E006,
      `同 stream 已有版本 ${blocking.version} 被 ACCEPTED（新版本号必须更大）：${blocking.path}`,
    );
  }
  const oldAccepted =
    acceptedSiblings.sort((a, b) => Number(b.version) - Number(a.version))[0] || null;
  return { entry, oldAccepted };
}

/** 执行 accept 落盘：旧版本 SUPERSEDE + handoff frontmatter + ledger 事件 + DECISIONS。 */
function applyAccept(root, state, ledger, rec, prepared, reason, by) {
  const { entry, oldAccepted } = prepared;
  const at = nowIso();
  const today = todayLocal();

  // 旧 ACCEPTED 自动转 SUPERSEDED，回填 superseded_by
  if (oldAccepted) {
    const oldRec = loadHandoffByRel(root, oldAccepted.path);
    const oldEntries = oldRec.doc.entries;
    fmSet(oldEntries, 'status', 'SUPERSEDED');
    fmSet(oldEntries, 'superseded_by', rec.rel);
    writeFileAtomic(oldRec.abs, serializeDocument(oldEntries, oldRec.doc.bodyRaw));
    oldAccepted.status = 'SUPERSEDED';
    oldAccepted.superseded_by = rec.rel;
    oldAccepted.events.push({
      at,
      action: 'SUPERSEDE',
      by,
      from: 'ACCEPTED',
      to: 'SUPERSEDED',
      reason: `被 ${rec.rel} 取代`,
    });
  }

  const entries = rec.doc.entries;
  fmSet(entries, 'status', 'ACCEPTED');
  fmSet(entries, 'decided_at', today);
  fmSet(entries, 'decision_reason', reason);
  fmSet(entries, 'superseded_by', null);
  fmSet(entries, 'supersedes', oldAccepted ? String(oldAccepted.version) : '0');
  writeFileAtomic(rec.abs, serializeDocument(entries, rec.doc.bodyRaw));

  entry.status = 'ACCEPTED';
  entry.decided_at = at;
  entry.decision_reason = reason;
  entry.supersedes = oldAccepted ? Number(oldAccepted.version) : 0;
  entry.superseded_by = null;
  entry.events.push({
    at,
    action: 'ACCEPT',
    by,
    from: 'PROVISIONAL',
    to: 'ACCEPTED',
    reason,
  });
  const decision = appendDecision(root, {
    action: 'ACCEPT',
    objectRel: rec.rel,
    status: 'ACCEPTED',
    reason,
    branchName: branchNameOf(state, rec.meta.branch),
    version: rec.meta.version,
  });
  saveLedger(root, ledger);
  return { superseded: oldAccepted ? oldAccepted.path : null, decision };
}

export function cmdAccept(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('accept 需要 <handoff> 参数');
  const reason = requireReason(args.flags, 'accept');
  const by = args.flags.by === undefined ? 'main' : String(args.flags.by);
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const prepared = prepareAccept(root, state, ledger, rec);
  const result = applyAccept(root, state, ledger, rec, prepared, reason, by);
  return {
    json: {
      ok: true,
      handoff: {
        path: rec.rel,
        status: 'ACCEPTED',
        supersedes: prepared.oldAccepted ? Number(prepared.oldAccepted.version) : 0,
      },
      superseded: result.superseded,
      decision: { id: result.decision.id, action: 'ACCEPT', reason },
    },
    human: `已接受：${rec.rel}（PROVISIONAL → ACCEPTED${
      result.superseded ? `；${result.superseded} → SUPERSEDED` : ''
    }）`,
  };
}

// ---------------------------------------------------------------------------
// 命令层 2c：results（结果视图）/ auto（自动门控）—— PROTOCOL v1.3「结果优先」
// ---------------------------------------------------------------------------

/** 按 Unicode 码点截断，避免切坏中文。 */
function truncateChars(value, max) {
  const text = String(value ?? '');
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join('');
}

function splitTrimmedLines(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim());
}

/** 某一节的纯文本（去行首尾空白、丢空行，保留多行结构）。 */
function sectionPlainText(sections, n) {
  const section = sections instanceof Map ? sections.get(n) : null;
  if (!section) return '';
  return splitTrimmedLines(section.contentLines.join('\n')).join('\n').trim();
}

/** 文本首行（去掉列表符号），用于 question/摘要。 */
function firstLineOf(text) {
  for (const line of splitTrimmedLines(text)) {
    if (line.length > 0) return line.replace(/^[-*]\s*/, '');
  }
  return '';
}

/** 读取 handoff 的正文快照（容错；缺失/解析失败返回 null，由 verify attention 兜底）。 */
function readHandoffSnapshot(root, rel) {
  try {
    const normalized = normalizeManifestPath(String(rel));
    const file = path.join(root, ...normalized.split('/'));
    if (!isFile(file)) return null;
    const doc = parseDocument(fs.readFileSync(file, 'utf8'));
    const meta = handoffMetaFromDoc(doc);
    const { sections } = analyzeHandoffBody(doc.bodyLines);
    let files = [];
    const section8 = sections.get(8);
    if (section8) files = parseManifestTable(section8.contentLines).rows.map((row) => row.path);
    return { rel: normalized, meta, sections, files };
  } catch {
    return null;
  }
}

/** question = 第 1 节首行（≤200 字）。 */
function questionFromSections(sections, max = 200) {
  return truncateChars(firstLineOf(sectionPlainText(sections, 1)), max);
}

function sortByModuleStreamVersion(a, b) {
  return (
    cmpStr(a.module, b.module) ||
    cmpStr(a.stream, b.stream) ||
    Number(a.version) - Number(b.version)
  );
}

/**
 * `results [--json]`：按 module+stream 取最新 ACCEPTED，汇总成人看的结果视图。
 */
export function cmdResults(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const { state, ledger } = loadProject(root);
  const stateModules = (Array.isArray(state.modules) ? state.modules : [])
    .filter((module) => module && module.id !== undefined)
    .slice()
    .sort((a, b) => cmpStr(a.id, b.id));
  const moduleNameById = new Map(stateModules.map((module) => [module.id, module.name]));
  const branchById = new Map(
    (Array.isArray(state.branches) ? state.branches : [])
      .filter((branch) => branch && branch.id !== undefined)
      .map((branch) => [branch.id, branch]),
  );
  const ledgerEntries = Array.isArray(ledger.handoffs) ? ledger.handoffs : [];

  // results：ACCEPTED 按 module+stream 分组取最新版本
  const latestAccepted = new Map();
  for (const entry of ledgerEntries) {
    if (!entry || entry.status !== 'ACCEPTED' || typeof entry.path !== 'string') continue;
    const key = `${entry.module ?? ''}\u0000${entry.stream ?? ''}`;
    const previous = latestAccepted.get(key);
    const newer =
      !previous ||
      Number(entry.version) > Number(previous.version) ||
      (Number(entry.version) === Number(previous.version) &&
        String(entry.decided_at ?? '') > String(previous.decided_at ?? ''));
    if (newer) latestAccepted.set(key, entry);
  }
  const results = [...latestAccepted.values()].map((entry) => {
    const snapshot = readHandoffSnapshot(root, entry.path);
    const branchId = entry.branch ?? (snapshot && snapshot.meta.branch) ?? null;
    const branch = branchId !== null ? branchById.get(branchId) : null;
    const moduleId = entry.module ?? (snapshot && snapshot.meta.module) ?? null;
    const stream = entry.stream ?? (snapshot && snapshot.meta.stream) ?? '';
    const version = Number.isFinite(Number(entry.version))
      ? Number(entry.version)
      : (snapshot && snapshot.meta.version) ?? null;
    const sections = snapshot ? snapshot.sections : new Map();
    const branchTitle =
      branch && typeof branch.name === 'string' && branch.name.trim().length > 0
        ? branch.name.trim()
        : stream;
    return {
      module: moduleId,
      moduleName: moduleNameById.get(moduleId) ?? (moduleId !== null ? moduleId : ''),
      branch: branchId,
      stream,
      version,
      title: branchTitle,
      question: questionFromSections(sections, 200),
      keyResults: truncateChars(sectionPlainText(sections, 4), 2000),
      limitations: truncateChars(sectionPlainText(sections, 6), 1000),
      files: snapshot ? snapshot.files : [],
      path: entry.path,
      decidedAt:
        (snapshot && (snapshot.meta.decided_at ?? snapshot.meta.submitted_at)) ??
        (typeof entry.decided_at === 'string' ? entry.decided_at.slice(0, 10) : null),
    };
  });
  results.sort((a, b) => cmpStr(a.module, b.module) || cmpStr(a.stream, b.stream));

  // pending：所有 PROVISIONAL
  const pending = ledgerEntries
    .filter((entry) => entry && entry.status === 'PROVISIONAL' && typeof entry.path === 'string')
    .map((entry) => {
      const snapshot = readHandoffSnapshot(root, entry.path);
      return {
        path: entry.path,
        module: entry.module ?? (snapshot && snapshot.meta.module) ?? null,
        branch: entry.branch ?? (snapshot && snapshot.meta.branch) ?? null,
        stream: entry.stream ?? (snapshot && snapshot.meta.stream) ?? '',
        version: Number.isFinite(Number(entry.version))
          ? Number(entry.version)
          : (snapshot && snapshot.meta.version) ?? null,
        question: snapshot ? questionFromSections(snapshot.sections, 200) : '',
      };
    })
    .sort(sortByModuleStreamVersion);

  // attention：全项目 verify 的 issues（结果视图仍 ok:true，门控问题单独列出）
  const attention = verifyProject(root).issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    message: issue.message,
  }));

  const statusCount = (status) =>
    ledgerEntries.filter((entry) => entry && entry.status === status).length;
  const counts = {
    modules: stateModules.length,
    results: results.length,
    pending: pending.length,
    draft: statusCount('DRAFT'),
    blocked: statusCount('BLOCKED'),
  };
  const project = {
    id: state.project && state.project.id,
    title: state.project && state.project.title,
    phase: state.phase,
  };
  const modules = stateModules.map((module) => ({ id: module.id, name: module.name }));

  // 人类输出：按模块分组
  const groups = new Map();
  const groupFor = (moduleId, moduleName) => {
    if (!groups.has(moduleId)) {
      groups.set(moduleId, { id: moduleId, name: moduleName, results: [], pending: [] });
    }
    return groups.get(moduleId);
  };
  for (const module of stateModules) groupFor(module.id, module.name);
  for (const result of results) {
    const group = groupFor(result.module, result.moduleName);
    if (!group.name || group.name === group.id) group.name = result.moduleName;
    group.results.push(result);
  }
  for (const item of pending) {
    const group = groupFor(item.module, moduleNameById.get(item.module) ?? item.module);
    group.pending.push(item);
  }
  const lines = [];
  for (const moduleId of [...groups.keys()].sort(cmpStr)) {
    const group = groups.get(moduleId);
    if (group.results.length === 0 && group.pending.length === 0) continue;
    lines.push(
      `${group.name || group.id}：已出结果 ${group.results.length} · 待确认 ${group.pending.length}`,
    );
    for (const result of group.results) {
      const summary =
        firstLineOf(result.question) || firstLineOf(result.keyResults) || '（无摘要）';
      lines.push(`  [${result.stream} v${result.version}] ${truncateChars(summary, 120)}`);
    }
    for (const item of group.pending) {
      lines.push(
        `  待确认 [${item.stream} v${item.version}] ${truncateChars(
          firstLineOf(item.question) || '（未填写）',
          120,
        )}`,
      );
    }
  }
  if (lines.length === 0) {
    lines.push('还没有已接受结果（可运行 dag auto 自动通过校验全绿的待确认项）');
  }
  if (attention.length > 0) {
    lines.push(`需关注：${attention.length} 项校验问题（dag verify --json 查看详情）`);
  }

  return {
    json: { ok: true, project, modules, results, pending, attention, counts },
    human: lines.join('\n'),
  };
}

/**
 * `auto [--dry-run] [--json]`：遍历 PROVISIONAL，严格校验全绿且无冲突则自动 accept。
 * 跳过项只报告、不改变状态；退出码始终 0（跳过不算失败）。
 */
export function cmdAuto(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const dryRun = Boolean(args.flags['dry-run']);
  const { state, ledger } = loadProject(root);
  const provisional = (Array.isArray(ledger.handoffs) ? ledger.handoffs : [])
    .filter((entry) => entry && entry.status === 'PROVISIONAL' && typeof entry.path === 'string')
    .slice()
    .sort(sortByModuleStreamVersion);

  const accepted = [];
  const skipped = [];
  for (const entry of provisional) {
    const relPath = entry.path;
    try {
      const rec = loadHandoffByRel(root, relPath);
      const prepared = prepareAccept(root, state, ledger, rec);
      const item = {
        path: relPath,
        module: rec.meta.module,
        branch: rec.meta.branch,
        stream: rec.meta.stream,
        version: rec.meta.version,
      };
      if (!dryRun) {
        applyAccept(root, state, ledger, rec, prepared, AUTO_ACCEPT_REASON, 'auto');
      }
      accepted.push(item);
    } catch (error) {
      const code = error instanceof DagError ? error.code : ERR.E002;
      const message = error instanceof DagError
        ? error.message
        : String(error && error.message ? error.message : error);
      skipped.push({ path: relPath, code, message });
    }
  }

  // 有真实接受时刷新人类可读看板（与 report 一致；失败不影响已完成的接受）
  if (!dryRun && accepted.length > 0) {
    try {
      internalReport(root, loadProjectState(root), ledger);
    } catch {
      /* 看板刷新失败不回收已接受的交接；verify 会暴露格式问题 */
    }
  }

  const payload = { ok: true, dryRun, accepted, skipped };
  const firstLine = (text) => splitTrimmedLines(text).find((line) => line.length > 0) || '';
  const lines = [
    dryRun
      ? `预演（dry-run）：将自动通过 ${accepted.length} 条；跳过 ${skipped.length} 条`
      : `自动通过 ${accepted.length} 条；跳过 ${skipped.length} 条`,
  ];
  for (const item of skipped) {
    lines.push(`  跳过 ${item.path}：${item.code} ${truncateChars(firstLine(item.message), 160)}`);
  }
  return { json: payload, human: lines.join('\n') };
}

export function cmdReject(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('reject 需要 <handoff> 参数');
  const reason = requireReason(args.flags, 'reject');
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const entry = findLedgerEntry(ledger, rec.rel);
  if (!entry) throw invalid(ERR.E010, `账本缺少 handoff 条目：${rec.rel}`);
  assertHandoffIdentity(rec, state);
  if (rec.meta.status !== 'PROVISIONAL') {
    throw invalid(ERR.E006, `非法状态转移：${rec.meta.status} 不能 reject（仅 PROVISIONAL）`);
  }
  const by = args.flags.by === undefined ? 'main' : String(args.flags.by);
  const computed = hashBodyRaw(rec.doc.bodyRaw);
  if (entry.body_hash && String(entry.body_hash) !== computed) {
    throw invalid(ERR.E008, '正文哈希与账本不一致（正文冻结被破坏）');
  }
  const at = nowIso();
  const entries = rec.doc.entries;
  fmSet(entries, 'status', 'REJECTED');
  fmSet(entries, 'decided_at', todayLocal());
  fmSet(entries, 'decision_reason', reason);
  writeFileAtomic(rec.abs, serializeDocument(entries, rec.doc.bodyRaw));
  entry.status = 'REJECTED';
  entry.decided_at = at;
  entry.decision_reason = reason;
  entry.events.push({ at, action: 'REJECT', by, from: 'PROVISIONAL', to: 'REJECTED', reason });
  const decision = appendDecision(root, {
    action: 'REJECT',
    objectRel: rec.rel,
    status: 'REJECTED',
    reason,
    branchName: branchNameOf(state, rec.meta.branch),
    version: rec.meta.version,
  });
  saveLedger(root, ledger);
  return {
    json: { ok: true, handoff: { path: rec.rel, status: 'REJECTED' }, decision: { id: decision.id } },
    human: `已拒绝：${rec.rel}（PROVISIONAL → REJECTED）`,
  };
}

export function cmdBlock(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('block 需要 <handoff> 参数');
  const reason = requireReason(args.flags, 'block');
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const entry = findLedgerEntry(ledger, rec.rel);
  if (!entry) throw invalid(ERR.E010, `账本缺少 handoff 条目：${rec.rel}`);
  assertHandoffIdentity(rec, state);
  const from = rec.meta.status;
  if (from !== 'DRAFT' && from !== 'PROVISIONAL') {
    throw invalid(ERR.E006, `非法状态转移：${from} 不能 block（仅 DRAFT/PROVISIONAL）`);
  }
  const by = args.flags.by === undefined ? rec.meta.branch : String(args.flags.by);
  const at = nowIso();
  const entries = rec.doc.entries;
  fmSet(entries, 'status', 'BLOCKED');
  fmSet(entries, 'blocked_from', from);
  fmSet(entries, 'decision_reason', reason);
  writeFileAtomic(rec.abs, serializeDocument(entries, rec.doc.bodyRaw));
  entry.status = 'BLOCKED';
  entry.blocked_from = from;
  entry.decision_reason = reason;
  entry.events.push({ at, action: 'BLOCK', by, from, to: 'BLOCKED', reason });
  const decision = appendDecision(root, {
    action: 'BLOCK',
    objectRel: rec.rel,
    status: 'BLOCKED',
    reason,
    branchName: branchNameOf(state, rec.meta.branch),
    version: rec.meta.version,
  });
  saveLedger(root, ledger);
  return {
    json: { ok: true, handoff: { path: rec.rel, status: 'BLOCKED', blocked_from: from }, decision: { id: decision.id } },
    human: `已阻塞：${rec.rel}（${from} → BLOCKED）`,
  };
}

export function cmdUnblock(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('unblock 需要 <handoff> 参数');
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const entry = findLedgerEntry(ledger, rec.rel);
  if (!entry) throw invalid(ERR.E010, `账本缺少 handoff 条目：${rec.rel}`);
  assertHandoffIdentity(rec, state);
  if (rec.meta.status !== 'BLOCKED') {
    throw invalid(ERR.E006, `非法状态转移：${rec.meta.status} 不能 unblock（仅 BLOCKED）`);
  }
  const target = rec.meta.blocked_from;
  if (target !== 'DRAFT' && target !== 'PROVISIONAL') {
    throw invalid(ERR.E002, `BLOCKED handoff 的 blocked_from 非法：${target}`);
  }
  if (entry.body_hash) {
    const computed = hashBodyRaw(rec.doc.bodyRaw);
    if (String(entry.body_hash) !== computed) {
      throw invalid(ERR.E008, '正文哈希与账本不一致（正文冻结被破坏）');
    }
  }
  const by = args.flags.by === undefined ? rec.meta.branch : String(args.flags.by);
  const reason =
    typeof args.flags.reason === 'string' && args.flags.reason.trim() !== ''
      ? args.flags.reason.replace(/\r?\n/g, ' ').trim()
      : '';
  const at = nowIso();
  const entries = rec.doc.entries;
  fmSet(entries, 'status', target);
  fmSet(entries, 'blocked_from', null);
  fmSet(entries, 'decision_reason', null);
  writeFileAtomic(rec.abs, serializeDocument(entries, rec.doc.bodyRaw));
  entry.status = target;
  entry.blocked_from = null;
  entry.decision_reason = null;
  entry.events.push({
    at,
    action: 'UNBLOCK',
    by,
    from: 'BLOCKED',
    to: target,
    ...(reason ? { reason } : {}),
  });
  const decision = appendDecision(root, {
    action: 'UNBLOCK',
    objectRel: rec.rel,
    status: target,
    reason: reason || '（未说明）',
    branchName: branchNameOf(state, rec.meta.branch),
    version: rec.meta.version,
  });
  saveLedger(root, ledger);
  return {
    json: { ok: true, handoff: { path: rec.rel, status: target }, decision: { id: decision.id } },
    human: `已解除阻塞：${rec.rel}（BLOCKED → ${target}）`,
  };
}

// ---------------------------------------------------------------------------
// 命令层 3：status / list / check / verify / report / state set
// ---------------------------------------------------------------------------

export function cmdStatus(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const { state, ledger } = loadProject(root);
  const payload = buildStatusPayload(root, state, ledger);
  const human =
    `项目 ${payload.project.id} · 阶段 ${payload.phase} · 下一步 ${payload.next_steps.length} 项 · ` +
    `阻塞 ${payload.blockers.length} 项 · 待决定 ${payload.pending_decisions.length} 项 · ` +
    `已接受 ${payload.accepted.length} 项 · 模块 ${payload.modules.length} 个`;
  return { json: payload, human };
}

export function cmdList(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  if (flags.status !== undefined && !STATUSES.includes(String(flags.status))) {
    throw usageError(`--status 非法：${flags.status}（可选：${STATUSES.join('/')}）`);
  }
  if (flags.module !== undefined && !ID_RE.test(String(flags.module))) {
    throw usageError(
      `--module 非法（模块 id 必须匹配 ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$）：${flags.module}`,
    );
  }
  const payload = listPayload(root, { module: flags.module, status: flags.status });
  const human = payload.handoffs.length
    ? payload.handoffs
        .map(
          (h) =>
            `${h.path}  ${h.module}  ${h.branch}  ${h.stream} v${h.version}  ${h.status}  created=${h.created_at || '-'}  submitted=${h.submitted_at || '-'}`,
        )
        .join('\n')
    : '没有 handoff';
  return { json: payload, human };
}

export function cmdCheck(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  const arg = args.positional[0];
  if (!arg) throw usageError('check 需要 <handoff> 参数');
  const strict = Boolean(flags.strict);
  const { state, ledger } = loadProject(root);
  const rec = loadHandoffRecord(root, arg, ctx);
  const issues = [];
  const push = (code, message) => issues.push({ code, path: rec.rel, message });

  for (const issue of collectHandoffIdentityIssues(
    {
      rel: rec.rel,
      fileName: fileNameFromRel(rec.rel),
      meta: rec.meta,
    },
    state,
  )) {
    push(issue.code, issue.message);
  }
  const { sections, errors } = analyzeHandoffBody(rec.doc.bodyLines);
  for (const err of errors) push(err.code, err.message);
  const section8 = sections.get(8);
  const manifest = section8
    ? parseManifestTable(section8.contentLines)
    : { rows: [], errors: [{ code: ERR.E003, message: '缺少第 8 节「文件清单」' }], hasTable: false };
  for (const err of manifest.errors) push(err.code, err.message);
  if (strict && manifest.rows.length === 0) push(ERR.E003, '文件清单为空');

  const entry = findLedgerEntry(ledger, rec.rel);
  if (entry && rec.meta.status && rec.meta.status !== 'DRAFT') {
    if (!entry.body_hash) push(ERR.E008, '账本缺少 body_hash');
    else if (String(entry.body_hash) !== hashBodyRaw(rec.doc.bodyRaw)) {
      push(ERR.E008, '正文哈希与账本不一致（正文冻结被破坏）');
    }
  }
  for (const row of manifest.rows) {
    let resolved;
    try {
      resolved = resolveProjectFile(root, row.path);
    } catch (err) {
      push(err.code || ERR.E014, err.message);
      continue;
    }
    if (isRealSha(row.sha)) {
      try {
        const actual = sha256File(resolved.abs);
        if (actual !== row.sha.trim()) push(ERR.E005, `清单哈希不一致：${row.path}`);
      } catch {
        push(ERR.E004, `清单文件不存在：${row.path}`);
      }
    } else {
      if (strict) push(ERR.E005, `--strict 要求清单哈希已填写：${row.path}`);
      else if (rec.meta.status !== 'DRAFT') push(ERR.E005, `清单 SHA-256 未计算：${row.path}`);
      if ((strict || rec.meta.status !== 'DRAFT') && !isFile(resolved.abs)) {
        push(ERR.E004, `清单文件不存在：${row.path}`);
      }
    }
  }

  if (issues.length > 0) {
    const payload = {
      ok: false,
      code: issues[0].code,
      message: issues[0].message,
      path: rec.rel,
      issues,
    };
    throw new DagError(
      issues[0].code,
      `${issues.length} 个问题；首个：${issues[0].message}`,
      EXIT.INVALID,
      { payload },
    );
  }
  return {
    json: { ok: true, path: rec.rel, status: rec.meta.status, issues: [] },
    human: `校验通过：${rec.rel}${strict ? '（strict）' : ''}`,
  };
}

export function cmdVerify(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const result = verifyProject(root);
  if (!result.ok) {
    const first = result.issues[0];
    const payload = {
      ok: false,
      checked: result.checked,
      issues: result.issues,
      code: first.code,
      message: first.message,
    };
    throw new DagError(
      first.code,
      `${result.issues.length} 个问题；首个：${first.message}`,
      EXIT.INVALID,
      { payload },
    );
  }
  return {
    json: { ok: true, checked: result.checked, issues: [] },
    human:
      `校验通过：handoff ${result.checked.handoffs} 个，模块 ${result.checked.modules} 个，` +
      `分支 ${result.checked.branches} 个，文件 ${result.checked.files} 个`,
  };
}

export function cmdReport(args, ctx) {
  const root = resolveProjectRoot(ctx.cwd, args.flags.root);
  const { state, ledger } = loadProject(root);
  internalReport(root, state, ledger);
  const pending = (ledger.handoffs || []).filter((h) => h && h.status === 'PROVISIONAL').length;
  const accepted = (ledger.handoffs || []).filter((h) => h && h.status === 'ACCEPTED').length;
  return {
    json: { ok: true, report: { pending_decisions: pending, accepted } },
    human: '已刷新报告：control/PROJECT_STATE.md、control/MODULE_REGISTER.md、control/ledger.json',
  };
}

export function cmdStateSet(args, ctx) {
  const flags = args.flags;
  const root = resolveProjectRoot(ctx.cwd, flags.root);
  const { state, ledger } = loadProject(root);
  let changed = false;
  if (flags.phase !== undefined) {
    const phase = String(flags.phase);
    if (!PHASES.includes(phase)) {
      throw invalid(ERR.E012, `phase 非法：${phase}（可选：${PHASES.join('/')}）`);
    }
    state.phase = phase;
    changed = true;
  }
  if (flags.goal !== undefined) {
    state.project.goal = String(flags.goal);
    changed = true;
  }
  if (flags['clear-next']) {
    state.next_steps = [];
    changed = true;
  }
  if (Array.isArray(flags.next) && flags.next.length > 0) {
    state.next_steps = [
      ...(Array.isArray(state.next_steps) ? state.next_steps : []),
      ...flags.next.map(String),
    ];
    changed = true;
  }
  if (flags['clear-blockers']) {
    state.blockers = [];
    changed = true;
  }
  if (Array.isArray(flags.blocker) && flags.blocker.length > 0) {
    state.blockers = [
      ...(Array.isArray(state.blockers) ? state.blockers : []),
      ...flags.blocker.map(String),
    ];
    changed = true;
  }
  if (!changed) {
    throw usageError(
      'state set 至少需要一个修改项（--phase / --goal / --next / --blocker / --clear-next / --clear-blockers）',
    );
  }
  saveProjectState(root, state);
  internalReport(root, state, ledger);
  return {
    json: {
      ok: true,
      phase: state.phase,
      goal: state.project.goal,
      next_steps: state.next_steps,
      blockers: state.blockers,
    },
    human: `已更新项目状态：phase=${state.phase}，下一步 ${state.next_steps.length} 项，阻塞 ${state.blockers.length} 项`,
  };
}

// ---------------------------------------------------------------------------
// CLI 分发层
// ---------------------------------------------------------------------------

export const USAGE = `research-dag（PROTOCOL v${PROTOCOL_VERSION}）用法：
  dag init <dir> --id <id> --title <title> [--goal <text>] [--force]
  dag module add --id <id> --name <名称> [--slug <slug>]
  dag branch new --module <moduleId> --id <id> --name <名称> [--slug <slug>]
  dag handoff new --branch <branchId> [--stream <stream>] [--slug <LABEL>]
  dag submit <handoff> [--by <who>]
  dag accept <handoff> --reason <text> [--by main]
  dag reject <handoff> --reason <text> [--by main]
  dag block <handoff> --reason <text> [--by <who>]
  dag unblock <handoff> [--reason <text>] [--by <who>]
  dag status [--json]
  dag list [--module <id>] [--status <S>] [--json]
  dag check <handoff> [--strict]
  dag verify [--json]
  dag report
  dag state set [--phase <phase>] [--goal <text>] [--next <text>]... [--blocker <text>]... [--clear-next] [--clear-blockers]
  dag results [--json]                     # 结果视图：按模块汇总已接受结果（给人看的主命令）
  dag auto [--dry-run] [--json]            # 自动门控：校验全绿的 PROVISIONAL 自动接受
  dag selftest
通用：--root <dir> 指定项目根；--json 输出结构化 JSON（stdout 只输出 JSON）。
节点 id 规则：^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9_])?$（1–64 位，不得以 . 或 - 结尾；module/branch 各自 namespace 内唯一）。
退出码：0 成功；1 校验失败；2 用法错误；3 I/O 或环境错误。`;

export function usageText() {
  return USAGE;
}

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  const valueFlags = new Set([
    'root',
    'id',
    'title',
    'goal',
    'name',
    'slug',
    'module',
    'branch',
    'stream',
    'by',
    'reason',
    'phase',
    'status',
  ]);
  const repeatFlags = new Set(['next', 'blocker']);
  const boolFlags = new Set([
    'json',
    'force',
    'strict',
    'dry-run',
    'clear-next',
    'clear-blockers',
    'help',
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i]);
    if (token === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith('-') || token === '-') {
      positional.push(token);
      continue;
    }
    if (token === '-h') {
      flags.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw usageError(`未知选项：${token}`);
    const eq = token.indexOf('=');
    let name;
    let value;
    if (eq !== -1) {
      name = token.slice(2, eq);
      value = token.slice(eq + 1);
    } else {
      name = token.slice(2);
    }
    if (boolFlags.has(name)) {
      if (eq !== -1) throw usageError(`选项 --${name} 不接受值`);
      flags[name] = true;
      continue;
    }
    if (!valueFlags.has(name) && !repeatFlags.has(name)) throw usageError(`未知选项：--${name}`);
    if (eq === -1) {
      i += 1;
      if (i >= argv.length) throw usageError(`选项 --${name} 缺少值`);
      value = argv[i];
    }
    if (repeatFlags.has(name)) {
      if (!Array.isArray(flags[name])) flags[name] = [];
      flags[name].push(value);
    } else {
      flags[name] = value;
    }
  }
  return { positional, flags };
}

export function parseCommand(argv) {
  if (!argv || argv.length === 0) throw usageError('缺少命令（dag --help 查看用法）');
  const first = String(argv[0]);
  if (['module', 'branch', 'handoff', 'state'].includes(first)) {
    if (argv.length < 2) throw usageError(`命令不完整：${first}`);
    return { command: `${first} ${argv[1]}`, rest: argv.slice(2) };
  }
  return { command: first, rest: argv.slice(1) };
}

export function dispatch(command, args, ctx) {
  switch (command) {
    case 'init':
      return cmdInit(args, ctx);
    case 'module add':
      return cmdModuleAdd(args, ctx);
    case 'branch new':
      return cmdBranchNew(args, ctx);
    case 'handoff new':
      return cmdHandoffNew(args, ctx);
    case 'submit':
      return cmdSubmit(args, ctx);
    case 'accept':
      return cmdAccept(args, ctx);
    case 'reject':
      return cmdReject(args, ctx);
    case 'block':
      return cmdBlock(args, ctx);
    case 'unblock':
      return cmdUnblock(args, ctx);
    case 'status':
      return cmdStatus(args, ctx);
    case 'list':
      return cmdList(args, ctx);
    case 'check':
      return cmdCheck(args, ctx);
    case 'verify':
      return cmdVerify(args, ctx);
    case 'report':
      return cmdReport(args, ctx);
    case 'state set':
      return cmdStateSet(args, ctx);
    case 'results':
      return cmdResults(args, ctx);
    case 'auto':
      return cmdAuto(args, ctx);
    default:
      throw usageError(`未知命令：${command}（dag --help 查看用法）`);
  }
}

function reportError(error, jsonMode, out, err) {
  if (error instanceof DagError) {
    if (jsonMode) {
      const base = error.payload || { ok: false, code: error.code, message: error.message };
      const payload = { ...base };
      if (error.issues && !payload.issues) payload.issues = error.issues;
      out(JSON.stringify(payload));
    } else {
      err(`${error.code}: ${error.message}`);
    }
    return error.exitCode;
  }
  const message = error && error.message ? error.message : String(error);
  if (jsonMode) {
    out(JSON.stringify({ ok: false, code: ERR.E002, message: `内部错误：${message}` }));
  } else {
    err(`${ERR.E002}: 内部错误：${message}`);
  }
  return EXIT.IO;
}

/**
 * CLI 入口（不调用 process.exit，返回退出码）。
 * @param {string[]} argv
 * @param {{out?:(line:string)=>void, err?:(line:string)=>void, cwd?:string}} io
 * @returns {number} 0/1/2/3
 */
export function runCli(argv = process.argv.slice(2), io = {}) {
  const out = io.out || ((line) => process.stdout.write(`${line}\n`));
  const err = io.err || ((line) => process.stderr.write(`${line}\n`));
  const cwd = io.cwd || process.cwd();
  const jsonMode = argv.includes('--json');
  let parsed;
  try {
    parsed = parseCommand(argv);
  } catch (error) {
    return reportError(error, jsonMode, out, err);
  }
  if (parsed.command === 'help' || argv.includes('--help') || argv.includes('-h')) {
    out(USAGE);
    return EXIT.OK;
  }
  if (parsed.command === 'selftest') {
    return runSelftest({ out, err });
  }
  try {
    const args = parseArgs(parsed.rest);
    const result = dispatch(parsed.command, args, { cwd });
    if (jsonMode) out(JSON.stringify(result.json));
    else out(result.human);
    return EXIT.OK;
  } catch (error) {
    return reportError(error, jsonMode, out, err);
  }
}

// ---------------------------------------------------------------------------
// selftest（PROTOCOL v1.3 第 8 节 19 个场景）
// ---------------------------------------------------------------------------

function jsonFromOutput(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].startsWith('{')) {
      try {
        return JSON.parse(lines[i]);
      } catch {
        /* 继续向前找 */
      }
    }
  }
  return null;
}

/**
 * 在系统临时目录中执行 PROTOCOL §8 的 19 个场景，结束后清理临时目录。
 * 每个场景通过打印 `PASS <名称>`，失败打印 `FAIL <名称> <原因>` 并返回退出码 1。
 * @param {{out?:(line:string)=>void, err?:(line:string)=>void}} io
 * @returns {number} 0 = 全部通过；1 = 有失败
 */
export function runSelftest(io = {}) {
  const out = io.out || ((line) => process.stdout.write(`${line}\n`));
  const err = io.err || ((line) => process.stderr.write(`${line}\n`));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dag-selftest-'));
  const projectDir = path.join(base, 'proj');
  const total = 19;
  let passed = 0;
  let current = '';

  const absPath = (rel) => path.join(projectDir, ...String(rel).split('/'));
  const read = (rel) => fs.readFileSync(absPath(rel), 'utf8');
  const write = (rel, content) => {
    const file = absPath(rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  };
  const exists = (rel) => fs.existsSync(absPath(rel));
  const dirExists = (rel) => {
    try {
      return fs.statSync(absPath(rel)).isDirectory();
    } catch {
      return false;
    }
  };
  const stateFile = () => JSON.parse(read('control/PROJECT_STATE.json'));
  const ledgerFile = () => JSON.parse(read('control/ledger.json'));
  const writeLedgerFile = (ledger) => write('control/ledger.json', `${JSON.stringify(ledger, null, 2)}\n`);
  const handoffMeta = (rel) => handoffMetaFromDoc(parseDocument(read(rel)));

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(`${message}（期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}）`);
    }
  };
  const hasCode = (payload, code) =>
    Boolean(payload && Array.isArray(payload.issues) && payload.issues.some((i) => i.code === code));

  const run = (cwd, argv) => {
    const outs = [];
    const errs = [];
    const code = runCli(argv, {
      cwd,
      out: (line) => outs.push(String(line)),
      err: (line) => errs.push(String(line)),
    });
    return { code, out: outs.join('\n'), err: errs.join('\n') };
  };
  const runJson = (cwd, argv) => {
    const result = run(cwd, [...argv, '--json']);
    const data = jsonFromOutput(result.out);
    if (data === null) {
      throw new Error(
        `命令 ${argv.join(' ')} 未输出合法 JSON（退出码 ${result.code}）：${result.out} ${result.err}`,
      );
    }
    return { ...result, data };
  };

  /** 覆盖 handoff 正文：8 节文本 + 文件清单行（不改变 frontmatter） */
  const writeHandoffBodyAt = (root, rel, sectionTexts, manifestRows) => {
    const file = path.join(root, ...String(rel).split('/'));
    const doc = parseDocument(fs.readFileSync(file, 'utf8'));
    const parts = [];
    for (let n = 1; n <= 8; n += 1) {
      parts.push(`## ${n}. ${HANDOFF_SECTIONS[n - 1].title}`);
      if (n < 8) {
        parts.push('', sectionTexts[n] || '已填写内容。', '');
      } else {
        parts.push('', '| 文件 | SHA-256 | 说明 |', '| --- | --- | --- |');
        for (const row of manifestRows) {
          parts.push(`| ${row.path} | ${row.sha || '待计算'} | ${row.note || ''} |`);
        }
        parts.push('');
      }
    }
    const body = `\n${parts.join('\n')}`;
    fs.writeFileSync(file, serializeDocument(doc.entries, body), 'utf8');
  };
  const writeHandoffBody = (rel, sectionTexts, manifestRows) =>
    writeHandoffBodyAt(projectDir, rel, sectionTexts, manifestRows);
  const readIn = (root, rel) => fs.readFileSync(path.join(root, ...String(rel).split('/')), 'utf8');
  const writeIn = (root, rel, content) => {
    const file = path.join(root, ...String(rel).split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  };
  const metaIn = (root, rel) => handoffMetaFromDoc(parseDocument(readIn(root, rel)));

  const fullSections = {
    1: '比较加权前后的协变量平衡。',
    2: '上游 cohort-definition v2 与原始队列数据。',
    3: '输出 balance.csv 与 love_plot.svg。',
    4: '加权后所有协变量 SMD 小于 0.1。',
    5: '建议采用 99% 截尾作为主分析。',
    6: '样本量有限，极端权重仍需敏感性分析。',
    7: '是否接受 99% 截尾作为主分析。',
  };

  /** 人工改状态（模拟绕过门控的篡改，用于构造违规项目） */
  const setStatusRaw = (rel, status) => {
    const doc = parseDocument(read(rel));
    fmSet(doc.entries, 'status', status);
    write(rel, serializeDocument(doc.entries, doc.bodyRaw));
    const lg = ledgerFile();
    const entry = lg.handoffs.find((h) => h.path === rel);
    if (entry) entry.status = status;
    writeLedgerFile(lg);
  };

  const scenario = (step, name, fn) => {
    current = name;
    try {
      fn();
      passed += 1;
      out(`PASS ${step}. ${name}`);
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      out(`FAIL ${step}. ${name} ${message}`);
      throw error;
    }
  };

  let handoffV1 = '';
  let handoffV2 = '';
  let handoffV3 = '';
  let handoffRejected = '';
  let handoffBlocked = '';

  try {
    scenario(1, 'init 创建控制文件并复制 dag.mjs，verify 通过', () => {
      const result = run(base, [
        'init',
        'proj',
        '--id',
        'test-project',
        '--title',
        '测试项目',
        '--goal',
        '研究总目标',
      ]);
      assertEqual(result.code, 0, `init 退出码应 0：${result.err}`);
      for (const rel of [
        'README.md',
        'control/dag.mjs',
        'control/PROJECT_STATE.md',
        'control/PROJECT_STATE.json',
        'control/MODULE_REGISTER.md',
        'control/DECISIONS.md',
        'control/ledger.json',
        'modules',
        'releases',
      ]) {
        assert(exists(rel), `init 后缺少 ${rel}`);
      }
      assertEqual(
        sha256File(absPath('control/dag.mjs')),
        sha256File(SCRIPT_FILE),
        'control/dag.mjs 应是工具自身副本',
      );
      const stateJson = stateFile();
      assertEqual(stateJson.project.id, 'test-project', 'project.id');
      assertEqual(stateJson.schema, 1, 'state.schema');
      assertEqual(stateJson.modules.length, 0, '初始 modules');
      assert(read('control/PROJECT_STATE.md').includes('<!-- BEGIN AUTO -->'), 'AUTO 标记');
      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      assertEqual(verified.data.ok, true, 'verify.ok');
      assertEqual(verified.data.checked.handoffs, 0, '零 handoff');
    });

    scenario(2, 'module add + branch new，目录/注册表/state 一致，verify 通过', () => {
      const added = runJson(projectDir, [
        'module',
        'add',
        '--id',
        'M40',
        '--name',
        '统计分析',
        '--slug',
        'statistics',
      ]);
      assertEqual(added.code, 0, `module add 退出码应 0：${added.out} ${added.err}`);
      assertEqual(added.data.module.dir, 'modules/M40-statistics', '模块目录');
      assert(exists('modules/M40-statistics/MODULE.md'), 'MODULE.md 应存在');
      assert(dirExists('modules/M40-statistics/branches'), 'branches/ 应存在');
      assert(dirExists('modules/M40-statistics/handoffs'), 'handoffs/ 应存在');

      const branch = runJson(projectDir, [
        'branch',
        'new',
        '--module',
        'M40',
        '--id',
        'B40-03',
        '--name',
        'IPTW 诊断',
        '--slug',
        'iptw',
      ]);
      assertEqual(branch.code, 0, `branch new 退出码应 0：${branch.out} ${branch.err}`);
      const branchDir = 'modules/M40-statistics/branches/B40-03-iptw';
      assertEqual(branch.data.branch.dir, branchDir, '分支目录');
      assert(exists(`${branchDir}/BRIEF.md`), 'BRIEF.md 应存在');
      assert(dirExists(`${branchDir}/work`), 'work/ 应存在');
      assert(dirExists(`${branchDir}/outputs`), 'outputs/ 应存在');

      const braceErrors = analyzeBrief(read(`${branchDir}/BRIEF.md`)).errors;
      assertEqual(braceErrors.length, 0, `BRIEF 6 节应完整非空：${JSON.stringify(braceErrors)}`);

      const stateJson = stateFile();
      assertEqual(stateJson.modules.length, 1, 'state.modules');
      assertEqual(stateJson.modules[0].id, 'M40', 'state 模块 id');
      assertEqual(stateJson.branches.length, 1, 'state.branches');
      assertEqual(stateJson.branches[0].id, 'B40-03', 'state 分支 id');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      assertEqual(verified.data.checked.modules, 1, 'checked.modules');
      assertEqual(verified.data.checked.branches, 1, 'checked.branches');
    });

    scenario(3, 'handoff new → DRAFT、版本 1、8 节骨架、清单表头', () => {
      const created = runJson(projectDir, ['handoff', 'new', '--branch', 'B40-03']);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      const handoff = created.data.handoff;
      handoffV1 = handoff.path;
      assertEqual(handoff.path, 'modules/M40-statistics/handoffs/HANDOFF-B40-03-v1.md', 'handoff 路径');
      assertEqual(handoff.status, 'DRAFT', '初始状态');
      assertEqual(handoff.version, 1, '初始版本');
      assertEqual(handoff.stream, 'b40-03', '缺省 stream 应为分支 id 小写');

      const doc = parseDocument(read(handoffV1));
      const meta = handoffMetaFromDoc(doc);
      assertEqual(meta.status, 'DRAFT', 'frontmatter status');
      assertEqual(meta.version, 1, 'frontmatter version');
      assert(isDateStr(meta.created_at), 'created_at 应为日期');
      const { sections, errors } = analyzeHandoffBody(doc.bodyLines);
      assertEqual(errors.length, 0, `8 节骨架应完整：${JSON.stringify(errors)}`);
      assertEqual(sections.size, 8, '8 节数量');
      const manifest = parseManifestTable(sections.get(8).contentLines);
      assert(manifest.hasTable, '清单表头应存在');
      assertEqual(manifest.rows.length, 0, '清单初始为空');

      const lg = ledgerFile();
      const entry = lg.handoffs.find((h) => h.path === handoffV1);
      assert(entry, 'ledger 应含 CREATE 条目');
      assertEqual(entry.status, 'DRAFT', '账本状态');
      assertEqual(entry.events[0].action, 'CREATE', 'CREATE 事件');

      const listed = runJson(projectDir, ['list']);
      assertEqual(listed.code, 0, 'list 退出码');
      assertEqual(listed.data.handoffs.length, 1, 'list 数量');
      assertEqual(listed.data.handoffs[0].status, 'DRAFT', 'list 状态');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      assertEqual(verified.data.checked.handoffs, 1, 'checked.handoffs');
    });

    scenario(4, 'submit → PROVISIONAL、哈希回写、submitted_at、事件、verify 通过', () => {
      const outputRel = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance.csv';
      write(outputRel, 'variable,smd\nage,0.12\n');
      writeHandoffBody(handoffV1, fullSections, [{ path: outputRel, note: '加权 SMD 表' }]);
      const submitted = runJson(projectDir, ['submit', handoffV1]);
      assertEqual(submitted.code, 0, `submit 退出码应 0：${submitted.out} ${submitted.err}`);
      assertEqual(submitted.data.handoff.status, 'PROVISIONAL', 'submit 返回状态');

      const doc = parseDocument(read(handoffV1));
      const meta = handoffMetaFromDoc(doc);
      assertEqual(meta.status, 'PROVISIONAL', 'frontmatter status');
      assert(isDateStr(meta.submitted_at), 'submitted_at 应为日期');
      const { sections } = analyzeHandoffBody(doc.bodyLines);
      const manifest = parseManifestTable(sections.get(8).contentLines);
      assertEqual(manifest.rows.length, 1, '清单行数');
      assertEqual(
        manifest.rows[0].sha,
        sha256File(absPath(outputRel)),
        '清单 SHA 应回写为文件实际哈希',
      );
      assert(isRealSha(manifest.rows[0].sha), '清单 SHA 应为 64 位小写十六进制');

      const entry = ledgerFile().handoffs.find((h) => h.path === handoffV1);
      assert(isRealSha(entry.body_hash), '账本 body_hash 应为 64 位十六进制');
      assertEqual(entry.files.length, 1, '账本 files');
      assertEqual(entry.events[entry.events.length - 1].action, 'SUBMIT', 'SUBMIT 事件');
      assert(typeof entry.submitted_at === 'string' && entry.submitted_at.length >= 19, '账本时间戳');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      assertEqual(verified.data.checked.files, 1, 'checked.files');
    });

    scenario(5, 'accept → ACCEPTED、DECISIONS 新增', () => {
      const accepted = runJson(projectDir, [
        'accept',
        handoffV1,
        '--reason',
        '接受 v1 的平衡结果',
      ]);
      assertEqual(accepted.code, 0, `accept 退出码应 0：${accepted.out} ${accepted.err}`);
      const meta = handoffMeta(handoffV1);
      assertEqual(meta.status, 'ACCEPTED', 'frontmatter status');
      assertEqual(meta.decision_reason, '接受 v1 的平衡结果', 'decision_reason');
      assert(isDateStr(meta.decided_at), 'decided_at 应为日期');

      const decisions = read('control/DECISIONS.md');
      assert(decisions.includes('## D-0001'), '应新增 D-0001');
      assert(decisions.includes('- 动作: ACCEPT'), '决策动作应为 ACCEPT');
      assert(decisions.includes(`- 对象: ${handoffV1}`), '决策对象路径');

      const entry = ledgerFile().handoffs.find((h) => h.path === handoffV1);
      assertEqual(entry.status, 'ACCEPTED', '账本状态');
      assertEqual(entry.events[entry.events.length - 1].action, 'ACCEPT', 'ACCEPT 事件');

      const status = runJson(projectDir, ['status']);
      assertEqual(status.code, 0, 'status 退出码');
      assertEqual(status.data.accepted.length, 1, 'status.accepted');
      assertEqual(status.data.modules[0].counts.accepted, 1, 'status 模块计数');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(6, '同 stream v2：版本 2；accept 后 v1 变 SUPERSEDED 且 superseded_by 正确', () => {
      const created = runJson(projectDir, ['handoff', 'new', '--branch', 'B40-03']);
      assertEqual(created.code, 0, `handoff new v2 退出码应 0：${created.out} ${created.err}`);
      handoffV2 = created.data.handoff.path;
      assertEqual(handoffV2, 'modules/M40-statistics/handoffs/HANDOFF-B40-03-v2.md', 'v2 路径');
      assertEqual(created.data.handoff.version, 2, '同 stream 版本应为 2');

      const outputRel = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_v2.csv';
      write(outputRel, 'variable,smd\nage,0.08\n');
      writeHandoffBody(handoffV2, fullSections, [{ path: outputRel, note: 'v2 加权 SMD 表' }]);
      const submitted = runJson(projectDir, ['submit', handoffV2]);
      assertEqual(submitted.code, 0, `submit v2 退出码应 0：${submitted.out} ${submitted.err}`);

      const accepted = runJson(projectDir, ['accept', handoffV2, '--reason', '接受 v2']);
      assertEqual(accepted.code, 0, `accept v2 退出码应 0：${accepted.out} ${accepted.err}`);
      assertEqual(accepted.data.superseded, handoffV1, '应自动 SUPERSEDE v1');

      const meta1 = handoffMeta(handoffV1);
      assertEqual(meta1.status, 'SUPERSEDED', 'v1 状态应为 SUPERSEDED');
      assertEqual(meta1.superseded_by, handoffV2, 'v1.superseded_by');
      const meta2 = handoffMeta(handoffV2);
      assertEqual(meta2.status, 'ACCEPTED', 'v2 状态');
      assertEqual(meta2.supersedes, 1, 'v2.supersedes');
      assertEqual(meta2.superseded_by, null, 'v2.superseded_by 应为空');

      const lg = ledgerFile();
      const entry1 = lg.handoffs.find((h) => h.path === handoffV1);
      const entry2 = lg.handoffs.find((h) => h.path === handoffV2);
      assertEqual(entry1.status, 'SUPERSEDED', '账本 v1 状态');
      assertEqual(entry1.superseded_by, handoffV2, '账本 v1 superseded_by');
      assertEqual(entry1.events[entry1.events.length - 1].action, 'SUPERSEDE', 'SUPERSEDE 事件');
      assertEqual(entry2.supersedes, 1, '账本 v2 supersedes');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(7, 'reject 路径：submit → reject → REJECTED + 决策，verify 通过', () => {
      const created = runJson(projectDir, [
        'handoff',
        'new',
        '--branch',
        'B40-03',
        '--stream',
        'exploratory',
        '--slug',
        'EXP',
      ]);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      handoffRejected = created.data.handoff.path;
      const outputRel = 'modules/M40-statistics/branches/B40-03-iptw/outputs/exploratory.csv';
      write(outputRel, 'item,value\ntest,1\n');
      writeHandoffBody(handoffRejected, fullSections, [{ path: outputRel, note: '探索性分析' }]);
      assertEqual(runJson(projectDir, ['submit', handoffRejected]).code, 0, 'submit 应成功');

      const rejected = runJson(projectDir, [
        'reject',
        handoffRejected,
        '--reason',
        '探索性分析不纳入主文',
      ]);
      assertEqual(rejected.code, 0, `reject 退出码应 0：${rejected.out} ${rejected.err}`);
      const meta = handoffMeta(handoffRejected);
      assertEqual(meta.status, 'REJECTED', 'frontmatter status');
      assertEqual(meta.decision_reason, '探索性分析不纳入主文', 'decision_reason');
      assert(read('control/DECISIONS.md').includes('- 动作: REJECT'), '决策动作应为 REJECT');
      const entry = ledgerFile().handoffs.find((h) => h.path === handoffRejected);
      assertEqual(entry.events[entry.events.length - 1].action, 'REJECT', 'REJECT 事件');

      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(8, 'block/unblock：DRAFT block → BLOCKED（blocked_from=DRAFT）→ unblock → DRAFT', () => {
      const created = runJson(projectDir, [
        'handoff',
        'new',
        '--branch',
        'B40-03',
        '--stream',
        'block-test',
        '--slug',
        'BLK',
      ]);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      handoffBlocked = created.data.handoff.path;

      const blocked = runJson(projectDir, ['block', handoffBlocked, '--reason', '等待数据提供方确认']);
      assertEqual(blocked.code, 0, `block 退出码应 0：${blocked.out} ${blocked.err}`);
      let meta = handoffMeta(handoffBlocked);
      assertEqual(meta.status, 'BLOCKED', 'frontmatter status');
      assertEqual(meta.blocked_from, 'DRAFT', 'blocked_from');
      let verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `BLOCKED 时 verify 应通过：${JSON.stringify(verified.data.issues)}`);

      const unblocked = runJson(projectDir, ['unblock', handoffBlocked, '--reason', '数据已确认']);
      assertEqual(unblocked.code, 0, `unblock 退出码应 0：${unblocked.out} ${unblocked.err}`);
      meta = handoffMeta(handoffBlocked);
      assertEqual(meta.status, 'DRAFT', 'unblock 后应回到 DRAFT');
      assertEqual(meta.blocked_from, null, 'blocked_from 应清空');
      verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `unblock 后 verify 应通过：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(9, '非法转移：accept 一个 DRAFT → 非 0 退出码 + DAG-E006', () => {
      assertEqual(handoffMeta(handoffBlocked).status, 'DRAFT', '前置：handoff 应为 DRAFT');
      const illegal = runJson(projectDir, [
        'accept',
        handoffBlocked,
        '--reason',
        '非法转移测试',
      ]);
      assert(illegal.code !== 0, 'accept DRAFT 退出码应非 0');
      assertEqual(illegal.data.ok, false, 'JSON ok 应为 false');
      assertEqual(illegal.data.code, 'DAG-E006', '错误码应为 DAG-E006');
    });

    scenario(10, '正文篡改：accepted 后改正文 → verify 失败 DAG-E008', () => {
      const original = read(handoffV2);
      try {
        write(handoffV2, `${original}\n篡改正文（selftest）。\n`);
        const verified = runJson(projectDir, ['verify']);
        assertEqual(verified.code, 1, `verify 退出码应 1，实际 ${verified.code}`);
        assertEqual(verified.data.ok, false, 'verify.ok 应为 false');
        assert(
          hasCode(verified.data, 'DAG-E008'),
          `应报 DAG-E008，实际 ${JSON.stringify(verified.data.issues.map((i) => i.code))}`,
        );
      } finally {
        write(handoffV2, original);
      }
      const restored = runJson(projectDir, ['verify']);
      assertEqual(restored.code, 0, `还原后 verify 应通过：${JSON.stringify(restored.data.issues)}`);
    });

    scenario(11, '清单文件篡改：改 outputs 文件内容 → verify 失败 DAG-E005', () => {
      const fileRel = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_v2.csv';
      const original = read(fileRel);
      try {
        write(fileRel, original.replace('0.08', '0.99'));
        const verified = runJson(projectDir, ['verify']);
        assertEqual(verified.code, 1, `verify 退出码应 1，实际 ${verified.code}`);
        assert(
          hasCode(verified.data, 'DAG-E005'),
          `应报 DAG-E005，实际 ${JSON.stringify(verified.data.issues.map((i) => i.code))}`,
        );
      } finally {
        write(fileRel, original);
      }
      const restored = runJson(projectDir, ['verify']);
      assertEqual(restored.code, 0, `还原后 verify 应通过：${JSON.stringify(restored.data.issues)}`);
    });

    scenario(12, '清单缺失文件：submit 引用不存在文件 → 失败 DAG-E004', () => {
      const created = runJson(projectDir, [
        'handoff',
        'new',
        '--branch',
        'B40-03',
        '--stream',
        'missing-file-test',
        '--slug',
        'MISS',
      ]);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      const rel = created.data.handoff.path;
      writeHandoffBody(rel, fullSections, [
        { path: 'modules/M40-statistics/branches/B40-03-iptw/outputs/not_exist.csv', note: '不存在的文件' },
      ]);
      const submitted = runJson(projectDir, ['submit', rel]);
      assertEqual(submitted.code, 1, `submit 退出码应 1，实际 ${submitted.code}`);
      assertEqual(submitted.data.code, 'DAG-E004', '错误码应为 DAG-E004');
      assertEqual(handoffMeta(rel).status, 'DRAFT', 'submit 失败后仍应为 DRAFT');
      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `DRAFT 的待计算清单不应阻塞 verify：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(13, '路径逃逸：清单写 ../x / 绝对路径 / 盘符 → 失败 DAG-E014', () => {
      const created = runJson(projectDir, [
        'handoff',
        'new',
        '--branch',
        'B40-03',
        '--stream',
        'escape-test',
        '--slug',
        'ESC',
      ]);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      const rel = created.data.handoff.path;
      for (const badPath of [
        '../outside.csv',
        'modules/M40-statistics/../../outside.csv',
        '/abs/outside.csv',
        'C:/windows/outside.csv',
        'modules\\M40-statistics\\outputs\\x.csv',
      ]) {
        writeHandoffBody(rel, fullSections, [{ path: badPath, note: '逃逸路径' }]);
        const submitted = runJson(projectDir, ['submit', rel]);
        assertEqual(submitted.code, 1, `submit(${badPath}) 退出码应 1，实际 ${submitted.code}`);
        assertEqual(submitted.data.code, 'DAG-E014', `submit(${badPath}) 应报 DAG-E014`);
      }
      const checked = runJson(projectDir, ['check', rel]);
      assertEqual(checked.code, 1, 'check 退出码应 1');
      assert(hasCode(checked.data, 'DAG-E014'), 'check 应报 DAG-E014');
      writeHandoffBody(rel, fullSections, []);
      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 0, `还原空清单后 verify 应通过：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(14, '同 stream 两个 ACCEPTED（人工构造）→ verify 失败 DAG-E009', () => {
      const created = runJson(projectDir, ['handoff', 'new', '--branch', 'B40-03']);
      assertEqual(created.code, 0, `handoff new 退出码应 0：${created.out} ${created.err}`);
      handoffV3 = created.data.handoff.path;
      assertEqual(created.data.handoff.version, 3, '同 stream 版本应为 3');
      const outputRel = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance_v3.csv';
      write(outputRel, 'variable,smd\nage,0.07\n');
      writeHandoffBody(handoffV3, fullSections, [{ path: outputRel, note: 'v3 加权 SMD 表' }]);
      const submitted = runJson(projectDir, ['submit', handoffV3]);
      assertEqual(submitted.code, 0, `submit v3 退出码应 0：${submitted.out} ${submitted.err}`);

      // 绕过 accept 门控，人工把 v3 标成 ACCEPTED，构造「同 stream 两个 ACCEPTED」
      setStatusRaw(handoffV3, 'ACCEPTED');
      const verified = runJson(projectDir, ['verify']);
      assertEqual(verified.code, 1, `verify 退出码应 1，实际 ${verified.code}`);
      assertEqual(verified.data.ok, false, 'verify.ok');
      assert(
        hasCode(verified.data, 'DAG-E009'),
        `应报 DAG-E009，实际 ${JSON.stringify(verified.data.issues.map((i) => i.code))}`,
      );
    });

    scenario(15, 'report 幂等：连续两次 report，文件字节不变', () => {
      const first = runJson(projectDir, ['report']);
      assertEqual(first.code, 0, `第一次 report 退出码应 0：${first.out} ${first.err}`);
      const files = ['control/PROJECT_STATE.md', 'control/MODULE_REGISTER.md', 'control/ledger.json'];
      const snapshot = files.map((rel) => read(rel));
      const second = runJson(projectDir, ['report']);
      assertEqual(second.code, 0, `第二次 report 退出码应 0：${second.out} ${second.err}`);
      files.forEach((rel, index) => {
        assertEqual(read(rel), snapshot[index], `${rel} 两次 report 后应字节一致`);
      });
    });

    scenario(16, '自由命名：literature / pilot-a / HANDOFF-pilot-a-v1.md，verify 通过', () => {
      const projectFree = path.join(base, 'proj-free');
      const initResult = run(base, [
        'init',
        'proj-free',
        '--id',
        'free-project',
        '--title',
        '自由命名项目',
        '--goal',
        '验证自由节点命名',
      ]);
      assertEqual(initResult.code, 0, `init 退出码应 0：${initResult.err}`);

      const moduleResult = runJson(projectFree, [
        'module',
        'add',
        '--id',
        'literature',
        '--name',
        '文献检索',
        '--slug',
        'lit',
      ]);
      assertEqual(moduleResult.code, 0, `module add 退出码应 0：${moduleResult.out} ${moduleResult.err}`);
      assertEqual(moduleResult.data.module.id, 'literature', '自由模块 id');
      assertEqual(moduleResult.data.module.dir, 'modules/literature-lit', '模块目录 = id-slug');
      assertEqual(moduleResult.data.module.name, '文献检索', '模块中文显示名');

      const branchResult = runJson(projectFree, [
        'branch',
        'new',
        '--module',
        'literature',
        '--id',
        'pilot-a',
        '--name',
        '先导检索',
      ]);
      assertEqual(branchResult.code, 0, `branch new 退出码应 0：${branchResult.out} ${branchResult.err}`);
      assertEqual(branchResult.data.branch.dir, 'modules/literature-lit/branches/pilot-a', '分支目录 = id');
      assertEqual(branchResult.data.branch.id, 'pilot-a', '自由分支 id（无模块号前缀）');

      const handoffResult = runJson(projectFree, ['handoff', 'new', '--branch', 'pilot-a']);
      assertEqual(handoffResult.code, 0, `handoff new 退出码应 0：${handoffResult.out} ${handoffResult.err}`);
      const handoffRel = handoffResult.data.handoff.path;
      assertEqual(
        handoffRel,
        'modules/literature-lit/handoffs/HANDOFF-pilot-a-v1.md',
        'handoff 文件名默认 = HANDOFF-<branchId>-v<N>.md',
      );
      assertEqual(handoffResult.data.handoff.stream, 'pilot-a', '缺省 stream = 分支 id 小写化');

      // 同一项目重复模块 id → E007（module namespace 内唯一）
      const duplicate = runJson(projectFree, ['module', 'add', '--id', 'literature', '--name', '重复模块']);
      assertEqual(duplicate.code, 1, `重复模块 id 退出码应 1，实际 ${duplicate.code}`);
      assertEqual(duplicate.data.code, 'DAG-E007', '重复模块 id 错误码');

      // id 不得以 `.` 或 `-` 结尾（PROTOCOL v1.2 §2，Windows 目录名安全）
      const trailingDot = runJson(projectFree, ['module', 'add', '--id', 'abc.', '--name', '尾点模块']);
      assertEqual(trailingDot.code, 2, `尾点 id 退出码应 2，实际 ${trailingDot.code}`);
      assertEqual(trailingDot.data.code, 'DAG-E002', '尾点 id 错误码');
      const trailingDash = runJson(projectFree, [
        'branch',
        'new',
        '--module',
        'literature',
        '--id',
        'pilot-',
        '--name',
        '尾横线分支',
      ]);
      assertEqual(trailingDash.code, 2, `尾横线 id 退出码应 2，实际 ${trailingDash.code}`);
      assertEqual(trailingDash.data.code, 'DAG-E002', '尾横线 id 错误码');

      const outputRel = 'modules/literature-lit/branches/pilot-a/outputs/search_log.csv';
      writeIn(projectFree, outputRel, 'term,hits\n"phosphat*",42\n');
      writeHandoffBodyAt(projectFree, handoffRel, fullSections, [{ path: outputRel, note: '检索记录' }]);
      const submitResult = runJson(projectFree, ['submit', handoffRel]);
      assertEqual(submitResult.code, 0, `submit 退出码应 0：${submitResult.out} ${submitResult.err}`);
      const acceptResult = runJson(projectFree, ['accept', handoffRel, '--reason', '接受先导检索结果']);
      assertEqual(acceptResult.code, 0, `accept 退出码应 0：${acceptResult.out} ${acceptResult.err}`);
      assertEqual(metaIn(projectFree, handoffRel).status, 'ACCEPTED', '自由命名 handoff 应为 ACCEPTED');

      const reportResult = runJson(projectFree, ['report']);
      assertEqual(reportResult.code, 0, `report 退出码应 0：${reportResult.out} ${reportResult.err}`);
      const register = fs.readFileSync(path.join(projectFree, 'control', 'MODULE_REGISTER.md'), 'utf8');
      assert(
        register.includes('literature') && register.includes('文献检索'),
        'MODULE_REGISTER 应含自由命名模块',
      );

      const verified = runJson(projectFree, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      const status = runJson(projectFree, ['status']);
      assertEqual(status.code, 0, 'status 退出码应 0');
      assertEqual(status.data.modules.length, 1, 'status.modules 数量');
      assertEqual(status.data.modules[0].id, 'literature', 'status 模块 id');
      assertEqual(status.data.modules[0].name, '文献检索', 'status 模块名');
      assertEqual(status.data.accepted.length, 1, 'status.accepted');
      const listed = runJson(projectFree, ['list']);
      assertEqual(listed.code, 0, 'list 退出码应 0');
      assertEqual(listed.data.handoffs.length, 1, 'list 数量');
      assertEqual(listed.data.handoffs[0].module, 'literature', 'list module 字段');
      assertEqual(listed.data.handoffs[0].branch, 'pilot-a', 'list branch 字段');
    });

    scenario(17, '目录与 id 解耦：历史 M40-statistics + 自由 analysis 共存，verify 通过', () => {
      const projectMixed = path.join(base, 'proj-mixed');
      const initResult = run(base, [
        'init',
        'proj-mixed',
        '--id',
        'mixed-project',
        '--title',
        '混合结构项目',
        '--goal',
        '历史目录与自由命名共存',
      ]);
      assertEqual(initResult.code, 0, `init 退出码应 0：${initResult.err}`);

      // 历史命名：id M40 + 目录 modules/M40-statistics
      const legacyModule = runJson(projectMixed, [
        'module',
        'add',
        '--id',
        'M40',
        '--name',
        '统计分析',
        '--slug',
        'statistics',
      ]);
      assertEqual(legacyModule.code, 0, `历史模块 add 退出码应 0：${legacyModule.out} ${legacyModule.err}`);
      assertEqual(legacyModule.data.module.dir, 'modules/M40-statistics', '历史目录名（dir 是映射权威）');

      // 自由命名模块：id analysis + 目录 modules/analysis
      const freeModule = runJson(projectMixed, ['module', 'add', '--id', 'analysis', '--name', '主分析']);
      assertEqual(freeModule.code, 0, `自由模块 add 退出码应 0：${freeModule.out} ${freeModule.err}`);
      assertEqual(freeModule.data.module.dir, 'modules/analysis', '自由目录名 = id');

      const legacyBranch = runJson(projectMixed, [
        'branch',
        'new',
        '--module',
        'M40',
        '--id',
        'B40-03',
        '--name',
        'IPTW 诊断',
        '--slug',
        'iptw',
      ]);
      assertEqual(legacyBranch.code, 0, `历史分支 new 退出码应 0：${legacyBranch.out} ${legacyBranch.err}`);
      assertEqual(
        legacyBranch.data.branch.dir,
        'modules/M40-statistics/branches/B40-03-iptw',
        '历史分支目录名',
      );

      // branch 与 module 分属不同 namespace：允许分支 id 与某模块 id 同名
      const sameNameBranch = runJson(projectMixed, [
        'branch',
        'new',
        '--module',
        'M40',
        '--id',
        'analysis',
        '--name',
        '与模块同名分支',
      ]);
      assertEqual(sameNameBranch.code, 0, 'branch 与 module 分命名空间，允许同名');
      // 但分支 namespace 内仍唯一
      const duplicateBranch = runJson(projectMixed, [
        'branch',
        'new',
        '--module',
        'analysis',
        '--id',
        'analysis',
        '--name',
        '重复分支',
      ]);
      assertEqual(duplicateBranch.code, 1, '重复分支 id 应失败');
      assertEqual(duplicateBranch.data.code, 'DAG-E007', '重复分支 id 错误码');

      // 历史 handoff 文件名 HANDOFF-B40-03-IPTW-v1.md 继续被接受
      const legacyHandoff = runJson(projectMixed, [
        'handoff',
        'new',
        '--branch',
        'B40-03',
        '--slug',
        'B40-03-IPTW',
      ]);
      assertEqual(legacyHandoff.code, 0, `历史命名 handoff new 退出码应 0：${legacyHandoff.out} ${legacyHandoff.err}`);
      const legacyRel = legacyHandoff.data.handoff.path;
      assertEqual(
        legacyRel,
        'modules/M40-statistics/handoffs/HANDOFF-B40-03-IPTW-v1.md',
        '历史 handoff 文件名',
      );
      const legacyOutput = 'modules/M40-statistics/branches/B40-03-iptw/outputs/balance.csv';
      writeIn(projectMixed, legacyOutput, 'variable,smd\nage,0.11\n');
      writeHandoffBodyAt(projectMixed, legacyRel, fullSections, [{ path: legacyOutput, note: '加权 SMD 表' }]);
      const legacySubmit = runJson(projectMixed, ['submit', legacyRel]);
      assertEqual(legacySubmit.code, 0, `历史文件名 submit 退出码应 0：${legacySubmit.out} ${legacySubmit.err}`);
      const legacyAccept = runJson(projectMixed, ['accept', legacyRel, '--reason', '接受历史命名版本']);
      assertEqual(legacyAccept.code, 0, `历史文件名 accept 退出码应 0：${legacyAccept.out} ${legacyAccept.err}`);
      assertEqual(metaIn(projectMixed, legacyRel).status, 'ACCEPTED', '历史文件名 handoff 应为 ACCEPTED');

      // 自由模块下的分支 + DRAFT handoff 共存
      const freeBranch = runJson(projectMixed, [
        'branch',
        'new',
        '--module',
        'analysis',
        '--id',
        'pilot-b',
        '--name',
        '自由分支',
      ]);
      assertEqual(freeBranch.code, 0, `自由分支 new 退出码应 0：${freeBranch.out} ${freeBranch.err}`);
      const freeHandoff = runJson(projectMixed, ['handoff', 'new', '--branch', 'pilot-b']);
      assertEqual(freeHandoff.code, 0, `自由 handoff new 退出码应 0：${freeHandoff.out} ${freeHandoff.err}`);
      assertEqual(
        freeHandoff.data.handoff.path,
        'modules/analysis/handoffs/HANDOFF-pilot-b-v1.md',
        '自由模块 handoff 路径',
      );

      const verified = runJson(projectMixed, ['verify']);
      assertEqual(verified.code, 0, `verify 退出码应 0：${JSON.stringify(verified.data.issues)}`);
      assertEqual(verified.data.checked.modules, 2, '两模块共存');
      assertEqual(verified.data.checked.branches, 3, '三个分支共存');
      assertEqual(verified.data.checked.handoffs, 2, '两个 handoff 共存');
    });

    scenario(18, 'auto 自动门控：全绿项接受、失败项保持 PROVISIONAL，dry-run 不写盘', () => {
      const projectAuto = path.join(base, 'proj-auto');
      const initResult = run(base, [
        'init',
        'proj-auto',
        '--id',
        'auto-project',
        '--title',
        '自动门控项目',
        '--goal',
        '验证 dag auto',
      ]);
      assertEqual(initResult.code, 0, `init 退出码应 0：${initResult.err}`);

      const moduleResult = runJson(projectAuto, ['module', 'add', '--id', 'lit', '--name', '文献检索']);
      assertEqual(moduleResult.code, 0, `module add 退出码应 0：${moduleResult.out} ${moduleResult.err}`);
      const branchOne = runJson(projectAuto, ['branch', 'new', '--module', 'lit', '--id', 'b1', '--name', '检索 A']);
      assertEqual(branchOne.code, 0, `branch new b1 退出码应 0：${branchOne.out} ${branchOne.err}`);
      const branchTwo = runJson(projectAuto, ['branch', 'new', '--module', 'lit', '--id', 'b2', '--name', '检索 B']);
      assertEqual(branchTwo.code, 0, `branch new b2 退出码应 0：${branchTwo.out} ${branchTwo.err}`);

      const goodOutput = 'modules/lit/branches/b1/outputs/a.csv';
      const badOutput = 'modules/lit/branches/b2/outputs/b.csv';
      const goodContent = 'term,hits\nphosphat*,42\n';
      const badContent = 'term,hits\nphosphat*,7\n';
      writeIn(projectAuto, goodOutput, goodContent);
      writeIn(projectAuto, badOutput, badContent);

      const goodHandoffResult = runJson(projectAuto, [
        'handoff',
        'new',
        '--branch',
        'b1',
        '--stream',
        'search-a',
      ]);
      assertEqual(goodHandoffResult.code, 0, `handoff new A 退出码应 0：${goodHandoffResult.out} ${goodHandoffResult.err}`);
      const goodHandoff = goodHandoffResult.data.handoff.path;
      const badHandoffResult = runJson(projectAuto, [
        'handoff',
        'new',
        '--branch',
        'b2',
        '--stream',
        'search-b',
      ]);
      assertEqual(badHandoffResult.code, 0, `handoff new B 退出码应 0：${badHandoffResult.out} ${badHandoffResult.err}`);
      const badHandoff = badHandoffResult.data.handoff.path;

      writeHandoffBodyAt(projectAuto, goodHandoff, fullSections, [{ path: goodOutput, note: '检索 A' }]);
      writeHandoffBodyAt(projectAuto, badHandoff, fullSections, [{ path: badOutput, note: '检索 B' }]);
      assertEqual(runJson(projectAuto, ['submit', goodHandoff]).code, 0, 'submit A 应成功');
      assertEqual(runJson(projectAuto, ['submit', badHandoff]).code, 0, 'submit B 应成功');

      // 篡改 B 的 outputs 文件 → 清单哈希失败
      writeIn(projectAuto, badOutput, 'term,hits\nphosphat*,999\n');

      const ledgerBefore = readIn(projectAuto, 'control/ledger.json');
      const stateBefore = readIn(projectAuto, 'control/PROJECT_STATE.json');
      const dryRun = runJson(projectAuto, ['auto', '--dry-run']);
      assertEqual(dryRun.code, 0, `auto --dry-run 退出码应 0：${dryRun.out} ${dryRun.err}`);
      assertEqual(dryRun.data.ok, true, 'dry-run ok');
      assertEqual(dryRun.data.dryRun, true, 'dry-run 标记');
      assertEqual(dryRun.data.accepted.length, 1, 'dry-run 报告将接受 1 条');
      assertEqual(dryRun.data.skipped.length, 1, 'dry-run 报告跳过 1 条');
      assertEqual(dryRun.data.skipped[0].code, 'DAG-E005', 'dry-run 跳过原因 DAG-E005');
      assertEqual(readIn(projectAuto, 'control/ledger.json'), ledgerBefore, 'dry-run 不写 ledger');
      assertEqual(
        readIn(projectAuto, 'control/PROJECT_STATE.json'),
        stateBefore,
        'dry-run 不写 PROJECT_STATE.json',
      );
      assertEqual(metaIn(projectAuto, goodHandoff).status, 'PROVISIONAL', 'dry-run 后全绿项仍 PROVISIONAL');

      const autoResult = runJson(projectAuto, ['auto']);
      assertEqual(autoResult.code, 0, `auto 退出码应 0：${autoResult.out} ${autoResult.err}`);
      assertEqual(autoResult.data.ok, true, 'auto ok');
      assertEqual(autoResult.data.dryRun, false, 'auto dryRun=false');
      assertEqual(autoResult.data.accepted.length, 1, 'auto 接受 1 条');
      assertEqual(autoResult.data.skipped.length, 1, 'auto 跳过 1 条');
      assertEqual(autoResult.data.accepted[0].path, goodHandoff, 'auto 接受全绿项');
      assertEqual(autoResult.data.accepted[0].module, 'lit', 'accepted.module');
      assertEqual(autoResult.data.accepted[0].branch, 'b1', 'accepted.branch');
      assertEqual(autoResult.data.accepted[0].stream, 'search-a', 'accepted.stream');
      assertEqual(autoResult.data.accepted[0].version, 1, 'accepted.version');
      assertEqual(autoResult.data.skipped[0].path, badHandoff, 'skipped.path');
      assertEqual(autoResult.data.skipped[0].code, 'DAG-E005', 'skipped.code');

      const goodMeta = metaIn(projectAuto, goodHandoff);
      assertEqual(goodMeta.status, 'ACCEPTED', 'auto 后全绿项 ACCEPTED');
      assertEqual(goodMeta.decision_reason, '自动通过：verify 全绿', 'auto 理由固定');
      assertEqual(metaIn(projectAuto, badHandoff).status, 'PROVISIONAL', 'auto 后失败项仍 PROVISIONAL');

      const autoLedger = JSON.parse(readIn(projectAuto, 'control/ledger.json'));
      const goodEntry = autoLedger.handoffs.find((entry) => entry.path === goodHandoff);
      assertEqual(goodEntry.events[goodEntry.events.length - 1].action, 'ACCEPT', 'auto 写 ACCEPT 事件');
      assertEqual(goodEntry.events[goodEntry.events.length - 1].by, 'auto', 'auto 事件 by=auto');
      assert(
        readIn(projectAuto, 'control/DECISIONS.md').includes('- 动作: ACCEPT'),
        'auto 写 DECISIONS ACCEPT 条目',
      );

      // 失败项修复后 verify 通过（PROVISIONAL 不阻塞自动门控）
      writeIn(projectAuto, badOutput, badContent);
      const verified = runJson(projectAuto, ['verify']);
      assertEqual(verified.code, 0, `修复后 verify 应通过：${JSON.stringify(verified.data.issues)}`);
    });

    scenario(19, 'results --json 契约：按 module+stream 汇总最新 ACCEPTED，与磁盘一致', () => {
      const projectAuto = path.join(base, 'proj-auto');
      const response = runJson(projectAuto, ['results']);
      assertEqual(response.code, 0, `results 退出码应 0：${response.out} ${response.err}`);
      const data = response.data;
      assertEqual(data.ok, true, 'results.ok');
      assertEqual(data.project.id, 'auto-project', 'project.id');
      assertEqual(data.project.phase, 'planning', 'project.phase');
      assert(Array.isArray(data.modules) && data.modules.length === 1, 'modules 数量');
      assertEqual(data.modules[0].id, 'lit', 'modules[0].id');
      assertEqual(data.modules[0].name, '文献检索', 'modules[0].name');

      assert(Array.isArray(data.results) && data.results.length === 1, 'results 数量 = 1');
      const result = data.results[0];
      assertEqual(result.module, 'lit', 'result.module');
      assertEqual(result.moduleName, '文献检索', 'result.moduleName');
      assertEqual(result.branch, 'b1', 'result.branch');
      assertEqual(result.stream, 'search-a', 'result.stream');
      assertEqual(result.version, 1, 'result.version');
      assertEqual(result.title, '检索 A', 'result.title = 分支显示名');
      assert(result.question.length > 0, 'result.question 非空');
      assert(result.keyResults.includes('SMD'), 'result.keyResults 来自第 4 节');
      assert(result.limitations.includes('样本量有限'), 'result.limitations 来自第 6 节');
      assert(
        Array.isArray(result.files) && result.files[0] === 'modules/lit/branches/b1/outputs/a.csv',
        'result.files = 清单路径数组',
      );
      assertEqual(result.path, 'modules/lit/handoffs/HANDOFF-b1-v1.md', 'result.path');
      assert(
        typeof result.decidedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(result.decidedAt),
        'result.decidedAt 为日期',
      );

      assert(Array.isArray(data.pending) && data.pending.length === 1, 'pending 数量 = 1');
      assertEqual(data.pending[0].path, 'modules/lit/handoffs/HANDOFF-b2-v1.md', 'pending.path');
      assertEqual(data.pending[0].module, 'lit', 'pending.module');
      assertEqual(data.pending[0].branch, 'b2', 'pending.branch');
      assertEqual(data.pending[0].stream, 'search-b', 'pending.stream');
      assertEqual(data.pending[0].version, 1, 'pending.version');
      assertEqual(data.pending[0].question, fullSections[1], 'pending.question = 第 1 节首行');

      assert(Array.isArray(data.attention), 'attention 是数组');
      assertEqual(data.attention.length, 0, 'attention = 0（verify 全绿）');
      assertEqual(data.counts.modules, 1, 'counts.modules');
      assertEqual(data.counts.results, 1, 'counts.results');
      assertEqual(data.counts.pending, 1, 'counts.pending');
      assertEqual(data.counts.draft, 0, 'counts.draft');
      assertEqual(data.counts.blocked, 0, 'counts.blocked');

      const human = run(projectAuto, ['results']);
      assertEqual(human.code, 0, 'results 人类模式退出码 0');
      assert(
        human.out.includes('文献检索：已出结果 1 · 待确认 1'),
        `results 人类输出按模块分组：${human.out}`,
      );
      assert(human.out.includes('[search-a v1]'), 'results 人类输出含结果行');
      assert(human.out.includes('待确认 [search-b v1]'), 'results 人类输出含待确认行');
    });

    out(`selftest 通过：${passed}/${total}`);
    return EXIT.OK;
  } catch (error) {
    if (!/^FAIL /.test(String(error && error.message))) {
      /* 场景内已打印 FAIL，这里只补总结 */
    }
    err(`selftest 失败（${passed}/${total} 通过，失败场景：${current}）`);
    return EXIT.INVALID;
  } finally {
    try {
      fs.rmSync(base, { recursive: true, force: true });
    } catch {
      /* 清理失败不影响结果 */
    }
  }
}

// ---------------------------------------------------------------------------
// 直接执行入口
// ---------------------------------------------------------------------------

function isDirectInvocation() {
  try {
    if (!process.argv[1]) return false;
    const invoked = fs.realpathSync(path.resolve(process.argv[1]));
    const self = fs.realpathSync(path.resolve(SCRIPT_FILE));
    return invoked.toLowerCase() === self.toLowerCase();
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  process.exitCode = runCli(process.argv.slice(2));
}
