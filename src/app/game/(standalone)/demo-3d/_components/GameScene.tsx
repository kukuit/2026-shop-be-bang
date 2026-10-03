'use client'

import { Canvas } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import type { MutableRefObject } from 'react'
import type { DemoWorldId } from './GameShell'
import { useDemo3DGame } from './GameShell'
import type { CameraMode } from './camera-config'
import ThirdPersonCameraController from './ThirdPersonCameraController'
import PlayerController from './PlayerController'
import { DEFAULT_PLAYER_SLOT, resolveCharacterSlot } from './character/slots'
import type { MoveInput } from './types'
import type { PortalInfo } from './types'

type EnvironmentProps = {
  playerRef: MutableRefObject<RapierRigidBody | null>
  onHousePorchChange: (inside: boolean) => void
  onMathDockChange?: (inside: boolean) => void
}
const NOOP_HOUSE_CHANGE = () => undefined

export default function GameScene({ world, Environment, onPortalChange, onHousePorchChange, onMathDockChange, move: moveOverride, jumpVersion: jumpVersionOverride, soundOn: soundOnOverride, cameraMode: cameraModeOverride }: { world: DemoWorldId; Environment: ComponentType<EnvironmentProps>; onPortalChange?: (portal: PortalInfo | null) => void; onHousePorchChange?: (inside: boolean) => void; onMathDockChange?: (inside: boolean) => void; move?: MoveInput; jumpVersion?: number; soundOn?: boolean; cameraMode?: CameraMode }) {
  const game = useDemo3DGame()
  const spawn = game.resolveSpawn(world)
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return <Canvas shadows={!mobile} camera={{ position: [0, 6, 10], fov: 55 }} dpr={mobile ? [1, 1.2] : [1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
    <color attach="background" args={[world === 'village' ? '#b7e8ff' : '#a8d6b7']} />
    <fog attach="fog" args={[world === 'village' ? '#c6edff' : '#cde4d0', 45, 112]} />
    <hemisphereLight args={['#e7f8ff', '#8cae77', 1.25]} />
    <ambientLight intensity={0.75} />
    <directionalLight position={[8, 18, 5]} intensity={1.8} castShadow={!mobile} shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} shadow-camera-far={50} />
    <Suspense fallback={null}>
      <SceneContents world={world} Environment={Environment} move={moveOverride ?? game.move} jumpVersion={jumpVersionOverride ?? game.jumpVersion} soundOn={soundOnOverride ?? game.soundOn} cameraMode={cameraModeOverride ?? game.cameraMode} transition={game.transition} mathDepartureStage={game.mathDepartureStage} spawn={spawn} cameraDistance={game.cameraDistance} cameraYaw={game.cameraYaw} cameraPitch={game.cameraPitch} manualOrbitVersion={game.manualOrbitVersion} beginBridgeTransition={game.beginBridgeTransition} sceneReady={game.sceneReady} onPortalChange={onPortalChange} onHousePorchChange={onHousePorchChange} onMathDockChange={onMathDockChange} />
    </Suspense>
  </Canvas>
}

function SceneContents({ world, Environment, move, jumpVersion, soundOn, cameraMode, transition, mathDepartureStage, spawn, cameraDistance, cameraYaw, cameraPitch, manualOrbitVersion, beginBridgeTransition, sceneReady, onPortalChange, onHousePorchChange, onMathDockChange }: {
  world: DemoWorldId
  Environment: ComponentType<EnvironmentProps>
  move: MoveInput
  jumpVersion: number
  soundOn: boolean
  cameraMode: CameraMode
  transition: ReturnType<typeof useDemo3DGame>['transition']
  mathDepartureStage: ReturnType<typeof useDemo3DGame>['mathDepartureStage']
  spawn: { position: [number, number, number]; yaw: number }
  cameraDistance: MutableRefObject<number>
  cameraYaw: MutableRefObject<number>
  cameraPitch: MutableRefObject<number>
  manualOrbitVersion: MutableRefObject<number>
  beginBridgeTransition: (world: DemoWorldId) => void
  sceneReady: (world: DemoWorldId) => void
  onPortalChange?: (portal: PortalInfo | null) => void
  onHousePorchChange?: (inside: boolean) => void
  onMathDockChange?: (inside: boolean) => void
}) {
  const player = useRef<RapierRigidBody>(null)
  const { character } = resolveCharacterSlot(DEFAULT_PLAYER_SLOT)
  return <>
    <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
      <Environment playerRef={player} onHousePorchChange={onHousePorchChange ?? NOOP_HOUSE_CHANGE} onMathDockChange={onMathDockChange} />
      <PlayerController
        playerRef={player}
        move={move}
        jumpVersion={jumpVersion}
        cameraMode={cameraMode}
        cameraDistance={cameraDistance}
        cameraYaw={cameraYaw}
        manualOrbitVersion={manualOrbitVersion}
        transitionPhase={transition?.phase ?? null}
        mathDepartureStage={mathDepartureStage}
        transitionDirectionZ={transition?.runDirectionZ ?? 0}
        spawn={spawn}
        world={world}
        onBridgeReach={beginBridgeTransition}
        onPortalChange={onPortalChange ?? (() => undefined)}
      />
      <ThirdPersonCameraController target={player} yaw={cameraYaw} manualOrbitVersion={manualOrbitVersion} mode={cameraMode} cameraDistance={cameraDistance} cameraPitch={cameraPitch} characterCamera={character.camera} />
    </Physics>
    {soundOn && <AmbientSfx />}
    <SceneReady world={world} onReady={sceneReady} />
  </>
}

function SceneReady({ world, onReady }: { world: DemoWorldId; onReady: (world: DemoWorldId) => void }) {
  useEffect(() => { onReady(world) }, [world, onReady])
  return null
}

function AmbientSfx() { return null }

