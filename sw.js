/* Stagebook offline cache. Everything the app needs is stored on the device at install, so it
   opens and runs with no internet. A new version downloads in the background when online and
   takes over on the next launch. */
const VERSION = "453d12b09ae3";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "vendor/jszip.min.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/sql-asm.js"];
self.addEventListener("install", e => {
  /* cache: "reload" skips the browser's short-term copy (GitHub Pages allows 10 minutes), so an update
     never stores the previous version of a file. */
  e.waitUntil(caches.open("core-" + VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("core-") && k !== "core-" + VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === "navigate") { e.respondWith(caches.match("index.html").then(r => r || fetch(req))); return; }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open("fonts").then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (err) { return Response.error(); }
    }));
  }
});
