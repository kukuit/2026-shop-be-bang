import type { Metadata } from 'next'
import MathWorldClient from './MathWorldClient'

export const metadata: Metadata = {
  title: 'Quần đảo Toán | Cappy World 3D',
  robots: { index: false, follow: false },
}

export default function MathWorldPage() {
  return <MathWorldClient />
}
