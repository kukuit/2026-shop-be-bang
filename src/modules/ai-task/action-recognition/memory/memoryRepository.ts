import 'server-only'
import { createHash } from 'node:crypto'
import { userRoot, row } from '@/app/demo/ai-task/_services/repository'
import { normalizePattern } from '../normalizePattern'
import type { PersonalIntentPattern } from '../types'
export const memoryRoot = (uid: string) =>
  userRoot(uid).collection('assistantMemory').doc('actionRecognition')
export const patternId = (text: string) =>
  createHash('sha256').update(normalizePattern(text)).digest('hex')
export async function loadIntentPattern(uid: string, text: string) {
  const doc = await memoryRoot(uid).collection('intentPatterns').doc(patternId(text)).get()
  return doc.exists ? row<PersonalIntentPattern>(doc) : undefined
}
