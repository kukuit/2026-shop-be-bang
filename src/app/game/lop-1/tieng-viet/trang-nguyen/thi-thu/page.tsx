import type { Metadata } from 'next'
import TrangNguyenExam from './_components/TrangNguyenExam'

export const metadata: Metadata = {
  title: 'Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Làm bài thi thử Tiếng Việt lớp 1 gồm 30 câu trong 30 phút.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <TrangNguyenExam />
}

