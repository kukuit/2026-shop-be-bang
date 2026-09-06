import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'

const lessonItems = [
  { title: 'Bài 1', href: '/game/lop-1/tieng-anh/bai-1' },
  { title: 'Bài 2', href: '/game/lop-1/tieng-anh/bai-2' },
] as const

export default function GradeOneEnglishPage() {
  return (
    <>
      <GameAuthHeader />
      <GameNavigationGrid
        title="Tiếng Anh lớp 1"
        breadcrumbs={[
          { label: 'Game', href: '/game' },
          { label: 'Lớp 1', href: '/game/lop-1' },
          { label: 'Tiếng Anh' },
        ]}
        items={lessonItems}
      />
    </>
  )
}
