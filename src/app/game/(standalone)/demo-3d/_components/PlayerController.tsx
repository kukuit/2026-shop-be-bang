'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { CameraMode } from './camera-config'
import type { MoveInput, PortalInfo } from './types'
import { PORTALS } from './types'
import type { DemoWorldId, BridgeTransition, MathDepartureStage, EnglishLaunchStage } from './GameShell'
import CharacterRenderer from './character/CharacterRenderer'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from './character/slots'
import type { CharacterMotionRef } from './character/types'
import { CAMERA_CONFIG } from './camera-config'
import { isVillageWalkable, isVietnameseWalkable } from './world/water-boundaries'
import { ENGLISH_STEPS, ENGLISH_WORLD_CONFIG } from './world/english-world.config'
import { useRocketFlight } from './useRocketFlight'

const PORTAL_POSITIONS: Record<PortalInfo['id'], [number, number, number]> = {
  english: [0, 0, -10],
}
const MATH_DOCK_WALKWAY = { startX: 20, endX: 27.25, centerZ: 2.5, halfWidth: 1.15 }
const ENGLISH_ROCKET_STAND_TOP = ENGLISH_WORLD_CONFIG.launch.top + 0.43
const ENGLISH_GROUND_STEPS = [
  ...ENGLISH_STEPS.map((step) => ({ ...step, radius: 1.25 })),
  { x: ENGLISH_WORLD_CONFIG.launch.x, z: ENGLISH_WORLD_CONFIG.launch.z, top: ENGLISH_WORLD_CONFIG.launch.top, radius: 4.1 },
  { x: ENGLISH_WORLD_CONFIG.launch.x - 1.4, z: ENGLISH_WORLD_CONFIG.launch.z, top: ENGLISH_ROCKET_STAND_TOP, radius: 1.85 },
]

type Props = {
  playerRef: MutableRefObject<RapierRigidBody | null>
  move: MoveInput
  jumpVersion: number
  cameraMode: CameraMode
  cameraDistance: MutableRefObject<number>
  cameraYaw: MutableRefObject<number>
  cameraPitch: MutableRefObject<number>
  manualOrbitVersion: MutableRefObject<number>
  transitionPhase: BridgeTransition['phase'] | null
  mathDepartureStage: MathDepartureStage
  englishLaunchStage: EnglishLaunchStage
  transitionDirectionZ: number
  spawn: { position: [number, number, number]; yaw: number }
  world: DemoWorldId
  onBridgeReach: (world: DemoWorldId) => void
  onPortalChange: (portal: PortalInfo | null) => void
}

/** Owns the physics root and input-driven movement; its visual is a swappable character renderer. */
export default function PlayerController({ playerRef, move, jumpVersion, cameraMode, cameraDistance, cameraYaw, cameraPitch, manualOrbitVersion, transitionPhase, mathDepartureStage, englishLaunchStage, transitionDirectionZ, spawn, world, onBridgeReach, onPortalChange }: Props) {
  const [spawnX, , spawnZ] = spawn.position
  const { character, skin } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  const keys = useRef(new Set<string>())
  const playerYaw = useRef(spawn.yaw)
  const pendingJump = useRef(false)
  const canJump = useRef(true)
  const handledJumpVersion = useRef(jumpVersion)
  const lastPortal = useRef<string | null>(null)
  const wasGrounded = useRef(true)
  const targetRotation = useRef(new THREE.Quaternion())
  const currentRotation = useRef(new THREE.Quaternion())
  const direction = useRef(new THREE.Vector3()).current
  const cameraForward = useRef(new THREE.Vector3()).current
  const cameraRight = useRef(new THREE.Vector3()).current
  const flightMode = useRef(false)
  const movementBasisYaw = useRef(cameraYaw.current)
  const movementBasisActive = useRef(false)
  const observedOrbitVersion = useRef(manualOrbitVersion.current)
  const bridgeTriggered = useRef(false)
  const lastDryPosition = useRef({ x: spawnX, z: spawnZ })
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })
  flightMode.current = englishLaunchStage === 'rocket-flight'
  useRocketFlight({ active: flightMode.current, playerRef, keys, move, cameraYaw, cameraPitch, motion })

  useEffect(() => {
    bridgeTriggered.current = false
    playerYaw.current = spawn.yaw
    lastDryPosition.current = { x: spawnX, z: spawnZ }
  }, [world, spawn.yaw, spawnX, spawnZ])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current.add(event.key.toLowerCase())
      if (flightMode.current && (event.code === 'Space' || event.key.startsWith('Arrow'))) event.preventDefault()
    }
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

    if ((mathDepartureStage || englishLaunchStage) && englishLaunchStage !== 'rocket-flight') {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      pendingJump.current = false
      motion.current.speed = mathDepartureStage === 'boarding' || englishLaunchStage === 'boarding' ? 3.8 : 0
      motion.current.grounded = true
      return
    }

    const dt = Math.min(delta, 0.05)
    if (englishLaunchStage === 'rocket-flight') {
      pendingJump.current = false
      return
    }
    let forwardInput = THREE.MathUtils.clamp(
      Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown')) + move.z,
      -1, 1,
    )
    let rightInput = THREE.MathUtils.clamp(
      Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')) + move.x,
      -1, 1,
    )
    const transitionRun = transitionPhase === 'running'
    const transitionLocked = transitionPhase !== null && !transitionRun
    if (transitionRun || transitionLocked) {
      forwardInput = 0
      rightInput = 0
    }
    const hasTranslationIntent = Math.abs(forwardInput) > 0.04
    const isTurnOnly = !transitionRun && !transitionLocked && !hasTranslationIntent && Math.abs(rightInput) > 0.04
    if (transitionLocked || !hasTranslationIntent) {
      movementBasisActive.current = false
    } else if (!movementBasisActive.current || observedOrbitVersion.current !== manualOrbitVersion.current) {
      movementBasisYaw.current = cameraYaw.current
      movementBasisActive.current = true
      observedOrbitVersion.current = manualOrbitVersion.current
    }

    const movementYaw = movementBasisActive.current ? movementBasisYaw.current : cameraYaw.current
    cameraForward.set(-Math.sin(movementYaw), 0, -Math.cos(movementYaw)).normalize()
    cameraRight.set(-cameraForward.z, 0, cameraForward.x)
    if (transitionRun) direction.set(0, 0, transitionDirectionZ)
    else if (transitionLocked || isTurnOnly) direction.set(0, 0, 0)
    else direction.copy(cameraForward).multiplyScalar(forwardInput).addScaledVector(cameraRight, rightInput)
    const position = body.translation()
    const walkable = world === 'village' ? isVillageWalkable(position.x, position.z)
      : world === 'tieng-anh' ? Math.hypot(position.x, position.z) <= 6.4
        : world === 'tieng-viet' ? isVietnameseWalkable(position.x, position.z) : true
    if (!walkable) {
      body.setTranslation({ x: lastDryPosition.current.x, y: position.y, z: lastDryPosition.current.z }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      direction.set(0, 0, 0)
    } else if (world === 'village' || world === 'tieng-anh' || world === 'tieng-viet') {
      lastDryPosition.current = { x: position.x, z: position.z }
    }
    let blockedX = false
    let blockedZ = false
    if (world === 'village' && !mathDepartureStage) {
      const dock = MATH_DOCK_WALKWAY
      const nextX = position.x + direction.x * dt * 11.2
      const nextZ = position.z + direction.z * dt * 11.2
      if (nextX > dock.startX && nextX < dock.endX && Math.abs(nextZ - dock.centerZ) > dock.halfWidth && direction.x > 0) {
        direction.x = 0
        blockedX = true
      }
      if (position.x > dock.startX && position.x < dock.endX + 0.5) {
        if (nextZ > dock.centerZ + dock.halfWidth && direction.z > 0) {
          direction.z = 0
          blockedZ = true
        } else if (nextZ < dock.centerZ - dock.halfWidth && direction.z < 0) {
          direction.z = 0
          blockedZ = true
        }
      }
      if (nextX > dock.endX && direction.x > 0) {
        direction.x = 0
        blockedX = true
      }
      if (!isVillageWalkable(nextX, nextZ)) {
        direction.set(0, 0, 0)
        blockedX = true
        blockedZ = true
      }
    }
    if (world === 'tieng-anh' && Math.hypot(position.x + direction.x * dt * 11.2, position.z + direction.z * dt * 11.2) > 6.4) {
      direction.set(0, 0, 0)
      blockedX = true
      blockedZ = true
    }
    if (world === 'tieng-viet' && !isVietnameseWalkable(position.x + direction.x * dt * 11.2, position.z + direction.z * dt * 11.2)) {
      direction.set(0, 0, 0)
      blockedX = true
      blockedZ = true
    }
    const inputStrength = transitionRun ? 1 : Math.min(direction.length(), 1)
    if (inputStrength > 0) direction.normalize()
    const isBackingUp = !transitionRun && forwardInput < -0.04
    if (isTurnOnly) {
      playerYaw.current -= rightInput * 2.1 * dt
    } else {
      const facingDirection = isBackingUp || inputStrength <= 0.04 ? cameraForward : direction
      const targetYaw = Math.atan2(facingDirection.x, facingDirection.z)
      const yawDelta = Math.atan2(Math.sin(targetYaw - playerYaw.current), Math.cos(targetYaw - playerYaw.current))
      if (Math.abs(yawDelta) > 0.012) playerYaw.current += yawDelta * (1 - Math.exp(-CAMERA_CONFIG.playerTurnSmooth * dt))
    }
    if (inputStrength > 0.04 && !isBackingUp) {
      // Orbit behind the actual travel heading. The movement basis stays fixed
      // during the stride so camera follow cannot curve the player's path.
      const targetCameraYaw = Math.atan2(-direction.x, -direction.z)
      const cameraYawDelta = Math.atan2(Math.sin(targetCameraYaw - cameraYaw.current), Math.cos(targetCameraYaw - cameraYaw.current))
      if (Math.abs(cameraYawDelta) > 0.012) cameraYaw.current += cameraYawDelta * (1 - Math.exp(-CAMERA_CONFIG.playerTurnSmooth * dt))
    } else if (isTurnOnly) {
      const targetCameraYaw = playerYaw.current - Math.PI
      const cameraYawDelta = Math.atan2(Math.sin(targetCameraYaw - cameraYaw.current), Math.cos(targetCameraYaw - cameraYaw.current))
      if (Math.abs(cameraYawDelta) > 0.012) cameraYaw.current += cameraYawDelta * (1 - Math.exp(-CAMERA_CONFIG.playerTurnSmooth * dt))
    }

    let velocity = body.linvel()
    if (blockedX) velocity = { ...velocity, x: 0 }
    if (blockedZ) velocity = { ...velocity, z: 0 }
    const onEnglishStep = world === 'village' && ENGLISH_GROUND_STEPS.some((step) =>
      Math.hypot(position.x - step.x, position.z - step.z) < step.radius
      && Math.abs(position.y - (step.top + 1.22)) < 0.18)
    const grounded = (body.translation().y <= 1.25 || onEnglishStep) && velocity.y <= 0.15
    if (!canJump.current && grounded) canJump.current = true
    const previousGrounded = wasGrounded.current
    motion.current.jumpStarted = false
    if (pendingJump.current) {
      pendingJump.current = false
      const inDockNoJumpZone = world === 'village' && position.x > MATH_DOCK_WALKWAY.startX && position.x < MATH_DOCK_WALKWAY.endX + 1
      if (canJump.current && !transitionPhase && !inDockNoJumpZone) {
        body.applyImpulse({ x: 0, y: 4.8, z: 0 }, true)
        canJump.current = false
        motion.current.jumpStarted = true
        velocity = body.linvel()
      }
    }

    const smoothing = isTurnOnly || transitionLocked ? 1 : 1 - Math.exp(-12 * dt)
    const nextX = THREE.MathUtils.lerp(velocity.x, direction.x * 11.2 * inputStrength, smoothing)
    const nextZ = THREE.MathUtils.lerp(velocity.z, direction.z * 11.2 * inputStrength, smoothing)
    body.setLinvel({ x: nextX, y: velocity.y, z: nextZ }, true)
    motion.current.speed = Math.hypot(nextX, nextZ)
    motion.current.verticalVelocity = velocity.y
    motion.current.grounded = grounded && !motion.current.jumpStarted
    motion.current.justLanded = motion.current.grounded && !previousGrounded
    wasGrounded.current = motion.current.grounded

    const rotation = body.rotation()
    currentRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w)
    targetRotation.current.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, playerYaw.current)
    currentRotation.current.slerp(targetRotation.current, 1 - Math.exp(-CAMERA_CONFIG.playerTurnSmooth * dt))
    const nextRotation = currentRotation.current
    body.setRotation({ x: nextRotation.x, y: nextRotation.y, z: nextRotation.z, w: nextRotation.w }, true)

    if (!transitionPhase && !bridgeTriggered.current && Math.abs(position.x) < 1.05 && world !== 'tieng-anh') {
      const reachedBridgeTrigger = world === 'village' ? position.z < -32.4 : position.z > -24.5
      if (reachedBridgeTrigger) {
        bridgeTriggered.current = true
        onBridgeReach(world)
      }
    }
    const active = PORTALS.find((portal) => {
      if (world !== 'village') return false
      const portalPosition = PORTAL_POSITIONS[portal.id]
      return Math.hypot(position.x - portalPosition[0], position.z - portalPosition[2]) < 3.2
    }) ?? null
    if (lastPortal.current !== (active?.id ?? null)) {
      lastPortal.current = active?.id ?? null
      onPortalChange(active)
    }
  })

  return <RigidBody ref={playerRef} colliders={false} position={spawn.position} rotation={[0, spawn.yaw, 0]} enabledRotations={[false, false, false]} gravityScale={englishLaunchStage === 'rocket-flight' ? 0 : 1} linearDamping={englishLaunchStage === 'rocket-flight' ? 0 : 0.8}>
    <CapsuleCollider args={[character.collider.halfHeight, character.collider.radius]} friction={0} />
    <CharacterRenderer character={character} skin={skin} motion={motion} hidden={cameraMode === 'firstPerson' || mathDepartureStage === 'seated' || mathDepartureStage === 'sailing' || mathDepartureStage === 'transitioning' || englishLaunchStage === 'seated' || englishLaunchStage === 'launching' || englishLaunchStage === 'transitioning' || englishLaunchStage === 'landing' || englishLaunchStage === 'returning' || englishLaunchStage === 'rocket-flight'} cameraDistance={cameraDistance} />
  </RigidBody>
}
