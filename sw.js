const CACHE = "moda-shell-v2";
const SHELL = ["/", "/index.html", "/moda-components.js", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never intercept Supabase or any API/cross-origin traffic - keep data live
  if (url.hostname.includes("supabase") || url.pathname.startsWith("/api") || url.origin !== location.origin) {
    return; // let it hit the network
  }
  // version.json must always hit the network for update detection
  if (url.pathname === "/version.json") return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
