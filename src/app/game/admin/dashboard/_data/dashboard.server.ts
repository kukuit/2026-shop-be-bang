import 'server-only'

import { getAdminGameSessions, getAdminLearningProgress } from '@/lib/gameTrackingAdmin'
import type { AdminGameSession, AdminKeyProgress } from '@/lib/gameTrackingAdmin'
import type {
  GameEvidence,
  LearningStatus,
  SkillPerformance,
  Student,
  StudentRecord,
} from './types'

const LESSON_ID = 'toan-1-bai-1'
const SKILL_KEYS = Array.from({ length: 6 }, (_, index) => `recognize-number-${index}`)
const accuracyOf = (correct: number, attempts: number) =>
  attempts > 0 ? Math.round((correct / attempts) * 100) : 0
const statusOf = (accuracy: number, attempts: number): LearningStatus =>
  !attempts
    ? 'no_data'
    : accuracy >= 80
      ? 'mastered'
      : accuracy >= 70
        ? 'practicing'
        : 'needs_practice'

function gameEvidence(sessions: AdminGameSession[]): GameEvidence[] {
  const groups = new Map<string, AdminGameSession[]>()
  sessions.forEach((session) =>
    groups.set(session.gameId, [...(groups.get(session.gameId) ?? []), session])
  )
  return Array.from(groups, ([gameId, items]) => {
    const sorted = [...items].sort((a, b) =>
      (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
    )
    const correct = items.reduce((sum, item) => sum + item.correctCount, 0)
    const total = items.reduce((sum, item) => sum + item.totalQuestions, 0)
    return {
      gameId,
      attempts: items.length,
      correct,
      total,
      accuracy: accuracyOf(correct, total),
      bestScore: Math.max(
        ...items.map((item) => accuracyOf(item.correctCount, item.totalQuestions))
      ),
      latestScore: accuracyOf(sorted[0].correctCount, sorted[0].totalQuestions),
    }
  })
}

function skillPerformanceOf(
  keys: Record<string, AdminKeyProgress>
): Record<string, SkillPerformance> {
  return Object.fromEntries(
    SKILL_KEYS.flatMap((key) => {
      const item = keys[key]
      return item?.attempts
        ? [
            [
              key,
              {
                attempts: item.attempts,
                correct: item.correct,
                accuracy: accuracyOf(item.correct, item.attempts),
              },
            ],
          ]
        : []
    })
  )
}

export async function getRealDashboardData(): Promise<{
  students: Student[]
  records: StudentRecord[]
}> {
  const [progressRows, sessions] = await Promise.all([
    getAdminLearningProgress(),
    getAdminGameSessions(100),
  ])
  const userIds = Array.from(
    new Set(
      [...progressRows.map((row) => row.userId), ...sessions.map((row) => row.userId)].filter(
        Boolean
      )
    )
  )
  const students: Student[] = userIds.map((id) => ({
    id,
    name: id === 'be-bang-test' ? 'Băng' : id,
    avatar: id.charAt(0).toUpperCase(),
    currentGrade: 1,
  }))
  if (!students.length)
    students.push({ id: 'be-bang-test', name: 'Băng', avatar: 'B', currentGrade: 1 })

  const records = students.map<StudentRecord>((student) => {
    const progress = progressRows.find(
      (row) => row.userId === student.id && row.lessonId === LESSON_ID
    )
    const lessonSessions = sessions.filter(
      (row) => row.userId === student.id && row.lessonId === LESSON_ID
    )
    const skills = skillPerformanceOf(progress?.keys ?? {})
    const values = Object.values(skills)
    const attempts = values.reduce((sum, item) => sum + item.attempts, 0)
    const correct = values.reduce((sum, item) => sum + item.correct, 0)
    const score = accuracyOf(correct, attempts)
    const status = statusOf(score, attempts)
    return {
      studentId: student.id,
      grade: 1,
      lessons: [
        {
          id: LESSON_ID,
          order: 1,
          grade: 1,
          subjectId: 'math',
          title: 'Nhận biết số từ 0 đến 5',
          progress: score,
          objectives: [
            {
              id: 'recognize-numbers-0-5',
              title: 'Nhận biết số từ 0 đến 5',
              score,
              status,
              trend: status === 'no_data' ? 'Chưa có dữ liệu' : 'Đã ghi nhận',
              skillPerformance: skills,
              games: gameEvidence(lessonSessions),
            },
          ],
        },
      ],
      recentActivities: lessonSessions
        .slice(0, 5)
        .map((session) => ({
          id: session.id,
          gameId: session.gameId,
          subjectId: 'math',
          lessonId: LESSON_ID,
          score: accuracyOf(session.correctCount, session.totalQuestions),
          correct: session.correctCount,
          total: session.totalQuestions,
          when: session.completedAt
            ? new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'Asia/Bangkok',
              }).format(new Date(session.completedAt))
            : 'Vừa hoàn thành',
        })),
    }
  })
  return { students, records }
}
