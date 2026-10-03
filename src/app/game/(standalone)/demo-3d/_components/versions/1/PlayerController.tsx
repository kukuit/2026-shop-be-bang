'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { CameraMode } from './camera-config'
import type { MoveInput, PortalInfo } from './types'
import { PORTALS } from './types'
import CharacterRenderer from './character/CharacterRenderer'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from './character/slots'
import type { CharacterMotionRef } from './character/types'
import { CAMERA_CONFIG } from './camera-config'

const PORTAL_POSITIONS: Record<PortalInfo['id'], [number, number, number]> = {
  math: [8, 0, 0], vietnamese: [-8, 0, 0], english: [0, 0, -10], home: [0, 0, 15],
}

type Props = {
  playerRef: MutableRefObject<RapierRigidBody | null>
  move: MoveInput
  jumpVersion: number
  cameraMode: CameraMode
  cameraDistance: MutableRefObject<number>
  onPortalChange: (portal: PortalInfo | null) => void
}

/** Owns the physics root and input-driven movement; its visual is a swappable character renderer. */
export default function PlayerController({ playerRef, move, jumpVersion, cameraMode, cameraDistance, onPortalChange }: Props) {
  const { character, skin } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  const keys = useRef(new Set<string>())
  const playerYaw = useRef(Math.PI)
  const pendingJump = useRef(false)
  const canJump = useRef(true)
  const handledJumpVersion = useRef(jumpVersion)
  const lastPortal = useRef<string | null>(null)
  const wasGrounded = useRef(true)
  const targetRotation = useRef(new THREE.Quaternion())
  const currentRotation = useRef(new THREE.Quaternion())
  const direction = useRef(new THREE.Vector3()).current
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    if (jumpVersion !== handledJumpVersion.current) {
      handledJumpVersion.current = jumpVersion
      pendingJump.current = true
    }
  }, [jumpVersion])

  useFrame((_, delta) => {
    const body = playerRef.current
    if (!body) return

    const forward = THREE.MathUtils.clamp(
      Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown')) + move.z,
      -1, 1,
    )
    const turn = THREE.MathUtils.clamp(
      Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')) + move.x,
      -1, 1,
    )
    // Cappy's model faces local +Z and starts at π; decreasing yaw turns its
    // facing toward world-right, so positive right input must decrease yaw.
    playerYaw.current -= turn * 2.1 * Math.min(delta, 0.05)
    direction.set(Math.sin(playerYaw.current) * forward, 0, Math.cos(playerYaw.current) * forward)

    let velocity = body.linvel()
    const grounded = body.translation().y <= 1.25 && velocity.y <= 0.15
    if (!canJump.current && grounded) canJump.current = true
    const previousGrounded = wasGrounded.current
    motion.current.jumpStarted = false
    if (pendingJump.current) {
      pendingJump.current = false
      if (canJump.current) {
        body.applyImpulse({ x: 0, y: 4.8, z: 0 }, true)
        canJump.current = false
        motion.current.jumpStarted = true
        velocity = body.linvel()
      }
    }

    const smoothing = 1 - Math.exp(-12 * Math.min(delta, 0.05))
    const nextX = THREE.MathUtils.lerp(velocity.x, direction.x * 5.6, smoothing)
    const nextZ = THREE.MathUtils.lerp(velocity.z, direction.z * 5.6, smoothing)
    body.setLinvel({ x: nextX, y: velocity.y, z: nextZ }, true)
    motion.current.speed = Math.hypot(nextX, nextZ)
    motion.current.verticalVelocity = velocity.y
    motion.current.grounded = grounded && !motion.current.jumpStarted
    motion.current.justLanded = motion.current.grounded && !previousGrounded
    wasGrounded.current = motion.current.grounded

    const rotation = body.rotation()
    currentRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w)
    targetRotation.current.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, playerYaw.current)
    currentRotation.current.slerp(targetRotation.current, 1 - Math.exp(-CAMERA_CONFIG.playerTurnSmooth * Math.min(delta, 0.05)))
    const nextRotation = currentRotation.current
    body.setRotation({ x: nextRotation.x, y: nextRotation.y, z: nextRotation.z, w: nextRotation.w }, true)

    const position = body.translation()
    const active = PORTALS.find((portal) => {
      const portalPosition = PORTAL_POSITIONS[portal.id]
      return Math.hypot(position.x - portalPosition[0], position.z - portalPosition[2]) < 3.2
    }) ?? null
    if (lastPortal.current !== (active?.id ?? null)) {
      lastPortal.current = active?.id ?? null
      onPortalChange(active)
    }
  })

  return <RigidBody ref={playerRef} colliders={false} position={[0, 1.35, 8]} rotation={[0, Math.PI, 0]} enabledRotations={[false, false, false]} linearDamping={0.8}>
    <CapsuleCollider args={[character.collider.halfHeight, character.collider.radius]} friction={0} />
    <CharacterRenderer character={character} skin={skin} motion={motion} hidden={cameraMode === 'firstPerson'} cameraDistance={cameraDistance} />
  </RigidBody>
}
