/* A.R.S Billing service worker - makes the app installable (shows in the app drawer)
   and lets it open with no signal. Pages: the newest copy from the server when it answers
   within 2.5 s; on a slow signal the saved copy opens at once and the new one is saved
   in the background for the next open. */
var CACHE = 'ars-billing-v44';
var WAIT_MS = 2500;
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
  var net = fetch(req.url, {cache:'no-store'}).then(function(res){
    if(res && res.ok){ var copy = res.clone(); return caches.open(CACHE).then(function(c){ return c.put(req, copy); }).then(function(){ return res; }, function(){ return res; }); }
    return res;
  });
  e.waitUntil(net.catch(function(){}));         // let the background download finish even after the saved copy was shown
  e.respondWith(new Promise(function(resolve){
    var done = false;
    var give = function(r){ if(done || !r) return false; done = true; resolve(r); return true; };
    var saved = caches.match(req).then(function(hit){
      return hit || (req.mode === 'navigate' ? caches.match('ARS_Seller_Billing_App.html') : null);
    }).catch(function(){ return null; });
    var timer = setTimeout(function(){ saved.then(give); }, WAIT_MS);   // slow signal: open the saved copy now
    net.then(function(r){ clearTimeout(timer); give(r); }, function(){
      clearTimeout(timer);
      saved.then(function(h){ if(!give(h)) give(Response.error()); });
    });
  }));
});
