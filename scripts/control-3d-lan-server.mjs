import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { isIPv4 } from 'node:net'
import { pathToFileURL } from 'node:url'
import { ControlSessionManager } from '../src/lib/control-3d/session-manager.mjs'

function isPrivateLanAddress(address) {
  if (!isIPv4(address) || address.startsWith('169.254.')) return false
  const [first, second] = address.split('.').map(Number)
  return first === 10 || first === 192 && second === 168 || first === 172 && second >= 16 && second <= 31
}

export function getLanAddresses() {
  const addresses = []
  for (const [interfaceName, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = typeof entry.family === 'string' ? entry.family : entry.family === 4 ? 'IPv4' : 'IPv6'
      if (family !== 'IPv4' || entry.internal || !isPrivateLanAddress(entry.address)) continue
      addresses.push({ interfaceName, address: entry.address })
    }
  }
  return addresses.sort((left, right) => left.interfaceName.localeCompare(right.interfaceName) || left.address.localeCompare(right.address))
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(payload))
}

function isSameOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === request.headers.host } catch { return false }
}

export async function startControl3DLanServer(mode = 'dev', requestedPort = process.env.PORT) {
  const production = mode === 'start'
  process.env.NODE_ENV = production ? 'production' : 'development'
  process.env.NEXT_TELEMETRY_DISABLED ??= '1'
  const port = Number(requestedPort || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid PORT: ${requestedPort}`)

  const { default: next } = await import('next')
  const { WebSocketServer } = await import('ws')
  const app = next({ dev: !production, hostname: '0.0.0.0', port })
  await app.prepare()
  // This server dispatches upgrades itself. Next's request handler otherwise
  // registers a second listener that also treats controller sockets as HMR.
  app.didWebSocketSetup = true
  const requestHandler = app.getRequestHandler()
  const upgradeHandler = app.upgradeHandler ?? app.getUpgradeHandler()
  const sessions = new ControlSessionManager({ WebSocketServer })

  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname
    if (!pathname.startsWith('/__control-3d/')) return requestHandler(request, response)
    if (!isSameOrigin(request)) return writeJson(response, 403, { error: 'ORIGIN_REJECTED' })

    if (pathname === '/__control-3d/lan-info' && request.method === 'GET') {
      return writeJson(response, 200, { port, addresses: getLanAddresses() })
    }
    if (pathname === '/__control-3d/sessions' && request.method === 'POST') {
      let body = ''
      try {
        for await (const chunk of request) {
          body += chunk.toString()
          if (body.length > 2048) return writeJson(response, 413, { error: 'REQUEST_TOO_LARGE' })
        }
      } catch {
        return writeJson(response, 400, { error: 'INVALID_BODY' })
      }
      let gameType = 'control-3d'
      if (body) {
        try {
          const payload = JSON.parse(body)
          if (payload.gameType === 'control-2d-2players') gameType = payload.gameType
        } catch {
          return writeJson(response, 400, { error: 'INVALID_BODY' })
        }
      }
      const session = sessions.createSession({ gameType })
      return writeJson(response, 201, { ...session, port, addresses: getLanAddresses() })
    }
    const match = pathname.match(/^\/__control-3d\/sessions\/([A-Za-z0-9_-]{24,48})$/)
    if (match && request.method === 'DELETE') {
      return writeJson(response, sessions.removeSession(match[1]) ? 200 : 404, { closed: true })
    }
    return writeJson(response, 404, { error: 'NOT_FOUND' })
  })

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname
    if (pathname === '/ws/controller') {
      if (!isSameOrigin(request)) return socket.destroy()
      sessions.handleUpgrade(request, socket, head)
      return
    }
    if (!production && pathname === '/_next/webpack-hmr' && upgradeHandler) {
      upgradeHandler(request, socket, head)
      return
    }
    socket.destroy()
  })

  server.on('error', (error) => {
    console.error('[control-3d] server error:', error)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

  const address = server.address()
  const actualPort = address && typeof address === 'object' ? address.port : port
  console.log(`Control 3D ${production ? 'production' : 'development'} LAN mode`)
  console.log(`PC game: http://localhost:${actualPort}/game/control-3d`)
  const lanAddresses = getLanAddresses()
  if (lanAddresses.length) {
    console.log('Phone URLs (choose the address on the same Wi-Fi/LAN):')
    for (const item of lanAddresses) {
      console.log(`  Control 3D: http://${item.address}:${actualPort}/game/control-3d/controller/<sessionId>  (${item.interfaceName})`)
      console.log(`  Rừng săn quái 2D: http://${item.address}:${actualPort}/game/control-2d-2players/controller/<sessionId>?player=1|2  (${item.interfaceName})`)
    }
  } else {
    console.log('No private IPv4 adapter was found. Check that the PC is connected to Wi-Fi or Ethernet.')
  }
  console.log('LAN server binds to 0.0.0.0. Windows Firewall may ask to allow access on private networks.')

  const shutdown = () => {
    sessions.shutdown()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 3000).unref()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return { server, sessions, port: actualPort }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  startControl3DLanServer(process.argv[2] === 'start' ? 'start' : 'dev', process.argv[3] ?? process.env.PORT)
    .catch((error) => {
      console.error('[control-3d] failed to start:', error)
      process.exitCode = 1
    })
}
