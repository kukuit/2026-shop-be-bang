import GameAuthHeader from '@/components/auth/GameAuthHeader'
import LessonJourneyMap from '@/components/games/lesson-map/LessonJourneyMap'
import { buildEnglishUnitMapData, demoEnglishProgress, englishUnitDefinitions } from '@/components/games/lesson-map/englishData'
export default function GradeOneEnglishPage() {
 return <><GameAuthHeader /><LessonJourneyMap theme="space" items={buildEnglishUnitMapData(englishUnitDefinitions, demoEnglishProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Tiếng Anh" title="Hành trình vũ trụ" showOverview={false} /></>
}
