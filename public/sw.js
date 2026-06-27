// Service Worker für FridgeAI: cached die App-Shell für Offline-Start und
// liefert bei fehlendem Netz eine Fallback-Seite statt eines Browser-Fehlers.
//
// Strategie:
// - Navigationen (HTML-Seiten): Network-first, Fallback auf Cache, dann /offline
// - API-Routes (/api/*): immer Network-only (KI-Antworten dürfen nie veraltet sein)
// - Statische Assets (_next/static, Icons, Manifest): Cache-first mit Hintergrund-Update

const CACHE_NAME = "fridgeai-cache-v1";
const APP_SHELL = ["/", "/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API-Routes nie cachen – immer frisch vom Server.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigationen: Network-first mit Cache- und Offline-Fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/offline");
        })
    );
    return;
  }

  // Statische Assets: Cache-first, Hintergrund-Refresh.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
