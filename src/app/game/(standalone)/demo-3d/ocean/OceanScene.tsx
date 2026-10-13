'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import type { MoveInput } from '../_components/types'
import OceanCamera from './OceanCamera'
import OceanEnvironment from './OceanEnvironment'
import OceanPlayer, { type OceanNearbyAction } from './OceanPlayer'
import type { OceanCollectible } from './ocean-layout'
import type { OceanMissionRound } from './ocean-mission'

type Props = {
  round: OceanMissionRound
  openedChestId: string | null
  goldenChestFound: boolean
  goldenChestOpening: boolean
  collectedIds: ReadonlySet<string>
  nearbyAction: OceanNearbyAction
  move: MoveInput
  interactVersion: number
  inputDisabled: boolean
  recoveryVersion: number
  mobile: boolean
  visible: boolean
  onReady: () => void
  onCanvasCreated: (canvas: HTMLCanvasElement) => void
  onNearbyChange: (action: OceanNearbyAction) => void
  onChestInteract: (id: string, number: number) => void
  onGoldenChestInteract: () => void
  onCollect: (item: OceanCollectible) => void
  onRecoveryComplete: () => void
}

export default function OceanScene(props: Props) {
  const player = useRef<THREE.Group>(null)
  const cameraYaw = useRef(0)
  const cameraDistance = useRef(7.6)
  return <Canvas
    frameloop={props.visible ? 'always' : 'never'}
    shadows={false}
    camera={{ position: [0, 4.5, 10], fov: 55, near: 0.1, far: 100 }}
    dpr={props.mobile ? [1, 1.15] : [1, 1.35]}
    gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
    onCreated={({ gl }) => props.onCanvasCreated(gl.domElement)}
  >
    <color attach="background" args={['#247e91']} />
    <fog attach="fog" args={['#3b9eaa', 13, 47]} />
    <hemisphereLight args={['#c4fbf5', '#637d70', 1.15]} />
    <ambientLight intensity={0.55} />
    <directionalLight position={[-9, 14, 8]} color="#e2fff2" intensity={1.65} />
    <Suspense fallback={null}>
      <OceanEnvironment round={props.round} openedChestId={props.openedChestId} goldenChestFound={props.goldenChestFound} goldenChestOpening={props.goldenChestOpening} collectedIds={props.collectedIds} nearbyAction={props.nearbyAction} />
      <OceanPlayer
        groupRef={player}
        move={props.move}
        cameraYaw={cameraYaw}
        cameraDistance={cameraDistance}
        round={props.round}
        goldenChestFound={props.goldenChestFound}
        collectedIds={props.collectedIds}
        interactVersion={props.interactVersion}
        inputDisabled={props.inputDisabled}
        recoveryVersion={props.recoveryVersion}
        onNearbyChange={props.onNearbyChange}
        onChestInteract={props.onChestInteract}
        onGoldenChestInteract={props.onGoldenChestInteract}
        onCollect={props.onCollect}
        onRecoveryComplete={props.onRecoveryComplete}
      />
      <OceanCamera target={player} yaw={cameraYaw} distance={cameraDistance} />
      <SceneReady onReady={props.onReady} />
    </Suspense>
  </Canvas>
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const called = useRef(false)
  useEffect(() => {
    if (called.current) return
    called.current = true
    onReady()
  }, [onReady])
  return null
}
