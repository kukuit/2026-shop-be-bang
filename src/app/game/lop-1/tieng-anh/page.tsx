import AccountLessonMap from '@/components/games/lesson-map/AccountLessonMap'
import { buildEnglishUnitMapData, demoEnglishProgress, englishUnitDefinitions } from '@/components/games/lesson-map/englishData'
export default function GradeOneEnglishPage() {
 return <><AccountLessonMap subject="tieng-anh" theme="space" items={buildEnglishUnitMapData(englishUnitDefinitions, demoEnglishProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Tiếng Anh" title="Vũ trụ tiếng Anh" showOverview={false} /></>
}
