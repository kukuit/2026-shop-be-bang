import type { Metadata } from 'next'
import EnglishWorldClient from './EnglishWorldClient'

export const metadata: Metadata = {
  title: 'Vũ trụ Tiếng Anh | Cappy World 3D',
  robots: { index: false, follow: false },
}

export default function EnglishWorldPage() {
  return <EnglishWorldClient />
}
