import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getMathLessonItems } from '@/components/games/navigation/catalog'

export default function GradeOneMathPage() {
  return <><GameAuthHeader /><GameNavigationGrid title="Toán lớp 1" breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 1', href: '/game/lop-1' }, { label: 'Toán' }]} items={getMathLessonItems('lop-1')} /></>
}
