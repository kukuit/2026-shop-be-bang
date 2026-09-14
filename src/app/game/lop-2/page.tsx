import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeTwoPage() {
  const images = ['toan-square.png', 'tieng-viet-square.png', 'tieng-anh-square.png']
  const items = getSubjectItems('lop-2').map((item, index) => ({
    ...item,
    imageSrc: `/games/lessons/lop-1/images/optimize/${images[index]}`,
  }))
  return <><GameAuthHeader /><GameNavigationGrid breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 2' }]} items={items} /></>
}
