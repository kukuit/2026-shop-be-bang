import type { Metadata } from 'next'
import OceanClient from './OceanClient'

export const metadata: Metadata = {
  title: 'Cappy World · Lặn biển',
  robots: { index: false, follow: false },
}

export default function OceanPage() {
  return <OceanClient />
}
