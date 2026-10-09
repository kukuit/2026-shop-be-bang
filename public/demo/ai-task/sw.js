const CACHE_PREFIX = 'ai-task-local-shell-'
const CACHE_NAME = `${CACHE_PREFIX}v2`
const OFFLINE_URL = '/demo/ai-task/offline.html'
const LOCAL_MODE_KEY = new URL('/__ai_task_local_mode__', self.location.origin).href
let localModeEnabled = false

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SET_LOCAL_MODE') {
    localModeEnabled = event.data.enabled === true
    event.waitUntil(caches.open(CACHE_NAME).then(cache => localModeEnabled ? cache.put(LOCAL_MODE_KEY, new Response('enabled')) : cache.delete(LOCAL_MODE_KEY)))
  }
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/demo/ai-task/api/') || request.headers.has('RSC') || url.searchParams.has('_rsc')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/games/') || /^\/(?:icon(?:-|\/)|favicon(?:\.|\/)|images\/)/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone())
      return response
    }))
    return
  }

  if (request.mode === 'navigate' && url.pathname.startsWith('/demo/ai-task')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      const localEnabled = localModeEnabled || !!await cache.match(LOCAL_MODE_KEY)
      try {
        const response = await fetch(request)
        const type = response.headers.get('content-type') || ''
        if (localEnabled && response.ok && type.includes('text/html')) {
          const cacheUrl = new URL(url.pathname, url.origin).href
          await cache.put(cacheUrl, response.clone())
        }
        return response
      } catch {
        if (!localEnabled) return Response.error()
        const cacheUrl = new URL(url.pathname, url.origin).href
        return await cache.match(cacheUrl) || await cache.match(OFFLINE_URL) || Response.error()
      }
    })())
  }
})
