import { getLessonDefinition } from './tracking/lesson-catalog'
import type { GameId, LessonId } from './tracking'

/** Prefer the lesson's intro; use the shared game intro when it is missing. */
export async function resolveIntroVoice({ gameId, lessonId, introVoice }: {
  gameId: GameId
  lessonId?: LessonId
  introVoice?: string
}): Promise<string> {
  const fallback = `/games/${gameId}/voices/intro.mp3`
  const lesson = lessonId ? getLessonDefinition(lessonId) : undefined
  const preferred = introVoice ?? (lesson
    ? `/games/lessons/${lesson.gradeId}/${lesson.subjectId}/bai-${lesson.lessonNumber}/${gameId}/voices/intro.mp3`
    : undefined)
  if (!preferred || preferred === fallback) return fallback

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(preferred, { method: 'HEAD', signal: controller.signal })
    return response.ok ? preferred : fallback
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
