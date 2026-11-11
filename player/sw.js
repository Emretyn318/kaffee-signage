// Oynatıcı sayfasını cihazda saklar: internet yokken ekran açılırsa son sürüm yüklenir.
// Önce internetten dener (güncel sürüm), olmazsa hafızadakini verir. Medya dosyalarına dokunmaz.
var SHELL = 'sig-shell-v1';

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // Supabase vb. dış istekler: dokunma
  if (url.pathname.indexOf('/kaffee-signage/player/') !== 0) return;

  var key = url.origin + url.pathname;                         // ?code=... parametresinden bağımsız sakla
  e.respondWith(
    timeout(fetch(req), 8000).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(SHELL).then(function (c) { c.put(key, copy); });
      }
      return res;
    }).catch(function () {
      return caches.open(SHELL).then(function (c) { return c.match(key); }).then(function (hit) {
        return hit || new Response('Bağlantı bekleniyor', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      });
    })
  );
});

function timeout(p, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    p.then(function (r) { clearTimeout(t); resolve(r); }, function (err) { clearTimeout(t); reject(err); });
  });
}
