import { randomBytes, timingSafeEqual } from 'node:crypto'
import { normalizeGameStatusPacket, normalizePlayerInput, EMPTY_PLAYER_INPUT } from './game-rules.mjs'

const VERSION = 1
const SESSION_TTL_MS = 2 * 60 * 60 * 1000
const INPUT_STALE_MS = 450
const MAX_INPUT_RATE_MS = 30

function token() {
  return randomBytes(24).toString('base64url')
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export class ControlSessionManager {
  constructor({ WebSocketServer, now = Date.now } = {}) {
    this.now = now
    this.sessions = new Map()
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })
    this.wss.on('connection', (socket) => this.attachSocket(socket))
    this.expiryTimer = setInterval(() => this.prune(), 250)
    this.expiryTimer.unref?.()
  }

  createSession({ gameType = 'control-3d' } = {}) {
    this.prune()
    const id = token()
    const gameToken = token()
    this.sessions.set(id, {
      id,
      gameToken,
      gameType,
      expiresAt: this.now() + SESSION_TTL_MS,
      gameSocket: null,
      controllerSocket: null,
      controllerSockets: new Map(),
      playerInputs: new Map(),
      playerLastSeenAt: new Map(),
      input: { ...EMPTY_PLAYER_INPUT },
      lastInputAt: 0,
      lastControllerSeenAt: 0,
      status: null,
    })
    return { id, gameToken, expiresAt: this.now() + SESSION_TTL_MS }
  }

  removeSession(id) {
    const session = this.sessions.get(id)
    if (!session) return false
    for (const socket of new Set([session.gameSocket, session.controllerSocket, ...session.controllerSockets.values()])) {
      if (socket?.readyState === 1) socket.close(1000, 'session closed')
    }
    this.sessions.delete(id)
    return true
  }

  handleUpgrade(request, socket, head) {
    this.wss.handleUpgrade(request, socket, head, (webSocket) => this.wss.emit('connection', webSocket, request))
  }

  shutdown() {
    clearInterval(this.expiryTimer)
    for (const id of this.sessions.keys()) this.removeSession(id)
    this.wss.close()
  }

  prune() {
    const now = this.now()
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) this.removeSession(id)
      else if (session.gameType === 'control-2d-2players') {
        for (const [playerId, lastSeenAt] of session.playerLastSeenAt) {
          if (now - lastSeenAt > INPUT_STALE_MS) this.resetPlayerInput(session, playerId, true)
        }
      } else if (session.controllerSocket && now - session.lastControllerSeenAt > INPUT_STALE_MS) {
        this.resetRemoteInput(session, true)
      }
    }
  }

  attachSocket(socket) {
    const peer = { socket, role: null, session: null, lastInputPacketAt: 0 }
    socket.on('message', (raw) => {
      let packet
      try { packet = JSON.parse(raw.toString()) } catch { return this.reject(peer, 'INVALID_PACKET') }
      if (!packet || packet.version !== VERSION || typeof packet.type !== 'string') return this.reject(peer, 'UNSUPPORTED_PROTOCOL')
      if (!peer.role) return this.join(peer, packet)
      if (packet.type === 'HEARTBEAT') {
        if (peer.role === 'controller') {
          if (peer.session.gameType === 'control-2d-2players') peer.session.playerLastSeenAt.set(peer.playerId, this.now())
          else peer.session.lastControllerSeenAt = this.now()
        }
        this.send(socket, { type: 'HEARTBEAT', version: VERSION, at: this.now() })
        return
      }
      if (peer.role === 'controller' && packet.type === 'INPUT') return this.acceptInput(peer, packet.input)
      if (peer.role === 'game' && packet.type === 'GAME_STATUS') {
        peer.session.status = normalizeGameStatusPacket(packet.status)
        this.forEachController(peer.session, (controllerSocket) => this.send(controllerSocket, { type: 'GAME_STATUS', version: VERSION, status: peer.session.status }))
      }
    })
    socket.on('close', () => this.detach(peer))
    socket.on('error', () => this.detach(peer))
  }

  join(peer, packet) {
    if (packet.type !== 'JOIN_SESSION') return this.reject(peer, 'JOIN_REQUIRED')
    if (packet.protocolVersion !== VERSION || typeof packet.sessionId !== 'string') return this.reject(peer, 'UNSUPPORTED_PROTOCOL')
    const session = this.sessions.get(packet.sessionId)
    if (!session || session.expiresAt <= this.now()) return this.reject(peer, 'SESSION_NOT_FOUND')
    const role = packet.role === 'game' ? 'game' : packet.role === 'controller' ? 'controller' : null
    if (!role) return this.reject(peer, 'INVALID_ROLE')
    if (role === 'game' && !safeEqual(packet.gameToken, session.gameToken)) return this.reject(peer, 'INVALID_GAME_TOKEN')
    if (role === 'game' && session.gameSocket && session.gameSocket.readyState === 1) return this.reject(peer, 'GAME_ALREADY_CONNECTED')
    const multiplayer = session.gameType === 'control-2d-2players'
    const playerId = multiplayer ? packet.playerId : 1
    if (role === 'controller' && multiplayer && playerId !== 1 && playerId !== 2) return this.reject(peer, 'PLAYER_SLOT_REQUIRED')
    if (role === 'controller' && multiplayer && session.controllerSockets.get(playerId)?.readyState === 1) return this.reject(peer, 'CONTROLLER_ALREADY_CONNECTED')
    if (role === 'controller' && !multiplayer && session.controllerSocket && session.controllerSocket.readyState === 1) return this.reject(peer, 'CONTROLLER_ALREADY_CONNECTED')
    peer.role = role
    peer.session = session
    if (role === 'controller') peer.playerId = playerId
    if (role === 'game') {
      session.gameSocket = peer.socket
      if (multiplayer) {
        for (const playerId of session.controllerSockets.keys()) this.send(peer.socket, { type: 'CONTROLLER_CONNECTED', version: VERSION, playerId })
      } else if (session.controllerSocket?.readyState === 1) {
        this.send(peer.socket, { type: 'CONTROLLER_CONNECTED', version: VERSION })
      }
    } else {
      session.controllerSocket = session.controllerSocket ?? peer.socket
      session.controllerSockets.set(playerId, peer.socket)
      if (multiplayer) {
        session.playerLastSeenAt.set(playerId, this.now())
        session.playerInputs.set(playerId, { ...EMPTY_PLAYER_INPUT })
      } else {
        session.lastControllerSeenAt = this.now()
        session.lastInputAt = 0
        session.input = { ...EMPTY_PLAYER_INPUT }
      }
      this.send(session.gameSocket, { type: 'CONTROLLER_CONNECTED', version: VERSION, ...(multiplayer ? { playerId } : {}) })
      if (session.status) this.send(peer.socket, { type: 'GAME_STATUS', version: VERSION, status: session.status })
    }
    this.send(peer.socket, { type: 'JOIN_ACCEPTED', version: VERSION, role, status: session.status })
  }

  acceptInput(peer, rawInput) {
    const session = peer.session
    const now = this.now()
    if (session.gameType === 'control-2d-2players') session.playerLastSeenAt.set(peer.playerId, now)
    else session.lastControllerSeenAt = now
    if (now - peer.lastInputPacketAt < MAX_INPUT_RATE_MS) return
    peer.lastInputPacketAt = now
    if (session.gameType === 'control-2d-2players') {
      const input = normalizePlayerInput(rawInput)
      session.playerInputs.set(peer.playerId, input)
      this.send(session.gameSocket, { type: 'INPUT', version: VERSION, playerId: peer.playerId, input })
      return
    }
    session.lastInputAt = now
    session.input = normalizePlayerInput(rawInput)
    this.send(session.gameSocket, { type: 'INPUT', version: VERSION, input: session.input })
  }

  resetRemoteInput(session, notify) {
    const changed = Object.keys(session.input).some((key) => session.input[key] !== EMPTY_PLAYER_INPUT[key])
    session.input = { ...EMPTY_PLAYER_INPUT }
    session.lastInputAt = 0
    if (notify && changed) this.send(session.gameSocket, { type: 'INPUT', version: VERSION, input: session.input })
  }

  resetPlayerInput(session, playerId, notify) {
    const input = session.playerInputs.get(playerId) ?? EMPTY_PLAYER_INPUT
    const changed = Object.keys(input).some((key) => input[key] !== EMPTY_PLAYER_INPUT[key])
    session.playerInputs.set(playerId, { ...EMPTY_PLAYER_INPUT })
    session.playerLastSeenAt.set(playerId, this.now())
    if (notify && changed) this.send(session.gameSocket, { type: 'INPUT', version: VERSION, playerId, input: { ...EMPTY_PLAYER_INPUT } })
  }

  forEachController(session, callback) {
    const sockets = session.gameType === 'control-2d-2players'
      ? session.controllerSockets.values()
      : session.controllerSocket ? [session.controllerSocket] : []
    for (const socket of sockets) if (socket?.readyState === 1) callback(socket)
  }

  detach(peer) {
    const session = peer.session
    if (!session) return
    if (peer.role === 'controller' && session.controllerSockets.get(peer.playerId) === peer.socket) {
      session.controllerSockets.delete(peer.playerId)
      if (session.controllerSocket === peer.socket) session.controllerSocket = session.controllerSockets.values().next().value ?? null
      if (session.gameType === 'control-2d-2players') {
        session.playerLastSeenAt.delete(peer.playerId)
        this.resetPlayerInput(session, peer.playerId, true)
      } else this.resetRemoteInput(session, true)
      this.send(session.gameSocket, { type: 'CONTROLLER_DISCONNECTED', version: VERSION, ...(session.gameType === 'control-2d-2players' ? { playerId: peer.playerId } : {}) })
    }
    if (peer.role === 'game' && session.gameSocket === peer.socket) {
      session.gameSocket = null
      this.resetRemoteInput(session, false)
      this.forEachController(session, (controllerSocket) => this.send(controllerSocket, { type: 'GAME_STATUS', version: VERSION, status: { gameStatus: 'PAUSED', health: 0, maxHealth: 100, level: 1, score: 0, enemiesRemaining: 0 } }))
    }
    peer.session = null
  }

  reject(peer, reason) {
    this.send(peer.socket, { type: 'JOIN_REJECTED', version: VERSION, reason })
    peer.socket.close(1008, reason)
  }

  send(socket, value) {
    if (socket?.readyState === 1) socket.send(JSON.stringify(value))
  }
}
