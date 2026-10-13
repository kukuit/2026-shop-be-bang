import type { Viewport } from 'next'
import ControllerClient from './ControllerClient'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Control3DControllerPage({ params }: { params: { sessionId: string } }) {
  return <ControllerClient sessionId={params.sessionId} />
}
