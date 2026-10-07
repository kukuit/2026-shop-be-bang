import type { Metadata } from 'next'
import TrangNguyenExam from '../_components/TrangNguyenExam'

export const metadata: Metadata = {
  title: 'Phiên thi thử Trạng Nguyên Tiếng Việt lớp 1',
  robots: { index: false, follow: false },
}

export default function AttemptPage({ params }: { params: { attemptId: string } }) {
  return <TrangNguyenExam attemptId={params.attemptId} />
}
