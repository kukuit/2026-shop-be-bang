'use client'

import { memo } from 'react'
import type { MutableRefObject } from 'react'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import WorldEnvironment from './WorldEnvironment'
import IslandBoundary from './IslandBoundary'
import VietnameseBridge from './VietnameseBridge'
import VillagePortals from './VillagePortals'
import MathDock from './MathDock'
import { WORLD_CONFIG } from './worldConfig'

function VillageEnvironment({ playerRef, onHousePorchChange, onMathDockChange }: { playerRef: MutableRefObject<RapierRigidBody | null>; onHousePorchChange: (inside: boolean) => void; onMathDockChange?: (inside: boolean) => void }) {
  return <>
    <WorldEnvironment playerRef={playerRef} onHousePorchChange={onHousePorchChange} />
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[WORLD_CONFIG.background.radius, 0.3, WORLD_CONFIG.background.radius]} position={[0, -0.3, 0]} friction={1} />
      <IslandBoundary />
    </RigidBody>
    <VietnameseBridge showSign />
    <MathDock playerRef={playerRef} onInteractionChange={onMathDockChange} />
    <VillagePortals />
  </>
}

export default memo(VillageEnvironment)
