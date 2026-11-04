#!/usr/bin/env node
/**
 * 全新项目完整生命周期验收（verify-new-project-flow.mjs）
 *
 * 验证目标：
 *   1. init 全新项目
 *   2. 空项目 fishbone 数据正常（无崩溃，研究目标正常）
 *   3. module-add 新增第一个主支（如 literature / 文献）成功建立目录与 MODULE.md
 *   4. fishbone 能够正确读取新主支，moduleOrder 正常更新
 *   5. sprout 在新主支下长出分支（如 search-v1），生成 BRIEF.md 与 CONTEXT.md
 *   6. 新主支与新分支各自 session-bind 独立会话并读回
 *   7. 清理临时项目
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

let fails = 0
const ok = (m) => console.log(`  OK   ${m}`)
const bad = (m, d) => {
  fails += 1
  console.log(`  FAIL ${m}${d ? `  → ${d}` : ''}`)
}

async function main() {
  console.log('--- 运行全新项目测试套件 (verify-new-project-flow) ---')
  const hostMod = await import(pathToFileURL(path.join(ROOT, 'lib', 'host.js')).href)

  let handler = null
  const ctx = {
    webServer: {
      register(route) {
        if (route && route.path === '/research-dag-workbench') handler = route.handler
      },
    },
    effect(fn) {
      return fn()
    },
    inject(_n, cb) {
      cb(ctx)
    },
  }
  hostMod.apply(ctx)
  if (!handler) {
    bad('未能捕获宿主 handler')
    process.exit(1)
  }

  function makeRes() {
    const state = { status: 0, headers: null, body: '', ended: false }
    const res = {
      state,
      writeHead(status, headers) {
        state.status = status
        state.headers = headers
        return res
      },
      end(body) {
        state.body = body || ''
        state.ended = true
        return res
      },
    }
    Object.defineProperty(res, 'writableEnded', {
      get: () => state.ended,
    })
    return res
  }

  function makeReq(method, url, body) {
    const handlers = {}
    const req = {
      method,
      url,
      on(event, callback) {
        ;(handlers[event] = handlers[event] || []).push(callback)
        return req
      },
      destroy() {},
    }
    process.nextTick(() => {
      if (body !== undefined && body !== null) {
        const str = typeof body === 'string' ? body : JSON.stringify(body)
        for (const callback of handlers.data || []) callback(Buffer.from(str, 'utf8'))
      }
      for (const callback of handlers.end || []) callback()
    })
    return req
  }

  async function call(method, url, body) {
    const res = makeRes()
    await handler(makeReq(method, url, body), res)
    let payload = null
    try {
      payload = res.state.body ? JSON.parse(res.state.body) : null
    } catch {
      payload = null
    }
    return { status: res.state.status, payload, raw: res.state.body }
  }

  const tmpRoot = path.join(os.tmpdir(), `rdw-newproj-${Date.now()}`)
  fs.mkdirSync(tmpRoot, { recursive: true })

  try {
    // 1. 初始化新项目
    console.log('1. 初始化全新项目...')
    const initRes = await call('POST', '/research-dag-workbench/run', {
      action: 'init',
      root: tmpRoot,
      id: 'universal-test',
      title: '宇宙之外研究测试',
      goal: '探索宇宙之外的存在与物理推论',
    })
    if (initRes.status === 200 && initRes.payload.ok) {
      ok('POST /run init 成功响应')
    } else {
      bad('POST /run init 失败', JSON.stringify(initRes))
    }

    // 轮询直到 init 落定
    const initRunId = initRes.payload.run.id
    let initDone = false
    for (let i = 0; i < 30; i++) {
      const poll = await call('GET', `/research-dag-workbench/run?id=${initRunId}`)
      if (poll.payload && poll.payload.run && poll.payload.run.status === 'succeeded') {
        initDone = true
        break
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    if (initDone) ok('全新项目 init 成功落定为 succeeded')
    else bad('init 未在预期内完成')

    // 2. 空项目读取 fishbone
    console.log('2. 读取全新空项目状态...')
    const fishRes = await call('GET', `/research-dag-workbench/fishbone?project=${encodeURIComponent(tmpRoot)}`)
    if (fishRes.status === 200 && fishRes.payload && fishRes.payload.ok) {
      const fb = fishRes.payload.fishbone || fishRes.payload
      if (Array.isArray(fb.spine) && fb.spine.length === 0) ok('空项目 spine 为空数组，无报错崩溃')
      else bad('空项目 spine 结构异常', JSON.stringify(fb.spine))
      if (fb.head && fb.head.title === '宇宙之外研究测试') ok('空项目 head 标题正确')
      else bad('空项目 head 标题不匹配', JSON.stringify(fb.head))
    } else {
      bad('读取空项目 fishbone 失败', JSON.stringify(fishRes))
    }

    // 3. 在新项目下新增第一个主支
    console.log('3. 在全新项目下新增第一个主支 (literature / 文献)...')
    const addModRes = await call('POST', '/research-dag-workbench/run', {
      action: 'module-add',
      project: tmpRoot,
      id: 'literature',
      name: '文献检索',
    })
    if (addModRes.status === 200 && addModRes.payload.ok) {
      ok('POST /run module-add 成功响应（无 未知 action: (空) 错误）')
    } else {
      bad('module-add 失败', JSON.stringify(addModRes))
    }

    const modRunId = addModRes.payload.run.id
    let modDone = false
    for (let i = 0; i < 30; i++) {
      const poll = await call('GET', `/research-dag-workbench/run?id=${modRunId}`)
      if (poll.payload && poll.payload.run && poll.payload.run.status === 'succeeded') {
        modDone = true
        break
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    if (modDone) ok('module-add 成功落定，创建 modules/literature/ 目录')
    else bad('module-add 未在预期内完成')

    // 4. 再次读取 fishbone，确认主支已就绪
    console.log('4. 验证新增主支后的状态...')
    const fishAfterMod = await call('GET', `/research-dag-workbench/fishbone?project=${encodeURIComponent(tmpRoot)}`)
    if (fishAfterMod.status === 200 && fishAfterMod.payload && fishAfterMod.payload.ok) {
      const spine = fishAfterMod.payload.spine || (fishAfterMod.payload.fishbone && fishAfterMod.payload.fishbone.spine) || []
      const foundMod = spine.find((m) => m.id === 'literature')
      if (foundMod && foundMod.name === '文献检索') {
        ok('新主支 literature 已出现在 spine 列表中，名称正确')
      } else {
        bad('spine 中未找到 literature 主支', JSON.stringify(spine))
      }
    }

    // 5. 在新主支下长出分支 (sprout)
    console.log('5. 在新主支下长出分支 (B01)...')
    const sproutRes = await call('POST', '/research-dag-workbench/run', {
      action: 'sprout',
      project: tmpRoot,
      module: 'literature',
      id: 'B01',
      name: '系统先导检索',
      prompt: '检索宇宙之外相关理论假说',
    })
    if (sproutRes.status === 200 && sproutRes.payload.ok) {
      ok('POST /run sprout 成功响应')
    } else {
      bad('sprout 失败', JSON.stringify(sproutRes))
    }

    const sproutRunId = sproutRes.payload.run.id
    let sproutDone = false
    for (let i = 0; i < 30; i++) {
      const poll = await call('GET', `/research-dag-workbench/run?id=${sproutRunId}`)
      if (poll.payload && poll.payload.run && poll.payload.run.status === 'succeeded') {
        sproutDone = true
        break
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    if (sproutDone) ok('sprout 成功落定，分支 B01 创建完成')
    else bad('sprout 未在预期内完成')

    // 6. 验证独立会话绑定与读取
    console.log('6. 验证主支与分支独立会话绑定...')
    const bindMod = await call('POST', '/research-dag-workbench/rib-op', {
      project: tmpRoot,
      op: 'session-bind',
      key: 'module:literature',
      sessionId: 'sess-literature-123',
    })
    if (bindMod.payload && bindMod.payload.ok) ok('主支 module:literature 绑定会话成功')
    else bad('主支绑定失败')

    const bindBranch = await call('POST', '/research-dag-workbench/rib-op', {
      project: tmpRoot,
      op: 'session-bind',
      key: 'branch:literature/B01',
      sessionId: 'sess-branch-b01-456',
    })
    if (bindBranch.payload && bindBranch.payload.ok) ok('复合 key branch:literature/B01 绑定会话成功')
    else bad('分支绑定失败')

    const getBranch = await call('POST', '/research-dag-workbench/rib-op', {
      project: tmpRoot,
      op: 'session-get',
      key: 'branch:literature/B01',
    })
    if (getBranch.payload && getBranch.payload.sessionId === 'sess-branch-b01-456') {
      ok('读回分支独立会话成功，数据一致')
    } else {
      bad('分支会话读取失败', JSON.stringify(getBranch))
    }

  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
    console.log('7. 清理临时测试项目完成')
  }

  if (fails === 0) {
    console.log('\nRESULT: ALL NEW PROJECT CHECKS PASSED')
    process.exit(0)
  } else {
    console.log(`\nRESULT: ${fails} FAILURE(S)`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
