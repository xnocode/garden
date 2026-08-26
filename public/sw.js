/*
 * Garden service worker — offline engine for the PWA.
 *
 * Strategy:
 *  - Navigation requests: network-first with cached shell fallback.
 *    Always serves fresh HTML on live network to guarantee chunks match,
 *    falling back to cached app shell when offline.
 *  - /_next/static + /content-assets: cache-first (immutable, content-hashed).
 *  - /api/: network-only (auth, private notes, comments — never cached).
 *
 * CACHE_VERSION is updated to invalidate outdated app shells.
 */
const CACHE_VERSION = "garden-v3";
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_ALL_CACHES") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

async function networkFirstWithFallback(request, cacheName, fallbackUrl) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(fallbackUrl, networkResponse.clone());
      return networkResponse;
    }
  } catch {
    // Offline or network failure — fallback to cached shell
  }
  const cache = await caches.open(cacheName);
  const cached = await cache.match(fallbackUrl);
  return cached || caches.match(fallbackUrl);
}

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

  // Page navigations — network-first for fresh bundles, falling back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithFallback(request, SHELL_CACHE, SHELL_URL));
    return;
  }

  // Icons, manifest, other same-origin assets.
  if (request.destination === "image" || url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
});
