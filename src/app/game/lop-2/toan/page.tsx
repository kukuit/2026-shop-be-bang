import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getMathLessonItems } from '@/components/games/navigation/catalog'

export default function GradeTwoMathPage() {
  return <><GameAuthHeader /><GameNavigationGrid title="Toán lớp 2" description="Chọn bài học" breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 2', href: '/game/lop-2' }, { label: 'Toán' }]} items={getMathLessonItems('lop-2')} /></>
}
