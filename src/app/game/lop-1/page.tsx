import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeOnePage() {
  const images = ['toan-square.png', 'tieng-viet-square.png', 'tieng-anh-square.png']
  const items = getSubjectItems('lop-1').map((item, index) => ({
    ...item,
    imageSrc: `/games/lessons/lop-1/images/optimize/${images[index]}`,
  }))
  return <><GameAuthHeader /><GameNavigationGrid breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 1' }]} items={items} /></>
}
