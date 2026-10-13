import type { Viewport } from 'next'
import ControllerClient from './ControllerClient'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Control2DControllerPage({ params, searchParams }: { params: { sessionId: string }; searchParams: { player?: string } }) {
  const playerId = searchParams.player === '2' ? 2 : 1
  return <ControllerClient sessionId={params.sessionId} playerId={playerId} />
}
