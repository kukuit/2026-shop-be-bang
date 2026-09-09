import GameAuthHeader from '@/components/auth/GameAuthHeader'
import LessonJourneyMap from '@/components/games/lesson-map/LessonJourneyMap'
import { buildVietnameseLessonMapData, demoVietnameseProgress, vietnameseLessonDefinitions } from '@/components/games/lesson-map/vietnameseData'

export default function GradeOneVietnamesePage() {
  return <><GameAuthHeader /><LessonJourneyMap theme="adventure" items={buildVietnameseLessonMapData(vietnameseLessonDefinitions, demoVietnameseProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Tiếng Việt" title="Vùng đất chữ" showOverview={false} /></>
}
