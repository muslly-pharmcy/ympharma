import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npm = isWindows ? 'npm.cmd' : 'npm'
const npx = isWindows ? 'npx.cmd' : 'npx'
const lighthouse = join('node_modules', '.bin', isWindows ? 'lighthouse.cmd' : 'lighthouse')

function run(command, args, { allowFailure = false } = {}) {
  const invocation = isWindows
    ? {
        command: process.env.ComSpec ?? 'cmd.exe',
        args: ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArgument).join(' ')],
      }
    : { command, args }
  const result = spawnSync(invocation.command, invocation.args, { stdio: 'inherit' })
  if (result.error) {
    console.error(`Failed to start ${command}: ${result.error.message}`)
    return false
  }
  if (result.status === 0) return true
  if (!allowFailure) console.error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  return false
}

function quoteWindowsArgument(value) {
  if (!/[\s"]/u.test(value)) return value
  return `"${value.replace(/(\\*)"/gu, '$1$1\\"').replace(/(\\*)$/u, '$1$1')}"`
}

console.log('MUSLLY production hardening repair')

run(npx, ['eslint', '.', '--fix'], { allowFailure: true })

let lighthouseAvailable = existsSync(lighthouse)
if (!lighthouseAvailable) {
  console.log('Lighthouse is not installed; attempting a development dependency install.')
  lighthouseAvailable = run(npm, ['install', '-D', 'lighthouse', '--legacy-peer-deps']) && existsSync(lighthouse)
}

run(npm, ['audit', 'fix', '--legacy-peer-deps'], { allowFailure: true })

const checks = [
  ['typecheck', npx, ['tsc', '--noEmit']],
  ['lint', npm, ['run', 'lint']],
  ['tests', npm, ['run', 'test']],
  ['build', npm, ['run', 'build']],
  ['audit', npm, ['audit', '--audit-level=moderate']],
]

let passed = lighthouseAvailable
for (const [name, command, args] of checks) {
  console.log(`\nRunning ${name}...`)
  passed = run(command, args) && passed
}

if (!lighthouseAvailable) console.error('Lighthouse remains unavailable; check the npm network connection and retry.')
process.exitCode = passed ? 0 : 1
