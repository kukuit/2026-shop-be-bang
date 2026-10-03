'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { CharacterMotionRef } from './character/types'
import { CAMERA_PRESETS } from './camera-config'
import { ENGLISH_PLANETS } from './world/english-world.config'
import type { MoveInput } from './types'

const MAX_FORWARD_SPEED = 11
const MAX_REVERSE_SPEED = 4
const MAX_YAW_SPEED = 1.4
const MAX_PITCH = THREE.MathUtils.degToRad(25)
const MAX_ROLL = THREE.MathUtils.degToRad(15)
const PLANET_COLLISION_RADIUS = 4.9
const PITCH_AXIS = new THREE.Vector3(1, 0, 0)

function limitVelocityAtBoundary(position: number, velocity: number, min: number, max: number, delta: number) {
  const nextPosition = position + velocity * delta
  if (nextPosition > max) return Math.max(0, (max - position) / delta)
  if (nextPosition < min) return Math.min(0, (min - position) / delta)
  return velocity
}

type Props = {
  active: boolean
  playerRef: MutableRefObject<RapierRigidBody | null>
  keys: MutableRefObject<Set<string>>
  move: MoveInput
  cameraYaw: MutableRefObject<number>
  cameraPitch: MutableRefObject<number>
  motion: CharacterMotionRef
}

/** Arcade rocket steering, thrust, inertia, planet collision, and flight bounds. */
export function useRocketFlight({ active, playerRef, keys, move, cameraYaw, cameraPitch, motion }: Props) {
  const velocity = useRef(new THREE.Vector3()).current
  const forward = useRef(new THREE.Vector3()).current
  const collisionNormal = useRef(new THREE.Vector3()).current
  const yawQuaternion = useRef(new THREE.Quaternion()).current
  const pitchQuaternion = useRef(new THREE.Quaternion()).current
  const rollQuaternion = useRef(new THREE.Quaternion()).current
  const orientation = useRef(new THREE.Quaternion()).current
  const yaw = useRef(0)
  const pitch = useRef(0)
  const roll = useRef(0)
  const yawVelocity = useRef(0)
  const wasActive = useRef(false)

  useFrame((_, delta) => {
    if (!active) {
      wasActive.current = false
      return
    }
    const body = playerRef.current
    if (!body) return
    const dt = Math.max(0.001, Math.min(delta, 0.05))
    if (!wasActive.current) {
      wasActive.current = true
      yaw.current = cameraYaw.current
      pitch.current = 0
      roll.current = 0
      yawVelocity.current = 0
      velocity.set(0, 0, 0)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    const turnInput = THREE.MathUtils.clamp(
      Number(keys.current.has('a') || keys.current.has('arrowleft'))
        - Number(keys.current.has('d') || keys.current.has('arrowright'))
        - move.x,
      -1,
      1,
    )
    yawVelocity.current = THREE.MathUtils.damp(yawVelocity.current, turnInput * MAX_YAW_SPEED, 5, dt)
    cameraYaw.current += yawVelocity.current * dt
    yaw.current = THREE.MathUtils.damp(yaw.current, cameraYaw.current, 7, dt)

    const pitchInput = THREE.MathUtils.clamp(
      Number(keys.current.has(' ')) - Number(keys.current.has('shift')) + (move.y ?? 0),
      -1,
      1,
    )
    const defaultCameraPitch = Math.atan2(CAMERA_PRESETS.normal.height, CAMERA_PRESETS.normal.distance)
    const pointerPitch = THREE.MathUtils.clamp(cameraPitch.current - defaultCameraPitch, -MAX_PITCH, MAX_PITCH)
    const targetPitch = THREE.MathUtils.clamp(pointerPitch + pitchInput * MAX_PITCH, -MAX_PITCH, MAX_PITCH)
    pitch.current = THREE.MathUtils.damp(pitch.current, targetPitch, Math.abs(pitchInput) > 0.01 ? 5 : 2.5, dt)
    roll.current = THREE.MathUtils.damp(roll.current, turnInput * MAX_ROLL, 6, dt)

    yawQuaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current + Math.PI)
    pitchQuaternion.setFromAxisAngle(PITCH_AXIS, Math.PI / 2 - pitch.current)
    rollQuaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, roll.current)
    orientation.copy(yawQuaternion).multiply(pitchQuaternion).multiply(rollQuaternion)
    body.setRotation({ x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w }, true)
    forward.set(0, 1, 0).applyQuaternion(orientation).normalize()

    const throttle = THREE.MathUtils.clamp(
      Number(keys.current.has('w') || keys.current.has('arrowup'))
        - Number(keys.current.has('s') || keys.current.has('arrowdown'))
        + move.z,
      -1,
      1,
    )
    const position = body.translation()
    const bodyVelocity = body.linvel()
    velocity.set(bodyVelocity.x, bodyVelocity.y, bodyVelocity.z)
    if (throttle > 0.01) velocity.addScaledVector(forward, 9 * throttle * dt)
    else if (throttle < -0.01) velocity.addScaledVector(forward, 5 * throttle * dt)
    else if (Math.abs(pitchInput) > 0.01) velocity.addScaledVector(forward, 5.5 * dt)
    else velocity.multiplyScalar(Math.exp(-0.45 * dt))

    const speedBeforeSteering = velocity.length()
    if (speedBeforeSteering > 0.01) {
      const signedDirection = throttle < -0.01 ? -1 : throttle > 0.01 ? 1 : velocity.dot(forward) < 0 ? -1 : 1
      velocity.lerp(forward.multiplyScalar(speedBeforeSteering * signedDirection), 1 - Math.exp(-1.8 * dt))
      forward.set(0, 1, 0).applyQuaternion(orientation).normalize()
    } else if (Math.abs(throttle) < 0.01 && Math.abs(turnInput) > 0.01) {
      velocity.addScaledVector(forward, 0.16 * dt)
    }

    const forwardSpeed = velocity.dot(forward)
    if (forwardSpeed > MAX_FORWARD_SPEED) velocity.addScaledVector(forward, MAX_FORWARD_SPEED - forwardSpeed)
    else if (forwardSpeed < -MAX_REVERSE_SPEED) velocity.addScaledVector(forward, -MAX_REVERSE_SPEED - forwardSpeed)
    velocity.y = THREE.MathUtils.clamp(velocity.y, -7, 7)
    if (velocity.lengthSq() > 13 * 13) velocity.setLength(13)

    for (const planet of ENGLISH_PLANETS) {
      collisionNormal.set(position.x - planet.position[0], position.y - planet.position[1], position.z - planet.position[2])
      const distance = collisionNormal.length()
      if (distance >= PLANET_COLLISION_RADIUS) continue
      if (distance < 0.001) collisionNormal.copy(forward).negate()
      else collisionNormal.divideScalar(distance)
      body.setTranslation({
        x: planet.position[0] + collisionNormal.x * PLANET_COLLISION_RADIUS,
        y: planet.position[1] + collisionNormal.y * PLANET_COLLISION_RADIUS,
        z: planet.position[2] + collisionNormal.z * PLANET_COLLISION_RADIUS,
      }, true)
      const inwardSpeed = velocity.dot(collisionNormal)
      if (inwardSpeed < 0) velocity.addScaledVector(collisionNormal, -inwardSpeed)
    }

    const nextX = limitVelocityAtBoundary(position.x, velocity.x, -72, 72, dt)
    const nextY = limitVelocityAtBoundary(position.y, velocity.y, -8, 12, dt)
    const nextZ = limitVelocityAtBoundary(position.z, velocity.z, -72, 72, dt)
    body.setLinvel({ x: nextX, y: nextY, z: nextZ }, true)
    motion.current.speed = Math.hypot(nextX, nextZ)
    motion.current.verticalVelocity = nextY
    motion.current.grounded = false
  })
}
