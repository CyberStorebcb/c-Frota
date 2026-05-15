const CACHE_NAME = 'frota-checklists-v8'
const BACKGROUND_SYNC_TAG = 'frota-sync-checklists'
const APP_SHELL = [
  '/',
  '/checklist',
  '/manifest.webmanifest',
  '/branding/app-icon.png',
  '/branding/favicon.png',
  '/branding/cgb-logo-on-light.svg',
  '/branding/cgb-logo-on-dark.svg',
  '/branding/cgb-sidebar-mark.png',
  '/icons.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/checklist', copy))
          return response
        })
        .catch(async () => {
          return (await caches.match('/checklist')) || caches.match('/')
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
    }),
  )
})

// ---------------------------------------------------------------------------
// Background Sync — dispara quando o dispositivo recupera conexão,
// mesmo com o app fechado (Android/Chrome).
// ---------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(notifyClientsToSync())
  }
})

// Avisa todos os clientes abertos para disparar a sincronização
async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (clients.length > 0) {
    // App está aberto — avisa para sincronizar
    for (const client of clients) {
      client.postMessage({ type: 'SW_BACKGROUND_SYNC' })
    }
  }
  // Se não houver clientes abertos, a sincronização acontecerá
  // quando o usuário abrir o app (OfflineSyncProvider cuida disso)
}

// Recebe mensagem do app para registrar um sync tag
self.addEventListener('message', (event) => {
  if (event.data?.type === 'REGISTER_BACKGROUND_SYNC') {
    if ('SyncManager' in self) {
      self.registration.sync.register(BACKGROUND_SYNC_TAG).catch(() => {
        // Background Sync não suportado ou falhou — sem problema, cai no fallback
      })
    }
  }
})
