// Домашний ангел · Service Worker
const CACHE = 'da-v1';
const OFFLINE_URLS = [
  '/home-angel/',
  '/home-angel/index.html',
  '/home-angel/dashboard.html',
  '/home-angel/login.html',
  '/home-angel/onboarding.html',
  '/home-angel/manifest.json',
];

// Установка — кешируем основные страницы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Активация — удаляем старые кеши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — сначала сеть, при ошибке кеш
self.addEventListener('fetch', e => {
  // Не кешируем API запросы
  if (e.request.url.includes('supabase') ||
      e.request.url.includes('openrouter') ||
      e.request.url.includes('googleapis')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Сохраняем свежую копию в кеш
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push уведомления (задел на будущее)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Домашний ангел', {
      body: data.body || 'Новое событие',
      icon: '/home-angel/icon-192.png',
      badge: '/home-angel/icon-192.png',
      tag: data.tag || 'da-notification',
      data: { url: data.url || '/home-angel/dashboard.html' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
