'use client'

import { memo } from 'react'
import type { MutableRefObject } from 'react'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import WorldEnvironment from './WorldEnvironment'
import IslandBoundary from './IslandBoundary'
import VietnameseBridge from './VietnameseBridge'
import MathDock from './MathDock'
import EnglishLaunch from './EnglishLaunch'
import { WORLD_CONFIG } from './worldConfig'

function VillageEnvironment({ playerRef, onHousePorchChange, onMathDockChange, onEnglishRocketChange }: { playerRef: MutableRefObject<RapierRigidBody | null>; onHousePorchChange: (inside: boolean) => void; onMathDockChange?: (inside: boolean) => void; onEnglishRocketChange?: (inside: boolean) => void }) {
  return <>
    <WorldEnvironment playerRef={playerRef} onHousePorchChange={onHousePorchChange} />
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[WORLD_CONFIG.background.radius, 0.3, WORLD_CONFIG.background.radius]} position={[0, -0.3, 0]} friction={1} />
      <IslandBoundary />
    </RigidBody>
    <VietnameseBridge showSign />
    <MathDock playerRef={playerRef} onInteractionChange={onMathDockChange} />
    <EnglishLaunch playerRef={playerRef} onInteractionChange={onEnglishRocketChange} />
  </>
}

export default memo(VillageEnvironment)
