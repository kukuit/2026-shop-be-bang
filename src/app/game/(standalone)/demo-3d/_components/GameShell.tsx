'use client'

import { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { MutableRefObject, ReactNode } from 'react'
import GameHUD from './GameHUD'
import MobileJoystick from './MobileJoystick'
import type { CameraMode } from './camera-config'
import { CAMERA_PRESETS } from './camera-config'
import type { MoveInput } from './types'
import styles from './demo.module.css'

export type DemoWorldId = 'village' | 'tieng-viet' | 'tieng-anh'
export type MathDepartureStage = 'boarding' | 'seated' | 'sailing' | 'transitioning' | 'returning' | null
export type EnglishLaunchStage = 'boarding' | 'seated' | 'launching' | 'transitioning' | 'landing' | 'returning' | 'rocket-flight' | null
type VillageArrival = 'tieng-viet-bridge' | 'math-dock' | 'english-launch' | null
const VILLAGE_ARRIVAL_KEY = 'demo-3d-village-arrival'

function saveVillageArrival(arrival: VillageArrival) {
  if (typeof window === 'undefined') return
  if (arrival) window.sessionStorage.setItem(VILLAGE_ARRIVAL_KEY, arrival)
  else window.sessionStorage.removeItem(VILLAGE_ARRIVAL_KEY)
}

function readVillageArrival(): VillageArrival {
  if (typeof window === 'undefined') return null
  const value = window.sessionStorage.getItem(VILLAGE_ARRIVAL_KEY)
  return value === 'tieng-viet-bridge' || value === 'math-dock' || value === 'english-launch' ? value : null
}
export type BridgeTransition = {
  from: DemoWorldId
  to: DemoWorldId
  entry: 'vietnamese-bridge'
  direction: 'forward' | 'backward'
  phase: 'running' | 'fading' | 'arriving'
  runDirectionZ: -1 | 1
  spawn: [number, number, number]
  spawnYaw: number
}

type Demo3DContextValue = {
  move: MoveInput
  setMove: (move: MoveInput) => void
  jumpVersion: number
  jump: () => void
  soundOn: boolean
  setSoundOn: (enabled: boolean) => void
  cameraMode: CameraMode
  cycleCameraMode: () => void
  cameraDistance: MutableRefObject<number>
  cameraYaw: MutableRefObject<number>
  cameraPitch: MutableRefObject<number>
  manualOrbitVersion: MutableRefObject<number>
  transition: BridgeTransition | null
  mathDepartureStage: MathDepartureStage
  englishLaunchStage: EnglishLaunchStage
  beginBridgeTransition: (world: DemoWorldId) => void
  beginMathDeparture: () => void
  beginMathSeaExit: () => void
  returnFromMathWorld: () => void
  mathWorldReady: () => void
  beginEnglishLaunch: () => void
  returnFromEnglishWorld: () => void
  englishWorldReady: () => void
  beginEnglishArrival: () => void
  resolveSpawn: (world: DemoWorldId) => { position: [number, number, number]; yaw: number }
  sceneReady: (world: DemoWorldId) => void
  isCovered: boolean
}

type Demo3DStableContextValue = {
  moveRef: MutableRefObject<MoveInput>
  setMove: (move: MoveInput) => void
  cameraMode: CameraMode
  cameraDistance: MutableRefObject<number>
  returnFromMathWorld: () => void
  mathWorldReady: () => void
}

const Demo3DContext = createContext<Demo3DContextValue | null>(null)
const Demo3DStableContext = createContext<Demo3DStableContextValue | null>(null)

export function useDemo3DGame() {
  const context = useContext(Demo3DContext)
  if (!context) throw new Error('useDemo3DGame must be used inside Demo3DGameShell')
  return context
}

export function useDemo3DStableGame() {
  const context = useContext(Demo3DStableContext)
  if (!context) throw new Error('useDemo3DStableGame must be used inside Demo3DGameShell')
  return context
}

export default function Demo3DGameShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [move, setMoveState] = useState<MoveInput>({ x: 0, z: 0 })
  const moveRef = useRef<MoveInput>({ x: 0, z: 0 })
  const [jumpVersion, setJumpVersion] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('normal')
  const [transition, setTransition] = useState<BridgeTransition | null>(null)
  const [mathDepartureStage, setMathDepartureStage] = useState<MathDepartureStage>(null)
  const [englishLaunchStage, setEnglishLaunchStage] = useState<EnglishLaunchStage>(null)
  const [isCovered, setIsCovered] = useState(false)
  const transitionRef = useRef<BridgeTransition | null>(null)
  const cameraDistance = useRef(CAMERA_PRESETS.normal.distance)
  const cameraYaw = useRef(0)
  const cameraPitch = useRef(Math.atan2(CAMERA_PRESETS.normal.height, CAMERA_PRESETS.normal.distance))
  const manualOrbitVersion = useRef(0)
  const timers = useRef<number[]>([])
  const inFlight = useRef(false)
  const englishArrivalStarted = useRef(false)
  const pendingVillageSpawn = useRef<{ position: [number, number, number]; yaw: number } | null>(null)
  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter((activeTimer) => activeTimer !== timer)
      callback()
    }, delay)
    timers.current.push(timer)
    return timer
  }, [])

  const setMove = useCallback((value: MoveInput) => {
    moveRef.current = value
    // The boat reads this ref in useFrame, so keep joystick movement off the
    // React render path while sailing. Character movement still uses state.
    if (pathname !== '/game/demo-3d/toan') setMoveState(value)
  }, [pathname])
  const jump = useCallback(() => setJumpVersion((value) => value + 1), [])
  const cycleCameraMode = useCallback(() => {
    const modes: CameraMode[] = ['normal', 'far', 'farther', 'panoramic', 'overview', 'firstPerson']
    setCameraMode((current) => modes[(modes.indexOf(current) + 1) % modes.length])
  }, [])

  const beginBridgeTransition = useCallback((world: DemoWorldId) => {
    if (inFlight.current || transitionRef.current) return
    const forward = world === 'village'
    const next: BridgeTransition = {
      from: world,
      to: forward ? 'tieng-viet' : 'village',
      entry: 'vietnamese-bridge',
      direction: forward ? 'forward' : 'backward',
      phase: 'running',
      runDirectionZ: forward ? -1 : 1,
      // Spawn on the destination land, beyond the end of the bridge.
      spawn: forward ? [0, 1.35, -39] : [0, 1.35, -18.5],
      spawnYaw: forward ? Math.PI : 0,
    }
    saveVillageArrival(forward ? null : 'tieng-viet-bridge')
    inFlight.current = true
    transitionRef.current = next
    setTransition(next)
    setMove({ x: 0, z: 0 })
    schedule(() => {
      const running = transitionRef.current
      if (!running) return
      const fading = { ...running, phase: 'fading' as const }
      transitionRef.current = fading
      setTransition(fading)
      setIsCovered(true)
      schedule(() => {
        router.push(fading.to === 'tieng-viet' ? '/game/demo-3d/tieng-viet' : '/game/demo-3d')
      }, 260)
    }, 430)
  }, [router, schedule, setMove])

  const beginMathDeparture = useCallback(() => {
    if (inFlight.current || mathDepartureStage) return
    inFlight.current = true
    saveVillageArrival(null)
    setMove({ x: 0, z: 0 })
    setMathDepartureStage('boarding')
    schedule(() => setMathDepartureStage('seated'), 1400)
    schedule(() => setMathDepartureStage('sailing'), 1800)
  }, [mathDepartureStage, schedule, setMove])

  const beginMathSeaExit = useCallback(() => {
    if (mathDepartureStage !== 'sailing') return
    setMathDepartureStage('transitioning')
    setIsCovered(true)
    schedule(() => router.push('/game/demo-3d/toan'), 300)
  }, [mathDepartureStage, router, schedule])

  const returnFromMathWorld = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    saveVillageArrival('math-dock')
    pendingVillageSpawn.current = { position: [19.8, 1.35, 2.5], yaw: -Math.PI / 2 }
    setMove({ x: 0, z: 0 })
    setMoveState({ x: 0, z: 0 })
    setMathDepartureStage('returning')
    setIsCovered(true)
    schedule(() => router.push('/game/demo-3d'), 300)
  }, [router, schedule, setMove])

  const beginEnglishLaunch = useCallback(() => {
    if (inFlight.current || englishLaunchStage) return
    inFlight.current = true
    englishArrivalStarted.current = false
    saveVillageArrival(null)
    setMove({ x: 0, z: 0 })
    setEnglishLaunchStage('boarding')
    schedule(() => setEnglishLaunchStage('seated'), 520)
    schedule(() => setEnglishLaunchStage('launching'), 820)
    schedule(() => { setEnglishLaunchStage('transitioning'); setIsCovered(true) }, 1650)
    schedule(() => router.push('/game/demo-3d/tieng-anh'), 1940)
  }, [englishLaunchStage, router, schedule, setMove])

  const returnFromEnglishWorld = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    saveVillageArrival('english-launch')
    pendingVillageSpawn.current = { position: [-5.3, 1.35, -4], yaw: -Math.PI / 2 }
    setMove({ x: 0, z: 0 })
    setEnglishLaunchStage('returning')
    schedule(() => setIsCovered(true), 650)
    schedule(() => router.push('/game/demo-3d'), 920)
  }, [router, schedule, setMove])

  const englishWorldReady = useCallback(() => {
    inFlight.current = false
    setEnglishLaunchStage(null)
    setIsCovered(false)
    setMove({ x: 0, z: 0 })
  }, [setMove])

  const beginEnglishArrival = useCallback(() => {
    if (englishArrivalStarted.current) return
    englishArrivalStarted.current = true
    inFlight.current = true
    cameraYaw.current = 0
    cameraPitch.current = Math.atan2(CAMERA_PRESETS.normal.height, CAMERA_PRESETS.normal.distance)
    setEnglishLaunchStage('landing')
    setIsCovered(false)
    schedule(() => {
      setEnglishLaunchStage('rocket-flight')
      inFlight.current = false
      setMove({ x: 0, z: 0 })
    }, 1050)
  }, [schedule, setMove])

  const mathWorldReady = useCallback(() => {
    inFlight.current = false
    setMathDepartureStage(null)
    setIsCovered(false)
    setMove({ x: 0, z: 0 })
    setMoveState({ x: 0, z: 0 })
  }, [setMove])

  const resolveSpawn = useCallback((world: DemoWorldId) => {
    const pending = transitionRef.current
    if (pending?.to === world) return { position: pending.spawn, yaw: pending.spawnYaw }
    if (world === 'village' && pendingVillageSpawn.current) return pendingVillageSpawn.current
    if (world === 'village') {
      const arrival = readVillageArrival()
      if (arrival === 'tieng-viet-bridge') return { position: [0, 1.35, -18.5] as [number, number, number], yaw: 0 }
      if (arrival === 'math-dock') return { position: [19.8, 1.35, 2.5] as [number, number, number], yaw: -Math.PI / 2 }
      if (arrival === 'english-launch') return { position: [-5.3, 1.35, -4] as [number, number, number], yaw: -Math.PI / 2 }
    }
    return world === 'village'
      ? { position: [0, 1.35, 8] as [number, number, number], yaw: Math.PI }
      : world === 'tieng-viet' ? { position: [0, 1.35, -39] as [number, number, number], yaw: Math.PI }
        : { position: [0, 1.35, 0] as [number, number, number], yaw: 0 }
  }, [])

  const sceneReady = useCallback((world: DemoWorldId) => {
    if (world === 'tieng-anh') {
      beginEnglishArrival()
      return
    }
    if (world === 'village' && pendingVillageSpawn.current) {
      pendingVillageSpawn.current = null
      inFlight.current = false
      setIsCovered(false)
      setMathDepartureStage(null)
      setEnglishLaunchStage(null)
      return
    }
    const pending = transitionRef.current
    if (!pending || pending.to !== world || pending.phase !== 'fading') return
    const arriving = { ...pending, phase: 'arriving' as const }
    transitionRef.current = arriving
    setTransition(arriving)
    setIsCovered(false)
    schedule(() => {
      transitionRef.current = null
      setTransition(null)
      inFlight.current = false
      setMove({ x: 0, z: 0 })
    }, 380)
  }, [beginEnglishArrival, schedule, setMove])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        if (englishLaunchStage === 'rocket-flight') return
        if (!event.repeat && !transitionRef.current) jump()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jump, englishLaunchStage])

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout)
  }, [])

  useEffect(() => {
    if (!transitionRef.current) return
    const expectedPath = transitionRef.current.to === 'tieng-viet' ? '/game/demo-3d/tieng-viet' : '/game/demo-3d'
    if (pathname !== expectedPath) return
    setIsCovered(true)
  }, [pathname])

  const contextValue = useMemo<Demo3DContextValue>(() => ({
    move, setMove, jumpVersion, jump, soundOn, setSoundOn, cameraMode, cycleCameraMode,
    cameraDistance, cameraYaw, cameraPitch, manualOrbitVersion, transition, mathDepartureStage, englishLaunchStage,
    beginBridgeTransition, beginMathDeparture, beginMathSeaExit, returnFromMathWorld, mathWorldReady,
    beginEnglishLaunch, returnFromEnglishWorld, englishWorldReady, beginEnglishArrival, resolveSpawn, sceneReady, isCovered,
  }), [move, setMove, jumpVersion, jump, soundOn, cameraMode, cycleCameraMode, transition, mathDepartureStage, englishLaunchStage, beginBridgeTransition, beginMathDeparture, beginMathSeaExit, returnFromMathWorld, mathWorldReady, beginEnglishLaunch, returnFromEnglishWorld, englishWorldReady, beginEnglishArrival, resolveSpawn, sceneReady, isCovered])
  const stableContextValue = useMemo<Demo3DStableContextValue>(() => ({
    moveRef, setMove, cameraMode, cameraDistance, returnFromMathWorld, mathWorldReady,
  }), [setMove, cameraMode, returnFromMathWorld, mathWorldReady])
  const transitionMessage = englishLaunchStage === 'transitioning' ? 'Đang bay đến Vũ trụ Tiếng Anh...'
    : englishLaunchStage === 'returning' ? 'Đang bay về Cappy World...'
    : mathDepartureStage === 'transitioning' ? 'Đang ra khơi...'
    : mathDepartureStage === 'returning' ? 'Đang về Cappy World...'
      : transition?.to === 'village' ? 'Đang đến khu nhà...' : 'Đang đến Vùng đất Tiếng Việt...'

  return <Demo3DStableContext.Provider value={stableContextValue}>
    <Demo3DContext.Provider value={contextValue}>
    <main className={styles.game} aria-label="Cappy World 3D" data-demo-world>
      {children}
      <GameHUD soundOn={soundOn} onToggleSound={() => setSoundOn((value) => !value)} onCycleCamera={cycleCameraMode} rocketFlight={englishLaunchStage === 'rocket-flight'} />
      <div className={styles.controlsHint}>{englishLaunchStage === 'rocket-flight' ? <><b>W / ↑</b><span>TĂNG TỐC</span><b>S / ↓</b><span>LÙI</span><b>A / D / ←→</b><span>QUAY</span><b>SPACE / SHIFT</b><span>NGẨNG / CÚI</span><span>Kéo chuột hoặc vuốt để ngắm hướng</span></> : pathname === '/game/demo-3d/toan' ? <>WASD / ↑↓←→ <span>LÁI THUYỀN</span><b>E</b> <span>CẬP BẾN</span></> : pathname === '/game/demo-3d/tieng-anh' ? <>WASD / ↑↓←→ <span>ĐI TRÊN TRẠM</span><b>SPACE</b> <span>NHẢY</span></> : mathDepartureStage === 'sailing' ? <>WASD / ↑↓←→ <span>CHÈO THUYỀN</span> <span>Ra biển để đến đảo Toán</span></> : <>WASD / ↑↓←→ <span>DI CHUYỂN</span><b>SPACE</b> <span>NHẢY / LÊN THUYỀN</span></>}</div>
      <MobileJoystick onMove={setMove} onJump={jump} flightMode={englishLaunchStage === 'rocket-flight'} showJump={pathname !== '/game/demo-3d/toan' && mathDepartureStage !== 'sailing'} disabled={Boolean(transition) || Boolean(englishLaunchStage && englishLaunchStage !== 'rocket-flight') || Boolean(mathDepartureStage && mathDepartureStage !== 'sailing')} />
      <div className={`${styles.worldTransition} ${isCovered ? styles.worldTransitionCovered : ''}`} data-camera-ignore aria-live="polite" aria-label={isCovered ? transitionMessage : undefined}>
        {isCovered && <div className={styles.worldTransitionMessage}><span aria-hidden="true">🐹</span><strong>{transitionMessage}</strong></div>}
      </div>
    </main>
    </Demo3DContext.Provider>
  </Demo3DStableContext.Provider>
}
