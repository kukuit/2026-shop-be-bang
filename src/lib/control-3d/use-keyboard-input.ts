'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CAMERA_CONFIG } from './camera-config'
import { EMPTY_PLAYER_INPUT } from './game-rules.mjs'
import type { PlayerInput } from './types'

export function useKeyboardInput(onPauseToggle: () => void, pointerLockAllowed = true, mouseLookEnabled = true) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const inputRef = useRef<PlayerInput>({ ...EMPTY_PLAYER_INPUT })
  const mouseLookRef = useRef({ x: 0, y: 0 })
  const aimModeRef = useRef(false)
  const pressedKeys = useRef(new Set<string>())
  const bindCanvas = useCallback((element: HTMLCanvasElement | null) => setCanvas(element), [])

  const requestPointerLock = useCallback(() => {
    if (!canvas || !pointerLockAllowed || document.pointerLockElement === canvas) return
    try {
      void canvas.requestPointerLock().catch(() => undefined)
    } catch {
      // Pointer Lock can be rejected when the browser no longer considers this a user gesture.
    }
  }, [canvas, pointerLockAllowed])

  const releasePointerLock = useCallback(() => {
    if (canvas && document.pointerLockElement === canvas) document.exitPointerLock()
  }, [canvas])

  const clearInput = useCallback(() => {
    pressedKeys.current.clear()
    inputRef.current = { ...EMPTY_PLAYER_INPUT }
    mouseLookRef.current.x = 0
    mouseLookRef.current.y = 0
    aimModeRef.current = false
  }, [])

  useEffect(() => {
    const updateKey = (key: string, pressed: boolean) => {
      const normalized = key.toLowerCase()
      if (pressed) pressedKeys.current.add(normalized)
      else pressedKeys.current.delete(normalized)
      const forward = Number(pressedKeys.current.has('w') || pressedKeys.current.has('arrowup'))
      const backward = Number(pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown'))
      const left = Number(pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft'))
      const right = Number(pressedKeys.current.has('d') || pressedKeys.current.has('arrowright'))
      inputRef.current.moveY = forward - backward
      inputRef.current.moveX = right - left
      if (normalized === ' ') inputRef.current.jump = pressed
      if (normalized === 'r') inputRef.current.reload = pressed
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onPauseToggle(); return }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      if (!event.repeat) updateKey(event.key, true)
    }
    const onKeyUp = (event: KeyboardEvent) => updateKey(event.key, false)
    const onMouseMove = (event: MouseEvent) => {
      if (!mouseLookEnabled || !canvas || document.pointerLockElement !== canvas) return
      mouseLookRef.current.x += event.movementX * CAMERA_CONFIG.mouseSensitivity
      mouseLookRef.current.y += event.movementY * CAMERA_CONFIG.mouseSensitivity
    }
    const onMouseDown = (event: MouseEvent) => {
      if (!pointerLockAllowed || !canvas || document.pointerLockElement !== canvas) return
      if (event.button === 0) inputRef.current.fire = true
      if (event.button === 2) aimModeRef.current = true
    }
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) inputRef.current.fire = false
      if (event.button === 2) aimModeRef.current = false
    }
    const onBlur = () => {
      clearInput()
      releasePointerLock()
    }
    const onPointerLockChange = () => {
      const locked = Boolean(canvas && document.pointerLockElement === canvas)
      if (!locked) clearInput()
    }
    const onContextMenu = (event: MouseEvent) => {
      if (event.target === canvas || document.pointerLockElement === canvas) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('pointerlockerror', clearInput)
    onPointerLockChange()
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('pointerlockerror', clearInput)
    }
  }, [canvas, clearInput, mouseLookEnabled, onPauseToggle, pointerLockAllowed, releasePointerLock])

  useEffect(() => {
    if (!pointerLockAllowed) {
      clearInput()
      releasePointerLock()
    }
  }, [clearInput, pointerLockAllowed, releasePointerLock])

  const reset = useCallback(() => {
    clearInput()
    releasePointerLock()
  }, [clearInput, releasePointerLock])

  return { canvas, inputRef, mouseLookRef, aimModeRef, bindCanvas, reset, requestPointerLock, releasePointerLock }
}
