const CACHE = "gemjar-shell-v3";
const IMAGE_CACHE = "gemjar-images-v1";
const MAX_IMAGES = 60;
const SHELL = ["/", "/shop", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];
const PROTECTED = ["/account", "/trade", "/agent", "/admin"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== IMAGE_CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, maximum) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maximum)).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.includes("/api/") ||
    url.pathname.startsWith("/checkout") ||
    PROTECTED.some((root) =>
      url.pathname === root || url.pathname.startsWith(`${root}/`),
    )
  ) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))));
    return;
  }
  if (request.destination === "image") {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(IMAGE_CACHE).then(async (cache) => {
        await cache.put(request, clone);
        await trim(IMAGE_CACHE, MAX_IMAGES);
      });
      return response;
    })));
  }
});
