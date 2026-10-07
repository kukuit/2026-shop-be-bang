import { buildLessonMapData, type LessonDefinition, type LessonProgress } from './data'
import type { AdventureNodeType } from './adventureTypes'
import { TIENG_VIET_1_WEEK_1 } from '@/app/game/lop-1/tieng-viet/tuan-1/lesson'
import { TIENG_VIET_1_WEEK_2 } from '@/app/game/lop-1/tieng-viet/tuan-2/lesson'
import { TIENG_VIET_1_WEEK_3 } from '@/app/game/lop-1/tieng-viet/tuan-3/lesson'
import { TIENG_VIET_1_WEEK_4 } from '@/app/game/lop-1/tieng-viet/tuan-4/lesson'

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
  // Weeks 1 and 2 keep their persisted legacy IDs so stored learning history remains attached.
  const lessonId = id <= 2 ? `tieng-viet-1-bai-${id}` : `tieng-viet-1-tuan-${id}`
  const title = id === 1 ? TIENG_VIET_1_WEEK_1.title : id === 2 ? TIENG_VIET_1_WEEK_2.title : id === 3 ? TIENG_VIET_1_WEEK_3.title : id === 4 ? TIENG_VIET_1_WEEK_4.title : `Tuần ${id}`
  return { id, lessonId, title, mapTitle, href: `/game/lop-1/tieng-viet/tuan-${id}`, nodeType, isCheckpoint: [4, 8, 12, 17].includes(id) }
})

// Demo only: one completed lesson, one current and one additional unlocked stop.
export const demoVietnameseProgress: LessonProgress[] = [
  { lessonId: 'tieng-viet-1-bai-1', completed: true, stars: 3 },
  { lessonId: 'tieng-viet-1-bai-2', completed: false, unlocked: true, stars: 2 },
  { lessonId: 'tieng-viet-1-tuan-3', completed: false, unlocked: true },
  { lessonId: TIENG_VIET_1_WEEK_4.lessonId, completed: false, unlocked: true },
]
export const buildVietnameseLessonMapData = buildLessonMapData
