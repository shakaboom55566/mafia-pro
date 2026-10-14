/* v40 — the move to the own domain in a real browser (Playwright): both addresses are served from local files
   (_site → https://mafiapro.app/, the bridge _gh → https://shakaboom55566.github.io/mafia-pro/), Telegram is a stub.
   Run after build.sh: node seo/test-move.js */
const path = require('path'); const fs = require('fs'); const os = require('os'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗ ' + m); } };
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-move-')); const site = path.join(tmp, 'site'), gh = path.join(tmp, 'gh');
  fs.mkdirSync(site); fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(site, 'index.html')); fs.copyFileSync(path.join(ROOT, '404.html'), path.join(site, '404.html'));
  execFileSync('node', [path.join(ROOT, 'seo/build-site.mjs'), site], { env: Object.assign({}, process.env, { SITE_URL: 'https://mafiapro.app/' }) });
  execFileSync('node', [path.join(ROOT, 'seo/make-bridge.mjs'), site, gh, 'https://mafiapro.app/']);
  const TG = `window.Telegram={WebApp:(function(){var p={};(location.hash.slice(1)).split('&').forEach(function(x){var i=x.indexOf('=');if(i>0)p[x.slice(0,i)]=decodeURIComponent(x.slice(i+1));});var n=function(){};return{initData:p.tgWebAppData||'',initDataUnsafe:{},platform:'ios',version:'7.0',colorScheme:'dark',themeParams:{},ready:n,expand:n,onEvent:n,offEvent:n,setHeaderColor:n,setBackgroundColor:n,enableClosingConfirmation:n,disableClosingConfirmation:n,disableVerticalSwipes:n,BackButton:{show:n,hide:n,onClick:n,offClick:n},MainButton:{show:n,hide:n,setText:n,onClick:n,offClick:n,setParams:n},HapticFeedback:{impactOccurred:n,notificationOccurred:n,selectionChanged:n},CloudStorage:{getItem:function(k,c){c&&c(null,'')},setItem:function(k,v,c){c&&c(null,true)}},openTelegramLink:n,openLink:n,showAlert:n,showConfirm:n,close:n,isVersionAtLeast:function(){return true}};})()};`;
  const serve = (dir, prefix) => async route => {
    const u = new URL(route.request().url()); let p = decodeURIComponent(u.pathname); if (prefix) p = p.replace(prefix, '/');
    if (p.endsWith('/__blank')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>blank</title>' }); // a page of that origin that does not leave: to set up its storage
    let f = path.join(dir, p); if (p.endsWith('/')) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, contentType: 'text/html', body: fs.readFileSync(path.join(dir, '404.html')) });
    route.fulfill({ status: 200, contentType: /\.html$/.test(f) ? 'text/html; charset=utf-8' : /\.png$/.test(f) ? 'image/png' : 'application/octet-stream', body: fs.readFileSync(f) });
  };
  const b = await chromium.launch(); const errors = [];
  async function ctx() {
    const c = await b.newContext({ viewport: { width: 390, height: 800 } });
    await c.route('https://telegram.org/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: TG }));
    await c.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await c.route('https://mafiapro.app/**', serve(site, null));
    await c.route('https://shakaboom55566.github.io/**', serve(gh, /^\/mafia-pro\//));
    return c;
  }
  const settle = async p => { await p.waitForLoadState('load'); await p.waitForTimeout(700); try { await p.waitForURL(/^https:\/\/mafiapro\.app\//, { timeout: 5000 }); } catch (e) {} await p.waitForLoadState('load'); await p.waitForTimeout(500); };
  const saved = { settings: { lang: 'uk', sound: false }, profiles: [{ id: 'p1', name: 'Олекса', games: 12 }, { id: 'p2', name: 'Марта', games: 7 }], meId: 'p1', owned: { roles: ['sniper'], scenarios: [] } };
  const TGH = '#tgWebAppData=query_id%3DAA1%26user%3D%257B%2522id%2522%253A42%257D&tgWebAppVersion=7.0&tgWebAppPlatform=ios';

  // A — an old player opens an old button (github.io) with a deep link
  { const c = await ctx(); const p = await c.newPage(); p.on('pageerror', e => errors.push('A ' + e.message));
    await p.goto('https://shakaboom55566.github.io/mafia-pro/__blank'); await p.evaluate(s => localStorage.setItem('mafiapro.v1', JSON.stringify(s)), saved);
    await p.goto('https://shakaboom55566.github.io/mafia-pro/?startapp=table_ABCD' + TGH); await settle(p);
    const u = new URL(p.url()); const d = await p.evaluate(() => ({ v: JSON.parse(localStorage.getItem('mafiapro.v1') || 'null'), moved: localStorage.getItem('mafiapro.moved'), app: document.getElementById('app').innerHTML.length, lang: document.documentElement.lang }));
    ok(u.origin === 'https://mafiapro.app' && u.searchParams.get('startapp') === 'table_ABCD', 'A: old link → new address with the deep link: ' + p.url());
    ok(!/mpm=/.test(u.hash) && /tgWebAppData=/.test(u.hash), 'A: the hash keeps Telegram data, loses the transfer: ' + u.hash.slice(0, 60));
    ok(d.v && d.v.profiles && d.v.profiles.some(x => x.name === 'Олекса') && d.v.owned.roles[0] === 'sniper', 'A: profiles and purchases moved');
    ok(d.moved === '1' && d.app > 500, 'A: marked moved, the app rendered (' + d.app + ')');
    await c.close(); }

  // B — an old player opens the new menu button (mafiapro.app) first: one bounce to the old address and back
  { const c = await ctx(); const p = await c.newPage(); p.on('pageerror', e => errors.push('B ' + e.message)); const nav = [];
    p.on('framenavigated', f => { if (f === p.mainFrame()) nav.push(new URL(f.url()).host); });
    await p.goto('https://shakaboom55566.github.io/mafia-pro/__blank'); await p.evaluate(s => localStorage.setItem('mafiapro.v1', JSON.stringify(s)), saved);
    nav.length = 0;
    await p.goto('https://mafiapro.app/' + TGH); await settle(p);
    const d = await p.evaluate(() => ({ v: JSON.parse(localStorage.getItem('mafiapro.v1') || 'null'), moved: localStorage.getItem('mafiapro.moved') }));
    ok(d.v && d.v.meId === 'p1' && d.moved === '1', 'B: data fetched from the old address by the bounce');
    ok(nav.filter(h => h === 'shakaboom55566.github.io').length === 1 && new URL(p.url()).host === 'mafiapro.app', 'B: exactly one bounce: ' + nav.join(' → '));
    nav.length = 0; await p.goto('https://mafiapro.app/' + TGH); await settle(p);
    ok(!nav.includes('shakaboom55566.github.io'), 'B: the second open does not bounce');
    await c.close(); }

  // C — a new player in Telegram: one bounce, nothing to bring, no loop; D — a site visitor outside Telegram: no bounce
  { const c = await ctx(); const p = await c.newPage(); p.on('pageerror', e => errors.push('C ' + e.message)); const nav = [];
    p.on('framenavigated', f => { if (f === p.mainFrame()) nav.push(new URL(f.url()).host); });
    await p.goto('https://mafiapro.app/' + TGH); await settle(p);
    ok(nav.filter(h => h === 'shakaboom55566.github.io').length === 1 && new URL(p.url()).host === 'mafiapro.app', 'C: a new player bounces once: ' + nav.join(' → '));
    ok(await p.evaluate(() => localStorage.getItem('mafiapro.moved') === '1' && !/mpm/.test(location.hash) && document.getElementById('app').innerHTML.length > 500), 'C: marked, rendered, clean hash');
    await c.close(); }
  { const c = await ctx(); const p = await c.newPage(); const nav = [];
    p.on('framenavigated', f => { if (f === p.mainFrame()) nav.push(new URL(f.url()).host); });
    await p.goto('https://mafiapro.app/'); await p.waitForTimeout(800);
    ok(!nav.includes('shakaboom55566.github.io'), 'D: outside Telegram no bounce');
    await c.close(); }

  // E — old website pages move to the same page at the new address (and say so to crawlers)
  { const c = await ctx(); const p = await c.newPage();
    await p.goto('https://shakaboom55566.github.io/mafia-pro/uk/roles/don/'); await p.waitForURL('https://mafiapro.app/uk/roles/don/', { timeout: 5000 }).catch(() => {});
    ok(p.url() === 'https://mafiapro.app/uk/roles/don/', 'E: an old role page → the same page: ' + p.url());
    ok(await p.title() !== '' && (await p.content()).includes('Mafia Pro'), 'E: the page itself');
    const stub = fs.readFileSync(path.join(gh, 'uk/roles/don/index.html'), 'utf8');
    ok(stub.includes('<link rel="canonical" href="https://mafiapro.app/uk/roles/don/">') && stub.includes('content="0;url=https://mafiapro.app/uk/roles/don/"'), 'E: canonical and meta refresh in the old page');
    ok(fs.existsSync(path.join(gh, '404.html')) && !fs.existsSync(path.join(gh, 'sitemap.xml')), 'E: bridge has 404, no sitemap');
    await c.close(); }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
  const real = errors.filter(e => !/fetch|Failed to fetch|NetworkError|api/i.test(e)); ok(!real.length, 'page errors: ' + real.join(' | '));
  console.log(`move: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
