/* Mafia Pro — mafiapro.app (v40). Everything is static (the _site build). v45: the worker runs only for /mafia-pro/… (run_worker_first in
   wrangler.toml) — all other files are served by the assets with the headers of site/_headers, outside the Workers daily limit. It does:
   - www.mafiapro.app → mafiapro.app, /mafia-pro/… (the old GitHub Pages path) → the same page at the root — 301
   - cache headers: pages and the app are revalidated every time (a deploy is seen at once), card images and previews for a day
   No X-Frame-Options: Telegram Web opens the Mini App in a frame — CSP frame-ancestors allows only Telegram (v44). */
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.hostname.startsWith('www.')) { u.hostname = u.hostname.slice(4); return Response.redirect(u.toString(), 301); }
    if (u.pathname === '/mafia-pro' || u.pathname.startsWith('/mafia-pro/')) { u.pathname = u.pathname.slice(10) || '/'; return Response.redirect(u.toString(), 301); }
    const r = await env.ASSETS.fetch(req);
    const h = new Headers(r.headers);
    if (/\.(png|jpe?g|webp|svg)$/i.test(u.pathname)) h.set('Cache-Control', 'public, max-age=86400');
    else if (/\.(html|xml|txt)$|\/$/.test(u.pathname) || !/\.[a-z0-9]+$/i.test(u.pathname)) h.set('Cache-Control', 'public, max-age=0, must-revalidate');
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // v44: only Telegram (Web) may frame the app; no plugins, no foreign <base>; HTTPS for a year; no camera / microphone / location
    h.set('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; object-src 'none'; base-uri 'self'");
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
};
