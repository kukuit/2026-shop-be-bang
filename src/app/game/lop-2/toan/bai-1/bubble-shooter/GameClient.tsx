'use client'
import PhaserGame from '@/components/games/bubble-shooter/PhaserGame'
import { BUBBLE_CONFIG } from '../config'
export default function GameClient() { return <PhaserGame config={BUBBLE_CONFIG} /> }
