import SubjectProgressView from '@/components/game/me/SubjectProgressView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tiến trình Toán' }

export default function SubjectPage() {
  return <SubjectProgressView subjectId="toan" />
}
