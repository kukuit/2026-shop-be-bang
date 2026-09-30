import { buildLessonMapData, type LessonDefinition, type LessonProgress } from './data'
import type { AdventureNodeType } from './adventureTypes'

export type VietnameseLessonDefinition = LessonDefinition & { nodeType: AdventureNodeType; mapTitle: string }
const locations: readonly { nodeType: AdventureNodeType; mapTitle: string }[] = [
  { nodeType: 'alphabetZone', mapTitle: 'Tuần 1' },
  { nodeType: 'rhymeHill', mapTitle: 'Tuần 2' },
  { nodeType: 'spellingBridge', mapTitle: 'Tuần 3' },
  { nodeType: 'readingForest', mapTitle: 'Tuần 4' },
  { nodeType: 'wordVillage', mapTitle: 'Tuần 5' },
  { nodeType: 'library', mapTitle: 'Tuần 6' },
  { nodeType: 'languageCave', mapTitle: 'Tuần 7' },
  { nodeType: 'wordTower', mapTitle: 'Tuần 8' },
  { nodeType: 'storyGate', mapTitle: 'Tuần 9' },
  { nodeType: 'storyCastle', mapTitle: 'Tuần 10' },
  { nodeType: 'alphabetZone', mapTitle: 'Tuần 11' },
  { nodeType: 'rhymeHill', mapTitle: 'Tuần 12' },
  { nodeType: 'spellingBridge', mapTitle: 'Tuần 13' },
  { nodeType: 'readingForest', mapTitle: 'Tuần 14' },
  { nodeType: 'wordVillage', mapTitle: 'Tuần 15' },
  { nodeType: 'library', mapTitle: 'Tuần 16' },
  { nodeType: 'storyCastle', mapTitle: 'Tuần 17' },
]
export const vietnameseLessonDefinitions: VietnameseLessonDefinition[] = locations.map(({ nodeType, mapTitle }, index) => {
  const id = index + 1
  return { id, lessonId: `tieng-viet-1-bai-${id}`, title: id === 1 ? 'Tuần 1: A, B, C, E, Ê' : `Tuần ${id}`, mapTitle, href: `/game/lop-1/tieng-viet/bai-${id}`, nodeType, isCheckpoint: [4, 8, 12, 17].includes(id) }
})

// Demo only: one completed lesson, one current and one additional unlocked stop.
export const demoVietnameseProgress: LessonProgress[] = [
  { lessonId: 'tieng-viet-1-bai-1', completed: true, stars: 3 },
  { lessonId: 'tieng-viet-1-bai-2', completed: false, unlocked: true, stars: 2 },
  { lessonId: 'tieng-viet-1-bai-3', completed: false, unlocked: true },
]
export const buildVietnameseLessonMapData = buildLessonMapData
