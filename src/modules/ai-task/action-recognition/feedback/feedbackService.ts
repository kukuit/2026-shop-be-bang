import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { idSchema } from '@/app/demo/ai-task/_lib/model'
import { messageCollection, row } from '@/app/demo/ai-task/_services/repository'
import { memoryRoot, patternId } from '../memory/memoryRepository'
import { updateIntentPattern } from '../memory/intentMemory'
import { normalizePattern } from '../normalizePattern'
import type { PersonalIntentPattern, RecognitionRecord, TaskAction } from '../types'

/** Learns only from committed server messages; UID comes from authenticated route. */
export async function learnFromTurn(
  uid: string,
  messageId: string,
  kind: 'correction' | 'confirmation'
) {
  idSchema.parse(messageId)
  await getAdminDb().runTransaction(async (tx) => {
    const turn = await tx.get(messageCollection(uid).doc(messageId))
    const record = turn.get('recognition') as RecognitionRecord | undefined
    if (!record || (kind === 'confirmation' && turn.get('status') !== 'confirmed')) return
    if (kind === 'correction' && !record.correctionOf) return
    const eventRef = memoryRoot(uid)
      .collection(kind === 'correction' ? 'correctionEvents' : 'confirmationEvents')
      .doc(messageId)
    if ((await tx.get(eventRef)).exists) return
    let predicted: TaskAction | undefined
    let originalText = record.originalText
    let predictedConfidence = record.result.confidence
    if (kind === 'correction') {
      const previous = await tx.get(messageCollection(uid).doc(idSchema.parse(record.correctionOf)))
      const original = previous.get('recognition') as RecognitionRecord | undefined
      if (!original || original.result.action === record.result.action) return
      predicted = original.result.action
      predictedConfidence = original.result.confidence
      originalText = original.originalText
    }
    const ref = memoryRoot(uid).collection('intentPatterns').doc(patternId(originalText))
    const snapshot = await tx.get(ref)
    const pattern = normalizePattern(originalText)
    const proposal = turn.get('proposal')
    const finalAction =
      kind === 'confirmation' && proposal?.before && proposal.data.status !== proposal.before.status
        ? proposal.data.status === 'done'
          ? 'task.complete'
          : proposal.data.status === 'cancelled'
            ? 'task.cancel'
            : record.result.action
        : record.result.action
    if (finalAction !== record.result.action) predicted = record.result.action
    const learned = updateIntentPattern(
      snapshot.exists ? row<PersonalIntentPattern>(snapshot) : undefined,
      pattern,
      originalText,
      finalAction,
      predicted
    )
    const now = FieldValue.serverTimestamp()
    tx.set(ref, {
      ...learned,
      createdAt: snapshot.get('createdAt') || now,
      updatedAt: now,
      lastUsedAt: now,
    })
    tx.set(eventRef, {
      originalText,
      normalizedPattern: pattern,
      ...(predicted ? { predictedAction: predicted } : {}),
      correctedAction: finalAction,
      predictedConfidence,
      createdAt: now,
    })
  })
}
export async function learnSafely(
  uid: string,
  messageId: string,
  kind: 'correction' | 'confirmation'
) {
  try {
    await learnFromTurn(uid, messageId, kind)
  } catch {
    console.warn('[action-recognition] Feedback could not be saved; task outcome is unchanged.')
  }
}
