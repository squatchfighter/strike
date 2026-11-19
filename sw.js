// Strike offline: keeps the game (one page) and the HD sheets on the device so the home-screen app starts with no signal.
//  - the page: from the network when there is one (so updates arrive), else the copy kept here (3 s grace on a bad signal)
//  - hd/ sheets: kept per build (?v=<build>), served from here first; sheets of older builds are cleared out
//  - version.txt and anything else: straight to the network (the game copes when it fails)
const PAGE = 'strike-page', HD = 'strike-hd';
self.addEventListener('install', (ev) => { self.skipWaiting(); ev.waitUntil(caches.open(PAGE).then((c) => c.add('./').catch(() => {}))); });
self.addEventListener('activate', (ev) => { ev.waitUntil(self.clients.claim()); });
const timeout = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));
self.addEventListener('fetch', (ev) => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    ev.respondWith(Promise.race([fetch(req), timeout(3000)]).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(PAGE).then((c) => c.put('./', copy)); }
      return res;
    }).catch(() => caches.open(PAGE).then((c) => c.match('./')).then((hit) => hit || fetch(req))));
    return;
  }
  if (url.pathname.includes('/hd/')) {
    ev.respondWith(caches.open(HD).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        c.put(req, res.clone());
        const v = url.searchParams.get('v');
        if (v) c.keys().then((ks) => ks.forEach((k) => { const u = new URL(k.url); if (u.pathname === url.pathname && u.searchParams.get('v') !== v) c.delete(k); }));
      }
      return res;
    }))));
  }
});
