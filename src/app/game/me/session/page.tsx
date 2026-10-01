import SessionHistory from '@/components/game/me/SessionHistory'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Phiên chơi' }

export default function SessionPage() {
  return <SessionHistory />
}
