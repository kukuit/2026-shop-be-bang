'use client'
import AccountLessonMap from './AccountLessonMap'
import { buildLessonMapData, demoProgress, lessonDefinitions, type LessonProgress } from './data'
export { scrollToCurrentLesson } from './LessonJourneyMap'
export default function LessonMap({ progressData }: { progressData?: readonly LessonProgress[] }) {
  return <AccountLessonMap subject="toan" theme="ocean" items={buildLessonMapData(lessonDefinitions, progressData ?? demoProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Toán" title="Quần đảo toán học" autoScroll={!!progressData} />
}
