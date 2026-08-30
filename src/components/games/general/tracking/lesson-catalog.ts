import { TOAN_1_BAI_1 } from '@/app/game/lop-1/toan/bai-1/lesson'
import { TOAN_1_BAI_2 } from '@/app/game/lop-1/toan/bai-2/lesson'

export const LESSON_CATALOG = {
  [TOAN_1_BAI_1.lessonId]: TOAN_1_BAI_1,
  [TOAN_1_BAI_2.lessonId]: TOAN_1_BAI_2,
} as const

export const LESSON_IDS = {
  TOAN_1_BAI_1: TOAN_1_BAI_1.lessonId,
  TOAN_1_BAI_2: TOAN_1_BAI_2.lessonId,
} as const

export type LessonId = keyof typeof LESSON_CATALOG
export type LessonDefinition = (typeof LESSON_CATALOG)[LessonId]
export type LearningKey = LessonDefinition['learningGoals'][number]['key']

export const getLessonDefinition = (lessonId: string): LessonDefinition | undefined =>
  LESSON_CATALOG[lessonId as LessonId]

export const isLessonId = (lessonId: string): lessonId is LessonId => Boolean(getLessonDefinition(lessonId))

export const isLearningKeyForLesson = (lessonId: string, learningKey: string): learningKey is LearningKey => {
  const lesson = getLessonDefinition(lessonId)
  if (!lesson) return false
  return (lesson.learningGoals as readonly { key: string }[]).some((goal) => goal.key === learningKey)
}
