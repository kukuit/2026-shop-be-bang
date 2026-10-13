'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MutableRefObject } from 'react'
import type { CharacterMotionRef } from '../demo-3d/_components/character/types'

type Props = {
  motion: CharacterMotionRef
  cameraDistance: MutableRefObject<number>
  fadeStartDistance: number
  fadeEndDistance: number
  muzzleRef: MutableRefObject<THREE.Group | null>
  shotVersion: number
}

type FadeMaterial = { material: THREE.Material; opacity: number; transparent: boolean; depthWrite: boolean }
type FadeMesh = { mesh: THREE.Mesh; originalMaterial: THREE.Material | THREE.Material[]; castShadow: boolean; materials: FadeMaterial[] }

/** A compact low-poly armored ranger made for Player 1 in Control 3D. */
export default function PlayerOneModel({ motion, cameraDistance, fadeStartDistance, fadeEndDistance, muzzleRef, shotVersion }: Props) {
  const root = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const muzzleFlash = useRef<THREE.Mesh>(null)
  const muzzleFlashRemaining = useRef(0)
  const fadeAlpha = useRef(1)
  const fadeMeshes = useRef<FadeMesh[]>([])

  useEffect(() => {
    const model = root.current
    if (!model) return
    const slots: FadeMesh[] = []
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const originalMaterial = object.material
      const originals = Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial]
      const copies = originals.map((material) => material.clone())
      object.material = Array.isArray(originalMaterial) ? copies : copies[0]
      slots.push({
        mesh: object,
        originalMaterial,
        castShadow: object.castShadow,
        materials: copies.map((material, index) => ({
          material,
          opacity: originals[index].opacity,
          transparent: originals[index].transparent,
          depthWrite: originals[index].depthWrite,
        })),
      })
    })
    fadeMeshes.current = slots
    return () => {
      slots.forEach(({ mesh, originalMaterial, castShadow, materials }) => {
        mesh.material = originalMaterial
        mesh.castShadow = castShadow
        materials.forEach(({ material }) => material.dispose())
      })
      fadeMeshes.current = []
    }
  }, [])

  useEffect(() => {
    if (shotVersion > 0) muzzleFlashRemaining.current = 0.09
  }, [shotVersion])

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const distance = cameraDistance.current
    const alpha = THREE.MathUtils.clamp((distance - fadeEndDistance) / Math.max(0.001, fadeStartDistance - fadeEndDistance), 0, 1)
    fadeAlpha.current = alpha
    const fading = alpha < 0.999
    fadeMeshes.current.forEach(({ mesh, castShadow, materials }) => {
      mesh.castShadow = fading ? false : castShadow
      materials.forEach((slot) => {
        slot.material.opacity = slot.opacity * alpha
        const transparent = slot.transparent || fading
        const depthWrite = fading ? false : slot.depthWrite
        if (slot.material.transparent !== transparent || slot.material.depthWrite !== depthWrite) {
          slot.material.transparent = transparent
          slot.material.depthWrite = depthWrite
          slot.material.needsUpdate = true
        }
      })
    })

    const stride = Math.min(1, motion.current.speed / 3.4)
    const swing = Math.sin(clock.elapsedTime * 10.5) * stride * 0.36
    if (leftLeg.current) leftLeg.current.rotation.x = swing
    if (rightLeg.current) rightLeg.current.rotation.x = -swing
    if (torso.current) {
      torso.current.position.y = 1.02 + Math.sin(clock.elapsedTime * 21) * stride * 0.018
      torso.current.rotation.z = Math.sin(clock.elapsedTime * 5.25) * stride * 0.025
    }
    muzzleFlashRemaining.current = Math.max(0, muzzleFlashRemaining.current - delta)
    if (muzzleFlash.current) muzzleFlash.current.visible = muzzleFlashRemaining.current > 0
    const flashMaterial = muzzleFlash.current?.material
    if (flashMaterial && !Array.isArray(flashMaterial) && 'opacity' in flashMaterial) {
      flashMaterial.opacity = 0.9 * THREE.MathUtils.clamp(muzzleFlashRemaining.current / 0.09, 0, 1) * alpha
    }
  })

  return <group ref={root}>
    <group ref={torso} position-y={1.02}>
      {/* Reinforced chest and back-mounted equipment */}
      <mesh castShadow position={[0, 0, -0.2]}><boxGeometry args={[0.58, 0.62, 0.28]} /><meshStandardMaterial color="#24384b" flatShading roughness={0.82} /></mesh>
      <mesh castShadow><cylinderGeometry args={[0.34, 0.43, 0.8, 7]} /><meshStandardMaterial color="#347b83" flatShading metalness={0.14} roughness={0.66} /></mesh>
      <mesh castShadow position={[0, 0.02, 0.31]}><boxGeometry args={[0.43, 0.38, 0.1]} /><meshStandardMaterial color="#6cd2c1" flatShading metalness={0.24} roughness={0.42} /></mesh>
      <mesh position={[0, 0.02, 0.37]}><boxGeometry args={[0.18, 0.12, 0.025]} /><meshStandardMaterial color="#f4cf71" emissive="#9d7133" emissiveIntensity={0.25} /></mesh>
      <mesh castShadow position={[-0.45, 0.28, 0.02]}><icosahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color="#d5e3db" flatShading /></mesh>
      <mesh castShadow position={[0.45, 0.28, 0.02]}><icosahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color="#d5e3db" flatShading /></mesh>

      {/* Closed helmet and dark cyan visor */}
      <mesh castShadow position={[0, 0.72, 0.02]} scale={[0.9, 1, 0.9]}><dodecahedronGeometry args={[0.36, 1]} /><meshStandardMaterial color="#e6e5d6" flatShading metalness={0.12} roughness={0.52} /></mesh>
      <mesh position={[0, 0.72, 0.32]} scale={[0.78, 0.46, 0.22]}><sphereGeometry args={[0.27, 8, 6]} /><meshStandardMaterial color="#153a4a" metalness={0.58} roughness={0.25} /></mesh>
      <mesh position={[0, 0.75, 0.375]} scale={[0.5, 0.1, 0.12]}><sphereGeometry args={[0.24, 8, 6]} /><meshBasicMaterial color="#74eee0" /></mesh>

      {/* Utility belt */}
      <mesh position={[0, -0.39, 0]}><cylinderGeometry args={[0.4, 0.39, 0.14, 8]} /><meshStandardMaterial color="#d9b765" flatShading metalness={0.22} roughness={0.7} /></mesh>
    </group>

    {/* Articulated boots give movement a readable silhouette */}
    <group ref={leftLeg} position={[-0.2, 0.64, 0]}>
      <mesh castShadow position={[0, -0.25, 0]}><capsuleGeometry args={[0.15, 0.34, 3, 6]} /><meshStandardMaterial color="#e1e3d9" flatShading /></mesh>
      <mesh castShadow position={[0, -0.53, 0.1]}><boxGeometry args={[0.32, 0.16, 0.42]} /><meshStandardMaterial color="#283b4b" flatShading roughness={0.82} /></mesh>
    </group>
    <group ref={rightLeg} position={[0.2, 0.64, 0]}>
      <mesh castShadow position={[0, -0.25, 0]}><capsuleGeometry args={[0.15, 0.34, 3, 6]} /><meshStandardMaterial color="#e1e3d9" flatShading /></mesh>
      <mesh castShadow position={[0, -0.53, 0.1]}><boxGeometry args={[0.32, 0.16, 0.42]} /><meshStandardMaterial color="#283b4b" flatShading roughness={0.82} /></mesh>
    </group>

    {/* Arms angle forward around the rifle instead of widening the silhouette */}
    <mesh castShadow position={[-0.48, 1.19, 0.12]} rotation={[0.28, 0, -0.14]}><capsuleGeometry args={[0.135, 0.45, 3, 6]} /><meshStandardMaterial color="#e1e3d9" flatShading /></mesh>
    <mesh castShadow position={[0.42, 1.11, 0.32]} rotation={[0.42, 0, 0.12]}><capsuleGeometry args={[0.135, 0.42, 3, 6]} /><meshStandardMaterial color="#e1e3d9" flatShading /></mesh>
    <mesh castShadow position={[-0.48, 0.91, 0.28]}><boxGeometry args={[0.25, 0.18, 0.2]} /><meshStandardMaterial color="#347b83" flatShading /></mesh>
    <mesh castShadow position={[0.4, 0.92, 0.55]}><boxGeometry args={[0.23, 0.17, 0.2]} /><meshStandardMaterial color="#347b83" flatShading /></mesh>

    {/* Rifle, barrel origin and flash stay inside the P1 model so they hide together near the camera. */}
    <mesh castShadow position={[0.4, 1.1, 0.53]} rotation={[0.08, 0, 0]}><boxGeometry args={[0.24, 0.2, 0.68]} /><meshStandardMaterial color="#26384b" metalness={0.42} roughness={0.46} /></mesh>
    <mesh position={[0.4, 1.1, 0.91]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.26, 8]} /><meshStandardMaterial color="#8998a4" metalness={0.72} roughness={0.28} /></mesh>
    <group ref={muzzleRef} position={[0.4, 1.1, 1.04]} />
    <mesh ref={muzzleFlash} position={[0.4, 1.1, 1.15]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <coneGeometry args={[0.16, 0.4, 6]} /><meshBasicMaterial color="#ffe77b" transparent opacity={0.9} />
    </mesh>
  </group>
}
