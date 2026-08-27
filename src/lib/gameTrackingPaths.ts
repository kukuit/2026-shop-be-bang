import 'server-only'
import type { DocumentReference } from 'firebase-admin/firestore'
import { getAdminDb } from './firebaseAdmin'

const trackingRoot = () => getAdminDb().collection('shopbebangcom').doc('game')

export function userGameSessions(userId: string) {
  return trackingRoot().collection('user_sessions').doc(userId).collection('sessions')
}

export function guestGameSessions(guestId: string) {
  return trackingRoot().collection('guest_sessions').doc(guestId).collection('sessions')
}

export function gameSessionRef(input: {
  sessionId: string
  userId?: string
  guestId?: string
}): DocumentReference {
  if (input.userId) return userGameSessions(input.userId).doc(input.sessionId)
  if (input.guestId) return guestGameSessions(input.guestId).doc(input.sessionId)
  throw new Error('A game session requires userId or guestId')
}
