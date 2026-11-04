import fs from 'node:fs'
const p = 'package.json'
const data = JSON.parse(fs.readFileSync(p, 'utf8'))
data.version = '3.10.0'
fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log('package.json version ->', data.version)
