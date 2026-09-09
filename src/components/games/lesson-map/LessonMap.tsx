'use client'
import LessonJourneyMap from './LessonJourneyMap'
import { buildLessonMapData, demoProgress, lessonDefinitions, type LessonProgress } from './data'
export { scrollToCurrentLesson } from './LessonJourneyMap'
export default function LessonMap({ progressData }: { progressData?: readonly LessonProgress[] }) {
  return <LessonJourneyMap theme="ocean" items={buildLessonMapData(lessonDefinitions, progressData ?? demoProgress)} gradeLabel="Lớp 1" gradeHref="/game/lop-1" subjectLabel="Toán" title="Quần đảo toán học" autoScroll={!!progressData} />
}
