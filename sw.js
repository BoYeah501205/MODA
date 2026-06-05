// ============================================================
// MODA SERVICE WORKER — KILL SWITCH
// Root cause: previous SW versions cached /index.html which
// contains build-time CSS hashes. Each Vite deploy changes
// those hashes; cached HTML then points to 404 CSS files
// causing a completely unstyled page (recurring regression).
//
// This SW clears ALL caches and permanently unregisters itself
// so the browser fetches every asset fresh on every page load.
// copy-assets in package.json deploys this to dist/sw.js on
// every build, ensuring any previously-installed SW is removed.
// DO NOT replace this file with a caching SW.
// ============================================================

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", async () => {
  // Delete every cache this origin has ever created
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  // Unregister this SW — no SW controls this page going forward
  await self.registration.unregister();
  // Force all open tabs to reload so they get fresh HTML + CSS
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((c) => c.navigate(c.url));
});
