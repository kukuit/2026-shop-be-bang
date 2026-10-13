'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import CharacterRenderer from '../_components/character/CharacterRenderer'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from '../_components/character/slots'
import type { CharacterMotionRef } from '../_components/character/types'
import type { MoveInput } from '../_components/types'
import { OCEAN_COLLECTIBLES, OCEAN_LARGE_OBSTACLES, OCEAN_MAP_HALF_SIZE, OCEAN_START_POSITION, getOceanFloorHeight, isOceanPositionBlocked, type OceanCollectible } from './ocean-layout'
import type { OceanMissionRound } from './ocean-mission'

export type OceanNearbyAction = { id: string; label: string; kind: 'numbered-chest' | 'golden-chest' } | null

export const OCEAN_GOLDEN_CHEST_POSITION: [number, number, number] = [17, 0, -17]

type Props = {
  groupRef: MutableRefObject<THREE.Group | null>
  move: MoveInput
  cameraYaw: MutableRefObject<number>
  cameraDistance: MutableRefObject<number>
  round: OceanMissionRound
  goldenChestFound: boolean
  collectedIds: ReadonlySet<string>
  interactVersion: number
  inputDisabled: boolean
  recoveryVersion: number
  onNearbyChange: (action: OceanNearbyAction) => void
  onChestInteract: (id: string, number: number) => void
  onGoldenChestInteract: () => void
  onCollect: (item: OceanCollectible) => void
  onRecoveryComplete: () => void
}

export default function OceanPlayer({ groupRef, move, cameraYaw, cameraDistance, round, goldenChestFound, collectedIds, interactVersion, inputDisabled, recoveryVersion, onNearbyChange, onChestInteract, onGoldenChestInteract, onCollect, onRecoveryComplete }: Props) {
  const visual = useRef<THREE.Group>(null)
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const targetRotation = useRef(new THREE.Quaternion())
  const currentRotation = useRef(new THREE.Quaternion())
  const tempPosition = useRef(new THREE.Vector3())
  const recoveryStart = useRef(new THREE.Vector3())
  const recoveryStartedAt = useRef(0)
  const lastRecoveryVersion = useRef(recoveryVersion)
  const handledInteract = useRef(interactVersion)
  const lastInteractionAt = useRef(-1)
  const nearbyRef = useRef<OceanNearbyAction>(null)
  const collectedOnce = useRef(new Set<string>())
  const obstacles = useMemo(() => [...OCEAN_LARGE_OBSTACLES, ...round.chests.map((chest) => ({ x: chest.position[0], z: chest.position[2], radius: 0.72 }))], [round])
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })
  const { character, skin } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)

  useFrame((state, delta) => {
    const root = groupRef.current
    if (!root) return
    const dt = Math.min(delta, 0.05)
    if (recoveryVersion !== lastRecoveryVersion.current) {
      lastRecoveryVersion.current = recoveryVersion
      recoveryStartedAt.current = state.clock.elapsedTime
      recoveryStart.current.copy(root.position)
    }

    if (recoveryStartedAt.current > 0) {
      const progress = THREE.MathUtils.clamp((state.clock.elapsedTime - recoveryStartedAt.current) / 1.55, 0, 1)
      const eased = THREE.MathUtils.smoothstep(progress, 0, 1)
      tempPosition.current.set(...OCEAN_START_POSITION)
      root.position.lerpVectors(recoveryStart.current, tempPosition.current, eased)
      const floor = getOceanFloorHeight(root.position.x, root.position.z)
      root.position.y = Math.max(root.position.y, floor + 0.4)
      velocity.current.set(0, 0, 0)
      motion.current.speed = 0
      if (progress >= 1) {
        recoveryStartedAt.current = 0
        onRecoveryComplete()
      }
      return
    }

    if (inputDisabled) {
      velocity.current.multiplyScalar(Math.exp(-10 * dt))
      root.position.addScaledVector(velocity.current, dt)
      velocity.current.set(0, 0, 0)
    } else {
      const forwardInput = THREE.MathUtils.clamp(move.z, -1, 1)
      const sideInput = THREE.MathUtils.clamp(move.x, -1, 1)
      const verticalInput = THREE.MathUtils.clamp(move.y ?? 0, -1, 1)
      forward.current.set(-Math.sin(cameraYaw.current), 0, -Math.cos(cameraYaw.current))
      right.current.set(Math.cos(cameraYaw.current), 0, -Math.sin(cameraYaw.current))
      direction.current.copy(forward.current).multiplyScalar(forwardInput).addScaledVector(right.current, sideInput)
      if (direction.current.lengthSq() > 1) direction.current.normalize()
      const targetSpeed = 4.15
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, direction.current.x * targetSpeed, 7, dt)
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, direction.current.z * targetSpeed, 7, dt)
      velocity.current.y = THREE.MathUtils.damp(velocity.current.y, verticalInput * 2.65, 7, dt)

      const nextX = THREE.MathUtils.clamp(root.position.x + velocity.current.x * dt, -OCEAN_MAP_HALF_SIZE + 1.4, OCEAN_MAP_HALF_SIZE - 1.4)
      const nextZ = THREE.MathUtils.clamp(root.position.z + velocity.current.z * dt, -OCEAN_MAP_HALF_SIZE + 1.4, OCEAN_MAP_HALF_SIZE - 1.4)
      const canMoveX = !isOceanPositionBlocked(nextX, root.position.z, obstacles, 0.72)
      const canMoveZ = !isOceanPositionBlocked(root.position.x, nextZ, obstacles, 0.72)
      if (canMoveX) root.position.x = nextX
      else velocity.current.x = 0
      if (canMoveZ) root.position.z = nextZ
      else velocity.current.z = 0
      const floor = getOceanFloorHeight(root.position.x, root.position.z)
      const minY = floor + 0.38
      const maxY = 6.05
      root.position.y = THREE.MathUtils.clamp(root.position.y + velocity.current.y * dt, minY, maxY)
      if ((root.position.y <= minY && velocity.current.y < 0) || (root.position.y >= maxY && velocity.current.y > 0)) velocity.current.y = 0
    }

    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z)
    motion.current.speed = horizontalSpeed > 0.12 ? Math.min(2.2, horizontalSpeed * 0.72) : 0
    motion.current.grounded = true
    motion.current.verticalVelocity = velocity.current.y
    motion.current.jumpStarted = false
    motion.current.justLanded = false
    if (visual.current) {
      visual.current.position.y = Math.sin(state.clock.elapsedTime * 2.15) * 0.06
      visual.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.7) * 0.025
      visual.current.rotation.z = -velocity.current.x * 0.025
    }

    if (horizontalSpeed > 0.12) {
      const targetYaw = Math.atan2(velocity.current.x, velocity.current.z)
      targetRotation.current.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, targetYaw)
      currentRotation.current.setFromEuler(root.rotation).slerp(targetRotation.current, 1 - Math.exp(-6.5 * dt))
      root.quaternion.copy(currentRotation.current)
    }

    let nearest: OceanNearbyAction = null
    let nearestDistance = 2.45
    for (const chest of round.chests) {
      const distance = Math.hypot(root.position.x - chest.position[0], root.position.z - chest.position[2])
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = { id: chest.id, label: 'MỞ RƯƠNG', kind: 'numbered-chest' }
      }
    }
    if (!goldenChestFound) {
      const distance = Math.hypot(root.position.x - OCEAN_GOLDEN_CHEST_POSITION[0], root.position.z - OCEAN_GOLDEN_CHEST_POSITION[2])
      if (distance < nearestDistance) nearest = { id: 'golden-chest', label: 'MỞ RƯƠNG VÀNG', kind: 'golden-chest' }
    }
    if (nearbyRef.current?.id !== nearest?.id) {
      nearbyRef.current = nearest
      onNearbyChange(nearest)
    }

    for (const item of OCEAN_COLLECTIBLES) {
      if (collectedIds.has(item.id) || collectedOnce.current.has(item.id)) continue
      const distance = Math.hypot(root.position.x - item.position[0], root.position.z - item.position[2])
      if (distance < 1.28) {
        collectedOnce.current.add(item.id)
        onCollect(item)
      }
    }

    if (interactVersion !== handledInteract.current) {
      handledInteract.current = interactVersion
      const action = nearbyRef.current
      if (action && state.clock.elapsedTime - lastInteractionAt.current > 0.36 && !inputDisabled) {
        lastInteractionAt.current = state.clock.elapsedTime
        if (action.kind === 'golden-chest') onGoldenChestInteract()
        else {
          const chest = round.chests.find((entry) => entry.id === action.id)
          if (chest) onChestInteract(chest.id, chest.number)
        }
      }
    }
  })

  return <group ref={groupRef} position={OCEAN_START_POSITION} rotation={[0, Math.PI, 0]}>
    <group ref={visual}>
      <CharacterRenderer character={character} skin={skin} motion={motion} hidden={false} cameraDistance={cameraDistance} scubaGear />
    </group>
  </group>
}
