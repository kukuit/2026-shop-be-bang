const nextEnv = require('@next/env')
const { FieldValue } = require('firebase-admin/firestore')

const modes = new Set(['PER_SESSION', 'PER_HOUR'])
const validRate = value => Number.isSafeInteger(value) && value >= 0

function planSettingsPatch(settings) {
  const patch = {}
  if (!settings || settings.defaultPricingMode == null) patch.defaultPricingMode = 'PER_SESSION'
  if (!settings || settings.defaultSessionRate == null) patch.defaultSessionRate = 50_000
  if (!settings || settings.defaultHourlyRate == null) patch.defaultHourlyRate = 30_000
  return patch
}

function planStudentPatch(student) {
  const patch = {}
  if (!Object.hasOwn(student, 'pricingMode')) patch.pricingMode = 'PER_HOUR'
  if (!Object.hasOwn(student, 'sessionRate')) patch.sessionRate = null
  if (!Object.hasOwn(student, 'hourlyRate')) patch.hourlyRate = null
  return patch
}

function planSessionPatch(session, student, settings) {
  const patch = {}
  let mode = modes.has(session.pricingModeSnapshot)
    ? session.pricingModeSnapshot
    : validRate(session.hourlyRateSnapshot) ? 'PER_HOUR' : null
  let unitRate = validRate(session.unitRateSnapshot)
    ? session.unitRateSnapshot
    : mode === 'PER_HOUR' && validRate(session.hourlyRateSnapshot) ? session.hourlyRateSnapshot : null

  if (!mode || unitRate === null) {
    if (session.status !== 'COMPLETED' && session.feeAmount != null) patch.feeAmount = null
    return { patch, unresolvedPricing: true, completedMissingFee: false }
  }

  if (!modes.has(session.pricingModeSnapshot)) patch.pricingModeSnapshot = mode
  if (!validRate(session.unitRateSnapshot)) patch.unitRateSnapshot = unitRate
  if (!Object.hasOwn(session, 'pricingOverride')) {
    if (!student) patch.pricingOverride = true
    else {
      const studentMode = Object.hasOwn(student, 'pricingMode')
        ? student.pricingMode ?? settings.defaultPricingMode
        : 'PER_HOUR'
      const studentRate = studentMode === 'PER_SESSION'
        ? student.sessionRate ?? settings.defaultSessionRate
        : student.hourlyRate ?? settings.defaultHourlyRate
      patch.pricingOverride = mode !== studentMode || unitRate !== studentRate
    }
  }
  if (mode === 'PER_HOUR' && !validRate(session.hourlyRateSnapshot)) patch.hourlyRateSnapshot = unitRate
  if (session.status !== 'COMPLETED' && session.feeAmount != null) patch.feeAmount = null

  return {
    patch,
    unresolvedPricing: false,
    completedMissingFee: session.status === 'COMPLETED' && session.feeAmount == null,
  }
}

async function run() {
  const apply = process.argv.includes('--apply')
  const help = process.argv.includes('--help')
  if (help) {
    console.log('Usage: node scripts/migrate-teaching-pricing.cjs [--apply]\nDefaults to a read-only dry run. --apply writes only pricing fields; it never deletes records or recalculates completed fees.')
    return
  }

  nextEnv.loadEnvConfig(process.cwd())
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing FIREBASE_* environment variables')

  const { cert, getApps, initializeApp, deleteApp } = require('firebase-admin/app')
  const { getFirestore } = require('firebase-admin/firestore')
  const app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  try {
  const db = getFirestore(app)
  const users = await db.collection('demo').doc('ai-task').collection('users').get()
  const updates = []
  const summary = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    accountsScanned: users.size,
    settingsCreatedOrUpdated: 0,
    studentsUpdated: 0,
    sessionsUpdated: 0,
    completedFeeMissing: 0,
    unresolvedSessionPricing: [],
  }

  for (const user of users.docs) {
    const root = user.ref
    const [settingsDoc, studentsSnapshot, sessionsSnapshot] = await Promise.all([
      root.collection('teachingSettings').doc('default').get(),
      root.collection('students').get(),
      root.collection('teachingSessions').get(),
    ])
    const settingsData = settingsDoc.exists ? settingsDoc.data() : null
    const settingsPatch = planSettingsPatch(settingsData)
    const settings = { ...(settingsData || {}), ...settingsPatch }
    const hasTeachingRecords = studentsSnapshot.size > 0 || sessionsSnapshot.size > 0

    if (settingsDoc.exists && Object.keys(settingsPatch).length) {
      updates.push({ ref: settingsDoc.ref, patch: settingsPatch })
      summary.settingsCreatedOrUpdated++
    } else if (!settingsDoc.exists && hasTeachingRecords) {
      updates.push({
        ref: root.collection('teachingSettings').doc('default'),
        patch: { userId: user.id, ...settingsPatch, createdAt: FieldValue.serverTimestamp() },
      })
      summary.settingsCreatedOrUpdated++
    }

    const studentById = new Map()
    for (const studentDoc of studentsSnapshot.docs) {
      const data = studentDoc.data()
      studentById.set(studentDoc.id, { ...data, ...planStudentPatch(data) })
      const patch = planStudentPatch(data)
      if (Object.keys(patch).length) {
        updates.push({ ref: studentDoc.ref, patch })
        summary.studentsUpdated++
      }
    }

    for (const sessionDoc of sessionsSnapshot.docs) {
      const session = sessionDoc.data()
      const result = planSessionPatch(session, studentById.get(session.studentId), settings)
      if (Object.keys(result.patch).length) {
        updates.push({ ref: sessionDoc.ref, patch: result.patch })
        summary.sessionsUpdated++
      }
      if (result.completedMissingFee) summary.completedFeeMissing++
      if (result.unresolvedPricing) summary.unresolvedSessionPricing.push({ userId: user.id, sessionId: sessionDoc.id })
    }
  }

  console.log(JSON.stringify(summary, null, 2))
  if (apply) {
    for (let offset = 0; offset < updates.length; offset += 450) {
      const batch = db.batch()
      for (const update of updates.slice(offset, offset + 450)) batch.set(update.ref, update.patch, { merge: true })
      await batch.commit()
    }
    console.log(`Applied ${updates.length} non-destructive pricing backfills.`)
  }
  } finally {
    await deleteApp(app)
  }
}

module.exports = { planSettingsPatch, planStudentPatch, planSessionPatch }

if (require.main === module) {
  run().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
