import GameAuthHeader from '@/components/auth/GameAuthHeader'
import AccountLessonMap from '@/components/games/lesson-map/AccountLessonMap'
import { buildVietnameseLessonMapData, demoVietnameseProgress, vietnameseLessonDefinitions } from '@/components/games/lesson-map/vietnameseData'

export default function GradeOneVietnamesePage() {
  return <><GameAuthHeader /><AccountLessonMap subject="tieng-viet" theme="adventure" items={buildVietnameseLessonMapData(vietnameseLessonDefinitions, demoVietnameseProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Tiếng Việt" title="Vùng đất tiếng Việt" showOverview={false} /></>
}
