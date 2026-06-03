// Домашний ангел · Service Worker v2
const CACHE = 'da-v2';
const OFFLINE_URLS = [
  '/home-angel/',
  '/home-angel/index.html',
  '/home-angel/dashboard.html',
  '/home-angel/login.html',
  '/home-angel/onboarding.html',
  '/home-angel/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase') ||
      e.request.url.includes('openrouter') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push от сервера (на будущее) ──────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(showNotif(data));
});

// ── Push от самого приложения (локальный) ────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'LOCAL_PUSH') {
    showNotif(e.data.payload);
  }
});

function showNotif(data) {
  const colors = { green: '#2d6a4f', amber: '#b45309', blue: '#1d4ed8', red: '#dc2626' };
  return self.registration.showNotification(data.title || 'Домашний ангел', {
    body:    data.body  || 'Новое событие',
    icon:    '/home-angel/icon-192.png',
    badge:   '/home-angel/icon-192.png',
    tag:     data.tag   || 'da-' + Date.now(),
    vibrate: data.vibrate || [200, 100, 200],
    data:    { url: data.url || '/home-angel/dashboard.html' },
    actions: data.actions || [],
    silent:  false,
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Если приложение уже открыто — фокусируем
      for (const client of list) {
        if (client.url.includes('/home-angel/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем
      return clients.openWindow(e.notification.data?.url || '/home-angel/dashboard.html');
    })
  );
});
