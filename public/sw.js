const CACHE = 'medcore-shell-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        if (res.ok && url.origin === self.location.origin) {
          caches
            .open(CACHE)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/')))
  );
});

self.addEventListener('push', event => {
  let payload = { title: 'MedCore', body: 'You have a reminder.' };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: payload.tag,
      data: payload,
      actions: [
        { action: 'taken', title: 'Mark as taken' },
        { action: 'snooze', title: 'Snooze 30 min' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const url = action === 'taken' ? '/prescriptions?action=taken' : '/prescriptions';
      if (clients.length) return clients[0].focus().then(c => c.navigate(url));
      return self.clients.openWindow(url);
    })
  );
});
