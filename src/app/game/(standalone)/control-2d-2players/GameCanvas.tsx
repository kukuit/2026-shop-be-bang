'use client'

import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { HuntScene, type HuntDifficulty, type HuntMode, type HuntSnapshot, type RemoteHuntInput, type WeaponMode } from './HuntScene'
import styles from './hunt.module.css'

export type HuntGameHandle = {
  startRun: (difficulty?: HuntDifficulty, mode?: HuntMode) => void
  advanceStage: () => Promise<void>
  pauseRun: () => void
  resumeRun: () => void
  useAbility: (playerId: 1 | 2, ability: 0 | 1) => void
  activateWeapon: (playerId: 1 | 2, weapon: WeaponMode) => void
}

type Props = {
  controllerInputs: [RemoteHuntInput | null, RemoteHuntInput | null]
  onState: (state: HuntSnapshot) => void
  onReady: () => void
  handleRef: React.MutableRefObject<HuntGameHandle | null>
}

export default function GameCanvas({ controllerInputs, onState, onReady, handleRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HuntScene | null>(null)
  const sceneReadyRef = useRef(false)
  const inputsRef = useRef(controllerInputs)
  const callbackRef = useRef(onState)
  const readyRef = useRef(onReady)
  callbackRef.current = onState
  readyRef.current = onReady
  inputsRef.current = controllerInputs

  useEffect(() => {
    if (!hostRef.current) return
    const scene = new HuntScene()
    const receiveState = (state: HuntSnapshot) => callbackRef.current(state)
    const markReady = () => {
      sceneReadyRef.current = true
      scene.setControllerInput(1, inputsRef.current[0])
      scene.setControllerInput(2, inputsRef.current[1])
      readyRef.current()
    }
    // Phaser initializes scene.events during boot, so bridge React with callbacks
    // that are safe to attach before constructing the game.
    scene.onSnapshot = receiveState
    scene.onReady = markReady
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 1920,
      height: 1080,
      backgroundColor: '#3d7f35',
      antialias: true,
      roundPixels: false,
      render: { pixelArt: false, powerPreference: 'high-performance' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1920, height: 1080 },
      scene,
    })
    sceneRef.current = scene
    handleRef.current = {
      startRun: (difficulty, mode) => { game.scene.resume('HuntScene'); scene.startRun(difficulty, mode) },
      advanceStage: () => scene.advanceStage(),
      pauseRun: () => { scene.pauseRun(); game.scene.pause('HuntScene') },
      resumeRun: () => { game.scene.resume('HuntScene'); scene.resumeRun() },
      useAbility: (playerId, ability) => scene.useAbility(playerId, ability),
      activateWeapon: (playerId, weapon) => scene.activateWeapon(playerId, weapon),
    }
    return () => {
      scene.onSnapshot = undefined
      scene.onReady = undefined
      game.destroy(true)
      sceneRef.current = null
      sceneReadyRef.current = false
      handleRef.current = null
    }
  }, [handleRef])

  useEffect(() => {
    if (!sceneReadyRef.current) return
    sceneRef.current?.setControllerInput(1, controllerInputs[0])
    sceneRef.current?.setControllerInput(2, controllerInputs[1])
  }, [controllerInputs])

  return <div ref={hostRef} className={styles.canvasHost} aria-label="Game Rừng săn quái" />
}
