/* A.R.S Billing service worker - makes the app installable (shows in the app drawer)
   and lets it open with no signal. Pages: network first, falls back to the saved copy. */
var CACHE = 'ars-billing-v2';
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(['./', 'ARS_Seller_Billing_App.html', 'icon-192.png', 'icon-512.png']).catch(function(){});
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;   // Firebase, Google Sheet, CDNs: never touched
  e.respondWith(
    fetch(req.url, {cache:'no-store'}).then(function(res){   // always ask the server, so a new upload shows at once
      if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){ return hit || (req.mode === 'navigate' ? caches.match('ARS_Seller_Billing_App.html') : undefined); });
    })
  );
});
