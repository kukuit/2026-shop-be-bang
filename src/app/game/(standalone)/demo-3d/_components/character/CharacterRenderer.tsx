'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { CharacterDefinition, CharacterMotionRef, CharacterSkinDefinition } from './types'
import { resolveCharacterAnimationState } from './animation-state'
import CharacterModel from './CharacterModel'

type Props = {
  character: CharacterDefinition
  skin: CharacterSkinDefinition
  motion: CharacterMotionRef
  hidden: boolean
  cameraDistance: MutableRefObject<number>
  boatPose?: boolean
  rowing?: boolean
}

/** Visual child of the physics player root. Replace the proxy branch with the GLB renderer when available. */
export default function CharacterRenderer({ character, skin, motion, hidden, cameraDistance, boatPose = false, rowing = false }: Props) {
  const root = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!root.current) return
    root.current.visible = !hidden && cameraDistance.current > 2
    // Resolve the shared state now so a mapped GLB can consume it without
    // making the player controller depend on model nodes.
    root.current.userData.animationState = resolveCharacterAnimationState(motion.current)
  })

  const modelUrl = skin.modelUrl ?? character.modelUrl
  if (modelUrl) {
    return <group ref={root} visible={!hidden}>
      <CharacterModel character={character} skin={skin} modelUrl={modelUrl} motion={motion} boatPose={boatPose} rowing={rowing} />
    </group>
  }
  if (character.visual.temporaryRenderer !== 'cappy-proxy') return null

  return <group ref={root} position-y={character.visual.rootOffsetY} visible={!hidden}>
    {/* Temporary unrigged Cappy proxy. Replace with the production GLB; it has no skeletal clips. */}
    <group position-y={0.125}>
    <mesh castShadow position={[0, 0.95, 0]}><capsuleGeometry args={[0.43, 0.55, 5, 8]} /><meshStandardMaterial color={skin.materials?.fur ?? '#c7793f'} flatShading /></mesh>
    <mesh castShadow position={[0, 1.85, 0]}><icosahedronGeometry args={[0.57, 2]} /><meshStandardMaterial color={skin.materials?.muzzle ?? '#d89555'} flatShading /></mesh>
    <mesh castShadow position={[-0.47, 2.05, 0]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.18, 0.62, 6]} /><meshStandardMaterial color={skin.materials?.muzzle ?? '#d89555'} /></mesh>
    <mesh castShadow position={[0.47, 2.05, 0]} rotation={[0, 0, -0.2]}><coneGeometry args={[0.18, 0.62, 6]} /><meshStandardMaterial color={skin.materials?.muzzle ?? '#d89555'} /></mesh>
    <mesh position={[-0.2, 1.9, 0.49]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#2b2525" /></mesh>
    <mesh position={[0.2, 1.9, 0.49]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#2b2525" /></mesh>
    <mesh castShadow position={[-0.57, 1.06, 0]} rotation={[0, 0, -0.35]}><capsuleGeometry args={[0.15, 0.53, 3, 6]} /><meshStandardMaterial color={skin.materials?.muzzle ?? '#d89555'} /></mesh>
    <mesh castShadow position={[0.57, 1.06, 0]} rotation={[0, 0, 0.35]}><capsuleGeometry args={[0.15, 0.53, 3, 6]} /><meshStandardMaterial color={skin.materials?.muzzle ?? '#d89555'} /></mesh>
    <mesh castShadow position={[-0.24, 0.22, 0.06]}><capsuleGeometry args={[0.17, 0.35, 3, 6]} /><meshStandardMaterial color={skin.materials?.accent ?? '#664532'} /></mesh>
    <mesh castShadow position={[0.24, 0.22, 0.06]}><capsuleGeometry args={[0.17, 0.35, 3, 6]} /><meshStandardMaterial color={skin.materials?.accent ?? '#664532'} /></mesh>
    </group>
  </group>
}
