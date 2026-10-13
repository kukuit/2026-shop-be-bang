'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import { OCEAN_LARGE_OBSTACLES, OCEAN_MAP_HALF_SIZE, getOceanFloorHeight } from './ocean-layout'

export default function OceanCamera({ target, yaw, distance }: {
  target: MutableRefObject<THREE.Group | null>
  yaw: MutableRefObject<number>
  distance: MutableRefObject<number>
}) {
  const { camera, gl } = useThree()
  const pitch = useRef(0.31)
  const dragging = useRef<{ id: number; x: number; y: number } | null>(null)
  const lookTarget = useRef(new THREE.Vector3())
  const desired = useMemo(() => new THREE.Vector3(), [])
  const from = useMemo(() => new THREE.Vector3(), [])
  const segment = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.touchAction = 'none'
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      dragging.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    const onMove = (event: PointerEvent) => {
      const previous = dragging.current
      if (!previous || previous.id !== event.pointerId) return
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      previous.x = event.clientX
      previous.y = event.clientY
      yaw.current -= dx * 0.006
      pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.004, 0.12, 0.58)
    }
    const onUp = (event: PointerEvent) => {
      if (dragging.current?.id === event.pointerId) dragging.current = null
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      distance.current = THREE.MathUtils.clamp(distance.current + Math.sign(event.deltaY) * 0.55, 4.2, 9.5)
    }
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      dragging.current = null
    }
  }, [distance, gl, yaw])

  useFrame((_, delta) => {
    const player = target.current
    if (!player) return
    const dt = Math.min(delta, 0.05)
    const playerPosition = player.position
    lookTarget.current.lerp(new THREE.Vector3(playerPosition.x, playerPosition.y + 1.55, playerPosition.z), 1 - Math.exp(-5.5 * dt))
    const cosPitch = Math.cos(pitch.current)
    let cameraDistance = distance.current
    desired.set(
      lookTarget.current.x + Math.sin(yaw.current) * cosPitch * cameraDistance,
      lookTarget.current.y + Math.sin(pitch.current) * cameraDistance,
      lookTarget.current.z + Math.cos(yaw.current) * cosPitch * cameraDistance,
    )

    from.copy(lookTarget.current)
    segment.subVectors(desired, from)
    const lengthSq = Math.max(0.0001, segment.lengthSq())
    for (const obstacle of OCEAN_LARGE_OBSTACLES) {
      const centerX = obstacle.x
      const centerZ = obstacle.z
      const t = THREE.MathUtils.clamp(((centerX - from.x) * segment.x + (centerZ - from.z) * segment.z) / lengthSq, 0, 1)
      const closestX = from.x + segment.x * t
      const closestZ = from.z + segment.z * t
      if (Math.hypot(closestX - centerX, closestZ - centerZ) < obstacle.radius + 0.75) cameraDistance = Math.min(cameraDistance, Math.max(3.4, distance.current * 0.58))
    }
    desired.set(
      lookTarget.current.x + Math.sin(yaw.current) * cosPitch * cameraDistance,
      lookTarget.current.y + Math.sin(pitch.current) * cameraDistance,
      lookTarget.current.z + Math.cos(yaw.current) * cosPitch * cameraDistance,
    )
    desired.x = THREE.MathUtils.clamp(desired.x, -OCEAN_MAP_HALF_SIZE + 0.5, OCEAN_MAP_HALF_SIZE - 0.5)
    desired.z = THREE.MathUtils.clamp(desired.z, -OCEAN_MAP_HALF_SIZE + 0.5, OCEAN_MAP_HALF_SIZE - 0.5)
    desired.y = Math.max(desired.y, getOceanFloorHeight(desired.x, desired.z) + 1.1)
    camera.position.lerp(desired, 1 - Math.exp(-6.8 * dt))
    camera.lookAt(lookTarget.current)
  })
  return null
}
