const CACHE = "neighborhood-diamond-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/src") ||
    url.pathname.includes("@vite") ||
    url.pathname.includes("node_modules") ||
    url.pathname.includes("@react-refresh")
  ) {
    return;
  }
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      } catch {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        throw new Error("offline");
      }
    }),
  );
});
