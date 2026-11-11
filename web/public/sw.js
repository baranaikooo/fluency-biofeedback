const CACHE = "glide-light-v12";
const ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/engine/training-core.js",
  "/engine/lesson-plan.js",
  "/engine/lesson-session.js",
  "/engine/questions-and-voices.js",
  "/engine/dsp-core.js",
  "/engine/gamification-engine.js",
  "/engine/daf-assistant.js",
  "/engine/interface.js",
  "/engine/supabase-auth.js",
  "/engine/lifecycle.js",
  "/engine/updates.js",
  "/engine/practice.js",
  "/engine/selects.js",
  "/audio/voice-manifest.json",
  "/audio/coach/boss_1.mp3",
  "/audio/coach/boss_2.mp3",
  "/audio/scenarios/pokladna_1.mp3",
  "/audio/scenarios/pokladna_payment.mp3",
  "/audio/scenarios/pokladna_payment_jaro.mp3",
  "/audio/courier.mp3",
  "/audio/cashier.mp3",
  "/audio/doctor.mp3",
  "/audio/automechanik.mp3",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS);
      const shell = await cache.match("/");
      const html = await shell.text();
      // Include Vite's hashed JS/CSS so offline works after the first production visit.
      const bundles = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(
        (match) => match[1],
      );
      await cache.addAll(bundles);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("glide-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_BUNDLES" || !Array.isArray(event.data.assets)) return;
  const assets = event.data.assets.filter((value) => {
    try {
      const url = new URL(value);
      return url.origin === self.location.origin && url.pathname.startsWith("/assets/");
    } catch (_) {
      return false;
    }
  });
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(assets)));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Do not cache API requests, OAuth responses, or development-server traffic.
  if (!ASSETS.includes(url.pathname) && !url.pathname.startsWith("/assets/")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error()),
  );
});
