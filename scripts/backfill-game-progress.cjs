const nextEnv = require('@next/env')
const createLoader = require('./lib/load-project-ts.cjs')

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('Usage: node scripts/backfill-game-progress.cjs --user-id USER_ID [--apply]\nDefaults to a read-only dry run. Existing sessions and auth are never modified.')
  process.exit(0)
}
const index = args.indexOf('--user-id')
const userId = index >= 0 ? args[index + 1] : ''
if (!/^[a-zA-Z0-9_-]{1,200}$/.test(userId || '')) throw new Error('Pass an explicit --user-id USER_ID')
const apply = args.includes('--apply')
nextEnv.loadEnvConfig(process.cwd())
const load = createLoader()
;(async () => {
  try {
    const { rebuildUserProgress } = load('src/lib/game-progress/backfill.ts')
    console.log(JSON.stringify(await rebuildUserProgress(userId, apply), null, 2))
  } finally {
    const { getApps, deleteApp } = require('firebase-admin/app')
    await Promise.all(getApps().map(app => deleteApp(app)))
  }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
