import { PROGRESS_SUBJECTS } from '@/lib/chat/learning-progress'
import { getProgressLessons, isMapSubject, type MapSubject } from '@/components/games/lesson-map/progress-config'
import type { ProgressLesson } from '@/components/games/lesson-map/progress'
import { LESSON_CATALOG } from '@/components/games/general/tracking/lesson-catalog'
import type { GameProfile } from '@/lib/game-profile'

export type SubjectId = MapSubject
export const SUBJECTS = (['toan', 'tieng-viet', 'tieng-anh'] as const).map(id => ({
  id, label: PROGRESS_SUBJECTS[id], route: `/game/me/${id}`,
}))
export const isSubjectId = isMapSubject
export const getActiveProgressGrade = (profile: Pick<GameProfile, 'activeGrade' | 'primaryGrade'>) =>
  profile.activeGrade ?? profile.primaryGrade ?? 1

export function getSubjectLessons(grade: number, subject: SubjectId): ProgressLesson[] {
  // The full maps currently exist for grade 1 only. Never substitute these for another grade.
  if (grade === 1) return getProgressLessons(subject).sort((a, b) => a.id - b.id)
  return Object.values(LESSON_CATALOG)
    .filter(lesson => lesson.gradeId === `lop-${grade}` && lesson.subjectId === subject)
    .map(lesson => ({
      id: lesson.lessonNumber, lessonId: lesson.lessonId, title: lesson.title,
      href: `/game/lop-${grade}/${subject}/bai-${lesson.lessonNumber}`,
      available: false, games: [], requiredGames: 0,
    })).sort((a, b) => a.id - b.id)
}

export const GAME_LABELS: Record<string, string> = {
  'bubble-shooter': 'Bắn bóng', 'gold-mining': 'Đào vàng', 'racing': 'Đua xe', 'drag-drop': 'Kéo thả',
}
export const SESSION_PAGE_SIZE = 20
