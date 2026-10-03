'use client'

import { Billboard, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useDemo3DStableGame } from '../GameShell'
import { CAMERA_PRESETS } from '../camera-config'
import BoatModel from '../boat/BoatModel'
import type { CharacterMotionRef } from '../character/types'
import { MATH_ISLANDS, MATH_ROUTE_BUOYS, MATH_STATUS_COLORS } from './mathIslands.config'
import type { MathIslandConfig } from './mathIslands.config'

export type MathDockTarget = { kind: 'home' } | { kind: 'lesson'; id: number } | null
const HOME_RETURN_POSITION = { x: 0, z: 32 }

const ISLAND_SAND_GEOMETRY = new THREE.CylinderGeometry(4.9, 5.6, 0.72, 9)
const ISLAND_GRASS_GEOMETRY = new THREE.CylinderGeometry(4.25, 4.8, 0.58, 9)
const TREE_TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.16, 0.24, 1.35, 5)
const TREE_CROWN_GEOMETRY = new THREE.ConeGeometry(1.05, 2.1, 6)
const BUOY_GEOMETRY = new THREE.ConeGeometry(0.36, 0.8, 6)
const PIER_PLANK_GEOMETRY = new THREE.BoxGeometry(0.82, 0.13, 1.65)
const DISTANT_ISLAND_GEOMETRY = new THREE.ConeGeometry(1, 1, 7)
const START_DOCK_PLANK_GEOMETRY = new THREE.BoxGeometry(2.8, 0.16, 0.72)
const START_DOCK_POST_GEOMETRY = new THREE.BoxGeometry(0.24, 1.1, 0.24)
const LOCKED_BARRIER_GEOMETRY = new THREE.BoxGeometry(2.1, 0.5, 0.16)

export default function MathWorld({ onDockChange, onReady }: {
  onDockChange: (target: MathDockTarget) => void
  onReady: () => void
}) {
  const { camera, gl, scene } = useThree()
  const game = useDemo3DStableGame()
  const boatRef = useRef<THREE.Group>(null)
  const yaw = useRef(0)
  const speed = useRef(0)
  const keys = useRef(new Set<string>())
  const targetDock = useRef<string | null>(null)
  const motion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })
  const [showWake, setShowWake] = useState(false)
  const wakeState = useRef(false)
  const cameraOrbit = useRef(0)
  const cameraDistance = useRef(THREE.MathUtils.clamp(game.cameraDistance.current || 11, 7, 22))
  const targetCameraDistance = useRef(cameraDistance.current)
  const cameraTarget = useRef(new THREE.Vector3())
  const cameraLookAhead = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const desiredCamera = useRef(new THREE.Vector3())
  const cameraForward = useRef(new THREE.Vector3())
  const cameraUp = useRef(new THREE.Vector3(0, 1, 0))
  const boatForward = useRef(new THREE.Vector3())
  const boatPosition = useRef(new THREE.Vector3(0, -0.1, 8))
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null)
  const pinch = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    onReady()
  }, [onReady])

  useEffect(() => {
    const pressedKeys = keys.current
    const down = (event: KeyboardEvent) => pressedKeys.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => pressedKeys.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      pressedKeys.clear()
    }
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    const ignored = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('[data-camera-ignore]'))
    const down = (event: PointerEvent) => {
      if (ignored(event.target)) return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 1) pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values())
        pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
        pointer.current = null
      }
      event.preventDefault()
    }
    const move = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return
      const previous = pointers.current.get(event.pointerId)!
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size > 1) {
        const [a, b] = Array.from(pointers.current.values())
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch.current > 0) targetCameraDistance.current = THREE.MathUtils.clamp(targetCameraDistance.current + (pinch.current - distance) * 0.02, 7, 22)
        pinch.current = distance
      } else if (pointer.current?.id === event.pointerId) {
        cameraOrbit.current -= (event.clientX - previous.x) * 0.006
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
      }
    }
    const up = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      if (pointer.current?.id === event.pointerId) pointer.current = null
      if (pointers.current.size < 2) pinch.current = 0
      if (pointers.current.size === 1) {
        const [id, point] = Array.from(pointers.current.entries())[0]
        pointer.current = { id, ...point }
      }
    }
    const wheel = (event: WheelEvent) => {
      if (ignored(event.target)) return
      targetCameraDistance.current = THREE.MathUtils.clamp(targetCameraDistance.current + event.deltaY * 0.008, 7, 22)
      event.preventDefault()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useEffect(() => {
    scene.fog = new THREE.Fog('#a9e6ec', 75, 205)
    return () => { scene.fog = null }
  }, [scene])

  useEffect(() => {
    targetCameraDistance.current = THREE.MathUtils.clamp(CAMERA_PRESETS[game.cameraMode].distance, 7, 22)
  }, [game.cameraMode])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const inputForward = THREE.MathUtils.clamp(
      Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown')) + game.moveRef.current.z,
      -1, 1,
    )
    const inputTurn = THREE.MathUtils.clamp(
      Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')) + game.moveRef.current.x,
      -1, 1,
    )
    if (inputForward > 0) speed.current = Math.min(8.2, speed.current + 8.5 * inputForward * dt)
    else if (inputForward < 0) speed.current = Math.max(-2.2, speed.current + 6.5 * inputForward * dt)
    else speed.current *= Math.exp(-1.5 * dt)
    if (Math.abs(speed.current) < 0.025) speed.current = 0

    const speedFactor = 0.28 + Math.min(Math.abs(speed.current) / 6, 1) * 0.72
    yaw.current -= inputTurn * 1.05 * speedFactor * dt
    boatForward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    boatPosition.current.x += boatForward.current.x * speed.current * dt
    boatPosition.current.z += boatForward.current.z * speed.current * dt

    // Low-cost circle collision keeps the boat off shore without a second physics world.
    for (const island of MATH_ISLANDS) {
      const dx = boatPosition.current.x - island.position[0]
      const dz = boatPosition.current.z - island.position[2]
      const distance = Math.hypot(dx, dz)
      const minimumDistance = island.radius - 0.2
      if (distance < minimumDistance) {
        const normalX = distance > 0.001 ? dx / distance : 1
        const normalZ = distance > 0.001 ? dz / distance : 0
        boatPosition.current.x = island.position[0] + normalX * minimumDistance
        boatPosition.current.z = island.position[2] + normalZ * minimumDistance
        const intoIsland = boatForward.current.x * normalX + boatForward.current.z * normalZ
        if (intoIsland < 0) speed.current *= 0.25
      }
    }

    // Keep the boat in the home-side channel; the distant shore is visible but
    // is still solid land rather than another open-water route.
    const shoreDx = boatPosition.current.x
    const shoreDz = boatPosition.current.z - 68
    const shoreDistance = Math.hypot(shoreDx, shoreDz)
    const shoreClearance = 14
    if (shoreDistance < shoreClearance) {
      const normalX = shoreDistance > 0.001 ? shoreDx / shoreDistance : 0
      const normalZ = shoreDistance > 0.001 ? shoreDz / shoreDistance : -1
      boatPosition.current.x = normalX * shoreClearance
      boatPosition.current.z = 68 + normalZ * shoreClearance
      const intoShore = boatForward.current.x * normalX + boatForward.current.z * normalZ
      if (intoShore < 0) speed.current *= 0.25
    }

    const edgeDistance = Math.hypot(boatPosition.current.x, boatPosition.current.z + 56)
    if (edgeDistance > 165) {
      const angle = Math.atan2(boatPosition.current.x, boatPosition.current.z + 56)
      boatPosition.current.x = Math.sin(angle) * 165
      boatPosition.current.z = -56 + Math.cos(angle) * 165
      speed.current *= 0.45
    }

    const bob = Math.sin(state.clock.elapsedTime * 1.5) * 0.025
    boatPosition.current.y = -0.1 + bob
    if (boatRef.current) {
      boatRef.current.position.copy(boatPosition.current)
      boatRef.current.rotation.set(Math.sin(state.clock.elapsedTime * 1.2) * 0.008, yaw.current, Math.cos(state.clock.elapsedTime * 1.1) * 0.006)
    }
    motion.current.speed = Math.abs(speed.current)
    const moving = Math.abs(speed.current) > 0.3
    if (moving !== wakeState.current) {
      wakeState.current = moving
      setShowWake(moving)
    }

    const returnDistance = Math.hypot(boatPosition.current.x - HOME_RETURN_POSITION.x, boatPosition.current.z - HOME_RETURN_POSITION.z)
    let nextDock: string | null = null
    if (returnDistance < 4.8 && Math.abs(speed.current) < 1.05) nextDock = 'home'
    else {
      const nearest = MATH_ISLANDS.find((island) => Math.hypot(boatPosition.current.x - island.dockPosition[0], boatPosition.current.z - island.dockPosition[2]) < 3.8)
      if (nearest && Math.abs(speed.current) < 1.05) nextDock = `lesson-${nearest.id}`
    }
    if (nextDock !== targetDock.current) {
      targetDock.current = nextDock
      onDockChange(nextDock === 'home' ? { kind: 'home' } : nextDock ? { kind: 'lesson', id: Number(nextDock.slice(7)) } : null)
    }

    const followYaw = yaw.current + cameraOrbit.current
    cameraForward.current.set(-Math.sin(followYaw), 0, -Math.cos(followYaw))
    cameraLookAhead.current.copy(cameraForward.current).multiplyScalar(4.8)
    desiredTarget.current.set(boatPosition.current.x, boatPosition.current.y + 1.85, boatPosition.current.z).add(cameraLookAhead.current)
    cameraTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-7 * dt))
    cameraDistance.current = THREE.MathUtils.lerp(cameraDistance.current, targetCameraDistance.current, 1 - Math.exp(-5 * dt))
    game.cameraDistance.current = cameraDistance.current
    desiredCamera.current.set(
      boatPosition.current.x + Math.sin(followYaw) * cameraDistance.current,
      boatPosition.current.y + 5.5 + cameraDistance.current * 0.12,
      boatPosition.current.z + Math.cos(followYaw) * cameraDistance.current,
    )
    camera.position.lerp(desiredCamera.current, 1 - Math.exp(-6.5 * dt))
    camera.up.copy(cameraUp.current)
    camera.lookAt(cameraTarget.current)
  })

  return <group ref={boatRef} position={[0, -0.1, 8]}>
    <BoatModel seatedCappy showWake={showWake} cameraDistance={game.cameraDistance} />
  </group>
}

export function MathOcean() {
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, -55]} frustumCulled>
      <planeGeometry args={[440, 440, 1, 1]} /><meshStandardMaterial color="#42bbd0" roughness={0.58} metalness={0.02} />
    </mesh>
    <mesh position={[0, 25, -82]} scale={[190, 28, 1]}>
      <planeGeometry args={[1, 1]} /><meshBasicMaterial color="#b4eaff" transparent opacity={0.45} depthWrite={false} />
    </mesh>
    <DistantIslands />
    <StartingDock />
    <HomeReturnGuide />
    <HomeShore />
  </>
}

function HomeReturnGuide() {
  const buoys = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd36b', flatShading: true, roughness: 0.8, emissive: '#d98b35', emissiveIntensity: 0.12 }), [])
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    ;[17, 22, 27, HOME_RETURN_POSITION.z].forEach((z, index) => {
      object.position.set(0, 0.28, z)
      object.scale.setScalar(index === 3 ? 0.95 : 0.7)
      object.rotation.set(0, index * 0.5, 0)
      object.updateMatrix()
      buoys.current?.setMatrixAt(index, object.matrix)
    })
    if (buoys.current) buoys.current.instanceMatrix.needsUpdate = true
  }, [])
  return <>
    <instancedMesh ref={buoys} args={[BUOY_GEOMETRY, material, 4]} />
    <mesh position={[HOME_RETURN_POSITION.x, 0.12, HOME_RETURN_POSITION.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.2, 3.55, 28]} /><meshBasicMaterial color="#ffe18a" transparent opacity={0.64} side={THREE.DoubleSide} />
    </mesh>
    <Billboard position={[0, 2.8, HOME_RETURN_POSITION.z]}>
      <Text fontSize={0.46} color="#fff1c5" outlineWidth={0.055} outlineColor="#276074" anchorX="center" anchorY="middle" fontWeight={900}>VỀ CAPPY WORLD</Text>
    </Billboard>
  </>
}

function HomeShore() {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#94704f', flatShading: true, roughness: 1 }), [])
  const crownMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6da77d', flatShading: true, roughness: 1 }), [])
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    const positions = [[-9, 0, 1], [-5, 0, -1], [2, 0, 0], [7, 0, 1], [10, 0, -1]]
    positions.forEach(([x, , z], index) => {
      const scale = index % 2 ? 0.8 : 1
      object.position.set(x, 1.0 * scale, z)
      object.scale.setScalar(scale)
      object.updateMatrix()
      trunks.current?.setMatrixAt(index, object.matrix)
      object.position.y = 3.0 * scale
      object.updateMatrix()
      crowns.current?.setMatrixAt(index, object.matrix)
    })
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true
  }, [])
  return <group position={[0, 0, 68]}>
    <mesh position={[0, 1.3, 0]} scale={[13, 3.6, 6]}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8db39b" flatShading roughness={1} />
    </mesh>
    <instancedMesh ref={trunks} args={[TREE_TRUNK_GEOMETRY, trunkMaterial, 5]} />
    <instancedMesh ref={crowns} args={[TREE_CROWN_GEOMETRY, crownMaterial, 5]} />
    <Billboard position={[0, 8, 0]}>
      <Text fontSize={0.72} color="#fff0c4" outlineWidth={0.07} outlineColor="#517e83" anchorX="center" anchorY="middle" fontWeight={900}>CAPPY WORLD</Text>
    </Billboard>
  </group>
}

function StartingDock() {
  const planks = useRef<THREE.InstancedMesh>(null)
  const posts = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bf8b57', flatShading: true, roughness: 0.95 }), [])
  const postMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#865b3d', flatShading: true, roughness: 0.98 }), [])
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    for (let index = 0; index < 8; index++) {
      object.position.set(0, 0.18, 9.8 + index * 0.78)
      object.rotation.set(0, index % 2 ? 0.01 : -0.01, 0)
      object.scale.set(1, 1, 1)
      object.updateMatrix()
      planks.current?.setMatrixAt(index, object.matrix)
    }
    for (let index = 0; index < 4; index++) {
      object.position.set(index % 2 ? 1.28 : -1.28, -0.12, index < 2 ? 10 : 15)
      object.scale.set(1, 1, 1)
      object.updateMatrix()
      posts.current?.setMatrixAt(index, object.matrix)
    }
    if (planks.current) planks.current.instanceMatrix.needsUpdate = true
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true
  }, [])
  return <>
    <instancedMesh ref={planks} args={[START_DOCK_PLANK_GEOMETRY, material, 8]} receiveShadow />
    <instancedMesh ref={posts} args={[START_DOCK_POST_GEOMETRY, postMaterial, 4]} />
    <Billboard position={[0, 2.65, 14]}>
      <Text fontSize={0.42} color="#fff1d1" outlineWidth={0.05} outlineColor="#397b8a" anchorX="center" anchorY="middle" fontWeight={900}>BẾN CAPPY</Text>
    </Billboard>
  </>
}

function DistantIslands() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!mesh.current) return
    const object = new THREE.Object3D()
    const colors = ['#84b998', '#9bc39e', '#77ad99', '#b8d09e', '#7db4b5', '#91b99b']
    const positions = [[-48, 0, -42], [44, 0, -76], [-42, 0, -118], [52, 0, -142], [0, 0, -174], [74, 0, -36]] as const
    positions.forEach(([x, y, z], index) => {
      object.position.set(x, y + 2.4, z)
      object.scale.set(8 + index % 3 * 2, 5 + index % 2 * 1.5, 8 + index % 4)
      object.updateMatrix()
      mesh.current!.setMatrixAt(index, object.matrix)
      mesh.current!.setColorAt(index, new THREE.Color(colors[index]))
    })
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={mesh} args={[DISTANT_ISLAND_GEOMETRY, undefined, 6]} frustumCulled />
}

export function LessonIslandSet() {
  const sand = useRef<THREE.InstancedMesh>(null)
  const grass = useRef<THREE.InstancedMesh>(null)
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const piers = useRef<THREE.InstancedMesh>(null)
  const buoys = useRef<THREE.InstancedMesh>(null)
  const barriers = useRef<THREE.InstancedMesh>(null)
  const sandMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8c98d', flatShading: true, roughness: 1 }), [])
  const grassMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7fc77b', flatShading: true, roughness: 1 }), [])
  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#87583e', flatShading: true, roughness: 1 }), [])
  const crownMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#55ad79', flatShading: true, roughness: 1 }), [])
  const pierMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bf8b57', flatShading: true, roughness: 0.95 }), [])
  const buoyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5acde2', flatShading: true, roughness: 0.7 }), [])
  const barrierMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#94a8ad', flatShading: true, roughness: 0.86 }), [])
  const treeData = useMemo(() => MATH_ISLANDS.flatMap((island, index) => [
    { x: island.position[0] - 2.8, z: island.position[2] - 1.8, scale: 0.8 + index % 2 * 0.14 },
    { x: island.position[0] + 2.7, z: island.position[2] + 1.7, scale: 0.72 + index % 3 * 0.12 },
  ]), [])

  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    MATH_ISLANDS.forEach((island, index) => {
      object.position.set(island.position[0], 0.08, island.position[2]); object.scale.set(1, 1, 1); object.rotation.set(0, 0, 0); object.updateMatrix()
      sand.current?.setMatrixAt(index, object.matrix)
      object.position.y = 0.67; object.scale.set(1, 1, 1); object.updateMatrix()
      grass.current?.setMatrixAt(index, object.matrix)
    })
    treeData.forEach(({ x, z, scale }, index) => {
      object.position.set(x, 0.78 * scale, z); object.scale.setScalar(scale); object.rotation.set(0, index * 1.9, 0); object.updateMatrix()
      trunks.current?.setMatrixAt(index, object.matrix)
      object.position.y = 2.45 * scale; object.updateMatrix()
      crowns.current?.setMatrixAt(index, object.matrix)
    })
    const dockObject = new THREE.Object3D()
    MATH_ISLANDS.forEach((island, index) => {
      const dx = island.dockPosition[0] - island.position[0]
      const dz = island.dockPosition[2] - island.position[2]
      const length = Math.hypot(dx, dz)
      for (let plank = 0; plank < 3; plank++) {
        const t = 0.35 + plank * 0.28
        dockObject.position.set(island.position[0] + dx * t, 0.08, island.position[2] + dz * t)
        dockObject.rotation.set(0, Math.atan2(dx, dz), 0)
        dockObject.scale.set(1, 1, THREE.MathUtils.clamp(length / 3, 0.85, 1.3))
        dockObject.updateMatrix()
        piers.current?.setMatrixAt(index * 3 + plank, dockObject.matrix)
      }
    })
    MATH_ROUTE_BUOYS.forEach(([x, y, z], index) => {
      object.position.set(x, y, z); object.scale.setScalar(index < 3 ? 1 : 0.82); object.rotation.set(0, index * 0.7, 0); object.updateMatrix()
      buoys.current?.setMatrixAt(index, object.matrix)
    })
    MATH_ISLANDS.filter((island) => island.status === 'locked').forEach((island, index) => {
      const dx = island.dockPosition[0] - island.position[0]
      const dz = island.dockPosition[2] - island.position[2]
      object.position.set(island.dockPosition[0], 0.5, island.dockPosition[2])
      object.rotation.set(0, Math.atan2(dx, dz) + Math.PI / 2, 0)
      object.scale.set(1, 1, 1)
      object.updateMatrix()
      barriers.current?.setMatrixAt(index, object.matrix)
    })
    for (const instance of [sand.current, grass.current, trunks.current, crowns.current, piers.current, buoys.current, barriers.current]) {
      if (instance) instance.instanceMatrix.needsUpdate = true
    }
  }, [treeData])

  return <>
    <instancedMesh ref={sand} args={[ISLAND_SAND_GEOMETRY, sandMaterial, MATH_ISLANDS.length]} receiveShadow />
    <instancedMesh ref={grass} args={[ISLAND_GRASS_GEOMETRY, grassMaterial, MATH_ISLANDS.length]} receiveShadow />
    <instancedMesh ref={trunks} args={[TREE_TRUNK_GEOMETRY, trunkMaterial, treeData.length]} />
    <instancedMesh ref={crowns} args={[TREE_CROWN_GEOMETRY, crownMaterial, treeData.length]} />
    <instancedMesh ref={piers} args={[PIER_PLANK_GEOMETRY, pierMaterial, MATH_ISLANDS.length * 3]} receiveShadow />
    <instancedMesh ref={buoys} args={[BUOY_GEOMETRY, buoyMaterial, MATH_ROUTE_BUOYS.length]} />
    <instancedMesh ref={barriers} args={[LOCKED_BARRIER_GEOMETRY, barrierMaterial, MATH_ISLANDS.filter((island) => island.status === 'locked').length]} />
    {MATH_ISLANDS.map((island) => <IslandLandmark key={island.id} island={island} />)}
    {MATH_ISLANDS.map((island) => <Billboard key={`label-${island.id}`} position={[island.position[0], 5.35, island.position[2]]}>
      <Text fontSize={0.9} color={MATH_STATUS_COLORS[island.status]} outlineWidth={0.065} outlineColor="#276074" anchorX="center" anchorY="middle" fontWeight={900}>{island.title}</Text>
    </Billboard>)}
  </>
}

function IslandLandmark({ island }: { island: MathIslandConfig }) {
  const [x, , z] = island.position
  const accent = island.status === 'locked' ? '#9caeb0' : '#f1b74b'
  if (island.theme === 'house') return <group position={[x, 0.95, z]}>
    <mesh><boxGeometry args={[2.25, 1.55, 2.1]} /><meshStandardMaterial color="#fff0ce" flatShading /></mesh>
    <mesh position={[0, 1.08, 0]}><coneGeometry args={[1.65, 1.05, 4]} /><meshStandardMaterial color="#e98261" flatShading /></mesh>
    <mesh position={[0, 0.22, 1.06]}><boxGeometry args={[0.45, 0.72, 0.06]} /><meshStandardMaterial color="#70b8d4" /></mesh>
  </group>
  if (island.theme === 'windmill') return <group position={[x, 1.25, z]}>
    <mesh><cylinderGeometry args={[0.65, 0.95, 2.5, 7]} /><meshStandardMaterial color="#efd5a7" flatShading /></mesh>
    <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.19, 6, 5]} /><meshStandardMaterial color={accent} /></mesh>
    <mesh position={[0, 1.35, 0.3]}><boxGeometry args={[0.13, 2.2, 0.12]} /><meshStandardMaterial color="#fff0ce" /></mesh>
    <mesh position={[0, 1.35, 0.3]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.13, 2.2, 0.12]} /><meshStandardMaterial color="#fff0ce" /></mesh>
  </group>
  if (island.theme === 'cave') return <group position={[x, 0.65, z]}>
    <mesh position={[-0.75, 1, 0]} scale={[1.1, 1.5, 0.85]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#8a9c91" flatShading /></mesh>
    <mesh position={[0.75, 1, 0]} scale={[1.1, 1.5, 0.85]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#81978a" flatShading /></mesh>
    <mesh position={[0, 0.55, 0.65]}><circleGeometry args={[0.76, 8]} /><meshBasicMaterial color="#315760" side={THREE.DoubleSide} /></mesh>
  </group>
  if (island.theme === 'lighthouse') return <group position={[x, 0.8, z]}>
    <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.6, 1, 2.9, 7]} /><meshStandardMaterial color="#fff3d6" flatShading /></mesh>
    <mesh position={[0, 3.05, 0]}><cylinderGeometry args={[0.72, 0.72, 0.45, 7]} /><meshStandardMaterial color="#ed735f" flatShading /></mesh>
    <mesh position={[0, 3.42, 0]}><coneGeometry args={[0.8, 0.48, 7]} /><meshStandardMaterial color="#eaa34d" flatShading /></mesh>
  </group>
  if (island.theme === 'tower') return <group position={[x, 0.9, z]}>
    <mesh position={[0, 1.25, 0]}><cylinderGeometry args={[0.7, 1.05, 2.5, 6]} /><meshStandardMaterial color="#dcae70" flatShading /></mesh>
    <mesh position={[0, 2.7, 0]}><coneGeometry args={[1.2, 0.9, 6]} /><meshStandardMaterial color="#56a98e" flatShading /></mesh>
    <mesh position={[0, 0.9, 0.82]}><boxGeometry args={[0.35, 0.55, 0.05]} /><meshStandardMaterial color="#6fb6ce" /></mesh>
  </group>
  return <group position={[x, 0.75, z]}>
    <mesh position={[0, 0.95, 0]}><boxGeometry args={[1.3, 2, 1.1]} /><meshStandardMaterial color="#e9e0c9" flatShading /></mesh>
    <mesh position={[0.86, 0.45, 0.35]} rotation={[0, 0, -0.12]}><boxGeometry args={[0.52, 1.4, 0.08]} /><meshStandardMaterial color="#52c4d2" transparent opacity={0.82} /></mesh>
    <mesh position={[0, 2.1, 0]}><coneGeometry args={[1.1, 0.55, 6]} /><meshStandardMaterial color="#73b8a4" flatShading /></mesh>
  </group>
}
