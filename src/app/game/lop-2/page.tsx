import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { getSubjectItems } from '@/components/games/navigation/catalog'

export default function GradeTwoPage() {
  const images = ['toan-square.png', 'tieng-viet-square.png', 'tieng-anh-square.png']
  const items = getSubjectItems('lop-2').map((item, index) => ({
    ...item,
    title: ['Quần đảo Toán học', 'Vùng đất Tiếng Việt', 'Vũ trụ Tiếng Anh'][index] ?? item.title,
    imageSrc: `/games/lessons/lop-1/images/optimize/${images[index]}`,
  }))
  return <GameNavigationGrid title="CHỌN THẾ GIỚI" description="Cùng Cappy khám phá nhé!" breadcrumbs={[]} items={items} />
}
