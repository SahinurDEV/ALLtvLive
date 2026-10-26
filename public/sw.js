/* ALLtvLive service worker: makes the app installable and keeps the app shell,
   channel list and favorites usable offline. Live streams, other sites and
   private APIs are never cached.
   The cache name includes the build id (sw.js?v=<build>), so each deploy gets a
   fresh cache and old build files are deleted on activate. */
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const VERSION = `atl-${BUILD}`;
const DATA = "atl-data"; // catalog + last pages, shared across builds
const SHELL = ["/offline.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];
const PAGES = ["/", "/watch"];
// Public, CDN-cached catalog files: kept for offline use.
const DATA_API = /^\/api\/(catalog\/(channels|streams|logos)|catalog-hidden)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  // Deleting caches never reloads open pages, so playback is not interrupted.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== DATA).map((k) => caches.delete(k))))
      // Saved pages point at the previous build's files: drop them; the next
      // online visit saves fresh ones.
      .then(() => caches.open(DATA).then((c) => Promise.all(PAGES.map((p) => c.delete(p)))))
      .then(() => self.clients.claim())
  );
});

function stash(cacheName, req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(cacheName).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // streams, logos, iptv-org API
  if (url.pathname.startsWith("/admin")) return;

  // Catalog: network first, cached copy when offline.
  if (DATA_API.test(url.pathname)) {
    event.respondWith(fetch(req).then((r) => stash(DATA, req, r)).catch(() => caches.match(req, { cacheName: DATA }).then((r) => r || Response.error())));
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  // Pages: network first; offline, the last copy of /, /watch or a channel
  // page (which opens the /watch app), else the offline page.
  if (req.mode === "navigate") {
    const key = PAGES.includes(url.pathname) ? url.pathname : null;
    event.respondWith(
      fetch(req)
        .then((r) => (key ? stash(DATA, key, r) : r))
        .catch(() =>
          caches
            .match(key || "/watch", { cacheName: DATA })
            .then((r) => r || caches.match("/offline.html"))
            .then((r) => r || Response.error())
        )
    );
    return;
  }

  // Hashed build assets never change: cache first, in this build's cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => stash(VERSION, req, r))));
  }
});
