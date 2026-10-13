'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ControllerConnectionState, GameStatusPacket, PlayerInput } from './types'

type Role = 'game' | 'controller'
type ServerPacket = {
  type: string
  version?: number
  reason?: string
  input?: PlayerInput
  status?: GameStatusPacket
  playerId?: 1 | 2
}

type Options = {
  enabled: boolean
  role: Role
  sessionId: string
  gameToken?: string
  playerId?: 1 | 2
  input?: PlayerInput
  status?: GameStatusPacket
  onPacket?: (packet: ServerPacket) => void
}

export function useControl3DConnection({ enabled, role, sessionId, gameToken, playerId, input, status, onPacket }: Options) {
  const [state, setState] = useState<ControllerConnectionState>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const inputRef = useRef(input)
  const statusRef = useRef(status)
  const packetRef = useRef(onPacket)
  inputRef.current = input
  statusRef.current = status
  packetRef.current = onPacket

  const send = useCallback((packet: object) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ version: 1, ...packet }))
  }, [])

  const sendInput = useCallback((nextInput?: PlayerInput) => {
    if (nextInput) inputRef.current = nextInput
    const current = inputRef.current
    if (current) send({ type: 'INPUT', input: current })
  }, [send])

  useEffect(() => {
    if (!enabled || !sessionId) {
      setState(enabled ? 'disconnected' : 'disabled')
      return
    }
    let stopped = false
    let reconnectTimer = 0
    let inputTimer = 0
    let heartbeatTimer = 0
    let statusTimer = 0
    let retry = 0
    let rejected = false
    let currentSocket: WebSocket | null = null

    const connect = () => {
      if (stopped) return
      setState(retry === 0 ? 'connecting' : 'disconnected')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/controller`)
      currentSocket = socket
      socketRef.current = socket

      socket.onopen = () => {
        retry = 0
        socket.send(JSON.stringify({ type: 'JOIN_SESSION', version: 1, protocolVersion: 1, role, sessionId, ...(role === 'game' ? { gameToken } : {}), ...(role === 'controller' && playerId ? { playerId } : {}) }))
      }
      socket.onmessage = (event) => {
        let packet: ServerPacket
        try { packet = JSON.parse(String(event.data)) as ServerPacket } catch { return }
        if (packet.type === 'JOIN_ACCEPTED') setState('connected')
        if (packet.type === 'JOIN_REJECTED') {
          rejected = true
          setState('rejected')
          socket.close()
        }
        packetRef.current?.(packet)
      }
      socket.onerror = () => { /* onclose owns reconnect so only one retry timer is created */ }
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null
        if (stopped || rejected) return
        setState('disconnected')
        retry += 1
        const delay = Math.min(5000, 400 * 2 ** Math.min(retry - 1, 4)) + Math.floor(Math.random() * 180)
        reconnectTimer = window.setTimeout(connect, delay)
      }

    }

    connect()
    if (role === 'controller') {
      inputTimer = window.setInterval(() => {
        const socket = socketRef.current
        const current = inputRef.current
        if (socket?.readyState === WebSocket.OPEN && current) socket.send(JSON.stringify({ type: 'INPUT', version: 1, input: current }))
      }, 34)
    } else {
      statusTimer = window.setInterval(() => {
        const socket = socketRef.current
        const current = statusRef.current
        if (socket?.readyState === WebSocket.OPEN && current) socket.send(JSON.stringify({ type: 'GAME_STATUS', version: 1, status: current }))
      }, 500)
    }
    heartbeatTimer = window.setInterval(() => {
      const socket = socketRef.current
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'HEARTBEAT', version: 1 }))
    }, 1000)
    return () => {
      stopped = true
      window.clearTimeout(reconnectTimer)
      window.clearInterval(inputTimer)
      window.clearInterval(heartbeatTimer)
      window.clearInterval(statusTimer)
      if (socketRef.current === currentSocket) socketRef.current = null
      currentSocket?.close(1000, 'page closed')
    }
  }, [enabled, role, sessionId, gameToken, playerId])

  return { state, sendInput }
}
