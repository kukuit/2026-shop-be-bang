import { buildLessonMapData, type LessonDefinition, type LessonProgress } from './data'
export type EnglishUnitProgress = LessonProgress & { listeningScore?: number; readingScore?: number; speakingScore?: number }
export const englishUnitDefinitions: LessonDefinition[] = Array.from({ length: 16 }, (_, index) => {
 const id = index + 1
 return { id, lessonId: `tieng-anh-1-bai-${id}`, title: `Unit ${id}`, shortTitle: id === 1 ? 'Ball • Bill • Book • Bike' : undefined, href: `/game/lop-1/tieng-anh/bai-${id}` }
})
// Demo fixture. Replace with API progress without changing definitions or UI.
export const demoEnglishProgress: EnglishUnitProgress[] = [
 { lessonId: 'tieng-anh-1-bai-1', completed: true, stars: 3 },
 { lessonId: 'tieng-anh-1-bai-2', completed: true, stars: 3 },
 { lessonId: 'tieng-anh-1-bai-3', completed: false, unlocked: true, stars: 2 },
]
export const buildEnglishUnitMapData = buildLessonMapData
export function getSpaceRegion(id: number) { return id <= 4 ? 'blueGalaxy' : id <= 8 ? 'pinkNebula' : id <= 12 ? 'deepSpace' : 'goldenGalaxy' }
