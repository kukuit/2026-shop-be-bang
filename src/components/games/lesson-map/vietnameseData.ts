import { buildLessonMapData, type LessonDefinition, type LessonProgress } from './data'
import type { AdventureNodeType } from './adventureTypes'

export type VietnameseLessonDefinition = LessonDefinition & { nodeType: AdventureNodeType; mapTitle: string }
const locations: readonly { nodeType: AdventureNodeType; mapTitle: string }[] = [
  { nodeType: 'alphabetZone', mapTitle: 'Khu chữ cái' },
  { nodeType: 'rhymeHill', mapTitle: 'Đồi âm vần' },
  { nodeType: 'spellingBridge', mapTitle: 'Cầu đánh vần' },
  { nodeType: 'readingForest', mapTitle: 'Rừng đọc hiểu' },
  { nodeType: 'wordVillage', mapTitle: 'Làng chữ' },
  { nodeType: 'library', mapTitle: 'Thư viện' },
  { nodeType: 'languageCave', mapTitle: 'Hang tiếng Việt' },
  { nodeType: 'wordTower', mapTitle: 'Tháp từ ngữ' },
  { nodeType: 'storyGate', mapTitle: 'Cổng kể chuyện' },
  { nodeType: 'storyCastle', mapTitle: 'Lâu đài kể chuyện' },
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
