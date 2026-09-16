import type { Metadata } from 'next'
import VoiceTest from './VoiceTest'

export const metadata: Metadata = {
  title: 'Test voice ghép',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <VoiceTest />
}
