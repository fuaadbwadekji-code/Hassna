// Réseau d'abord, cache en secours hors-ligne. Change VERSION à chaque mise à jour.
const VERSION = "v85";
const CACHE = "hf-" + VERSION;
const SHELL = ["./", "index.html", "style.css", "app.js", "art.js", "questions.js", "i18n.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("hf-v") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  const cdn = url.hostname === "cdn.jsdelivr.net";
  if (url.origin !== location.origin && !cdn) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: false });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; });
    e.waitUntil(net.catch(() => {}));
    if (hit && cdn) return hit;
    if (hit) return Promise.race([net.catch(() => hit), new Promise((r) => setTimeout(() => r(hit), 1200))]);
    try { return await net; } catch { return (await caches.match("index.html")) || Response.error(); }
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil((async () => {
    try { const c = await caches.open("hf-open"); await c.put("/__open", new Response(JSON.stringify({ k: d.k || "", id: d.id || "", t: Date.now() }))); } catch {}
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) { if ("focus" in c) { c.postMessage({ type: "open", k: d.k || "", id: d.id || "" }); return c.focus(); } }
    return self.clients.openWindow("./#o=" + encodeURIComponent((d.k || "") + ":" + (d.id || "")));
  })());
});
self.addEventListener("message", (e) => { if (e.data && e.data.type === "ver" && e.source) e.source.postMessage({ type: "ver", v: VERSION }); });
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cs.forEach((c) => c.postMessage({ type: "push", k: d.k || "" }));
    await self.registration.showNotification(d.title || "Hasnaa & Fouad", {
      body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined,
      vibrate: d.vib || [200], dir: "auto", data: { url: d.url || "./", k: d.k || ({ comment: "comment", capsule: "capsule", shared: "task", todo: "task", r: "task", creply: "capsules", answer: "question", dq: "question", msg: "chat" }[(d.tag || "").split(":")[0]] || ""), id: d.id || "" }
    });
  })());
});
