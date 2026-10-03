import type { Metadata } from 'next'
import VietnameseWorldClient from './VietnameseWorldClient'

export const metadata: Metadata = {
  title: 'Vùng đất Tiếng Việt | Cappy World 3D',
  robots: { index: false, follow: false },
}

export default function VietnameseWorldPage() {
  return <VietnameseWorldClient />
}
