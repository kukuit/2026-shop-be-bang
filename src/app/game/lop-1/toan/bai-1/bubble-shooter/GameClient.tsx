'use client'

import PhaserGame from '@/components/games/bubble-shooter/PhaserGame'
import { TOAN_1_BAI_1_BUBBLE_SHOOTER_CONFIG } from './config'

export default function GameClient() {
  return <PhaserGame config={TOAN_1_BAI_1_BUBBLE_SHOOTER_CONFIG} />
}
