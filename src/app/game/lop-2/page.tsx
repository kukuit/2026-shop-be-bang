import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeTwoPage() {
  return <><GameAuthHeader /><GameNavigationGrid title="Lớp 2" description="Chọn môn học" breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 2' }]} items={getSubjectItems('lop-2')} /></>
}
