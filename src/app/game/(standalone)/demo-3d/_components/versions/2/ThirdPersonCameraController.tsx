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
type Point = { x: number; y: number }

export default function ThirdPersonCameraController({ target, yaw, cameraDistance, mode, characterCamera }: Props) {
  const { camera, gl, scene } = useThree()
  const currentDistance = useRef(CAMERA_PRESETS.normal.distance)
  const desiredDistance = useRef(CAMERA_PRESETS.normal.distance)
  const pitch = useRef(CAMERA_PRESETS.normal.pitch)
  const points = useRef(new Map<number, Point>())
  const dragPointer = useRef<number | null>(null)
  const last = useRef<Point | null>(null)
  const pinchDistance = useRef(0)
  const targetPoint = useRef(new THREE.Vector3()).current
  const cameraDirection = useRef(new THREE.Vector3()).current
  const desiredPosition = useRef(new THREE.Vector3()).current
  const raycaster = useRef(new THREE.Raycaster()).current
  const occluders = useRef<THREE.Object3D[]>([])
  const initialized = useRef(false)
  const previousMode = useRef(mode)
  const mountedAt = useRef(0)

  useEffect(() => {
    mountedAt.current = performance.now()
    const area = gl.domElement.closest<HTMLElement>('[data-demo-world]')
    if (!area) return
    const ignore = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('[data-camera-ignore]'))
    const down = (event: PointerEvent) => {
      if (ignore(event.target)) return
      if (event.pointerType === 'mouse' && event.button !== 2) return
      if (event.pointerType === 'mouse') event.preventDefault()
      if (event.pointerType !== 'mouse') {
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (points.current.size === 1) {
          dragPointer.current = event.pointerId
          last.current = { x: event.clientX, y: event.clientY }
        } else if (points.current.size === 2) {
          dragPointer.current = null
          const [a, b] = Array.from(points.current.values())
          pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y)
        }
      } else {
        dragPointer.current = event.pointerId
        last.current = { x: event.clientX, y: event.clientY }
      }
      if (event.pointerType !== 'mouse') area.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        if (dragPointer.current !== event.pointerId || !last.current) return
        yaw.current -= (event.clientX - last.current.x) * CAMERA_CONFIG.rotateSpeed
        pitch.current = THREE.MathUtils.clamp(pitch.current + (event.clientY - last.current.y) * CAMERA_CONFIG.rotateSpeed, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch)
        last.current = { x: event.clientX, y: event.clientY }
        event.preventDefault()
        return
      }
      if (!points.current.has(event.pointerId)) return
      const prev = points.current.get(event.pointerId)!
      points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (points.current.size >= 2) {
        const [a, b] = Array.from(points.current.values())
        const next = Math.hypot(a.x - b.x, a.y - b.y)
        desiredDistance.current = THREE.MathUtils.clamp(desiredDistance.current - (next - pinchDistance.current) * CAMERA_CONFIG.pinchSpeed, CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
        pinchDistance.current = next
      } else {
        yaw.current -= (event.clientX - prev.x) * CAMERA_CONFIG.rotateSpeed
        pitch.current = THREE.MathUtils.clamp(pitch.current + (event.clientY - prev.y) * CAMERA_CONFIG.rotateSpeed, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch)
      }
      event.preventDefault()
    }
    const up = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && dragPointer.current === event.pointerId) dragPointer.current = null
      points.current.delete(event.pointerId)
      if (dragPointer.current === event.pointerId) dragPointer.current = null
      if (points.current.size < 2) pinchDistance.current = 0
      if (points.current.size === 1) {
        const [id, p] = Array.from(points.current.entries())[0]
        dragPointer.current = id
        last.current = p
      }
    }
    const wheel = (event: WheelEvent) => {
      if (ignore(event.target)) return
      event.preventDefault()
      // Ignore scroll momentum carried over from the page that opened the game.
      if (performance.now() - mountedAt.current < 900) return
      desiredDistance.current = THREE.MathUtils.clamp(desiredDistance.current + event.deltaY * CAMERA_CONFIG.zoomSpeed, CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
    }
    const context = (event: MouseEvent) => event.preventDefault()
    area.addEventListener('pointerdown', down)
    area.addEventListener('pointermove', move)
    area.addEventListener('pointerup', up)
    area.addEventListener('pointercancel', up)
    area.addEventListener('wheel', wheel, { passive: false })
    area.addEventListener('contextmenu', context)
    return () => {
      area.removeEventListener('pointerdown', down)
      area.removeEventListener('pointermove', move)
      area.removeEventListener('pointerup', up)
      area.removeEventListener('pointercancel', up)
      area.removeEventListener('wheel', wheel)
      area.removeEventListener('contextmenu', context)
    }
  }, [gl, yaw])

  useEffect(() => {
    occluders.current = []
    scene.traverse((object) => {
      if (object.userData.cameraOccluder && object instanceof THREE.Mesh) occluders.current.push(object)
    })
  }, [scene])

  useFrame((_, delta) => {
    const body = target.current
    if (!body) return
    if (previousMode.current !== mode) {
      previousMode.current = mode
      desiredDistance.current = mode === 'firstPerson' ? CAMERA_PRESETS[mode].distance : THREE.MathUtils.clamp(CAMERA_PRESETS[mode].distance, CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
      pitch.current = CAMERA_PRESETS[mode].pitch
    }
    const p = body.translation()
    const groundY = p.y - 1.2
    targetPoint.set(p.x, groundY + characterCamera.headHeight * 0.65, p.z)
    const isFirstPerson = mode === 'firstPerson' || desiredDistance.current <= CAMERA_CONFIG.minDistance + 0.12
    if (isFirstPerson) {
      const playerRotation = body.rotation()
      cameraDirection.set(0, 0, 1).applyQuaternion(new THREE.Quaternion(playerRotation.x, playerRotation.y, playerRotation.z, playerRotation.w))
      desiredPosition.copy(targetPoint).addScaledVector(cameraDirection, -0.05)
      desiredPosition.y = groundY + characterCamera.headHeight * 0.88
      currentDistance.current = 0
      cameraDistance.current = 0
    } else {
      const horizontal = Math.cos(pitch.current)
      // This vector points from the target toward the camera: positive pitch
      // must raise the camera above Cappy instead of placing it under the floor.
      cameraDirection.set(-Math.sin(yaw.current) * horizontal, Math.sin(pitch.current), Math.cos(yaw.current) * horizontal).normalize()
      const wantedDistance = THREE.MathUtils.clamp(desiredDistance.current, CAMERA_CONFIG.minDistance, CAMERA_CONFIG.maxDistance)
      desiredPosition.copy(targetPoint).addScaledVector(cameraDirection, wantedDistance)
      // Keep the orbit camera above the playable ground at low pitch angles,
      // and cap extreme elevation so the world cannot disappear below the view.
      desiredPosition.y = THREE.MathUtils.clamp(desiredPosition.y, groundY + 0.5, groundY + 8.5)
      cameraDirection.copy(desiredPosition).sub(targetPoint).normalize()
      const collisionDistance = desiredPosition.distanceTo(targetPoint)
      raycaster.set(targetPoint, cameraDirection)
      raycaster.far = collisionDistance
      const hit = raycaster.intersectObjects(occluders.current, false).find((item) => item.distance > 0.25)
      const safeDistance = hit ? Math.max(0.75, Math.min(collisionDistance, hit.distance - CAMERA_CONFIG.collisionPadding)) : collisionDistance
      currentDistance.current = initialized.current
        ? THREE.MathUtils.lerp(currentDistance.current, safeDistance, 1 - Math.exp(CAMERA_CONFIG.zoomSmooth * Math.min(delta, 0.05)))
        : safeDistance
      desiredPosition.copy(targetPoint).addScaledVector(cameraDirection, Math.min(currentDistance.current, collisionDistance))
      // Keep the requested zoom separate from collision shortening: an obstacle
      // must never make the character renderer think the user selected first person.
      cameraDistance.current = desiredDistance.current
    }
    const alpha = 1 - Math.exp(CAMERA_CONFIG.followSmooth * Math.min(delta, 0.05))
    if (!initialized.current) {
      camera.position.copy(desiredPosition)
      initialized.current = true
    } else camera.position.lerp(desiredPosition, alpha)
    if (!isFirstPerson) camera.position.y = Math.max(camera.position.y, groundY + 0.35)
    camera.lookAt(targetPoint)
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== 55) {
      camera.fov = 55
      camera.updateProjectionMatrix()
    }
  })

  return null
}
