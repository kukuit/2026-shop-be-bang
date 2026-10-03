'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from '../character/slots'
import CharacterRenderer from '../character/CharacterRenderer'
import type { CharacterMotionRef } from '../character/types'
import BoatOars from './BoatOars'
import { BOAT_CONFIG } from './boat.config'

export default function BoatModel({ seatedCappy = false, showWake = false, cameraDistance: sharedCameraDistance }: {
  seatedCappy?: boolean
  showWake?: boolean
  cameraDistance?: MutableRefObject<number>
}) {
  const localMotion: CharacterMotionRef = useRef({ speed: 0, verticalVelocity: 0, grounded: true, jumpStarted: false, justLanded: false })
  const localCameraDistance = useRef(sharedCameraDistance?.current ?? 10)
  const cameraDistance = sharedCameraDistance ?? localCameraDistance
  const { character, skin } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  const hullGeometry = useMemo(() => {
    // Local X is the boat's length; its pointed bow faces local -X.
    const shape = new THREE.Shape()
    shape.moveTo(-2.1, 0)
    shape.lineTo(-1.52, -0.72)
    shape.lineTo(1.65, -0.88)
    shape.lineTo(2.05, -0.68)
    shape.lineTo(2.05, 0.68)
    shape.lineTo(1.65, 0.88)
    shape.lineTo(-1.52, 0.72)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: false, steps: 1 })
    geometry.rotateX(Math.PI / 2)
    geometry.translate(0, 0.36, 0.21)
    return geometry
  }, [])
  const sailGeometry = useMemo(() => {
    const sail = new THREE.Shape()
    sail.moveTo(0.04, 0.12)
    sail.lineTo(1.02, 0.38)
    sail.lineTo(0.04, 1.65)
    sail.closePath()
    return new THREE.ShapeGeometry(sail)
  }, [])
  const sail = useRef<THREE.Group>(null)
  const rowing = seatedCappy && showWake
  useFrame(({ clock }) => {
    if (sail.current) {
      sail.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.025
      sail.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.01
    }
  })

  return <group rotation={[0, -Math.PI / 2, 0]}>
    {/* A single boat root keeps the hull, deck, passenger, and wake in sync. */}
    <group>
      <mesh geometry={hullGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={BOAT_CONFIG.colors.hull} roughness={0.72} flatShading />
      </mesh>
      {/* Cream gunwale traces the hull without raising the sides into a cabin. */}
      <mesh position={[0, 0.49, 0]} castShadow>
        <boxGeometry args={[3.7, 0.13, 1.76]} />
        <meshStandardMaterial color={BOAT_CONFIG.colors.trim} roughness={0.86} flatShading />
      </mesh>
      <mesh position={[-0.03, 0.555, 0]} receiveShadow>
        <boxGeometry args={[3.43, 0.1, 1.48]} />
        <meshStandardMaterial color={BOAT_CONFIG.colors.woodLight} roughness={0.94} flatShading />
      </mesh>
      {/* Four broad planks make the open wooden deck legible at mobile scale. */}
      {[-0.55, -0.18, 0.19, 0.56].map((z) => <mesh key={z} position={[-0.02, 0.61, z]} receiveShadow>
        <boxGeometry args={[3.15, 0.045, 0.32]} />
        <meshStandardMaterial color={z === -0.18 || z === 0.56 ? BOAT_CONFIG.colors.woodPale : BOAT_CONFIG.colors.wood} roughness={0.96} />
      </mesh>)}
      {/* Cappy's low bench stays clear of the mast and paddles. */}
      <mesh position={[0.12, 0.76, 0]} castShadow>
        <boxGeometry args={[0.34, 0.16, 1.04]} />
        <meshStandardMaterial color={BOAT_CONFIG.colors.wood} roughness={0.95} flatShading />
      </mesh>
      {/* A small crate sits aft, away from the bow and passenger. */}
      <mesh position={[1.63, 0.78, -0.43]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.36, 0.52]} />
        <meshStandardMaterial color={BOAT_CONFIG.colors.wood} roughness={0.95} flatShading />
      </mesh>
      {/* Offset mast lives aft and to port so it stays out of Cappy's sightline. */}
      <group position={[0.86, 0.64, -0.48]}>
        <mesh position={[0, 1.08, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 2.16, 5]} />
          <meshStandardMaterial color={BOAT_CONFIG.colors.wood} roughness={0.94} flatShading />
        </mesh>
        <mesh position={[0.32, 1.57, 0]} rotation={[0, 0, -0.08]}>
          <cylinderGeometry args={[0.03, 0.03, 0.78, 5]} />
          <meshStandardMaterial color={BOAT_CONFIG.colors.woodLight} roughness={0.94} flatShading />
        </mesh>
        <group ref={sail} position={[0.03, 0.44, 0.035]}>
          <mesh geometry={sailGeometry} castShadow>
            <meshStandardMaterial color={BOAT_CONFIG.colors.sail} roughness={0.98} side={THREE.DoubleSide} flatShading />
          </mesh>
        </group>
      </group>
      <BoatOars active={rowing} />
      {/* One pair of pale, low-profile side fenders. */}
      {[-1, 1].map((side) => <mesh key={side} position={[1.25, 0.49, side * 0.98]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.12, 0.28, 3, 6]} />
        <meshStandardMaterial color="#f2ead8" roughness={0.86} flatShading />
      </mesh>)}
      {seatedCappy && <group position={[-0.08, 1.42, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.68}>
        <CharacterRenderer character={character} skin={skin} motion={localMotion} hidden={false} cameraDistance={cameraDistance} boatPose rowing={rowing} />
      </group>}
      {showWake && <group position={[2.02, 0.22, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0, -0.32]}><planeGeometry args={[0.5, 2.3]} /><meshBasicMaterial color="#e2fbff" transparent opacity={0.28} depthWrite={false} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0, 0.32]}><planeGeometry args={[0.5, 2.3]} /><meshBasicMaterial color="#e2fbff" transparent opacity={0.28} depthWrite={false} /></mesh>
      </group>}
    </group>
  </group>
}
