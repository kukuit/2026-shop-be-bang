import type { Metadata } from 'next'
import GameAuthHeader from '@/components/auth/GameAuthHeader'
import GameEntry from '@/components/games/profile/GameEntry'

export const metadata: Metadata = {
  title: 'Trò chơi học tập',
  description: 'Chọn lớp để khám phá các trò chơi học tập vui nhộn dành cho bé.',
}

export default function GamePage() {
  return <><GameAuthHeader /><GameEntry /></>
}
