import type { Metadata } from 'next'
import RewardHistoryClient from './RewardHistoryClient'

export const metadata: Metadata = { title: 'Lịch sử đổi quà' }

export default function RewardHistoryPage() {
  return <RewardHistoryClient />
}
