#!/usr/bin/env node
/**
 * 项目流程图离线预览：把 src/views/FishboneView.js 的 SVG 用真实项目数据渲染成独立 HTML。
 *
 * 目的：把「主支看不到」这类视觉问题变成可截图核对的产物，而不是靠猜。
 * 用法：node tools/preview-fishbone.mjs [项目根路径]
 * 产出：workbench/.preview/fishbone-preview.html
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(HERE, '..')
const OUT_DIR = path.join(PACKAGE_ROOT, '.preview')

/** 迷你 React shim：只需要 createElement，把元素树转成 HTML 字符串。 */
function createShim() {
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link'])
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const SVG_TAGS = new Set([
    'svg', 'g', 'line', 'circle', 'polygon', 'path', 'text', 'rect', 'defs',
    'linearGradient', 'stop', 'title', 'polyline', 'ellipse', 'tspan',
  ])

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function styleToString(style) {
    if (!style || typeof style !== 'object') return ''
    return Object.entries(style)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        const name = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
        return `${name}: ${value}`
      })
      .join('; ')
  }

  function render(node) {
    if (node === null || node === undefined || node === false || node === true) return ''
    if (typeof node === 'string' || typeof node === 'number') return esc(node)
    if (Array.isArray(node)) return node.map(render).join('')
    if (typeof node !== 'object' || !node.type) return ''

    const { type, props = {}, key } = node
    const children = props.children
    delete props.children
    delete props.key

    const attrs = []
    for (const [name, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue
      if (name === 'style') {
        const css = styleToString(value)
        if (css) attrs.push(`style="${esc(css)}"`)
        continue
      }
      if (name === 'onClick' || name === 'onKeyDown' || name === 'onChange') {
        attrs.push(`data-handler="${esc(name)}"`)
        continue
      }
      if (value === true) {
        attrs.push(esc(name))
        continue
      }
      attrs.push(`${esc(name)}="${esc(value)}"`)
    }
    if (key !== undefined) attrs.push(`data-key="${esc(key)}"`)

    const attrText = attrs.length ? ` ${attrs.join(' ')}` : ''
    if (VOID.has(type)) return `<${type}${attrText}>`
    return `<${type}${attrText}>${render(children)}</${type}>`
  }

  return {
    createElement: (type, props, ...children) => {
      const merged = Object.assign({}, props || {})
      if (children.length === 1) merged.children = children[0]
      else if (children.length > 1) merged.children = children
      return { type, props: merged }
    },
    Fragment: (props) => props,
  }
}

async function main() {
  const projectRoot = process.argv[2] || path.resolve(PACKAGE_ROOT, '..', 'examples', 'early-phosphate')
  const port = process.argv[3] || process.env.DSH_PORT || '56008'

  // 1) 从运行中的 DSH 宿主拉取真实 /fishbone 数据（最高保真）
  const url = `http://127.0.0.1:${port}/research-dag-workbench/fishbone?project=${encodeURIComponent(projectRoot)}`
  let data = null
  try {
    const res = await fetch(url)
    data = await res.json()
  } catch (problem) {
    console.error(`无法从 DSH 宿主（端口 ${port}）读取 /fishbone：${problem.message}`)
    console.error('请确认 DSH 正在运行，或用参数指定端口：node tools/preview-fishbone.mjs <项目根> <端口>')
    process.exitCode = 2
    return
  }
  if (!data || data.ok === false) {
    console.error(`宿主返回异常：${JSON.stringify(data).slice(0, 300)}`)
    process.exitCode = 2
    return
  }

  // 2) 渲染真实视图
  const viewUrl = pathToFileURL(path.join(PACKAGE_ROOT, 'src', 'views', 'FishboneView.js')).href
  const view = await import(viewUrl)
  const React = createShim()
  const tree = view.renderFishboneView(React.createElement, {
    fishbone: data,
    loading: false,
    error: '',
    busy: '',
  })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outFile = path.join(OUT_DIR, 'fishbone-preview.html')
  const emptyTree = view.renderFishboneView(React.createElement, {
    fishbone: Object.assign({}, data, { spine: [], ribs: [], head: data.head, totals: { modules: 0, ribs: 0, accepted: 0 } }),
    loading: false,
    error: '',
    busy: '',
  })
  // 就地渲染会修改元素树：先各渲染一次，存成字符串
  const bodyWide = renderToHtml(tree)
  const bodyEmpty = renderToHtml(emptyTree)
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>项目流程图预览 — ${path.basename(projectRoot)}</title>
<style>
  body { margin: 0; padding: 20px; font: 13px/1.6 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #1f2937; background: #fff; }
  .wrap { max-width: 1200px; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  /* 模拟侧栏宽度：同时给出宽屏与窄侧栏两种容器 */
  .frame { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 20px; overflow: auto; }
  .frame h2 { font-size: 12px; color: #6b7280; margin: 0 0 8px; font-weight: 600; }
  .w1200 { width: 1200px; max-width: 100%; }
  .w520  { width: 520px; max-width: 100%; }
  .w380  { width: 380px; max-width: 100%; }
  svg { color: #111827; }
</style>
</head>
<body>
<div class="wrap">
  <h1>项目流程图预览（真实数据 · 真实渲染代码）</h1>
  <div class="meta">项目：${projectRoot}<br>主支 ${data.spine.length} 段 · 分支 ${data.ribs.length} 根</div>
  <div class="frame w1200"><h2>容器 1200px（宽屏）</h2>${bodyWide}</div>
  <div class="frame w520"><h2>容器 520px（中等侧栏）</h2>${bodyWide}</div>
  <div class="frame w380"><h2>容器 380px（窄侧栏）</h2>${bodyWide}</div>
  <div class="frame w1200"><h2>空主支场景（没有模块时的引导）</h2>${bodyEmpty}</div>
</div>
</body>
</html>
`
  fs.writeFileSync(outFile, html, 'utf8')
  console.log(`已生成预览：${outFile}`)
  console.log(`主支 ${data.spine.length} 段 · 分支 ${data.ribs.length} 根`)
}

/** 把元素树渲染成 HTML 字符串。 */
function renderToHtml(node) {
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link'])
  const esc = (value) =>
    String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const styleToString = (style) =>
    Object.entries(style)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${v}`)
      .join('; ')

  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return esc(node)
  if (Array.isArray(node)) return node.map((child) => renderToHtml(child)).join('')
  if (typeof node !== 'object' || !node.type) return ''

  const { type, key } = node
  const sourceProps = node.props || {}
  const props = Object.assign({}, sourceProps)
  const children = props.children
  delete props.children
  delete props.key

  const attrs = []
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue
    if (name === 'style') {
      const css = styleToString(value)
      if (css) attrs.push(`style="${esc(css)}"`)
      continue
    }
    if (name.startsWith('on')) {
      attrs.push(`data-handler="${esc(name)}"`)
      continue
    }
    if (value === true) {
      attrs.push(esc(toAttrName(name)))
      continue
    }
    attrs.push(`${esc(toAttrName(name))}="${esc(value)}"`)
  }
  if (key !== undefined) attrs.push(`data-key="${esc(key)}"`)

  const attrText = attrs.length ? ` ${attrs.join(' ')}` : ''
  if (VOID.has(type)) return `<${type}${attrText}>`
  return `<${type}${attrText}>${renderToHtml(children)}</${type}>`
}

main().catch((problem) => {
  console.error(problem)
  process.exitCode = 1
})

/** React DOM 属性名转换：camelCase -> kebab-case，但保留 SVG 特殊名。
 *  不做这个转换会让 stopColor 变成 stopcolor，渐变失效，预览出现假象。 */
function toAttrName(name) {
  const keep = ['viewBox', 'preserveAspectRatio', 'gradientUnits', 'patternUnits', 'clipPathUnits', 'markerWidth', 'markerHeight', 'refX', 'refY', 'markerUnits', 'spreadMethod']
  if (keep.includes(name)) return name
  if (name === 'className') return 'class'
  if (name === 'htmlFor') return 'for'
  if (name.startsWith('data-') || name.startsWith('aria-')) return name
  if (name.startsWith('on')) return name
  return name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
}
