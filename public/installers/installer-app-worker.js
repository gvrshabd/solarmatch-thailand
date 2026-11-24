/* The installer workspace holds private records. Only provide a generic retry screen
   for top-level GET navigations. Never store a page, API response or queued write. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin ||
      !(url.pathname === '/installers/app' || url.pathname.startsWith('/installers/app/'))) return;

  event.respondWith(fetch(request).catch(() => {
    const english = url.searchParams.get('lang') === 'en';
    const title = english ? 'Check your connection' : 'ตรวจสอบการเชื่อมต่อ';
    const detail = english ? 'Reconnect to the internet to open your installer workspace.' : 'เชื่อมต่ออินเทอร์เน็ตเพื่อเปิดพื้นที่ทำงานของผู้ติดตั้ง';
    const retry = english ? 'Try again' : 'ลองอีกครั้ง';
    return new Response(`<!doctype html><html lang="${english ? 'en' : 'th'}"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · SolarMatch</title>
      <style>body{margin:0;background:#f5f4ef;color:#142d26;font:1.12rem/1.6 system-ui,sans-serif}main{margin:20vh auto 0;max-width:28rem;padding:1.5rem}h1{line-height:1.25}a{display:inline-block;padding:.8em 1.6em;border-radius:2em;background:#142d26;color:white}</style>
      <main><strong>SolarMatch Installers</strong><h1>${title}</h1><p>${detail}</p><a href="">${retry}</a>
      <p lang="${english ? 'th' : 'en'}">${english ? 'เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง' : 'Reconnect to the internet, then try again.'}</p></main></html>`, {
      status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" },
    });
  }));
});
