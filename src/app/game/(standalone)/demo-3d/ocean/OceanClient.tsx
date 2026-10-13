'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MoveInput } from '../_components/types'
import MobileJoystick from '../_components/MobileJoystick'
import { useDemo3DGame } from '../_components/GameShell'
import OceanHUD from './OceanHUD'
import type { OceanOverlay } from './OceanHUD'
import type { OceanNearbyAction } from './OceanPlayer'
import { createOceanMissionPlan, validateOceanMissionPlan } from './ocean-mission'
import type { OceanMissionPlan } from './ocean-mission'
import type { OceanCollectible } from './ocean-layout'
import styles from './ocean.module.css'

const OceanScene = dynamic(() => import('./OceanScene'), { ssr: false })
const DIVE_SECONDS = 90

type Inventory = { shell: number; starfish: number; pearl: number; gem: number; goldenChest: number }
const EMPTY_INVENTORY: Inventory = { shell: 0, starfish: 0, pearl: 0, gem: 0, goldenChest: 0 }

export default function OceanClient() {
  const { oceanWorldReady, returnFromOceanWorld } = useDemo3DGame()
  const [missionPlan, setMissionPlan] = useState<OceanMissionPlan>(() => createOceanMissionPlan())
  const [roundIndex, setRoundIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [oxygen, setOxygen] = useState(DIVE_SECONDS)
  const [inventory, setInventory] = useState(EMPTY_INVENTORY)
  const [collectedIds, setCollectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [nearbyAction, setNearbyAction] = useState<OceanNearbyAction>(null)
  const [openedChestId, setOpenedChestId] = useState<string | null>(null)
  const [goldenChestFound, setGoldenChestFound] = useState(false)
  const [goldenChestOpening, setGoldenChestOpening] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [overlay, setOverlay] = useState<OceanOverlay>(null)
  const [recovering, setRecovering] = useState(false)
  const [recoveryVersion, setRecoveryVersion] = useState(0)
  const [interactVersion, setInteractVersion] = useState(0)
  const [move, setMove] = useState<MoveInput>({ x: 0, z: 0, y: 0 })
  const [mobile, setMobile] = useState(false)
  const [visible, setVisible] = useState(true)
  const [sceneReady, setSceneReady] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const keys = useRef(new Set<string>())
  const joystick = useRef<MoveInput>({ x: 0, z: 0, y: 0 })
  const disabledRef = useRef(true)
  const processing = useRef(false)
  const suppressRecoveryOverlay = useRef(false)
  const timers = useRef<number[]>([])
  const currentRound = missionPlan[Math.min(roundIndex, missionPlan.length - 1)]
  const inputDisabled = !sceneReady || contextLost || !visible || Boolean(overlay) || recovering || oxygen <= 0 || roundIndex >= 10
  disabledRef.current = inputDisabled
  const collectionCounts = useMemo(() => ({ ...inventory }), [inventory])

  useEffect(() => { oceanWorldReady() }, [oceanWorldReady])

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden)
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (!canvasElement) return
    const onLost = (event: Event) => { event.preventDefault(); setContextLost(true) }
    const onRestored = () => setContextLost(false)
    canvasElement.addEventListener('webglcontextlost', onLost)
    canvasElement.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvasElement.removeEventListener('webglcontextlost', onLost)
      canvasElement.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [canvasElement])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter((active) => active !== timer)
      callback()
    }, delay)
    timers.current.push(timer)
    return timer
  }, [])

  useEffect(() => {
    if (!sceneReady || !visible || contextLost || overlay || recovering || oxygen <= 0 || roundIndex >= 10) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = Math.min(0.5, Math.max(0, (now - last) / 1000))
      last = now
      setOxygen((remaining) => Math.max(0, remaining - elapsed))
    }, 200)
    return () => window.clearInterval(timer)
  }, [sceneReady, visible, contextLost, overlay, recovering, oxygen, roundIndex])

  useEffect(() => {
    if (!sceneReady || oxygen > 0 || recovering || roundIndex >= 10) return
    setNearbyAction(null)
    setMove({ x: 0, z: 0, y: 0 })
    setRecovering(true)
    setRecoveryVersion((value) => value + 1)
  }, [oxygen, recovering, roundIndex, sceneReady])

  const publishMove = useCallback(() => {
    if (disabledRef.current) { setMove({ x: 0, z: 0, y: 0 }); return }
    const pressed = keys.current
    const joystickMove = joystick.current
    setMove({
      x: Math.max(-1, Math.min(1, joystickMove.x + Number(pressed.has('d') || pressed.has('arrowright')) - Number(pressed.has('a') || pressed.has('arrowleft')))),
      z: Math.max(-1, Math.min(1, joystickMove.z + Number(pressed.has('w') || pressed.has('arrowup')) - Number(pressed.has('s') || pressed.has('arrowdown')))),
      y: Math.max(-1, Math.min(1, (joystickMove.y ?? 0) + Number(pressed.has(' ') || pressed.has('space')) - Number(pressed.has('shift')))),
    })
  }, [])

  const interact = useCallback(() => {
    if (disabledRef.current || !nearbyAction) return
    setInteractVersion((value) => value + 1)
  }, [nearbyAction])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'e') {
        if (!event.repeat && !disabledRef.current && nearbyAction) {
          event.preventDefault()
          setInteractVersion((value) => value + 1)
        }
        return
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) {
        if (key.startsWith('arrow') || key === ' ') event.preventDefault()
        keys.current.add(key)
        publishMove()
      }
      if (key === 'escape' && overlay) setOverlay(null)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase())
      publishMove()
    }
    const clearKeys = () => { keys.current.clear(); joystick.current = { x: 0, z: 0, y: 0 }; setMove({ x: 0, z: 0, y: 0 }) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
      clearKeys()
    }
  }, [nearbyAction, overlay, publishMove])

  const onJoystickMove = useCallback((nextMove: MoveInput) => {
    joystick.current = nextMove
    publishMove()
  }, [publishMove])

  const handleChestInteract = useCallback((id: string, number: number) => {
    if (processing.current || roundIndex >= 10) return
    processing.current = true
    if (number === currentRound.targetNumber) {
      setScore((value) => value + 10)
      setOpenedChestId(id)
      setFeedback('Mở đúng rồi! Bé được +10 điểm!')
      later(() => {
        setOpenedChestId(null)
        setFeedback('')
        const next = roundIndex + 1
        setRoundIndex(next)
        processing.current = false
        if (next >= 10) setOverlay('complete')
      }, 850)
    } else {
      setScore((value) => Math.max(0, value - 2))
      setFeedback('Chưa đúng rồi! Thử chiếc rương khác nhé. −2 điểm')
      later(() => { setFeedback(''); processing.current = false }, 800)
    }
  }, [currentRound.targetNumber, later, roundIndex])

  const handleGoldenChest = useCallback(() => {
    if (processing.current || goldenChestFound || goldenChestOpening) return
    processing.current = true
    setGoldenChestOpening(true)
    setFeedback('Tìm thấy rương vàng bí mật!')
    later(() => {
      setGoldenChestFound(true)
      setGoldenChestOpening(false)
      setInventory((value) => ({ ...value, goldenChest: value.goldenChest + 1 }))
      setFeedback('')
      processing.current = false
    }, 900)
  }, [goldenChestFound, goldenChestOpening, later])

  const handleCollect = useCallback((item: OceanCollectible) => {
    setCollectedIds((current) => {
      if (current.has(item.id)) return current
      const next = new Set(current)
      next.add(item.id)
      return next
    })
    setInventory((value) => ({ ...value, [item.kind]: value[item.kind] + 1 }))
    setFeedback(item.kind === 'gem' ? 'Đá quý lấp lánh! Đã cất vào túi.' : 'Cappy nhặt được một món quà biển!')
    later(() => setFeedback(''), 900)
  }, [later])

  const handleRecoveryComplete = useCallback(() => {
    setRecovering(false)
    if (suppressRecoveryOverlay.current) {
      suppressRecoveryOverlay.current = false
      return
    }
    setOverlay('recovery')
    setFeedback('')
  }, [])

  const handleDiveAgain = useCallback(() => {
    setOverlay(null)
    setOxygen(DIVE_SECONDS)
    setRecovering(false)
    setNearbyAction(null)
    keys.current.clear()
    joystick.current = { x: 0, z: 0, y: 0 }
    setMove({ x: 0, z: 0, y: 0 })
  }, [])

  const handleHome = useCallback(() => {
    if (roundIndex < 10) setOverlay('exit')
    else returnFromOceanWorld()
  }, [returnFromOceanWorld, roundIndex])

  const handleConfirmExit = useCallback(() => {
    setOverlay(null)
    returnFromOceanWorld()
  }, [returnFromOceanWorld])

  const handleReplay = useCallback(() => {
    const nextPlan = createOceanMissionPlan(Date.now() + Math.floor(Math.random() * 100000))
    setMissionPlan(validateOceanMissionPlan(nextPlan) ? nextPlan : createOceanMissionPlan())
    setRoundIndex(0)
    setScore(0)
    setOxygen(DIVE_SECONDS)
    setInventory(EMPTY_INVENTORY)
    setCollectedIds(new Set())
    setGoldenChestFound(false)
    setGoldenChestOpening(false)
    setOpenedChestId(null)
    setNearbyAction(null)
    setFeedback('')
    setOverlay(null)
    setRecovering(true)
    suppressRecoveryOverlay.current = true
    setRecoveryVersion((value) => value + 1)
    keys.current.clear()
    joystick.current = { x: 0, z: 0, y: 0 }
    setMove({ x: 0, z: 0, y: 0 })
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    processing.current = false
  }, [])

  const handleExploreNext = useCallback(() => setOverlay(null), [])
  const handleCloseOverlay = useCallback(() => setOverlay(null), [])
  const handleReady = useCallback(() => setSceneReady(true), [])
  const handleCanvasCreated = useCallback((canvas: HTMLCanvasElement) => setCanvasElement(canvas), [])
  const handleNearbyChange = useCallback((action: OceanNearbyAction) => setNearbyAction(action), [])
  const validatedPlan = validateOceanMissionPlan(missionPlan)

  return <>
    {!sceneReady && <div className={styles.oceanFallback} aria-live="polite">Đang chuẩn bị biển xanh cho Cappy…</div>}
    {validatedPlan && <OceanScene
      round={currentRound}
      openedChestId={openedChestId}
      goldenChestFound={goldenChestFound}
      goldenChestOpening={goldenChestOpening}
      collectedIds={collectedIds}
      nearbyAction={nearbyAction}
      move={move}
      interactVersion={interactVersion}
      inputDisabled={inputDisabled}
      recoveryVersion={recoveryVersion}
      mobile={mobile}
      visible={visible}
      onReady={handleReady}
      onCanvasCreated={handleCanvasCreated}
      onNearbyChange={handleNearbyChange}
      onChestInteract={handleChestInteract}
      onGoldenChestInteract={handleGoldenChest}
      onCollect={handleCollect}
      onRecoveryComplete={handleRecoveryComplete}
    />}
    <OceanHUD
      oxygen={oxygen}
      score={score}
      roundIndex={roundIndex}
      targetNumber={currentRound.targetNumber}
      inventory={collectionCounts}
      nearbyAction={nearbyAction}
      feedback={feedback}
      overlay={overlay}
      recovering={recovering}
      onInteract={interact}
      onHome={handleHome}
      onHelp={() => setOverlay('help')}
      onDiveAgain={handleDiveAgain}
      onExploreNext={handleExploreNext}
      onReplay={handleReplay}
      onCloseOverlay={handleCloseOverlay}
      onConfirmExit={handleConfirmExit}
    />
    <MobileJoystick onMove={onJoystickMove} onJump={() => undefined} disabled={inputDisabled} showJump flightMode />
    {contextLost && <div className={styles.contextLost} role="alert"><div><p>Biển đang tải lại hình ảnh.</p><button type="button" onClick={returnFromOceanWorld}>VỀ NHÀ</button></div></div>}
  </>
}
