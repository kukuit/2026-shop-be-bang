import { getSubjectLessons } from './config'
import type { SubjectProgress } from './model'

// Presentation only: preserve the stored completion rule and curriculum ordering.
export function getOverviewLesson(progress: SubjectProgress) {
  const lessons = getSubjectLessons(progress.grade, progress.subjectId)
  const started = (lessonId: string) => {
    const summary = progress.lessons[lessonId]
    return !!summary && (summary.attempts > 0 || summary.completedGames > 0 || !!summary.lastPlayedAt)
  }
  const unfinished = lessons.find(lesson => !progress.lessons[lesson.lessonId]?.completed && started(lesson.lessonId))
  const lesson = unfinished ?? lessons.find(item => item.lessonId === progress.currentLessonId)
  const hasStarted = lessons.some(item => started(item.lessonId) || progress.lessons[item.lessonId]?.completed)
  return {
    lesson,
    summary: lesson ? progress.lessons[lesson.lessonId] : undefined,
    label: unfinished ? 'Tiếp tục bài hiện tại' : hasStarted ? 'Bài tiếp theo' : 'Bài bắt đầu',
    action: unfinished ? 'Tiếp tục' : 'Bắt đầu',
    inProgress: !!unfinished,
    allCompleted: lessons.length > 0 && progress.completedLessons === lessons.length,
  }
}
