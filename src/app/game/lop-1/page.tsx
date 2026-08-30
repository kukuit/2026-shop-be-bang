import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeOnePage() {
  return <><GameAuthHeader /><GameNavigationGrid title="Lớp 1" breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 1' }]} items={getSubjectItems('lop-1')} /></>
}
