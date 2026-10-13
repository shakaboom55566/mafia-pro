#!/usr/bin/env node
/* IndexNow (v38.1): tells Bing, Yandex, Seznam, Naver (and DuckDuckGo / ChatGPT search through Bing) which pages changed,
   right after a Pages deploy — instead of waiting for a crawl. Google does not use IndexNow (it reads the sitemap).
   The key is public by design: <site>/<key>.txt must contain the key (build-site.mjs writes it), and only URLs under
   that folder may be submitted.
     node seo/indexnow.mjs diff <site dir> <out list>   — pages whose HTML differs from the live site (first deploy: all)
     node seo/indexnow.mjs submit <list>                 — POST the list to api.indexnow.org
   env: SITE_URL (default seo/site-url.txt or the Pages address), INDEXNOW_API (tests) */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KEY = fs.readFileSync(path.join(ROOT, 'seo/indexnow-key.txt'), 'utf8').trim();
export const siteUrl = () => String(process.env.SITE_URL || (() => { try { return fs.readFileSync(path.join(ROOT, 'seo/site-url.txt'), 'utf8'); } catch (e) { return ''; } })() || 'https://shakaboom55566.github.io/mafia-pro/').trim().replace(/\/?$/, '/');
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
/* the deploy rewrites nothing in the website pages, but the date in the sitemap changes every day: compare the pages, not the sitemap */
const norm = s => s.replace(/\s+/g, ' ');

async function diff(dir, outFile) {
  const SITE = siteUrl(); const pages = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['cards', 'og'].includes(f.name)) walk(p); } else if (f.name === 'index.html' && d !== dir) pages.push(p); } })(dir);
  const changed = []; let live = 0, i = 0;
  async function one(f) {
    const rel = path.relative(dir, path.dirname(f)).split(path.sep).join('/') + '/'; const url = SITE + rel;
    try { const r = await fetch(url, { redirect: 'manual' }); if (r.ok) { live++; if (sha(norm(await r.text())) === sha(norm(fs.readFileSync(f, 'utf8')))) return; } } catch (e) {}
    changed.push(url);
  }
  await Promise.all(Array.from({ length: 8 }, async () => { while (i < pages.length) await one(pages[i++]); }));
  if (!live) changed.unshift(SITE); // the very first deploy: the app page too
  fs.writeFileSync(outFile, changed.sort().join('\n') + (changed.length ? '\n' : ''));
  console.log(`indexnow: ${changed.length} of ${pages.length} pages changed (${live} already live)`);
}

async function submit(listFile) {
  const SITE = siteUrl(); const urls = fs.existsSync(listFile) ? fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean) : [];
  if (!urls.length) return console.log('indexnow: nothing changed — nothing to submit');
  const u = new URL(SITE); const api = process.env.INDEXNOW_API || 'https://api.indexnow.org/indexnow';
  for (let k = 0; k < urls.length; k += 10000) {
    const body = { host: u.host, key: KEY, keyLocation: SITE + KEY + '.txt', urlList: urls.slice(k, k + 10000) };
    for (let a = 0; a < 4; a++) {
      const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) }).catch(e => ({ status: 0, text: async () => e.message }));
      if (r.status === 200 || r.status === 202) { console.log(`indexnow: ${body.urlList.length} URLs submitted (${r.status})`); break; }
      const t = await r.text().catch(() => '');
      // 403 right after the first deploy: the key file is not served yet — wait and retry
      if ((r.status === 403 || r.status === 0 || r.status >= 500) && a < 3) { console.log(`indexnow: ${r.status}, retrying in 30 s`); await new Promise(z => setTimeout(z, 30000)); continue; }
      console.log(`::warning::indexnow: ${r.status} ${t.slice(0, 200)}`); break;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, a, b] = process.argv.slice(2);
  (cmd === 'diff' ? diff(path.resolve(a || '_site'), b || '/tmp/indexnow.txt') : submit(a || '/tmp/indexnow.txt')).catch(e => { console.log('::warning::indexnow: ' + e.message); });
}
