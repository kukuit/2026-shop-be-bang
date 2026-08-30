import type { Metadata } from 'next'
import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameNavigationGrid from '@/components/games/navigation/GameNavigationGrid'
import { gradeItems } from '@/components/games/navigation/catalog'

export const metadata: Metadata = {
  title: 'Trò chơi học tập',
  description: 'Chọn lớp để khám phá các trò chơi học tập vui nhộn dành cho bé.',
}

export default function GamePage() {
  return <><GameAuthHeader /><GameNavigationGrid title="Chọn lớp" description="Bé đang học lớp mấy?" breadcrumbs={[{ label: 'Game' }]} items={gradeItems} /></>
}
