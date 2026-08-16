/*
 * Garden service worker — offline engine for the PWA.
 *
 * Strategy:
 *  - Navigation requests: stale-while-revalidate — serve the cached app shell
 *    instantly, refresh it in the background so new deploys appear on the
 *    next visit. Offline: cached shell (all notes live inside it).
 *  - /_next/static + /content-assets: cache-first (immutable, content-hashed).
 *  - /api/: network-only (auth, private notes, comments — never cached).
 *
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 */
const CACHE_VERSION = "garden-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_URL = "/";
const MERMAID_CDN_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.min.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(SHELL_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || caches.match(SHELL_URL);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Mermaid diagram engine (CDN) — runtime cache so offline PWA keeps diagrams.
  if (url.href === MERMAID_CDN_URL) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // network-only

  // Immutable build output — cache forever.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/content-assets/")
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Page navigations — instant from cache, refresh in background.
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(SHELL_URL, SHELL_CACHE));
    return;
  }

  // Icons, manifest, other same-origin assets.
  if (request.destination === "image" || url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
});
