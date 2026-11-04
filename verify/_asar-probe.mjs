/**
 * 在 asar 副本里按关键词找代码上下文（实证宿主 API 用）。
 * 用法：node verify/_asar-probe.mjs <asar副本> <关键词> <输出文件> [前后字符数]
 */
import { createReadStream, writeFileSync } from 'node:fs'

const ASAR = process.argv[2]
const NEEDLE = process.argv[3]
const OUT = process.argv[4] || 'scan.txt'
const PAD = Number(process.argv[5] || 1200)

let carry = Buffer.alloc(0)
const hits = []
const stream = createReadStream(ASAR, { highWaterMark: 8 * 1024 * 1024 })
stream.on('data', (buf) => {
  const hay = carry.length ? Buffer.concat([carry, buf]) : buf
  let idx = hay.indexOf(NEEDLE)
  while (idx >= 0) {
    hits.push(hay.slice(Math.max(0, idx - PAD), idx + PAD).toString('utf8'))
    idx = hay.indexOf(NEEDLE, idx + 1)
  }
  carry = hay.slice(Math.max(0, hay.length - NEEDLE.length - PAD))
})
stream.on('end', () => {
  console.log(`「${NEEDLE}」命中 ${hits.length} 次 → ${OUT}`)
  writeFileSync(OUT, hits.map((t, i) => `\n===== hit #${i + 1} =====\n${t}`).join('\n'), 'utf8')
})
