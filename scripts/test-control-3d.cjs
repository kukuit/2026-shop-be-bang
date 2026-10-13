const assert = require('node:assert/strict')
const { createServer } = require('node:http')
const { once } = require('node:events')
const { WebSocket, WebSocketServer } = require('ws')
const rules = require('../src/lib/control-3d/game-rules.mjs')

function waitForPacket(socket, predicate, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Timed out waiting for WebSocket packet')), timeoutMs)
    const onMessage = (raw) => {
      let packet
      try { packet = JSON.parse(raw.toString()) } catch { return }
      if (predicate(packet)) finish(null, packet)
    }
    const finish = (error, packet) => {
      clearTimeout(timer)
      socket.off('message', onMessage)
      if (error) reject(error)
      else resolve(packet)
    }
    socket.on('message', onMessage)
  })
}

async function connectSocket(address, joinPacket) {
  const socket = new WebSocket(address)
  await once(socket, 'open')
  const accepted = waitForPacket(socket, (packet) => packet.type === 'JOIN_ACCEPTED' || packet.type === 'JOIN_REJECTED')
  socket.send(JSON.stringify(joinPacket))
  return { socket, packet: await accepted }
}

async function testNetworkPairing() {
  const { ControlSessionManager } = await import('../src/lib/control-3d/session-manager.mjs')
  const manager = new ControlSessionManager({ WebSocketServer })
  const server = createServer()
  server.on('upgrade', (request, socket, head) => manager.handleUpgrade(request, socket, head))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  const address = `ws://127.0.0.1:${port}`
  const session = manager.createSession()
  const prefix = { version: 1, protocolVersion: 1, sessionId: session.id }
  let game
  let controller

  try {
    const gameJoin = await connectSocket(address, { type: 'JOIN_SESSION', role: 'game', ...prefix, gameToken: session.gameToken })
    assert.equal(gameJoin.packet.type, 'JOIN_ACCEPTED')
    game = gameJoin.socket

    const wrong = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix, sessionId: `${session.id[0] === 'A' ? 'B' : 'A'}${session.id.slice(1)}` })
    assert.equal(wrong.packet.reason, 'SESSION_NOT_FOUND')
    wrong.socket.terminate()

    const invalidGame = await connectSocket(address, { type: 'JOIN_SESSION', role: 'game', ...prefix, gameToken: 'wrong-token' })
    assert.equal(invalidGame.packet.reason, 'INVALID_GAME_TOKEN')
    invalidGame.socket.terminate()

    const gameConnected = waitForPacket(game, (packet) => packet.type === 'CONTROLLER_CONNECTED')
    const controllerJoin = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix })
    assert.equal(controllerJoin.packet.type, 'JOIN_ACCEPTED')
    controller = controllerJoin.socket
    await gameConnected

    const duplicate = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix })
    assert.equal(duplicate.packet.reason, 'CONTROLLER_ALREADY_CONNECTED')
    duplicate.socket.terminate()

    const inputPacket = waitForPacket(game, (packet) => packet.type === 'INPUT' && packet.input.moveX === 1)
    controller.send(JSON.stringify({ version: 1, type: 'INPUT', input: { moveX: 8, moveY: -5, aimX: 0.45, aimY: 'bad', fire: true, jump: 1, reload: false, menu: true, extra: 'ignored' } }))
    const normalized = await inputPacket
    assert.deepEqual(normalized.input, { moveX: 1, moveY: -1, aimX: 0.45, aimY: 0, fire: true, jump: false, reload: false, menu: true })

    const neutralPacket = waitForPacket(game, (packet) => packet.type === 'INPUT' && packet.input.moveX === 0 && packet.input.fire === false && packet.input.menu === false)
    const disconnectedPacket = waitForPacket(game, (packet) => packet.type === 'CONTROLLER_DISCONNECTED')
    controller.close()
    await Promise.all([neutralPacket, disconnectedPacket])
    controller = null

    const reconnect = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix })
    assert.equal(reconnect.packet.type, 'JOIN_ACCEPTED')
    reconnect.socket.terminate()
  } finally {
    controller?.terminate()
    game?.terminate()
    manager.shutdown()
    server.close()
    await once(server, 'close')
  }
}

async function testTwoPlayerNetworkPairing() {
  const { ControlSessionManager } = await import('../src/lib/control-3d/session-manager.mjs')
  const manager = new ControlSessionManager({ WebSocketServer })
  const server = createServer()
  server.on('upgrade', (request, socket, head) => manager.handleUpgrade(request, socket, head))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  const address = `ws://127.0.0.1:${port}`
  const session = manager.createSession({ gameType: 'control-2d-2players' })
  const prefix = { version: 1, protocolVersion: 1, sessionId: session.id }
  let game
  const controllers = []

  try {
    const gameJoin = await connectSocket(address, { type: 'JOIN_SESSION', role: 'game', ...prefix, gameToken: session.gameToken })
    assert.equal(gameJoin.packet.type, 'JOIN_ACCEPTED')
    game = gameJoin.socket

    for (const playerId of [1, 2]) {
      const connected = waitForPacket(game, (packet) => packet.type === 'CONTROLLER_CONNECTED' && packet.playerId === playerId)
      const joined = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix, playerId })
      assert.equal(joined.packet.type, 'JOIN_ACCEPTED')
      controllers.push(joined.socket)
      await connected
    }

    const duplicate = await connectSocket(address, { type: 'JOIN_SESSION', role: 'controller', ...prefix, playerId: 1 })
    assert.equal(duplicate.packet.reason, 'CONTROLLER_ALREADY_CONNECTED')
    duplicate.socket.terminate()

    const p1Input = waitForPacket(game, (packet) => packet.type === 'INPUT' && packet.playerId === 1 && packet.input.aimX === 0.7)
    const p2Input = waitForPacket(game, (packet) => packet.type === 'INPUT' && packet.playerId === 2 && packet.input.aimX === -0.6)
    controllers[0].send(JSON.stringify({ version: 1, type: 'INPUT', input: { aimX: 0.7, aimY: 0.4, fire: true } }))
    controllers[1].send(JSON.stringify({ version: 1, type: 'INPUT', input: { aimX: -0.6, aimY: -0.3, fire: false } }))
    const [first, second] = await Promise.all([p1Input, p2Input])
    assert.equal(first.input.fire, true)
    assert.equal(second.input.fire, false)

    const p1Disconnect = waitForPacket(game, (packet) => packet.type === 'CONTROLLER_DISCONNECTED' && packet.playerId === 1)
    controllers[0].close()
    await p1Disconnect
    controllers[0] = null
    const p2StillConnected = waitForPacket(game, (packet) => packet.type === 'INPUT' && packet.playerId === 2 && packet.input.fire === true)
    await new Promise((resolve) => setTimeout(resolve, 40))
    controllers[1].send(JSON.stringify({ version: 1, type: 'INPUT', input: { aimX: 0, aimY: 0, fire: true } }))
    await p2StillConnected
  } finally {
    controllers.forEach((socket) => socket?.terminate())
    game?.terminate()
    manager.shutdown()
    server.close()
    await once(server, 'close')
  }
}

function testGameRules() {
  const raw = { moveX: 9, moveY: -8, aimX: Number.NaN, aimY: 0.25, fire: 1, jump: true, reload: false, forged: true }
  assert.deepEqual(rules.normalizePlayerInput(raw), { moveX: 1, moveY: -1, aimX: 0, aimY: 0.25, fire: false, jump: true, reload: false, menu: false })
  assert.deepEqual(rules.normalizePlayerInput(null), { ...rules.EMPTY_PLAYER_INPUT })

  const expected = [
    { normal: 3, fast: 0, boss: 0 },
    { normal: 5, fast: 0, boss: 0 },
    { normal: 4, fast: 2, boss: 0 },
    { normal: 6, fast: 3, boss: 0 },
    { normal: 4, fast: 0, boss: 1 },
  ]
  rules.CONTROL_LEVELS.forEach((level, index) => {
    const wave = rules.createLevelWave(index, () => 0.5)
    assert.equal(wave.length, Object.values(expected[index]).reduce((sum, count) => sum + count, 0))
    for (const kind of ['normal', 'fast', 'boss']) assert.equal(wave.filter((monster) => monster.kind === kind).length, expected[index][kind])
    assert.equal(new Set(wave.map((monster) => monster.id)).size, wave.length)
  })

  const damaged = rules.applyMonsterDamage({ kind: 'fast', health: 2 }, 1)
  assert.deepEqual(damaged, { health: 1, defeated: false, score: 0 })
  const defeated = rules.applyMonsterDamage({ kind: 'fast', health: 1 }, 1)
  assert.deepEqual(defeated, { health: 0, defeated: true, score: 20 })
  assert.equal(rules.scoreForMonster('normal'), 10)
  assert.equal(rules.scoreForMonster('boss'), 100)

  assert.equal(rules.canEnterGate('PLAYING', 0), false)
  assert.equal(rules.canEnterGate('LEVEL_CLEAR', 1), false)
  assert.equal(rules.canEnterGate('LEVEL_CLEAR', 0), true)
  assert.equal(rules.getNextLevelIndex(0), 1)
  assert.equal(rules.getNextLevelIndex(4), 4)
  assert.deepEqual(rules.createRunReset({ restart: true, levelIndex: 4, score: 90, kills: 7 }), { levelIndex: 0, score: 0, kills: 0, health: 100, magazine: 24, reserveAmmo: 144, gameStatus: 'PLAYING' })
  assert.deepEqual(rules.createRunReset({ restart: false, levelIndex: 2, score: 70, kills: 5, reserveAmmo: 100 }), { levelIndex: 2, score: 70, kills: 5, health: 100, magazine: 24, reserveAmmo: 132, gameStatus: 'PLAYING' })

  const readyAt = rules.nextCooldownAt(1, rules.WEAPON_CONFIG.fireRateSeconds)
  assert.equal(rules.isCooldownReady(1.17, readyAt), false)
  assert.equal(rules.isCooldownReady(1.18, readyAt), true)
  assert.equal(rules.canApplyDamage(1000, -Infinity, 0.72), true)
  assert.equal(rules.canApplyDamage(1600, 1000, 0.72), false)
  assert.equal(rules.canApplyDamage(1720, 1000, 0.72), true)

  assert.deepEqual(rules.normalizeGameStatusPacket({ level: 99, health: -2, maxHealth: 100, score: 40, enemiesRemaining: 3, gameStatus: 'PLAYING' }), { level: 5, health: 0, maxHealth: 100, score: 40, enemiesRemaining: 3, gameStatus: 'PLAYING' })
  assert.deepEqual(rules.normalizeGameStatusPacket({ level: 1, health: 100, maxHealth: 100, score: 20, enemiesRemaining: 4, gameStatus: 'PLAYING', players: [{ hp: 4, maxHp: 3, ammo: 31, maxAmmo: 30 }, { hp: 2, maxHp: 3, ammo: 12, maxAmmo: 30 }] }).players, [
    { hp: 3, maxHp: 3, ammo: 30, maxAmmo: 30 },
    { hp: 2, maxHp: 3, ammo: 12, maxAmmo: 30 },
  ])
}

async function main() {
  testGameRules()
  await testNetworkPairing()
  await testTwoPlayerNetworkPairing()
  console.log('control network tests passed: original 3D pairing and isolated P1/P2 2D slots, input routing, rejection and disconnect recovery')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
