const CACHE = "gemjar-shell-v1";
const SHELL = ["/", "/shop", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.url.includes("/api/") || request.url.includes("/checkout")) return;
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
      caches.open(CACHE).then((cache) => cache.put(request, clone));
      return response;
    })));
  }
});
