import 'server-only'
import { getAdminDb } from '@/lib/firebaseAdmin'
import type { SubjectId } from './config'

export const subjectProgressRef = (userId: string, grade: number, subject: SubjectId) =>
  getAdminDb().collection('shopbebangcom').doc('users').collection('users').doc(userId)
    .collection('subjectProgress').doc(`${subject}-${grade}`)

// Reuse the existing per-user/per-lesson aggregate, without duplicating goal data.
export const lessonGoalProgressRef = (userId: string, lessonId: string) =>
  getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress').doc(`${userId}_${lessonId}`)
