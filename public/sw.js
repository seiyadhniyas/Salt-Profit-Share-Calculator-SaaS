const CACHE_NAME = 'salt-calculator-v1.0.1';
const STATIC_CACHE = 'salt-calculator-static-v1.0.1';
const DYNAMIC_CACHE = 'salt-calculator-dynamic-v1.0.1';

// Only cache these assets on service worker install
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/Calculator-icon.png'
];

// Install event - cache only essential static assets
self.addEventListener('install', (event) => {
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

    // Navigation requests (HTML) - network first
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone()
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy))
            }
            return response
          })
          .catch(() => caches.match('/index.html'))
      )
      return
    }

    // Cache first for other assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone()
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone))
            }
            return response
          })
          .catch(() => new Response('Offline', { status: 503 }))
      })
    )
  })