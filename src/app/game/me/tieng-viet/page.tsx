import SubjectProgressView from '@/components/game/me/SubjectProgressView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tiến trình Tiếng Việt' }

export default function SubjectPage() {
  return <SubjectProgressView subjectId="tieng-viet" />
}
