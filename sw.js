// Service worker mínimo: permite instalar la app. Siempre intenta la red primero
// para que los cambios publicados lleguen enseguida.
const CACHE = "facturas-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); return r; })
      .catch(() => caches.match(req)),
  );
});
