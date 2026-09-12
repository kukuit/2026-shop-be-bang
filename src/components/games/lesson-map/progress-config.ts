import { GAME_IDS } from '../general/tracking/constants'
import { lessonDefinitions } from './data'
import { englishUnitDefinitions } from './englishData'
import { vietnameseLessonDefinitions } from './vietnameseData'
import type { ProgressLesson } from './progress'

const games = Object.values(GAME_IDS)
// Only published, tracked lessons are available. Keep released completion
// requirements stable so existing achievements survive availability changes.
const published: Record<string, Pick<ProgressLesson, 'available' | 'games' | 'requiredGames' | 'starMilestones'>> = {
  'toan-1-bai-1': { available: true, games, requiredGames: 2 },
  'toan-1-bai-2': { available: true, games, requiredGames: 2 },
  'tieng-anh-1-bai-1': { available: true, games, requiredGames: 2 },
  'tieng-viet-1-bai-1': { available: true, games: [GAME_IDS.BUBBLE_SHOOTER, GAME_IDS.GOLD_MINING, GAME_IDS.RACING, GAME_IDS.DRAG_DROP], requiredGames: 4 },
}
const maps = { toan: lessonDefinitions, 'tieng-anh': englishUnitDefinitions, 'tieng-viet': vietnameseLessonDefinitions }
export type MapSubject = keyof typeof maps
export function isMapSubject(value: string): value is MapSubject { return Object.prototype.hasOwnProperty.call(maps, value) }
export function getProgressLessons(subject: MapSubject): ProgressLesson[] {
  return maps[subject].map(lesson => ({
    ...lesson,
    ...(published[lesson.lessonId] ?? { available: false, games: [], requiredGames: 0 }),
  }))
}
