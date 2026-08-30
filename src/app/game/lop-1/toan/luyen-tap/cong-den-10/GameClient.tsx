'use client'

import PhaserGame from '@/components/games/bubble-shooter/PhaserGame'
import { CONG_DEN_10_BUBBLE_SHOOTER_CONFIG } from './config'

export default function GameClient() {
  return <PhaserGame config={CONG_DEN_10_BUBBLE_SHOOTER_CONFIG} />
}
