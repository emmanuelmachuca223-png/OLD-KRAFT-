/* Old Kraft · service worker
   - La app (HTML, íconos, librería y fuentes) se guarda para abrir sin internet.
   - Nunca se cachean las llamadas a Supabase (datos y sesión): siempre van a la red. */
var V = 'oldkraft-v5';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './privacidad.html', './terminos.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.hostname.indexOf('supabase.co') !== -1) return;          // datos: siempre red

  // Páginas: red primero, y si no hay señal, la copia guardada.
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) {
      var cp = res.clone(); caches.open(V).then(function (c) { c.put('./index.html', cp); });
      return res;
    }).catch(function () {
      return caches.match(r).then(function (m) { return m || caches.match('./index.html') || caches.match('./'); });
    }));
    return;
  }

  // Librería, fuentes e íconos: de la caché y se actualizan en segundo plano.
  var ok = u.origin === location.origin || /(^|\.)jsdelivr\.net$|fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!ok) return;
  e.respondWith(caches.match(r).then(function (m) {
    var net = fetch(r).then(function (res) {
      if (res && (res.status === 200 || res.type === 'opaque')) {
        var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); });
      }
      return res;
    }).catch(function () { return m; });
    return m || net;
  }));
});

// Notificaciones push
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Old Kraft', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
