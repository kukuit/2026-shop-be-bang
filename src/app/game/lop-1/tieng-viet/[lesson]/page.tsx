import { notFound } from 'next/navigation'
import ComingSoon from '@/components/games/navigation/ComingSoon'

export default function VietnameseUpcomingLesson({ params }: { params: { lesson: string } }) {
  const match = /^bai-([1-9]|1[0-7])$/.exec(params.lesson)
  if (!match) notFound()
  return <ComingSoon title={`Tiếng Việt lớp 1 — Tuần ${match[1]}`} backHref="/game/lop-1/tieng-viet" />
}
