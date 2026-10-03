'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import { CAMERA_CONFIG, CAMERA_PRESETS, type CameraMode } from './camera-config'
import type { CharacterDefinition } from './character/types'

type Props = {
  target: MutableRefObject<RapierRigidBody | null>
  yaw: MutableRefObject<number>
  cameraDistance: MutableRefObject<number>
  mode: CameraMode
  characterCamera: CharacterDefinition['camera']
}

type PointerPosition = { x: number; y: number }

export default function ThirdPersonCameraController({ target, yaw, cameraDistance, mode, characterCamera }: Props) {
  const { camera, gl } = useThree()
  const currentDistance = useRef(CAMERA_PRESETS.normal.distance)
  const targetDistance = useRef(CAMERA_PRESETS.normal.distance)
  const currentHeight = useRef(CAMERA_PRESETS.normal.height)
  const targetHeight = useRef(CAMERA_PRESETS.normal.height)
  const currentLookAhead = useRef(CAMERA_PRESETS.normal.lookAhead)
  const targetLookAhead = useRef(CAMERA_PRESETS.normal.lookAhead)
  const currentPitch = useRef(Math.atan2(CAMERA_PRESETS.normal.height, CAMERA_PRESETS.normal.distance))
  const targetPitch = useRef(currentPitch.current)
  const currentFov = useRef(CAMERA_PRESETS.normal.fov)
  const targetFov = useRef(CAMERA_PRESETS.normal.fov)
  const currentLookTarget = useRef(new THREE.Vector3())
  const playerPosition = useRef(new THREE.Vector3()).current
  const playerQuaternion = useRef(new THREE.Quaternion()).current
  const facing = useRef(new THREE.Vector3()).current
  const forward = useRef(new THREE.Vector3()).current
  const desiredPosition = useRef(new THREE.Vector3()).current
  const desiredLookTarget = useRef(new THREE.Vector3()).current
  const verticalOffset = useRef(new THREE.Vector3()).current
  const orbitOffset = useRef(new THREE.Vector3()).current
  const initialized = useRef(false)
  const previousMode = useRef<CameraMode>(mode)
  const lastManualInput = useRef(0)
  const pointers = useRef(new Map<number, PointerPosition>())
  const pinchDistance = useRef(0)
  const dragPointer = useRef<number | null>(null)
  const lastPointer = useRef<PointerPosition | null>(null)

  useEffect(() => {
    const gameArea = gl.domElement.closest<HTMLElement>('[data-demo-world]')
    if (!gameArea) return

    const isIgnoredTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('[data-camera-ignore]'))

    const pointerDown = (event: PointerEvent) => {
      if (isIgnoredTarget(event.target)) return
      lastManualInput.current = performance.now()
      if (event.pointerType === 'mouse') {
        if (event.button !== 0) return
        dragPointer.current = event.pointerId
        lastPointer.current = { x: event.clientX, y: event.clientY }
        gameArea.setPointerCapture?.(event.pointerId)
        event.preventDefault()
        return
      }
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 1) {
        dragPointer.current = event.pointerId
        lastPointer.current = { x: event.clientX, y: event.clientY }
      } else if (pointers.current.size === 2) {
        dragPointer.current = null
        const [a, b] = Array.from(pointers.current.values())
        pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y)
      }
      event.preventDefault()
    }

    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (dragPointer.current !== event.pointerId || !lastPointer.current) return
        yaw.current -= (event.clientX - lastPointer.current.x) * CAMERA_CONFIG.rotateSpeed
        targetPitch.current = THREE.MathUtils.clamp(
          targetPitch.current + (event.clientY - lastPointer.current.y) * CAMERA_CONFIG.rotateSpeed,
          CAMERA_CONFIG.minPitch,
          CAMERA_CONFIG.maxPitch,
        )
        lastPointer.current = { x: event.clientX, y: event.clientY }
        lastManualInput.current = performance.now()
        return
      }

      if (!pointers.current.has(event.pointerId)) return
      const previous = pointers.current.get(event.pointerId)!
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size >= 2) {
        const [a, b] = Array.from(pointers.current.values())
        const nextDistance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance.current > 0) {
          targetDistance.current = THREE.MathUtils.clamp(
            targetDistance.current + (nextDistance - pinchDistance.current) * CAMERA_CONFIG.pinchSpeed,
            CAMERA_CONFIG.minDistance,
            CAMERA_CONFIG.maxDistance,
          )
        }
        pinchDistance.current = nextDistance
      } else {
        yaw.current -= (event.clientX - previous.x) * CAMERA_CONFIG.rotateSpeed
        targetPitch.current = THREE.MathUtils.clamp(
          targetPitch.current + (event.clientY - previous.y) * CAMERA_CONFIG.rotateSpeed,
          CAMERA_CONFIG.minPitch,
          CAMERA_CONFIG.maxPitch,
        )
      }
      lastManualInput.current = performance.now()
      event.preventDefault()
    }

    const pointerUp = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      if (dragPointer.current === event.pointerId) dragPointer.current = null
      if (pointers.current.size < 2) pinchDistance.current = 0
      if (pointers.current.size === 1) {
        const [id, point] = Array.from(pointers.current.entries())[0]
        dragPointer.current = id
        lastPointer.current = point
      }
    }

    const wheel = (event: WheelEvent) => {
      if (isIgnoredTarget(event.target)) return
      event.preventDefault()
      targetDistance.current = THREE.MathUtils.clamp(
        targetDistance.current + event.deltaY * CAMERA_CONFIG.zoomSpeed,
        CAMERA_CONFIG.minDistance,
        CAMERA_CONFIG.maxDistance,
      )
      lastManualInput.current = performance.now()
    }

    gameArea.addEventListener('pointerdown', pointerDown)
    gameArea.addEventListener('pointermove', pointerMove)
    gameArea.addEventListener('pointerup', pointerUp)
    gameArea.addEventListener('pointercancel', pointerUp)
    gameArea.addEventListener('wheel', wheel, { passive: false })
    return () => {
      gameArea.removeEventListener('pointerdown', pointerDown)
      gameArea.removeEventListener('pointermove', pointerMove)
      gameArea.removeEventListener('pointerup', pointerUp)
      gameArea.removeEventListener('pointercancel', pointerUp)
      gameArea.removeEventListener('wheel', wheel)
    }
  }, [gl, yaw])

  useFrame((_, delta) => {
    const player = target.current
    if (!player) return
    const preset = CAMERA_PRESETS[mode]
    if (previousMode.current !== mode) {
      previousMode.current = mode
      targetDistance.current = preset.distance
      targetHeight.current = mode === 'firstPerson' ? characterCamera.firstPersonHeight : preset.height
      targetLookAhead.current = preset.lookAhead
      targetFov.current = preset.fov
      targetPitch.current = mode === 'firstPerson' ? 0 : Math.atan2(preset.height, preset.distance)
      lastManualInput.current = performance.now()
    }

    const position = player.translation()
    const rotation = player.rotation()
    const velocity = player.linvel()
    playerPosition.set(position.x, position.y, position.z)
    playerQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    facing.set(0, 0, 1).applyQuaternion(playerQuaternion)
    const followYaw = Math.atan2(-facing.x, -facing.z)
    const isMoving = Math.hypot(velocity.x, velocity.z) > 0.3
    if (CAMERA_CONFIG.autoAlign && performance.now() - lastManualInput.current > CAMERA_CONFIG.manualHoldMs) {
      const difference = Math.atan2(Math.sin(followYaw - yaw.current), Math.cos(followYaw - yaw.current))
      const followSpeed = isMoving ? CAMERA_CONFIG.autoFollowSmooth : 2.2
      yaw.current += difference * (1 - Math.exp(-followSpeed * delta))
    }

    const modeAlpha = 1 - Math.exp(-CAMERA_CONFIG.modeSmooth * delta)
    currentDistance.current = THREE.MathUtils.lerp(currentDistance.current, targetDistance.current, modeAlpha)
    currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, targetHeight.current, modeAlpha)
    currentLookAhead.current = THREE.MathUtils.lerp(currentLookAhead.current, targetLookAhead.current, modeAlpha)
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch.current, modeAlpha)
    currentFov.current = THREE.MathUtils.lerp(currentFov.current, targetFov.current, modeAlpha)
    cameraDistance.current = currentDistance.current

    const pitchCos = Math.cos(currentPitch.current)
    forward.set(-Math.sin(yaw.current), mode === 'firstPerson' ? Math.sin(currentPitch.current) : 0, -Math.cos(yaw.current))
    if (mode === 'firstPerson') {
      desiredPosition.copy(playerPosition).add(verticalOffset.set(0, currentHeight.current, 0))
      desiredLookTarget.copy(desiredPosition).addScaledVector(forward, currentLookAhead.current)
    } else {
      orbitOffset.set(
        -forward.x * currentDistance.current,
        Math.tan(currentPitch.current) * currentDistance.current,
        -forward.z * currentDistance.current,
      )
      desiredPosition.copy(playerPosition).add(orbitOffset)
      const movementLookAhead = currentLookAhead.current * THREE.MathUtils.clamp(Math.hypot(velocity.x, velocity.z) / 2, 0, 1)
      desiredLookTarget.copy(playerPosition)
        .addScaledVector(forward, movementLookAhead)
        .add(verticalOffset.set(0, characterCamera.targetHeight, 0))
    }

    const followAlpha = 1 - Math.exp(-CAMERA_CONFIG.followSmooth * delta)
    const lookAlpha = 1 - Math.exp(-CAMERA_CONFIG.lookSmooth * delta)
    if (!initialized.current) {
      camera.position.copy(desiredPosition)
      currentLookTarget.current.copy(desiredLookTarget)
      initialized.current = true
    } else {
      camera.position.lerp(desiredPosition, followAlpha)
      currentLookTarget.current.lerp(desiredLookTarget, lookAlpha)
    }
    camera.lookAt(currentLookTarget.current)
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - currentFov.current) > 0.05) {
      camera.fov = currentFov.current
      camera.updateProjectionMatrix()
    }
  })

  return null
}
