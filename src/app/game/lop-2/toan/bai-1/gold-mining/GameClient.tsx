'use client'
import GoldMinerGame from '@/components/games/gold-miner/GoldMinerGame'
import { GOLD_CONFIG } from '../config'
export default function GameClient() { return <GoldMinerGame config={GOLD_CONFIG} /> }
