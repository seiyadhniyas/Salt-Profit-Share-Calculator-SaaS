const CACHE_VERSION = 'v2.0.0'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`

const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/Calculator-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k)
        return Promise.resolve()
      })
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch (e) {
    // If URL parsing fails, fall back to network
    event.respondWith(fetch(request))
    return
  }

  // Skip unsupported protocols (chrome-extension:, data:, about:, etc.)
  if (!['http:', 'https:'].includes(url.protocol)) {
    event.respondWith(fetch(request).catch(() => new Response('Network error', { status: 503 })))
    return
  }

  // Navigation requests (HTML) - network first with cached fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((c) => {
              try { c.put(request, copy) } catch (e) {}
            }).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Cache-first for other assets (only cache http(s) successful responses)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            const clone = response.clone()
            caches.open(RUNTIME_CACHE).then((c) => {
              try { c.put(request, clone) } catch (e) {}
            }).catch(() => {})
          }
          return response
        })
        .catch(() => new Response('Offline', { status: 503 }))
    })
  )
})