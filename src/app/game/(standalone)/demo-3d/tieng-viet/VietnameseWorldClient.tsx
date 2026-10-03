'use client'

import dynamic from 'next/dynamic'
import VietnameseEnvironment from '../_components/world/VietnameseEnvironment'

const GameScene = dynamic(() => import('../_components/GameScene'), { ssr: false })

export default function VietnameseWorldClient() {
  return <GameScene world="tieng-viet" Environment={VietnameseEnvironment} />
}
