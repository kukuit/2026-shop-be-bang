'use client'
import RacingGame from '@/components/games/racing/RacingGame'
import { RACING_CONFIG } from '../config'
export default function GameClient() { return <RacingGame config={RACING_CONFIG} /> }
