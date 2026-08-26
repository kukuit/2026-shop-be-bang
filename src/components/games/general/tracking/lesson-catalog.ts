import { TOAN_1_BAI_1 } from '@/app/game/lop-1/toan/bai-1/lesson'

export const LESSON_CATALOG = {
  [TOAN_1_BAI_1.lessonId]: TOAN_1_BAI_1,
} as const

export const LESSON_IDS = {
  TOAN_1_BAI_1: TOAN_1_BAI_1.lessonId,
} as const

export type LessonId = keyof typeof LESSON_CATALOG
export type LessonDefinition = (typeof LESSON_CATALOG)[LessonId]
export type LearningKey = LessonDefinition['learningGoals'][number]['key']

export const getLessonDefinition = (lessonId: string): LessonDefinition | undefined =>
  LESSON_CATALOG[lessonId as LessonId]

export const isLessonId = (lessonId: string): lessonId is LessonId => Boolean(getLessonDefinition(lessonId))

export const isLearningKeyForLesson = (lessonId: string, learningKey: string): learningKey is LearningKey =>
  getLessonDefinition(lessonId)?.learningGoals.some((goal) => goal.key === learningKey) ?? false

