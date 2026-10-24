const CACHE_NAME='jishin-ni-sonaeru-v34-20261024';
const ASSETS=[
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './manifest.json',
  './icon.svg',
  './images/trivia/01-past-earthquakes.webp',
  './images/trivia/02-magnitude-and-intensity.webp',
  './images/trivia/03-earthquake-probability.webp',
  './images/trivia/04-long-period-ground-motion.webp',
  './images/trivia/05-shimogyo-scenario.webp',
  './images/trivia/06-designated-shelters.webp',
  './images/trivia/07-life-saving-basics.webp',
  './images/trivia/08-aed-howto.webp',
  './images/trivia/09-fire-extinguisher.webp',
  './images/trivia/10-seismic-breaker.webp',
  './images/trivia/11-fire-alarm.webp',
  './images/trivia/12-block-wall.webp',
  './images/trivia/13-furniture-safety.webp',
  './images/trivia/14-rolling-stock.webp',
  './images/trivia/15-message-dial-171.webp'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('jishin-ni-sonaeru-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
  );
});
