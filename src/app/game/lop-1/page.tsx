import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeOnePage() {
  // Card bounds in the edited reference sheet; each card displays only its artwork.
  const items = getSubjectItems('lop-1').map((item, index) => ({
    ...item,
    grade: 1,
    artwork: {
      src: '/games/lessons/lop-1/images/subject-cards-no-titles.png',
      x: [46, 585, 1128][index],
      y: 208,
      width: 500,
      height: 640,
      sheetWidth: 1672,
      sheetHeight: 941,
    },
  }))
  return <><GameAuthHeader /><GameNavigationGrid breadcrumbs={[{ label: 'Game', href: '/game' }, { label: 'Lớp 1' }]} items={items} /></>
}
