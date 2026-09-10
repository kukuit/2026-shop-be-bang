import { buildLessonMapData, type LessonDefinition, type LessonProgress } from './data'
import type { AdventureNodeType } from './adventureTypes'

export type VietnameseLessonDefinition = LessonDefinition & { nodeType: AdventureNodeType; mapTitle: string }
const locations: readonly { nodeType: AdventureNodeType; mapTitle: string }[] = [
  { nodeType: 'alphabetZone', mapTitle: 'Bài 1' },
  { nodeType: 'rhymeHill', mapTitle: 'Bài 2' },
  { nodeType: 'spellingBridge', mapTitle: 'Bài 3' },
  { nodeType: 'readingForest', mapTitle: 'Bài 4' },
  { nodeType: 'wordVillage', mapTitle: 'Bài 5' },
  { nodeType: 'library', mapTitle: 'Bài 6' },
  { nodeType: 'languageCave', mapTitle: 'Bài 7' },
  { nodeType: 'wordTower', mapTitle: 'Bài 8' },
  { nodeType: 'storyGate', mapTitle: 'Bài 9' },
  { nodeType: 'storyCastle', mapTitle: 'Bài 10' },
]
export const vietnameseLessonDefinitions: VietnameseLessonDefinition[] = locations.map(({ nodeType, mapTitle }, index) => {
  const id = index + 1
  return { id, lessonId: `tieng-viet-1-bai-${id}`, title: `Bài ${id}`, mapTitle, href: `/game/lop-1/tieng-viet/bai-${id}`, nodeType, isCheckpoint: [3, 5, 8, 10].includes(id) }
})

// Demo only: one completed lesson, one current and one additional unlocked stop.
export const demoVietnameseProgress: LessonProgress[] = [
  { lessonId: 'tieng-viet-1-bai-1', completed: true, stars: 3 },
  { lessonId: 'tieng-viet-1-bai-2', completed: false, unlocked: true, stars: 2 },
  { lessonId: 'tieng-viet-1-bai-3', completed: false, unlocked: true },
]
export const buildVietnameseLessonMapData = buildLessonMapData
