import type { Metadata } from 'next'
import Demo3DClient from './_components/Demo3DClient'

export const metadata: Metadata = {
  title: 'Cappy World 3D',
  robots: { index: false, follow: false },
}

export default function Demo3DPage() {
  return <Demo3DClient />
}
