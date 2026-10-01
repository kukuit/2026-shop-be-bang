import SubjectProgressView from '@/components/game/me/SubjectProgressView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tiến trình Tiếng Anh' }

export default function SubjectPage() {
  return <SubjectProgressView subjectId="tieng-anh" />
}
