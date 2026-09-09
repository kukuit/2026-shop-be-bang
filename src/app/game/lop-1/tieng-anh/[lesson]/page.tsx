import { notFound } from 'next/navigation'
import ComingSoon from '@/components/games/navigation/ComingSoon'
export default function EnglishUpcomingUnit({ params }: { params: { lesson: string } }) {
 const match = /^bai-([3-9]|1[0-6])$/.exec(params.lesson)
 if (!match) notFound()
 return <ComingSoon title={`Tiếng Anh lớp 1 — Unit ${match[1]}`} backHref="/game/lop-1/tieng-anh" />
}
