'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { useDemo3DGame } from '../GameShell'
import BoatModel from '../boat/BoatModel'
import { boatFitsWater } from './water-boundaries'

const DOCK_Z = 2.5
const BOAT_START = { x: 29.6, y: 0.035, z: 5.05 }
const BOARDING_EDGE = { x: 27.45, y: 1.16, z: 4.35 }
const SEAT_ROOT_Y = 1.76
const BOARDING_SECONDS = 1.35
const SEA_EXIT_X = 39
const BOAT_SPEED = 3.2

export default function MathDock({ playerRef, onInteractionChange }: {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onInteractionChange?: (inside: boolean) => void
}) {
  const { mathDepartureStage, beginMathSeaExit, move, cameraYaw } = useDemo3DGame()
  const boat = useRef<THREE.Group>(null)
  const planks = useRef<THREE.InstancedMesh>(null)
  const posts = useRef<THREE.InstancedMesh>(null)
  const plankGeometry = useMemo(() => new THREE.BoxGeometry(0.78, 0.14, 2.8), [])
  const plankMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bf8b57', roughness: 0.95, flatShading: true }), [])
  const postGeometry = useMemo(() => new THREE.BoxGeometry(0.24, 1.4, 0.24), [])
  const postMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#865b3d', roughness: 0.98, flatShading: true }), [])
  const observedStage = useRef(mathDepartureStage)
  const stageStartTime = useRef(0)
  const boardingStart = useRef(new THREE.Vector3())
  const boardingStartRotation = useRef(new THREE.Quaternion())
  const wasInZone = useRef(false)
  const exitTriggered = useRef(false)
  const keys = useRef(new Set<string>())
  const boatPosition = useRef({ x: BOAT_START.x, z: BOAT_START.z })
  const heading = useRef(0)
  const [rowing, setRowing] = useState(false)
  const rowingRef = useRef(false)
  const geometryCount = 14

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.current.clear()
    }
  }, [])

  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    for (let index = 0; index < geometryCount; index++) {
      object.position.set(16.65 + index * 0.78, 0.2, DOCK_Z)
      object.rotation.set(0, 0, 0)
      object.updateMatrix()
      planks.current?.setMatrixAt(index, object.matrix)
    }
    for (let index = 0; index < 8; index++) {
      const side = index % 2 === 0 ? -1 : 1
      const row = Math.floor(index / 2)
      object.position.set(16.8 + row * 3.5, 0.05, DOCK_Z + side * 1.42)
      object.scale.set(1, 1, 1)
      object.updateMatrix()
      posts.current?.setMatrixAt(index, object.matrix)
    }
    if (planks.current) planks.current.instanceMatrix.needsUpdate = true
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true
  }, [geometryCount])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const body = playerRef.current
    if (mathDepartureStage !== observedStage.current) {
      observedStage.current = mathDepartureStage
      stageStartTime.current = time
      if (mathDepartureStage === 'boarding' && body) {
        const position = body.translation()
        const rotation = body.rotation()
        boardingStart.current.set(position.x, position.y, position.z)
        boardingStartRotation.current.set(rotation.x, rotation.y, rotation.z, rotation.w)
        boatPosition.current = { x: BOAT_START.x, z: BOAT_START.z }
        heading.current = 0
        exitTriggered.current = false
      }
    }

    let moved = false
    if (mathDepartureStage === 'sailing') {
      const steer = THREE.MathUtils.clamp(Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')) + move.x, -1, 1)
      const throttle = THREE.MathUtils.clamp(Number(keys.current.has('w') || keys.current.has('arrowup')) - Number(keys.current.has('s') || keys.current.has('arrowdown')) + move.z, -1, 1)
      const nextHeading = heading.current + steer * Math.min(delta, 0.05) * 1.45
      if (boatFitsWater(boatPosition.current.x, boatPosition.current.z, nextHeading)) heading.current = nextHeading
      const nextX = boatPosition.current.x + Math.cos(heading.current) * throttle * BOAT_SPEED * Math.min(delta, 0.05)
      const nextZ = boatPosition.current.z + Math.sin(heading.current) * throttle * BOAT_SPEED * Math.min(delta, 0.05)
      if (Math.abs(throttle) > 0.04 && boatFitsWater(nextX, nextZ, heading.current)) {
        boatPosition.current = { x: nextX, z: nextZ }
        moved = true
      }
      cameraYaw.current = -Math.PI / 2 - heading.current
      if (boatPosition.current.x >= SEA_EXIT_X && Math.abs(boatPosition.current.z - DOCK_Z) < 4.8 && !exitTriggered.current) {
        exitTriggered.current = true
        beginMathSeaExit()
      }
    }
    if (moved !== rowingRef.current) {
      rowingRef.current = moved
      setRowing(moved)
    }
    const boatX = boatPosition.current.x + (mathDepartureStage ? 0 : Math.sin(time * 1.45) * 0.015)
    const boatZ = boatPosition.current.z + (mathDepartureStage ? 0 : Math.sin(time * 1.2) * 0.015)
    const boatYaw = -Math.PI / 2 - heading.current
    if (boat.current) {
      boat.current.position.set(boatX, BOAT_START.y + Math.sin(time * 1.45) * 0.02, boatZ)
      boat.current.rotation.set(Math.sin(time * 1.2) * 0.008, boatYaw, Math.cos(time * 1.1) * 0.006)
    }

    if (body && mathDepartureStage === 'boarding') {
      const progress = THREE.MathUtils.clamp((time - stageStartTime.current) / BOARDING_SECONDS, 0, 1)
      let position: { x: number; y: number; z: number }
      if (progress < 0.76) {
        const walk = THREE.MathUtils.smoothstep(progress / 0.76, 0, 1)
        position = {
          x: THREE.MathUtils.lerp(boardingStart.current.x, BOARDING_EDGE.x, walk),
          y: THREE.MathUtils.lerp(boardingStart.current.y, BOARDING_EDGE.y, walk),
          z: THREE.MathUtils.lerp(boardingStart.current.z, BOARDING_EDGE.z, walk),
        }
      } else {
        const hop = THREE.MathUtils.smoothstep((progress - 0.76) / 0.24, 0, 1)
        position = {
          x: THREE.MathUtils.lerp(BOARDING_EDGE.x, BOAT_START.x, hop),
          y: THREE.MathUtils.lerp(BOARDING_EDGE.y, SEAT_ROOT_Y, hop) + Math.sin(hop * Math.PI) * 0.42,
          z: THREE.MathUtils.lerp(BOARDING_EDGE.z, BOAT_START.z, hop),
        }
      }
      body.setTranslation(position, true)
      body.setRotation({ x: 0, y: -Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }, true)
    } else if (body && (mathDepartureStage === 'seated' || mathDepartureStage === 'sailing' || mathDepartureStage === 'transitioning')) {
      body.setTranslation({ x: boatX, y: SEAT_ROOT_Y, z: boatZ }, true)
      const targetRotation = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.PI / 2)
      const turn = THREE.MathUtils.smoothstep((time - stageStartTime.current) / 0.18, 0, 1)
      const rotation = boardingStartRotation.current.clone().slerp(targetRotation, turn)
      body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true)
    }

    if (body && !mathDepartureStage) {
      const position = body.translation()
      const inside = position.x > 26 && position.x < 27.9 && Math.abs(position.z - DOCK_Z) < 1.35
      if (inside !== wasInZone.current) {
        wasInZone.current = inside
        onInteractionChange?.(inside)
      }
    } else if (wasInZone.current) {
      wasInZone.current = false
      onInteractionChange?.(false)
    }
  })

  return <>
    <RigidBody type="fixed" colliders={false}>
      <mesh position={[22, 0.2, DOCK_Z]} receiveShadow castShadow>
        <boxGeometry args={[10.7, 0.12, 3.1]} />
        <meshStandardMaterial color="#a9784d" roughness={0.98} flatShading />
      </mesh>
      <instancedMesh ref={planks} args={[plankGeometry, plankMaterial, geometryCount]} receiveShadow castShadow />
      <instancedMesh ref={posts} args={[postGeometry, postMaterial, 8]} receiveShadow castShadow />
      <CuboidCollider args={[5.35, 0.13, 1.55]} position={[22, 0.17, DOCK_Z]} friction={0.9} />
      {[14.8, 15.45, 16.1].map((x, index) => <group key={x} position={[x, 0.06 + index * 0.035, DOCK_Z]}>
        <mesh position={[0, 0.03, 0]} receiveShadow castShadow><boxGeometry args={[0.62, 0.12, 2.6]} /><meshStandardMaterial color={index % 2 ? '#c59a68' : '#b78a5d'} roughness={1} /></mesh>
        <CuboidCollider args={[0.31, 0.06, 1.3]} position={[0, 0.03, 0]} friction={0.9} />
      </group>)}
    </RigidBody>
    <group position={[16.4, 3.25, DOCK_Z + 1.8]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh castShadow><boxGeometry args={[3.4, 1.05, 0.16]} /><meshStandardMaterial color="#815237" roughness={0.88} /></mesh>
      <mesh position={[0, 0, 0.091]}><boxGeometry args={[3.2, 0.85, 0.025]} /><meshStandardMaterial color="#fff0ce" roughness={0.9} /></mesh>
      <Text position={[0, 0, 0.11]} fontSize={0.34} color="#376b82" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff0ce">QUẦN ĐẢO TOÁN</Text>
      <mesh position={[0, -1.65, 0]} castShadow><boxGeometry args={[0.2, 2.25, 0.2]} /><meshStandardMaterial color="#865b3d" roughness={0.96} /></mesh>
    </group>
    <group ref={boat} position={[BOAT_START.x, BOAT_START.y, BOAT_START.z]} rotation={[0, -Math.PI / 2, 0]}>
      <BoatModel seatedCappy={mathDepartureStage === 'seated' || mathDepartureStage === 'sailing' || mathDepartureStage === 'transitioning'} showWake={rowing} />
    </group>
    {Array.from({ length: 5 }, (_, index) => {
      const x = 33 + index * 1.2
      return <mesh key={index} position={[x, 0.025, DOCK_Z + 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.47, 24]} />
        <meshBasicMaterial color="#d9faff" transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    })}
    <Text position={[42, 0.04, 7.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.65} color="#d9faff" fillOpacity={0.52} anchorX="center" anchorY="middle">Hướng đi đảo Toán →</Text>
    <mesh position={[16.3, 0.12, DOCK_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.05, 24]} /><meshBasicMaterial color="#67d8ef" transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
  </>
}

