import { notFound } from 'next/navigation'
import ComingSoon from '@/components/games/navigation/ComingSoon'

export default function VietnameseUpcomingWeek({ params }: { params: { week: string } }) {
  const match = /^tuan-([1-9]|1[0-7])$/.exec(params.week)
  if (!match) notFound()
  return <ComingSoon title={`Tiếng Việt lớp 1 — Tuần ${match[1]}`} backHref="/game/lop-1/tieng-viet" />
}
