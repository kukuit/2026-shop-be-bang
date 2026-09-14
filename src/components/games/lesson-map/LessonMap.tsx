'use client'
import AccountLessonMap from './AccountLessonMap'
import { buildLessonMapData, demoProgress, lessonDefinitions, type LessonProgress } from './data'
import { TOAN_2_MATH_LESSONS } from '@/app/game/lop-2/toan/bai-1/lesson'
import type { MapGrade } from './progress-config'
export { scrollToCurrentLesson } from './LessonJourneyMap'
export default function LessonMap({ progressData, grade = 'lop-1' }: { progressData?: readonly LessonProgress[]; grade?: MapGrade }) {
  const definitions = grade === 'lop-2' ? TOAN_2_MATH_LESSONS : lessonDefinitions
  return <AccountLessonMap grade={grade} subject="toan" theme="ocean" items={buildLessonMapData(definitions, progressData ?? (grade === 'lop-1' ? demoProgress : []))} gradeLabel={grade === 'lop-2' ? 'Lớp 2' : 'Lớp 1'} gradeHref={`/game/${grade}`} subjectLabel="Toán" title="Quần đảo toán học" autoScroll={!!progressData} />
}
