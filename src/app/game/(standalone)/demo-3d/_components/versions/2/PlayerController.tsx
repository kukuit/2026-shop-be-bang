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
  cameraYaw: MutableRefObject<number>
  onPortalChange: (portal: PortalInfo | null) => void
}

/** Camera-relative movement, smoothed acceleration and one grounded jump. */
export default function PlayerController({ playerRef, move, jumpVersion, cameraMode, cameraDistance, cameraYaw, onPortalChange }: Props) {
  const { character, skin } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  const keys = useRef(new Set<string>())
  const pendingJump = useRef(false)
  const handledJumpVersion = useRef(jumpVersion)
  const canJump = useRef(true)
  const lastPortal = useRef<string | null>(null)
  const wasGrounded = useRef(true)
  const facingYaw = useRef(Math.PI)
  const direction = useRef(new THREE.Vector3()).current
  const forward = useRef(new THREE.Vector3()).current
  const right = useRef(new THREE.Vector3()).current
  const visualFacing = useRef(new THREE.Vector3()).current
  const targetRotation = useRef(new THREE.Quaternion())
  const currentRotation = useRef(new THREE.Quaternion())
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false, falling: false })

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
      keys.current.add(key)
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear) }
  }, [])

  useEffect(() => {
    if (jumpVersion !== handledJumpVersion.current) {
      handledJumpVersion.current = jumpVersion
      pendingJump.current = true
    }
  }, [jumpVersion])

  useFrame((_, rawDelta) => {
    const body = playerRef.current
    if (!body) return
    const delta = Math.min(rawDelta, 0.05)
    const keyX = Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft'))
    const keyZ = Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown'))
    const inputX = THREE.MathUtils.clamp(keyX + move.x, -1, 1)
    const inputZ = THREE.MathUtils.clamp(keyZ + move.z, -1, 1)
    forward.set(-Math.sin(cameraYaw.current), 0, -Math.cos(cameraYaw.current))
    right.set(-forward.z, 0, forward.x)
    direction.copy(forward).multiplyScalar(inputZ).addScaledVector(right, inputX)
    if (direction.lengthSq() > 1) direction.normalize()

    const velocity = body.linvel()
    const grounded = body.translation().y <= 1.27 && velocity.y <= 0.12
    if (grounded) canJump.current = true
    motion.current.jumpStarted = false
    if (pendingJump.current) {
      pendingJump.current = false
      if (grounded && canJump.current) {
        body.setLinvel({ x: velocity.x, y: 7, z: velocity.z }, true)
        canJump.current = false
        motion.current.jumpStarted = true
      }
    }

    const hasInput = direction.lengthSq() > 0.0001
    const speed = keys.current.has('shift') ? 6 : 4
    const control = grounded ? 1 : 0.38
    const acceleration = hasInput ? 18 : 24
    const smoothing = 1 - Math.exp(-acceleration * control * delta)
    const nextX = THREE.MathUtils.lerp(velocity.x, direction.x * speed, smoothing)
    const nextZ = THREE.MathUtils.lerp(velocity.z, direction.z * speed, smoothing)
    body.setLinvel({ x: nextX, y: body.linvel().y, z: nextZ }, true)

    const horizontalSpeed = Math.hypot(nextX, nextZ)
    if (horizontalSpeed > 0.12) {
      visualFacing.set(nextX, 0, nextZ).normalize()
      // The model faces local +Z; camera-relative input determines the facing.
      const desiredYaw = Math.atan2(visualFacing.x, visualFacing.z)
      const difference = Math.atan2(Math.sin(desiredYaw - facingYaw.current), Math.cos(desiredYaw - facingYaw.current))
      facingYaw.current += difference * (1 - Math.exp(-CAMERA_CONFIG.followSmooth * delta))
    }
    const rotation = body.rotation()
    currentRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w)
    targetRotation.current.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, facingYaw.current)
    currentRotation.current.slerp(targetRotation.current, 1 - Math.exp(-7 * delta))
    body.setRotation({ x: currentRotation.current.x, y: currentRotation.current.y, z: currentRotation.current.z, w: currentRotation.current.w }, true)

    motion.current.speed = horizontalSpeed
    motion.current.verticalVelocity = body.linvel().y
    motion.current.grounded = grounded && !motion.current.jumpStarted
    motion.current.justLanded = motion.current.grounded && !wasGrounded.current
    motion.current.falling = !motion.current.grounded && body.linvel().y < -0.2
    wasGrounded.current = motion.current.grounded

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

  return <RigidBody ref={playerRef} colliders={false} position={[0, 1.35, 8]} rotation={[0, Math.PI, 0]} enabledRotations={[false, false, false]} linearDamping={0.2}>
    <CapsuleCollider args={[character.collider.halfHeight, character.collider.radius]} friction={0} />
    <CharacterRenderer character={character} skin={skin} motion={motion} hidden={cameraMode === 'firstPerson'} cameraDistance={cameraDistance} />
  </RigidBody>
}
