/* Public static cache only: fingerprinted code cache-first, entry/version checks
 * network-first, art cache-first. Never cache account/session/save endpoints. */
const CODE='ps-cn-code-v4',ART='ps-cn-art-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CODE).then(c=>c.addAll(['./','./index.html','./manifest.webmanifest'])).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>/^ps-(cn-)?(code|art)-/.test(k)&&k!==CODE&&k!==ART).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(url.origin!==location.origin||/^\/api(?:\/|$)/.test(url.pathname))return;
  const art=/\/assets\/(pokemon|icons|fonts)\//.test(url.pathname),versioned=/\.(?:js|css)$/.test(url.pathname)&&/^[a-f0-9]{10}$/.test(url.searchParams.get('v')||'');
  const valid=res=>{const type=res.headers.get('content-type')||'';return res.ok&&(req.destination==='script'?/javascript/.test(type):req.destination==='style'?/text\/css/.test(type):true);};
  e.respondWith((async()=>{
    const cache=await caches.open(art?ART:CODE);
    if((art||versioned)&&req.cache!=='reload'&&req.cache!=='no-store'){const hit=await cache.match(req);if(hit)return hit;}
    try{
      const res=await fetch(req,art||versioned?undefined:{cache:'no-cache'});
      if(valid(res)&&(!versioned||/immutable/.test(res.headers.get('cache-control')||''))){const copy=res.clone();e.waitUntil(cache.put(req,copy).catch(()=>{}));}
      return res;
    }catch{
      const hit=await cache.match(req);if(hit)return hit;
      if(req.mode==='navigate')return (await cache.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
